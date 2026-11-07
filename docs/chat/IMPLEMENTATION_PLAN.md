# Browser chat implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Track checked steps and results here and in WORK_LOG.md.

**Goal:** Deliver browser-local conversational research over the existing catalogue, with tab-only memory, then add persistent local desktop memory in a separate plan.

**Architecture:** A dedicated worker runs an admitted pinned model. The shared TypeScript core searches eligible catalogue metadata, constructs bounded context and validates citations. A separate browser package keeps inference dependencies out of the CLI package.

**Tech Stack:** Node 24, TypeScript, Transformers.js subject to the measured gate, esbuild for static modules, Playwright for real-browser checks.

**Spec:** docs/chat/DESIGN.md, approved by the maintainer on 7 November 2026.

## Global constraints

- Public model generation runs in the visitor's browser. No hosted model fallback or credentials.
- Messages and temporary preferences stay in the tab's RAM. Refresh and clear reset the conversation.
- Model downloads require a deliberate action showing profile, size and licence. Default total download ceiling is 1 GiB.
- 4,096-token context, at most 3,072 input tokens and 512 output tokens; tokenizer-based accounting.
- Up to five evidence cards, 100 visible messages or 2 MiB of history; safe text rendering.
- External research requires specific fresh permission. No implicit web lookup or MCP execution.
- All existing source safety and licence gates remain in effect. Metadata does not establish scientific conclusions.
- Only measured model/device profiles can be described as supported. Preserve all 625 browsable sources.
- Update WORK_LOG.md and request Code Review Brains at every completed stage. Guidance is not independent source-diff approval.

## Review focus

- Interrupted downloads and model failures must leave browsing usable and allow cancellation without retaining a stale worker.
- Prompt content in a source, a generated URL or a citation must never become executable markup or authorise a network action.
- A follow-up with a pronoun must preserve the prior subject without treating an earlier assistant claim as source evidence.
- Long multilingual inputs must be budgeted by the actual tokenizer without silently dropping current instructions or evidence.
- Refresh, multiple tabs, cancellation and browser caches must not restore or transmit personal chat or preferences.

## Files and stages

### Task 1: Model admission and browser feasibility

**Files:** Create `web/package.json`, its npm lockfile, `web/src/model.ts`, `web/src/worker.ts`, `web/gate.html`, `web/scripts/build.mjs`, `web/scripts/feasibility.mjs`, `docs/chat/MODEL_GATE.md`, `tests/chat-model.test.ts`. Modify `tsconfig.json` to check shared browser-safe model metadata. Generated bundles and downloaded weights are ignored.

**Interfaces:** `ModelProfile` defines exact model ID, revision, dtype/backend, assets with SHA-256/size, licence evidence and admission status. `assertProfile(profile)` rejects unknown rights, unpinned files and downloads exceeding 1 GiB. Worker requests use `{id, type: 'load'|'generate', ...}` and events use `{id, type: 'progress'|'ready'|'token'|'done'|'error', ...}`. Cancellation terminates the dedicated worker. Later stages consume the admitted profile and protocol only.

- [ ] Write tests showing an unclear licence, mutable revision and oversized asset cannot be loaded. Run them and observe the rejection gap.
- [ ] Implement the minimal profile validator, pin exact runtime/model assets and preserve actual upstream licence notices.
- [ ] Build a standalone worker harness. Load the real model in Chromium with CPU/WASM and a genuine GPU if available. Count actual tokenizer input, stream plain text and record cancellation.
- [ ] Freeze 20 evidence tasks covering five fields, English/Chinese, follow-ups, insufficient evidence, direct/adjacent evidence, injection and citation mismatch. Record observed answers and individual outcomes rather than infer quality from a successful load.
- [ ] Record download bytes, hashes, peak available memory metrics, load latency, first token and output throughput. Distinguish a headless/software GPU from physical hardware. Trace requests/storage with a sentinel chat value.
- [ ] Run `npm run lint` and `npm test`. Request Code Review Brains. Commit the measured gate and work log. If a required reference device or model is unavailable, record the blocked acceptance criterion and do not advertise the model as supported or change the public demo to unverified AI.

### Task 2: Shared bounded conversation core

**Files:** Create `src/chat.ts`, `tests/chat.test.ts`, `evaluation/chat-cases.json`. Reuse `src/retrieval.ts`, existing policy types and catalogue export.

**Interfaces:** `searchChat(catalogue, query, preferences): EvidenceCard[]`; `prepareChat(messages, evidence, countTokens): ChatMessage[]`; `validateCitations(text, evidence): {valid: boolean, cited: string[]}`. Evidence IDs are fixed short identifiers mapped to reviewed cards. Preferences use multilingual, query-first or query-only modes with an explicit query language.

- [ ] Write and run failing behavioral tests for ineligible source exclusion, direct-match ordering, language modes, follow-up subject retention and citation mismatch.
- [ ] Implement browser-safe shared retrieval and prompt construction. Use recent user turns for the subject; do not elevate generated history into trusted evidence.
- [ ] Write and run failing tests for source instruction injection, long Chinese input and oversized current messages. Implement tokenizer-counted trimming, explicit refusal when the current turn cannot fit, 100-message/2 MiB session limits and metadata-only evidence instructions.
- [ ] Run focused tests and the existing suite, request Code Review Brains, update the log and commit.

### Task 3: Conversational public demo

**Files:** Create `web/src/chat-ui.ts`, `web/src/session.ts`, `web/tests/browser.mjs`. Modify `demo/index.html`, `demo/styles.css`, `demo/app.js`, `src/demo.ts`, `.github/workflows/pages.yml` and relevant cache regression checks.

**Interfaces:** The UI owns one dedicated worker and RAM-only `ChatSession`; worker request IDs reject late output. Existing Browse sources is retained. Build emits same-origin content-hashed modules and required WASM assets into the Pages artifact. Model fetches use pinned approved hosts and no chat-derived URLs.

- [ ] Write real-browser failing tests for explicit model-download consent, composer/stream/stop, citation-safe source cards and follow-up context.
- [ ] Implement accessible conversation UI with plain-text draft rendering and verified source links. Show loading/errors, model licence/download details, session limits, language controls and browse access.
- [ ] Test and implement worker termination on stop/clear, request-ID protection, refresh/new-tab isolation, no personal persistent storage, and no external query on denied research. An unsupported research endpoint reports unavailable rather than pretending to search.
- [ ] Build/version assets through the existing export path. Test stale caches, actual CSP/WASM behavior, mobile/desktop layout and all 625-source browse parity. Keep the model gate as a release condition.
- [ ] Run `npm run lint`, `npm test`, real-browser suite and real-model smoke check. Request Code Review Brains, obtain fresh whole-change review, address material findings, update the log and commit. Submit the verified tree and inspect hosted Actions/Pages.

### Task 4: Persistent local desktop mode

**Files:** Create a separate `docs/chat/DESKTOP_PLAN.md` from the approved design and tested browser interfaces. It will name actual desktop files and migration signatures after the browser core stabilises.

- [ ] Plan and implement a separate Electron package sharing the tested UI/core, using sandboxed renderer, narrow validated IPC and the existing private SQLite backend.
- [ ] Verify migration preservation, transactional completed/incomplete turns, scoped preference persistence, deletion, readable backups and restoration.
- [ ] Build and verify Windows/macOS/Linux packages opening a normal application window. Record packaging/signing limitations accurately.
- [ ] Request Code Review Brains and fresh release review, update the work log and publish only tested deliverables.

## Execution and review

The maintainer approved the design and implementation. Proceed inline on the clean feature branch, using tests before behavior changes and no extra routine permission checkpoint. The first stage is a feasibility gate; later stages cannot claim completion if it fails. The desktop plan is intentionally separate because packaging/storage are independent of proving browser inference. Catalogue expansion toward thousands of eligible sources remains outstanding.
