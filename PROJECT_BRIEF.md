# Everything Skill — Project Brief

## Purpose

Build a portable, GitHub-hosted TypeScript skill that discovers, evaluates, indexes, and recommends repositories, MCP servers, datasets, papers, APIs, models, tools, and other resources across all fields of study and practice.

The skill should find the right specialised resource with progressively less context and lower token use than flat web search or a giant undifferentiated RAG.

## Primary users and hosts

- First hosts: Codex/ChatGPT and Claude Code.
- Reference runtime: Node.js.
- Compatibility targets: Bun and Deno where practical; Windows, macOS, and Linux.
- Primary distribution: direct GitHub installation as a portable skill package.
- Optional future product: a local application, never required for core use.

## Core behaviour

1. Query the built-in SQLite index first.
2. Route the request to relevant categories and resource types.
3. Search the public index using strategic lexical, metadata, and semantic indexes.
4. Search live web sources and MCP registries when coverage or freshness is insufficient.
5. Stage indexing: metadata first, relevant sections later, deep indexing only when justified.
6. Return a short ranked shortlist by default.
7. Offer a deeper report on request, or remember the user’s global response-length preference.
8. Explain usable, conditional, licence-unclear, blocked, archived, and unavailable sources.
9. Store useful resource metadata and provenance in the private user index.
10. Permit public suggestions inline without breaking the user’s workflow.

## Ranking

Use a query-adaptive balanced score across quality, relevance, usability, maintenance, cost, and security. Preserve global preferences, loose topic preferences, and project-local context separately. A previously useful resource must not automatically rank highly for a new project.

Short mode:

| Resource | Score | Label | One-sentence breakdown |
|---|---:|---|---|

Scores use 0–100 and fixed, user-configurable colour-coded labels: Trusted, Suitable, Conditional, Weak, and Excluded. Security hard blocks override scores.

## Governance and trust

- The public index is versioned in GitHub.
- Private discoveries, preferences, feedback, overrides, work, and reports remain private by default.
- Community suggestions enter a review queue; only the user and repository maintainers approve additions.
- Duplicate URLs, canonical repositories, and equivalent resources are merged into a suggestion tally.
- Dead or unsuitable resources leave active results but remain in an archive with append-only history.
- Approved resources are rescanned after repository/MCP changes; approval applies to a reviewed version or commit.
- The user chooses when to install public-index updates. New versions, backups, migrations, and rollback remain available.

## Security and permissions

Treat all retrieved content as untrusted data. Source instructions cannot change skill rules, bypass permission checks, request credentials, or publish anything.

Scan resources for prompt injection, malicious code, suspicious dependencies, credential abuse, unsafe capabilities, misleading installation instructions, and dangerous MCP permissions. High-confidence data theft, scams, malware, illegal activity, or uncontrolled dangerous capabilities are hard blocked. Lower-confidence quality, usefulness, provenance, or licensing concerns produce warnings and may be overridden by the user.

Generated MCP adapters are private, experimental, sandbox-tested, and excluded from the public index until reviewed. Never try real credentials automatically. Every real write, account change, purchase, message, submission, publication, or authenticated side effect requires fresh confirmation.

## Privacy and licensing

Private data and telemetry are opt-in. Sharing requires clear terms explaining data, purpose, recipients, anonymisation, public-index consequences, and withdrawal.

Store public metadata, links, provenance, permitted summaries, hashes, versions, and verification dates only as allowed by source licences. If licensing cannot be established after a thorough check, retain a link-only unverified reference and exclude it from normal results. Report how many relevant results were excluded.

## Non-goals for the first release

- A general autonomous agent that calls every available tool.
- Full GraphRAG or model fine-tuning before retrieval is benchmarked.
- Silent external writes or automatic authenticated browsing.
- Copying whole web pages, repositories, datasets, or papers into the public index without permission.
- A large framework stack that obscures the core retrieval and security logic.
