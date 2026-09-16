// Check 3: the texts a failed join shows, on players/troubleshooting.md and
// reference/error-codes.md, against the code that prints them:
//   kick.text         a quoted server refusal (the Reason column, `Disconnected · X`,
//                     `Session ended · X`) is a literal of the server (or, for the
//                     helper's own session errors, of the launcher);
//   kick.shown        a refusal the launcher interface rewrites (joinErrors.ts) is
//                     documented with the words the player sees;
//   kick.undocumented every ClientKick text of the server has a row in error-codes;
//   kick.exit         helper exit-code rows: the log line exists and the code matches;
//   kick.quoted       every other quoted message in those tables exists somewhere in
//                     the server, launcher or launcher-interface code.
import { tables, inlineCode, codeLineSet } from './md.mjs';
import { W } from './sources.mjs';
import { joinToast, JOIN_PREFIX, SESSION_PREFIX, RAW_PREFIX } from './ui-copy.mjs';

const finding = (check, page, line, claim, expected, actual) => ({ check, page: page.path, locale: page.locale, line, claim, expected, actual });

// --- matching -------------------------------------------------------------------

// Docs text -> template: `…` and `...` are wildcards; whitespace runs collapse,
// and a space next to a wildcard is absorbed by it (a template ending in ": "
// is trimmed by the compiler-side reader, the docs write ": …").
export function docTemplate(s) {
  return norm(s.replace(/…|\.\.\./g, W));
}
const WILD = new RegExp(W, 'g');
const norm = (s) => s.replace(/\s+/g, ' ').trim().replace(new RegExp(` ?${W} ?`, 'g'), W);
// Letters a template has once wildcards and spaces are gone: a template of
// nothing but placeholders would match everything.
const substance = (s) => s.replace(WILD, '').replace(/\s+/g, '');

// Can two templates with wildcards describe the same string?
export function compatible(a, b) {
  const memo = new Map();
  const go = (i, j) => {
    if (i === a.length && j === b.length) return true;
    const key = i * (b.length + 1) + j;
    if (memo.has(key)) return memo.get(key);
    let r = false;
    if (i < a.length && a[i] === W) r = go(i + 1, j) || (j < b.length && go(i, j + 1));
    if (!r && j < b.length && b[j] === W) r = go(i, j + 1) || (i < a.length && go(i + 1, j));
    if (!r && i < a.length && j < b.length && a[i] === b[j] && a[i] !== W) r = go(i + 1, j + 1);
    memo.set(key, r);
    return r;
  };
  return go(0, 0);
}

// Whole-text: the quoted text is one instance of the template.
export function matchesWhole(doc, templates) {
  const d = docTemplate(doc);
  return templates.find((t) => substance(t.text).length >= 2 && compatible(d, norm(t.text)));
}
// Starts-with: log lines are quoted from their beginning, and often assembled from
// a literal plus values, so both sides may continue.
export function matchesPrefix(doc, templates) {
  const d = docTemplate(doc) + W;
  return templates.find((t) => substance(t.text).length >= 4 && compatible(d, norm(t.text) + W));
}

// --- what the pages quote ---------------------------------------------------------

// The table right after the first heading matching `re`.
export function tableAfterHeading(text, re) {
  const lines = text.split(/\r?\n/);
  const h = lines.findIndex((l) => /^#{2,3}\s/.test(l) && re.test(l));
  if (h < 0) return null;
  const level = /^(#+)/.exec(lines[h])[1].length;
  let next = lines.findIndex((l, i) => i > h && new RegExp(`^#{1,${level}}\\s`).test(l));
  if (next < 0) next = lines.length;
  return tables(text).find((t) => t.start > h + 1 && t.start < next + 1) || null;
}

// Spans of a cell as full messages: a span starting with `… ` borrows the
// `Prefix · ` of the cell's first span.
export function cellMessages(cell) {
  const spans = inlineCode(cell).map((s) => s.text);
  const lead = spans[0] && /^(.+? · )/.exec(spans[0]);
  return spans.map((s) => (lead && /^… /.test(s) ? lead[1] + s.slice(2) : s));
}

// Player-visible message -> the server/helper text inside it, when prefixed.
function serverTextOf(message) {
  for (const p of [RAW_PREFIX, SESSION_PREFIX]) if (message.startsWith(p) && message.length > p.length) return { prefix: p, text: message.slice(p.length) };
  return null;
}

const REFUSAL_HEADING = /refusal|kick|отказ|кик/i;
const EXIT_HEADING = /exit code|коды выхода/i;

// Substitute the docs' own placeholders with sample values before asking the
// interface how it would explain the text.
const sampled = (s) => s.replace(/\b[NM]\b/g, '3').replace(/…/g, '...');

// Every server text the page quotes: the Reason column of the refusals table
// (error-codes), and every `Disconnected · X` / `Session ended · X` span anywhere
// outside code blocks (tables and prose alike).
export function collectServerTexts(page) {
  const out = [];
  const refusals = /reference\/error-codes\.mdx?$/.test(page.slug) ? tableAfterHeading(page.text, REFUSAL_HEADING) : null;
  if (refusals) {
    for (const row of refusals.rows) for (const s of inlineCode(row.cells[0] || '')) out.push({ text: s.text, line: row.line, row: row.cells.join(' | '), inRefusalTable: true });
  }
  const code = codeLineSet(page.text);
  page.text.split(/\r?\n/).forEach((line, i) => {
    if (code.has(i + 1)) return;
    for (const m of cellMessages(line)) {
      const st = serverTextOf(m);
      if (st) out.push({ text: st.text, prefix: st.prefix, line: i + 1, row: line, inRefusalTable: false, shown: m });
    }
  });
  return out;
}

// --- the checks -------------------------------------------------------------------

export function checkKickTexts(page, serverTexts, corpora) {
  const out = [];
  const templates = [...corpora.server, ...corpora.launcher];
  for (const s of serverTexts) {
    if (s.text.length < 4) continue;
    if (!matchesWhole(s.text, templates)) out.push(finding('kick.text', page, s.line, s.text, 'a refusal text the server (Network.cpp and friends) or the helper prints', 'no such literal'));
  }
  return out;
}

export function checkShown(page, serverTexts, describe) {
  const out = [];
  for (const s of serverTexts) {
    const f = describe(sampled(s.text));
    if (!f || f.kind === 'other') continue;
    if (s.inRefusalTable) {
      if (!s.row.includes(f.headline)) {
        out.push(finding('kick.shown', page, s.line, s.text, `the row quotes what the launcher shows: \`${JOIN_PREFIX}${f.headline}\` (joinErrors.ts, ${f.kind})`, 'the row does not mention it'));
      }
    } else {
      const expected = (s.prefix === SESSION_PREFIX ? SESSION_PREFIX : JOIN_PREFIX) + f.headline;
      out.push(finding('kick.shown', page, s.line, s.shown, `${expected}${s.prefix === RAW_PREFIX && f.examplePath ? ' · <path>' : ''} (the launcher rewrites this refusal, joinErrors.ts ${f.kind})`, s.shown));
    }
  }
  return out;
}

export function checkUndocumented(page, serverTexts, kickTemplates) {
  const out = [];
  const docs = serverTexts.filter((s) => s.inRefusalTable).map((s) => docTemplate(s.text));
  for (const t of kickTemplates) {
    const text = norm(t.text);
    if (substance(text).length < 6) continue;
    if (!docs.some((d) => compatible(d, text))) {
      out.push(finding('kick.undocumented', page, 0, text.replace(WILD, '…'), `a row in the refusals table (${t.file}:${t.line})`, 'missing'));
    }
  }
  return out;
}

export function checkExitCodes(page, corpora, exitCodes) {
  const out = [];
  if (!/reference\/error-codes\.mdx?$/.test(page.slug)) return out;
  const table = tableAfterHeading(page.text, EXIT_HEADING);
  if (!table) return out;
  for (const row of table.rows) {
    const code = Number((row.cells[0] || '').replace(/`/g, '').trim());
    if (Number.isNaN(code)) continue;
    for (const s of inlineCode(row.cells[1] || '')) {
      if (s.text.length < 6 || /^--/.test(s.text)) continue;
      const hit = matchesPrefix(s.text, corpora.launcher);
      if (!hit) { out.push(finding('kick.exit', page, row.line, s.text, 'a log line of the launcher (launcher/src)', 'no such literal')); continue; }
      const codes = exitCodes.filter((e) => substance(e.text).length >= 4 && compatible(docTemplate(s.text) + W, norm(e.text) + W)).map((e) => e.code);
      if (codes.length && !codes.includes(code)) out.push(finding('kick.exit', page, row.line, s.text, `exit code ${[...new Set(codes)].join(' or ')}`, `${code}`));
    }
  }
  return out;
}

// Fragments of a quoted message worth looking up: split at wildcards, the
// `Prefix · ` separator, N/M placeholders and numbers; a fragment that starts
// with a path piece (`…\NodeMP.zip.part was interrupted:`) loses the path, which
// is a value the docs spelled out; keep the long ones.
export function fragments(message) {
  return docTemplate(message).split(new RegExp(`${W}|·|\\b[NM]\\b|\\d+`))
    .map((f) => f.trim().replace(/^[\\/]\S*\s*/, ''))
    .filter((f) => f.length >= 12);
}

// A fragment is known when some literal piece contains it, or when it begins
// with a literal piece that a value then continues (`Could not reach NodeMP at `
// + the URL).
export function checkQuoted(page, corpora, already) {
  const out = [];
  const pool = [...new Set([...corpora.server, ...corpora.launcher, ...corpora.ui].flatMap((t) => t.text.split(W).map((p) => p.trim())).filter((p) => p.length >= 4))];
  const isKnown = (frag) => pool.some((p) => p.includes(frag) || (p.length >= 12 && frag.startsWith(p)));
  for (const t of tables(page.text)) {
    const codeColumn = t.rows.length && t.rows.every((r) => /^`?\d+`?$/.test(r.cells[0] || ''));
    const col = codeColumn ? 1 : 0;
    for (const row of t.rows) {
      for (const m of cellMessages(row.cells[col] || '')) {
        if (!/\s/.test(m.trim()) || already.has(`${row.line}:${m}`)) continue;
        for (const frag of fragments(m)) {
          if (!isKnown(frag)) out.push(finding('kick.quoted', page, row.line, m, `"${frag}" printed by the server, the helper or the launcher interface`, 'not found in any of them'));
        }
      }
    }
  }
  return out;
}

export function checkKicks(pages, sources) {
  const out = [];
  const relevant = pages.filter((p) => /^(players\/troubleshooting|reference\/error-codes)\.mdx?$/.test(p.slug));
  const perPage = relevant.map((p) => ({ page: p, texts: collectServerTexts(p) }));
  if (sources.describe) sources.describe.prefetch(perPage.flatMap((x) => x.texts.map((t) => sampled(t.text))));
  for (const { page, texts } of perPage) {
    // Spans judged by the precise rules are not looked up again by kick.quoted.
    const already = new Set(texts.map((t) => `${t.line}:${t.shown ?? t.text}`));
    out.push(...checkKickTexts(page, texts, sources.corpora));
    if (sources.describe) out.push(...checkShown(page, texts, sources.describe.describe));
    if (/error-codes/.test(page.slug)) {
      out.push(...checkUndocumented(page, texts, sources.kickTemplates));
      const exitTable = tableAfterHeading(page.text, EXIT_HEADING);
      if (exitTable) for (const row of exitTable.rows) for (const s of inlineCode(row.cells[1] || '')) already.add(`${row.line}:${s.text}`);
      out.push(...checkExitCodes(page, sources.corpora, sources.exitCodes));
    }
    out.push(...checkQuoted(page, sources.corpora, already));
  }
  return out;
}
