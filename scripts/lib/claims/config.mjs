// Check 1: the server.toml reference in hosting/configuration.md against
// server/src/core/Config.cpp + Settings.cpp -- every section, key, type, default
// and NODE_* name; the example server.toml on the same page; "N sections" claims
// and `[Section] Key` / NODE_* mentions on every page.
import { tables, codeBlocks, codeLineSet, inlineCode } from './md.mjs';

const finding = (check, page, line, claim, expected, actual) => ({ check, page: page.path, locale: page.locale, line, claim, expected, actual });

// The reference table: the first table whose first column holds `[Section]` cells.
function referenceTable(text) {
  return tables(text).find((t) => t.rows.length && t.rows.every((r) => /^`\[\w+\]`$/.test(r.cells[0] || '')));
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
  // The rows follow the order the server writes the file in.
  const docOrder = table.rows.map((r) => `[${strip(r.cells[0]).replace(/^\[|\]$/g, '')}] ${strip(r.cells[1])}`).filter((c) => seen.has(c));
  const refOrder = ref.entries.map((e) => `[${e.section}] ${e.key}`).filter((c) => seen.has(c));
  const firstDiff = docOrder.findIndex((c, i) => c !== refOrder[i]);
  if (firstDiff >= 0) out.push(finding('config.table', page, seen.get(docOrder[firstDiff]), 'row order', refOrder[firstDiff], docOrder[firstDiff]));
  return out;
}

// The example server.toml (a ```toml block with [Section] headers): every key at
// its default, no key missing, none unknown.
export function checkConfigExample(page, ref) {
  const out = [];
  const block = codeBlocks(page.text).find((b) => /^toml/.test(b.info) && b.lines.some((l) => /^\[General\]/.test(l)));
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

// `[Section] Key` mentions of a server.toml section, and NODE_* names, on any page
// must exist. A `[Section]` the server does not write belongs to another file
// (BeamNG's startup.ini has `[filesystem] UserPath`) and is left alone; NODE_*
// identifiers of the SDK header (NODE_EXPORT, NODE_ABI_VERSION) are known names too.
export function checkConfigMentions(page, ref, known) {
  const out = [];
  const lines = page.text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const span of inlineCode(line)) {
      const m = /^\[(\w+)\]\s+(\w+)$/.exec(span.text);
      if (m && /^[A-Z]/.test(m[2]) && ref.sections.includes(m[1]) && !ref.entries.some((e) => e.section === m[1] && e.key === m[2])) {
        const elsewhere = ref.entries.find((e) => e.key === m[2]);
        out.push(finding('config.mention', page, i + 1, span.text, elsewhere ? `[${elsewhere.section}] ${m[2]}` : 'a key Config.cpp reads', 'no such key'));
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
    out.push(...checkSectionClaims(page, ref), ...checkConfigMentions(page, ref, sources.envNames));
  }
  return out;
}
