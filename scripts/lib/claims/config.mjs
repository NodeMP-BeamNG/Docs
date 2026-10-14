// Check 1: the server.toml reference in hosting/configuration.md against
// server/src/core/Config.cpp + Settings.cpp -- every section, key, type, default
// and NODE_* name; a complete example server.toml on the same page; on every page
// "N sections" claims, `[Section] Key` / NODE_* mentions and the keys of server.toml
// snippets.
import { tables, codeBlocks, codeLineSet, inlineCode } from './md.mjs';

const finding = (check, page, line, claim, expected, actual) => ({ check, page: page.path, locale: page.locale, line, claim, expected, actual });

// The reference: every table whose first column holds `[Section]` cells, read as one
// (the page may give each section a table of its own).
function referenceTable(text) {
  const parts = tables(text).filter((t) => t.rows.length && t.rows.every((r) => /^`\[\w+\]`$/.test(r.cells[0] || '')));
  return parts.length ? { start: parts[0].start, rows: parts.flatMap((t) => t.rows) } : undefined;
}

const strip = (s) => s.replace(/^`|`$/g, '').trim();

export function checkConfigTable(page, ref) {
  const out = [];
  const table = referenceTable(page.text);
  if (!table) return [finding('config.table', page, 1, 'server.toml reference table', 'a table with `[Section]` | `Key` | type | default | env columns', 'not found')];
  const seen = new Map();
  for (const row of table.rows) {
    const [sec, key, type, def, env] = row.cells.map(strip);
    const section = sec.replace(/^\[|\]$/g, '');
    const claim = `[${section}] ${key}`;
    const entry = ref.entries.find((e) => e.section === section && e.key === key);
    if (!entry) {
      const elsewhere = ref.entries.find((e) => e.key === key);
      out.push(finding('config.table', page, row.line, claim, elsewhere ? `[${elsewhere.section}] ${key}` : 'no such key in Config.cpp', 'listed'));
      continue;
    }
    seen.set(claim, row.line);
    if (type !== entry.type) out.push(finding('config.table', page, row.line, `${claim} type`, entry.type, type));
    if (def !== entry.default) out.push(finding('config.table', page, row.line, `${claim} default`, entry.default, def));
    if (env !== entry.env) out.push(finding('config.table', page, row.line, `${claim} environment`, entry.env ?? '(none)', env));
  }
  for (const e of ref.entries) {
    const claim = `[${e.section}] ${e.key}`;
    if (!seen.has(claim)) out.push(finding('config.table', page, table.start, claim, `a row for ${claim} (${e.type}, default ${e.default}, ${e.env})`, 'missing'));
  }
  // The rows follow the order Config.cpp declares the keys in.
  const docOrder = table.rows.map((r) => `[${strip(r.cells[0]).replace(/^\[|\]$/g, '')}] ${strip(r.cells[1])}`).filter((c) => seen.has(c));
  const refOrder = ref.entries.map((e) => `[${e.section}] ${e.key}`).filter((c) => seen.has(c));
  const firstDiff = docOrder.findIndex((c, i) => c !== refOrder[i]);
  if (firstDiff >= 0) out.push(finding('config.table', page, seen.get(docOrder[firstDiff]), 'row order', refOrder[firstDiff], docOrder[firstDiff]));
  return out;
}

const headersOf = (block) => block.lines.map((l) => /^\[(\w+)\]\s*$/.exec(l.trim())).filter(Boolean).map((m) => m[1]);

// A ```toml block is the complete example when it opens at least half of the
// server.toml sections; anything smaller is a snippet.
const isCompleteExample = (block, ref) => headersOf(block).filter((s) => ref.sections.includes(s)).length * 2 >= ref.sections.length;

// The complete example server.toml: every key at its default, no key missing, none unknown.
export function checkConfigExample(page, ref) {
  const out = [];
  const block = codeBlocks(page.text).find((b) => /^toml/.test(b.info) && isCompleteExample(b, ref));
  if (!block) return out;
  let section = null;
  const seen = new Set();
  block.lines.forEach((raw, i) => {
    const line = block.start + 1 + i;
    const l = raw.trim();
    const sec = /^\[(\w+)\]$/.exec(l);
    if (sec) { section = sec[1]; if (!ref.sections.includes(section)) out.push(finding('config.example', page, line, `[${section}]`, 'a section Config.cpp writes', 'unknown section')); return; }
    const kv = /^(\w+)\s*=\s*(.+?)\s*$/.exec(l);
    if (!kv || !section) return;
    const entry = ref.entries.find((e) => e.section === section && e.key === kv[1]);
    const claim = `[${section}] ${kv[1]}`;
    if (!entry) { out.push(finding('config.example', page, line, claim, 'no such key in Config.cpp', kv[2])); return; }
    seen.add(claim);
    if (kv[2] !== entry.default) out.push(finding('config.example', page, line, `${claim} default`, entry.default, kv[2]));
  });
  for (const e of ref.entries) {
    const claim = `[${e.section}] ${e.key}`;
    if (!seen.has(claim)) out.push(finding('config.example', page, block.start, claim, `${e.key} = ${e.default} under [${e.section}]`, 'missing from the example'));
  }
  return out;
}

// A server.toml snippet on any page (a ```toml block under one of its section
// headers, short of the complete example): every key it sets exists in that section.
// The values are the page's to choose; tables that are not server.toml sections
// (a resource.toml's [server], db.toml) are left alone.
// A resource.toml (top-level name/version/type, or a [client]/[config] table) has a
// [server] table of its own, with `main`; it is not a server.toml snippet.
const isResourceManifest = (block) => {
  const firstTable = block.lines.findIndex((l) => /^\s*\[/.test(l));
  const top = firstTable < 0 ? block.lines : block.lines.slice(0, firstTable);
  return top.some((l) => /^\s*(name|version|type)\s*=/.test(l)) || block.lines.some((l) => /^\s*\[(client|config)\]\s*$/.test(l));
};

const legacySections = (ref) => new Set([...(ref.legacy?.keys() ?? [])].map((k) => /^\[(\w+)\]/.exec(k)[1]));

export function checkConfigSnippets(page, ref) {
  const out = [];
  const old = legacySections(ref);
  for (const block of codeBlocks(page.text)) {
    if (!/^toml/.test(block.info) || isCompleteExample(block, ref) || isResourceManifest(block)) continue;
    let section = null;
    block.lines.forEach((raw, i) => {
      const l = raw.trim();
      const sec = /^\[(\w+)\]$/.exec(l);
      if (sec && !ref.sections.includes(sec[1]) && old.has(sec[1])) {
        out.push(finding('config.snippet', page, block.start + 1 + i, `[${sec[1]}]`, 'a table of the current layout', 'a table of the old layout'));
      }
      if (sec) { section = ref.sections.includes(sec[1]) ? sec[1] : null; return; }
      const kv = /^(\w+)\s*=/.exec(l);
      if (!kv || !section) return;
      if (!ref.entries.some((e) => e.section === section && e.key === kv[1])) {
        const elsewhere = ref.entries.find((e) => e.key === kv[1]);
        out.push(finding('config.snippet', page, block.start + 1 + i, `[${section}] ${kv[1]}`, elsewhere ? `[${elsewhere.section}] ${kv[1]}` : 'a key Config.cpp declares', 'no such key'));
      }
    });
  }
  return out;
}

const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  одна: 1, одной: 1, две: 2, двух: 2, двумя: 2, три: 3, трёх: 3, трех: 3, тремя: 3, четыре: 4, четырёх: 4, четырех: 4, четырьмя: 4,
  пять: 5, пяти: 5, пятью: 5, шесть: 6, шести: 6, шестью: 6, семь: 7, семи: 7, семью: 7, восемь: 8, восьми: 8, восемью: 8, восьмью: 8,
  девять: 9, девяти: 9, девятью: 9, десять: 10, десяти: 10, десятью: 10,
};
// (`\b` is ASCII-only in JS, so Cyrillic words get explicit letter boundaries.)
const SECTIONS_RE = /(?<![\p{L}\d])(\d+|[a-z]+|[а-яё]+)\s+(sections?|секци(?:й|и|я|ями|ях|ю))(?![\p{L}])/giu;

// "eight sections - [General], ..." anywhere: the number and the enumerated
// names must be the sections Config.cpp writes.
export function checkSectionClaims(page, ref) {
  const out = [];
  const lines = page.text.split(/\r?\n/);
  const code = codeLineSet(page.text);
  lines.forEach((line, i) => {
    if (code.has(i + 1)) return;
    for (const m of line.matchAll(SECTIONS_RE)) {
      const word = m[1].toLowerCase();
      const n = /^\d+$/.test(word) ? Number(word) : NUMBER_WORDS[word];
      if (n === undefined) continue;
      const listed = [...line.matchAll(/`\[(\w+)\]`/g)].map((x) => x[1]);
      if (n !== ref.sections.length) out.push(finding('config.sections', page, i + 1, m[0], `${ref.sections.length} sections`, `${n}`));
      if (listed.length >= 2) {
        const missing = ref.sections.filter((s) => !listed.includes(s));
        const extra = listed.filter((s) => !ref.sections.includes(s));
        if (missing.length || extra.length) out.push(finding('config.sections', page, i + 1, m[0], ref.sections.map((s) => `[${s}]`).join(', '), listed.map((s) => `[${s}]`).join(', ')));
      }
    }
  });
  return out;
}

// resource.toml keys whose table shares a name with a server.toml table.
const RESOURCE_KEYS = new Set(['[server] main']);
// A table whose header says it lists the old names ("Before 1.9.0", "До 1.9.0").
const OLD_HEADER = /before|old|до |старо|прежн/i;

// `[Section] Key` mentions of a server.toml section, and NODE_* names, on any page
// must exist. A `[Section]` the server does not write belongs to another file
// (BeamNG's startup.ini has `[filesystem] UserPath`) and is left alone, except a
// name of the old layout (`[General] Map`), which is reported with its new name
// unless it sits in a table column headed as the old one; NODE_* identifiers of the
// SDK header (NODE_EXPORT, NODE_ABI_VERSION) are known names too.
export function checkConfigMentions(page, ref, known) {
  const out = [];
  const lines = page.text.split(/\r?\n/);
  const oldColumns = new Map(); // line -> cells under an old-names header
  for (const t of tables(page.text)) {
    const cols = t.header.map((h) => OLD_HEADER.test(h));
    if (cols.some(Boolean)) for (const r of t.rows) oldColumns.set(r.line, r.cells.filter((_, c) => cols[c]).join(' '));
  }
  lines.forEach((line, i) => {
    for (const span of inlineCode(line)) {
      const m = /^\[(\w+)\]\s+(\w+)$/.exec(span.text);
      if (!m) continue;
      if (ref.sections.includes(m[1])) {
        if (!RESOURCE_KEYS.has(span.text) && !ref.entries.some((e) => e.section === m[1] && e.key === m[2])) {
          const elsewhere = ref.entries.find((e) => e.key === m[2]);
          out.push(finding('config.mention', page, i + 1, span.text, elsewhere ? `[${elsewhere.section}] ${m[2]}` : 'a key Config.cpp reads', 'no such key'));
        }
      } else if (ref.legacy?.has(span.text) && !(oldColumns.get(i + 1) ?? '').includes(span.text)) {
        out.push(finding('config.legacy', page, i + 1, span.text, `${ref.legacy.get(span.text)} (the old layout's name only in a column headed as the old one)`, span.text));
      }
    }
    for (const m of line.matchAll(/\bNODE_[A-Z][A-Z0-9_]*\b/g)) {
      if (m[0].endsWith('_')) continue; // `NODE_DIRECTORY_*`, a family, not a name
      if (!known.has(m[0])) out.push(finding('config.env', page, i + 1, m[0], 'an environment name the server reads (or an SDK macro)', 'unknown'));
    }
  });
  return out;
}

export function checkConfig(pages, sources) {
  const out = [];
  const ref = sources.configReference;
  for (const page of pages) {
    if (/^hosting\/configuration\.mdx?$/.test(page.slug)) {
      out.push(...checkConfigTable(page, ref), ...checkConfigExample(page, ref));
    }
    out.push(...checkSectionClaims(page, ref), ...checkConfigMentions(page, ref, sources.envNames), ...checkConfigSnippets(page, ref));
  }
  return out;
}
