# Everything Skill conversational application design

Draft for review, 7 November 2026.

## Intent and confirmed choices

The resource engine will support a conversational research assistant. The maintainer selected a publicly accessible browser demo, generation on each visitor's device, and conversation memory limited to the open tab. A desktop application will run locally and retain memory on its owner's device. The existing portable skill and CLI remain supported entry points.

The assistant should answer questions, preserve follow-up context, show source evidence, explain limitations and ask before external research. Coverage includes broad and niche fields. Multilingual retrieval is the default, with query-language first and query-language only settings. Direct matches lead with their weaknesses, followed by stronger adjacent evidence when established by the sources.

## Approaches and recommendation

| Approach | Fit | Trade-off | Decision |
| --- | --- | --- | --- |
| Transformers.js browser generation | CPU/WASM and WebGPU options, TypeScript interfaces, same runtime family as the optional reranker | Model-specific compatibility, memory and speed require measurement | Proposed first runtime, pinned after admission checks |
| WebLLM browser generation | Dedicated GPU inference and streaming chat API | WebGPU device requirements make broader compatibility harder | Alternative if the first runtime fails the measured generation requirements |
| Hosted model service | Public access with server-managed inference | Messages leave the device and inference requires a service budget | User selected local browser inference |

The maintainer selected browser inference. Runtime, model, download limits and desktop packaging below are builder proposals for review.

## Browser application

Use the existing public catalogue and a shared TypeScript conversation core. Serve the client from GitHub Pages. A dedicated Web Worker loads the admitted model and generates answers locally. The worker receives validated messages and a bounded evidence bundle from the application. It has one active generation at a time and reports loading progress, text, completion, cancellation and failures.

The first release has a message composer, streaming response, stop control, clear-chat control, source cards, language settings and a visible local-model status. Source cards preserve the reviewed URLs, licence and checked date. The existing catalogue remains available through a Browse sources control. These are functional requirements. Detailed layout and styling are left to the builder using the existing visual system.

Start AI is a deliberate action after displaying the exact model, download estimate, licence link and device checks. The default model download ceiling is 1 GiB, including the files needed for that profile. A larger profile requires a separate explicit user selection with its own size and hardware information. Network retries are bounded and cancellable.

Prefer a tested WebGPU profile when available. Offer a tested CPU/WASM profile on compatible devices. Capability detection precedes model loading. A failed GPU load can offer the CPU profile after explaining any different download and performance implications. A device that cannot load either profile receives an accurate status and can continue browsing sources. Browser availability does not establish sufficient device memory or acceptable inference speed.

## Model admission and feasibility gate

Use a pinned multilingual instruction model whose original licence and the actual converted weight files have been established. Qwen 0.5–0.6B and 1.5–1.7B profiles are candidates for measurement, not adopted defaults. The original Qwen3 cards declare Apache 2.0. Two inspected community conversions lacked a licence declaration in their metadata, so their public adoption remains blocked until rights and notices are established or the project makes its own permitted conversion from pinned original weights.

First compare the small profile against the larger profile on the same frozen evidence tasks. Limit exploration to two model families or sizes, one quantized configuration per backend initially, and four hours of local measurement. The builder must record exact model and tokenizer revisions, weight hashes, runtime versions, model licences, notices, total download bytes, context limits, memory measurements and test devices. Avoid executing remote model code. Model fetches use fixed approved paths rather than model-generated URLs.

Measure actual inference before choosing the default. Proposed usability gates after loading are a first visible token within 30 seconds on the reference GPU device and within 90 seconds on the reference CPU device, and a 256-token response within 120 seconds on the reference GPU device. These are acceptance targets rather than measured claims. Record cold download time separately. Low-memory and unsupported devices are explicitly tested, and advertised compatibility is limited to tested profiles.

If the smaller profile fails evidence-grounding checks, it cannot become the default merely for speed. If both profiles fail, preserve the browse experience, report the failed gate and revise the runtime or model choice before describing the demo as working AI chat.

## Conversation and retrieval loop

1. Accept the current message and active session preferences. A follow-up can use recent turns to identify the subject. Only confirmed user preferences become structured session settings.
2. Search the cached catalogue using shared tokenisation, local embedding and fusion logic. Filter sources by existing safety and licence policy before constructing context. The browser works from the public export. The desktop uses its selected public SQLite snapshot and scoped private preferences.
3. Select up to five evidence cards. The initial generator gets source identifiers, titles, reviewed metadata, scope and permitted summaries. It must describe metadata-only findings accurately.
4. If the answer needs article sections or a fresh search, present a permission request naming the provider, exact public query or URL, and data to be sent. Denial continues with available evidence or explains what remains unknown. The browser supports only verified credential-free CORS endpoints. Provider failure produces a visible outcome. Model inference stays local throughout.
5. Scan new retrieved material as untrusted data, apply licence rules and add only the permitted sections to the in-memory context. The model has no direct execution, arbitrary network, credential, filesystem or MCP privileges.
6. Generate a concise answer with references to fixed evidence IDs. Render streamed text as an unfinished draft. After completion, validate each cited ID against the evidence bundle before creating links. Invalid citations produce a clear validation failure and the verified source cards. The validator establishes source identity. Claim support still needs separate evaluation.
7. Retain the accepted turn in the active conversation store. Web context stays in the tab. Desktop history is written locally through the narrow storage interface.

Default generation is bounded to a 4,096-token context, at most 3,072 input tokens and 512 output tokens. Count using the selected tokenizer and trim older model context before source evidence. Keep visible history up to 100 messages or 2 MiB. On reaching the session limit, ask the visitor to start a new chat. These are builder proposals intended to bound browser memory. Stop generation must release or terminate the worker within five seconds and discard late tokens using a request ID.

When no relevant eligible source is found, the assistant can ask a clarification or offer an approved external lookup. It must not manufacture a source or claim to have read unavailable text. Casual conversation can use a small direct response path. Scientific claims need supporting evidence beyond a title or catalogue relevance score.

## Memory and privacy contract

| Data | Public demo | Desktop |
| --- | --- | --- |
| Chats and follow-up context | JavaScript and worker memory for the current tab | Private local SQLite |
| Language and temporary preferences | Current tab memory | Private local preferences with explicit scope |
| Model execution state | Current tab's worker | Local worker/runtime |
| Personal history in browser storage | No application writes to localStorage, sessionStorage, IndexedDB or Cache API | Managed by the desktop main process |
| Approved public catalogue | Ordinary static assets | Versioned public SQLite snapshot |

Proposed interpretation of tab memory is that refresh also clears the conversation. No shared worker, service worker resume store, analytics events or remote chat endpoint receives conversation state. Clear chat terminates the worker context and clears message and preference references. Opening another tab starts a distinct conversation.

Runtime asset caching is separate from personal memory. For the initial browser release, disable the runtime's persistent model and WASM caches where supported. Normal browser-managed static asset caching may occur. If a later release offers persistent model downloads, it must be labelled and opted into separately from conversation memory. A network/storage test must establish that runtime caches contain no prompts, responses or preferences.

User text and conversation-derived queries go to external research providers only after the specific permission action. There are no cloud model calls, API keys or remote user-account storage in the browser mode. Public hosts can observe asset download requests according to their own policies. The application does not attach chat text or preferences to those requests.

## Desktop application

Propose a separate Electron package using the same chat UI, worker protocol and model profiles. This reuses Node.js and the existing SQLite engine and keeps desktop dependencies outside the canonical skill package. Tauri is a possible later alternative but adds a native toolchain and a Node sidecar for the current backend. The desktop wrapper choice is a proposal, not a maintainer decision.

Load packaged application assets in a sandboxed renderer with context isolation and Node integration disabled. A narrow preload bridge exposes validated catalogue search, conversation operations, scoped preferences and explicit backup/restore. It must not expose arbitrary IPC, shell commands, paths or SQL. External source links open through a validated HTTPS allowlist in the normal browser. Keep retrieved content out of privileged HTML and scripts.

Extend the private database through forward-compatible migrations for conversations, ordered messages and confirmed preferences. A completed turn is stored transactionally. Interrupted output is marked incomplete and excluded from later model context until the user retries or accepts it. Chat deletion does not rewrite append-only source security reports, which contain source findings rather than chat bodies. Reuse the existing backup and rollback facilities and verify old private data remains readable.

The first desktop acceptance target is Windows, macOS and Linux packaging with an ordinary application window, with no terminal or manually opened local server needed for normal use. Persistent chat and preferences survive an application restart. Shared application behavior is implemented first in the browser slice, followed by the desktop storage and packaging slice.

## Security and licences

Preserve all current hard blocks and the prohibition on credential probing, automatic MCP connections, purchases, publications, submissions and account changes. The Send, Start AI and explicit permission controls authorise only the named operation. Retrieved instructions never expand the model's permissions. Generated MCP adapters retain their private experimental status.

Render generated and retrieved text with safe DOM APIs. Keep CSP rules limited to the packaged runtime, worker, required WASM execution and pinned model asset hosts. Review each necessary CSP relaxation in the browser feasibility gate. Unsupported browser CORS does not authorise a proxy or hosted inference fallback.

The project remains under PolyForm Noncommercial 1.0.0. Preserve actual dependency and model notices and keep commercial licensing terms distinct from upstream rights.

## Acceptance and build order

| Slice | Observable completion check |
| --- | --- |
| Model and browser feasibility | A real admitted model runs the frozen evidence tasks locally on the reference GPU and CPU devices. Download, memory, latency, cancellation, licence and network traces are recorded. |
| Conversational browser demo | Real streamed answers, follow-ups and validated source cards work on the deployed HTTPS site. All 625 current entries remain browseable. |
| Session privacy and research permissions | Chat and preference values never enter persistent browser storage or a request body. A fresh or reloaded tab has no prior conversation. Denied research sends no external query. |
| Evidence and language behavior | A 20-case frozen set covers five domains, follow-ups, English and Chinese, insufficient evidence, direct versus adjacent findings, injected source content and citation mismatch. All source IDs resolve, unsupported full-text claims fail, and supported language modes constrain retrieval correctly. |
| Desktop persistence | Saved conversations and scoped preferences survive restart, independent users' data stays isolated, migrations preserve the old private store, and backups restore it. |
| Release | Relevant unit, browser, adversarial and cross-platform checks pass, source and model notices are present, and the work log records the tested scope and unresolved limits. |

Build the browser vertical slice before expanding desktop packaging. The existing thousands-of-sources expansion remains a separate workstream.

## Evidence and pending checks

- [Transformers.js browser WASM, WebGPU and quantization documentation](https://huggingface.co/docs/transformers.js/en/index)
- [Transformers.js environment and cache controls](https://huggingface.co/docs/transformers.js/en/api/env)
- [WebLLM browser inference documentation](https://webllm.mlc.ai/docs/)
- [Qwen3-0.6B original model](https://huggingface.co/Qwen/Qwen3-0.6B) and [Qwen3-1.7B original model](https://huggingface.co/Qwen/Qwen3-1.7B)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)

The npm registry reported Transformers.js 4.3.2 and WebLLM 0.2.87 with Apache 2.0 licences during this research. Original model cards and runtime licences were inspected. Runtime/model compatibility, converted-weight rights, GPU/CPU performance and the complete app privacy behavior are pending empirical checks. No product code, dependency installation or model inference has been performed for this chat design.
