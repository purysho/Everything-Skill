import { resolve } from 'node:path';
import { object } from './http.js';

export async function rerankLocal<T extends { title: string; summary: string }>(
  query: string, cards: readonly T[], modelsDirectory: string,
): Promise<T[]> {
  const shortlist = cards.slice(0, 10);
  if (shortlist.length === 0) return [];
  const packageName = '@huggingface/transformers';
  let module: Record<string, unknown>;
  try {
    module = object(await import(packageName));
  } catch {
    throw new Error('Local reranking requires the optional @huggingface/transformers package.');
  }
  const env = object(module.env);
  env.allowRemoteModels = false;
  env.localModelPath = resolve(modelsDirectory);
  type Tokenizer = (input: string[], options: object) => unknown;
  type Model = ((input: unknown) => Promise<unknown>) & { dispose(): Promise<void> };
  const tokenizerFactory = module.AutoTokenizer as { from_pretrained: (id: string, options: object) => Promise<Tokenizer> };
  const modelFactory = module.AutoModelForSequenceClassification as { from_pretrained: (id: string, options: object) => Promise<Model> };
  if (typeof tokenizerFactory?.from_pretrained !== 'function' ||
      typeof modelFactory?.from_pretrained !== 'function') throw new Error('Incompatible transformer package.');
  const modelId = 'Xenova/ms-marco-MiniLM-L-6-v2';
  const local = { local_files_only: true };
  const tokenizer = await tokenizerFactory.from_pretrained(modelId, local);
  const model = await modelFactory.from_pretrained(modelId, { ...local, dtype: 'q8' });
  try {
    const input = tokenizer(shortlist.map(() => query), {
      text_pair: shortlist.map((card) => `${card.title}. ${card.summary}`),
      padding: true, truncation: true,
    });
    const values = object(object(await model(input)).logits).data;
    if (!(values instanceof Float32Array) || values.length !== shortlist.length ||
        values.some((value) => !Number.isFinite(value))) throw new Error('Invalid local reranker output.');
    const ranked = shortlist.map((card, index) => ({ card, score: values[index]! }))
      .sort((a, b) => b.score - a.score).map(({ card }) => card);
    return [...ranked, ...cards.slice(10)];
  } finally {
    await model.dispose();
  }
}
