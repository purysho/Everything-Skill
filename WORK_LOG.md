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

## 2026-11-06 · Verification closeout

- Froze 109 documentation records with per-page SHA-256 digests and four pinned upstream licence notices, plus 30 labelled queries disjoint from the starter catalogue. The first run found 20 of 30 with flat hybrid and default routed search at 33,900 context tokens each. After widening the optional cross-encoder's candidate pool and evaluating context budgets, its three-result mode found 21 of 30 at 20,779 tokens. Flat hybrid at three found 16 of 30 at 20,699 tokens. Full five-result reranking found 23 of 30. Exact metrics, latency, source scope and reproduction are in [evaluation/README.md](evaluation/README.md). Default routed search still ties flat hybrid on this corpus.
- Independently verified Codex CLI 0.167.0 enumerated the installed project-local skill through its app-server and Claude Code 2.1.318 loaded and expanded the installed instructions through its real Skill tool using an isolated local synthetic message endpoint. Separately exercised a fresh npm installation through initialisation, search, licence exclusions, duplicate suggestions, version selection and rollback. These were automated first-use checks, with no remote model or human-subject test. ChatGPT skill upload still requires an eligible workspace and its administrator's settings. [ChatGPT Skills availability](https://help.openai.com/en/articles/20001066-skills-in-chatgpt)
- Expanded security evaluation to 19 labelled examples and tested protocol ordering, malformed data, invalid IDs, oversize messages and restricted filesystem and subprocess escape attempts. Private candidate policy now runs before shortlisting. Online verification is bounded to eight candidates per invocation. Twenty-four local tests passed. Scanner findings remain heuristic and private MCP adapters remain synthetic.
- Reviewed the weekly audit flags using current Git refs and pinned licence notices. Registry licence scope remains transitional and link-only. Awesome-RAG still points to the previously checked CC0 revision. Recorded the decision without changing the immutable public catalogue. Added a manual Pages deployment workflow. The public Pages URL returned 404 and the Pages repository setting still needs to be enabled. [Pages publishing settings](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- The first closeout Code Review Brains request timed out. A retry returned public-source guidance on simple architecture, observable tests and keeping verification claims within the tested path. This is guidance rather than source-code approval. [Theo Browne](https://www.youtube.com/watch?v=NLA7S-MVS9A) · [DHH](https://www.youtube.com/watch?v=Tc5z64XIwIY)

## 2026-11-06 · Individual sources

Replaced the directory-led starter list with six individually actionable sources across the demo, CLI and catalogue exports. Palmer Penguins points to a pinned CSV and OpenAPI points to the exact 3.2.0 specification. A live audit matched all six source identities, revisions and licence notices and verified both file blobs. The OpenAPI repository scan noted an external dependency. The cards retain metadata-only status. Release 2026-11-06.1 is preserved for rollback.

All 27 local tests passed. The checks cover Apache licence recognition, pinned file evidence and upgrading from the old snapshot. A demo smoke test checked six cards, three example searches and the data file link.

## 2026-11-06 · Resource library intake pilot

- Recorded the maintainer's batch approval choice. The intended catalogue is open-first, curated then demand-led, covers broad and niche fields, and searches the local cache before asking about a web search. Language modes are multilingual, query-language first, and query-language only. The direct match leads with its limitations, and stronger adjacent evidence is separately labelled. Read-only MCP offers require documented official APIs or downloadable data.
- Added `review-queue/collect-pilot.ts`, extended `tsconfig.json` for the private collector, and documented its command in `review-queue/README.md`. Collected credential-free Zenodo, Europe PMC and Met metadata. Kept draft artifacts outside the checkout. Retried engineering and agriculture in a separate run and added 196 records. The final pool has 1,398 distinct records across 15 fields, five duplicates removed, 171 unresolved licence notices and 27 outstanding feed requests. Candidate files contain metadata and links. Public catalogue and demo assets were not changed.
- Lint, build and all 27 existing tests passed. Verified the ZIP, its JSON checksum, candidate ID uniqueness, HTTPS source host allowlist, heuristic title scan and offline review filtering. The smoke check covered pagination, agriculture and engineering, the Vivaldi source, unknown language, and rights flags. Code Review Brains provided public-source guidance on review scope and checks. It did not independently approve the implementation. [Matt Pocock](https://www.aihero.dev/skills-code-review)
- The two-record-per-field spot check found off-topic records and potentially mislabelled datasets. The intake snapshot is for screening. It carries provisional roles and field assignments, 751 unknown languages, and no per-item provenance or file safety guarantee. Resume from [Everything-Skill-Pilot-001.zip](https://chatgpt.com/library?file_id=libfile_b832e47ce5848191908265e28cf98fe9&account_id=personal), `batch.json` SHA-256 `6aedab82896f4afc398970609d5c510975cce15f5b5ad56320096e8081ed8108`.
- Next smallest step is to select one niche per field and verify original provenance, resource type, topical fit, licence scope and safety on the individual records. Record admission and rejection reasons in a checksummed release manifest. Then build a staged SQLite snapshot and static demo export from that same manifest, test both and submit the exact batch for maintainer approval. Keep restricted or unclear sources outside ordinary results.

## 2026-11-06 · First approval batch plan

1. Validate the frozen intake checksum and every candidate's identity, links, metadata safety and licence status. Distinguish candidates screened from candidates individually verified. Keep uncertain and unreviewed rows out of the release snapshot.
2. Check promising sources against their individual official records and review original provenance, field fit, rights, formats and sensitivity. Use only metadata and safe source links. Keep a row-level disposition for all intake IDs.
3. Build a preview SQLite index and static demo outside the checkout using the existing seed and export code. Preserve the six current entries and compare exact index/demo source IDs, check retrieval, and exercise installation and rollback against disposable local data.
4. Run repository checks and Code Review Brains. Package the exact manifest, evidence, disposition and preview with checksums for maintainer approval.

### Approval Batch 001 staged

- Screened all 1,398 intake records for duplicate identity, canonical HTTPS links, access, licence metadata and heuristic safety. Individually reviewed 59 intake records. Staged 29 of those and one supplemental BEA release across all 15 fields. The 1,369 held-out intake records have dispositions. This was a metadata and link review with depositor or publisher rights evidence. Files, software, and participant data were outside the review scope.
- Added `review-queue/stage-batch.ts` and its instructions. The private `2026-11-06.3` preview retains the six existing cards. Confirmed exact GitHub revisions and licence notices, including a separate check of the pinned DuckDB revision after upstream advanced. The OpenAPI external dependency warning remains. No public assets or version pointers changed.
- Lint, build and all 27 tests passed. Repeated the build byte for byte. Checked SQLite integrity, 36-row demo parity, 16 offline CLI queries, demo filtering, local update and rollback, backup readability, private database byte preservation, and rejection of wrong checksums, duplicate entries, blocked records and incorrect approval status. Code Review Brains timed out on both attempts. Completed local review.
- Review [Everything-Skill-Approval-001.zip](https://chatgpt.com/library?file_id=libfile_d4f65e0c7a6081919f2eb8b1c1420c36&account_id=personal). Approval applies to `release-batch.json` SHA-256 `02a646bf6661775bc52c290cddb146c581641d3bcf87e1e6a4508130d0d8c803`.
- Next step before publication is to extend the existing weekly and opt-in verification paths to the admitted non-GitHub providers. The explicit online verifier currently classifies a non-GitHub card as unavailable without contacting its source. Confirm provider checks and approved-manifest binding before changing the public version.

## 2026-11-07 · Complete the intake batches

The maintainer approved Batch 001 and requested completion of all remaining batches. Bind Batch 001 to manifest SHA-256 `02a646bf6661775bc52c290cddb146c581641d3bcf87e1e6a4508130d0d8c803` and retain its exact cards. Process every remaining intake ID against official metadata in bounded requests. Admit only resources with established identity, licence, topical and artifact evidence, and safe metadata. Record explicit holds where source data, consent or third-party rights remain uncertain. Implement provider freshness checks shared by the weekly audit and opt-in query verification. Build the immutable catalogue, demo and audit ledger together, test normal entry points and rollback, request Code Review Brains, and submit the tested result to GitHub.

### Completed intake and release verification

- All 14 intake batches have outcomes for all 1,398 IDs. Admitted 618 intake resources and the previously approved supplemental BEA release. With the six existing cards, snapshot 2026-11-07.1 contains 625 active sources. The 780 held records comprise 431 unresolved artifact or provenance cases, 189 off-topic records, 10 external-rights reviews, 50 privacy reviews, 37 bounded-fetch failures and 63 unclear licences. The catalogue is still below the requested thousands-of-sources target. Coverage is particularly thin in economics and computing.
- Retained the exact 30 approved cards and the 36-card Batch 001 snapshot. Stored the frozen approval manifest, prior dispositions, current dispositions, evidence hashes, admission method and source JSON under database/catalogue/. The overview is database/catalogue/REVIEW.md. All entries remain Conditional with metadata and source evidence. Payload and software auditing, and participant-data verification, remain outside this review.
- Added bounded official-source verification for Zenodo, Met objects, CC BY 4.0 PMC articles and the admitted BEA release. Weekly and explicit query checks share the same source logic. Source scans strip HTML and decode entities before checking. Failed access and conflicting licence notices cannot pass the verifier. The public-source checks preserve append-only private reports. Article hashes identify changed text, with an explicit exception for the already approved legacy article version label.
- The existing directory-listing regression caught an awesome-list deposit disguised as a dataset. Held that record, added the directory filter to admission and retained the regression. Reused Markdown escaping for public exports so retrieved source text cannot create injected Markdown links.
- Lint, build and all 31 tests passed on Linux. Reproduced 618 admitted provider checks using the official responses cached during this run. Independently exercised live Zenodo, Met, PMC and BEA endpoints. SQLite integrity, identical demo and JSON exports, 16 CLI searches, catalogue update and rollback, private backup readability and byte preservation all passed. The demo DOM test covered pagination, five-card shortlists, a topic reset and the individual museum link. A fresh offline npm tarball installation initialized, searched and exported all 625 entries.
- Code Review Brains returned public-source guidance during the implementation review. The final request timed out. The tool did not independently approve the source diff. Local policy and integration checks completed. [Review scope guidance](https://www.aihero.dev/skills-code-review)
- Next steps are to submit this tested checkpoint to GitHub and check the cross-platform Actions and Pages deployment. Then expand original institutional feeds in the thin fields. Keep unresolved licences, participant data and failed records outside active results. The full scheduled weekly audit has not yet run against the new corpus on GitHub.

Release SQLite SHA-256 d61636326cb918f247616f8566221365e7619fa515599ed9802ccab047170647.

Before submission, the final review added LF checkout rules for the checksummed JSON files and binary handling for SQLite. Command-line Git could read the public repository but lacked push authentication, so the connected GitHub service is submitting the same files with per-blob Git SHA checks. This preserves the tested file tree. Hosted checks and deployment will be recorded after the submission completes.

### Hosted submission verified

Submitted the exact tested file tree as [394aa94](https://github.com/purysho/Everything-Skill/commit/394aa94efcb30e8b6c1242964d5ca3210faccef6). [The hosted Check run](https://github.com/purysho/Everything-Skill/actions/runs/42338126337) passed on Windows, macOS and Linux. [The Pages deployment](https://github.com/purysho/Everything-Skill/actions/runs/42338126395) succeeded. The live catalogue JSON at https://purysho.github.io/Everything-Skill/catalogue.json matched the local tested bytes and reported 625 active sources, 780 held records and snapshot 2026-11-07.1.

All existing intake batches are processed. The next smallest catalogue step is to research and add original institutional datasets for economics and computing, then close the gap to the requested 1,000-plus active resources. The metadata admissions do not certify payload safety or complete the remaining multilingual preference and evidence-strength product features. Preserve the 780 holds until their specific issues are resolved. The next scheduled weekly audit remains an operational follow-up.

## 2026-11-07 · Demo freshness regression

The maintainer's mobile screenshot showed snapshot 2026-11-06.2 and zero matches for medicine. The live JSON currently contains 625 entries at 2026-11-07.1, including 68 in the medicine category. The response advertises a ten-minute HTTP cache, and the page reuses unversioned script, style and catalogue URLs with default browser caching. Add content-versioned asset URLs and a snapshot-keyed catalogue request that bypasses the browser cache. Reproduce the old-cache boundary, check medicine through the demo render path, deploy and verify the live page.

Implemented content hashes in script and stylesheet URLs, a page snapshot key on catalogue requests and browser cache bypass for catalogue data. Both public and private preview builds apply the same asset versioning. Regression tests failed before the change and pass after it. A DOM test using a simulated old six-source cache reproduced zero medicine matches before the fix and 70 matches after it, with five cards on the first page. Code Review Brains returned public-source guidance and did not independently approve the diff.

Lint, build and all 33 tests passed locally and in the [Windows, macOS and Linux hosted run](https://github.com/purysho/Everything-Skill/actions/runs/42339247172). [Pages deployment](https://github.com/purysho/Everything-Skill/actions/runs/42339247264) succeeded for commit be41fbc. Live HTML, versioned JavaScript and snapshot-keyed JSON matched the tested bytes. The fresh entry link is https://purysho.github.io/Everything-Skill/?v=bdbb24a78c48. The medicine search returned 70 matches in the DOM regression check, using snapshot 2026-11-07.1. The next catalogue step remains expansion of eligible sources in the thin fields.

## 2026-11-07 · Conversational interface discovery

The maintainer wants a chatbot experience with the current resource engine acting as its backend. Inspected the implemented retrieval, optional transformer reranking, policy records, architecture and package. Reviewed official GitHub Pages and Ollama documentation. Saved the initial evidence and proposed experiment in docs/chat/DISCOVERY.md. Conversation storage, answer generation, a chat API and model integration are the next implementation areas. The first unresolved decision is whether the first release is personal or publicly accessible. Resolve that preference, choose the model execution approach, and write the reviewed design before building the chat loop.


## 2026-11-07 · Chat access and memory preferences

The maintainer selected a public chat demo with conversation memory limited to its open tab, plus a local desktop version that retains memory on the user's device. Recorded the distinction in docs/chat/DISCOVERY.md and inspected official WebLLM browser-inference documentation. Proposed RAM-only demo context, with page refresh also resetting it, and reuse of the private desktop SQLite store for durable history and preferences. The remaining choice is whether demo generation also runs in the browser or uses hosted inference. Browser inference needs a model download and compatible hardware. Runtime/model licences, performance and any external-provider retention policy remain to verify before adoption.

## 2026-11-07 · Browser inference design checkpoint

The maintainer confirmed generation in the visitor's browser. Updated docs/chat/DISCOVERY.md and drafted docs/chat/DESIGN.md before product changes. The design proposes Transformers.js with a dedicated per-tab worker, tested WebGPU and CPU/WASM profiles, bounded evidence and conversation context, validated citation identifiers, explicit external-research permission and RAM-only demo conversations. Refresh clearing the conversation, a 1 GiB initial download ceiling and a separate Electron desktop package are proposals awaiting design review. Desktop history and scoped preferences would extend the private SQLite store through migrations.

Inspected official runtime, cache, original model and Electron security documentation and npm metadata. The registry reported Transformers.js 4.3.2 and WebLLM 0.2.87 under Apache 2.0. Original Qwen3 cards declare Apache 2.0, but inspected community conversions lacked licence metadata. No model is admitted by this research. Download size, converted-weight rights, version-specific runtime APIs, device memory, answer quality and generation speed remain empirical gates. No weights, dependencies or product code were installed or executed.

A fresh builder review of the design reported nothing important left to resolve for planning. Code Review Brains returned public-source review guidance, including meaningful feedback loops and checks that exercise real behavior. It did not inspect or approve the document or source diff. Documentation consistency and git whitespace checks were performed. Product tests were not run for this documentation-only change, and the chatbot is not implemented or verified.

Exact next step is maintainer review of docs/chat/DESIGN.md. After design approval, create the staged implementation plan and run the model-admission/browser feasibility gate before building the conversational demo. Record actual CPU/GPU inference, privacy traces, cancellation and evidence-task results. Then implement the local desktop persistence slice. The catalogue remains at 625 active entries, below the thousands-of-sources target, and its expansion remains outstanding.

## 2026-11-07 · Approved chat implementation started

The maintainer approved docs/chat/DESIGN.md. Created docs/chat/IMPLEMENTATION_PLAN.md and a clean feature/browser-chat branch. Proceeding inline with the approved browser-first design, existing Code Review Brains stage checks and a final fresh review. Ruling: treat the approval as authorization to carry out the planned reversible implementation and tests, rather than add another plan-approval checkpoint. No hosted inference, credentials or remote model execution are authorised by it.

The model-admission stage found a separate onnx-community/Qwen3-0.6B-Instruct-ONNX revision with an explicit Apache 2.0 declaration, linking through minpeter/Qwen3-0.6B-Instruct to the original Qwen model. Original and converted artefact rights, hashes and behavior are being verified. The previous licence-unclear conversions remain unadmitted. The installed Playwright package could not download its Chromium archive (invalid/truncated ZIP). Investigating a bounded alternative before recording browser/device verification as blocked. No chatbot capability has been published.

### Browser feasibility pilot evidence

Pinned Chromium 141.0.7390.37 successfully ran the real q4 Qwen candidate using single-process mode required by this runner's socket restrictions. Verified the 996,522,744-byte ONNX file against its declared SHA-256 and streamed three real answers. Local model loading took 11.74 seconds. First-token times were 15.96–17.80 seconds; complete 15–34-token answers took 44.15–84.64 seconds. These are single-thread CPU/WASM measurements on this runner, using locally served pinned bytes. Public model-host CORS, actual remote download UX, mobile hardware and GPU inference remain unverified. The GPU adapter probe returned unavailable.

The three-task pilot did not admit the model: two English responses omitted requested citations. Chinese output used a whitespace-padded source marker. The answers respected the available metadata boundaries in this pilot. Saved exact public-fixture results in docs/chat/pilot-v1.json. Browser storage was empty after these three tasks, but the private-sentinel task was not exercised and cannot be counted as verified. A revised explicit citation prompt is being evaluated against the frozen twenty task questions. No model is published as supported.

Real integration exposed Transformers.js 4.3.2 registry helpers preflighting the mutable main revision even when the load option pins a revision. Fixed the remote path template itself, retained the URL/hash allowlist and used explicit model/tokenizer loaders. The pinned model's separate chat_template.jinja also required explicit loading. The real harness failed on both problems before the fixes. Web compilation uses bundler resolution and skips incompatible upstream declaration checking; own application files remain strictly checked. The production-dependency npm audit reported no advisories. Code Review Brains timed out on the first Stage 1 request.

### Stage 1 internal checkpoint review

A fresh source reviewer found three Important defects: dropped metadata Range options caused duplicate full weight transfers; a misplaced Playwright timeout option left a 30-second default; and privacy tracing omitted same-origin bodies. The manifest-backed metadata response is covered by a failed-then-passing test, full payload requests retain SRI and discard caller credentials, and a real Chromium regression detects a same-origin sentinel POST. Corrected the wait argument position and added worker/fixture fingerprints and exact fixtures to subsequent reports. The original pilot's limitations are explicitly retained. Root tests now pass 38/38 and the real-browser trace regression passes 1/1. The browser worker compiles strictly against its own files; upstream declarations require skipLibCheck.

Code Review Brains retry returned public integration-test guidance (https://www.youtube.com/watch?v=Tc5z64XIwIY), not source approval. Ruling: proceed with the independent shared conversation core while the twenty-question generation evaluation runs; keep public chat release and supported-model claims blocked until admission and application checks pass. If the model changes, only the worker profile/runtime boundary should need revision. Do not confuse this internal code checkpoint with successful model admission. Full generation results and a corrected-transfer smoke test are still pending.

### Stage 2 shared conversation core

Added src/chat.ts with approved-source filtering, the existing surface scanner, shared tokenisation/local-vector/fusion helpers, a five-source shortlist with Conditional-capped metadata scores, direct-match priority, explicit multilingual/query-first/query-only behavior, user-subject follow-up queries, tokenizer-counted context trimming, citation identity checks and visible-session memory limits. The core performs no network or persistent writes. It never treats previous assistant text as source evidence. Actual study strength and cross-language semantic translation remain outside this metadata baseline. Query-only correctly excludes sources whose language has not been established; the current public export lacks language declarations and needs enrichment before that mode is useful on the full catalogue.

Wrote behavioral tests before implementation. All 46 root tests and lint pass. The twenty-case real-model evaluation is still running independently, with vague limitation answers and some multilingual interpretation errors already observed. Stage 2 does not admit that model or publish a chatbot. Stage 1's hosted Check run passed: https://github.com/purysho/Everything-Skill/actions/runs/42367834616 . Stage 2 Code Review Brains request and final source review remain pending before submission of this core.

### Review fixes and first model verdict

The Stage 2 source review caught loss of the named user subject after repeated pronoun follow-ups and acceptance of protocol-relative/non-HTTP generated Markdown destinations. Added failing regressions, fixed both, and also rejected unknown IDs hidden inside long brackets. All 48 root tests pass after the fixes, with lint passing. Code Review Brains supplied public guidance on integration checks and the limits of green tests (https://www.youtube.com/watch?v=LlgiOCmFG_w); it did not inspect or approve the source.

The full Qwen3-0.6B development evaluation finished: 11 of 20 tasks passed manual review and nine failed. Failures included invented S1 citations with no evidence, inadequate limitation explanations and misinterpretation of multilingual dataset metadata. Saved exact inputs, output and build/fixture identity in docs/chat/evaluation-v1.json. The model is not admitted for public chat. The corrected loader separately served 1,036,911,030 bytes, with one weight transfer, rejected an over-budget Chinese message, terminated an active generation without late events and showed empty storage/no sentinel-bearing traffic. A deliberately corrupted config was rejected by native browser SRI. Reports are docs/chat/transport-fixed.json and docs/chat/integrity-rejection.json. These are internal worker checks, not full application privacy certification.

The second candidate under the bounded comparison is onnx-community/Qwen3.5-0.8B-ONNX-OPT. Its card explicitly declares Apache 2.0 and identifies the original Qwen model; text-only q4 assets appear to fit below 1 GiB. Exact rights, hashes and runtime compatibility are being checked before any inference. The larger Qwen3-1.7B conversion lacks a rights declaration and remains unadmitted. No credentials were attempted for unavailable repository paths.

## 2026-11-07 · Interrupted second-model checkpoint

The workspace became unavailable during the final documentation/check pass. Source checkpoint a956e28c053ed21277b937078724dd5dccdc5181 is confirmed on GitHub. Its 48 root tests and lint passed locally before submission. Stage 1 hosted Check run 42367834616 passed. Hosted verification of the Stage 2 checkpoint was not established before the interruption; the combined-status API returned no legacy statuses and is not proof that Actions passed.

The second and final small candidate in this comparison was onnx-community/Qwen3.5-0.8B-ONNX-OPT at 9a4c21d8f724176b0a7edaaed36303044451886e. Verified text-only q4 assets total 666,378,110 bytes. The original Qwen model at 2fc06364715b967f1860aea9cf38778875588b17 declared Apache 2.0 and its licence was copied locally. The candidate loaded in real Chromium CPU/WASM in 5.52 seconds. Its completed Chinese answer took 222.36 seconds for 55 tokens, with first text at 30.08 seconds, and misinterpreted tone-box units/publication languages as multilingual words. The next no-evidence case timed out after 240 seconds; the third selected task did not run. The candidate is not admitted. Its partial second-answer text was not preserved by that harness version. A separate process observation was approximately 2.2 GB RSS, not a measured peak.

A direct browser fetch of the pinned public config failed with net::ERR_CERT_AUTHORITY_INVALID, including through the runtime's non-credentialed proxy. TLS checks were not disabled. A hosted browser transport/privacy workflow and test were drafted locally, but their final result and publication were not established. Do not state that public CORS or that workflow has passed.

The pending second-profile source changes, exact second-pilot JSON, original licence copy and hosted-browser workflow may exist only in the interrupted workspace. They were not in a956e28. The attempted final documentation pass did not return a result. See docs/chat/RESUME.md for the exact recovery sequence. The public browse demo remains unchanged. No small model is admitted, no chat UI or desktop conversation store is released, and the 625-source catalogue remains below the thousands-of-resources target.


## 2026-11-07 · Frozen-workspace recovery

The workspace is responding again. Recovered the uncommitted second-candidate worker/profile, raw model report, licence copy and hosted browser test/workflow. Preserved local notes before fast-forwarding to remote recovery checkpoint 66cca7b. No user data or catalogue was replaced.

Corrected an attribution mistake in the interruption summary: the raw second-model fixture order is languages-chinese, economics-limits, no-evidence. Only languages-chinese completed; economics-limits timed out, and no-evidence did not run. The old selector silently preserved fixture order rather than requested ID order. Added failing regressions and changed selection to preserve explicit order, reject unknown/duplicate IDs and invalid counts before any model loading. The harness now records the active task before dispatch and keeps failed task identity/events on timeout. Its status reports completed checks without claiming cancellation/limits were exercised in a load-only run. Saved the recovered report and annotation in docs/chat/qwen35-pilot.json.

Rechecked root lint/build and all 48 tests after recovery. Rebuilt the strict browser bundle. Browser dependency installation completed. Test servers now close even if browser launch fails, avoiding an idle listener that can hold a failed check open. The new lightweight public-config CORS/SRI check is reserved for a public HTTPS browser environment; this runner previously failed proxy certificate trust without relaxing TLS. Local browser-suite and hosted workflow results will be recorded after observation. No failing model is admitted and the chat UI/desktop slice remains unfinished.

Recovery verification completed locally: 48/48 root tests, lint and the strict browser build passed. The browser suite passed 4/4 exercised checks (case order, invalid limits, failed-case recording and same-origin sentinel POST detection); the fifth public HTTPS/CORS/SRI test was explicitly skipped locally for the known proxy trust boundary. An actual invalid-selection CLI invocation exited before browser/model loading. Code Review Brains returned public-source guidance, not diff approval. A fresh source review identified the reporting defects described above, which now have failing-then-passing regressions. Next submit this internal checkpoint and inspect the new hosted browser workflow without claiming that a model or chat application is admitted.
