import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { object } from './http.js';

const profiles = {
  'url-to-markdown': {
    description: 'Read a synthetic URL-to-Markdown preview.',
    key: 'url', sample: 'https://example.invalid/fixture',
    result: '# Synthetic page\n\nThis fixture never fetches the URL.',
  },
  openapi: {
    description: 'Inspect a synthetic read-only OpenAPI operation.',
    key: 'operation', sample: 'GET /examples',
    result: { method: 'GET', path: '/examples', response: [{ id: 'synthetic' }] },
  },
  'browser-workflow': {
    description: 'Inspect a synthetic browser workflow without opening a browser.',
    key: 'workflow', sample: 'preview-homepage',
    result: { steps: ['navigate to synthetic homepage', 'read page title'], execution: 'preview only' },
  },
  'recorded-session': {
    description: 'Replay synthetic read-only events without an account.',
    key: 'session', sample: 'synthetic-session',
    result: { events: [{ kind: 'read', resource: 'synthetic' }], execution: 'preview only' },
  },
} as const;

export type AdapterKind = keyof typeof profiles;
export const adapterKinds = Object.keys(profiles) as AdapterKind[];

const protocolVersion = '2025-11-25';
const runtime = String.raw`
import { StringDecoder } from 'node:string_decoder';

const tool = {
  name: 'preview',
  description: profile.description,
  inputSchema: { type: 'object', properties: { [profile.key]: { type: 'string', const: profile.sample } },
    required: [profile.key], additionalProperties: false },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
};
let initialised = false;
function handle(message) {
  const id = message?.id ?? null;
  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return { id, error: { code: -32600, message: 'Invalid request' } };
  }
  if (!Object.hasOwn(message, 'id')) return null;
  if (typeof id !== 'string' && !(typeof id === 'number' && Number.isSafeInteger(id))) {
    return { id: null, error: { code: -32600, message: 'Invalid request ID' } };
  }
  if (message.method === 'initialize') {
    initialised = true;
    return { id, result: { protocolVersion, capabilities: { tools: {} },
      serverInfo: { name: 'everything-skill-private-preview', version: '0.1.0' } } };
  }
  if (message.method === 'ping') return { id, result: {} };
  if (!initialised) return { id, error: { code: -32002, message: 'Initialise first' } };
  if (message.method === 'tools/list') return { id, result: { tools: [tool] } };
  if (message.method === 'tools/call') {
    const args = message.params?.arguments;
    if (message.params?.name !== tool.name || !args || Array.isArray(args) ||
        typeof args !== 'object' || Object.keys(args).length !== 1 || args[profile.key] !== profile.sample) {
      return { id, error: { code: -32602, message: 'Only the synthetic read-only fixture is supported' } };
    }
    const text = typeof profile.result === 'string' ? profile.result : JSON.stringify(profile.result);
    return { id, result: { content: [{ type: 'text', text }] } };
  }
  return { id, error: { code: -32601, message: 'Method not found' } };
}

const decoder = new StringDecoder('utf8');
let pending = '';
for await (const chunk of process.stdin) {
  pending += decoder.write(chunk);
  let newline;
  while ((newline = pending.indexOf('\n')) !== -1) {
    if (newline > 65_536) process.exit(1);
    const line = pending.slice(0, newline);
    pending = pending.slice(newline + 1);
    if (!line.trim()) continue;
    let message;
    try { message = JSON.parse(line); }
    catch {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null,
        error: { code: -32700, message: 'Invalid JSON' } }) + '\n');
      continue;
    }
    const reply = handle(message);
    if (reply) process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...reply }) + '\n');
  }
  if (pending.length > 65_536) process.exit(1);
}
`;

function contractTest(file: string, kind: AdapterKind) {
  const profile = profiles[kind];
  const requests = [
    { id: 1, method: 'initialize', params: { protocolVersion, capabilities: {}, clientInfo: { name: 'test', version: '1' } } },
    { method: 'notifications/initialized' },
    { id: 2, method: 'tools/list' },
    { id: 3, method: 'tools/call', params: { name: 'preview', arguments: { [profile.key]: profile.sample } } },
    { id: 4, method: 'tools/call', params: { name: 'preview', arguments: { [profile.key]: profile.sample, token: 'synthetic' } } },
    { id: 5, method: 'tools/call', params: { name: 'preview', arguments: { [profile.key]: 'POST /external' } } },
  ];
  const input = requests.map((request) => JSON.stringify({ jsonrpc: '2.0', ...request })).join('\n') + '\n';
  const systemRoot = process.env.SystemRoot;
  const processResult = spawnSync(process.execPath, ['--permission', `--allow-fs-read=${file}`, file], {
    encoding: 'utf8', input, timeout: 5000, maxBuffer: 100_000, windowsHide: true,
    env: systemRoot ? { SystemRoot: systemRoot } : {},
  });
  if (processResult.error || processResult.status !== 0) return false;
  try {
    const replies = new Map(processResult.stdout.trim().split('\n').map((line) => {
      const reply = object(JSON.parse(line));
      return [reply.id, reply];
    }));
    const expected = typeof profile.result === 'string' ? profile.result : JSON.stringify(profile.result);
    const tools = object(replies.get(2)?.result).tools;
    const content = object(replies.get(3)?.result).content;
    return replies.size === 5 && object(replies.get(1)?.result).protocolVersion === protocolVersion &&
      Array.isArray(tools) && tools.length === 1 && object(tools[0]).name === 'preview' &&
      Array.isArray(content) && object(content[0]).text === expected &&
      object(replies.get(4)?.error).code === -32602 && object(replies.get(5)?.error).code === -32602;
  } catch {
    return false;
  }
}

export function generateAdapter(directory: string, kind: AdapterKind) {
  if (!Object.hasOwn(profiles, kind)) throw new Error('Unknown adapter template.');
  const root = resolve(directory, 'adapters');
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const folder = mkdtempSync(join(root, `${kind}-`));
  const file = join(folder, 'server.mjs');
  const source = `const protocolVersion = ${JSON.stringify(protocolVersion)};\nconst profile = ${JSON.stringify(profiles[kind])};\n${runtime}`;
  writeFileSync(file, source, { flag: 'wx', mode: 0o600 });
  const status = contractTest(file, kind) ? 'passed-synthetic' : 'failed-synthetic';
  const report = { kind, status, path: file, visibility: 'private-experimental',
    operations: 'fixture preview only', credentials: 'unsupported' };
  writeFileSync(join(folder, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return report;
}
