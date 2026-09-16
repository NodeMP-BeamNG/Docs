// Check 4: event names on every page against sdk/api.toml -- canonical names and
// their deprecated aliases.
//
//   events.alias    an old name (an `aliases` entry) outside an allowed context;
//   events.unknown  an event-looking name that api.toml does not know;
//   events.mapping  `old` → `new` and "Before 1.2.0" table columns must pair an
//                   alias with its canonical name.
//
// Allowed contexts for an old name, precisely:
//   - a table cell in a column whose header matches ALIAS_HEADER (Before 1.2.0,
//     Formerly, Old name, Alias, Deprecated, BeamMP; RU: До 1.2.0, Прежнее имя,
//     Старое имя, Псевдоним, Устаревш...);
//   - prose whose paragraph (consecutive non-blank lines; a list item) contains
//     one of the ALIAS_MARKERS words (formerly, deprecated, alias, before 1.2.0,
//     pre-1.2.0, old name, renamed; RU: прежн, устаревш, псевдоним, до 1.2.0,
//     старое имя, переименован);
//   - a code-block line that itself carries one of those words (a `[deprecated]`
//     log line, a `-- formerly` comment).
import { tables, paragraphs, codeLineSet, inlineCode } from './md.mjs';

const finding = (check, page, line, claim, expected, actual) => ({ check, page: page.path, locale: page.locale, line, claim, expected, actual });

export const ALIAS_HEADER = /before 1\.2\.0|formerly|old name|alias|deprecated|beammp|до 1\.2\.0|прежн|старое|псевдоним|устаревш/i;
export const ALIAS_MARKERS = /formerly|deprecated|alias|before 1\.2\.0|pre-1\.2\.0|old name|renamed|прежн|устаревш|псевдоним|до 1\.2\.0|старое имя|переименован/i;

// Event-looking identifiers: the canonical prefixes with a hook-like ending.
const EVENT_LIKE = /^(?:player|vehicle|server|relay|resource)(?:[A-Z][A-Za-z]*)?(?:Request|Changed|Tick|Shutdown|Unload|Left|Reset|[a-z]ed)$/;
const ON_CALL = /\b(?:node\.on|node\.off|NodeMP\.on|register_\w*_event|unregister_\w*_event)\s*\(\s*["']([A-Za-z:<>…]+)["']/g;

export function eventIndex(events) {
  const canonical = new Set();
  const aliasOf = new Map();
  for (const e of events) {
    if (!/^[a-z][A-Za-z]+$/.test(e.name)) continue; // "<domain>:<verb>", "module channel", ...
    canonical.add(e.name);
    for (const a of e.aliases) aliasOf.set(a, e.name);
  }
  return { canonical, aliasOf };
}

// Candidate names on a line: backticked identifiers and quoted strings.
function candidates(line, inCode) {
  const out = [];
  if (inCode) {
    for (const m of line.matchAll(/["']([a-z][A-Za-z]+)["']/g)) out.push(m[1]);
  } else {
    for (const s of inlineCode(line)) {
      const t = s.text.replace(/^["']|["']$/g, '');
      if (/^[a-z][A-Za-z]+$/.test(t)) out.push(t);
      for (const m of t.matchAll(ON_CALL)) out.push(m[1]);
      for (const m of t.matchAll(/["']([a-z][A-Za-z]+)["']/g)) if (!out.includes(m[1])) out.push(m[1]);
    }
  }
  return out;
}

export function checkEvents(pages, sources) {
  const out = [];
  const { canonical, aliasOf } = eventIndex(sources.events);
  for (const page of pages) {
    const lines = page.text.split(/\r?\n/);
    const code = codeLineSet(page.text);
    const paras = paragraphs(page.text);
    const tbls = tables(page.text);
    const allowedByTable = new Map(); // line -> Set of names in alias columns
    for (const t of tbls) {
      const cols = t.header.map((h) => ALIAS_HEADER.test(h));
      if (!cols.some(Boolean)) continue;
      for (const row of t.rows) {
        const set = new Set();
        row.cells.forEach((c, i) => { if (cols[i]) for (const s of inlineCode(c)) set.add(s.text.replace(/\(.*$/, '').trim()); });
        allowedByTable.set(row.line, set);
      }
      // events.mapping: an alias column pairs each old name with its canonical name in the row.
      for (const row of t.rows) {
        row.cells.forEach((c, i) => {
          if (!cols[i] || /beammp/i.test(t.header[i])) return;
          for (const s of inlineCode(c)) {
            const old = s.text.trim();
            if (!aliasOf.has(old)) { if (/^[a-z][A-Za-z]+$/.test(old)) out.push(finding('events.mapping', page, row.line, old, 'a deprecated alias listed in api.toml', 'unknown alias')); return; }
            const canon = aliasOf.get(old);
            if (!row.cells.some((x, j) => j !== i && x.includes(canon))) out.push(finding('events.mapping', page, row.line, old, `the row names ${canon} (its canonical name in api.toml)`, 'not in the row'));
          }
        });
      }
    }
    lines.forEach((line, i) => {
      const ln = i + 1;
      const inCode = code.has(ln);
      // `old` → `new` pairs in prose.
      if (!inCode) {
        for (const m of line.matchAll(/`([a-z][A-Za-z]+)`\s*(?:→|->)\s*`([a-z][A-Za-z]+)`/g)) {
          if (aliasOf.has(m[1]) && aliasOf.get(m[1]) !== m[2]) out.push(finding('events.mapping', page, ln, `${m[1]} → ${m[2]}`, `${m[1]} → ${aliasOf.get(m[1])}`, `${m[1]} → ${m[2]}`));
          else if (!aliasOf.has(m[1]) && canonical.has(m[2]) && /^(?:on[A-Z]|player|vehicle|server|can)/.test(m[1])) out.push(finding('events.mapping', page, ln, `${m[1]} → ${m[2]}`, `an alias of ${m[2]} listed in api.toml`, `${m[1]} is not an alias`));
        }
      }
      const reported = new Set();
      for (const name of new Set(candidates(line, inCode))) {
        if (canonical.has(name)) continue;
        if (aliasOf.has(name)) {
          const allowed = inCode
            ? ALIAS_MARKERS.test(line)
            : (allowedByTable.get(ln)?.has(name)) || ALIAS_MARKERS.test(line) || paras.some((p) => p.start <= ln && ln <= p.end && ALIAS_MARKERS.test(p.text));
          if (!allowed) out.push(finding('events.alias', page, ln, name, `${aliasOf.get(name)} (the old name only in a "formerly"/"deprecated"/"Before 1.2.0" context)`, name));
          continue;
        }
        if (EVENT_LIKE.test(name)) { reported.add(name); out.push(finding('events.unknown', page, ln, name, 'an event name listed in api.toml', 'unknown')); }
      }
      // Event names inside on/off/register calls are events whatever they look like.
      if (inCode) {
        for (const m of line.matchAll(ON_CALL)) {
          const name = m[1];
          if (name.includes(':') || name.includes('<') || reported.has(name)) continue; // wire events are not in api.toml
          if (!canonical.has(name) && !aliasOf.has(name)) out.push(finding('events.unknown', page, ln, name, 'an event name listed in api.toml', 'unknown'));
        }
      }
    });
  }
  return out;
}
