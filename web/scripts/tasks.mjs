/** Validate the experiment before starting any model download. */
export function selectCases(cases, ids, limit) {
  const byId = new Map(cases.map((entry) => [entry.id, entry]));
  const requested = ids === undefined ? null : ids.split(',').map((id) => id.trim());
  if (requested && (new Set(requested).size !== requested.length || requested.some((id) => !byId.has(id)))) {
    throw new Error('Unknown, empty or duplicate case selection.');
  }
  const selected = requested ? requested.map((id) => byId.get(id)) : cases;
  const count = limit === undefined ? selected.length : /^\d+$/.test(limit) ? Number(limit) : NaN;
  if (!Number.isSafeInteger(count) || count < 0 || count > selected.length) throw new Error('Invalid case limit.');
  return selected.slice(0, count);
}

/** The report owns the entry before dispatch, so even a timeout keeps its task identity. */
export async function recordCase(entry, operation) {
  entry.outcome = 'running';
  try {
    Object.assign(entry, await operation(), { outcome: 'completed' });
    return entry;
  } catch (error) {
    entry.outcome = 'failed';
    entry.error = String(error);
    throw error;
  }
}
