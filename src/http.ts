export type ReadJson = (url: URL) => Promise<unknown>;

export class HttpError extends Error {
  constructor(readonly status: number) {
    super(`Public source returned HTTP ${status}.`);
  }
}

export function object(input: unknown): Record<string, unknown> {
  return input !== null && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown> : {};
}

export async function readJson(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'error',
    credentials: 'omit',
    signal: AbortSignal.timeout(12000),
    headers: { Accept: 'application/json', 'User-Agent': 'Everything-Skill' },
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new HttpError(response.status);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Public source returned an empty response.');
  const maxBytes = 2_000_000;
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > maxBytes) throw new Error('Public source exceeded the response size limit.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return JSON.parse(Buffer.concat(chunks, bytes).toString('utf8')) as unknown;
}
