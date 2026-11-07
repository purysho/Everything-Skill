import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { catalogueResources } from '../database/seeds/catalogue.js';
import { exportCatalog, seedCatalog, type SeedResource } from '../src/catalog.js';
import { checkIntegrity, initialize, openIndex } from '../src/database.js';
import { inspectSurface } from '../src/governance.js';
import { releaseVersion } from '../src/releases.js';

interface ReviewBatch {
  status: 'pending-maintainer-approval';
  version: string;
  baseVersion: string;
  resources: SeedResource[];
  excluded: number;
}

const [input, output, checksum] = process.argv.slice(2);
if (!input || !output || !checksum || !/^[a-f0-9]{64}$/.test(checksum)) {
  throw new Error('Provide a review manifest, new preview directory and exact manifest SHA-256.');
}
const repo = realpathSync(resolve(import.meta.dirname, '..', '..'));
const folder = join(realpathSync(dirname(resolve(output))), basename(resolve(output)));
if (folder === repo || folder.startsWith(repo + sep)) throw new Error('Stage the preview outside the checkout.');
const manifestBytes = readFileSync(input);
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
if (sha256(manifestBytes) !== checksum) throw new Error('Review manifest checksum mismatch.');
const batch = JSON.parse(manifestBytes.toString('utf8')) as ReviewBatch;
if (batch.status !== 'pending-maintainer-approval' || batch.baseVersion !== releaseVersion ||
    !/^\d{4}-\d{2}-\d{2}\.\d+$/.test(batch.version) || batch.version === releaseVersion ||
    !Number.isSafeInteger(batch.excluded) || batch.excluded < 0 || !Array.isArray(batch.resources) || !batch.resources.length) {
  throw new Error('Invalid preview manifest or base version.');
}
const seeds = [...catalogueResources, ...batch.resources];
for (const entry of batch.resources) {
  if (entry.licence.state !== 'verified' || entry.availability !== 'active' || entry.security !== 'metadata-only' ||
      inspectSurface([entry.title, entry.summary, entry.tags].join('\n')).flags.length) {
    throw new Error('Preview contains a resource that failed the metadata policy.');
  }
}

const temporary = mkdtempSync(join(tmpdir(), 'everything-review-'));
try {
  await initialize(temporary, (db) => seedCatalog(db, seeds));
  const source = join(temporary, 'public.sqlite');
  const db = openIndex(source, 'public');
  const rows = (() => { try { checkIntegrity(db); return exportCatalog(db); } finally { db.close(); } })();
  if (rows.length !== seeds.length) throw new Error('Staged catalogue lost a row or contained a duplicate.');

  mkdirSync(folder, { mode: 0o700 });
  const snapshot = join(folder, 'snapshot');
  const demo = join(folder, 'demo');
  mkdirSync(snapshot);
  mkdirSync(demo);
  const release = { version: batch.version, sha256: sha256(readFileSync(source)) };
  copyFileSync(source, join(snapshot, 'index.sqlite'));
  writeFileSync(join(snapshot, 'manifest.json'), JSON.stringify(release, null, 2) + '\n');
  for (const file of ['index.html', 'app.js', 'styles.css']) copyFileSync(join(repo, 'demo', file), join(demo, file));
  const html = join(demo, 'index.html');
  writeFileSync(html, readFileSync(html, 'utf8').replace('PUBLIC CATALOGUE', 'MAINTAINER PREVIEW'));
  const app = join(demo, 'app.js');
  writeFileSync(app, readFileSync(app, 'utf8')
    .replace('Open data file', 'Open dataset')
    .replace('link-only records excluded', 'intake candidates held out'));
  writeFileSync(join(demo, 'catalogue.json'), JSON.stringify({ ...release, results: rows, excluded: batch.excluded }, null, 2) + '\n');
  console.log(`${rows.length} records staged for review as ${release.version}.`);
} finally { rmSync(temporary, { recursive: true, force: true }); }
