# Everything Skill — Evaluation Plan

## Retrieval benchmark

Build a labelled set of real queries across software, education, healthcare, finance, science, datasets, and MCP discovery. Include broad-to-specialised queries and follow-up queries.

Compare:

1. keyword search;
2. dense search;
3. flat hybrid search;
4. routed hybrid search;
5. routed hybrid search with transformer reranking.

Metrics:

- Recall@5 and Recall@10;
- MRR and nDCG;
- irrelevant-result rate;
- tokens sent to the host model;
- latency and indexing cost;
- licence/security classification accuracy;
- compatibility and usefulness judgments.

Success criterion: routed hybrid retrieval finds the correct specialised candidate in the top five while using materially fewer model-context tokens than flat retrieval.

## Security benchmark

Create safe fixtures for:

- prompt injection;
- credential requests;
- malicious install commands;
- suspicious dependencies;
- excessive MCP permissions;
- scam-like services;
- ownership transfer;
- archived/dead repositories;
- post-approval malicious changes.

Measure false negatives, false positives, time to block, report quality, and whether source content can influence policy.

Hard-block success criterion: no fixture classified as credible data theft, credential abuse, malware, scam, or illegal activity is returned as usable or overrideable.

## Data and update benchmark

Test staged indexing, canonical deduplication, update review, weekly demo checks, migrations, backup/restore, rollback, and append-only audit history.

Success criterion: no public-index update deletes private discoveries, preferences, overrides, work, or security history.

## MCP benchmark

Use synthetic or read-only sources. Test generated adapters for schema correctness, least privilege, timeout behaviour, error handling, provenance, and sandbox escape attempts.

Success criterion: no real credential is requested automatically and no write action happens without fresh confirmation.

## UX benchmark

Ask first-time users to install, run a search, understand the shortlist, inspect licence exclusions, suggest a resource, update the index, and roll back. Measure task completion, confusion, and time to first successful query.

## Compliance boundary

The project should use privacy-by-design defaults: purpose limitation, data minimisation, transparency, integrity/confidentiality, accountability, and user control. These are aligned with the European Commission’s GDPR principles, but they do not by themselves make the project compliant with every jurisdiction. genui{"citation":{"ref":"turn2search5"}}

Before public release, obtain jurisdiction-specific legal review for privacy notices, data transfers, retention, security incident handling, accessibility, consumer protection, and licensing.
