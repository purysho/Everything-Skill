import { createHash } from 'node:crypto';
import type { Assessment, Candidate } from './governance.js';
import { object, readJson, readText, type ReadJson } from './http.js';
import { inspectSurface } from './surface.js';

export const sourceLicences = new Map([
  ['cc0-1.0', 'CC0-1.0'], ['cc-by-4.0', 'CC-BY-4.0'], ['cc-by-sa-4.0', 'CC-BY-SA-4.0'],
  ['cc-by-3.0', 'CC-BY-3.0'], ['mit', 'MIT'], ['apache-2.0', 'Apache-2.0'],
  ['odc-by-1.0', 'ODC-BY-1.0'], ['pddl-1.0', 'PDDL-1.0'],
]);

export function conflictingRights(description: string) {
  return /(?:redistribution|re-?use|licen[cs](?:e|ing)|attribution)\s+(?:terms|rights)?[^.\n]{0,65}(?:unknown|unconfirmed|not (?:been )?established)|(?:no|without)\s+(?:institution,?\s*source citation,?\s*)?licen[cs]e\s+(?:is\s+)?assigned|(?:commercial use|redistribution)[^.\n]{0,60}requires?[^.\n]{0,25}permission/i.test(description);
}

export function sourceText(value: string) {
  return value.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
    const point = code.toLowerCase().startsWith('x') ? Number.parseInt(code.slice(1), 16) : Number(code);
    return point <= 0x10ffff ? String.fromCodePoint(point) : ' ';
  }).replace(/&(?:nbsp|amp|lt|gt|quot|apos);/g, entity =>
    ({ '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" }[entity] ?? entity))
    .replace(/<[^>]*>/g, ' ');
}

export async function readPublicSource(url: URL): Promise<unknown> {
  return url.hostname === 'www.bea.gov' || url.pathname.endsWith('/fullTextXML') ? readText(url) : readJson(url);
}

export async function assessPublicSource(card: Candidate, read: ReadJson = readPublicSource): Promise<Assessment> {
  const url = new URL(card.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) {
    throw new Error('Expected a canonical public source link.');
  }
  let sourceId: string;
  let revision: string | null;
  let licence: string | null;
  let surface: string;
  let available = true;
  const zenodo = /^\/records\/(\d+)$/.exec(url.pathname);
  const met = /^\/art\/collection\/search\/(\d+)$/.exec(url.pathname);
  const pmc = /^\/articles\/(PMC\d+)\/$/.exec(url.pathname);
  if (url.hostname === 'zenodo.org' && zenodo) {
    const record = object(await read(new URL(`https://zenodo.org/api/records/${zenodo[1]}`)));
    const metadata = object(record.metadata);
    const concept = record.conceptdoi || record.doi;
    if (record.id !== Number(zenodo[1]) || typeof concept !== 'string' || typeof record.doi !== 'string') {
      throw new Error('Zenodo source identity changed.');
    }
    sourceId = `doi:${concept.toLowerCase()}`;
    revision = record.doi;
    licence = sourceLicences.get(String(object(metadata.license).id).toLowerCase()) ?? null;
    const files = Array.isArray(record.files) ? record.files.map(object) : [];
    available = metadata.access_right === 'open' && object(metadata.resource_type).type === 'dataset' && files.length > 0 &&
      files.every(file => String(object(file.links).self).startsWith(`https://zenodo.org/api/records/${zenodo[1]}/files/`));
    surface = sourceText(JSON.stringify({ title: metadata.title, description: metadata.description, files: files.map(file => file.key) }));
    if (conflictingRights(sourceText(String(metadata.description)))) licence = null;
  } else if (url.hostname === 'www.metmuseum.org' && met) {
    const record = object(await read(new URL(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${met[1]}`)));
    if (record.objectID !== Number(met[1]) || record.objectURL !== url.href) throw new Error('Museum source identity changed.');
    sourceId = `met:${met[1]}`;
    revision = typeof record.metadataDate === 'string' ? record.metadataDate : null;
    licence = record.isPublicDomain === true ? 'CC0-1.0' : null;
    surface = JSON.stringify({ title: record.title, description: record.objectName, credit: record.creditLine });
  } else if (url.hostname === 'pmc.ncbi.nlm.nih.gov' && pmc) {
    const xml = await read(new URL(`https://www.ebi.ac.uk/europepmc/webservices/rest/${pmc[1]}/fullTextXML`));
    if (typeof xml !== 'string' || !xml.includes(pmc[1]!) || !card.sourceId.startsWith('doi:')) {
      throw new Error('Article source identity changed.');
    }
    const doi = /<article-id\b[^>]*pub-id-type=["']doi["'][^>]*>([^<]+)<\/article-id>/.exec(xml)?.[1]?.trim().toLowerCase();
    if (!doi) throw new Error('Article DOI unavailable.');
    sourceId = `doi:${doi}`;
    revision = `${pmc[1]}@sha256:${createHash('sha256').update(xml).digest('hex')}`;
    // Preserve the already approved legacy article identity while rescanning its current surface and rights.
    if (pmc[1] === 'PMC11391792' && doi === '10.1186/s13104-024-06904-7' &&
        card.version === 'PMC11391792 corrected publication 2025') revision = card.version;
    const notice = /<license\b[\s\S]*?<\/license>/.exec(xml)?.[0] ?? '';
    licence = /https?:\/\/creativecommons\.org\/licenses\/by\/4\.0\//.test(notice) ? 'CC-BY-4.0' : null;
    surface = sourceText(xml);
  } else if (url.href === 'https://www.bea.gov/index.php/news/2026/gdp-second-estimate-4th-quarter-and-year-2025') {
    const page = await read(url);
    const policy = await read(new URL('https://www.bea.gov/help/faq/147'));
    if (typeof page !== 'string' || typeof policy !== 'string' || !/GDP \(Second Estimate\), 4th Quarter and Year 2025/.test(page)) {
      throw new Error('Statistical release identity changed.');
    }
    sourceId = 'bea:gdp:2025q4:second-estimate';
    revision = /March\s+13,?\s+2026/.test(page) ? '2026-03-13' : null;
    licence = /information posted on this web site is in the public domain/i.test(policy) ? 'Public domain (BEA)' : null;
    surface = page;
  } else {
    throw new Error('This source has no supported verification endpoint.');
  }
  if (surface.length > 256_000) throw new Error('Source metadata exceeded the review limit.');
  const scan = inspectSurface(surface);
  const flags: Assessment['flags'] = [...scan.flags];
  if (!licence) flags.push('licence-unclear');
  if (!available) flags.push('unavailable');
  return { url: url.href, sourceId, revision, licence, flags,
    level: scan.blocked ? 'blocked' : flags.length ? 'warning' : 'metadata-only' };
}
