# Conversational Everything Skill discovery

Research date 7 November 2026. This discovery record now includes the confirmed public demo and local desktop modes. The maintainer selected generation in the visitor’s browser. Runtime and model admission are proposed in DESIGN.md.

## Scope and access

The user wants a chatbot experience with the resource search engine acting as its research backend. Preserve the curated public catalogue, private user data, source and licence controls, explicit permission for external searches, and lean TypeScript implementation.

Inspected package.json, ARCHITECTURE.md, src/cli.ts, src/transformer.ts, source-provider and preference references, and the current static demo. The application implements local retrieval, evidence cards, public discovery providers, policy reports and an optional local cross-encoder. Conversation storage, answer generation, a chat API and a model connection remain to build. Architecture documentation includes proposed entities beyond the implemented SQLite schema.

Opened official GitHub Pages, Ollama, Transformers.js, WebLLM, original model cards and Electron security documentation. Inspected runtime registry licences and model repository metadata without downloading weights. Actual inference performance and converted-weight rights remain unverified. This discovery performed no model inference or credentialed integration.

## Evidence ledger

| Source and access | Evidence status | Relevance | Rights and maintenance | Next check |
| --- | --- | --- | --- | --- |
| Existing Everything Skill implementation, inspected locally | Implementation inspected, previous retrieval tests recorded in WORK_LOG.md | Reuse search, policy filtering, citations and private records | Project PolyForm Noncommercial 1.0.0. Current catalogue and tests are recorded in the repository. | Share browser-compatible retrieval and test it through chat. |
| [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), opened | Official product documentation | Pages hosts the static browser client. | Hosting documentation inspected. No third-party code or model adopted. | Verify the deployed client, asset headers and CSP with the admitted runtime. |
| [Ollama chat API](https://docs.ollama.com/api/chat), opened | Official API documentation | Supports conversation messages and streamed generation through a local model service. | Runtime and individual model licences require separate review before adoption. No model installed or benchmarked. | If local inference is selected, inspect the specific runtime/model licences and benchmark the target hardware. |
| [Ollama configuration FAQ](https://docs.ollama.com/faq), opened | Official runtime documentation | Context and GPU allocation affect memory and inference capacity. | No performance claim established by documentation inspection. | Measure the selected model with realistic evidence and follow-up context. |
| [Transformers.js](https://huggingface.co/docs/transformers.js/en/index) and [cache controls](https://huggingface.co/docs/transformers.js/en/api/env), opened | Official documentation and npm metadata | CPU/WASM and WebGPU browser inference, cache controls | Registry declares Apache 2.0. Version-specific compatibility remains to test. | Run a pinned model and audit storage and network behavior. |
| [WebLLM](https://webllm.mlc.ai/docs/user/basic_usage.html), opened | Official documentation and npm metadata | Alternative browser GPU generation runtime | Registry declares Apache 2.0. Model rights require separate admission. | Compare only if the first runtime fails its measured gate. |
| [Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B) and [Qwen3-1.7B](https://huggingface.co/Qwen/Qwen3-1.7B), opened | Original model cards | Multilingual candidate sizes | Originals declare Apache 2.0. Inspected community conversions lacked licence metadata. | Establish actual converted-weight rights before adoption and benchmark quality. |
| [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security), opened | Official documentation | Proposed separate local desktop package | No package installed. Security configuration remains to implement and test. | Review narrow IPC, renderer sandbox and private-store migration. |

## Decision

Use the selected browser-local approach for the public demo. A dedicated worker generates answers from a bounded evidence bundle and validated source IDs. Reuse the existing retrieval and policy logic through a browser-compatible shared core. The desktop package can use the Node.js SQLite backend for local history and preferences. Runtime and packaging proposals are detailed in DESIGN.md.

The existing catalogue primarily supplies metadata and summaries. Scientific conclusions need supporting article evidence. The chatbot should distinguish source discovery from conclusions supported by retrieved text, and ask before a required external lookup. Model-generated citation IDs must be checked against the actual evidence bundle. Retrieved source instructions remain untrusted.

The user selected a public demo with memory limited to the open tab, generation in the visitor’s browser, and a local desktop version that retains memory on the device. Runtime and hardware requirements are proposed in DESIGN.md. A hosted model service is outside the selected approach.

## First experiment

Proposed hypothesis. A bounded conversational retrieval loop will answer follow-ups more usefully than the current independent search while preserving source identity and permission controls.

Compare the existing shortlist with a chat answer and follow-up on a fixed set of catalogue questions covering medicine, languages, arts, computing and economics. Include insufficient evidence, refused external search, altered source IDs and injected source instructions. Use at most five candidate cards and one generation call per answer in the first experiment. Admit the pinned model and context budget before running it. Browser inference incurs no hosted-model charge. The proposed download ceiling is 1 GiB with explicit visitor consent.

Acceptance requires citations resolving only to supplied source IDs, no unsupported claim of having read full papers, permission respected when web access is refused, usable follow-up context, working cancellation, tab-only browser context and private desktop conversation persistence. Measure latency, token use, citation support and answer usefulness. These are proposed checks. The conversation experiment has not run.

Next action is to review DESIGN.md, then create the implementation plan and run its model-admission and device feasibility gate.


## Confirmed access and memory behavior

The demo is publicly accessible. Conversation memory is limited to the open tab. The desktop version runs locally and keeps persistent memory on the user's device.

Propose keeping demo messages, conversation context and temporary preferences in JavaScript memory. A page refresh would also reset that context. Persistent browser conversation storage and a shared service-worker conversation store would conflict with this proposal. The desktop can extend the existing private SQLite store for conversations and preferences, with explicit export, deletion and backup controls.

The source index and model assets are distinct from personal conversation memory. Their caching policy is stated separately in DESIGN.md. Public asset hosts may observe downloads, and chat data must not be included in those requests.

[WebLLM's official documentation](https://webllm.mlc.ai/docs/) describes browser inference accelerated with WebGPU. Its [basic usage guide](https://webllm.mlc.ai/docs/user/basic_usage.html) documents the initial model download and loading progress. Runtime declarations were inspected. Model admission and actual device performance remain pending.

The maintainer selected generation in the visitor’s browser. The written design compares browser runtimes and proposes a shared conversational core with a separate local desktop package.


## Browser inference selected

The maintainer confirmed browser-local generation. The npm registry reports Transformers.js 4.3.2 and WebLLM 0.2.87 under Apache 2.0. Transformers.js documentation describes CPU/WASM and WebGPU execution. Its existing use for optional reranking makes it the proposed first generation runtime. The default model remains subject to licence and real-device checks. Two Qwen3 community conversions lacked licence metadata during inspection and remain unadmitted. See DESIGN.md for the bounded feasibility gate and the proposed desktop implementation.
