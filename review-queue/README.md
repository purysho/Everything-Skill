# Review queue

Public suggestions and update-review records belong here. Only the user and repository maintainers approve additions.

## Private pilot collection

Run `npm run build` and then `node dist/review-queue/collect-pilot.js <private-output-directory>` with a new directory outside the checkout. The collector performs bounded, credential-free requests using a curated set of public topics. It writes candidate metadata, per-request checks and a SHA-256 checksum. Append exact field names to retry just their dataset feeds in a separate directory. The output is a private candidate batch and requires maintainer approval before any catalogue release. Keep it separate from demo or release assets.

## Stage a maintainer preview

Run `npm run build` and then `node dist/review-queue/stage-batch.js <release-batch.json> <new-preview-directory> <manifest-sha256>`. The directory must be outside the checkout. Use the pending review manifest with the current bundled base version. The command retains the current entries, adds the reviewed entries and builds a preview snapshot and static demo from the same SQLite rows. Review the separate intake dispositions before approving the exact manifest. The preview command has no release or deployment action.

## Reproduce the completed intake

Build the project and run `node dist/review-queue/fetch-intake.js <pilot-batch.json> <cache-directory>` using the frozen intake from the Pilot 001 handoff. This command resumes an existing private cache. Then run `node dist/review-queue/review-intake.js <pilot-batch.json> <cache-directory>/records database/catalogue/approved-batch-001.json <new-review-directory>`. The retained `database/catalogue/intake-dispositions.json` preserves the previous individual review holds. Keep source caches outside the checkout. Compare changed evidence before building another public release.
