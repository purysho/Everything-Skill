import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { gitHubEndpoint, inspectGitHub } from './github.js';
import { object, readJson, type ReadJson } from './http.js';
import { canonicalGitHub, canonicalResource } from './identity.js';
import { termsFor } from './retrieval.js';

export const providers = ['github', 'mcp', 'web'] as const;
export type Provider = typeof providers[number];
interface Lead {
  sourceId: string;
  url: string;
  provider: Provider;
}

export async function discover(query: string, provider: Provider, read: ReadJson = readJson) {
  if (query.length > 160 || !query.trim()) throw new Error('Use a discovery query of 1–160 characters.');
  const found: Lead[] = [];
  if (provider === 'github') {
    const url = gitHubEndpoint('/search/repositories');
    const terms = termsFor(query).join(' ');
    if (!terms) throw new Error('GitHub discovery needs at least one search term.');
    url.searchParams.set('q', terms + ' is:public archived:false');
    url.searchParams.set('per_page', '8');
    const data = object(await read(url));
    for (const item of Array.isArray(data.items) ? data.items.slice(0, 8) : []) {
      const row = object(item);
      if (!Number.isSafeInteger(row.id) || typeof row.html_url !== 'string' ||
          row.private !== false || row.archived !== false) continue;
      try {
        found.push({ sourceId: `github:${row.id}`, url: canonicalGitHub(row.html_url), provider });
      } catch { /* Ignore malformed provider links. */ }
    }
  } else if (provider === 'mcp') {
    const url = new URL('https://registry.modelcontextprotocol.io/v0.1/servers');
    url.searchParams.set('search', query);
    url.searchParams.set('version', 'latest');
    url.searchParams.set('limit', '8');
    const data = object(await read(url));
    for (const item of Array.isArray(data.servers) ? data.servers.slice(0, 8) : []) {
      const row = object(object(item).server);
      if (typeof row.name !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(row.name) ||
          row.name.length > 180 || row.name.split('/').some((part) => part === '.' || part === '..')) continue;
      const encodedName = encodeURIComponent(row.name);
      found.push({ sourceId: `mcp:${row.name}`,
        url: `https://registry.modelcontextprotocol.io/v0.1/servers/${encodedName}/versions/latest`, provider });
    }
  } else {
    const url = new URL('https://en.wikipedia.org/w/api.php');
    for (const [key, value] of Object.entries({
      action: 'query', list: 'search', srsearch: query, srlimit: '8', format: 'json',
    })) url.searchParams.set(key, value);
    const data = object(object(await read(url)).query);
    for (const item of Array.isArray(data.search) ? data.search.slice(0, 8) : []) {
      const row = object(item);
      if (!Number.isSafeInteger(row.pageid)) continue;
      found.push({ sourceId: `wikipedia:${row.pageid}`,
        url: `https://en.wikipedia.org/?curid=${row.pageid}`, provider });
    }
  }
  return Array.from(new Map(found.map((lead) => [lead.sourceId, lead])).values(),
    (lead) => ({ ...lead, state: 'unverified-link' }));
}

export async function collectDiscovery(input: string, terms: string | undefined, read: ReadJson = readJson) {
  if (terms && terms.length > 500) throw new Error('Use at most 500 characters for section keywords.');
  const url = canonicalResource(input);
  if (new URL(url).hostname !== 'github.com') {
    if (terms) throw new Error('Section indexing requires a licence-eligible GitHub repository.');
    return { url, sourceId: url, revision: null, licence: null, stage: 'metadata' as const, evidence: {} };
  }
  const repo = await inspectGitHub(url, read);
  const sectionTerms = terms ? termsFor(terms).slice(0, 12) : [];
  const sections = [];
  if (sectionTerms.length && !repo.archived && repo.licenceId) {
    const request = gitHubEndpoint(`/repos${new URL(repo.url).pathname}/readme`);
    request.searchParams.set('ref', repo.version);
    const doc = object(await read(request));
    if (doc.encoding === 'base64' && typeof doc.content === 'string' && doc.content.length <= 350_000) {
      const markdown = Buffer.from(doc.content, 'base64').toString('utf8');
      const parts = markdown.split(/(?=^#{1,6}[ \t])/m).slice(0, 80);
      for (const [index, section] of parts.entries()) {
        const words = new Set(termsFor(section));
        const hits = sectionTerms.filter((term) => words.has(term)).length;
        if (!hits) continue;
        sections.push({ ordinal: index, sha256: createHash('sha256').update(section).digest('hex'), hits });
      }
    }
  }
  return { url: repo.url, sourceId: repo.sourceId, revision: repo.version, licence: repo.licenceId,
    stage: sections.length ? 'sections' as const : 'metadata' as const,
    evidence: { pinnedUrl: repo.pinnedUrl, licenceUrl: repo.licenceUrl, archived: repo.archived,
      sections: sections.sort((a, b) => b.hits - a.hits).slice(0, 8) } };
}

export function saveDiscovery(db: DatabaseSync, entry: Awaited<ReturnType<typeof collectDiscovery>>) {
  const observedAt = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const previous = db.prepare('SELECT url FROM discovery_evidence WHERE source_id = ?').get(entry.sourceId);
    const url = typeof previous?.url === 'string' ? previous.url : entry.url;
    db.prepare('INSERT INTO discoveries VALUES (?, ?, ?) ON CONFLICT(url) DO NOTHING').run(url, observedAt, '');
    db.prepare(`INSERT INTO discovery_evidence VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET source_id=excluded.source_id, revision=excluded.revision,
        licence=excluded.licence, observed_at=excluded.observed_at, stage=excluded.stage, evidence=excluded.evidence
      WHERE discovery_evidence.revision IS NOT excluded.revision OR excluded.stage = 'sections'
        OR discovery_evidence.stage = 'metadata' OR discovery_evidence.licence IS NOT excluded.licence
        OR json_extract(discovery_evidence.evidence, '$.archived') IS NOT json_extract(excluded.evidence, '$.archived')`)
      .run(url, entry.sourceId, entry.revision, entry.licence, observedAt, entry.stage, JSON.stringify(entry.evidence));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function listDiscoveries(db: DatabaseSync) {
  if (!db.prepare("SELECT 1 FROM sqlite_schema WHERE name = 'discovery_evidence'").get()) return [];
  return db.prepare('SELECT * FROM discovery_evidence ORDER BY observed_at DESC LIMIT 100').all()
    .map((row) => ({ url: String(row.url), sourceId: String(row.source_id), revision: row.revision,
      licence: row.licence, stage: String(row.stage), observedAt: String(row.observed_at),
      evidence: JSON.parse(String(row.evidence)) as unknown }));
}
