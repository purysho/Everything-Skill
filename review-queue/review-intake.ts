import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import type { SeedResource } from '../src/catalog.js';
import { object } from '../src/http.js';
import { conflictingRights, sourceLicences, sourceText } from '../src/sources.js';
import { inspectSurface } from '../src/surface.js';

interface IntakeRecord {
  id: string; title: string; field: string; niche: string; kind: string;
  url: string; evidenceUrl: string; language: string | null; openCopy: string | null;
}
interface Disposition {
  sourceId: string; field: string; batch: number; status: string; reason: string;
  metadataSha256?: string;
}
const [intakeFile, evidenceFolder, approvalFile, output] = process.argv.slice(2);
if (!intakeFile || !evidenceFolder || !approvalFile || !output) throw new Error('Provide intake, cached records, approved Batch 001, and a new output directory.');
const sha256 = (input: Buffer) => createHash('sha256').update(input).digest('hex');
const intakeRaw = readFileSync(intakeFile);
const approvalRaw = readFileSync(approvalFile);
if (sha256(intakeRaw) !== '6aedab82896f4afc398970609d5c510975cce15f5b5ad56320096e8081ed8108' ||
    sha256(approvalRaw) !== '02a646bf6661775bc52c290cddb146c581641d3bcf87e1e6a4508130d0d8c803') {
  throw new Error('Input does not match the frozen intake and approved batch.');
}
const intake = JSON.parse(intakeRaw.toString('utf8')) as { candidates: IntakeRecord[] };
const approval = JSON.parse(approvalRaw.toString('utf8')) as { resources: SeedResource[]; evidence: unknown[] };
const approved = new Map(approval.resources.map(row => [row.sourceId, row]));
const previous = JSON.parse(readFileSync(join(dirname(approvalFile), 'intake-dispositions.json'), 'utf8')) as Disposition[];
const previousHolds = new Map(previous.filter(row => row.status === 'held-after-individual-review').map(row => [row.sourceId, row.reason]));
const repo = realpathSync(resolve(import.meta.dirname, '..', '..'));
const target = join(realpathSync(dirname(resolve(output))), basename(output));
if (target === repo || target.startsWith(repo + sep)) throw new Error('Keep pending review output outside the checkout.');
const now = new Date().toISOString();
const checkedOn = now.slice(0, 10);
const accepted: SeedResource[] = [...approval.resources];
const evidence: unknown[] = [...approval.evidence];
const dispositions: Disposition[] = [];
const topics: Record<string, RegExp> = {
  'Languages and linguistics': /language|linguis|speech|lexic|corpus|translation|word|phon|dialect|syllab/i,
  'Arts and design': /art\b|music|architect|design|paint|ceramic|vessel|textile|photograph|performance/i,
  Humanities: /archaeolog|histor|medieval|literar|humanities|archive|charter|monaster|heritage|oral/i,
  'Social sciences': /politic|social|migration|survey|sociolog|trust|government|policy|parliament/i,
  'Education and psychology': /educat|learn|psycholog|percept|cognit|visual|teaching|student|stimuli/i,
  'Mathematics and statistics': /mathemat|statistic|graph|optim|simulation|benchmark|integer|geometry/i,
  'Physical sciences': /physics|particle|galax|astronom|material|metal|spectrum|laser|ion.beam|crystal|nano/i,
  'Earth and environment': /climat|ocean|earth|environment|aerosol|remote.sens|satellite|hydro|geolog|wind|wave/i,
  'Life sciences': /genom|biodivers|species|arthropod|biolog|ecolog|plant|protein|bacteria|fung|flora|fauna/i,
  'Medicine and health': /health|medic|clinical|disease|virus|epidem|measles|covid|dementia|rehabili|sleep|pain/i,
  'Computing and information': /comput|software|cyber|algorithm|program|human.computer|interaction|keyboard|database/i,
  'Engineering and technology': /engineer|robot|renewable|energy|turbine|wind.farm|pile|infrastruct|centrifuge|bridge|event.based/i,
  'Agriculture and food': /agricultur|crop|food|soil|milk|casein|harvest|grain|maize|wheat|farm|weed|nutrition/i,
  'Law and public policy': /polic|law\b|legislat|government|crime|justice|legal|regulat|copyright|education.system/i,
  'Economics and business': /econom|business|financ|market|monetar|trade|labour|labor|gdp|bank/i,
};
const dataFile = /\.(?:csv|tsv|dat|txt|jsonl?|parquet|xlsx?|dta|sav|rds|rdata|nc|nc4|h5|hdf5|fits|fasta|fastq|cif|xyz|mps|asc|tiff?|ttl|rdf|nt|xml|mat|zip|tar|gz|bz2|rar|7z|wav|mp3|mp4|jpg|png)$/i;
const sensitivity = /participant.level|patient.level|clinical (?:trial |study )?data|human (?:subjects?|participants?|brain)|(?:voice|speech|audio) recordings?|speaker[_ -]?id|interview (?:notes|transcripts)|respondent.level|students?['’]? (?:grades|performance|activity)|personally identifiable|EEG|MRI|fMRI|eye.track|demograph|medical records|self.reported|crowdsourc/i;
const thirdParty = /web.scrap|scrap(?:ed|ing)|third.party (?:rights|copyright|data|content)|textbook|copyrighted|massive dataset|Scopus|Web of Science|licensed (?:from|by)|proprietary|all rights reserved/i;
const clean = (s: string) => sourceText(s).replace(/<[^>]*>/g, ' ')
  .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[contact omitted]')
  .replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim();
function inspect(row: IntakeRecord, raw: Buffer): { resource: SeedResource; evidence: unknown } | { status: string; reason: string } {
  const record = object(JSON.parse(raw.toString('utf8')));
  const metadata = object(record.metadata);
  const files = Array.isArray(record.files) ? record.files.map(object) : [];
  const surface = JSON.stringify({ title: metadata.title, description: metadata.description, files: files.map(f => f.key) });
  if (surface.length > 256_000) return { status: 'held', reason: 'Metadata exceeds the review limit.' };
  const scan = inspectSurface(sourceText(surface));
  if (scan.flags.length) return { status: scan.blocked ? 'blocked' : 'held', reason: 'Source metadata failed the heuristic safety check.' };
  if (record.id !== Number(new URL(row.url).pathname.split('/').at(-1)) || typeof metadata.title !== 'string' ||
      typeof record.doi !== 'string' || !/^10\.\d{4,9}\/[\w.();/:+-]+$/i.test(record.doi)) {
    return { status: 'held', reason: 'Source identity or version could not be confirmed.' };
  }
  if (row.id !== 'doi:' + String(record.conceptdoi || record.doi).toLowerCase() ||
      clean(metadata.title) !== clean(row.title)) return { status: 'held', reason: 'The source identity or title changed since intake.' };
  if (object(metadata.resource_type).type !== 'dataset') return { status: 'held', reason: 'The original source no longer identifies a dataset.' };
  const licence = sourceLicences.get(String(object(metadata.license).id).toLowerCase());
  const description = typeof metadata.description === 'string' ? clean(metadata.description) : '';
  if (/\bawesome[-_ /]|curated list of (?:tools|repositories|resources)|list of github repositories|resource directory/i.test(row.title + ' ' + description)) {
    return { status: 'held', reason: 'The record is a resource directory rather than an individual source artifact.' };
  }
  if (!licence || conflictingRights(description)) return { status: 'licence-unclear', reason: 'Reuse rights are missing, unrecognised or conflict with the source description.' };
  if (metadata.access_right !== 'open') return { status: 'unavailable', reason: 'Files are no longer openly available.' };
  const original = Array.isArray(metadata.creators) ? metadata.creators.map(object).filter(c => typeof c.name === 'string') : [];
  if (!original.length || !description) return { status: 'held', reason: 'The source lacks methods or origin evidence.' };
  if (!files.some(f => dataFile.test(String(f.key)))) return { status: 'held', reason: 'No data artifact was identified in the deposited file list.' };
  if (sensitivity.test(description + ' ' + row.title)) return { status: 'privacy-review', reason: 'Participant data, recordings or sensitive measurement scope needs a separate review.' };
  if (thirdParty.test(description)) return { status: 'rights-review', reason: 'The description identifies external inputs whose redistribution scope requires review.' };
  if (!topics[row.field]?.test(row.title + ' ' + description)) return { status: 'off-topic', reason: 'The original record does not substantiate its intake field.' };
  if (!files.every(f => {
    const endpoint = String(object(f.links).self);
    return endpoint.startsWith(`https://zenodo.org/api/records/${record.id}/files/`) && endpoint.endsWith('/content');
  })) return { status: 'held', reason: 'File provenance could not be confirmed on the official host.' };
  const summary = description.slice(0, 460);
  const resource: SeedResource = { sourceId: row.id, url: row.url, kind: 'dataset', category: row.field.toLowerCase(),
    title: clean(row.title), summary, tags: row.niche, version: record.doi, checkedOn, evidenceUrl: row.url,
    licence: { state: 'verified', id: licence, url: `https://zenodo.org/records/${record.id}` },
    security: 'metadata-only', availability: 'active' };
  return { resource, evidence: { sourceId: row.id, observedAt: now, metadataSha256: sha256(raw),
    endpoint: row.evidenceUrl, original: original.map(c => clean(String(c.name))), language: row.language,
    scope: 'Bibliographic metadata and link. Depositor licence, original data artifact and subject checked by metadata rules. Payloads unreviewed.' } };
}
function inspectOther(row: IntakeRecord): { resource: SeedResource; evidence: unknown } | { status: string; reason: string } {
  let raw: Buffer;
  let surface: string;
  let licence: SeedResource['licence'];
  let url = row.url;
  let kind: SeedResource['kind'];
  let version: string;
  let summary: string;
  if (row.kind === 'artwork') {
    const id = row.id.slice(4);
    raw = readFileSync(join(evidenceFolder!, `met-${id}.json`));
    const record = object(JSON.parse(raw.toString('utf8')));
    if (record.objectID !== Number(id) || record.objectURL !== row.url || record.title !== row.title ||
        typeof record.metadataDate !== 'string') return { status: 'held', reason: 'Museum identity or revision changed.' };
    if (record.isPublicDomain !== true) return { status: 'licence-unclear', reason: 'Museum no longer identifies a public-domain object.' };
    surface = JSON.stringify({ title: record.title, credit: record.creditLine, objectName: record.objectName });
    version = record.metadataDate;
    summary = clean([record.objectName, record.culture, record.objectDate, record.medium, record.creditLine].filter(Boolean).join('. '));
    kind = 'other';
    licence = { state: 'verified', id: 'CC0-1.0', url: 'https://www.metmuseum.org/hubs/open-access' };
  } else if (row.kind === 'paper' && row.openCopy && /^https:\/\/europepmc.org\/articles\/PMC\d+$/.test(row.openCopy)) {
    const pmc = row.openCopy.split('/').at(-1)!;
    const pmid = new URL(row.evidenceUrl).pathname.split('/').filter(Boolean).at(-1)!;
    const core = object(JSON.parse(readFileSync(join(evidenceFolder!, `medicine-${pmid}.json`), 'utf8')));
    raw = readFileSync(join(evidenceFolder!, `${pmc}.xml`));
    surface = raw.toString('utf8');
    const doi = /<article-id\b[^>]*pub-id-type=["']doi["'][^>]*>([^<]+)<\/article-id>/.exec(surface)?.[1]?.trim().toLowerCase();
    if (core.id !== pmid || core.pmcid !== pmc || row.id !== `doi:${doi}` || !surface.includes(pmc)) {
      return { status: 'held', reason: 'Article identity could not be confirmed.' };
    }
    const notice = /<license\b[\s\S]*?<\/license>/.exec(surface)?.[0] ?? '';
    if (!/https?:\/\/creativecommons\.org\/licenses\/by\/4\.0\//.test(notice)) {
      return { status: 'licence-unclear', reason: 'The original article does not confirm CC BY 4.0 reuse.' };
    }
    if (core.isOpenAccess !== 'Y' || typeof core.firstPublicationDate !== 'string' || core.firstPublicationDate > checkedOn ||
        /retract|expression of concern/i.test(JSON.stringify([core.pubTypeList, core.commentCorrectionList]))) {
      return { status: 'held', reason: 'Article access, publication date or integrity needs review.' };
    }
    if (/\bprotocol\b|systematic review|meta.analysis/i.test(row.title)) {
      return { status: 'held', reason: 'Protocol or secondary synthesis needs separate evidence classification.' };
    }
    if (!topics[row.field]?.test(row.title + ' ' + String(core.abstractText))) {
      return { status: 'off-topic', reason: 'The article does not substantiate the intake field.' };
    }
    const abstract = clean(String(core.abstractText ?? '')).slice(0, 400);
    const authors = clean(String(core.authorString ?? '')).slice(0, 180);
    if (!abstract || !authors) return { status: 'held', reason: 'Research design, outcomes or attribution metadata are unavailable.' };
    summary = `${authors} · Abstract excerpt, shortened. ${abstract}`;
    version = `${pmc}@sha256:${sha256(raw)}`;
    url = `https://pmc.ncbi.nlm.nih.gov/articles/${pmc}/`;
    kind = 'paper';
    licence = { state: 'verified', id: 'CC-BY-4.0', url: 'https://creativecommons.org/licenses/by/4.0/' };
  } else return { status: 'held', reason: 'An openly reusable primary source could not be established.' };
  if (surface.length > 256_000) return { status: 'held', reason: 'Source exceeded the review limit.' };
  const scan = inspectSurface(sourceText(surface));
  if (scan.flags.length) return { status: scan.blocked ? 'blocked' : 'held', reason: 'Source content failed the heuristic safety check.' };
  return { resource: { sourceId: row.id, url, kind, category: row.field.toLowerCase(), title: clean(row.title),
    summary, tags: row.niche, version, checkedOn, evidenceUrl: url, licence, security: 'metadata-only', availability: 'active' },
    evidence: { sourceId: row.id, endpoint: row.evidenceUrl, metadataSha256: sha256(raw), observedAt: now,
      language: row.language, scope: 'Published article or museum record and source metadata. Linked payloads unreviewed.' } };
}
for (const [index, row] of intake.candidates.entries()) {
  let result: { status: string; reason: string };
  let metadataSha256: string | undefined;
  if (approved.has(row.id)) {
    result = { status: 'approved-batch-001', reason: 'Maintainer approved the exact Batch 001 manifest.' };
  } else if (previousHolds.has(row.id)) {
    result = { status: 'held', reason: previousHolds.get(row.id)! };
  } else {
    try {
      let checked: ReturnType<typeof inspect>;
      if (row.url.startsWith('https://zenodo.org/records/')) {
        const key = new URL(row.url).pathname.split('/').at(-1)!;
        const raw = readFileSync(join(evidenceFolder, `zenodo-${key}.json`));
        metadataSha256 = sha256(raw);
        checked = inspect(row, raw);
      } else checked = inspectOther(row);
      if ('resource' in checked) {
        accepted.push(checked.resource);
        evidence.push(checked.evidence);
        result = { status: 'admitted-metadata', reason: 'Official record passed identity, rights, subject, artifact and metadata policy checks.' };
      } else result = checked;
    } catch {
      result = { status: 'unavailable', reason: 'Official metadata was unavailable or invalid during the bounded verification pass.' };
    }
  }
  dispositions.push({ sourceId: row.id, field: row.field, batch: Math.floor(index / 100) + 1,
    ...result, ...(metadataSha256 ? { metadataSha256 } : {}) });
}
if (new Set(accepted.map(r => r.sourceId)).size !== accepted.length || new Set(accepted.map(r => r.url)).size !== accepted.length) {
  throw new Error('Resolve duplicate source identities before admission.');
}
mkdirSync(target, { mode: 0o700 });
const save = (name: string, value: unknown) => writeFileSync(join(target, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
save('resources.json', accepted);
save('evidence.json', evidence);
save('dispositions.json', dispositions);
const counts: Record<string, number> = {};
for (const d of dispositions) counts[d.status] = (counts[d.status] ?? 0) + 1;
save('report.json', { intake: intake.candidates.length, admitted: accepted.length, counts, checkedOn,
  approval: 'Maintainer approved Batch 001 and requested completion of all batches on 2026-11-07.',
  approvedManifestSha256: sha256(approvalRaw), intakeSha256: sha256(intakeRaw) });
console.log(JSON.stringify({ admitted: accepted.length, counts }, null, 2));
