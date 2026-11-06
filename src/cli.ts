import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { starterResources } from '../database/seeds/starter.js';
import { exportCatalog, kinds, search, seedCatalog } from './catalog.js';
import { copyPrivateIndex, initialize, openIndex } from './database.js';
import { retrievalModes, type RetrievalMode } from './retrieval.js';
import { rerankLocal } from './transformer.js';

const help = `Everything Skill · Phase 1
npm run skill -- init [--empty]
npm run skill -- search "your terms" [--kind repository] [--category software] [--limit 5] [--mode routed] [--json]
npm run skill -- export [--json]
npm run skill -- backup <new-file>
npm run skill -- restore <backup-file>

All commands accept --data-dir <directory>. Default: ~/.everything-skill.
Restore requires an absent private.sqlite. Use a new directory to inspect a backup.
Search and export read the local public index only.`;

function markdownText(value: string) {
  return value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ')
    .replace(/[\\`*_{}\[\]<>()#+.!|]/g, '\\$&');
}

function showJson(data: unknown) {
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'data-dir': { type: 'string' },
      empty: { type: 'boolean' },
      kind: { type: 'string' },
      category: { type: 'string' },
      limit: { type: 'string' },
      json: { type: 'boolean' },
      mode: { type: 'string' },
      thresholds: { type: 'string' },
      'local-models': { type: 'string' },
      help: { type: 'boolean' },
    },
  });
  const [command, ...args] = positionals;
  if (values.help || command === undefined) {
    console.log(help);
    return;
  }
  const accepted = {
    init: ['empty'], search: ['kind', 'category', 'limit', 'json', 'mode', 'thresholds', 'local-models'], export: ['json'],
    backup: [], restore: [],
  };
  if (!Object.hasOwn(accepted, command)) throw new Error('Unknown command. Run with --help.');
  const allowed: readonly string[] = accepted[command as keyof typeof accepted];
  for (const key of Object.keys(values)) {
    if (key !== 'data-dir' && !allowed.includes(key)) throw new Error(`--${key} is invalid for ${command}.`);
  }
  const expected = ['search', 'backup', 'restore'].includes(command) ? 1 : 0;
  if (args.length !== expected || args.some((arg) => !arg.trim())) {
    throw new Error('Invalid arguments. Run with --help and quote search queries.');
  }
  const directory = resolve(values['data-dir'] ?? join(homedir(), '.everything-skill'));
  const publicPath = join(directory, 'public.sqlite');
  const privatePath = join(directory, 'private.sqlite');
  if (command === 'init') {
    await initialize(directory, (db) => seedCatalog(db, values.empty ? [] : starterResources));
    console.log('Local indexes ready.');
    return;
  }
  if (command === 'backup' || command === 'restore') {
    const path = resolve(args[0]!);
    if (command === 'backup') await copyPrivateIndex(privatePath, path);
    else await copyPrivateIndex(path, privatePath);
    console.log(command === 'backup' ? 'Private backup created.' : 'Private index restored.');
    return;
  }

  const db = openIndex(publicPath, 'public');
  try {
    if (command === 'search') {
      const { kind, category, limit } = values;
      if (kind && !kinds.some((known) => known === kind)) throw new Error('Unknown resource kind.');
      if (limit !== undefined && !/^\d+$/.test(limit)) throw new Error('Limit must be an integer.');
      const mode = values.mode ?? 'routed';
      if (!retrievalModes.some((candidate) => candidate === mode)) throw new Error('Unknown retrieval mode.');
      const thresholds = values.thresholds?.split(',').map(Number);
      const output = search(db, args[0]!, {
        kind: kind ?? null, category: category ?? null, limit: Number(limit ?? 5),
        mode: mode as RetrievalMode, ...(thresholds ? { thresholds } : {}),
      });
      if (values['local-models']) output.results = await rerankLocal(args[0]!, output.results, values['local-models']);
      if (values.json) showJson(output);
      else {
        console.log('| Resource | Score | Label | Evidence and summary |');
        console.log('| --- | ---: | --- | --- |');
        for (const result of output.results) {
          console.log(`| [${markdownText(result.title)}](<${result.url}>) | ${result.score} | ${result.label} | ${markdownText(result.summary)} [${result.licence}](<${result.licenceUrl}>) · [Evidence](<${result.evidenceUrl}>) · checked ${result.checkedOn} |`);
        }
        if (output.results.length) console.log('\nConditional entries have metadata review only.');
        else console.log('\nNo eligible matches in the local index.');
        console.log('Excluded matches:', JSON.stringify(output.excluded));
      }
    } else {
      const output = exportCatalog(db);
      if (values.json) showJson(output);
      else {
        console.log('# Everything Skill · starter index\n\nEntries have metadata review only.\n');
        for (const entry of output) {
          console.log(`- [${markdownText(entry.title)}](<${entry.url}>) · ${markdownText(entry.summary)} [${entry.licence}](<${entry.licenceUrl}>) · [Evidence](<${entry.evidenceUrl}>) · checked ${entry.checkedOn}`);
        }
      }
    }
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  const missing = (error as NodeJS.ErrnoException).code === 'ENOENT';
  console.error(missing ? 'A local index, backup file, or destination directory is missing. Run with --help.' :
    error instanceof Error ? error.message : 'Everything Skill failed.');
  process.exitCode = 1;
});
