import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
execFileSync(process.execPath, [resolve(root, '../node_modules/typescript/bin/tsc'), '-p', resolve(root, 'tsconfig.json')], { stdio: 'inherit' });
await mkdir(resolve(root, 'dist/runtime'), { recursive: true });
await build({ entryPoints: { worker: resolve(root, 'src/worker.ts'), model: resolve(root, 'src/model.ts'), admission: resolve(root, '../src/chat-model.ts') }, bundle: true, format: 'esm', platform: 'browser', target: 'es2022', outdir: resolve(root, 'dist'), minify: true, legalComments: 'linked' });
for (const file of ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) {
  await cp(resolve(root, 'node_modules/onnxruntime-web/dist', file), resolve(root, 'dist/runtime', file));
}
await cp(resolve(root, 'gate.html'), resolve(root, 'dist/gate.html'));
