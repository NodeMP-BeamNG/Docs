// Check 2: the `Node-Server --help` block in hosting/configuration.md against the
// help text in server/src/core/main.cpp, and every `Node-Server --flag` mention
// against the flags the server registers.
//
// The text is read from main.cpp rather than from a binary: the string is a
// constant the binary prints verbatim (WriteRaw), so the source is the same
// truth without a platform-specific download in CI. The Windows build in
// server/run/ was run once by hand to confirm the two are identical.
import { codeBlocks } from './md.mjs';

const finding = (check, page, line, claim, expected, actual) => ({ check, page: page.path, locale: page.locale, line, claim, expected, actual });

const normalize = (s) => s.replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '').replace(/[ \t]+$/gm, '');

// The block right after a line mentioning `--help` that starts with USAGE:.
export function checkHelpBlock(page, help) {
  const out = [];
  if (help == null) return out;
  const blocks = codeBlocks(page.text).filter((b) => b.lines.some((l) => /^USAGE:/.test(l.trim())) && b.lines.some((l) => /Node-Server/.test(l)));
  if (!blocks.length) return out;
  const expected = normalize(help);
  for (const block of blocks) {
    const actual = normalize(block.lines.join('\n'));
    if (actual === expected) continue;
    const exp = expected.split('\n');
    const act = actual.split('\n');
    let i = 0;
    while (i < exp.length && i < act.length && exp[i] === act[i]) i++;
    out.push(finding('cli.help', page, block.start + 1 + i, 'Node-Server --help block',
      i < exp.length ? exp[i] : '(end of the help text)', i < act.length ? act[i] : '(block ends early)'));
  }
  return out;
}

// `Node-Server --something` (prose or code) must be a flag main.cpp knows.
export function checkFlagMentions(page, flags) {
  const out = [];
  if (!flags || !flags.size) return out;
  const lines = page.text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/Node-Server(?:\.exe)?\s+(--[a-z][\w-]*)/g)) {
      if (!flags.has(m[1])) out.push(finding('cli.flag', page, i + 1, m[0], `one of ${[...flags].join(' ')}`, m[1]));
    }
  });
  return out;
}

export function checkCli(pages, sources) {
  const out = [];
  const { help, flags } = sources.serverMain || {};
  for (const page of pages) {
    out.push(...checkHelpBlock(page, help), ...checkFlagMentions(page, flags));
  }
  return out;
}
