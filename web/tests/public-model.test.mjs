import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { candidates } from '../dist/model.js';

test('public pinned model config passes browser CORS and the real admission fetch integrity check',
  { skip: process.env.EVERYTHING_GATE_NETWORK !== '1' ? 'Requires a public HTTPS browser environment; the constrained runner has a proxy CA trust failure.' : false }, async () => {
  const source = readFileSync(new URL('../dist/admission.js', import.meta.url));
  const server = createServer((request, response) => {
    response.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' https://huggingface.co https://*.hf.co; object-src 'none'");
    response.setHeader('Content-Type', request.url === '/admission.js' ? 'text/javascript' : 'text/html');
    response.end(request.url === '/admission.js' ? source : '<!doctype html><title>Public transport gate</title>');
  });
  await new Promise((accept) => server.listen(0, '127.0.0.1', accept));
  let browser;
  try {
    browser = await chromium.launch({ args: process.env.EVERYTHING_GATE_SINGLE_PROCESS === '1' ? ['--single-process', '--no-zygote'] : [] });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const profile = candidates.find((p) => p.id === 'qwen35-cpu');
    const result = await page.evaluate(async (profile) => {
      const { createModelFetch } = await import('/admission.js');
      const fetchModel = createModelFetch(profile);
      const response = await fetchModel(`https://huggingface.co/${profile.model}/resolve/${profile.revision}/config.json`, { signal: AbortSignal.timeout(20_000) });
      return { status: response.status, type: response.type, modelType: (await response.json()).model_type };
    }, profile);
    assert.deepEqual(result, { status: 200, type: 'cors', modelType: 'qwen3_5' });
  } finally { await browser?.close(); server.closeAllConnections(); await new Promise((accept) => server.close(accept)); }
});
