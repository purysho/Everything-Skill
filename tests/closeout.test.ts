import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { generateAdapter } from '../src/adapters.js';
import { inspectSurface } from '../src/governance.js';

test('adversarial scanner classifies and redacts the labelled fixtures', () => {
  const fixture = new URL('../../evaluation/adversarial.tsv', import.meta.url);
  const lines = readFileSync(fixture, 'utf8').trimEnd().split('\n');
  for (const [index, line] of lines.entries()) {
    const [level, flag, content] = line.trimEnd().split('\t');
    assert.ok(content && flag);
    const actual = inspectSurface(content);
    const classification = actual.blocked ? 'blocked' : actual.flags.length ? 'warning' : 'clear';
    assert.equal(classification, level, `fixture ${index + 1}`);
    if (flag !== '-') assert.ok((actual.flags as string[]).includes(flag), `fixture ${index + 1}`);
    assert.ok(!JSON.stringify(actual).includes(content));
  }
});

test('adapter protocol rejects malformed or premature requests and never reflects invalid IDs', () => {
  const directory = mkdtempSync(join(tmpdir(), 'everything-protocol-'));
  try {
    const generated = generateAdapter(directory, 'openapi');
    assert.equal(generated.status, 'passed-synthetic');
    const path = realpathSync(generated.path);
    const argv = ['--permission', `--allow-fs-read=${path}`, path];
    const input = [
      '{ malformed',
      JSON.stringify({ jsonrpc: '1.0', id: { test: 'should-not-reflect' }, method: 'tools/list' }),
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'initialize' }),
      JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list' }),
    ].join('\n') + '\n';
    const run = spawnSync(process.execPath, argv, { input, encoding: 'utf8', timeout: 5000 });
    assert.equal(run.status, 0);
    assert.ok(!run.stdout.includes('should-not-reflect'));
    assert.deepEqual(run.stdout.trim().split('\n').map((line) => JSON.parse(line).error?.code),
      [-32700, -32600, -32002, undefined, -32002]);
    assert.equal(spawnSync(process.execPath, argv, {
      input: 'x'.repeat(65_537), timeout: 5000, encoding: 'utf8',
    }).status, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('Node adapter restrictions deny synthetic filesystem and child-process escape attempts', () => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'everything-permissions-')));
  try {
    const probe = join(directory, 'probe.mjs');
    const privateFile = join(directory, 'private.txt');
    writeFileSync(privateFile, 'synthetic token');
    writeFileSync(probe, `
      import { readFileSync } from 'node:fs';
      import { spawnSync } from 'node:child_process';
      for (const action of [
        () => readFileSync(${JSON.stringify(privateFile)}),
        () => spawnSync(process.execPath, ['--version']),
      ]) {
        try { action(); console.log('allowed'); }
        catch (error) { console.log(error.code); }
      }
    `);
    const run = spawnSync(process.execPath, ['--permission', `--allow-fs-read=${probe}`, probe],
      { encoding: 'utf8', timeout: 5000 });
    assert.equal(run.status, 0);
    assert.deepEqual(run.stdout.trim().split(/\r?\n/), ['ERR_ACCESS_DENIED', 'ERR_ACCESS_DENIED']);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
