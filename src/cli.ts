import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { starterResources } from '../database/seeds/starter.js';
import { exportCatalog, kinds, search, seedCatalog } from './catalog.js';
import { copyPrivateIndex, initialize, openIndex } from './database.js';
import { retrievalModes, type RetrievalMode } from './retrieval.js';
import { adapterKinds, generateAdapter, type AdapterKind } from './adapters.js';
import { rerankLocal } from './transformer.js';
import { collectDiscovery, discover, listDiscoveries, providers, saveDiscovery, type Provider } from './discovery.js';

import { assessResource, blocked, cachedEligible, listSuggestions, preferenceFor, readReports, recordAssessment, scopes, setPreference, suggest, verifyCandidate, type Scope } from './governance.js';

const help = `Everything Skill · Phase 1
npm run skill -- init [--empty]
npm run skill -- search "your terms" [--kind repository] [--category software] [--limit 5] [--mode routed] [--json]
npm run skill -- export [--json]
npm run skill -- backup <new-file>
npm run skill -- restore <backup-file>
npm run skill -- discover "<public query>" [--provider github|mcp|web]
npm run skill -- remember <resource-url> [--terms "local section keywords"]
npm run skill -- private-list
npm run skill -- scan <github-repository>
npm run skill -- reports
npm run skill -- generate-adapter <url-to-markdown|openapi|browser-workflow|recorded-session>
npm run skill -- suggest <resource-url>
npm run skill -- suggestions
npm run skill -- preference <resource-url> --decision allow|deny --scope global|topic|project|session

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

function optionalPrivate(path: string, writable = false) {
  try {
    return openIndex(path, 'private', writable);
  } catch (error) {
    if (!writable && (error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
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
      provider: { type: 'string' },
      verify: { type: 'boolean' },
      decision: { type: 'string' },
      scope: { type: 'string' },
      context: { type: 'string' },
      acknowledge: { type: 'boolean' },
      topic: { type: 'string' },
      project: { type: 'string' },
      session: { type: 'string' },
      terms: { type: 'string' },
      help: { type: 'boolean' },
    },
  });
  const [command, ...args] = positionals;
  if (values.help || command === undefined) {
    console.log(help);
    return;
  }
  const accepted = {
    init: ['empty'], search: ['kind', 'category', 'limit', 'json', 'mode', 'thresholds', 'local-models', 'verify', 'topic', 'project', 'session'], export: ['json'],
    backup: [], restore: [], discover: ['provider'], remember: ['terms'], 'private-list': [], 'generate-adapter': [], scan: [], reports: [], suggest: [], suggestions: [],
    preference: ['decision', 'scope', 'context', 'acknowledge'],
  };
  if (!Object.hasOwn(accepted, command)) throw new Error('Unknown command. Run with --help.');
  const allowed: readonly string[] = accepted[command as keyof typeof accepted];
  for (const key of Object.keys(values)) {
    if (key !== 'data-dir' && !allowed.includes(key)) throw new Error(`--${key} is invalid for ${command}.`);
  }
  const expected = ['search', 'backup', 'restore', 'discover', 'remember', 'scan', 'suggest', 'preference', 'generate-adapter'].includes(command) ? 1 : 0;
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

  if (command === 'generate-adapter') {
    const kind = args[0];
    if (!adapterKinds.some((candidate) => candidate === kind)) throw new Error('Unknown adapter template.');
    const report = generateAdapter(directory, kind as AdapterKind);
    showJson(report);
    if (report.status === 'failed-synthetic') process.exitCode = 1;
    return;
  }
  if (command === 'discover') {
    const provider = values.provider ?? 'github';
    if (!providers.some((known) => known === provider)) throw new Error('Unknown discovery provider.');
    const leads = await discover(args[0]!, provider as Provider);
    const db = optionalPrivate(privatePath);
    try { showJson(db ? leads.filter((lead) => !blocked(db, lead.url, lead.sourceId)) : leads); }
    finally { db?.close(); }
    return;
  }
  if (command === 'remember' || command === 'private-list') {
    const db = openIndex(privatePath, 'private', command === 'remember');
    try {
      if (command === 'remember') {
        const entry = await collectDiscovery(args[0]!, values.terms);
        if (entry.assessment) recordAssessment(db, entry.assessment);
        if (blocked(db, entry.url, entry.sourceId)) throw new Error('A security block prevents storing this discovery.');
        saveDiscovery(db, entry);
        showJson({ url: entry.url, stage: entry.stage });
      } else showJson(listDiscoveries(db).filter((entry) => !blocked(db, entry.url, entry.sourceId)));
    } finally {
      db.close();
    }
    return;
  }

  if (['scan', 'reports', 'suggest', 'suggestions', 'preference'].includes(command)) {
    const writable = ['scan', 'suggest', 'preference'].includes(command);
    const db = openIndex(privatePath, 'private', writable);
    try {
      if (command === 'scan') {
        const report = await assessResource(args[0]!);
        recordAssessment(db, report);
        showJson({ level: report.level, flags: report.flags });
      } else if (command === 'reports') showJson(readReports(db));
      else if (command === 'suggest') showJson(suggest(db, args[0]!));
      else if (command === 'suggestions') showJson(listSuggestions(db));
      else {
        if (!scopes.some((scope) => scope === values.scope) ||
            (values.decision !== 'allow' && values.decision !== 'deny')) {
          throw new Error('Provide an explicit --scope and --decision.');
        }
        setPreference(db, args[0]!, { scope: values.scope as Scope, context: values.context ?? '',
          decision: values.decision, acknowledged: values.acknowledge === true });
        console.log('Local preference saved.');
      }
    } finally { db.close(); }
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
      const privateDb = optionalPrivate(privatePath, values.verify === true);
      let privateExclusions = 0;
      try {
        if (privateDb) {
          const contexts = { ...(values.topic ? { topic: values.topic } : {}),
            ...(values.project ? { project: values.project } : {}),
            ...(values.session ? { session: values.session } : {}) };
          const visible = [];
          for (const card of output.results) {
            if (blocked(privateDb, card.url, card.sourceId) || preferenceFor(privateDb, card.url, contexts) === 'deny' ||
                (values.verify ? !(await verifyCandidate(privateDb, card)) : !cachedEligible(privateDb, card))) {
              privateExclusions++;
            } else visible.push(card);
          }
          output.results = visible;
        }
      } finally { privateDb?.close(); }
      if (values['local-models']) output.results = await rerankLocal(args[0]!, output.results, values['local-models']);
      if (values.json) showJson(privateExclusions ? { ...output, privateExclusions } : output);
      else {
        console.log('| Resource | Score | Label | Evidence and summary |');
        console.log('| --- | ---: | --- | --- |');
        for (const result of output.results) {
          console.log(`| [${markdownText(result.title)}](<${result.url}>) | ${result.score} | ${result.label} | ${markdownText(result.summary)} [${result.licence}](<${result.licenceUrl}>) · [Evidence](<${result.evidenceUrl}>) · checked ${result.checkedOn} |`);
        }
        if (output.results.length) console.log('\nConditional entries have metadata review only.');
        else console.log('\nNo eligible matches in the local index.');
        console.log('Excluded matches:', JSON.stringify(output.excluded));
        if (privateExclusions) console.log(`Private policy or online verification excluded ${privateExclusions} additional matches.`);
      }
    } else {
      let output = exportCatalog(db);
      const privateDb = optionalPrivate(privatePath);
      try {
        if (privateDb) output = output.filter((card) =>
          cachedEligible(privateDb, card) && preferenceFor(privateDb, card.url, {}) !== 'deny');
      } finally { privateDb?.close(); }
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
