import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { starterResources } from '../database/seeds/starter.js';
import { exportCatalog } from '../src/catalog.js';
import { initialize, openIndex } from '../src/database.js';
import { releaseDirectory, releaseVersion, selectCatalogue, selectedPublicPath, selection } from '../src/releases.js';

test('versioned selection backs up private rows and can roll back a damaged public snapshot', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'everything-releases-'));
  try {
    await initialize(directory, () => {});
    const privatePath = join(directory, 'private.sqlite');
    const db = openIndex(privatePath, 'private', true);
    try {
      db.prepare('INSERT INTO discoveries VALUES (?,?,?)').run('https://example.com/', '2026-11-06', 'retained');
    } finally { db.close(); }
    const privateBefore = readFileSync(privatePath);
    assert.deepEqual(selection(directory), { current: 'legacy', previous: null });
    assert.deepEqual(await selectCatalogue(directory, 'update'), { current: releaseVersion, previous: 'legacy' });
    const installed = selectedPublicPath(directory);
    const publicDb = openIndex(installed, 'public');
    try { assert.equal(exportCatalog(publicDb).length, starterResources.length); }
    finally { publicDb.close(); }
    assert.equal(readdirSync(join(directory, 'catalogue-backups')).length, 1);
    await selectCatalogue(directory, 'update');
    assert.equal(readdirSync(join(directory, 'catalogue-backups')).length, 1);
    appendFileSync(installed, 'invalid bytes');
    assert.throws(() => selectedPublicPath(directory), /checksum/);
    assert.deepEqual(await selectCatalogue(directory, 'rollback'), { current: 'legacy', previous: releaseVersion });
    assert.deepEqual(readFileSync(privatePath), privateBefore);
    const backups = join(directory, 'catalogue-backups');
    for (const backup of readdirSync(backups)) {
      const snapshot = openIndex(join(backups, backup), 'private');
      try { assert.equal(snapshot.prepare('SELECT notes FROM discoveries').get()?.notes, 'retained'); }
      finally { snapshot.close(); }
    }
    await assert.rejects(selectCatalogue(directory, 'rollback'), /checksum/);
    assert.equal(selection(directory).current, 'legacy');
    await assert.rejects(selectCatalogue(directory, 'update', '../private.sqlite'), /not bundled/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('existing installations can move from the directory snapshot to direct sources and roll back', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'everything-individual-sources-'));
  try {
    await initialize(directory, () => {});
    const oldVersion = '2026-11-06.1';
    await selectCatalogue(directory, 'update', oldVersion, join(releaseDirectory, '..', oldVersion));
    const oldPath = selectedPublicPath(directory);
    const oldBytes = readFileSync(oldPath);
    assert.deepEqual(await selectCatalogue(directory, 'update'), { current: releaseVersion, previous: oldVersion });
    const db = openIndex(selectedPublicPath(directory), 'public');
    try {
      const cards = exportCatalog(db);
      assert.ok(cards.some((card) => card.kind === 'dataset' && card.url.endsWith('/penguins.csv')));
      assert.ok(cards.every((card) => !/awesome|registry/i.test(card.title)));
    } finally { db.close(); }
    assert.deepEqual(await selectCatalogue(directory, 'rollback'), { current: oldVersion, previous: releaseVersion });
    assert.deepEqual(readFileSync(selectedPublicPath(directory)), oldBytes);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
