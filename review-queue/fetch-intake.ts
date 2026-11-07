import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { object } from '../src/http.js';
import { readPublicSource } from '../src/sources.js';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Provide the frozen intake and a cache directory outside the checkout.');
const raw = readFileSync(input);
if (createHash('sha256').update(raw).digest('hex') !== '6aedab82896f4afc398970609d5c510975cce15f5b5ad56320096e8081ed8108') {
  throw new Error('Intake checksum mismatch.');
}
const rows = object(JSON.parse(raw.toString('utf8'))).candidates;
if (!Array.isArray(rows)) throw new Error('Invalid intake.');
const repo = realpathSync(resolve(import.meta.dirname, '..', '..'));
const target = resolve(output);
const folder = existsSync(target) ? realpathSync(target) : join(realpathSync(dirname(target)), basename(target));
if (folder === repo || folder.startsWith(repo + sep)) throw new Error('Keep source caches outside the checkout.');
if (!existsSync(folder)) mkdirSync(folder, { mode: 0o700 });
if (!existsSync(join(folder, 'records'))) mkdirSync(join(folder, 'records'), { mode: 0o700 });
let unavailable = 0;
const read = async (url: URL) => {
  await new Promise(resolve => setTimeout(resolve, 1100));
  return readPublicSource(url);
};
for (const provider of ['zenodo', 'medicine'] as const) {
  const ids = rows.map(object).flatMap(row => {
    const url = String(provider === 'zenodo' ? row.url : row.evidenceUrl);
    const pattern = provider === 'zenodo' ? /^https:\/\/zenodo.org\/records\/(\d+)$/ : /^https:\/\/pubmed.ncbi.nlm.nih.gov\/(\d+)\/$/;
    const id = pattern.exec(url)?.[1];
    return id && !existsSync(join(folder, 'records', `${provider}-${id}.json`)) ? [id] : [];
  });
  for (let start = 0; start < ids.length; start += 20) {
    const group = ids.slice(start, start + 20);
    const url = new URL(provider === 'zenodo' ? 'https://zenodo.org/api/records' : 'https://www.ebi.ac.uk/europepmc/webservices/rest/search');
    const params = provider === 'zenodo' ? { q: `id:(${group.join(' OR ')})`, size: '25', all_versions: 'true' } :
      { query: `SRC:MED AND EXT_ID:(${group.join(' OR ')})`, format: 'json', resultType: 'core', pageSize: '25' };
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value!);
    try {
      const data = object(await read(url));
      const hits = provider === 'zenodo' ? object(data.hits).hits : object(data.resultList).result;
      if (!Array.isArray(hits)) throw new Error('Invalid record list.');
      for (const record of hits.map(object)) {
        if (group.includes(String(record.id))) writeFileSync(join(folder, 'records', `${provider}-${record.id}.json`), JSON.stringify(record) + '\n', { flag: 'wx', mode: 0o600 });
      }
    } catch { unavailable += group.length; }
  }
}
for (const row of rows.map(object)) {
  const pmc = /^https:\/\/europepmc.org\/articles\/(PMC\d+)$/.exec(String(row.openCopy))?.[1];
  const met = /^met:(\d+)$/.exec(String(row.id))?.[1];
  const file = pmc ? `${pmc}.xml` : met ? `met-${met}.json` : null;
  if (!file || existsSync(join(folder, 'records', file))) continue;
  const url = new URL(pmc ? `https://www.ebi.ac.uk/europepmc/webservices/rest/${pmc}/fullTextXML` :
    `https://collectionapi.metmuseum.org/public/collection/v1/objects/${met}`);
  try {
    const data = await read(url);
    if (typeof data === 'string' && data.length > 256_000) throw new Error('Article too large.');
    writeFileSync(join(folder, 'records', file), typeof data === 'string' ? data : JSON.stringify(data) + '\n', { flag: 'wx', mode: 0o600 });
  } catch { unavailable++; }
}
console.log(`Cache pass completed. ${unavailable} records need another availability check.`);
