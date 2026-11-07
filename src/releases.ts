import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkIntegrity, copyPrivateIndex, openIndex, stageFile } from './database.js';
import { object } from './http.js';

export const releaseVersion = '2026-11-07.1';
export const releaseDirectory = fileURLToPath(new URL(`../../database/releases/${releaseVersion}/`, import.meta.url));
const validVersion = /^\d{4}-\d{2}-\d{2}\.\d+$/;
const legacy = 'legacy';
interface Selection { current: string; previous: string | null }
interface CatalogueRelease { version: string; sha256: string }

function digest(file: string) {
  const info = lstatSync(file);
  if (!info.isFile() || info.size > 50_000_000) throw new Error('Invalid catalogue file.');
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function manifest(path: string): CatalogueRelease {
  const info = lstatSync(path);
  if (!info.isFile() || info.size > 4096) throw new Error('Invalid catalogue manifest file.');
  const row = object(JSON.parse(readFileSync(path, 'utf8')));
  if (typeof row.version !== 'string' || !validVersion.test(row.version) ||
      typeof row.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(row.sha256)) {
    throw new Error('Invalid catalogue manifest.');
  }
  return { version: row.version, sha256: row.sha256 };
}

function pointerPath(directory: string) {
  return join(directory, 'catalogue-selection.json');
}

export function selection(directory: string): Selection {
  const path = pointerPath(directory);
  let row: Record<string, unknown>;
  try {
    const info = lstatSync(path);
    if (!info.isFile() || info.size > 4096) throw new Error('Invalid catalogue selection.');
    row = object(JSON.parse(readFileSync(path, 'utf8')));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { current: legacy, previous: null };
    throw error;
  }
  const valid = (version: unknown): version is string => typeof version === 'string' &&
    (version === legacy || validVersion.test(version));
  if (!valid(row.current) || (row.previous !== null && !valid(row.previous))) {
    throw new Error('Invalid catalogue selection.');
  }
  return { current: row.current, previous: row.previous };
}

function catalogueFolder(directory: string, version: string) {
  if (!validVersion.test(version)) throw new Error('Invalid catalogue version.');
  return join(directory, 'catalogues', version);
}

function installedPath(directory: string, version: string) {
  if (version === legacy) return join(directory, 'public.sqlite');
  const folder = catalogueFolder(directory, version);
  return join(folder, 'index.sqlite');
}

function checkVersion(directory: string, version: string, integrity = true) {
  const path = installedPath(directory, version);
  if (version !== legacy) {
    const saved = manifest(join(dirname(path), 'manifest.json'));
    if (saved.version !== version || digest(path) !== saved.sha256) throw new Error('Installed catalogue failed checksum validation.');
  }
  if (integrity) {
    const db = openIndex(path, 'public');
    try { checkIntegrity(db); }
    finally { db.close(); }
  }
  return path;
}

export function selectedPublicPath(directory: string) {
  const version = selection(directory).current;
  // Checksums are verified at installation and selection, then on each open of a released snapshot.
  if (version === legacy) return installedPath(directory, version);
  return checkVersion(directory, version, false);
}

export async function selectCatalogue(directory: string, action: 'update' | 'rollback', requested?: string,
    source = releaseDirectory) {
  const before = selection(directory);
  const release = action === 'update' ? manifest(join(source, 'manifest.json')) : null;
  const version = requested ?? release?.version ?? before.previous;
  if (!version) throw new Error('No previous catalogue is available.');
  if (release && version !== release.version) throw new Error('The requested catalogue is not bundled with this checkout.');
  if (before.current === version) {
    checkVersion(directory, version);
    return before;
  }
  const lock = join(directory, '.catalogue-lock');
  mkdirSync(lock, { mode: 0o700 });
  try {
    const current = selection(directory);
    if (current.current !== before.current || current.previous !== before.previous) {
      throw new Error('Catalogue selection changed. Retry after checking the active version.');
    }
    if (action === 'update') checkVersion(directory, before.current);
    if (release) {
      const sourceFile = join(source, 'index.sqlite');
      if (digest(sourceFile) !== release.sha256) throw new Error('Bundled catalogue failed checksum validation.');
      const folder = catalogueFolder(directory, release.version);
      mkdirSync(folder, { recursive: true, mode: 0o700 });
      const target = join(folder, 'index.sqlite');
      const targetManifest = join(folder, 'manifest.json');
      if (!existsSync(target)) await stageFile(target, (temporary) => {
        copyFileSync(sourceFile, temporary);
        if (digest(temporary) !== release.sha256) throw new Error('Catalogue copy failed checksum validation.');
        const db = openIndex(temporary, 'public');
        try { checkIntegrity(db); } finally { db.close(); }
      });
      if (digest(target) !== release.sha256) throw new Error('Existing catalogue has a different checksum.');
      if (!existsSync(targetManifest)) await stageFile(targetManifest, (temporary) =>
        writeFileSync(temporary, JSON.stringify(release), { flag: 'wx' }));
    }
    checkVersion(directory, version);
    const backups = join(directory, 'catalogue-backups');
    mkdirSync(backups, { recursive: true, mode: 0o700 });
    const backupPath = join(backups, `private-${randomUUID()}.sqlite`);
    await copyPrivateIndex(join(directory, 'private.sqlite'), backupPath);
    const next = { current: version, previous: before.current };
    const temporary = join(lock, 'selection.json');
    writeFileSync(temporary, JSON.stringify(next) + '\n', { flag: 'wx', mode: 0o600 });
    renameSync(temporary, pointerPath(directory));
    return next;
  } finally { rmSync(lock, { recursive: true, force: true }); }
}

export function buildReleaseManifest(file: string) {
  return { version: releaseVersion, sha256: digest(file) };
}

export function releaseBuildDirectory() {
  return mkdtempSync(join(releaseDirectory, '.build-'));
}
