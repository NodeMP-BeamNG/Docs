// Markdown helpers shared by the claims checks: fenced code blocks, pipe tables,
// paragraphs and inline code spans, all with 1-based line numbers so a finding
// can point at the line a human has to fix.

// Every fenced code block: { start, end, info, lines } where start/end are the
// 1-based lines of the fences and lines is the content between them.
export function codeBlocks(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  let open = null;
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*(`{3,}|~{3,})(.*)$/.exec(lines[i]);
    if (!open) {
      if (m) open = { start: i + 1, fence: m[1], info: m[2].trim(), lines: [] };
    } else if (m && m[1][0] === open.fence[0] && m[1].length >= open.fence.length && m[2].trim() === '') {
      out.push({ start: open.start, end: i + 1, info: open.info, lines: open.lines });
      open = null;
    } else {
      open.lines.push(lines[i]);
    }
  }
  return out;
}

// A Set of 1-based line numbers that are inside a fenced code block (fences included).
export function codeLineSet(text) {
  const set = new Set();
  for (const b of codeBlocks(text)) for (let l = b.start; l <= b.end; l++) set.add(l);
  return set;
}

// Splits one table row into trimmed cells. `\|` is a literal pipe; a pipe inside a
// backtick span does not split (GitHub would, but the pages escape those anyway).
export function splitRow(line) {
  const cells = [];
  let cur = '';
  let ticks = 0; // length of the backtick run that opened the current span, 0 = none
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\' && line[i + 1] === '|') { cur += '|'; i++; continue; }
    if (c === '`') {
      let n = 1;
      while (line[i + n] === '`') n++;
      if (ticks === 0) ticks = n;
      else if (ticks === n) ticks = 0;
      cur += '`'.repeat(n);
      i += n - 1;
      continue;
    }
    if (c === '|' && ticks === 0) { cells.push(cur); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur);
  // Leading and trailing pipes produce empty edge cells.
  if (cells.length && cells[0].trim() === '') cells.shift();
  if (cells.length && cells[cells.length - 1].trim() === '') cells.pop();
  return cells.map((c) => c.trim());
}

const isDelimiterRow = (line) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line);

// Every pipe table: { start, header: [cells], rows: [{ line, cells }] }. A table is a
// header line, a delimiter line and any number of rows, outside code blocks.
export function tables(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  const code = codeLineSet(text);
  for (let i = 0; i + 1 < lines.length; i++) {
    const ln = i + 1;
    if (code.has(ln) || !lines[i].includes('|') || !isDelimiterRow(lines[i + 1])) continue;
    const t = { start: ln, header: splitRow(lines[i]), rows: [] };
    let j = i + 2;
    for (; j < lines.length && lines[j].trim().startsWith('|'); j++) {
      t.rows.push({ line: j + 1, cells: splitRow(lines[j]) });
    }
    out.push(t);
    i = j - 1;
  }
  return out;
}

// Paragraph of a line: the block of consecutive non-blank lines around it that are
// not table rows or code. Returns the joined text (for "does the surrounding prose
// say formerly/deprecated" questions).
export function paragraphs(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  const code = codeLineSet(text);
  let cur = null;
  const flush = () => { if (cur) { out.push(cur); cur = null; } };
  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1;
    const blank = lines[i].trim() === '';
    if (blank || code.has(ln) || lines[i].trim().startsWith('|') || /^\s*#/.test(lines[i])) { flush(); continue; }
    // A new list item starts a new paragraph even without a blank line.
    if (cur && /^\s*(?:[-*+]|\d+\.)\s+/.test(lines[i]) && !/^\s+/.test(lines[i])) flush();
    if (!cur) cur = { start: ln, end: ln, text: lines[i] };
    else { cur.end = ln; cur.text += '\n' + lines[i]; }
  }
  flush();
  return out;
}

// Inline code spans of one line: [{ text, start }], start = 0-based column of the
// first backtick. Handles ``double`` spans (a span may then contain single backticks).
export function inlineCode(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] !== '`') { i++; continue; }
    let n = 1;
    while (line[i + n] === '`') n++;
    const close = line.indexOf('`'.repeat(n), i + n);
    if (close < 0) { i += n; continue; }
    // With a longer closing run the span is unbalanced; take the exact run.
    let end = close;
    while (line[end + n] === '`') end++;
    let body = line.slice(i + n, close);
    if (n > 1) body = body.trim();
    out.push({ text: body, start: i });
    i = end + n;
  }
  return out;
}

// 1-based line number of the first line containing `needle` (or 0).
export function lineOf(text, needle) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) if (lines[i].includes(needle)) return i + 1;
  return 0;
}
