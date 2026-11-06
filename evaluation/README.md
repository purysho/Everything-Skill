# Held-out retrieval evaluation

The frozen corpus contains 109 distinct documentation pages from four upstream releases and no starter catalogue records. The 30 authored questions cover Python tooling, numerical computing, machine learning, and data analysis. The initial run preceded retrieval changes in this closeout. The optional transformer and compact comparisons reuse that fixed corpus. This is an engineering benchmark within these domains. It does not measure retrieval across all intended domains or establish statistical significance.

Each record has a pinned GitHub source path, a digest of the page and a scoped upstream licence notice with its own digest. `verify_sources.py` checks each page for presence and a file-level SPDX exception and fails if one needs individual review. The corpus contains independently written summaries. Upstream prose and examples are not redistributed.

## Reproduce

1. Install dependencies and build with `npm ci --ignore-scripts` and `npm run build`.
2. Run `npm run benchmark:heldout` for the four base modes and two compact controls.
3. With the optional dependency and pinned model from the [main README](../README.md), run `npm run benchmark:heldout -- "<models directory>"` for the cross-encoder modes.
4. To reverify the ledger, download GitHub archives using the exact commits in [sources.json](sources.json). Name them `owner_repository.zip`, replacing the slash with an underscore. Run `python evaluation/verify_sources.py "<archive directory>"`. The verifier reads pinned raw files from GitHub when a release archive omits its documentation. Compare the output with [source-hashes.json](source-hashes.json).

[Baseline results](baseline-2026-11-06.json) · [Latest results](results-2026-11-06.json) · [Judgements](queries.tsv)

The tokenizer measures JSON evidence context using OpenAI's `o200k_base` encoding, excluding host message framing. Actual host costs depend on the model, request and surrounding context. Recall uses all listed relevant IDs. Success counts questions with at least one relevant result in the first five eligible slots. Unjudged results may still be relevant. The compact modes cap output at three. Transformer latency includes ranking after the model is loaded and excludes initialisation, which occurs once in the evaluation harness.
