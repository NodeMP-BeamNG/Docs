import test from 'node:test';
import assert from 'node:assert/strict';
import { findStyleHits, measure, LIMITS } from './check-style.mjs';

const hitsFor = (text, path = 'ru/players/join.md') =>
  findStyleHits([{ path, text }]).map((h) => [h.rule, h.line, h.phrase]);
const rulesFor = (text, path) => hitsFor(text, path).map(([rule]) => rule);

// Ten words of plain text, so the densities below are easy to read off.
const filler = 'один два три четыре пять шесть семь восемь девять десять';
const page = (paragraphs) => `---\ntitle: Страница\n---\n\n${paragraphs.join('\n\n')}\n`;
// A page long enough that one odd paragraph does not tip a density limit by itself.
const diluted = (...paragraphs) => page([...paragraphs, ...Array(40).fill(filler)]);

test('measure counts prose only: not front matter, code, code spans or link targets', () => {
  const text = [
    '---', 'title: Заголовок — с тире', '---', '',
    'Слово — слово: **жирный** `a — b: c` [ссылка](https://example.com/a:b).', '',
    '```bash', 'echo "x — y: z" # **bold**', '```', '',
    ':::caution', 'Осторожно: тут.', ':::', '',
  ].join('\n');
  assert.deepEqual(measure(text), { words: 6, dashes: 1, colons: 2, bold: 1, admonitions: 1 });
});

test('a clean page has no hits', () => {
  assert.deepEqual(hitsFor(page([filler, `- ${filler}\n- ${filler}`])), []);
});

test('pages the rewrite has not reached, and English pages, are skipped', () => {
  const text = `Это важно отметить.\nИ перенос.`;
  assert.deepEqual(hitsFor(text, 'ru/plugins/events.md'), []);
  assert.deepEqual(hitsFor(text, 'players/join.md'), []);
});

test('a paragraph wrapped over several lines is reported once, at its first line', () => {
  assert.deepEqual(hitsFor(page([`${filler}\n${filler}\n${filler}`])).map(([rule, line]) => [rule, line]),
    [['wrapped paragraph', 5]]);
});

test('lists, tables, code blocks and headings next to text are not wrapping', () => {
  const text = page([
    `## Заголовок\n${filler}`,
    `1. ${filler}\n   \`\`\`bash\n   echo hi\n   \`\`\`\n2. ${filler}`,
    `| а | б |\n|---|---|\n| ${filler} | ${filler} |`,
  ]);
  assert.deepEqual(hitsFor(text), []);
});

test('a list item continued on the next line is wrapping', () => {
  assert.deepEqual(rulesFor(page([`- ${filler}\n  ${filler}`])), ['wrapped paragraph']);
});

test('banned phrases are reported with their line, whatever the case', () => {
  assert.deepEqual(hitsFor(diluted('Лаунчер является программой.', 'Важно отметить это.')).slice(0, 2),
    [['officialese', 5, 'является'], ['filler', 7, 'Важно отметить']]);
});

test('"данные" is a word, "данный" is not', () => {
  assert.deepEqual(rulesFor(page(['Сервер хранит данные игроков.'])), []);
  assert.deepEqual(rulesFor(page(['Данный сервер хранит данные.'])), ['officialese']);
});

test('signposting phrases and closing headings are reported', () => {
  assert.deepEqual(rulesFor(page(['В этом разделе вы узнаете всё.'])), ['signposting', 'signposting']);
  assert.deepEqual(hitsFor(page([filler, '## Что дальше', filler])), [['signposting', 7, '## Что дальше']]);
  assert.deepEqual(rulesFor(page(['Что дальше делать, решайте сами.'])), []);
});

test('the calque "держите кнопку" is reported, "нажмите и держите кнопку" is not', () => {
  assert.deepEqual(rulesFor(page(['Держите кнопку нажатой.'])), ['calque']);
  assert.deepEqual(rulesFor(page(['Нажмите и держите кнопку.'])), []);
});

test('English interface words are reported in prose and ignored in code', () => {
  assert.deepEqual(rulesFor(page(['Нажмите Connect.'])), ['English interface word']);
  assert.deepEqual(rulesFor(page(['Нажмите `Connect`.'])), []);
});

test('the glossary may name the English words beside the Russian ones', () => {
  assert.deepEqual(rulesFor(diluted('Прямое подключение (Direct Connect).'), 'ru/reference/glossary.md'), []);
  assert.deepEqual(rulesFor(diluted('Прямое подключение (Direct Connect).')), ['English interface word']);
});

test('phrases inside code blocks and code spans are not prose', () => {
  assert.deepEqual(rulesFor(page(['Напишите `является`.', '```text\nВажно отметить\n```'])), []);
});

test('dashes over the limit are reported with the measured density', () => {
  const dashed = Array(4).fill(`${filler} — ${filler}`);
  assert.deepEqual(hitsFor(page(dashed)).map(([rule]) => rule), ['dashes', 'dashes and colons']);
  assert.deepEqual(hitsFor(page(dashed))[0].slice(1), [1, '50.0 per 1000 words, limit 10']);
});

test('a dash swapped for a colon still counts: both together are capped', () => {
  const swapped = Array(4).fill(`${filler}: ${filler}`);
  assert.deepEqual(rulesFor(page(swapped)), ['dashes and colons']);
});

test('dashes and colons on separate paragraphs add up', () => {
  const colon = filler.replace(' ', ': ');
  const dash = filler.replace(' ', ' — ');
  const text = page([...Array(14).fill(colon), ...Array(3).fill(dash), ...Array(23).fill(filler)]);
  assert.deepEqual(rulesFor(text), ['dashes and colons']);
});

test('colons in code spans and link targets do not count', () => {
  const text = page(Array(4).fill(`${filler} \`a: b\` [x](http://example.com:30814/)`));
  assert.deepEqual(hitsFor(text), []);
});

test('bold spans over the limit are reported', () => {
  assert.deepEqual(rulesFor(page(Array(5).fill(`**${filler}**`))), ['bold spans']);
});

test('a bold lead-in with a dash is reported, interface names with a colon are not', () => {
  assert.deepEqual(rulesFor(diluted(`- **Кнопка** — ${filler}`)), ['bold lead-in']);
  assert.deepEqual(rulesFor(diluted(`- **Игроки**: ${filler}`, `- **Доступ**: ${filler}`)), []);
});

test('more admonitions than the limit are reported', () => {
  const box = (kind) => `:::${kind}\n${filler}\n:::`;
  assert.deepEqual(rulesFor(page(Array(LIMITS.admonitions).fill(box('caution')))), []);
  assert.deepEqual(rulesFor(page(Array(LIMITS.admonitions + 1).fill(box('note')))), ['admonitions']);
});

test('the limits are parameters', () => {
  const text = page(Array(4).fill(`${filler} — ${filler}`));
  const lenient = { ...LIMITS, dashes: 100, dashesAndColons: 100 };
  assert.deepEqual(findStyleHits([{ path: 'ru/players/join.md', text }], lenient), []);
});

test('the JSX of an .mdx page is not prose', () => {
  const text = `---\ntitle: Главная\n---\n\nimport Grid from './Grid.astro';\n\n<Grid\n  sections={[\n    { lede: 'А — б: в', links: [] },\n  ]}\n/>\n`;
  assert.deepEqual(hitsFor(text, 'ru/index.mdx'), []);
});
