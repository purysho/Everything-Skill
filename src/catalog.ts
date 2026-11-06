import type { DatabaseSync } from 'node:sqlite';
import { canonicalResource } from './identity.js';
import { dot, fuseRankings, labelFor, localEmbed, route, termsFor, type Embed, type RetrievalMode } from './retrieval.js';

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
  r.source_id AS sourceId, r.kind, r.category, r.title, r.url, r.summary, r.version,
  r.checked_on AS checkedOn, r.evidence_url AS evidenceUrl,
  r.license_id AS licence, r.license_url AS licenceUrl
`;

export interface EvidenceCard {
  sourceId: string;
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
  mode?: RetrievalMode;
  embed?: Embed;
  thresholds?: readonly number[];
  accept?: (card: EvidenceCard) => boolean;
}

export function search(db: DatabaseSync, query: string, options: SearchOptions) {
  const excluded = { blocked: 0, archived: 0, unavailable: 0, 'licence-unclear': 0, pending: 0 };
  if (query.length > 500) throw new Error('Use at most 500 characters for a search.');
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 25) {
    throw new Error('Search limit must be an integer from 1 to 25.');
  }
  const terms = termsFor(query).slice(0, 24);
  if (terms.length === 0) return { results: [], excluded };
  const mode = options.mode ?? 'routed';
  const routedCategory = mode === 'routed' && !options.category ? route(terms) : null;

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
    if (Object.hasOwn(excluded, state)) excluded[state as keyof typeof excluded] = Number(row.count);
  }
  type Candidate = EvidenceCard & { tags: string };
  const lexical = mode === 'dense' ? [] : db.prepare(`
    SELECT ${fields}, r.tags ${match} AND (${eligibility}) = 'conditional'
    ORDER BY bm25(resource_fts, 8, 1, 5, 2), r.url LIMIT 100
  `).all(...args) as unknown as Candidate[];
  const dense = mode === 'lexical' ? [] : db.prepare(`
    SELECT ${fields}, r.tags FROM resources r
    WHERE (${eligibility}) = 'conditional'
      AND (? IS NULL OR r.kind = ?) AND (? IS NULL OR r.category = ?)
      AND (? IS NULL OR r.category = ? OR substr(r.category, 1, length(?) + 1) = ? || '/')
    ORDER BY r.url LIMIT 1000
  `).all(kind, kind, category, category, routedCategory, routedCategory,
    routedCategory, routedCategory) as unknown as Candidate[];
  const embed = options.embed ?? localEmbed;
  const queryVector = dense.length ? embed(terms.join(' ')) : new Float32Array(0);
  const denseRanks = dense.map((row) => ({
    row, similarity: dot(queryVector, embed(`${row.title} ${row.summary} ${row.tags}`)),
  })).filter(({ similarity }) => similarity >= 0.13)
    .sort((a, b) => b.similarity - a.similarity || a.row.url.localeCompare(b.row.url)).slice(0, 100);
  const similarities = new Map(denseRanks.map(({ row, similarity }) => [row.url, similarity]));
  const candidates = new Map([...lexical, ...denseRanks.map(({ row }) => row)].map((row) => [row.url, row]));
  const rank = fuseRankings([lexical.map((row) => row.url), denseRanks.map(({ row }) => row.url)]);
  const eligible = [...candidates.values()].filter((card) => options.accept?.(card) ?? true);
  const ranked = eligible.map(({ tags, ...card }) => {
    const words = new Set(termsFor(`${card.title} ${card.summary} ${tags} ${card.url}`));
    const coverage = terms.filter((term) => words.has(term)).length / terms.length;
    const semantic = similarities.get(card.url) ?? 0;
    const fusion = Math.min(1, (rank.get(card.url) ?? 0) * (mode === 'lexical' || mode === 'dense' ? 61 : 30.5));
    const precise = terms.length <= 3;
    const relevance = mode === 'lexical' ? coverage : mode === 'dense' ? semantic :
      coverage * (precise ? 0.6 : 0.45) + semantic * (precise ? 0.2 : 0.35) + 0.2 * fusion;
    const score = Math.round(40 + 29 * Math.min(1, relevance));
    const { name: label, colour } = labelFor(score, 'Conditional', options.thresholds);
    return { ...card, score, label, colour, fusion,
      reason: 'Metadata and licence reviewed. Runtime security, cost and current freshness are unverified.' };
  }).sort((a, b) => b.score - a.score || b.fusion - a.fusion);
  const focused = routedCategory ? ranked.filter((card) => card.category === routedCategory ||
    card.category.startsWith(routedCategory + '/')) : [];
  const shortlist = focused[0] && focused[0].score >= 50 ? focused : ranked;
  return {
    results: shortlist.slice(0, limit).map(({ fusion: _fusion, ...card }) => card),
    excluded,
  };
}

export function exportCatalog(db: DatabaseSync) {
  return db.prepare(`
    SELECT ${fields} FROM resources r
    WHERE (${eligibility}) = 'conditional' ORDER BY r.url
  `).all() as unknown as EvidenceCard[];
}
