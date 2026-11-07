import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function versionDemoAssets(folder: string, version: string) {
  const path = join(folder, 'index.html');
  let html = readFileSync(path, 'utf8');
  html = html.replace(/<html[^>]*>/, `<html lang="en" data-catalogue-version="${version}">`);
  for (const file of ['app.js', 'styles.css']) {
    const digest = createHash('sha256').update(readFileSync(join(folder, file))).digest('hex').slice(0, 12);
    const reference = new RegExp(file.replace('.', '\\.') + '(?:\\?v=[a-f0-9]+)?(?=")', 'g');
    html = html.replace(reference, `${file}?v=${digest}`);
  }
  writeFileSync(path, html);
}
