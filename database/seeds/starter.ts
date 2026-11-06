import type { SeedResource } from '../../src/catalog.js';

function source({ id, repo, version, licence, licencePath = 'LICENSE', file, ...entry }:
    Pick<SeedResource, 'version' | 'kind' | 'category' | 'title' | 'summary' | 'tags'> &
    { id: number; repo: string; licence: string; licencePath?: string; file?: string }): SeedResource {
  const repository = `https://github.com/${repo}`;
  return {
    ...entry,
    sourceId: `github:${id}`,
    url: file ? `https://raw.githubusercontent.com/${repo}/${version}/${file}` : repository,
    version,
    checkedOn: '2026-11-06',
    evidenceUrl: file ? `${repository}/blob/${version}/${file}` : `${repository}/tree/${version}`,
    licence: { state: 'verified', id: licence, url: `${repository}/blob/${version}/${licencePath}` },
    security: 'metadata-only',
    availability: 'active',
  };
}

// Each record is one tool, service implementation, dataset file, or specification.
export const starterResources = [
  source({
    id: 268163609, repo: 'qdrant/qdrant', version: '222b2e44ab1c3f17e8246396ead6558e45041df7',
    licence: 'Apache-2.0', kind: 'tool', category: 'software', title: 'Qdrant',
    summary: 'A vector database for storing embeddings and finding similar records with metadata filters.',
    tags: 'rag retrieval vector database similarity embeddings semantic search',
  }),
  source({
    id: 138754790, repo: 'duckdb/duckdb', version: '90fd938fd55b30f65a544f3a6eec3886207d5319',
    licence: 'MIT', kind: 'tool', category: 'software', title: 'DuckDB',
    summary: 'An analytical SQL database with a command-line client for querying local CSV and Parquet files.',
    tags: 'sql analytical csv parquet local command line data',
  }),
  source({
    id: 952688112, repo: 'microsoft/playwright-mcp', version: '3d49ff2615216fcef64fb7748d9f660d3c000ad7',
    licence: 'Apache-2.0', kind: 'mcp', category: 'mcp', title: 'Playwright MCP',
    summary: 'An MCP server that exposes browser navigation and interaction through Playwright.',
    tags: 'mcp playwright browser automation accessibility modelcontextprotocol',
  }),
  source({
    id: 142366775, repo: 'hapifhir/hapi-fhir-jpaserver-starter', version: '8db622874c2d1e3d26fe636978e00d77b75c0d2b',
    licence: 'Apache-2.0', kind: 'api', category: 'healthcare', title: 'HAPI FHIR JPA Server Starter',
    summary: 'A runnable Java starter for hosting a FHIR REST server backed by a relational database.',
    tags: 'fhir healthcare clinical medical interoperability api server rest java',
  }),
  source({
    id: 269674245, repo: 'allisonhorst/palmerpenguins', version: '8957207b78d6ccd1b4654a9dd9c9041b657478ab',
    licence: 'CC0-1.0', licencePath: 'LICENSE.md', file: 'inst/extdata/penguins.csv',
    kind: 'dataset', category: 'data', title: 'Palmer Penguins CSV',
    summary: 'A table of penguin species, island, bill measurements, flipper length and body mass.',
    tags: 'penguins csv dataset ecology species antarctica measurements',
  }),
  source({
    id: 17372733, repo: 'OAI/OpenAPI-Specification', version: '4f86429f134f7e48b6351563549b4502fc69de52',
    licence: 'Apache-2.0', file: 'versions/3.2.0.md',
    kind: 'other', category: 'software', title: 'OpenAPI Specification 3.2.0',
    summary: 'The version 3.2.0 specification for describing HTTP endpoints, inputs and responses.',
    tags: 'openapi http api specification schema reference endpoints',
  }),
] as const;
