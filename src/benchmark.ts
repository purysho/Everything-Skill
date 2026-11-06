import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { starterResources } from '../database/seeds/starter.js';
import { search, seedCatalog } from './catalog.js';
import { initialize, openIndex } from './database.js';
import { retrievalModes } from './retrieval.js';

const queries = [
  ['repository for fhir and clinical software', 'Awesome Healthcare'],
  ['hospital', 'Awesome Healthcare'],
  ['medical interoperability', 'Awesome Healthcare'],
  ['list of healthcare software', 'Awesome Healthcare'],
  ['grounding and embeddings papers', 'Awesome-RAG'],
  ['rag retrieval catalogue', 'Awesome-RAG'],
  ['semantic grounding research', 'Awesome-RAG'],
  ['configure claude and codex', 'ECC'],
  ['coding assistants workflow', 'ECC'],
  ['directories of curated resources', 'Awesome'],
  ['mcp servers catalogue', 'Awesome MCP Servers by mcpHQ'],
  ['modelcontextprotocol directory', 'Awesome MCP Servers by mcpHQ'],
] as const;
const directory = mkdtempSync(join(tmpdir(), 'everything-benchmark-'));
try {
  await initialize(directory, (db) => seedCatalog(db, starterResources));
  const db = openIndex(join(directory, 'public.sqlite'), 'public');
  try {
    for (const mode of retrievalModes) {
      let found = 0;
      let dcg = 0;
      let words = 0;
      let reciprocalRank = 0;
      for (const [query, expected] of queries) {
        const { results } = search(db, query, { kind: null, category: null, limit: 3, mode });
        words += results.reduce((count, row) => count + (row.title + ' ' + row.summary).split(/\s+/).length, 0);
        const rank = results.findIndex((row) => row.title === expected) + 1;
        if (!rank) continue;
        found++;
        reciprocalRank += 1 / rank;
        dcg += 1 / Math.log2(rank + 1);
      }
      console.log(JSON.stringify({ mode, queries: queries.length, recallAt3: found / queries.length,
        mrr: reciprocalRank / queries.length, ndcgAt3: dcg / queries.length, outputWords: words }));
    }
  } finally {
    db.close();
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
