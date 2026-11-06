import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { starterResources } from '../database/seeds/starter.js';
import { search, seedCatalog } from '../src/catalog.js';
import { initialize, openIndex } from '../src/database.js';
import { fuseRankings, labelFor, route } from '../src/retrieval.js';

test('fusion rewards agreement once per list and policy caps every configurable label', () => {
  const rankings = fuseRankings([['only', 'both', 'both'], ['both']]);
  assert.ok(rankings.get('both')! > rankings.get('only')!);
  assert.equal(rankings.get('both'), 1 / 62 + 1 / 61);
  assert.equal(route(['fhir']), 'healthcare');
  assert.equal(route(['fhir', 'mcp']), null);
  assert.equal(labelFor(100, 'Conditional').name, 'Conditional');
  assert.equal(labelFor(100, 'Excluded').name, 'Excluded');
  assert.equal(labelFor(45, 'Conditional', [90, 75, 40, 1]).name, 'Conditional');
  assert.throws(() => labelFor(45, 'Conditional', [90, 75, 75, 1]));
});

test('routed retrieval finds a synonym-only healthcare match while lexical baseline returns none', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'everything-retrieval-'));
  try {
    await initialize(directory, (db) => seedCatalog(db, starterResources));
    const db = openIndex(join(directory, 'public.sqlite'), 'public');
    try {
      const options = { kind: null, category: null, limit: 3 };
      assert.equal(search(db, 'hospital', { ...options, mode: 'lexical' }).results.length, 0);
      assert.equal(search(db, 'hospital', options).results[0]?.title, 'Awesome Healthcare');
      assert.equal(search(db, 'hospital', { ...options, category: 'software' }).results.length, 0);
    } finally {
      db.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
