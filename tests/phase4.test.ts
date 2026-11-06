import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { initialize, openIndex } from '../src/database.js';
import { collectDiscovery, discover, listDiscoveries, saveDiscovery } from '../src/discovery.js';

const sha = 'd'.repeat(40);
const repo = 'https://github.com/example/specialist';
const raw = '# Specialized FHIR\nText that should never be stored.\n# Other\nUnrelated material.';

test('provider discovery discards user-controlled descriptions, remote URLs, and duplicates', async () => {
  const github = await discover('fhir "user:admin"', 'github', async (url) => {
    assert.equal(url.origin, 'https://api.github.com');
    assert.equal(url.searchParams.get('q'), 'fhir user admin is:public archived:false');
    const item = { id: 10, html_url: repo, private: false, archived: false, description: raw };
    return { items: [item, item, { ...item, html_url: 'https://evil.invalid/a/b', id: 11 }] };
  });
  assert.equal(github.length, 1);
  assert.equal(github[0]?.url, repo);
  const mcp = await discover('test', 'mcp', async (url) => {
    assert.equal(url.origin, 'https://registry.modelcontextprotocol.io');
    return { servers: [{ server: { name: 'io.github.example/fhir', remotes: [{ url: 'https://evil.invalid/' }] } }] };
  });
  assert.equal(mcp.length, 1);
  assert.equal(JSON.stringify(mcp).includes('evil.invalid'), false);
  const web = await discover('test', 'web', async (url) => {
    assert.equal(url.origin, 'https://en.wikipedia.org');
    return { query: { search: [{ pageid: 123, snippet: raw }] } };
  });
  assert.equal(web[0]?.url, 'https://en.wikipedia.org/?curid=123');
});

test('staged GitHub indexing is pinned, local and clears previously staged evidence when terms are unclear', async () => {
  let recognised = true;
  let readmes = 0;
  const fixture = async (url: URL) => {
    if (url.pathname.endsWith('/commits/main')) return { sha };
    if (url.pathname.endsWith('/license')) {
      assert.equal(url.searchParams.get('ref'), sha);
      return { path: 'LICENSE', encoding: 'base64', license: { spdx_id: recognised ? 'MIT' : 'NOASSERTION' },
        content: Buffer.from('Permission is hereby granted, free of charge').toString('base64') };
    }
    if (url.pathname.endsWith('/readme')) {
      readmes++;
      assert.equal(url.searchParams.get('ref'), sha);
      assert.equal(url.href.includes('fhir'), false);
      return { content: Buffer.from(raw).toString('base64'), encoding: 'base64' };
    }
    return { id: 10, html_url: repo, default_branch: 'main', archived: false, private: false };
  };
  const directory = mkdtempSync(join(tmpdir(), 'everything-staged-'));
  try {
    await initialize(directory, () => {});
    const publicPath = join(directory, 'public.sqlite');
    const before = readFileSync(publicPath);
    const db = openIndex(join(directory, 'private.sqlite'), 'private', true);
    try {
      const staged = await collectDiscovery(repo, 'fhir', fixture);
      assert.equal(staged.stage, 'sections');
      saveDiscovery(db, staged);
      assert.equal(JSON.stringify(listDiscoveries(db)).includes('should never'), false);
      recognised = false;
      saveDiscovery(db, await collectDiscovery(repo, 'fhir', fixture));
      assert.equal(listDiscoveries(db)[0]?.stage, 'metadata');
      assert.equal(listDiscoveries(db)[0]?.licence, null);
      assert.equal(readmes, 1);
      assert.deepEqual(readFileSync(publicPath), before);
    } finally {
      db.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('opening an existing private v1 index for an explicit write preserves existing rows', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'everything-migration-'));
  try {
    const path = join(directory, 'private.sqlite');
    const v1 = new DatabaseSync(path);
    v1.exec(`PRAGMA application_id=0x45535052; PRAGMA user_version=1;
CREATE TABLE discoveries (
  url TEXT PRIMARY KEY NOT NULL,
  discovered_at TEXT NOT NULL,
  notes TEXT NOT NULL
) STRICT`);
    v1.prepare('INSERT INTO discoveries VALUES (?,?,?)').run(repo, '2026-11-06', 'old data');
    v1.close();
    const db = openIndex(path, 'private', true);
    try {
      assert.equal(db.prepare('PRAGMA user_version').get()?.user_version, 2);
      assert.equal(db.prepare('SELECT notes FROM discoveries').get()?.notes, 'old data');
    } finally { db.close(); }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
