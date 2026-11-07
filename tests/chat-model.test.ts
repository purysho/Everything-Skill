import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertProfile, createModelFetch, type ModelProfile } from '../src/chat-model.js';

const profile: ModelProfile = {
  id: 'fixture', model: 'author/model', revision: 'a'.repeat(40), dtype: 'q4', device: 'wasm',
  licence: 'Apache-2.0', licenceUrl: 'https://example.org/LICENSE',
  rights: 'established', runtimeBytes: 30_000_000,
  assets: [{ path: 'config.json', bytes: 100, sha256: '1'.repeat(64) },
    { path: 'onnx/model_q4.onnx', bytes: 500_000_000, sha256: '2'.repeat(64) }],
};

test('model admission rejects unclear rights before allowing a download', () => {
  assert.throws(() => assertProfile({ ...profile, rights: 'unclear' }), /rights/i);
  assert.doesNotThrow(() => assertProfile(profile));
});

test('model admission rejects mutable revisions and unverified assets', () => {
  assert.throws(() => assertProfile({ ...profile, revision: 'main' }), /revision/i);
  assert.throws(() => assertProfile({ ...profile, assets: [{ ...profile.assets[0]!, sha256: '' }] }), /asset/i);
  assert.throws(() => assertProfile({ ...profile, assets: [{ ...profile.assets[0]!, path: '../config.json' }] }), /asset/i);
});

test('model download ceiling includes runtime files and rejects duplicate paths', () => {
  assert.throws(() => assertProfile({ ...profile, runtimeBytes: 600_000_000 }), /1 GiB/i);
  assert.throws(() => assertProfile({ ...profile, assets: [profile.assets[0]!, profile.assets[0]!] }), /duplicate/i);
  assert.throws(() => assertProfile({ ...profile, assets: [{ ...profile.assets[0]!, bytes: -1 }] }), /asset/i);
  assert.equal(assertProfile(profile), 530_000_100);
});

// A runtime range probe must not consume a second full weight download.
test('model metadata probes use the pinned manifest without a payload download', async () => {
  let downloads = 0;
  const download: typeof fetch = async () => { downloads++; throw new Error('Network not expected for metadata.'); };
  const fetchModel = createModelFetch(profile, download);
  const response = await fetchModel('https://huggingface.co/author/model/resolve/' + 'a'.repeat(40) + '/onnx/model_q4.onnx', {
    method: 'GET', headers: { Range: 'bytes=0-0' },
  });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 0-0/500000000');
  assert.equal(downloads, 0);
});

test('model payload requests preserve integrity and never pass caller credentials', async () => {
  let observed: { url: string; options: RequestInit | undefined } | undefined;
  const download: typeof fetch = async (input, options) => {
    observed = { url: String(input), options };
    return new Response('verified by browser SRI', { status: 200 });
  };
  const fetchModel = createModelFetch(profile, download);
  const url = 'https://huggingface.co/author/model/resolve/' + 'a'.repeat(40) + '/config.json';
  await fetchModel(url, { credentials: 'include', headers: { Authorization: 'test-secret' } });
  assert.equal(observed?.url, url);
  assert.equal(observed?.options?.credentials, 'omit');
  assert.equal(observed?.options?.cache, 'no-store');
  assert.equal(observed?.options?.referrerPolicy, 'no-referrer');
  assert.equal(observed?.options?.integrity, 'sha256-ERERERERERERERERERERERERERERERERERERERERERE=');
  assert.equal(new Headers(observed?.options?.headers).has('Authorization'), false);
  await assert.rejects(() => fetchModel('https://evil.example/model.onnx'), /unapproved/i);
  await assert.rejects(() => fetchModel(url, { method: 'POST', body: 'test-body' }), /method/i);
});
