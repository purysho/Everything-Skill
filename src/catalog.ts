import type { DatabaseSync } from 'node:sqlite';
import { canonicalResource } from './identity.js';

export const kinds = ['repository', 'mcp', 'dataset', 'paper', 'api', 'model', 'tool', 'other'] as const;
export type Kind = typeof kinds[number];

type Licence =
  | { state: 'verified'; id: string; url: string }
  | { state: 'unclear' };

export interface SeedResource {
  sourceId: string;
  url: string;
  kind: Kind;
  category: string;
  title: string;
  summary: string;
  tags: string;
  version: string;
  checkedOn: string;
  evidenceUrl: string;
  licence: Licence;
  security: 'metadata-only' | 'pending' | 'blocked';
  availability: 'active' | 'archived' | 'unavailable';
}

export function seedCatalog(db: DatabaseSync, resources: readonly SeedResource[]) {
  const insert = db.prepare(`
    INSERT INTO resources (source_id, url, kind, category, title, summary, tags,
      version, checked_on, evidence_url, license_id, license_url, license_state,
      security_state, availability)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT DO NOTHING
  `);
  const existing = db.prepare(`
    SELECT version, license_id, license_state, security_state, availability
    FROM resources WHERE source_id = ? OR url = ?
  `);
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const entry of resources) {
      const licence = entry.licence;
      const url = canonicalResource(entry.url);
      const evidence = new URL(entry.evidenceUrl);
      const licenceUrl = licence.state === 'verified' ? new URL(licence.url) : undefined;
      if (!entry.sourceId.trim() || !entry.title.trim() || !entry.version.trim() ||
          !/^\d{4}-\d{2}-\d{2}$/.test(entry.checkedOn) ||
          [evidence, ...(licenceUrl ? [licenceUrl] : [])].some(
            (link) => link.protocol !== 'https:' || link.username || link.password,
          )) {
        throw new Error('Invalid seed provenance.');
      }
      const licenceId = licence.state === 'verified' ? licence.id : null;
      const result = insert.run(entry.sourceId, url, entry.kind, entry.category, entry.title,
        licence.state === 'verified' && entry.security !== 'blocked' ? entry.summary : '',
        entry.tags, entry.version, entry.checkedOn, evidence.href, licenceId,
        licenceUrl?.href ?? null, licence.state, entry.security, entry.availability);
      if (result.changes === 0) {
        const matches = existing.all(entry.sourceId, url);
        const [match] = matches;
        if (matches.length !== 1 || match?.version !== entry.version ||
            match.license_id !== licenceId || match.license_state !== licence.state ||
            match.security_state !== entry.security || match.availability !== entry.availability) {
          throw new Error('Conflicting duplicate seed record. Resolve its evidence and policy before indexing.');
        }
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const eligibility = `CASE
  WHEN security_state = 'blocked' THEN 'blocked'
  WHEN availability <> 'active' THEN availability
  WHEN license_state <> 'verified' THEN 'licence-unclear'
  WHEN security_state <> 'metadata-only' THEN 'pending'
  ELSE 'conditional'
END`;

const fields = `
  r.kind, r.category, r.title, r.url, r.summary, r.version,
  r.checked_on AS checkedOn, r.evidence_url AS evidenceUrl,
  r.license_id AS licence, r.license_url AS licenceUrl
`;

interface EvidenceCard {
  kind: Kind;
  category: string;
  title: string;
  url: string;
  summary: string;
  version: string;
  checkedOn: string;
  evidenceUrl: string;
  licence: string;
  licenceUrl: string;
}

export interface SearchOptions {
  kind: string | null;
  category: string | null;
  limit: number;
}

export function search(db: DatabaseSync, query: string, options: SearchOptions) {
  const excluded = { blocked: 0, archived: 0, unavailable: 0, 'licence-unclear': 0, pending: 0 };
  if (query.length > 500) throw new Error('Use at most 500 characters for a search.');
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 25) {
    throw new Error('Search limit must be an integer from 1 to 25.');
  }
  const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}\p{M}]+/gu) ?? [])].slice(0, 24);
  if (terms.length === 0) return { results: [], excluded };

  // Only token characters can appear inside the quoted FTS literals.
  const literal = terms.map((word) => `"${word}"`).join(' OR ');
  const match = `
    FROM resource_fts JOIN resources r ON r.id = resource_fts.rowid
    WHERE resource_fts MATCH ?
      AND (? IS NULL OR r.kind = ?) AND (? IS NULL OR r.category = ?)
  `;
  const { kind, category, limit } = options;
  const args = [literal, kind, kind, category, category];
  const counts = db.prepare(`
    SELECT ${eligibility} AS state, count(*) AS count ${match} GROUP BY state
  `).all(...args);
  for (const row of counts) {
    const state = String(row.state);
    if (state in excluded) excluded[state as keyof typeof excluded] = Number(row.count);
  }
  const rows = db.prepare(`
    SELECT ${fields}, r.tags ${match} AND (${eligibility}) = 'conditional'
    ORDER BY bm25(resource_fts, 8, 1, 5, 2), r.url LIMIT ?
  `).all(...args, 100) as unknown as (EvidenceCard & { tags: string })[];

  return {
    results: rows.map(({ tags, ...card }) => {
      const searchable = `${card.title} ${card.summary} ${tags} ${card.url}`.toLowerCase()
        .normalize('NFD').replace(/\p{M}/gu, '');
      const words = new Set(searchable.match(/[\p{L}\p{N}]+/gu) ?? []);
      const hits = terms.filter((term) => words.has(term.normalize('NFD').replace(/\p{M}/gu, ''))).length;
      return {
        ...card,
        score: Math.round(40 + 29 * hits / terms.length),
        label: 'Conditional',
        reason: 'Metadata and licence reviewed. Runtime security and current freshness are unverified.',
      };
    }).sort((a, b) => b.score - a.score).slice(0, limit),
    excluded,
  };
}

export function exportCatalog(db: DatabaseSync) {
  return db.prepare(`
    SELECT ${fields} FROM resources r
    WHERE (${eligibility}) = 'conditional' ORDER BY r.url
  `).all() as unknown as EvidenceCard[];
}
