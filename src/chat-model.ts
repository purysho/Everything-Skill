/** Shared, browser-safe admission boundary. Rights admission is separate from measured support. */
export interface ModelProfile {
  id: string;
  model: string;
  revision: string;
  dtype: 'q4' | 'q4f16';
  device: 'wasm' | 'webgpu';
  licence: string;
  licenceUrl: string;
  rights: 'established' | 'unclear';
  runtimeBytes: number;
  assets: readonly { path: string; bytes: number; sha256: string }[];
}

export function assertProfile(profile: ModelProfile): number {
  if (profile.rights !== 'established' || profile.licence !== 'Apache-2.0') {
    throw new Error('Model rights are not established.');
  }
  if (!/^[a-f0-9]{40}$/.test(profile.revision)) throw new Error('Pin the model revision.');
  if (!/^[\w.-]+\/[\w.-]+$/.test(profile.model)) throw new Error('Invalid model identifier.');
  const licence = new URL(profile.licenceUrl);
  if (licence.protocol !== 'https:' || licence.username || licence.password) throw new Error('Invalid licence URL.');
  if (!Number.isSafeInteger(profile.runtimeBytes) || profile.runtimeBytes <= 0) throw new Error('Invalid runtime size.');
  if (!['wasm', 'webgpu'].includes(profile.device) || !['q4', 'q4f16'].includes(profile.dtype)) {
    throw new Error('Unsupported model profile.');
  }
  const paths = new Set<string>();
  let bytes = profile.runtimeBytes;
  if (!profile.assets.length) throw new Error('No model assets.');
  for (const asset of profile.assets) {
    if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(?:json|jinja|onnx|onnx_data)$/.test(asset.path) ||
        !/^[a-f0-9]{64}$/.test(asset.sha256) || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0) {
      throw new Error('Invalid or unverified model asset.');
    }
    if (paths.has(asset.path)) throw new Error('Duplicate model asset.');
    paths.add(asset.path);
    bytes += asset.bytes;
  }
  if (!Number.isSafeInteger(bytes) || bytes > 1_073_741_824) throw new Error('Model download exceeds 1 GiB.');
  return bytes;
}

/** Restrict runtime I/O to the admitted manifest. Metadata probes need no network payload. */
export function createModelFetch(profile: ModelProfile, download: typeof fetch = fetch): typeof fetch {
  assertProfile(profile);
  const prefix = `https://huggingface.co/${profile.model}/resolve/${profile.revision}/`;
  const assets = new Map(profile.assets.map((asset) => [prefix + asset.path, asset]));
  return async (input, options) => {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const asset = assets.get(url);
    if (!asset) throw new Error('Unapproved model asset request.');
    const method = options?.method ?? (input instanceof Request ? input.method : 'GET');
    if (method !== 'GET' && method !== 'HEAD') throw new Error('Unapproved model request method.');
    const headers = new Headers(options?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (method === 'HEAD' || headers.get('Range') === 'bytes=0-0') {
      // Synthetic metadata from pinned, previously verified bytes; never a second weight download.
      return new Response(null, { status: method === 'HEAD' ? 200 : 206, headers: {
        'Content-Range': `bytes 0-0/${asset.bytes}`, 'Content-Length': method === 'HEAD' ? String(asset.bytes) : '0',
        'Content-Type': asset.path.endsWith('.json') ? 'application/json' : 'application/octet-stream',
      } });
    }
    if (headers.has('Range')) throw new Error('Unapproved model byte range.');
    const digest = btoa(String.fromCharCode(...asset.sha256.match(/../g)!.map((part) => parseInt(part, 16))));
    const response = await download(url, {
      credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', integrity: 'sha256-' + digest,
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    if (!response.ok) throw new Error('Model asset download failed.');
    return response;
  };
}
