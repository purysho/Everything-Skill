# Everything Skill

Find public resources and see the evidence behind each recommendation. Start with a local catalogue of curated research, coding, healthcare and MCP resources. Use live discovery separately when you need a wider search.

## Try it

1. Install [Node.js 24 LTS](https://nodejs.org/en/download), version 24.14 or later in the 24 series. It includes npm.
2. On [GitHub](https://github.com/purysho/Everything-Skill), choose **Code → Download ZIP**. Unzip it and open a terminal in the extracted folder.
3. Run these commands.

```sh
npm ci --ignore-scripts
npm run build
npm run skill -- init
npm run skill -- search "retrieval catalogue"
```

The default search is offline. Each card includes an evidence link, licence, review date and suitability label. All displayed starter entries are capped at **Conditional** because their review covers metadata. Licence-unclear and blocked records are excluded from normal results. This release does not establish runtime safety for listed projects.

## Use it with an AI host

- **Codex** · Keep the full checkout as `.agents/skills/everything-skill` in a project, or copy it to `~/.agents/skills/everything-skill` for your account. Build and initialise it from that directory. In Codex, invoke `$everything-skill` or ask for a licence-aware resource shortlist.
- **Claude Code** · Use `.claude/skills/everything-skill` in a project or `~/.claude/skills/everything-skill` for your account. Build and initialise from the skill directory, then use `/everything-skill` with your question.
- **ChatGPT** · Where your account offers a Skills upload and local execution, package the full skill directory with `SKILL.md` at its root. In a workspace with shell access, follow the terminal setup above. For a chat without shell access, attach the [JSON](exports/catalogue.json) or [Markdown](exports/CATALOGUE.md) catalogue as a static reference.

Keep `SKILL.md`, the npm project, and the bundled catalogue together. Directory paths are relative to the checkout where you run the commands.

## Search, discover and review

| To | Run |
| --- | --- |
| Search the local catalogue | `npm run skill -- search "fhir" --limit 5` |
| Get JSON or choose a retrieval mode | `npm run skill -- search "retrieval" --mode routed --json` |
| Explicitly send a public query to a provider | `npm run skill -- discover "fhir parser rust" --provider github` |
| Find MCP leads or encyclopaedic web references | Use `--provider mcp` or `--provider web` with `discover`. The web provider is MediaWiki. |
| Find papers, public models, datasets or OpenAPI repositories | Use `--provider papers\|models\|datasets\|api` with `discover`. These results are unverified links. |
| Save metadata and stage relevant documentation | `npm run skill -- remember "https://github.com/expressjs/express" --terms "installation features"` |
| Read private discoveries | `npm run skill -- private-list` |
| Recheck a shortlist and append private reports | `npm run skill -- search "retrieval" --verify` |
| Inspect one public source | `npm run skill -- scan "https://github.com/expressjs/express"`, then `npm run skill -- reports` |
| Suggest a source locally | `npm run skill -- suggest "https://github.com/owner/repo"`, then `npm run skill -- suggestions` |
| Add a scoped deny rule | `npm run skill -- preference "https://github.com/owner/repo" --decision deny --scope project --context example`. Use `--project example` on search. |
| Generate a private synthetic MCP preview | `npm run skill -- generate-adapter openapi`. Other templates are `url-to-markdown`, `browser-workflow` and `recorded-session`. |

Scoped allow rules need `--acknowledge`. They can reverse a broader deny, while hard security blocks and licence restrictions still apply. Suggestions enter a private queue. Public inclusion requires a reviewed change to the source catalogue by a maintainer.

## Update, back up and roll back

Your data defaults to `~/.everything-skill`. Set `--data-dir` to use another user-owned local directory with hard-link support. Public snapshots and the private database are stored separately.

| To | Run |
| --- | --- |
| See the selected catalogue | `npm run skill -- catalogue-status` |
| Choose the immutable snapshot bundled with this checkout | `npm run skill -- update` |
| Switch back to your previous selection | `npm run skill -- rollback` |
| Save a private backup to a new path | `npm run skill -- backup "/path/to/new-backup.sqlite"` |
| Restore private data into an existing empty folder | `npm run skill -- restore "/path/to/backup.sqlite" --data-dir "/path/to/empty-folder"` |
| Export the eligible catalogue | `npm run skill -- export` or `npm run skill -- export --json` |

An update or rollback verifies the target, backs up private data and then switches the public selection. Keep your backups private. If a process stops mid-update, check that no update is running before removing a leftover `.catalogue-lock` folder and retrying.

## Demo and model options

The [static demo](demo/README.md) filters the public snapshot in your browser. Its weekly workflow checks evidence and flags changes for maintainer review. To host the demo, choose **Settings → Pages → GitHub Actions**, then run **Publish static demo** from the repository's Actions tab.

The default retrieval uses local lexical and hashed-vector search. For optional local reranking, install the reviewed Transformers.js dependency separately with `npm install --no-save --package-lock=false @huggingface/transformers@4.3.2`. Provision the [upstream cross-encoder](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L-6-v2) at a trusted pinned revision under `<models>/cross-encoder/ms-marco-MiniLM-L-6-v2`, including the tokenizer, config and `onnx/model.onnx`. The evaluated model revision is `233902d25c440f23af6f7d6e94d2946bac0bee0a`. Then run `npm run skill -- search "your query" --local-models "<models>"`. The CLI disables remote model fetching for this command. With this option, it ranks up to 25 policy-eligible candidates locally and returns three by default. Use `--limit` to change the output count. The displayed score remains the retrieval score, while the cross-encoder sets the order. See the [held-out results](evaluation/README.md) for the quality, token and latency trade-offs.

[Security](SECURITY.md) · [Build plan](BUILD_PLAN.md) · [Work log](WORK_LOG.md)

Source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE). Commercial use requires a separate licence. Keep the [required notice](NOTICE) with distributions.

## Runtime checks

Node.js 24 LTS is the full runtime for writes, updates, backup, restore, live discovery, scans and adapter tests. The GitHub Actions matrix checks Ubuntu, macOS and Windows.

On Linux, Bun 1.4.4 and Deno 2.9.6 can run offline search, export and catalogue status against a directory already initialised by Node. Use `bun dist/src/entry.js` or `deno run --no-prompt --allow-read="<checkout>,<data-directory>" dist/src/entry.js`, followed by the command and an explicit `--data-dir`. Use Node for online verification, transformer reranking and mutations. Bun and Deno were checked on Linux only.
