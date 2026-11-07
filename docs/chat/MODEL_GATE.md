# Browser model gate

Status: internal feasibility work, not admitted for a public chatbot. The maintainer approved the design on 7 November 2026.

## Candidate and reproducibility

- Runtime: Transformers.js 4.3.2, npm integrity pins in web/package-lock.json.
- Candidate: onnx-community/Qwen3-0.6B-Instruct-ONNX, revision 54250909aca286a05b9d013c8af7a21859ee6ead.
- CPU/WASM q4 weights: 996,522,744 bytes, SHA-256 a1efc0c2ec91473bcd8cd27b2a25d50452252eac5a5d582722cbdc7d8e11f13d.
- Actual asset hashes and sizes: web/src/model.ts. The candidate contains one CPU profile; GPU is not yet offered.
- Rights declarations: converted card and its modified/original upstream identify Apache 2.0. Preserved licence texts and provenance are in docs/chat/notices/.
- Model admission rejects unclear rights, mutable revisions, invalid assets and profiles over the 1 GiB ceiling including the runtime allowance.

## Observed pilot

The real model loaded and generated three public-fixture answers in Chromium 141.0.7390.37 on Linux. The runner required single-process headless mode because ordinary browser process sockets were restricted. CPU was reported as AMD EPYC 9V74, with nine available logical CPUs and approximately 10.45 GB host memory. WASM inference uses one thread, matching a site without cross-origin isolation headers. No GPU adapter was available.

Locally served pinned model bytes loaded in 11.74 seconds. First visible text arrived in 15.96–17.80 seconds. Completed 15–34-token answers took 44.15–84.64 seconds. One separate process observation was around 3.1 GB RSS. This is not a measured portable memory peak or a cold public-download timing.

Two English pilot responses omitted required source markers. The Chinese answer included a whitespace-padded marker. The three answers stayed within the reviewed metadata scope. The model was not admitted. The revised explicit citation prompt completed the twenty frozen task questions across five fields. Manual review passed 11 and failed nine. Failures include unsupported citations with no source, vague limitation responses and misreading dataset units/publication languages. See evaluation-v1.json. This prompt-tuned development evaluation is not an independent held-out benchmark.

The pilot found no browser storage entries after those three tasks. The private-sentinel question was not run. The initial trace also omitted same-origin request bodies. This observation cannot establish the full privacy acceptance criterion.

## Review corrections

The fresh source reviewer found three material verification defects. The runtime's metadata Range probes had been converted into full weight fetches, downloading weights twice. The new manifest-backed metadata response avoids that transfer and keeps actual payload SRI enabled. The five-minute load wait used the wrong Playwright argument position; its options are now in the third argument. Request tracing now includes same-origin bodies, with a real-browser regression that detects a synthetic sentinel POST. A separate corrected-loader run served 1,036,911,030 bytes with one weight transfer and loaded in 10.97 seconds. It rejected an over-budget Chinese question, terminated an active generation with no late events, and left browser storage empty. The sentinel cancellation probe emitted no network traffic. A deliberately corrupted config was rejected by native browser SRI. Exact reports are transport-fixed.json and integrity-rejection.json. These worker probes do not certify the not-yet-built application.

The initial quality report and exact pilot input messages are retained in pilot-v1.json, with its known measurement defects. Subsequent reports record the built worker hash and exact input fixture hash/content. Model loading also explicitly pins registry preflights to the approved revision and loads the separately stored chat template.

Code Review Brains first timed out. A narrower retry returned public-source guidance favouring real integration tests over isolated mocks: https://www.youtube.com/watch?v=Tc5z64XIwIY . The service did not inspect or approve this source diff. A fresh code reviewer inspected the actual internal stage and identified the corrections above.

## Reproduce

From the repository root, using Node 24:

```sh
npm ci --ignore-scripts
npm test
npm --prefix web ci --ignore-scripts
node web/node_modules/playwright/cli.js install chromium-headless-shell
npm --prefix web run build
npm --prefix web run gate
```

The default gate fetches the exact public model URLs with integrity checks. It uses no account credentials. Downloading the candidate is an explicit developer action and needs around 1 GiB of transfer plus several GiB of RAM. For an already verified local copy, set EVERYTHING_GATE_WEIGHTS to its directory, retaining the exact asset layout and hashes. This uses a local redirect for test transport and does not establish public-host CORS. EVERYTHING_GATE_SINGLE_PROCESS=1 is an internal constrained-runner workaround, not a browser setting recommended to visitors. EVERYTHING_GATE_CASE_LIMIT can bound a development pilot; a limited run cannot count as the full suite.

No model files, browser executables or generated runtime bundles are checked into git. The public catalogue and demo remain unchanged.

## Outstanding admission checks

- Replace the failed default candidate; the next bounded comparison is the rights-declared Qwen3.5-0.8B ONNX text-only profile. Do not admit on documentation alone.
- Sampled memory measurements and a complete answer smoke check on the corrected transport/model combination.
- Public HTTPS/CORS download and CSP test with the actual pinned assets, without the local redirect.
- Genuine GPU/device measurements, mobile and low-memory behavior. A missing adapter is not a GPU test.
- Full context-budget and follow-up behavior through the shared conversation core.
- Complete transitive runtime notices before any public inference release.
- Real multi-tab/refresh/session privacy and external-research permission tests in the actual chat application.

The next smallest independent software step is the shared bounded retrieval/conversation core. Browser release and desktop packaging remain gated on the model and application acceptance checks.


## Recovered second-model verdict

The interrupted workspace was restored, including the exact Qwen3.5 pilot. Its fixed q4 text-only assets total 666,378,110 bytes. Loading took 5.52 seconds. The completed 55-token Chinese response took 222.36 seconds, first text at 30.08 seconds, and misinterpreted the dataset's units/publication languages. The next task timed out at 240 seconds. This candidate is not admitted.

Correction to the interruption note: the raw selected fixture order was languages-chinese, economics-limits, no-evidence. Therefore economics-limits timed out; no-evidence did not run. Earlier notes incorrectly assumed command-line ID order. The new selector preserves requested order, rejects unknown/duplicate IDs and invalid limits before loading weights, and records active task identity before dispatch. The complete recovered report is qwen35-pilot.json.

The new Browser chat foundation workflow checks the real admission fetch against the pinned public config through browser CORS/SRI, plus a same-origin privacy regression. It downloads no model weights and does not deploy or admit a model. Hosted results remain to verify. Both bounded small candidates failed; the next model/device experiment requires a revised profile and genuine GPU evidence. The public browse demo remains unchanged.
