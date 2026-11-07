import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogueResources, heldIntakeCount } from '../database/seeds/catalogue.js';
import { exportCatalog, markdownText, seedCatalog } from './catalog.js';
import { initialize, openIndex } from './database.js';
import { versionDemoAssets } from './demo.js';
import { buildReleaseManifest, releaseBuildDirectory, releaseDirectory } from './releases.js';

mkdirSync(releaseDirectory, { recursive: true });
const directory = releaseBuildDirectory();
try {
  await initialize(directory, (db) => seedCatalog(db, catalogueResources));
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
  const json = JSON.stringify({ ...manifest, results: rows, excluded: heldIntakeCount + catalogueResources.length - rows.length }, null, 2) + '\n';
  const manifestPath = join(releaseDirectory, 'manifest.json');
  const manifestText = JSON.stringify(manifest, null, 2) + '\n';
  if (!existsSync(manifestPath)) writeFileSync(manifestPath, manifestText, { flag: 'wx' });
  else if (readFileSync(manifestPath, 'utf8').replace(/\r\n/g, '\n') !== manifestText) {
    throw new Error('Existing release manifest differs.');
  }
  writeFileSync(join(root, 'exports', 'catalogue.json'), json);
  writeFileSync(join(root, 'demo', 'catalogue.json'), json);
  versionDemoAssets(join(root, 'demo'), manifest.version);
  writeFileSync(join(root, 'exports', 'CATALOGUE.md'), [
    '# Everything Skill catalogue', '', `Version ${manifest.version}`, '',
    'Each entry is Conditional. The listed licence applies to the pinned source and scope reviewed.', '',
    ...rows.map((row) => `- [${markdownText(row.title)}](<${row.evidenceUrl}>) · ${markdownText(row.summary)} [${row.licence}](<${row.licenceUrl}>)`), '',
    `${heldIntakeCount + catalogueResources.length - rows.length} intake records are held outside active results.`, '',
  ].join('\n'));
} finally { rmSync(directory, { recursive: true, force: true }); }
