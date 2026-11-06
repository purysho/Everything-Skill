import { starterResources } from '../database/seeds/starter.js';
import { inspectGitHub } from './github.js';

const rows = [];
for (const seed of starterResources) {
  try {
    const evidence = await inspectGitHub(seed.url);
    rows.push({ ...evidence, checkedOn: new Date().toISOString().slice(0, 10),
      recordedVersion: seed.version, security: seed.security,
      state: evidence.sourceId !== seed.sourceId || evidence.archived ? 'review' :
        evidence.version !== seed.version ||
        evidence.licenceId !== (seed.licence.state === 'verified' ? seed.licence.id : null)
          ? 'review' : 'unchanged' });
  } catch {
    rows.push({ url: seed.url, state: 'unavailable' });
  }
}
console.log(JSON.stringify(rows, null, 2));
if (rows.some((row) => row.state !== 'unchanged')) process.exitCode = 1;
