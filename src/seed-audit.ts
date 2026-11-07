import { catalogueResources } from '../database/seeds/catalogue.js';
import { assessCandidate } from './governance.js';
import { HttpError } from './http.js';
import { readPublicSource } from './sources.js';

// Limit each host to one request per second. Three workers bound total concurrency.
const nextRead = new Map<string, number>();
const read = async (url: URL) => {
  const now = Date.now();
  const scheduled = Math.max(now, nextRead.get(url.hostname) ?? now);
  nextRead.set(url.hostname, scheduled + 1000);
  if (scheduled > now) await new Promise(resolve => setTimeout(resolve, scheduled - now));
  return readPublicSource(url);
};
const rows: { sourceId: string; url: string; state: string; revision?: string | null;
  licence?: string | null; flags?: string[]; checkedOn?: string; httpStatus?: number | null }[] = new Array(catalogueResources.length);
let next = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (next < catalogueResources.length) {
    const index = next++;
    const seed = catalogueResources[index]!;
    try {
      const assessment = await assessCandidate({ ...seed, licence: seed.licence.state === 'verified' ? seed.licence.id : '' }, read);
      const unchanged = assessment.level === 'metadata-only' && assessment.sourceId === seed.sourceId &&
        assessment.revision === seed.version && seed.licence.state === 'verified' && assessment.licence === seed.licence.id;
      rows[index] = { sourceId: seed.sourceId, url: seed.url, revision: assessment.revision,
        licence: assessment.licence, flags: assessment.flags, checkedOn: new Date().toISOString(),
        state: unchanged ? 'unchanged' : 'review' };
    } catch (error) {
      rows[index] = { sourceId: seed.sourceId, url: seed.url, state: 'unavailable',
        httpStatus: error instanceof HttpError ? error.status : null };
    }
  }
}));
console.log(JSON.stringify(rows, null, 2));
if (rows.some(row => row.state !== 'unchanged')) process.exitCode = 1;
