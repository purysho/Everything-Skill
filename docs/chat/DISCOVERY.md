# Conversational Everything Skill discovery

Research date 7 November 2026. This is an initial discovery record. The audience and model hosting choice are pending.

## Scope and access

The user wants a chatbot experience with the resource search engine acting as its research backend. Preserve the curated public catalogue, private user data, source and licence controls, explicit permission for external searches, and lean TypeScript implementation.

Inspected package.json, ARCHITECTURE.md, src/cli.ts, src/transformer.ts, source-provider and preference references, and the current static demo. The application implements local retrieval, evidence cards, public discovery providers, policy reports and an optional local cross-encoder. Conversation storage, answer generation, a chat API and a model connection remain to build. Architecture documentation includes proposed entities beyond the implemented SQLite schema.

Opened official GitHub Pages documentation and Ollama chat and configuration documentation. Model weights, hosted model pricing, provider retention terms and inference performance have not been assessed. This discovery used repository inspection and public documentation. It performed no model inference or credentialed integration.

## Evidence ledger

| Source and access | Evidence status | Relevance | Rights and maintenance | Next check |
| --- | --- | --- | --- | --- |
| Existing Everything Skill implementation, inspected locally | Implementation inspected, previous retrieval tests recorded in WORK_LOG.md | Reuse search, policy filtering, citations and private records | Project PolyForm Noncommercial 1.0.0. Current catalogue and tests are recorded in the repository. | Expose retrieval through a narrow server interface and test it through chat. |
| [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), opened | Official product documentation | Pages hosts HTML, CSS and JavaScript. The model and chat service need a separately chosen execution environment. | Hosting documentation inspected. No third-party code or model adopted. | Choose private installation or public service. |
| [Ollama chat API](https://docs.ollama.com/api/chat), opened | Official API documentation | Supports conversation messages and streamed generation through a local model service. | Runtime and individual model licences require separate review before adoption. No model installed or benchmarked. | If local inference is selected, inspect the specific runtime/model licences and benchmark the target hardware. |
| [Ollama configuration FAQ](https://docs.ollama.com/faq), opened | Official runtime documentation | Context and GPU allocation affect memory and inference capacity. | No performance claim established by documentation inspection. | Measure the selected model with realistic evidence and follow-up context. |

## Decision

Propose a conversational research assistant with a chat interface, a small Node.js service and the existing retrieval and policy code. The service would assemble a bounded evidence bundle and ask a selected language model to answer from it. The source card IDs would define the permitted citations. Follow-up context would help resolve later questions, and private preferences would retain their chosen scope.

The existing catalogue primarily supplies metadata and summaries. Scientific conclusions need supporting article evidence. The chatbot should distinguish source discovery from conclusions supported by retrieved text, and ask before a required external lookup. Model-generated citation IDs must be checked against the actual evidence bundle. Retrieved source instructions remain untrusted.

Two deployment approaches remain open. A private installation can keep inference and history on the user's machine with a local model. A hosted service can offer access through a public website, with authentication, private storage and model-usage controls sized for its audience. The next user preference is whether the first version is personal or publicly accessible. That determines the model, hosting, privacy and budget research needed next.

## First experiment

Proposed hypothesis. A bounded conversational retrieval loop will answer follow-ups more usefully than the current independent search while preserving source identity and permission controls.

Compare the existing shortlist with a chat answer and follow-up on a fixed set of catalogue questions covering medicine, languages, arts, computing and economics. Include insufficient evidence, refused external search, altered source IDs and injected source instructions. Use at most five candidate cards and one generation call per answer in the first experiment. Select an explicit model, context budget, host and spending ceiling before running it.

Acceptance requires citations resolving only to supplied source IDs, no unsupported claim of having read full papers, permission respected when web access is refused, usable follow-up context, working cancellation and private conversation persistence. Measure latency, token use, citation support and answer usefulness. These are proposed checks. The conversation experiment has not run.

Next action is to establish the audience, choose the execution approach, and turn the agreed behavior into a reviewed chat design before implementation.
