import { starterResources } from '../database/seeds/starter.js';
import { catalogueGitHubSource, checkPinnedGitHubFile, inspectGitHub } from './github.js';
import { assessGitHubRevision } from './governance.js';
import { HttpError } from './http.js';

const rows = [];
const scan = process.argv.includes('--scan');
for (const seed of starterResources) {
  try {
    const target = catalogueGitHubSource(seed.url, seed.version, seed.evidenceUrl);
    const evidence = await inspectGitHub(target.repository);
    const fileBlob = target.path ? await checkPinnedGitHubFile(target.repository, target.path, seed.version) : null;
    const surface = scan && evidence.licenceId ? await assessGitHubRevision(evidence) : null;
    rows.push({ ...evidence, resourceUrl: seed.url, fileBlob, scan: surface ? { level: surface.level, flags: surface.flags } : null, checkedOn: new Date().toISOString().slice(0, 10),
      recordedVersion: seed.version, security: seed.security,
      state: evidence.sourceId !== seed.sourceId || evidence.archived ||
        (surface && (surface.level === 'blocked' || surface.revision !== evidence.version ||
          surface.licence !== evidence.licenceId || surface.sourceId !== evidence.sourceId)) ? 'review' :
        evidence.version !== seed.version ||
        evidence.licenceId !== (seed.licence.state === 'verified' ? seed.licence.id : null)
          ? 'review' : 'unchanged' });
  } catch (error) {
    rows.push({ url: seed.url, state: 'unavailable', httpStatus: error instanceof HttpError ? error.status : null });
  }
}
console.log(JSON.stringify(rows, null, 2));
if (rows.some((row) => row.state !== 'unchanged')) process.exitCode = 1;
