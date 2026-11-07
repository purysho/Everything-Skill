import { createHash } from 'node:crypto';
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { HttpError, object, readJson } from '../src/http.js';
import { inspectSurface } from '../src/governance.js';

type Access = 'open' | 'restricted-or-unknown';
interface Candidate {
  id: string;
  title: string;
  field: string;
  niche: string;
  kind: 'dataset' | 'artwork' | 'paper' | 'review';
  role: 'primary-candidate' | 'secondary';
  language: string | null;
  url: string;
  openCopy: string | null;
  evidenceUrl: string;
  access: Access;
  licence: string | null;
  basis: string;
}
interface Check {
  provider: string;
  field: string;
  niche: string;
  endpoint: string;
  fetched: number;
  eligible: number;
  error?: string;
}

const output = process.argv[2];
if (!output) throw new Error('Provide a private output directory outside the checkout.');
const target = resolve(output);
const repo = realpathSync(resolve(import.meta.dirname, '..', '..'));
function requireOutsideCheckout(path: string) {
  if (path === repo || path.startsWith(repo + sep)) throw new Error('Keep draft records outside the checkout.');
}
requireOutsideCheckout(target);
requireOutsideCheckout(realpathSync(dirname(target)));
const folder = target;
mkdirSync(folder, { mode: 0o700 });
const checkedAt = new Date().toISOString();

const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const label = (value: unknown) => typeof value === 'string'
  ? value.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, ' ').trim().slice(0, 500) : '';
const language = (value: unknown) => typeof value === 'string' && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value)
  ? value.toLowerCase() : null;
const idNumber = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
  ? String(value) : null;
const licence = (value: unknown) => {
  const name = label(value).toLowerCase().replaceAll(' ', '-');
  return new Map([
    ['cc0-1.0', 'CC0-1.0'], ['cc-by-4.0', 'CC-BY-4.0'], ['cc-by-sa-4.0', 'CC-BY-SA-4.0'],
    ['cc-by-3.0', 'CC-BY-3.0'], ['mit', 'MIT'], ['apache-2.0', 'Apache-2.0'],
    ['odc-by-1.0', 'ODC-BY-1.0'], ['pddl-1.0', 'PDDL-1.0'],
  ]).get(name) ?? null;
};
const doi = (value: unknown) => typeof value === 'string' && /^10\.\d{4,9}\/[\w.();/:+-]{1,160}$/i.test(value)
  ? value.toLowerCase() : null;
function endpoint(base: string, params: Record<string, string | number>) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  return url;
}
const records: Candidate[] = [];
const checks: Check[] = [];
let metadataExcluded = 0;

async function collect(provider: string, field: string, niche: string, url: URL,
    normalize: (payload: unknown) => { fetched: number; rows: Candidate[] }) {
  try {
    const { fetched, rows } = normalize(await readJson(url));
    const eligible = rows.filter((row) => !inspectSurface(row.title).flags.length);
    metadataExcluded += rows.length - eligible.length;
    records.push(...eligible);
    checks.push({ provider, field, niche, endpoint: url.href, fetched, eligible: eligible.length });
  } catch (error) {
    checks.push({ provider, field, niche, endpoint: url.href, fetched: 0, eligible: 0,
      error: error instanceof HttpError ? `HTTP ${error.status}` : 'Response unavailable or invalid' });
  }
}

const datasetTopics = [
  ['Languages and linguistics', 'corpus linguistics', 'language documentation', 'speech corpus', 'machine translation'],
  ['Arts and design', 'digital art', 'music performance', 'architecture design'],
  ['Humanities', 'archaeology', 'oral history', 'literary analysis', 'digital humanities'],
  ['Social sciences', 'sociology survey', 'migration survey', 'political science'],
  ['Education and psychology', 'education assessment', 'learning analytics', 'experimental psychology'],
  ['Mathematics and statistics', 'mathematical optimization', 'statistical simulation', 'graph theory'],
  ['Physical sciences', 'materials science', 'particle physics', 'astronomy'],
  ['Earth and environment', 'climate observations', 'oceanography', 'remote sensing'],
  ['Life sciences', 'biodiversity', 'genomics', 'plant phenotyping'],
  ['Medicine and health', 'public health', 'clinical trial'],
  ['Computing and information', 'software engineering', 'cybersecurity', 'human computer interaction'],
  ['Engineering and technology', 'robotics', 'renewable energy', 'civil engineering'],
  ['Agriculture and food', 'crop yield', 'food science', 'soil agriculture'],
  ['Law and public policy', 'public policy', 'legislation', 'criminal justice'],
  ['Economics and business', 'economic history', 'labour economics', 'financial markets'],
] as const;
const fields = process.argv.slice(3);
if (fields.some((field) => !datasetTopics.some(([name]) => field === name))) {
  throw new Error('A retry must use exact dataset field names.');
}
const jobs: (() => Promise<void>)[] = [];
for (const [field, ...topics] of datasetTopics) {
  if (fields.length && !fields.includes(field)) continue;
  for (const niche of topics) for (const page of [1, 2]) {
    const url = endpoint('https://zenodo.org/api/records', { q: `resource_type.type:dataset AND "${niche}"`, size: 25, page });
    jobs.push(() => collect('Zenodo', field, niche, url, (payload) => {
      const hits = list(object(object(payload).hits).hits);
      const rows: Candidate[] = [];
      for (const item of hits) {
        const row = object(item);
        const meta = object(row.metadata);
        const id = idNumber(row.id);
        const title = label(meta.title);
        const rights = licence(object(meta.license).id);
        const stableDoi = doi(row.conceptdoi) ?? doi(row.doi) ?? doi(meta.doi);
        const hasFile = list(row.files).some((file) => {
          const link = label(object(object(file).links).self);
          return link.startsWith(`https://zenodo.org/api/records/${id}/files/`) && link.endsWith('/content');
        });
        if (!id || !title || !rights || meta.access_right !== 'open' ||
            object(meta.resource_type).type !== 'dataset' || !hasFile) continue;
        const recordUrl = `https://zenodo.org/records/${id}`;
        rows.push({ id: stableDoi ? `doi:${stableDoi}` : `zenodo:${id}`, title, field, niche,
          kind: 'dataset', role: 'primary-candidate', language: language(meta.language),
          url: recordUrl, openCopy: recordUrl, evidenceUrl: `https://zenodo.org/api/records/${id}`,
          access: 'open', licence: rights, basis: 'Depositor labels this an open dataset with files and an explicit licence. Check origin and file scope in review.' });
      }
      return { fetched: hits.length, rows };
    }));
  }
}

for (const [field, niche, search] of [
  ['Medicine and health', 'dementia music', 'dementia AND music'],
  ['Medicine and health', 'sleep and pain', 'sleep AND pain'],
  ['Medicine and health', 'clinical rehabilitation', 'stroke AND rehabilitation'],
  ['Life sciences', 'human nutrition experiments', 'diet AND microbiome'],
  ['Education and psychology', 'experimental learning', 'learning AND intervention AND students'],
] as const) {
  if (fields.length) break;
  const url = endpoint('https://www.ebi.ac.uk/europepmc/webservices/rest/search', {
    query: `OPEN_ACCESS:Y AND PUB_TYPE:"randomized controlled trial" AND (${search})`,
    format: 'json', resultType: 'core', pageSize: 35,
  });
  jobs.unshift(() => collect('Europe PMC', field, niche, url, (payload) => {
    const hits = list(object(object(payload).resultList).result);
    const rows: Candidate[] = [];
    for (const item of hits) {
      const row = object(item);
      const pmid = label(row.pmid);
      const pmcid = label(row.pmcid);
      const title = label(row.title);
      const types = list(object(row.pubTypeList).pubType).map((value) => label(value).toLowerCase());
      const publicationYear = Number(row.pubYear);
      if (!title || !/^\d+$/.test(pmid) || !/^PMC\d+$/.test(pmcid) || row.isOpenAccess !== 'Y' ||
          !types.includes('randomized controlled trial') ||
          types.some((value) => /review|retract|editorial|protocol/i.test(value)) ||
          /\b(?:study protocol|protocol for|systematic review|meta-analysis)\b/i.test(title) ||
          !Number.isInteger(publicationYear) || publicationYear > 2026) continue;
      const persistentDoi = doi(row.doi);
      const rights = licence(row.license) ?? ({ 'cc by': 'CC-BY (version unconfirmed)', 'cc0': 'CC0 (version unconfirmed)' }[label(row.license).toLowerCase()] ?? null);
      rows.push({ id: persistentDoi ? `doi:${persistentDoi}` : `pmid:${pmid}`, title, field, niche, kind: 'paper',
        role: 'primary-candidate', language: language(row.language), url: persistentDoi ? `https://doi.org/${persistentDoi}` : `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        openCopy: `https://europepmc.org/articles/${pmcid}`, evidenceUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        access: 'open', licence: rights, basis: 'Indexed as a randomized controlled trial with an open article copy. Confirm intervention and outcomes from the article.' });
    }
    return { fetched: hits.length, rows };
  }));
}

const metJobs: (() => Promise<void>)[] = [];
const metIds = new Set<string>();
for (const niche of ['woodblock print', 'Islamic calligraphy', 'textile', 'ceramic vessel', 'musical instrument', 'photograph']) {
  if (fields.length) break;
  const search = endpoint('https://collectionapi.metmuseum.org/public/collection/v1.1/search',
    { isPublicDomain: 'true', hasImages: 'true', q: niche, page: 1, limit: 14 });
  jobs.unshift(() => collect('The Met search', 'Arts and design', niche, search, (payload) => {
    const hits = list(object(payload).objectIDs).slice(0, 14);
    for (const objectId of hits) {
      const id = idNumber(objectId);
      if (!id || metIds.has(id)) continue;
      metIds.add(id);
      const url = new URL(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
      metJobs.push(() => collect('The Met', 'Arts and design', niche, url, (item) => {
        const row = object(item);
        const title = label(row.title);
        const publicUrl = `https://www.metmuseum.org/art/collection/search/${id}`;
        if (!title || row.isPublicDomain !== true || !label(row.primaryImage) || idNumber(row.objectID) !== id) {
          return { fetched: 1, rows: [] };
        }
        return { fetched: 1, rows: [{ id: `met:${id}`, title, field: 'Arts and design', niche, kind: 'artwork',
          role: 'primary-candidate', language: null, url: publicUrl, openCopy: publicUrl,
          evidenceUrl: url.href, access: 'open', licence: 'CC0-1.0',
          basis: 'Museum object record marks the work public domain and lists an open image. The review batch stores the link only.' }] };
      }));
    }
    return { fetched: hits.length, rows: [] };
  }));
}

async function drain(queue: (() => Promise<void>)[], concurrency: number) {
  let next = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < queue.length) await queue[next++]!();
  }));
}
await drain(jobs, fields.length ? 1 : 5);
if (!fields.length) await drain(metJobs, 5);

// Fixed comparison entries were inspected separately when defining the sample query.
if (!fields.length) records.push(
  { id: 'doi:10.1159/000093487', title: 'Investigating the enhancing effect of music on autobiographical memory in mild Alzheimer’s disease',
    field: 'Medicine and health', niche: 'dementia music', kind: 'paper', role: 'primary-candidate', language: 'eng',
    url: 'https://doi.org/10.1159/000093487', openCopy: null, evidenceUrl: 'https://pubmed.ncbi.nlm.nih.gov/16717466/',
    access: 'restricted-or-unknown', licence: null,
    basis: 'Direct sample match: counterbalanced Vivaldi-versus-silence study with ten mild Alzheimer’s participants. Article reuse rights and an open full-text copy are unconfirmed.' },
  { id: 'doi:10.1002/gps.5893', title: 'Immediate effects of individualized music listening on behavioral and psychological symptoms of dementia: A randomized controlled trial',
    field: 'Medicine and health', niche: 'dementia music', kind: 'paper', role: 'primary-candidate', language: 'eng',
    url: 'https://doi.org/10.1002/gps.5893', openCopy: null, evidenceUrl: 'https://pubmed.ncbi.nlm.nih.gov/36840548/',
    access: 'restricted-or-unknown', licence: null,
    basis: 'Related randomized trial. The intervention is individualized music, so this is adjacent evidence for the classical music question. Reuse rights and an open full-text copy are unconfirmed.' },
  { id: 'doi:10.1002/14651858.cd003477.pub5', title: 'Music-based therapeutic interventions for people with dementia',
    field: 'Medicine and health', niche: 'dementia music', kind: 'review', role: 'secondary', language: 'eng',
    url: 'https://www.cochrane.org/evidence/CD003477_does-music-based-therapy-help-people-dementia',
    openCopy: 'https://www.cochrane.org/evidence/CD003477_does-music-based-therapy-help-people-dementia',
    evidenceUrl: 'https://www.cochrane.org/evidence/CD003477_does-music-based-therapy-help-people-dementia',
    access: 'open', licence: null, basis: 'Secondary fallback. The public review summary covers broader music interventions than classical listening.' },
);
const fieldCounts: Record<string, number> = {};
const unique = new Map<string, Candidate>();
for (const record of records.sort((a, b) => a.field.localeCompare(b.field) || a.niche.localeCompare(b.niche) ||
  a.id.localeCompare(b.id) || a.url.localeCompare(b.url))) {
  const previous = unique.get(record.id);
  if (!previous || (previous.access !== 'open' && record.access === 'open')) unique.set(record.id, record);
}
const candidates = [...unique.values()];
for (const row of candidates) fieldCounts[row.field] = (fieldCounts[row.field] ?? 0) + 1;
const batch = { id: 'pilot-001', status: 'pending-maintainer-review', checkedAt,
  counts: { candidates: candidates.length, primaryCandidates: candidates.filter((row) => row.role === 'primary-candidate').length,
    secondary: candidates.filter((row) => row.role === 'secondary').length,
    open: candidates.filter((row) => row.access === 'open').length,
    nonEnglish: candidates.filter((row) => row.language && !/^en(g|-|$)/.test(row.language)).length,
    languageUnknown: candidates.filter((row) => !row.language).length, duplicatesRemoved: records.length - candidates.length,
    failedRequests: checks.filter((row) => row.error).length, metadataExcluded, fields: fieldCounts },
  candidates, checks: checks.sort((a, b) => a.endpoint.localeCompare(b.endpoint)) };
const json = JSON.stringify(batch, null, 2) + '\n';
writeFileSync(join(folder, 'batch.json'), json, { mode: 0o600, flag: 'wx' });
writeFileSync(join(folder, 'batch.sha256'), createHash('sha256').update(json).digest('hex') + '  batch.json\n',
  { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify(batch.counts, null, 2));
