#!/usr/bin/env node
import { versions } from 'node:process';

async function launch() {
  const alternative = versions.bun ? 'Bun' : versions.deno ? 'Deno' : null;
  if (!alternative) {
    const [major, minor] = versions.node.split('.').map(Number);
    if (major !== 24 || minor === undefined || minor < 14) {
      throw new Error('Everything Skill requires Node.js 24.14 or newer in the 24 LTS series.');
    }
  }
  try {
    const sqlite = await import('node:sqlite');
    if (typeof sqlite.DatabaseSync !== 'function' || (!alternative && typeof sqlite.backup !== 'function')) {
      throw new Error('Missing SQLite API');
    }
  } catch {
    throw new Error(`${alternative ?? 'This Node build'} lacks required node:sqlite support. Use Node.js 24 LTS.`);
  }
  await import('./cli.js');
}

void launch().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Everything Skill failed to launch.');
  process.exitCode = 1;
});
