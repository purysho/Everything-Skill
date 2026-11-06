# Everything Skill — Build Plan

## Phase 1 — Lean foundation

- Create the npm TypeScript package and Node.js reference runtime.
- Add strict TypeScript, linting, unit tests, schema validation, migrations, and no unnecessary framework dependencies.
- Create public/private SQLite schemas and JSON/Markdown export formats.
- Add canonical URL and repository identity normalisation.

Acceptance check: a clean checkout can initialise, migrate, query, export, back up, and restore an empty index on Windows, macOS, and Linux.

## Phase 2 — Focused seed index

Seed only high-quality starting sources: Awesome-RAG, the official MCP Everything server, the official MCP registry, curated MCP catalogues, ECC, Awesome Healthcare, and Sindre Sorhus’s Awesome list. Verify each entry, licence, provenance, maintenance state, and duplicate identity.

Acceptance check: every seed entry has evidence, licence state, security state, canonical URL, source version, and a reproducible ingestion record.

## Phase 3 — Retrieval cascade

- Implement query parsing and category routing.
- Add FTS5 and metadata filtering.
- Add embeddings behind a small interface.
- Add reciprocal-rank fusion.
- Add optional transformer reranking for the reduced candidate set.
- Add adaptive score weights and fixed user-configurable labels.

Acceptance check: benchmarked hybrid routing beats flat keyword and flat dense baselines on recall, relevance, and token count.

## Phase 4 — Live discovery and staged indexing

- Add GitHub, MCP Registry, and web discovery connectors.
- Register metadata before content.
- Index relevant sections on demand.
- Add freshness, licence, and availability checks.
- Store private discoveries separately.

Acceptance check: a specialised query can discover and privately index a previously unseen source without copying prohibited content.

## Phase 5 — Security and governance

- Implement untrusted-content boundaries.
- Add injection, dependency, permission, and credential-risk checks.
- Add hard-block and warning classifications.
- Add append-only security reports and maintainer review queue.
- Add duplicate prevention and suggestion tallies.
- Add change-triggered monitoring and query-time rescans.

Acceptance check: adversarial fixtures cannot alter policy or obtain credentials; changed resources create the correct review state.

## Phase 6 — Private MCP generation

- Add adapter templates for URL-to-markdown, OpenAPI, browser workflow, and recorded-session approaches.
- Keep generated adapters private and experimental.
- Sandbox test with synthetic/read-only inputs.
- Require fresh confirmation for authenticated or state-changing operations.

Acceptance check: a generated adapter either passes a restricted contract test or is clearly labelled failed/partial/untested.

## Phase 7 — User experience and demo

- Build a friendly README for non-GitHub users.
- Add install guides for Codex/ChatGPT and Claude Code.
- Add static GitHub Pages-compatible demo; add live features only when free and reliable.
- Use real public resources, licence notices, weekly freshness scans, and replacement changelog entries.

Acceptance check: a first-time user can understand, install, search, suggest, update, and rollback without reading source code.

## Phase 8 — Runtime and platform compatibility

- Node.js is canonical with committed npm lockfile.
- Test Bun and Deno compatibility where practical.
- Test path, filesystem, process, SQLite, and packaging behaviour across Windows, macOS, and Linux.

Acceptance check: supported commands have documented results on all three operating-system families and unsupported runtime features fail clearly.

## Implementation discipline

- Prefer standard-library and small focused dependencies.
- Do not add an agent framework unless a measured requirement justifies it.
- Keep every feature behind an observable acceptance test.
- Record architecture decisions and rejected complexity.
