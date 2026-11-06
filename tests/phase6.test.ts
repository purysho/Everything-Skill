import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { adapterKinds, generateAdapter } from '../src/adapters.js';

test('all four private adapter templates pass the permission-restricted synthetic contract', () => {
  const root = mkdtempSync(join(tmpdir(), 'everything adapter spaces '));
  try {
    for (const kind of adapterKinds) {
      const report = generateAdapter(root, kind);
      assert.equal(report.status, 'passed-synthetic');
      assert.equal(report.visibility, 'private-experimental');
      assert.ok(existsSync(report.path));
      assert.equal(JSON.parse(readFileSync(join(dirname(report.path), 'report.json'), 'utf8')).status, report.status);
    }
    assert.equal(existsSync(join(root, 'public.sqlite')), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
