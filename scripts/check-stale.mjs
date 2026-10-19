#!/usr/bin/env node
// Fails when the docs still carry old-stack wording (literal, case-insensitive phrases; pages
// that legitimately discuss BeamMP are allow-listed by path) or break the rules STYLE.md sets
// for rewritten pages: no product versions, «плагин» instead of «ресурс».
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_PHRASES = [
  'BeamMP-compatible', 'BeamMP compatible', 'ServerConfig.toml', '[Backend]',
  'NODEMP_BACKEND_URL', 'backend-less', 'Resources/Server', 'NodeMP mesh', 'on the mesh', 'v12', 'v13',
  // Retired by the 2026-09 terminology pass (reference/glossary.md is the arbiter):
  // the person running a server is the "host"; the join button is "Hold to play";
  // playing without an account is "Test Drive"; the examples ship in the release
  // archive, not "in the NodeMP sources"; the directory is api.nodemp.com.
  'hoster', 'хостер', 'press Play', 'нажимаете Play', 'guest mode', 'гостевой режим',
  'in the NodeMP sources', 'в исходниках NodeMP', 'directory.nodemp.com',
];
export const DEFAULT_ALLOW = [
  // Moving from other platforms names the old stack's files and words on purpose.
  /plugins[\\/]migrating\.md$/,
  // The glossary names the retired variants on purpose, to retire them.
  /reference[\\/]glossary\.md$/,
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

// Pages the rewrite has not reached. Each section deletes its line when it is done, the last
// deletes the list; the English pages go when they are redone from the Russian.
export const PENDING = [
  /^(?!ru[\\/])/,
  /^ru[\\/](hosting|introduction|plugins)[\\/]/,
  /^ru[\\/]reference[\\/]faq\.md$/,
];

const IDENTIFIER_PAGES = [/reference[\\/]protocol\.md$/];
const RU_GLOSSARY = /^ru[\\/]reference[\\/]glossary\.md$/;
const blankCodeSpans = (text) => text.replace(/`[^`\n]*`/g, (span) => ' '.repeat(span.length));

// A three-part number is a product version; four parts are a game version or an address.
export const RULES = [
  { name: 'product version', re: /(?<![\d.])\d+\.\d+\.\d+(?![\d.]*\d)/g, allow: IDENTIFIER_PAGES },
  {
    name: 'protocol version',
    re: /(?:protocol|протокол\p{L}*|speaks?|говор\p{L}+)\s+v\d+/giu,
    allow: IDENTIFIER_PAGES,
    prose: true,
  },
  { name: 'ресурс for плагин', re: /ресурс/gi, ru: true, allow: [RU_GLOSSARY] },
];

export function findRuleHits(files, rules = RULES, pending = PENDING) {
  const hits = [];
  for (const { path, text } of files) {
    if (pending.some((re) => re.test(path))) continue;
    for (const rule of rules) {
      if (rule.ru && !/^ru[\\/]/.test(path)) continue;
      if (rule.allow?.some((re) => re.test(path))) continue;
      const body = rule.prose ? blankCodeSpans(text) : text;
      for (const m of body.matchAll(rule.re)) {
        hits.push({ path, line: text.slice(0, m.index).split('\n').length, rule: rule.name, phrase: m[0] });
      }
    }
  }
  return hits;
}

// Generated API reference (scripts/import-api.mjs) is never checked, same as in check-locales.mjs.
export const GENERATED = /^(ru\/)?plugins\/api\//;

export function walk(dir, out = []) {
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
  const hits = [...findStale(files), ...findRuleHits(files)];
  for (const h of hits) console.error(`${h.path}:${h.line}: ${h.rule ?? 'stale phrase'} "${h.phrase}"`);
  console.log(hits.length ? `check-stale: ${hits.length} hit(s)` : `check-stale: clean (${files.length} files)`);
  process.exit(hits.length ? 1 : 0);
}
