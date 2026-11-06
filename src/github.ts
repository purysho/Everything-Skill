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
  const recognised = (
    (declared === 'MIT' && /permission is hereby granted, free of charge/i.test(text)) ||
    (declared === 'CC0-1.0' && /CC0 1\.0 Universal/i.test(text)) ||
    (declared === 'Apache-2.0' && /apache license\s+version 2\.0/i.test(text))
  ) && !/licen[cs]ing transition|dual.licen[cs]|additional (?:terms|restrictions)/i.test(text);
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
