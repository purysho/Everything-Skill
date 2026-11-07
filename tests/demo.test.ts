import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const demo = new URL('../../demo/', import.meta.url);
const app = readFileSync(new URL('app.js', demo), 'utf8');
const catalogue = JSON.parse(readFileSync(new URL('catalogue.json', demo), 'utf8'));

test('demo requests a fresh catalogue keyed to the page snapshot', async () => {
  let requested: { url: string; options: { cache?: string } } | undefined;
  const status = { textContent: '' };
  const document = { documentElement: { dataset: { catalogueVersion: catalogue.version } },
    querySelector: () => status };
  await runInNewContext(`(async () => { ${app} })()`, {
    document, URL, encodeURIComponent,
    fetch: async (url: string, options: { cache?: string }) => {
      requested = { url, options };
      return { ok: false };
    },
  });
  assert.ok(requested);
  assert.equal(requested.options?.cache, 'no-store');
  assert.equal(new URL(requested.url, 'https://example.org/').searchParams.get('v'), catalogue.version);
});

test('demo HTML pins scripts and styles to their content and carries the snapshot version', () => {
  const html = readFileSync(new URL('index.html', demo), 'utf8');
  assert.ok(html.includes(`data-catalogue-version="${catalogue.version}"`));
  for (const file of ['app.js', 'styles.css']) {
    const digest = createHash('sha256').update(readFileSync(new URL(file, demo))).digest('hex').slice(0, 12);
    assert.ok(html.includes(`${file}?v=${digest}`), `${file} must change its URL when its contents change`);
  }
});
