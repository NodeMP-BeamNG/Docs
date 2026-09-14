#!/usr/bin/env node
// Fails when the docs still carry old-stack wording. Literal, case-insensitive
// phrases; pages that legitimately discuss BeamMP are allow-listed by path.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_PHRASES = [
  'BeamMP-compatible', 'BeamMP compatible', 'ServerConfig.toml', '[Backend]',
  'NODEMP_BACKEND_URL', 'backend-less', 'Resources/Server', 'NodeMP mesh', 'on the mesh', 'v12', 'v13',
];
export const DEFAULT_ALLOW = [
  /introduction[\\/]differences-from-beammp\.md$/,
  /plugins[\\/]migrating\.md$/,
];

export function findStale(files, phrases = DEFAULT_PHRASES, allow = DEFAULT_ALLOW) {
  const hits = [];
  for (const { path, text } of files) {
    if (allow.some((re) => re.test(path))) continue;
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      const lower = line.toLowerCase();
      for (const phrase of phrases) {
        if (lower.includes(phrase.toLowerCase())) hits.push({ path, line: i + 1, phrase });
      }
    });
  }
  return hits;
}

// Generated API reference (scripts/import-api.mjs) is never checked, same as in check-locales.mjs.
const GENERATED = /^(ru\/)?plugins\/api\//;

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
  const files = walk(root)
    .map((p) => relative(root, p))
    .filter((p) => !GENERATED.test(p.replace(/\\/g, '/')))
    .map((p) => ({ path: p, text: readFileSync(join(root, p), 'utf8') }));
  const hits = findStale(files);
  for (const h of hits) console.error(`${h.path}:${h.line}: stale phrase "${h.phrase}"`);
  console.log(hits.length ? `check-stale: ${hits.length} hit(s)` : `check-stale: clean (${files.length} files)`);
  process.exit(hits.length ? 1 : 0);
}
