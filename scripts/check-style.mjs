#!/usr/bin/env node
// Flags the machine patterns STYLE.md names on every page, in both languages: wrapped
// paragraphs, banned phrases and signposting (a list per language), too many dashes in a
// paragraph, and too many dashes, colons, bold spans and admonitions on a page.
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATED, pageLanguage, walk } from './check-stale.mjs';

// Per 1000 words outside code unless said otherwise, in both languages. Each limit sits at or
// just above the densest approved Russian players page.
export const LIMITS = {
  dashesPerParagraph: 2, // a line of prose, a list item or a table cell; players: 2 at most, both grammatical
  dashes: 10, // spaced dashes; the players pages have 5 at most
  dashesAndColons: 40, // both together, so a dash swapped for a colon still counts; players: 37 at most
  bold: 70, // players/settings, whose bold spans are all interface names, has 68
  admonitions: 2, // per page, as STYLE.md says
};

const word = (alternatives) => new RegExp(`(?<![\\p{L}])(?:${alternatives.join('|')})(?![\\p{L}])`, 'giu');

// Every pattern is a phrase STYLE.md lists; a hit means rewrite the sentence, not swap the word.
const RU_PHRASES = [
  { rule: 'filler', re: word(['важно отметить', 'стоит помнить', 'стоит отметить', 'обратите внимание', 'как правило', 'по сути', 'вовсе']) },
  {
    rule: 'officialese',
    re: word([
      'данн(?:ый|ая|ое|ого|ому|ой|ую|ом)', 'указанн\\p{L}+', 'вышеупомянут\\p{L}+', 'осуществл\\p{L}+',
      'производ(?:ить|ят|ится|ятся)', 'выполн(?:ять|ить|яет|яют) проверк\\p{L}*', 'является|являются|являться',
      'представля(?:ет|ют) собой', 'позволя(?:ет|ют|ть)|позволит', 'даёт возможность|дает возможность',
      'предоставля(?:ет|ют|ть)', 'рекомендуется', 'не просто[^.\\n]{1,80}, а',
    ]),
  },
  {
    rule: 'signposting',
    re: word([
      'в этом разделе', 'вы узнаете', 'дальше мы', 'далее мы', 'ниже (?:описан|перечислен|разобран|рассмотрен)\\p{L}*',
      'дальше раздел\\p{L}*', 'сначала о том', 'подведём итог', 'подведем итог', 'итак',
    ]),
  },
  {
    rule: 'calque',
    re: word(['без лишних движений', 'подробнее — на странице', '(?<!нажмите и )держите кнопку', 'ресурсы не делят переменные']),
  },
  // As a heading or a column title only: «всё, что видно игроку» is plain Russian.
  { rule: 'calque', re: /(?:^#{2,6}[ \t]+|\|[ \t]*)что видно(?![\p{L}])/gimu },
  // The glossary names the English words beside the Russian ones.
  { rule: 'English interface word', re: /(?<![\p{L}])(?:Leave|Direct Connect|Connect|Hold to play)(?![\p{L}])/gu, except: /reference[\\/]glossary\.md$/ },
];

const EN_PHRASES = [
  {
    rule: 'filler',
    re: word([
      'note that', "it(?: is|['’]s) important to", "it(?: is|['’]s) worth", 'allows? you to', 'in order to',
      'simply', 'just', 'easily', 'please',
    ]),
  },
  {
    rule: 'signposting',
    re: word([
      'in this section', 'this (?:page|section) (?:shows|explains|describes|covers)', 'below (?:we|you will)',
      'as mentioned (?:above|earlier|before)', "let['’]s", 'we will', 'you will learn', 'in summary', 'to sum up',
    ]),
  },
];

export const PHRASES = { ru: RU_PHRASES, en: EN_PHRASES };

const CLOSING_HEADINGS = {
  ru: /^#{2,6}\s*(?:Что дальше|Куда дальше|Вам сюда|Итог\p{L}*|Заключение|Резюме|Выводы?)\s*$/gimu,
  en: /^#{2,6}\s*(?:What['’]s next|What next|Next steps|Where to go next|Summary|Conclusion|Wrapping up)\s*$/gimu,
};
const BOLD = /\*\*[^*\n]+\*\*/g;
const BOLD_LEAD_IN = /^[ \t]*(?:[-*+]|\d+\.|\|)[ \t]*\*\*[^*\n]+\*\*[ \t]*[—–]/gm;

const blank = (s) => s.replace(/[^\n]/g, ' ');
const blockProse = (text) => text
  .replace(/\r\n/g, '\n')
  .replace(/^---\n[\s\S]*?\n---(?=\n|$)/, blank)
  .replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[^\n]*$/gm, blank)
  .replace(/<!--[\s\S]*?-->/g, blank)
  .replace(/^import .*$/gm, blank)
  .replace(/^<([A-Z]\w*)\b[\s\S]*?^(?:\/>|<\/\1>)/gm, blank);
const inlineProse = (text) => text.replace(/`[^`\n]*`/g, blank).replace(/\]\([^)\n]*\)/g, blank);
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

// Counts the page's prose: front matter, code blocks, code spans and link targets are left out.
export function measure(text) {
  const body = inlineProse(blockProse(text));
  const lines = body.replace(/^:::.*$/gm, '');
  return {
    words: (lines.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length,
    dashes: (lines.match(/ [—–] /g) ?? []).length,
    colons: (lines.match(/:(?=\s|$)/gm) ?? []).length,
    bold: (lines.match(BOLD) ?? []).length,
    admonitions: (body.match(/^:::[a-z]+/gm) ?? []).length,
  };
}

const perThousand = (n, words) => (words ? (n * 1000) / words : 0);
const isHeadingOrBlock = (l) => /^\s*(?:#|\||:::|>|<|\/>|import\s|export\s)/.test(l);
const isListItem = (l) => /^\s*(?:[-*+]|\d+[.)])\s/.test(l);

function wrappedParagraphs(blocks) {
  const lines = blocks.split('\n');
  const hits = [];
  let wrapping = false;
  lines.forEach((l, i) => {
    const next = lines[i + 1] ?? '';
    const continues = l.trim() !== '' && !isHeadingOrBlock(l) && next.trim() !== '' && !isHeadingOrBlock(next) && !isListItem(next);
    if (continues && !wrapping) hits.push({ line: i + 1, phrase: l.trim().slice(0, 50) });
    wrapping = continues;
  });
  return hits;
}

// Lines that carry more spaced dashes than the limit; a table row is judged cell by cell.
function crowdedDashes(prose, limit) {
  const hits = [];
  prose.split('\n').forEach((l, i) => {
    const cells = /^\s*\|/.test(l) ? l.split('|') : [l];
    const most = Math.max(...cells.map((c) => (c.match(/ [—–] /g) ?? []).length));
    if (most > limit) hits.push({ line: i + 1, count: most });
  });
  return hits;
}

export function findStyleHits(files, limits = LIMITS) {
  const hits = [];
  for (const { path, text } of files) {
    const lang = pageLanguage(path);
    const blocks = blockProse(text);
    const prose = inlineProse(blocks);
    const first = hits.length;
    const add = (line, rule, phrase) => hits.push({ path, line, rule, phrase });

    for (const h of wrappedParagraphs(blocks)) add(h.line, 'wrapped paragraph', h.phrase);
    for (const { rule, re, except } of PHRASES[lang]) {
      if (except?.test(path)) continue;
      for (const m of prose.matchAll(re)) add(lineOf(prose, m.index), rule, m[0]);
    }
    for (const m of prose.matchAll(CLOSING_HEADINGS[lang])) add(lineOf(prose, m.index), 'signposting', m[0].trim());
    for (const m of prose.matchAll(BOLD_LEAD_IN)) add(lineOf(prose, m.index), 'bold lead-in', m[0].trim());
    for (const h of crowdedDashes(prose, limits.dashesPerParagraph)) add(h.line, 'dashes in a paragraph', `${h.count}, limit ${limits.dashesPerParagraph}`);

    const n = measure(text);
    const density = (what, value, limit, unit = 'per 1000 words') => {
      if (value > limit) add(1, what, `${value.toFixed(1)} ${unit}, limit ${limit}`);
    };
    density('dashes', perThousand(n.dashes, n.words), limits.dashes);
    density('dashes and colons', perThousand(n.dashes + n.colons, n.words), limits.dashesAndColons);
    density('bold spans', perThousand(n.bold, n.words), limits.bold);
    density('admonitions', n.admonitions, limits.admonitions, 'on the page');
    hits.push(...hits.splice(first).sort((a, b) => a.line - b.line));
  }
  return hits;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = process.env.CHECK_CONTENT_DIR || 'src/content/docs';
  const files = walk(root)
    .map((p) => relative(root, p))
    .filter((p) => !GENERATED.test(p.replace(/\\/g, '/')))
    .map((p) => ({ path: p, text: readFileSync(join(root, p), 'utf8') }));
  const hits = findStyleHits(files);
  for (const h of hits) console.error(`${h.path}:${h.line}: ${h.rule} "${h.phrase}"`);
  console.log(hits.length ? `check-style: ${hits.length} hit(s)` : `check-style: clean (${files.length} files)`);
  process.exit(hits.length ? 1 : 0);
}
