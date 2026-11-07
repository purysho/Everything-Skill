# Resume browser chat implementation

Checkpoint date: 7 November 2026.

## Confirmed repository state

- Repository: https://github.com/purysho/Everything-Skill
- Tested code checkpoint: a956e28c053ed21277b937078724dd5dccdc5181.
- User approved docs/chat/DESIGN.md and implementation. Browser inference, tab-only demo memory and persistent local desktop memory remain the selected design.
- Source checkpoints bb88c2e and a956e28 contain the internal inference harness, rights/hash/download boundary, shared bounded chat retrieval core and tests.
- 48 root tests and lint passed locally. Real Chromium checks verified the corrected first-model loader, a 1,036,911,030-byte transfer, token rejection, termination, native SRI corruption rejection and the synthetic sentinel network probe. These are worker checks, not app privacy certification.
- Code Review Brains supplied public guidance, not source-diff approval. Fresh reviewers identified actual source/harness bugs; regressions failed before fixes and passed afterward.
- Public demo still browses 625 sources. Chat UI, desktop conversation persistence, genuine GPU checks, language enrichment and catalogue expansion remain outstanding.

## Model verdicts

1. Qwen3-0.6B Instruct ONNX: 11 of 20 development tasks passed manual review; nine failed. Failures included invented citations with absent evidence, vague limitations and misinterpreted multilingual metadata. Exact inputs/output are in docs/chat/evaluation-v1.json. Not admitted.
2. Qwen3.5-0.8B ONNX OPT: one completed Chinese answer misinterpreted tone-box units/publication languages. That 55-token answer took 222.36 seconds; first text 30.08 seconds; loading 5.52 seconds. The next no-evidence task timed out after 240 seconds. Third task not run. Not admitted. A full twenty-task run is not justified by this failed pilot.

Second model identity: onnx-community/Qwen3.5-0.8B-ONNX-OPT revision 9a4c21d8f724176b0a7edaaed36303044451886e. Original Qwen revision 2fc06364715b967f1860aea9cf38778875588b17 declares Apache 2.0. Text-only q4 files total 666,378,110 bytes plus runtime. Use only embed_tokens/decoder q4 graph and external data files, tokenizer/config/generation/template; no vision weights. Establish notices and hashes again if local evidence is unavailable.

## Recover before editing

1. Restore the workspace if available, inspect git status/log and compare with remote main. Preserve uncommitted files. The last branch was feature/browser-chat in /workspace/scratch/b528fd7a7856/Everything-Skill. Command-line Git could read but not push; the connected GitHub API submitted commits.
2. Pending local changes after a956e28 were web/src/model.ts, web/src/worker.ts, web/scripts/build.mjs, web/scripts/feasibility.mjs, web/package.json, web/tests/public-model.test.mjs, .github/workflows/browser-chat.yml, docs/chat/notices/Qwen3.5-LICENSE.txt and newer work-log notes. Do not assume these reached GitHub.
3. Preserve web/gate-results/qwen35-pilot.json if recoverable. It contains the raw second-candidate pilot, exact fixtures and worker hash. The attempted copy into docs/chat/qwen35-pilot.json was interrupted before verification. Raw first-model/transport reports are already committed.
4. Local development weights were /tmp/everything-chat-weights and /tmp/everything-qwen35-weights. Download helpers/metadata were /tmp/everything-fetch-qwen35.py, /tmp/everything-qwen35-meta.json, /tmp/everything-qwen35-assets.json and /tmp/everything-qwen35-original.json. Re-fetch pinned public bytes if absent; never infer successful hashes from a filename.
5. Inspect pending changes before reapplying. Second-profile support selected from a fixed candidate list, kept pinned manifest/SRI checks, used AutoModelForCausalLM text-only loading and explicit single-chunk external data. The harness selected profiles and task IDs through explicit developer environment options. No model was made a supported default.
6. Re-run npm run lint, npm test, npm --prefix web run build and the browser tests only after reconciling the tree. The last new browser-test run result was not observed. Do not claim it passed.

## Transport and next smallest step

This runner's public-browser fetch failed with ERR_CERT_AUTHORITY_INVALID. Local model tests used verified bytes redirected to a local server. They do not establish real public HTTPS/CORS behavior. Do not disable certificate checking. The drafted GitHub workflow installs the pinned headless browser, builds the actual admission module and checks the pinned public config through it, plus the same-origin sentinel trace regression. It downloads no model weights and does not deploy chat. Verify/submit the draft and inspect actual hosted results.

The approved two-small-candidate comparison failed. Preserve browsing and the reusable core. Next evaluate a better model/runtime profile, likely a separately opted-in larger download with genuine GPU measurements, rather than promote a failed small model. Larger downloads already require their own explicit visitor choice under the approved design. Record rights, bytes, quality and tested-device evidence before admission. No hosted inference fallback is authorised.

After model admission, implement and test the real conversational browser UI, refresh/new-tab memory isolation and external-search permission controls. Then plan/implement the separate desktop persistence/package slice. Follow docs/chat/IMPLEMENTATION_PLAN.md, keep WORK_LOG.md current and run Code Review Brains at stage boundaries. Never describe the chatbot or the whole project as complete based on these internal checkpoints.


## Recovery update

The workspace was restored and pending source/report files recovered. See WORK_LOG.md's frozen-workspace recovery entry. Important correction: the Qwen3.5 timeout was economics-limits; no-evidence did not run. The exact raw report's fixture ordering establishes this. Selection validation and timeout reporting have regression coverage now. Continue from the latest remote commit and inspect git status before reapplying any old pending file list. The public browser workflow still needs its hosted outcome recorded before the transport check can be called verified.
