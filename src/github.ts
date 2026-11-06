import { createHash } from 'node:crypto';
import { canonicalGitHub } from './identity.js';
import { HttpError, object, readJson, type ReadJson } from './http.js';

const api = 'https://api.github.com';

export function gitHubEndpoint(path: string) {
  return new URL(path, api);
}

export async function inspectGitHub(input: string, read: ReadJson = readJson) {
  const requested = canonicalGitHub(input);
  const metadata = object(await read(gitHubEndpoint(`/repos${new URL(requested).pathname}`)));
  if (!Number.isSafeInteger(metadata.id) || typeof metadata.html_url !== 'string' ||
      typeof metadata.default_branch !== 'string' || typeof metadata.archived !== 'boolean' ||
      metadata.private !== false) throw new Error('Invalid public GitHub repository metadata.');
  const url = canonicalGitHub(metadata.html_url);
  const path = new URL(url).pathname;
  const branch = encodeURIComponent(metadata.default_branch);
  const commit = object(await read(gitHubEndpoint(`/repos${path}/commits/${branch}`)));
  if (typeof commit.sha !== 'string' || !/^[0-9a-f]{40}$/.test(commit.sha)) {
    throw new Error('GitHub did not return a valid pinned commit.');
  }
  const sha = commit.sha;
  const pinnedUrl = `${url}/tree/${sha}`;
  const endpoint = gitHubEndpoint(`/repos${path}/license`);
  endpoint.searchParams.set('ref', sha);
  let licence: Record<string, unknown> = {};
  try {
    licence = object(await read(endpoint));
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 404) throw error;
  }
  const declared = object(licence.license).spdx_id;
  const licencePath = typeof licence.path === 'string' &&
    /^[\w.-]+(?:\/[\w.-]+)*$/.test(licence.path) &&
    !licence.path.split('/').some((part) => part === '.' || part === '..')
    ? licence.path : null;
  const content = licence.encoding === 'base64' && typeof licence.content === 'string'
    ? Buffer.from(licence.content, 'base64') : Buffer.alloc(0);
  const licenceUrl = licencePath ? `${url}/blob/${sha}/${licencePath}` : null;
  const text = content.toString('utf8');
  // Apache 2.0 itself says that a contribution is covered without additional terms.
  const restrictions = declared === 'Apache-2.0'
    ? text.replace('this License, without any additional terms or conditions.', '') : text;
  const recognised = (
    (declared === 'MIT' && /permission is hereby granted, free of charge/i.test(text)) ||
    (declared === 'CC0-1.0' && /CC0 1\.0 Universal/i.test(text)) ||
    (declared === 'Apache-2.0' && /apache license\s+version 2\.0/i.test(text))
  ) && !/licen[cs]ing transition|dual.licen[cs]|additional (?:terms|restrictions)/i.test(restrictions);
  const sourceCommit = object(commit.commit);
  const timestamp = object(sourceCommit.committer).date;
  return {
    sourceId: `github:${metadata.id}`, url, version: sha,
    pinnedUrl, licenceUrl, licencePath,
    licenceId: recognised && licenceUrl ? String(declared) : null,
    licenceSha256: content.length ? createHash('sha256').update(content).digest('hex') : null,
    licenceBlob: typeof licence.sha === 'string' && /^[a-f0-9]{40}$/.test(licence.sha) ? licence.sha : null,
    archived: metadata.archived || metadata.disabled === true,
    committedAt: typeof timestamp === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(timestamp)
      ? timestamp : null,
  };
}


export function catalogueGitHubSource(url: string, version: string, evidenceUrl?: string) {
  const source = new URL(url);
  if (source.origin !== 'https://raw.githubusercontent.com') return { repository: canonicalGitHub(url), path: null };
  const evidence = new URL(evidenceUrl ?? '');
  const match = /^\/([\w.-]+)\/([\w.-]+)\/blob\/([a-f0-9]{40})\/([\w.-]+(?:\/[\w.-]+)*)$/.exec(evidence.pathname);
  if (source.username || source.password || source.search || source.hash ||
      evidence.origin !== 'https://github.com' || evidence.username || evidence.password ||
      evidence.search || evidence.hash || !match || match[3] !== version || !match[4] ||
      match[4].split('/').some((part) => part === '.' || part === '..') ||
      source.pathname !== `/${match[1]}/${match[2]}/${version}/${match[4]}`) {
    throw new Error('The direct file does not match its pinned GitHub evidence.');
  }
  return { repository: canonicalGitHub(evidence.href), path: match[4] };
}

export async function checkPinnedGitHubFile(repository: string, path: string, version: string,
    read: ReadJson = readJson) {
  const root = new URL(canonicalGitHub(repository)).pathname;
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const url = gitHubEndpoint(`/repos${root}/contents/${encodedPath}`);
  url.searchParams.set('ref', version);
  const file = object(await read(url));
  if (file.type !== 'file' || file.path !== path || typeof file.sha !== 'string' || !/^[a-f0-9]{40}$/.test(file.sha)) {
    throw new Error('GitHub did not confirm the pinned file.');
  }
  return file.sha;
}
