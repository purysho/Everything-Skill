export const retrievalModes = ['lexical', 'dense', 'hybrid', 'routed'] as const;
export type RetrievalMode = typeof retrievalModes[number];

const routeTerms = {
  healthcare: ['healthcare', 'medical', 'fhir', 'clinical', 'health', 'hospital'],
  mcp: ['mcp', 'modelcontextprotocol'],
  software: ['coding', 'programming', 'codex', 'rag', 'software'],
};

export function route(terms: readonly string[]) {
  const matches = Object.entries(routeTerms)
    .filter(([, synonyms]) => terms.some((term) => synonyms.includes(term)));
  return matches.length === 1 ? matches[0]?.[0] ?? null : null;
}

export function termsFor(text: string) {
  return [...new Set(text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    .match(/[\p{L}\p{N}]+/gu) ?? [])];
}

export type Embed = (text: string) => Float32Array;

const conceptGroups = [
  'clinical medical healthcare health hospital fhir interoperability',
  'rag retrieval grounding retrievalaugmented embeddings search semantic',
  'coding programming developer software code development',
  'agents agent assistant assistants claude codex workflows workflow',
  'mcp modelcontextprotocol protocol servers server',
  'catalogue catalog directory directories list lists curated',
];

function addFeature(vector: Float32Array, feature: string, weight: number) {
  let hash = 2166136261;
  for (const symbol of feature) hash = Math.imul(hash ^ symbol.codePointAt(0)!, 16777619);
  const index = (hash >>> 0) % vector.length;
  vector[index] = vector[index]! + (hash < 0 ? -weight : weight);
}

// Local baseline embeddings. Concept buckets add limited synonym support.
export const localEmbed: Embed = (text) => {
  const vector = new Float32Array(1024);
  const terms = new Set(termsFor(text));
  for (const word of terms) {
    addFeature(vector, word, 1);
    const padded = Array.from(`^${word}$`);
    for (let i = 0; i + 2 < padded.length; i++) {
      addFeature(vector, padded.slice(i, i + 3).join(''), 0.12);
    }
  }
  for (const [index, group] of conceptGroups.entries()) {
    if (group.split(' ').some((word) => terms.has(word))) addFeature(vector, `concept:${index}`, 0.85);
  }
  const norm = Math.hypot(...vector);
  return norm ? vector.map((value) => value / norm) : vector;
};

export function dot(first: Float32Array, second: Float32Array) {
  return first.reduce((sum, value, index) => sum + value * (second[index] ?? 0), 0);
}

export function fuseRankings(lists: readonly (readonly string[])[]) {
  const fused = new Map<string, number>();
  for (const list of lists) {
    for (const [rank, key] of [...new Set(list)].entries()) {
      fused.set(key, (fused.get(key) ?? 0) + 1 / (60 + rank + 1));
    }
  }
  return fused;
}

const labels = [
  { name: 'Trusted', colour: '#186a3b' },
  { name: 'Suitable', colour: '#075985' },
  { name: 'Conditional', colour: '#854d0e' },
  { name: 'Weak', colour: '#6b4b75' },
  { name: 'Excluded', colour: '#991b1b' },
] as const;

export function labelFor(score: number, cap: 'Conditional' | 'Trusted' | 'Excluded',
    thresholds: readonly number[] = [90, 75, 50, 1]) {
  if (thresholds.length !== 4 || thresholds[3] !== 1 || thresholds.some((n, i) =>
    !Number.isInteger(n) || n < 1 || n > 100 || (i > 0 && n >= thresholds[i - 1]!))) {
    throw new Error('Use four strictly descending integer label thresholds from 1 to 100, ending in 1.');
  }
  const index = thresholds.findIndex((minimum) => score >= minimum);
  const capIndex = labels.findIndex((label) => label.name === cap);
  return labels[Math.max(index === -1 ? 4 : index, capIndex)]!;
}
