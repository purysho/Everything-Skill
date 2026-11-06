# Everything Skill work log

## 2026-11-06 · Intake and implementation plan

### Implementation gaps

| Area | ZIP state | Planned delivery |
| --- | --- | --- |
| Runtime and packaging | No code, npm manifest, lockfile, CI, or host packaging | Phase 1 local CLI and runtime checks, then host installation and CI |
| Data | Placeholder folders only | Phase 1 separate SQLite files, transactional schema, safe snapshots, small curated starter index and exports |
| Discovery and ranking | Architecture and evaluation plans only | Phase 1 canonical identities, metadata filters and lexical shortlist. Broader seeds and measured hybrid retrieval follow |
| Safety and updates | Policy prose only | Phase 1 fail-closed shortlist eligibility and offline operation. Later stages add scanning, review history, live changes and version selection |
| Release | Licence pointer only, no demo or public releases | Exact PolyForm text and a draft notice. Later stages add static demo, monitored evidence and release checks |

Read all 19 ZIP files and verified archive integrity. The target GitHub repository is public with an empty ref list and `main` as the configured default. The workspace had no prior checkout. Original brief files were extracted intact to a new local checkout.

### Phase 1 plan before code

1. Verify Node SQLite, FTS5, and licence distribution sources. Use Node 24 and npm with strict TypeScript, a lockfile, Node's test runner, and no runtime dependencies.
2. Add explicit local init, read-only status/search/export, and a validated, non-overwriting backup/restore path. Keep private state outside the checkout and require confirmation for the host to invoke mutating commands. Use database identity and schema checks before opening existing stores. Publish complete SQLite files atomically within the destination filesystem.
3. Seed a few maintainer-curated public repository links, record source identities, pinned commit and licence evidence, and index only original descriptive metadata. Treat the review as metadata-only and cap displayed suitability accordingly. Exclude blocked, pending, archived, unavailable and unclear-licence matches before returning result details.
4. Test the normal CLI path, canonical identity, ranking, exclusion counts, hostile queries, repeat init, storage separation, and backup/restore. Review the actual diff with Code Review Brains before a subsequent phase. Record any unavailable checks.
5. Prepare the resulting checkout and this log for handoff. Confirm public publication separately if required by the explicit fresh-confirmation instruction.

Design review attempt returned a connection timeout. No code had been written at that point.

### Exact resume step

Implement Phase 1 in the new local checkout, run the CLI acceptance tests, then submit the actual diff to Code Review Brains.

The retry of the design review returned public-source guidance on strict typing, real database integration tests and avoiding test-only abstractions. Applied those constraints to the build. Review lenses: [Theo Browne](https://www.youtube.com/watch?v=2iu5u3sUukc), [DHH](https://dhh.dk/2014/test-induced-design-damage.html), [Matt Pocock](https://www.aihero.dev/skills-code-review).

## 2026-11-06 · Phase 1 implementation and verification

### Implemented

| Files | Result |
| --- | --- |
| `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore` | npm-locked, strict TypeScript on Node 24.14+. Three development packages including a transitive type dependency. Zero runtime dependencies. |
| `src/database.ts` | Distinct public/private SQLite IDs and transactional schema v1. Explicit init, read-only open, validated private snapshot and non-overwriting restore. Initialisation publishes complete files via a local hard link. |
| `src/identity.ts`, `src/catalog.ts` | Canonical GitHub and HTTPS resource URLs, stable provider IDs, duplicate conflict rejection, bound literal FTS5, category/type filters, capped coverage scores with BM25 tie order, and exclusion counts. |
| `database/seeds/starter.ts` | Four real pinned GitHub records. Two CC0 catalogue entries are eligible as Conditional. MCP Registry and reference servers are link-only because the pinned repositories describe a licensing transition with mixed terms. No fetched descriptions, code, or instructions are stored. |
| `src/cli.ts`, `README.md`, `SKILL.md`, `SECURITY.md` | Offline CLI commands for init, search, JSON/Markdown export, backup and restore. Preview boundaries, provenance output, host confirmation rules and an installation walkthrough. |
| `LICENSE`, `LICENSE.md`, `NOTICE` | Byte-for-byte official PolyForm text and separate draft copyright notice naming Oliver Mclennan as the project owner. The owner confirmed this spelling. |
| `tests/phase1.test.ts`, `.github/workflows/check.yml` | Real SQLite and CLI checks. A CI matrix is configured for Linux, macOS and Windows. |

### Verification

- Linux, Node `v24.22.1`, npm `11.9.0`, SQLite `3.53.4`. `npm ci --ignore-scripts --no-audit --no-fund`, `npm run lint`, `npm test`. Seven tests passed.
- Smoke-tested init, ranked retrieval, the MCP licence exclusion path, backup and restore from the built CLI. A sample retrieval ranked Awesome-RAG at 69 and Awesome at 55, both Conditional. The MCP query returned two licence-unclear matches and zero recommendations.
- Compared the included `LICENSE` to the official plaintext download. SHA-256 `ffcca38841adb694b6f380647e15f17c446a4d1656fed51a1e2041d064c94cc8`.
- Requested post-stage review from Code Review Brains. The full source exceeded its 500-character question limit. Three bounded follow-ups returned public passages about runtime validation, real database tests, strict typing, and avoiding test-driven indirection. These were review lenses, with no independent code approval. The manual review found that first-wins dedup could discard a conflicting safety status. Added transactional rejection and a regression test. [Theo Browne](https://www.youtube.com/watch?v=2iu5u3sUukc) · [DHH](https://dhh.dk/2014/test-induced-design-damage.html) · [Matt Pocock](https://www.totaltypescript.com/typescript-types-dont-exist-at-runtime)
- Public GitHub REST calls used no credentials. Repository refs were inspected read-only. No GitHub branch, publication, release, or other external account change was made.

### Primary references and design implications

| Evidence | Implication |
| --- | --- |
| [Node 24 SQLite](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html) and [SQLite FTS5](https://www.sqlite.org/fts5.html) | Native SQLite, online private snapshots and weighted BM25 avoid a runtime SQLite dependency. |
| [GitHub rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) and [licence API](https://docs.github.com/en/rest/licenses/licenses) | Plan for the anonymous request budget. Treat repository SPDX metadata as a clue and inspect licence text at a pinned revision. |
| [Official MCP Registry](https://modelcontextprotocol.io/registry/registry-aggregators) and [public endpoint](https://registry.modelcontextprotocol.io/v0.1/servers?limit=1) | The live response contained an envelope with server metadata and a remote transport entry. Registry listing and transport metadata require separate trust and licence checks before use. |
| [OWASP prompt injection prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) | Treat tool output and external documents as untrusted. Preserve an execution boundary beyond text screening. |
| [Bun SQLite compatibility](https://bun.com/reference/node/sqlite), [Deno Node APIs](https://docs.deno.com/runtime/reference/node_apis/), and [Agent Skills specification](https://agentskills.io/specification) | Document actual command compatibility after platform and host tests. Keep the portable SKILL.md plus an independently testable CLI. |
| [Official PolyForm plain text](https://polyformproject.org/licenses/noncommercial/1.0.0.txt) and [European Commission GDPR principles](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en) | Keep the official licence intact and keep local data private by default. Jurisdiction-specific release review is pending. |

### Unresolved risks and exact next step

- Phase 1 is verified on Linux. Windows/macOS CI, Bun/Deno, and installation inside Codex/ChatGPT and Claude Code are unverified. Private backups use local filesystem permissions and Windows folder ACLs. A filesystem without hard-link support fails without overwriting the destination.
- The public catalogue is reproducibly built from bundled metadata at init. Distributed versioned database snapshots, updates/rollback, lifecycle reviews, live discovery, security scans, and hybrid retrieval remain planned. Schema v1 is the only supported version. Runtime security and freshness of seed resources are unverified.
- After fresh confirmation for the public GitHub write, publish the Phase 1 commit to the empty `main` and inspect all three CI jobs. For Phase 2, start with an offline fixture and a bounded, unauthenticated GitHub evidence collector. Capture a numeric repository ID, pinned SHA, licence path and version, and availability. Verify archive handling and fail-closed behaviour for licence transitions and duplicate conflicts before expanding the seed set. Ask Code Review Brains for stage-specific lenses, record the actual code and test findings, and update this log.
