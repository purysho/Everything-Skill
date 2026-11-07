/** Verification helper: capture every context request, including worker and same-origin traffic. */
export function traceRequests(context) {
  const records = [];
  context.on('request', (request) => records.push({
    url: request.url(), method: request.method(), body: request.postData(), headers: request.headers(),
  }));
  return records;
}

export function assertPrivateTraffic(records, sentinel) {
  if (JSON.stringify(records).includes(sentinel)) throw new Error('Private chat leaked into a request.');
}
