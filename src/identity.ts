export function canonicalGitHub(input: string): string {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !['github.com', 'www.github.com', 'api.github.com'].includes(url.hostname)) {
    throw new Error('Expected a public HTTPS GitHub repository URL.');
  }
  const path = url.hostname === 'api.github.com' ? /^\/repos\/([^/]+)\/([^/]+)/ : /^\/([^/]+)\/([^/]+)/;
  const [, owner = '', repository = ''] = path.exec(url.pathname) ?? [];
  const name = repository.replace(/\.git$/i, '');
  if (!/^[a-z\d][a-z\d-]{0,38}$/i.test(owner) || !/^[a-z\d_.-]+$/i.test(name) ||
      name === '.' || name === '..') {
    throw new Error('Expected a GitHub repository owner and name.');
  }
  return `https://github.com/${owner.toLowerCase()}/${name.toLowerCase()}`;
}

export function canonicalResource(input: string): string {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Expected an HTTPS resource URL without credentials.');
  }
  if (['github.com', 'www.github.com', 'api.github.com'].includes(url.hostname)) {
    return canonicalGitHub(input);
  }
  url.hash = '';
  // Query parameters and trailing slashes can identify different resources.
  return url.href;
}
