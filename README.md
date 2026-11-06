# Everything Skill

Find relevant public resources and inspect the evidence behind each recommendation. The Phase 1 preview searches a small local starter catalogue.

## Try it

1. Install [Node.js 24 LTS](https://nodejs.org/en/download), version 24.14 or later in the 24 series. It includes npm.
2. On the [GitHub repository](https://github.com/purysho/Everything-Skill), choose **Code → Download ZIP** once the files are available. Unzip it and open a terminal in the extracted folder.
3. Run these commands.

```sh
npm ci
npm run build
npm run skill -- init
npm run skill -- search "retrieval catalogue"
```

The starter index contains four pinned repository records. Two are searchable as **Conditional** because they have metadata and licence evidence. An `mcp` search counts the two link-only records with unresolved licences. The output includes provenance and verification dates. Treat the recommendations as leads for further review.

## Commands

| To | Run |
| --- | --- |
| See all options | `npm run skill -- --help` |
| Initialise empty stores | `npm run skill -- init --empty --data-dir "my-local-index"` |
| Filter results | `npm run skill -- search "retrieval" --kind repository --category software` |
| Read machine-friendly results | `npm run skill -- search "retrieval" --json` |
| Export the eligible catalogue | `npm run skill -- export --json` or `npm run skill -- export` for Markdown |
| Back up private data to a new file | `npm run skill -- backup "/path/to/new-backup.sqlite"` |
| Restore into an existing empty folder | `npm run skill -- restore "/path/to/backup.sqlite" --data-dir "/path/to/empty-folder"` |
| Run checks | `npm run lint` and `npm test` |

Use paths appropriate to your OS. Search and export read only `public.sqlite`. Both indexes live in `~/.everything-skill` by default. Keep the directory and private backups on a user-owned local filesystem supporting hard links. Restore preserves existing files and requires a destination without `private.sqlite`. Initialise the destination afterwards to create a separate public store if desired. An existing public store keeps its original seed selection on repeat initialisation.

## Scope

The CLI works offline after dependencies are installed. Search uses FTS5 and metadata filters. It reports excluded matches without projecting their titles, links or payloads. The preview does metadata review. Security scanning, live discovery, hybrid ranking, demo deployment, and user-selected public index updates are later phases.

[Host instructions](SKILL.md) · [Security](SECURITY.md) · [Build plan](BUILD_PLAN.md) · [Work log](WORK_LOG.md)

## Licence

Source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE). Commercial use requires a separate licence. Keep the [required notice](NOTICE) with distributions.
