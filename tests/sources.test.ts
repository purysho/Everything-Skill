import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { initialize, openIndex } from '../src/database.js';
import { assessCandidate, cachedEligible, readReports, verifyCandidate, type Candidate } from '../src/governance.js';
import { conflictingRights } from '../src/sources.js';

const dataset: Candidate = { url: 'https://zenodo.org/records/123', sourceId: 'doi:10.5281/zenodo.122',
  version: '10.5281/zenodo.123', licence: 'CC-BY-4.0' };
const fixture = () => ({ id: 123, doi: dataset.version, conceptdoi: '10.5281/zenodo.122',
  metadata: { title: 'Original observations', description: 'Field measurements and methods.',
    license: { id: 'cc-by-4.0' }, resource_type: { type: 'dataset' }, access_right: 'open' },
  files: [{ key: 'observations.csv', links: { self: 'https://zenodo.org/api/records/123/files/observations.csv/content' } }] });

test('public source checks use fixed official endpoints and identify licence conflicts', async () => {
  const report = await assessCandidate(dataset, async url => {
    assert.equal(url.href, 'https://zenodo.org/api/records/123');
    return fixture();
  });
  assert.equal(report.sourceId, dataset.sourceId);
  assert.equal(report.licence, dataset.licence);
  assert.equal(report.level, 'metadata-only');
  assert.ok(conflictingRights('Original data-provider attribution and redistribution terms have not been established.'));
  assert.ok(conflictingRights('Any commercial use or redistribution requires prior written permission.'));
  const conflict = await assessCandidate(dataset, async () => {
    const row = fixture();
    row.metadata.description = 'Original data-provider redistribution terms are unknown.';
    return row;
  });
  assert.equal(conflict.licence, null);
  assert.ok(conflict.flags.includes('licence-unclear'));
  await assert.rejects(assessCandidate({ ...dataset, url: 'https://zenodo.org.evil.invalid/records/123' }, async () => {
    assert.fail('An unrecognised host must never receive a request.');
  }), /no supported verification/);
});

test('query verification rejects withdrawn access and retains append-only reports', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'everything-source-policy-'));
  try {
    await initialize(folder, () => {});
    const db = openIndex(join(folder, 'private.sqlite'), 'private', true);
    try {
      assert.equal(await verifyCandidate(db, dataset, async () => fixture()), true);
      assert.equal(await verifyCandidate(db, dataset, async () => {
        const row = fixture(); row.metadata.access_right = 'restricted'; return row;
      }), false);
      assert.equal(cachedEligible(db, dataset), false);
      assert.equal(readReports(db).length, 2);
      assert.throws(() => db.exec('DELETE FROM security_reports'), /append-only/);
    } finally { db.close(); }
  } finally { rmSync(folder, { recursive: true, force: true }); }
});

test('museum and article checks reject changed rights and mismatched identities', async () => {
  const museum = { url: 'https://www.metmuseum.org/art/collection/search/10', sourceId: 'met:10',
    version: '2026-11-06', licence: 'CC0-1.0' };
  const report = await assessCandidate(museum, async url => {
    assert.equal(url.href, 'https://collectionapi.metmuseum.org/public/collection/v1/objects/10');
    return { objectID: 10, objectURL: museum.url, metadataDate: museum.version, isPublicDomain: false };
  });
  assert.equal(report.licence, null);
  const article = { url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC123/', sourceId: 'doi:10.1000/example',
    version: 'PMC123', licence: 'CC-BY-4.0' };
  const xml = '<article><article-id pub-id-type="pmc">PMC123</article-id><article-id pub-id-type="doi">10.1000/example</article-id>' +
    '<license xlink:href="https://creativecommons.org/licenses/by/4.0/">Article terms</license></article>';
  const checked = await assessCandidate(article, async url => {
    assert.equal(url.href, 'https://www.ebi.ac.uk/europepmc/webservices/rest/PMC123/fullTextXML');
    return xml;
  });
  assert.equal(checked.sourceId, article.sourceId);
  assert.equal(checked.licence, 'CC-BY-4.0');
  assert.equal((await assessCandidate(article, async () => xml.replace('/by/4.0/', '/by-nc/4.0/'))).licence, null);
  assert.notEqual((await assessCandidate(article, async () => xml.replace('10.1000/example', '10.1000/changed'))).sourceId, article.sourceId);
});
