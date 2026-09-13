#!/usr/bin/env node
// Every EN page (files under src/content/docs/ not under ru/) must have a RU
// twin at ru/<same path>, and every RU page must have an EN original. The
// generated API reference is exempt: it is EN-only by design.
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const GENERATED = /^(ru\/)?plugins\/api\//;

export function missingTwins(paths) {
  const norm = paths.map((p) => p.replace(/\\/g, '/'));
  const en = new Set(norm.filter((p) => !p.startsWith('ru/') && !GENERATED.test(p)));
  const ru = new Set(norm.filter((p) => p.startsWith('ru/') && !GENERATED.test(p)));
  const missingRu = [...en].filter((p) => !ru.has('ru/' + p)).sort();
  const orphanRu = [...ru].filter((p) => !en.has(p.slice(3))).sort();
  return { missingRu, orphanRu };
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(md|mdx)$/.test(name)) out.push(p);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = process.env.CHECK_CONTENT_DIR || 'src/content/docs';
  const { missingRu, orphanRu } = missingTwins(walk(root).map((p) => relative(root, p)));
  for (const p of missingRu) console.error(`missing RU twin: ru/${p}`);
  for (const p of orphanRu) console.error(`RU page without EN original: ${p}`);
  const n = missingRu.length + orphanRu.length;
  console.log(n ? `check-locales: ${n} problem(s)` : 'check-locales: EN and RU trees match');
  process.exit(n ? 1 : 0);
}
