import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { SeedResource } from '../../src/catalog.js';
import { starterResources } from './starter.js';

const directory = new URL('../../../database/catalogue/', import.meta.url);
export const catalogueReview = JSON.parse(readFileSync(new URL('report.json', directory), 'utf8')) as {
  intake: number; admitted: number; counts: Record<string, number>; resourcesSha256: string;
};
const resources = readFileSync(new URL('resources.json', directory));
if (createHash('sha256').update(resources).digest('hex') !== catalogueReview.resourcesSha256) {
  throw new Error('The bundled catalogue resource manifest failed checksum validation.');
}
export const admittedResources = JSON.parse(resources.toString('utf8')) as SeedResource[];
export const catalogueResources = [...starterResources, ...admittedResources];
export const heldIntakeCount = catalogueReview.intake - (catalogueReview.counts['admitted-metadata'] ?? 0) -
  (catalogueReview.counts['approved-batch-001'] ?? 0);
