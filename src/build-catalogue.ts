import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { starterResources } from '../database/seeds/starter.js';
import { exportCatalog, seedCatalog } from './catalog.js';
import { initialize, openIndex } from './database.js';
import { buildReleaseManifest, releaseBuildDirectory, releaseDirectory } from './releases.js';

mkdirSync(releaseDirectory, { recursive: true });
const directory = releaseBuildDirectory();
try {
  await initialize(directory, (db) => seedCatalog(db, starterResources));
  const source = join(directory, 'public.sqlite');
  const db = openIndex(source, 'public');
  const rows = (() => { try { return exportCatalog(db); } finally { db.close(); } })();
  const manifest = buildReleaseManifest(source);
  const destination = join(releaseDirectory, 'index.sqlite');
  if (existsSync(destination) && buildReleaseManifest(destination).sha256 !== manifest.sha256) {
    throw new Error('The existing release is immutable. Bump releaseVersion to publish changed bytes.');
  }
  if (!existsSync(destination)) copyFileSync(source, destination);
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const json = JSON.stringify({ ...manifest, results: rows, excluded: starterResources.length - rows.length }, null, 2) + '\n';
  const manifestPath = join(releaseDirectory, 'manifest.json');
  const manifestText = JSON.stringify(manifest, null, 2) + '\n';
  if (!existsSync(manifestPath)) writeFileSync(manifestPath, manifestText, { flag: 'wx' });
  else if (readFileSync(manifestPath, 'utf8').replace(/\r\n/g, '\n') !== manifestText) {
    throw new Error('Existing release manifest differs.');
  }
  writeFileSync(join(root, 'exports', 'catalogue.json'), json);
  writeFileSync(join(root, 'demo', 'catalogue.json'), json);
  writeFileSync(join(root, 'exports', 'CATALOGUE.md'), [
    '# Everything Skill catalogue', '', `Version ${manifest.version}`, '',
    'Each entry is Conditional. The listed licence applies to the pinned source and scope reviewed.', '',
    ...rows.map((row) => `- [${row.title}](${row.evidenceUrl}) · ${row.summary} [${row.licence}](${row.licenceUrl})`), '',
    `${starterResources.length - rows.length} link-only records are excluded.`, '',
  ].join('\n'));
} finally { rmSync(directory, { recursive: true, force: true }); }
