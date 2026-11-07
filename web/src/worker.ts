/// <reference lib="webworker" />
import { env, AutoTokenizer, AutoModelForCausalLM, TextStreamer, TextGenerationPipeline } from '@huggingface/transformers';
import { assertProfile, createModelFetch } from '../../src/chat-model.js';
import { candidate } from './model.js';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };
let generator: TextGenerationPipeline | undefined;
let busy = false;
const send = (id: number, type: string, details: Record<string, unknown> = {}) => postMessage({ id, type, ...details });

self.onmessage = async (event: MessageEvent<unknown>) => {
  const request = event.data as Record<string, unknown> | null;
  if (!request || !Number.isSafeInteger(request.id)) return;
  const id = request.id as number;
  if (busy) { send(id, 'error', { message: 'The model is busy.' }); return; }
  busy = true;
  const start = performance.now();
  try {
    if (request.type === 'load') {
      if (request.profile !== candidate.id || generator) throw new Error('Invalid model load request.');
      assertProfile(candidate);
      env.allowLocalModels = false;
      // Pin registry preflights too: this runtime's registry helpers otherwise use main.
      env.remotePathTemplate = `{model}/resolve/${candidate.revision}/`;
      env.useBrowserCache = false;
      env.useFSCache = false;
      env.useWasmCache = false;
      env.useCustomCache = false;
      const prefix = `https://huggingface.co/${candidate.model}/resolve/${candidate.revision}/`;
      env.fetch = createModelFetch(candidate);
      const wasm = env.backends.onnx.wasm!;
      wasm.numThreads = 1;
      wasm.proxy = false;
      wasm.wasmPaths = {
        mjs: new URL('./runtime/ort-wasm-simd-threaded.jsep.mjs', import.meta.url).href,
        wasm: new URL('./runtime/ort-wasm-simd-threaded.jsep.wasm', import.meta.url).href,
      };
      // The 4.3.2 pipeline factory preflights main despite revision. Explicit loaders keep every request pinned.
      const options = {
        revision: candidate.revision, dtype: candidate.dtype, device: candidate.device,
        progress_callback: (progress: unknown) => send(id, 'progress', { progress }),
        session_options: { logSeverityLevel: 3 as const },
      };
      const [tokenizer, model] = await Promise.all([
        AutoTokenizer.from_pretrained(candidate.model, options),
        AutoModelForCausalLM.from_pretrained(candidate.model, options),
      ]);
      // This pinned model stores its template separately; the runtime does not load it automatically.
      tokenizer.chat_template = await (await env.fetch(prefix + 'chat_template.jinja')).text();
      generator = new TextGenerationPipeline({ task: 'text-generation', tokenizer, model });
      send(id, 'ready', { elapsedMs: performance.now() - start });
    } else if (request.type === 'generate') {
      if (!generator) throw new Error('Load the model first.');
      const messages = request.messages;
      if (!Array.isArray(messages) || !messages.length || messages.length > 100 || messages.some((m: Message) =>
        !m || !['system', 'user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 100_000)) {
        throw new Error('Invalid conversation.');
      }
      const templateOptions = { tokenize: false as const, add_generation_prompt: true, enable_thinking: false };
      const prompt = generator.tokenizer.apply_chat_template(messages, templateOptions);
      const count = generator.tokenizer.encode(prompt, { add_special_tokens: false }).length;
      if (count > 3072) throw new Error('The conversation exceeds the input token budget.');
      let text = '';
      let firstTokenMs: number | null = null;
      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true, skip_special_tokens: true,
        callback_function: (token: string) => {
          if (!token) return;
          firstTokenMs ??= performance.now() - start;
          text += token;
          send(id, 'token', { text: token });
        },
      });
      await generator(prompt, { add_special_tokens: false, max_new_tokens: Math.min(512, typeof request.maxTokens === 'number' && Number.isInteger(request.maxTokens) && request.maxTokens > 0 ? request.maxTokens : 512),
        do_sample: false, return_full_text: false, streamer,
      });
      send(id, 'done', { text, inputTokens: count, outputTokens: generator.tokenizer.encode(text).length,
        elapsedMs: performance.now() - start, firstTokenMs });
    } else throw new Error('Unknown model operation.');
  } catch (error) {
    // Do not include input, model output or fetched text in diagnostics.
    send(id, 'error', { message: error instanceof Error ? error.message.slice(0, 200) : 'Local model operation failed.' });
  } finally { busy = false; }
};
