import test from 'node:test';
import assert from 'node:assert/strict';
import {
  apigenAnchor, headingMap, transformPage, placeholderPage, resolveGuideLinks, escapeAnglePlaceholders, yamlString,
  GUIDE_LINKS, GUIDE_TITLES, PAGE_TITLES,
} from './lib/api-transform.mjs';

test('apigenAnchor replicates apigen._md_anchor', () => {
  assert.equal(apigenAnchor('node.players -- the roster'), 'node-players-the-roster');
  assert.equal(apigenAnchor('Top level: events, sending, timers, coroutines'), 'top-level-events-sending-timers-coroutines');
  assert.equal(apigenAnchor('`node.on(name, fn)`'), 'node-on-name-fn');
});

test('headingMap maps apigen anchors to github-slugger ids, in document order with dedupe', () => {
  const md = '# T\n\n## node.players -- the roster\n\n### `node.on(name, fn)`\n\n### `node.on(name, fn)`\n';
  const m = headingMap(md);
  // Astro runs remark-smartypants before it ids headings: outside inline code
  // `--` becomes an em dash, which github-slugger drops (checked in dist/).
  assert.equal(m.get('node-players-the-roster'), 'nodeplayers--the-roster');
  assert.equal(m.get('node-on-name-fn'), 'nodeonname-fn'); // first occurrence wins
});

test('headingMap keeps hyphens inside inline code and runs longer than two hyphens, like Astro does', () => {
  const md = '### `node.players.get(id) -> Player?`\n\n## a --- b\n\n## c--d\n';
  const m = headingMap(md);
  assert.equal(m.get('node-players-get-id-player'), 'nodeplayersgetid---player');
  assert.equal(m.get('a-b'), 'a-----b');
  assert.equal(m.get('c-d'), 'cd');
});

test('headingMap: `--` inside inline code is exempt from smartypants', () => {
  const m = headingMap('## `x -- y`\n\n## `a`--`b`\n');
  assert.equal(m.get('x-y'), 'x----y');
  assert.equal(m.get('a-b'), 'ab');
});

test('headingMap matches the ids Astro emits (createMarkdownProcessor with the site defaults: gfm + smartypants)', async () => {
  const { createMarkdownProcessor } = await import('@astrojs/markdown-remark');
  const md = escapeAnglePlaceholders([
    '## node.players -- the roster', '### `node.on(name, fn)`', '## Player & Vehicle', '## Player <id>',
    '### `node.players.get(id) -> Player?`', '## `x -- y`', '## `a`--`b`', '## e --- f', '## c--d', '## Top level: events, sending, timers, coroutines',
  ].join('\n\n') + '\n');
  assert.ok(md.includes('Player &lt;id&gt;'));
  const processor = await createMarkdownProcessor({ syntaxHighlight: false });
  const { metadata } = await processor.render(md);
  assert.equal(metadata.headings.length, 10);
  assert.deepEqual(metadata.headings.map((h) => h.slug), [...headingMap(md).values()]);
});

test('headingMap and stripH1 ignore headings inside fenced code', () => {
  const md = '# Real title\n\n```bash\n# comment that looks like a heading\n## and another\n```\n\n~~~\n# tilde fence\n~~~\n\n## Real section\n';
  const m = headingMap(md);
  assert.deepEqual([...m.entries()], [['real-title', 'real-title'], ['real-section', 'real-section']]);
  const out = transformPage('c.md', md, {});
  assert.match(out.text, /^---\ntitle: Real title\n/);
  assert.ok(out.text.includes('```bash\n# comment that looks like a heading\n## and another\n```'), 'fence content untouched');
  assert.ok(out.text.includes('~~~\n# tilde fence\n~~~'));
});

test('escapeAnglePlaceholders: bare <name> tags outside code become entities, code and autolinks are untouched', () => {
  const md = [
    'Formats: "nodemp:<id>" and storage/<resource>.json.',
    'Shapes: `array<...>` and `resources/<name>/server/`.',
    '```lua', 'node.players.get("<id>")', '```',
    'See <https://example.com> and <ip:addr>.',
    '~~~', '"<id>" in a tilde fence', '~~~',
    '````', '```', '"<id>" inside a longer fence', '```', '````',
  ].join('\n');
  const out = escapeAnglePlaceholders(md).split('\n');
  assert.equal(out[0], 'Formats: "nodemp:&lt;id&gt;" and storage/&lt;resource&gt;.json.');
  assert.equal(out[1], 'Shapes: `array<...>` and `resources/<name>/server/`.');
  assert.equal(out[3], 'node.players.get("<id>")');
  assert.equal(out[5], 'See <https://example.com> and <ip:addr>.');
  assert.equal(out[7], '"<id>" in a tilde fence');
  assert.equal(out[11], '"<id>" inside a longer fence');
  assert.equal(escapeAnglePlaceholders(escapeAnglePlaceholders(md)), escapeAnglePlaceholders(md), 'idempotent');
});

test('transformPage escapes placeholders before anything else, and a heading with <id> still anchors', () => {
  const md = '# T\n\n- [p](#player-id)\n\n## Player <id>\n\nUse "nodemp:<id>" or `array<id>`.\n';
  const out = transformPage('lua.md', md, {});
  assert.ok(out.text.includes('## Player &lt;id&gt;'));
  assert.ok(out.text.includes('](#player-id)'));
  assert.ok(out.text.includes('"nodemp:&lt;id&gt;" or `array<id>`'));
});

test('transformPage: H1 becomes frontmatter, README becomes index, links and anchors are rewritten', () => {
  const lua = '# Lua API reference (`node`)\n\n## node.players -- the roster\n\ntext\n';
  const readme = '# NodeMP server API\n\nSee [lua.md](lua.md) and [roster](lua.md#node-players-the-roster), [raw](raw.md), [gs](guides/getting-started.md), [`sdk/api.toml`](../../sdk/api.toml).\n';
  const maps = { 'lua.md': headingMap(lua), 'raw.md': new Map(), 'c.md': new Map(), 'events.md': new Map(), 'README.md': headingMap(readme) };
  const out = transformPage('README.md', readme, maps);
  assert.equal(out.file, 'index.md');
  assert.match(out.text, /^---\ntitle: API reference\ndescription: .+\nsidebar:\n  order: 0\n---\n/);
  assert.ok(!/^# /m.test(out.text), 'no H1 left');
  assert.ok(out.text.includes('](/plugins/api/lua/)'));
  assert.ok(out.text.includes('](/plugins/api/lua/#nodeplayers--the-roster)'));
  assert.ok(out.text.includes('](/plugins/api/raw/)'));
  assert.ok(out.text.includes('](/plugins/getting-started/)'));
  assert.ok(out.text.includes('`sdk/api.toml`') && !out.text.includes('../../sdk/api.toml'));
});

test('transformPage: same-page anchors and titles without backticks', () => {
  const lua = '# Lua API reference (`node`)\n\n- [roster](#node-players-the-roster)\n\n## node.players -- the roster\n';
  const out = transformPage('lua.md', lua, { 'lua.md': headingMap(lua) });
  assert.equal(out.file, 'lua.md');
  assert.match(out.text, /^---\ntitle: Lua API reference \(node\)\n/);
  assert.ok(out.text.includes('](#nodeplayers--the-roster)'));
});

test('guide links fall back to an existing page until the guide is written', () => {
  const exists = (url) => url === '/plugins/events/';
  const links = resolveGuideLinks(exists);
  assert.equal(links['guides/events.md'], '/plugins/events/');
  assert.equal(links['guides/wire.md'], '/plugins/overview/');
  const md = '# T\n\n[e](guides/events.md) [w](guides/wire.md)\n';
  const out = transformPage('c.md', md, {}, links);
  assert.ok(out.text.includes('](/plugins/events/)') && out.text.includes('](/plugins/overview/)'));
  assert.ok(!out.text.includes('client-scripting'));
});

test('every guide link apigen emits has a target page', () => {
  for (const g of ['getting-started', 'resources', 'events', 'concurrency', 'wire', 'native-modules', 'recipes', 'conventions']) {
    assert.ok(GUIDE_LINKS[`guides/${g}.md`], g);
    assert.ok(GUIDE_TITLES[`guides/${g}.md`], `title for ${g}`);
  }
  assert.equal(GUIDE_LINKS['guides/wire.md'], '/plugins/client-scripting/');
  // typo guard: exactly the eight planned slugs, all absolute with a trailing slash
  const planned = ['/plugins/getting-started/', '/plugins/resources/', '/plugins/events/', '/plugins/concurrency/',
    '/plugins/client-scripting/', '/plugins/native-modules/', '/plugins/recipes/', '/plugins/conventions/'];
  assert.deepEqual(Object.values(GUIDE_LINKS).sort(), planned.sort());
  for (const u of Object.values(GUIDE_LINKS)) assert.match(u, /^\/plugins\/[a-z-]+\/$/);
});

test('link text that is a source file name becomes the target title', () => {
  const md = '# T\n\nSee [lua.md](lua.md), [guides/native-modules.md](guides/native-modules.md), [the roster](lua.md#x) and [gs](guides/events.md).\n';
  const out = transformPage('README.md', md, {});
  assert.ok(out.text.includes('[Lua API reference (node)](/plugins/api/lua/)'));
  assert.ok(out.text.includes('[Native modules](/plugins/native-modules/)'));
  assert.ok(out.text.includes('[the roster](/plugins/api/lua/#x)'), 'other link text is kept');
  assert.ok(out.text.includes('[gs](/plugins/events/)'));
  assert.equal(PAGE_TITLES['README.md'], 'API reference');
});

test('yamlString quotes what YAML would misread', () => {
  assert.equal(yamlString('Lua API reference (node)'), 'Lua API reference (node)');
  for (const s of ['a: b', '-x', '? y', 'true', 'False', 'null', '~', '42', '3.14', 'node.raw.*']) {
    assert.equal(yamlString(s), JSON.stringify(s), s);
  }
  assert.equal(yamlString('true story'), 'true story');
});

test('sidebar order: index, lua, raw, c, events (autogenerate would sort by file name)', () => {
  const order = (name) => /\nsidebar:\n  order: (\d+)\n/.exec(transformPage(name, '# T\n', {}).text)[1];
  assert.deepEqual(['README.md', 'lua.md', 'raw.md', 'c.md', 'events.md'].map(order), ['0', '1', '2', '3', '4']);
});

test('placeholder page is valid Starlight markdown', () => {
  assert.match(placeholderPage(), /^---\ntitle: API reference\n/);
});
