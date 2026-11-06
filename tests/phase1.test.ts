import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { starterResources } from '../database/seeds/starter.js';
import { exportCatalog, search, seedCatalog, type SeedResource } from '../src/catalog.js';
import { initialize, openIndex } from '../src/database.js';
import { canonicalGitHub, canonicalResource } from '../src/identity.js';

const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));

function workspace(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'everything-skill-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function run(directory: string, ...args: string[]) {
  const result = spawnSync(process.execPath, [cli, '--data-dir', directory, ...args], {
    encoding: 'utf8',
    timeout: 10000,
  });
  if (result.error) throw result.error;
  return result;
}

function ok(directory: string, ...args: string[]) {
  const result = run(directory, ...args);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('canonical repository identity accepts HTTPS aliases and rejects credentials and lookalike hosts', () => {
  const expected = 'https://github.com/owner/repo';
  assert.equal(canonicalGitHub('https://www.github.com/Owner/Repo.git#readme'), expected);
  assert.equal(canonicalGitHub('https://api.github.com/repos/OWNER/Repo/issues?x=1'), expected);
  assert.equal(canonicalGitHub('https://github.com/Owner/Repo/tree/main/'), expected);
  assert.throws(() => canonicalGitHub('https://github.com.evil.example/owner/repo'));
  assert.throws(() => canonicalGitHub('https://guest:secret@github.com/owner/repo'));
  assert.throws(() => canonicalGitHub('https://github.com:9443/owner/repo'));
  assert.throws(() => canonicalGitHub('https://github.com/owner'));
  assert.equal(canonicalResource('https://EXAMPLE.com/data/?release=1#heading'),
    'https://example.com/data/?release=1');
});

test('search is read-only and needs explicit initialisation', (t) => {
  const directory = join(workspace(t), 'absent');
  const result = run(directory, 'search', 'retrieval');
  assert.equal(result.status, 1);
  assert.equal(existsSync(directory), false);
});

test('starter CLI searches, filters and exports evidence without exposing unclear entries', (t) => {
  const directory = workspace(t);
  ok(directory, 'init');
  const publicPath = join(directory, 'public.sqlite');
  const privatePath = join(directory, 'private.sqlite');
  const publicBefore = readFileSync(publicPath);
  const privateBefore = readFileSync(privatePath);
  const response = JSON.parse(ok(directory, 'search', 'retrieval catalogue', '--json', '--limit', '1'));
  assert.equal(response.results.length, 1);
  assert.equal(response.results[0].url, 'https://github.com/danielskry/awesome-rag');
  assert.equal(response.results[0].label, 'Conditional');
  assert.equal(response.results[0].licence, 'CC0-1.0');
  assert.match(response.results[0].licenceUrl, /blob\/[0-9a-f]{40}\/LICENSE$/);
  const mcp = JSON.parse(ok(directory, 'search', 'mcp', '--json'));
  assert.equal(mcp.excluded['licence-unclear'], 2);
  assert.deepEqual(mcp.results, []);
  assert.deepEqual(JSON.parse(ok(directory, 'search', 'retrieval', '--kind', 'dataset', '--json')).results, []);
  assert.deepEqual(JSON.parse(ok(directory, 'search', 'retrieval', '--category', 'finance', '--json')).results, []);
  const jsonExport = JSON.parse(ok(directory, 'export', '--json'));
  assert.equal(jsonExport.length, 2);
  assert.equal(JSON.stringify(jsonExport).includes('modelcontextprotocol'), false);
  assert.match(ok(directory, 'export'), /Awesome-RAG/);
  assert.match(ok(directory, 'search', 'retrieval'), /\[Evidence\]/);
  ok(directory, 'init', '--empty');
  assert.deepEqual(readFileSync(publicPath), publicBefore);
  assert.deepEqual(readFileSync(privatePath), privateBefore);
  assert.deepEqual(readdirSync(directory).sort(), ['private.sqlite', 'public.sqlite']);
});

test('empty CLI path preserves private rows across snapshot and restore and refuses replacement', (t) => {
  const directory = workspace(t);
  ok(directory, 'init', '--empty');
  assert.deepEqual(JSON.parse(ok(directory, 'export', '--json')), []);
  assert.deepEqual(JSON.parse(ok(directory, 'search', 'abc', '--json')).results, []);
  const privatePath = join(directory, 'private.sqlite');
  const publicPath = join(directory, 'public.sqlite');
  const db = new DatabaseSync(privatePath);
  db.prepare('INSERT INTO discoveries VALUES (?, ?, ?)').run('https://example.com/', '2026-11-06', 'private');
  const backupPath = join(directory, 'snapshot with spaces.sqlite');
  try {
    ok(directory, 'backup', backupPath);
    const unchanged = readFileSync(backupPath);
    assert.equal(run(directory, 'backup', backupPath).status, 1);
    assert.deepEqual(readFileSync(backupPath), unchanged);
    assert.equal(run(directory, 'restore', backupPath).status, 1);
    assert.equal(db.prepare('SELECT notes FROM discoveries').get()?.notes, 'private');
    const target = join(directory, 'restore data');
    mkdirSync(target);
    assert.equal(run(target, 'restore', publicPath).status, 1);
    assert.equal(existsSync(join(target, 'private.sqlite')), false);
    ok(target, 'restore', backupPath);
    ok(target, 'init', '--empty');
    const restored = openIndex(join(target, 'private.sqlite'), 'private');
    try {
      assert.equal(restored.prepare('SELECT notes FROM discoveries').get()?.notes, 'private');
    } finally {
      restored.close();
    }
  } finally {
    db.close();
  }
});

test('malformed private snapshots and wrong schema versions fail closed', (t) => {
  const directory = workspace(t);
  const source = join(directory, 'source');
  const target = join(directory, 'target');
  ok(source, 'init', '--empty');
  mkdirSync(target);
  const publicDb = new DatabaseSync(join(source, 'public.sqlite'));
  publicDb.exec('PRAGMA user_version = 2');
  publicDb.close();
  assert.match(run(source, 'search', 'test').stderr, /unsupported public schema/);

  const privatePath = join(source, 'private.sqlite');
  const privateDb = new DatabaseSync(privatePath);
  privateDb.exec('CREATE TABLE unexpected (payload TEXT)');
  privateDb.close();
  const result = run(target, 'restore', privatePath);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid private index schema/);
  assert.deepEqual(readdirSync(target), []);
});

test('deduplication and exclusions operate before projection even with hostile query syntax', async (t) => {
  const directory = workspace(t);
  const base = starterResources[0];
  const makeFixture = (name: string, changes: Partial<SeedResource>): SeedResource => ({
    ...base, sourceId: `fixture:${name}`, url: `https://example.com/${name}`,
    title: `retrieval fixture ${name}`, tags: 'retrieval', ...changes,
  });
  await initialize(directory, (db) => seedCatalog(db, [
    base,
    { ...base, sourceId: 'fixture:alias', url: `${base.url.toLowerCase()}.git#readme` },
    { ...base, url: 'https://github.com/example/renamed' },
    makeFixture('secret', { security: 'blocked', summary: 'private fixture marker' }),
    makeFixture('pending', { security: 'pending' }),
    makeFixture('archived', { availability: 'archived' }),
    makeFixture('offline', { availability: 'unavailable' }),
    makeFixture('unclear', { licence: { state: 'unclear' }, summary: 'unclear fixture marker' }),
  ]));
  const db = openIndex(join(directory, 'public.sqlite'), 'public');
  try {
    assert.equal(db.prepare('SELECT count(*) AS count FROM resources').get()?.count, 6);
    assert.deepEqual(db.prepare("SELECT summary FROM resources WHERE license_state = 'unclear' OR security_state = 'blocked'")
      .all().map((row) => row.summary), ['', '']);
    const options = { kind: null, category: null, limit: 5 };
    const output = search(db, 'retrieval") OR *; DROP TABLE resources; --', options);
    assert.equal(output.results.length, 1);
    assert.deepEqual(output.excluded, {
      blocked: 1, archived: 1, unavailable: 1, 'licence-unclear': 1, pending: 1,
    });
    assert.equal(JSON.stringify(output).includes('fixture marker'), false);
    assert.equal(exportCatalog(db).length, 1);
    assert.deepEqual(search(db, '"*()!', options).results, []);
    assert.throws(() => search(db, 'retrieval', { ...options, limit: 0 }));
  } finally {
    db.close();
  }
});

test('conflicting duplicate safety decisions prevent publishing a partial index', async (t) => {
  const directory = workspace(t);
  const entry = starterResources[0];
  await assert.rejects(
    initialize(directory, (db) => seedCatalog(db, [entry, { ...entry, security: 'blocked' }])),
    /Conflicting duplicate seed record/,
  );
  assert.deepEqual(readdirSync(directory), []);
  await initialize(directory, (db) => seedCatalog(db, [entry]));
  assert.deepEqual(readdirSync(directory).sort(), ['private.sqlite', 'public.sqlite']);
});
