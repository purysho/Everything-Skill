import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { traceRequests, assertPrivateTraffic } from '../scripts/trace.mjs';

test('privacy trace detects a same-origin POST body containing the chat sentinel', async () => {
  const server = createServer((request, response) => {
    request.resume();
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><title>Trace regression</title>');
  });
  await new Promise((accept) => server.listen(0, '127.0.0.1', accept));
  const browser = await chromium.launch({ args: process.env.EVERYTHING_GATE_SINGLE_PROCESS === '1' ? ['--single-process', '--no-zygote'] : [] });
  try {
    const context = await browser.newContext();
    const records = traceRequests(context);
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.evaluate(() => fetch('/private-test', { method: 'POST', body: 'PRIVATE_CHAT_SENTINEL_7431' }));
    assert.throws(() => assertPrivateTraffic(records, 'PRIVATE_CHAT_SENTINEL_7431'), /private/i);
    assert.ok(records.some((r) => r.method === 'POST' && r.body === 'PRIVATE_CHAT_SENTINEL_7431'));
  } finally { await browser.close(); await new Promise((accept) => server.close(accept)); }
});
