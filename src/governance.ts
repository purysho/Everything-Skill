import type { DatabaseSync } from 'node:sqlite';
import { catalogueGitHubSource, checkPinnedGitHubFile, gitHubEndpoint, inspectGitHub } from './github.js';
import { HttpError, object, readJson, type ReadJson } from './http.js';
import { canonicalResource } from './identity.js';

import { inspectSurface, type SurfaceFlag } from './surface.js';
import { assessPublicSource, readPublicSource } from './sources.js';
export { inspectSurface } from './surface.js';

type Flag = SurfaceFlag | 'licence-unclear' | 'archived' |
  'missing-documentation' | 'external-dependency' | 'unverified-mcp-transport' | 'unavailable';

export interface Assessment {
  url: string;
  sourceId: string;
  revision: string | null;
  level: 'metadata-only' | 'warning' | 'blocked';
  flags: Flag[];
  licence: string | null;
}

export async function assessGitHub(input: string, read: ReadJson = readJson): Promise<Assessment> {
  return assessGitHubRevision(await inspectGitHub(input, read), read);
}

export async function assessGitHubRevision(repo: Awaited<ReturnType<typeof inspectGitHub>>,
    read: ReadJson = readJson): Promise<Assessment> {
  const result: Assessment = { url: repo.url, sourceId: repo.sourceId, revision: repo.version,
    level: 'metadata-only', flags: [], licence: repo.licenceId };
  if (repo.archived || !repo.licenceId) {
    result.flags.push(repo.archived ? 'archived' : 'licence-unclear');
    result.level = 'warning';
    return result;
  }
  const path = new URL(repo.url).pathname;
  for (const file of ['readme', 'contents/package.json'] as const) {
    const url = gitHubEndpoint(`/repos${path}/${file}`);
    url.searchParams.set('ref', repo.version);
    let doc: Record<string, unknown>;
    try {
      doc = object(await read(url));
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 404) throw error;
      if (file === 'readme') result.flags.push('missing-documentation');
      continue;
    }
    if (doc.encoding !== 'base64' || typeof doc.content !== 'string' || doc.content.length > 340_000) {
      result.flags.push('missing-documentation');
      continue;
    }
    const content = Buffer.from(doc.content, 'base64').toString('utf8');
    const { flags, blocked } = inspectSurface(content);
    result.flags.push(...flags);
    if (blocked) result.level = 'blocked';
    if (file !== 'readme') {
      try {
        const manifest = object(JSON.parse(content));
        for (const group of ['dependencies', 'optionalDependencies', 'devDependencies']) {
          if (Object.values(object(manifest[group])).some((value) =>
            typeof value === 'string' && /^(?:git|https?:|file:|ssh:)/i.test(value))) {
            result.flags.push('external-dependency');
          }
        }
      } catch {
        result.flags.push('missing-documentation');
      }
    }
  }
  result.flags = [...new Set(result.flags)];
  if (result.flags.length && result.level !== 'blocked') result.level = 'warning';
  return result;
}

export async function assessResource(input: string, read: ReadJson = readJson): Promise<Assessment> {
  const url = new URL(canonicalResource(input));
  if (url.hostname === 'github.com') return assessGitHub(url.href, read);
  const match = /^\/v0\.1\/servers\/([^/]+)\/versions\/latest$/.exec(url.pathname);
  if (url.origin !== 'https://registry.modelcontextprotocol.io' || !match?.[1] ||
      url.search || url.hash) throw new Error('Scan accepts a GitHub repository or a discovery link from the official MCP Registry.');
  const name = decodeURIComponent(match[1]);
  if (!/^[\w.-]+\/[\w.-]+$/.test(name) || name.length > 180) throw new Error('Invalid MCP Registry identifier.');
  const endpoint = new URL(`https://registry.modelcontextprotocol.io/v0.1/servers/${encodeURIComponent(name)}/versions/latest`);
  const server = object(object(await read(endpoint)).server);
  if (server.name !== name || typeof server.version !== 'string' || !/^[\w.+-]{1,100}$/.test(server.version)) {
    throw new Error('Invalid MCP Registry response.');
  }
  const remote = Array.isArray(server.remotes) ? server.remotes.map(object) : [];
  const unsafeRemote = remote.some((entry) => typeof entry.url === 'string' &&
    /^http:\/\//i.test(entry.url) && Array.isArray(entry.headers) &&
    entry.headers.some((value) => object(value).isSecret === true));
  const surface = inspectSurface(JSON.stringify({ description: server.description, packages: server.packages }));
  const flags: Flag[] = [...surface.flags, 'unverified-mcp-transport', 'licence-unclear'];
  if (unsafeRemote) flags.push('credential-abuse');
  return { url: endpoint.href, sourceId: `mcp:${name}`, revision: server.version, licence: null,
    level: unsafeRemote || surface.blocked ? 'blocked' : 'warning', flags: [...new Set(flags)] };
}

export function hasGovernance(db: DatabaseSync) {
  return db.prepare("SELECT 1 FROM sqlite_schema WHERE name = 'security_reports'").get() !== undefined;
}

export function recordAssessment(db: DatabaseSync, result: Assessment, observedAt = new Date().toISOString()) {
  db.prepare('INSERT INTO security_reports (url, source_id, revision, observed_at, level, flags) VALUES (?,?,?,?,?,?)')
    .run(result.url, result.sourceId, result.revision, observedAt, result.level, JSON.stringify(result.flags));
}

export function blocked(db: DatabaseSync, url: string, sourceId = '') {
  return hasGovernance(db) && db.prepare(`
    SELECT 1 FROM security_reports WHERE level='blocked' AND (url=? OR source_id=?) LIMIT 1
  `).get(url, sourceId) !== undefined;
}

export function readReports(db: DatabaseSync) {
  if (!hasGovernance(db)) return [];
  return db.prepare('SELECT id,url,revision,observed_at,level,flags FROM security_reports ORDER BY id DESC LIMIT 100')
    .all().map((row) => ({ ...row, flags: JSON.parse(String(row.flags)) as Flag[] }));
}

export const scopes = ['global', 'topic', 'project', 'session'] as const;
export type Scope = typeof scopes[number];
export interface Preference {
  scope: Scope;
  context: string;
  decision: 'allow' | 'deny';
  acknowledged: boolean;
}

export function setPreference(db: DatabaseSync, input: string, preference: Preference) {
  const url = canonicalResource(input);
  const { scope, context, decision, acknowledged } = preference;
  if (!scopes.includes(scope) || (scope === 'global' ? context !== '' : !context.trim() || context.length > 100)) {
    throw new Error('Choose global scope or a topic, project or session with a name of 1–100 characters.');
  }
  if (decision === 'allow' && (!acknowledged || blocked(db, url))) {
    throw new Error('Allowing a low-risk exception requires acknowledgement. A security block cannot be overridden.');
  }
  db.prepare(`INSERT INTO preferences VALUES (?,?,?,?) ON CONFLICT(url,scope,context)
    DO UPDATE SET decision=excluded.decision`).run(url, scope, context, decision);
}

export function preferenceFor(db: DatabaseSync, url: string, contexts: Partial<Record<Scope, string>>) {
  if (!hasGovernance(db)) return undefined;
  const lookup = db.prepare('SELECT decision FROM preferences WHERE url=? AND scope=? AND context=?');
  for (const scope of [...scopes].reverse()) {
    const context = scope === 'global' ? '' : contexts[scope];
    if (context === undefined) continue;
    const row = lookup.get(url, scope, context);
    if (row?.decision === 'allow' || row?.decision === 'deny') return row.decision;
  }
  return undefined;
}

export function suggest(db: DatabaseSync, input: string) {
  const url = canonicalResource(input);
  if (blocked(db, url)) throw new Error('A security block prevents this suggestion.');
  db.prepare(`INSERT INTO suggestions VALUES (?,1,?) ON CONFLICT(url)
    DO UPDATE SET tally=tally+1,last_seen=excluded.last_seen`).run(url, new Date().toISOString());
  return { url, status: 'pending-maintainer-review' };
}

export function listSuggestions(db: DatabaseSync) {
  if (!hasGovernance(db)) return [];
  return db.prepare('SELECT * FROM suggestions ORDER BY tally DESC, url LIMIT 100').all()
    .filter((row) => typeof row.url === 'string' && !blocked(db, row.url));
}

export type Candidate = { url: string; sourceId: string; version: string; licence: string; evidenceUrl?: string };

export function cachedEligible(db: DatabaseSync, card: Candidate) {
  if (!hasGovernance(db)) return true;
  if (blocked(db, card.url, card.sourceId)) return false;
  const last = db.prepare(`SELECT source_id,revision,flags FROM security_reports
    WHERE url=? OR source_id=? ORDER BY id DESC LIMIT 1`).get(card.url, card.sourceId);
  if (!last) return true;
  const flags = JSON.parse(String(last.flags)) as Flag[];
  return last.source_id === card.sourceId && last.revision === card.version && !flags.some((flag) =>
    flag === 'archived' || flag === 'licence-unclear' || flag === 'unavailable');
}

export async function verifyCandidate(db: DatabaseSync, card: Candidate,
    read: ReadJson = readPublicSource) {
  const url = canonicalResource(card.url);
  if (blocked(db, url, card.sourceId)) return false;
  let report: Assessment;
  try {
    report = await assessCandidate(card, read);

  } catch {
    report = { url, sourceId: card.sourceId, revision: null, licence: null, level: 'warning', flags: ['unavailable'] };
  }
  recordAssessment(db, report);
  return report.level !== 'blocked' && !blocked(db, report.url, report.sourceId) &&
    card.sourceId === report.sourceId && card.version === report.revision && card.licence === report.licence &&
    !report.flags.some(flag => flag === 'archived' || flag === 'unavailable' || flag === 'licence-unclear');
}

export async function assessCandidate(card: Candidate, read: ReadJson = readPublicSource): Promise<Assessment> {
  const url = new URL(canonicalResource(card.url));
  if (url.hostname !== 'github.com' && url.hostname !== 'raw.githubusercontent.com') {
    return assessPublicSource(card, read);
  }
  const source = catalogueGitHubSource(url.href, card.version, card.evidenceUrl);
  const report = await assessGitHub(source.repository, read);
  if (source.path && report.revision === card.version && report.level !== 'blocked') {
    await checkPinnedGitHubFile(source.repository, source.path, card.version, read);
  }
  return { ...report, url: url.href };
}
