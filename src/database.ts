import { chmodSync, linkSync, lstatSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';

const privateSchema = `CREATE TABLE discoveries (
  url TEXT PRIMARY KEY NOT NULL,
  discovered_at TEXT NOT NULL,
  notes TEXT NOT NULL
) STRICT`;

const migrations = {
  public: [`
    CREATE TABLE resources (
      id INTEGER PRIMARY KEY,
      source_id TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL CHECK (kind IN ('repository','mcp','dataset','paper','api','model','tool','other')),
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      tags TEXT NOT NULL,
      version TEXT NOT NULL,
      checked_on TEXT NOT NULL,
      evidence_url TEXT NOT NULL,
      license_id TEXT,
      license_url TEXT,
      license_state TEXT NOT NULL CHECK (license_state IN ('verified','unclear')),
      security_state TEXT NOT NULL CHECK (security_state IN ('metadata-only','pending','blocked')),
      availability TEXT NOT NULL CHECK (availability IN ('active','archived','unavailable')),
      CHECK (license_state <> 'verified' OR (license_id IS NOT NULL AND license_url IS NOT NULL)),
      CHECK ((license_state <> 'unclear' AND security_state <> 'blocked') OR summary = '')
    ) STRICT;
    CREATE INDEX resources_route ON resources(kind, category);
    CREATE VIRTUAL TABLE resource_fts USING fts5(
      title, summary, tags, url, content='resources', content_rowid='id',
      tokenize='unicode61'
    );
    CREATE TRIGGER resources_insert AFTER INSERT ON resources BEGIN
      INSERT INTO resource_fts(rowid, title, summary, tags, url)
      VALUES (new.id, new.title, new.summary, new.tags, new.url);
    END;
    CREATE TRIGGER resources_delete AFTER DELETE ON resources BEGIN
      INSERT INTO resource_fts(resource_fts, rowid, title, summary, tags, url)
      VALUES ('delete', old.id, old.title, old.summary, old.tags, old.url);
    END;
    CREATE TRIGGER resources_update AFTER UPDATE ON resources BEGIN
      INSERT INTO resource_fts(resource_fts, rowid, title, summary, tags, url)
      VALUES ('delete', old.id, old.title, old.summary, old.tags, old.url);
      INSERT INTO resource_fts(rowid, title, summary, tags, url)
      VALUES (new.id, new.title, new.summary, new.tags, new.url);
    END;
  `],
  private: [privateSchema],
} as const;

export type Store = keyof typeof migrations;

const applicationIds: Record<Store, number> = { public: 0x45535055, private: 0x45535052 };

function header(db: DatabaseSync) {
  return {
    id: Number(db.prepare('PRAGMA application_id').get()?.application_id),
    version: Number(db.prepare('PRAGMA user_version').get()?.user_version),
  };
}

function assertHeader(db: DatabaseSync, store: Store) {
  const { id, version } = header(db);
  if (id !== applicationIds[store] || version !== migrations[store].length) {
    throw new Error(`Wrong database identity or unsupported ${store} schema version.`);
  }
  if (store === 'private') {
    const objects = db.prepare('SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL').all();
    if (objects.length !== 1 || objects[0]?.sql !== privateSchema) {
      throw new Error('Invalid private index schema.');
    }
  }
}

function migrateNew(db: DatabaseSync, store: Store) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`PRAGMA application_id = ${applicationIds[store]}`);
    for (const [index, sql] of migrations[store].entries()) {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${index + 1}`);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function openIndex(path: string, store: Store): DatabaseSync {
  const file = lstatSync(path);
  if (!file.isFile() || file.isSymbolicLink()) throw new Error('Expected a regular SQLite file.');
  const db = new DatabaseSync(path, { readOnly: true, timeout: 5000 });
  try {
    db.exec('PRAGMA trusted_schema = OFF');
    assertHeader(db, store);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

function checkIntegrity(db: DatabaseSync) {
  if (db.prepare('PRAGMA quick_check').get()?.quick_check !== 'ok') {
    throw new Error('SQLite integrity check failed.');
  }
}

async function stageFile(path: string, create: (tempPath: string) => void | Promise<void>) {
  const tempDir = mkdtempSync(join(dirname(path), '.everything-stage-'));
  try {
    const temporary = join(tempDir, 'index.sqlite');
    await create(temporary);
    chmodSync(temporary, 0o600);
    // Linking a complete file publishes it atomically and fails if the target exists.
    linkSync(temporary, path);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function hasIndex(path: string, store: Store): boolean {
  try {
    openIndex(path, store).close();
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

export async function initialize(
  directory: string,
  seed: (db: DatabaseSync) => void,
) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const publicPath = join(directory, 'public.sqlite');
  const privatePath = join(directory, 'private.sqlite');
  // Check both existing files before creating either missing file.
  const publicExists = hasIndex(publicPath, 'public');
  const privateExists = hasIndex(privatePath, 'private');
  for (const [store, path, exists] of [
    ['public', publicPath, publicExists],
    ['private', privatePath, privateExists],
  ] as const) {
    if (exists) continue;
    try {
      await stageFile(path, (temporary) => {
        const db = new DatabaseSync(temporary);
        try {
          migrateNew(db, store);
          if (store === 'public') seed(db);
          checkIntegrity(db);
        } finally {
          db.close();
        }
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || !hasIndex(path, store)) throw error;
    }
  }
}

export async function copyPrivateIndex(source: string, destination: string) {
  const db = openIndex(source, 'private');
  try {
    await stageFile(destination, async (temporary) => {
      await backup(db, temporary);
      const snapshot = openIndex(temporary, 'private');
      try {
        checkIntegrity(snapshot);
      } finally {
        snapshot.close();
      }
    });
  } finally {
    db.close();
  }
}
