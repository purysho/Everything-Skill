import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { admittedResources, catalogueResources, catalogueReview, heldIntakeCount } from '../database/seeds/catalogue.js';

test('the published manifest retains every approved card and accounts for the entire intake', () => {
  const folder = new URL('../../database/catalogue/', import.meta.url);
  const raw = readFileSync(new URL('approved-batch-001.json', folder));
  assert.equal(createHash('sha256').update(raw).digest('hex'), '02a646bf6661775bc52c290cddb146c581641d3bcf87e1e6a4508130d0d8c803');
  const approved = JSON.parse(raw.toString('utf8'));
  for (const entry of approved.resources) assert.deepEqual(admittedResources.find(row => row.sourceId === entry.sourceId), entry);
  const dispositions = JSON.parse(readFileSync(new URL('dispositions.json', folder), 'utf8')) as {
    sourceId: string; status: string; batch: number;
  }[];
  assert.equal(dispositions.length, 1398);
  assert.equal(new Set(dispositions.map(row => row.sourceId)).size, 1398);
  assert.equal(new Set(dispositions.map(row => row.batch)).size, 14);
  assert.equal(new Set(catalogueResources.map(row => row.sourceId)).size, catalogueResources.length);
  assert.equal(new Set(catalogueResources.map(row => row.url)).size, catalogueResources.length);
  const held = dispositions.filter(row => !['admitted-metadata', 'approved-batch-001'].includes(row.status));
  assert.equal(held.length, heldIntakeCount);
  assert.ok(held.every(row => !admittedResources.some(resource => resource.sourceId === row.sourceId)));
  assert.equal(admittedResources.length, catalogueReview.admitted);
  assert.equal(admittedResources.filter(row => row.kind === 'repository').length, 0);
});
