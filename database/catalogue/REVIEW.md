# Catalogue review completed on 7 November 2026

The maintainer approved Batch 001 and instructed completion of the remaining intake batches. The exact approved manifest is retained in approved-batch-001.json. Its SHA-256 is 02a646bf6661775bc52c290cddb146c581641d3bcf87e1e6a4508130d0d8c803.

All 1,398 intake records have a disposition across 14 batches. The catalogue admits 618 intake records and one supplemental BEA publication. Together with the six existing cards, the current snapshot contains 625 active sources. The other 780 intake records remain outside active results.

The admission review used official source records and article licence notices. Automated checks covered identity, artefact type, field evidence, access, licence declarations, conflicting rights, metadata safety and sensitive data indicators. Earlier individual review holds were preserved. The source payloads, software and participant data were outside this review. Conditional labels reflect this scope.

## Intake batches

| Batch | Intake records admitted | Records held |
| --- | ---: | ---: |
| 01 | 63 | 37 |
| 02 | 46 | 54 |
| 03 | 58 | 42 |
| 04 | 31 | 69 |
| 05 | 31 | 69 |
| 06 | 49 | 51 |
| 07 | 39 | 61 |
| 08 | 30 | 70 |
| 09 | 38 | 62 |
| 10 | 43 | 57 |
| 11 | 50 | 50 |
| 12 | 56 | 44 |
| 13 | 42 | 58 |
| 14 | 42 | 56 |

## Admission coverage

| Field | New active sources |
| --- | ---: |
| agriculture and food | 46 |
| arts and design | 63 |
| computing and information | 3 |
| earth and environment | 69 |
| economics and business | 1 |
| education and psychology | 42 |
| engineering and technology | 64 |
| humanities | 55 |
| languages and linguistics | 59 |
| law and public policy | 14 |
| life sciences | 30 |
| mathematics and statistics | 26 |
| medicine and health | 68 |
| physical sciences | 61 |
| social sciences | 18 |

## Exclusion reasons

- held · 431
- off topic · 189
- rights review · 10
- privacy review · 50
- unavailable · 37
- licence unclear · 63

The ledger uses “unavailable” for responses that failed or exceeded the bounded review limit during this pass. It records the observed result rather than a permanent conclusion about the source.

A directory disguised as a dataset was caught by the existing individual-source regression check and excluded. The original Vivaldi dementia study remains link-only while reuse and access are unresolved. Some openly readable articles carry restricted reuse licences. Human recordings, respondent data and scraped educational exercises need additional evidence before admission.

## Verification and updates

The weekly workflow and explicit query verification now share official-source checks for GitHub, Zenodo, Met objects, openly licensed PMC articles and the admitted BEA release. Article content hashes identify changed text. One legacy article retains its previously approved version label and receives fresh identity, licence and surface checks.

Freshness requests are credential-free and bounded. The weekly audit spaces requests and flags failures for maintainer review. It does not publish a replacement catalogue. Source findings are recorded as categories, and private query reports remain append-only.

The SQLite release, JSON export and static demo are built from the same admitted list. The demo presents 25 sources while browsing and five per page for a query. Held records have a disposition in this directory. Public release snapshots preserve the previous versions for rollback.

Code Review Brains was consulted during planning and after implementation. It returned public-source review guidance, which informed the regression checks. It did not independently approve the diff. [Review guidance](https://www.aihero.dev/skills-code-review)

## Next catalogue expansion

The requested thousands-of-sources target is still open. Economics, computing and policy need more coverage from original institutional feeds. Expand those feeds before increasing volume in already larger fields. Unknown licences, failed checks and private data stay outside normal results.

The source records, evidence digests and decisions are in resources.json, evidence.json and dispositions.json. The resource file hash is bound in report.json.
