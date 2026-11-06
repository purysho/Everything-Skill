import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalogueGitHubSource, checkPinnedGitHubFile, inspectGitHub } from '../src/github.js';
import { HttpError } from '../src/http.js';

const sha = 'a'.repeat(40);
const root = 'https://github.com/owner/repo';
const notice = 'MIT License\nPermission is hereby granted, free of charge';
function mock(options: { text?: string; archived?: boolean; absent?: boolean; spdx?: string }) {
  return async (url: URL) => {
    assert.equal(url.hostname, 'api.github.com');
    assert.equal(url.username, '');
    if (url.pathname === '/repos/owner/repo') {
      return { id: 123, html_url: root, default_branch: 'release/stable',
        archived: options.archived ?? false, private: false };
    }
    if (url.pathname.includes('/commits/')) {
      assert.ok(url.pathname.endsWith('release%2Fstable'));
      return { sha, commit: { committer: { date: '2026-11-05T00:00:00Z' } } };
    }
    assert.equal(url.searchParams.get('ref'), sha);
    if (options.absent) throw new HttpError(404);
    return { path: 'LICENSE', sha: 'b'.repeat(40), encoding: 'base64',
      content: Buffer.from(options.text ?? notice).toString('base64'),
      license: { spdx_id: options.spdx ?? 'MIT' } };
  };
}

test('GitHub evidence pins licence to the exact revision and records archive state', async () => {
  const result = await inspectGitHub(root, mock({ archived: true }));
  assert.equal(result.sourceId, 'github:123');
  assert.equal(result.version, sha);
  assert.equal(result.licenceUrl, `${root}/blob/${sha}/LICENSE`);
  assert.equal(result.licenceId, 'MIT');
  assert.equal(result.archived, true);
  assert.match(result.licenceSha256 ?? '', /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(result).includes(notice), false);
});

test('GitHub evidence fails closed for unrecognised, absent, or transitional licences', async () => {
  for (const options of [{ absent: true }, { text: 'unrelated' },
    { text: notice + '\nlicensing transition' }, { spdx: 'NOASSERTION' }]) {
    assert.equal((await inspectGitHub(root, mock(options))).licenceId, null);
  }
  await assert.rejects(inspectGitHub(root, async () => { throw new HttpError(429); }), /429/);
});

test('standard Apache wording is recognised and separate additional terms still require review', async () => {
  const standard = 'Apache License\nVersion 2.0\nthis License, without any additional terms or conditions.';
  assert.equal((await inspectGitHub(root, mock({ text: standard, spdx: 'Apache-2.0' }))).licenceId, 'Apache-2.0');
  assert.equal((await inspectGitHub(root, mock({
    text: standard + '\nAdditional restrictions apply.', spdx: 'Apache-2.0',
  }))).licenceId, null);
});

test('direct source evidence binds the exact file and revision', async () => {
  const path = 'data/table.csv';
  const raw = `https://raw.githubusercontent.com/owner/repo/${sha}/${path}`;
  const evidence = `${root}/blob/${sha}/${path}`;
  assert.deepEqual(catalogueGitHubSource(raw, sha, evidence), { repository: root, path });
  assert.throws(() => catalogueGitHubSource(raw, sha, evidence.replace('table.csv', 'other.csv')), /pinned/);
  assert.throws(() => catalogueGitHubSource(raw, 'c'.repeat(40), evidence), /pinned/);
  assert.equal(await checkPinnedGitHubFile(root, path, sha, async (url) => {
    assert.equal(url.hostname, 'api.github.com');
    assert.equal(url.pathname, '/repos/owner/repo/contents/data/table.csv');
    assert.equal(url.searchParams.get('ref'), sha);
    return { path, type: 'file', sha: 'b'.repeat(40) };
  }), 'b'.repeat(40));
  await assert.rejects(checkPinnedGitHubFile(root, path, sha, async () =>
    ({ path, type: 'dir', sha: 'b'.repeat(40) })), /did not confirm/);
});
