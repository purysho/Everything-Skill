import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Tiktoken } from 'js-tiktoken/lite';
import encoding from 'js-tiktoken/ranks/o200k_base';
import { search, seedCatalog, type SeedResource } from '../src/catalog.js';
import { initialize, openIndex } from '../src/database.js';
import { retrievalModes } from '../src/retrieval.js';
import { rerankLocal } from '../src/transformer.js';

interface Source {
  repo: string;
  revision: string;
  path: string;
  site: string;
  licence: string;
  notice: string;
}
interface Evidence { notice: string; pages: Record<string, string> }

const root = new URL('../../evaluation/', import.meta.url);
const read = (name: string) => readFileSync(new URL(name, root), 'utf8');
const sourceText = read('sources.json');
const evidenceText = read('source-hashes.json');
const corpusText = read('corpus.tsv');
const queryText = read('queries.tsv');
const sources = JSON.parse(sourceText) as Record<string, Source>;
const evidence = JSON.parse(evidenceText) as Record<string, Evidence>;
const dataHash = createHash('sha256').update(sourceText).update(evidenceText).update(corpusText).update(queryText).digest('hex');
const hash = /^[a-f0-9]{64}$/;
const rows: SeedResource[] = corpusText.trimEnd().split('\n').map((line) => {
  const [group, key, title, summary, alternate] = line.trimEnd().split('\t');
  const source = group && sources[group];
  const proof = group && evidence[group];
  if (!source || !proof || !key || !title || !summary || !hash.test(proof.notice) ||
      !hash.test(proof.pages[key] ?? '')) throw new Error('Invalid or unverified evaluation row.');
  const base = `https://github.com/${source.repo}/blob/${source.revision}/`;
  const path = alternate ? 'doc/source/' + alternate : source.path + key;
  const url = alternate ? new URL('../' + alternate + '.html', source.site).href : source.site + key + '.html';
  return {
    sourceId: `${group}:${key}`, url, kind: 'other', category: group, title, summary,
    tags: key.replace(/[^a-z0-9]+/gi, ' '), version: source.revision,
    checkedOn: '2026-11-06', evidenceUrl: base + path + '.rst',
    licence: { state: 'verified', id: source.licence, url: base + source.notice },
    security: 'metadata-only', availability: 'active',
  };
});
const keys = new Set(rows.map((row) => row.sourceId));
const queries = queryText.trimEnd().split('\n').map((line) => {
  const [query, ...relevant] = line.trimEnd().split('\t');
  if (!query || !relevant.length || new Set(relevant).size !== relevant.length ||
      relevant.some((key) => !keys.has(key))) throw new Error('Invalid evaluation judgement.');
  return { query, relevant };
});
if (keys.size !== rows.length || rows.length < 100 || queries.length < 30) {
  throw new Error('The held-out benchmark needs 100 distinct resources and 30 labelled queries.');
}

const models = process.argv[2];
const tokenizer = new Tiktoken(encoding);
const directory = mkdtempSync(join(tmpdir(), 'everything-heldout-'));
const discount = (index: number) => 1 / Math.log2(index + 2);
const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0);
try {
  const start = performance.now();
  await initialize(directory, (db) => seedCatalog(db, rows));
  const indexMs = performance.now() - start;
  const db = openIndex(join(directory, 'public.sqlite'), 'public');
  try {
    const modes = [...retrievalModes, ...(models ? ['reranked' as const] : [])];
    const metrics = [];
    for (const mode of modes) {
      const measured: Array<{
        recallAt5: number; recallAt10: number; successAt5: number; mrr: number;
        ndcgAt5: number; unjudged: number; returned: number; tokens: number; elapsed: number;
      }> = [];
      for (const { query, relevant } of queries) {
        const started = performance.now();
        const found = search(db, query, { kind: null, category: null, limit: 10,
          mode: mode === 'reranked' ? 'routed' : mode });
        const results = mode === 'reranked' ? await rerankLocal(query, found.results, models!) : found.results;
        const elapsed = performance.now() - started;
        const hits = results.map((result) => relevant.includes(result.sourceId) ? 1 : 0);
        const top5 = hits.slice(0, 5);
        const first = hits.indexOf(1);
        const ideal = total(relevant.slice(0, 5).map((_, index) => discount(index)));
        measured.push({
          recallAt5: total(top5) / relevant.length,
          recallAt10: total(hits) / relevant.length,
          successAt5: total(top5) > 0 ? 1 : 0,
          mrr: first === -1 ? 0 : 1 / (first + 1),
          ndcgAt5: total(top5.map((hit, index) => hit * discount(index))) / ideal,
          unjudged: top5.length - total(top5), returned: top5.length,
          tokens: tokenizer.encode(JSON.stringify({ ...found, results: results.slice(0, 5) })).length,
          elapsed,
        });
      }
      const avg = (key: keyof typeof measured[number]) =>
        total(measured.map((row) => row[key])) / measured.length;
      metrics.push({
        mode, recallAt5: avg('recallAt5'), recallAt10: avg('recallAt10'), successAt5: avg('successAt5'),
        mrr: avg('mrr'), ndcgAt5: avg('ndcgAt5'),
        unjudgedFractionAt5: avg('unjudged') / (avg('returned') || 1),
        tokens: total(measured.map((row) => row.tokens)),
        p50Ms: measured.map((row) => row.elapsed).sort((a, b) => a - b)[Math.floor(measured.length / 2)],
        p95Ms: measured.map((row) => row.elapsed).sort((a, b) => a - b)[Math.ceil(measured.length * 0.95) - 1],
      });
    }
    console.log(JSON.stringify({ resources: rows.length, queries: queries.length, dataHash,
      contextTokenizer: 'o200k_base', node: process.version, indexMs, metrics }, null, 2));
  } finally { db.close(); }
} finally { rmSync(directory, { recursive: true, force: true }); }
