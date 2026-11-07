import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { cpus, totalmem } from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { traceRequests, assertPrivateTraffic } from './trace.mjs';

const root = resolve(import.meta.dirname, '../dist');
assert.ok(existsSync(resolve(root, 'worker.js')), 'Build the real inference worker before running the gate.');
const weights = process.env.EVERYTHING_GATE_WEIGHTS ? resolve(process.env.EVERYTHING_GATE_WEIGHTS) : null;
const transfers = [];
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const transfer = { path: url.pathname, bytesServed: 0 };
  transfers.push(transfer);
  const base = url.pathname.startsWith('/model/') && weights ? weights : root;
  const path = resolve(base, '.' + url.pathname.replace(/^\/model\//, '/'));
  if (!path.startsWith(base + sep) || !existsSync(path) || !statSync(path).isFile()) { response.writeHead(404).end(); return; }
  const type = path.endsWith('.js') || path.endsWith('.mjs') ? 'text/javascript' : path.endsWith('.wasm') ? 'application/wasm' : path.endsWith('.html') ? 'text/html' : 'application/json';
  if (process.env.EVERYTHING_GATE_CORRUPT_CONFIG === '1' && url.pathname === '/model/config.json') { response.writeHead(200, { 'Access-Control-Allow-Origin': '*' }).end('{\"corrupted\":true}'); return; }
  response.writeHead(200, { 'Content-Type': type, 'Content-Length': statSync(path).size, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self' https://huggingface.co https://*.hf.co; object-src 'none'; base-uri 'none'" });
  const stream = createReadStream(path);
  stream.on('data', (chunk) => { transfer.bytesServed += chunk.length; });
  response.on('close', () => stream.destroy());
  stream.pipe(response);
});
await new Promise((accept) => server.listen(0, '127.0.0.1', accept));
const origin = `http://127.0.0.1:${server.address().port}`;
const outputDirectory = resolve(import.meta.dirname, '../gate-results');
mkdirSync(outputDirectory, { recursive: true });
const reportName = process.env.EVERYTHING_GATE_REPORT ?? 'latest.json';
assert.match(reportName, /^[a-zA-Z0-9_-]+\.json$/);
const checkpoint = () => writeFileSync(resolve(outputDirectory, reportName), JSON.stringify(report, null, 2));
const report = { started: new Date().toISOString(), cpu: cpus()[0]?.model, cpuCount: cpus().length,
  hostMemoryBytes: totalmem(), transport: weights ? 'locally served pinned bytes; public CORS not tested' : 'public model host',
  launch: process.env.EVERYTHING_GATE_SINGLE_PROCESS === '1' ? 'single-process constrained-runner mode' : 'default headless',
  workerSha256: createHash('sha256').update(readFileSync(resolve(root, 'worker.js'))).digest('hex'),
  fixturesSha256: createHash('sha256').update(readFileSync(resolve(import.meta.dirname, '../../evaluation/chat-cases.json'))).digest('hex'),
  events: [], errors: [], transfers, cases: [] };
let browser;
try {
  browser = await chromium.launch({ args: process.env.EVERYTHING_GATE_SINGLE_PROCESS === '1' ? ['--single-process', '--no-zygote'] : [] });
  const context = await browser.newContext();
  const requests = traceRequests(context);
  report.requests = requests;
  if (weights) await context.route('https://huggingface.co/**', (route) => {
    const url = route.request().url();
    const prefix = 'https://huggingface.co/onnx-community/Qwen3-0.6B-Instruct-ONNX/resolve/54250909aca286a05b9d013c8af7a21859ee6ead/';
    if (!url.startsWith(prefix)) return route.abort();
    return route.fulfill({ status: 307, headers: { location: origin + '/model/' + url.slice(prefix.length), 'access-control-allow-origin': '*' } });
  });
  context.on('requestfailed', (r) => report.errors.push('Request failed: ' + r.url() + ' ' + r.failure()?.errorText));
  const page = await context.newPage();
  page.on('pageerror', (e) => report.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'debug') report.errors.push(m.text()); });
  await page.goto(origin + '/gate.html');
  report.browser = await page.evaluate(() => ({ userAgent: navigator.userAgent, deviceMemory: navigator.deviceMemory, hardwareConcurrency: navigator.hardwareConcurrency }));
  await page.evaluate(() => {
    window.events = [];
    window.worker = new Worker('./worker.js', { type: 'module' });
    window.worker.onmessage = (e) => window.events.push({ ...e.data, at: performance.now() });
    window.worker.onerror = (e) => window.events.push({ type: 'error', message: e.message });
    window.worker.postMessage({ id: 1, type: 'load', profile: 'qwen3-cpu' });
  });
  await page.waitForFunction(() => window.events.some((e) => e.type === 'ready' || e.type === 'error'), undefined, { timeout: 300_000 });
  const loaded = await page.evaluate(() => window.events.filter((e) => e.type !== 'progress'));
  report.events.push(...loaded);
  assert.ok(loaded.some((e) => e.type === 'ready'), JSON.stringify(loaded));
  const requestCountAfterLoad = requests.length;
  const cases = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../evaluation/chat-cases.json'), 'utf8'));
  const chosenCases = cases.slice(0, Number(process.env.EVERYTHING_GATE_CASE_LIMIT ?? cases.length));
  report.fixtures = chosenCases;
  report.sentinelExercised = chosenCases.some((c) => JSON.stringify(c.messages).includes('PRIVATE_CHAT_SENTINEL_7431'));
  for (let index = 0; index < Math.min(cases.length, Number(process.env.EVERYTHING_GATE_CASE_LIMIT ?? cases.length)); index++) {
    const c = cases[index];
    const id = index + 2;
    await page.evaluate(({ id, messages }) => { window.worker.postMessage({ id, type: 'generate', messages, maxTokens: 128 }); }, { id, messages: c.messages });
    await page.waitForFunction((id) => window.events.some((e) => e.id === id && ['done', 'error'].includes(e.type)), id, { timeout: 240_000 });
    const events = await page.evaluate((id) => window.events.filter((e) => e.id === id && e.type !== 'token'), id);
    const done = events.find((e) => e.type === 'done');
    report.cases.push({ id: c.id, events, text: done?.text ?? '', manualReview: 'pending' });
    checkpoint();
    console.log(c.id, JSON.stringify(done?.text ?? events));
    assert.ok(done, 'Real generation failed for ' + c.id);
  }
  if (process.env.EVERYTHING_GATE_CANCEL_PROBE === '1') {
    await page.evaluate(() => window.worker.postMessage({ id: 100001, type: 'generate', messages: [{ role: 'user', content: '研究'.repeat(4000) }] }));
    await page.waitForFunction(() => window.events.some((e) => e.id === 100001 && e.type === 'error'));
    report.overBudget = await page.evaluate(() => window.events.find((e) => e.id === 100001));
    assert.match(report.overBudget.message, /token budget/);
    report.cancellation = await page.evaluate(async () => {
      window.worker.postMessage({ id: 100002, type: 'generate', messages: [{ role: 'user', content: 'Remember PRIVATE_CHAT_SENTINEL_7431 temporarily.' }] });
      await new Promise((accept) => setTimeout(accept, 100));
      const start = performance.now();
      window.worker.terminate();
      const eventCount = window.events.length;
      await new Promise((accept) => setTimeout(accept, 500));
      return { elapsedMs: performance.now() - start, lateEvents: window.events.length - eventCount };
    });
    report.sentinelExercised = true;
    assert.equal(report.cancellation.lateEvents, 0);
    assert.ok(report.cancellation.elapsedMs < 5000);
  }
  report.storage = await page.evaluate(async () => ({ local: localStorage.length, session: sessionStorage.length, caches: await caches.keys(), databases: typeof indexedDB.databases === 'function' ? await indexedDB.databases() : 'unavailable' }));
  assert.equal(report.storage.local, 0);
  assert.equal(report.storage.session, 0);
  assert.deepEqual(report.storage.caches, []);
  const sentinel = 'PRIVATE_CHAT_SENTINEL_7431';
  report.sentinelNetworkCheck = report.sentinelExercised ? 'exercised' : 'not run';
  assertPrivateTraffic(requests, sentinel);
  assert.equal(requests.length, requestCountAfterLoad, 'Generation unexpectedly made a network request.');
  const weightTransfers = transfers.filter((t) => t.path.endsWith('model_q4.onnx'));
  assert.equal(weightTransfers.length, 1, 'Weights must transfer only once.');
  report.serverBytesServed = transfers.reduce((sum, t) => sum + t.bytesServed, 0);
  if (weights) assert.ok(report.serverBytesServed <= 1_073_741_824, 'Total gate transfer exceeds 1 GiB.');
  report.status = 'inference completed; quality and physical-device admission require review';
} catch (error) { report.status = 'failed'; report.failure = String(error); process.exitCode = 1; }
finally {
  await browser?.close();
  await new Promise((accept) => server.close(accept));
  checkpoint();
  console.log(report.status, report.failure ?? '', '\nReport:', resolve(outputDirectory, reportName));
}
