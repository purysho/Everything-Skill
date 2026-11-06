# Discovery Record

## Scope and access

Research date: 2026-11-06.

Starting point: [Awesome-RAG](https://github.com/Danielskry/Awesome-RAG). The research also considered LangChain, RAGFlow, ColBERT, the official MCP Registry, mcpHQ’s curated MCP catalogue, and hybrid code-search implementations.

The requested product is a portable TypeScript skill with a versioned public SQLite index, private user index, staged cloud discovery, security review, and optional private MCP generation.

## Evidence ledger

| Source | Evidence status | Relevance | Licence/maintenance check |
|---|---|---|---|
| [Awesome-RAG](https://github.com/Danielskry/Awesome-RAG) | inspected catalogue | seed taxonomy and RAG patterns | verify entry licences individually |
| [LangChain](https://github.com/langchain-ai/langchain) | inspected implementation | integrations and retriever patterns | verify current repository terms |
| [RAGFlow](https://github.com/infiniflow/ragflow) | inspected implementation | agentic retrieval and context infrastructure | verify current repository terms |
| [ColBERT](https://github.com/stanford-futuredata/ColBERT) | primary research/code source | token-level late interaction and reranking | verify model/data terms before bundling |
| [MCP Registry](https://github.com/modelcontextprotocol/registry) | primary registry source | live MCP metadata and API | use registry terms and server-specific terms |
| [mcpHQ/awesome-mcp-servers](https://github.com/mcpHQ/awesome-mcp-servers) | curated catalogue | structured MCP metadata and verification signals | verify each server separately |
| [PolyForm Noncommercial](https://polyformproject.org/licenses/noncommercial/1.0.0) | official licence text | noncommercial source-available reference | legal review still required |
| [OSI Open Source Definition](https://opensource.org/osd) | official definition | establishes commercial-use incompatibility | authoritative for “open source” label |
| [European Commission GDPR principles](https://commission.europa.eu/law/law-topic/data-protection/data-protection-eu_en) | official guidance | privacy-by-design baseline | not a global legal compliance guarantee |

## Decision

Recommend a routed hybrid retrieval cascade over a versioned SQLite metadata index, with live search and progressive indexing only when the cached index is insufficient. Use transformer reranking only after cheap routing and filtering. Keep generated MCPs private and sandbox-tested.

Strong alternative: use an existing RAG platform such as RAGFlow as the initial engine. Rejected for the first build because it adds operational weight and does not by itself solve the portable skill, public/private index governance, licensing review, or user-specific discovery model.

## First experiment

Create a small benchmark of 100 repositories/MCPs/datasets/papers and 30 real queries. Compare keyword, dense, flat hybrid, routed hybrid, and routed hybrid plus reranking. Track Recall@5, nDCG, irrelevant results, tokens, latency, licence/security accuracy, and usefulness.

The recommendation changes if a simpler flat index matches routed retrieval quality and token use, or if the security/licensing pipeline cannot reliably classify source changes.
