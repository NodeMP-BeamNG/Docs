import test from 'node:test';
import assert from 'node:assert/strict';
import { apigenAnchor, headingMap, transformPage, placeholderPage, resolveGuideLinks, GUIDE_LINKS } from './lib/api-transform.mjs';

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

test('transformPage: H1 becomes frontmatter, README becomes index, links and anchors are rewritten', () => {
  const lua = '# Lua API reference (`node`)\n\n## node.players -- the roster\n\ntext\n';
  const readme = '# NodeMP server API\n\nSee [lua.md](lua.md) and [roster](lua.md#node-players-the-roster), [raw](raw.md), [gs](guides/getting-started.md), [`sdk/api.toml`](../../sdk/api.toml).\n';
  const maps = { 'lua.md': headingMap(lua), 'raw.md': new Map(), 'c.md': new Map(), 'events.md': new Map(), 'README.md': headingMap(readme) };
  const out = transformPage('README.md', readme, maps);
  assert.equal(out.file, 'index.md');
  assert.match(out.text, /^---\ntitle: API reference\ndescription: .+\n---\n/);
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
  }
  assert.equal(GUIDE_LINKS['guides/wire.md'], '/plugins/client-scripting/');
});

test('placeholder page is valid Starlight markdown', () => {
  assert.match(placeholderPage(), /^---\ntitle: API reference\n/);
});
