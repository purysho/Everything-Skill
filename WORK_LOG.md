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

## 2026-11-06 · Remaining phases

Phase 1 was published as [0ac7d4b](https://github.com/purysho/Everything-Skill/commit/0ac7d4b7160337ee05f18d93e81ce6e5cf9b0bd8) with the confirmed Oliver Mclennan notice. [CI run 42201215158](https://github.com/purysho/Everything-Skill/actions/runs/42201215158) passed on Ubuntu, macOS and Windows.

Delivery order follows BUILD_PLAN.md. Build and verify the pinned seed collector first. Next add routed hybrid retrieval behind the existing CLI, then explicit live discovery and private persistence, security and governance, private adapters, the static demo and safe index updates, and the runtime matrix. Test each user-visible boundary before advancing. Keep optional models isolated from default offline commands and keep untrusted content out of execution paths. Record any phase whose acceptance criteria remain unverified.

### Phase 2 · Pinned seeds

Expanded the seven-record starter set with ECC, Awesome Healthcare and the mcpHQ catalogue. The seed audit made 21 unauthenticated GitHub requests and matched all seven pinned versions, licence signals and archive states. The evidence ledger records the checked date, commit date, licence path and digest. Registry and reference servers retain link-only state. The official reference Everything server is represented by its repository record. Per-package approval still needs package-specific evidence.

The bounded connector retains only structured provenance. Nine tests passed, including a licence transition, archived source, absent licence and rate limit. The reviewer was called after the tests. Keep the same ledger when reproducing the seed check and review any changed head before approving updated metadata.

The Phase 2 Code Review Brains retry returned source excerpts after an initial timeout. Its review guidance reinforced validating external shapes at runtime and keeping real integration checks. The actual run used structured-only fields and fixed-origin requests. [Theo Browne](https://www.youtube.com/watch?v=CtIZiEzdZZc) · [DHH](https://world.hey.com/dhh/turbo-8-is-dropping-typescript-70165c01) · [Matt Pocock](https://www.totaltypescript.com/typescript-types-dont-exist-at-runtime)

### Phase 3 plan

Keep the Phase 1 lexical score available as a baseline. Add a local embedding provider, category routing, reciprocal rank fusion and an opt-in local transformer reranker. Measure three baselines and routed fusion against labelled queries. Keep the metadata-only security cap in effect.

### Phase 3 · Routed retrieval

Added hashed local vectors behind an embedding interface, bounded category routing, reciprocal rank fusion, score weighting by query specificity and configurable colour labels with a safety cap. The optional Transformers.js path uses only explicitly provisioned local assets. Eleven tests passed. Code Review Brains returned source excerpts on keeping implementation and feedback loops small. [Theo Browne](https://www.youtube.com/watch?v=2iu5u3sUukc) · [DHH](https://www.youtube.com/watch?v=gcwzWzC7gUA) · [Matt Pocock](https://www.aihero.dev/essential-ai-coding-feedback-loops-for-type-script-projects)

On the 12-query starter smoke benchmark, Recall@3 was 0.917 lexical and 1.000 dense, hybrid and routed. nDCG@3 was 0.875 lexical, 1.000 dense, 0.969 hybrid and 1.000 routed. Output word counts were 334, 340, 354 and 350 respectively. The small run does not establish superiority over the dense baseline or lower context use. A representative held-out benchmark remains a release gate. The optional ONNX install initially hit a proxy timeout.

### Phase 4 plan

Keep offline queries unchanged. Add explicit fixed-origin public discovery and local private evidence records. Fetch no repository content during candidate discovery. Stage only selected, licence-eligible GitHub documentation sections using provenance and hashes. Never send staged private data to a provider. Migrate private v1 without deleting existing discoveries.

### Phase 4 · Live discovery and private stages

Verified public GitHub, MCP Registry and MediaWiki searches and staged a previously unseeded MIT repository into a disposable private store. Three matching README sections became hashes, ordinals and hit counts. The network request did not contain the private keywords. Fourteen tests passed, including v1 migration, licence downgrade invalidation and unchanged public bytes. Code Review Brains returned general guidance on simple interfaces and real validation. [Theo Browne](https://www.youtube.com/watch?v=NLA7S-MVS9A) · [DHH](https://www.youtube.com/watch?v=gcwzWzC7gUA) · [Matt Pocock](https://www.totaltypescript.com/typescript-types-dont-exist-at-runtime)

### Phase 5 plan

Add a bounded, non-executing scanner and an append-only private report store. Suppress credible blocks before projection and deny overrides at the policy boundary. Store scope-labelled overrides and deduplicated suggestions locally. Rescan uncertain or changed candidates when the user explicitly chooses online verification.

### Phase 5 · Security and local governance

Added fixed redacted safety findings, licence-gated pinned GitHub surface scans and official MCP Registry transport inspection. Security records use append-only triggers. Public search and export apply sticky blocks by URL or provider ID and withhold a cached revision when the latest observation conflicts. Explicit `--verify` records new observations. Private suggestions deduplicate and tally, and preferences require a scope and acknowledgement for an allow exception. Only the maintainer's Git review process can change public seeds.

Seventeen tests passed, including injection and credential fixtures, plaintext MCP secret handling, historical blocking, scope precedence, immutable audit rows and changed revision handling. Two Code Review Brains requests timed out. The local review added suppression before export, checks by stable ID and source screening before a staged section can be recorded. The scanner is heuristic and surfaces only a limited set of files. It does not certify code as safe. Archived and licence-changing resources require maintainer review before an updated public snapshot can include them.

### Phase 6 plan

Generate private synthetic MCP fixture adapters from fixed templates. Execute each new generated file with the Node permission model, empty environment apart from required OS configuration, bounded stdio and a timeout. Keep network and credentials out of the runtime. Persist the generated contract status and never publish an adapter.

### Phase 6 · Private MCP templates

Implemented URL-to-Markdown, OpenAPI, browser workflow and recorded-session synthetic profiles in one private stdio server template. All four passed the handshake, tool list, preview, and rejection of credential and write-like inputs under a timed subprocess and Node permissions. Eighteen tests passed. The runner exercises fixed generated code and is not a sandbox for arbitrary third-party JavaScript. Code Review Brains returned guidance on limiting abstraction and verifying real execution paths. [Theo Browne](https://www.youtube.com/watch?v=pzUn9wTCgcw) · [DHH](https://www.youtube.com/watch?v=Tc5z64XIwIY) · [Matt Pocock](https://www.aihero.dev/essential-ai-coding-feedback-loops-for-type-script-projects)

### Phase 7 plan

Ship an immutable checksum-verified SQLite snapshot and matching JSON/Markdown exports. Explicit selection backs up private data and records prior catalogue selection. Add a static Pages-compatible demo and a weekly evidence and safety review workflow. The demo uses pinned links and stays offline after the static files are loaded.

### Phase 7 · Release selection and demo

Built the immutable 2026-11-06.1 SQLite snapshot and checked its reproducibility. Added equivalent JSON and Markdown exports, explicit selection and rollback, and private snapshots before a selection change. A tampered active snapshot failed validation and rolled back to the old public file without modifying private bytes. Nineteen tests passed. A browser DOM smoke test checked five entries, query filtering, pinned links and hostile-looking input. The GitHub Pages-compatible demo is in `demo/`; hosting is a separate repository setting.

The weekly audit is configured to check identity, revision, archive, licence and bounded safety signals. The first local live attempt flagged a newer link-only registry revision and two unavailable sources. Reduced redundant requests by passing existing pinned evidence into the scanner. The workflow leaves changed resources for maintainer review rather than replacing them without approval. Code Review Brains timed out on both Phase 7 calls. The local review covered snapshot immutability, failed update recovery and DOM projection.

The published Phase 6 checkpoint passed Linux and Windows and caught a macOS synthetic-runner failure. The next commit resolves the adapter's real path before granting Node file permission. The hosted matrix will confirm the correction. The optional Apache-2.0 upstream ONNX cross-encoder ran locally with Transformers.js 4.3.2. No weights or optional dependency were committed.

### Phase 8 plan

Check the clean package contents, canonical Node runtime and cross-platform workflow. Probe the same compiled CLI under Bun and Deno, limit alternatives to verified read-only commands, and give a clear Node fallback for missing SQLite or unsafe operations. Run the final review against outstanding acceptance criteria.

### Phase 8 · Runtime checks and final audit

- The [Phase 7 hosted run](https://github.com/purysho/Everything-Skill/actions/runs/42205150560) passed on Ubuntu, macOS and Windows, confirming the adapter real-path correction and release rollback tests.
- Added a guarded Node entry point and a private npm tarball manifest. Built, packed, installed in a disposable directory, then exercised init, version selection and search from its installed executable. The package includes the immutable public SQLite file and excludes private data and runtime dependencies. Twenty local tests passed after the final discovery and routing changes.
- Bun 1.4.4 and Deno 2.9.6 returned the expected offline search, export and selected-version output on Linux. Both reject write commands with a Node fallback. Full host installation and alternative-runtime checks on Windows and macOS remain unverified.
- Final integration review added explicit Crossref papers, Hugging Face model and dataset discovery, and GitHub OpenAPI repository discovery. Each provider returned eight link-only leads in a live smoke test. Providers retain canonical links only. The source licence and safety checks still apply before private indexing or public inclusion. [Crossref REST](https://www.crossref.org/documentation/retrieve-metadata/rest-api/) · [Hugging Face Hub API](https://huggingface.co/docs/hub/en/api) · [GitHub REST](https://docs.github.com/en/rest)
- Routing now narrows the shortlist when a single topic has a strong match. The same smoke benchmark retained Recall@3 and nDCG@3 of 1.000 with 286 output words, versus 334 lexical and 340 dense. It ties dense on relevance. The 12-query starter benchmark is a regression check rather than a held-out corpus result.
- Code Review Brains was invoked after each stage and in a final pass. The Phase 5 and Phase 7 calls timed out. Other reviews returned public-source guidance, without independent approval of the implementation. The final local review exercised the packaged path and recorded portability and safety boundaries. [Theo Browne](https://www.youtube.com/watch?v=aFcVKzfkJPk) · [DHH](https://www.youtube.com/watch?v=9LfmrkyP81M) · [Matt Pocock](https://www.aihero.dev/skills-pr)

### Next verification steps

1. Evaluate the keyword, dense, hybrid and routed modes on a held-out corpus of at least 100 independently licence-checked resources and 30 labelled queries. Capture tokens using the target host tokenizer and measure latency, relevance and exclusion errors. The current data does not establish the Phase 3 superiority requirement or calibrated quality, cost and maintenance scoring across domains.
2. Complete hands-on installation and first-use checks in Codex, ChatGPT and Claude Code. The static Pages-ready folder has a DOM smoke test. Live Pages hosting and first-time-user usability remain unverified.
3. Review weekly audit flags against pinned source evidence. Keep the last immutable snapshot and append the archive or replacement decision to the demo history. Only maintainers can approve the next public snapshot. Live online verification stays opt-in and provider outages can prevent verification.
4. Expand adversarial evaluation before relying on scanners for broader safety claims. The four generated adapters demonstrate a restricted synthetic contract. Real authenticated, browser and state-changing integration remains outside this implementation.
