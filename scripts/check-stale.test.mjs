import test from 'node:test';
import assert from 'node:assert/strict';
import { findStale, findRuleHits, DEFAULT_PHRASES, DEFAULT_ALLOW } from './check-stale.mjs';

test('reports phrase, path and 1-based line', () => {
  const hits = findStale([{ path: 'a/b.md', text: 'ok\nNodeMP is BeamMP-compatible\n' }], ['BeamMP-compatible'], []);
  assert.deepEqual(hits, [{ path: 'a/b.md', line: 2, phrase: 'BeamMP-compatible' }]);
});

test('matching is case-insensitive and literal (brackets are not regex)', () => {
  const hits = findStale([{ path: 'x.md', text: 'paste into the [backend] section' }], ['[Backend]'], []);
  assert.equal(hits.length, 1);
});

test('allow-listed paths are skipped', () => {
  const files = [{ path: 'plugins/migrating.md', text: 'BeamMP-compatible? No.' }];
  assert.deepEqual(findStale(files, ['BeamMP-compatible'], [/plugins[\\/]migrating\.md$/]), []);
});

test('defaults cover the phase-4 list', () => {
  for (const p of ['BeamMP-compatible', 'ServerConfig.toml', '[Backend]', 'NODEMP_BACKEND_URL', 'backend-less', 'Resources/Server', 'NodeMP mesh', 'on the mesh', 'v12', 'v13']) {
    assert.ok(DEFAULT_PHRASES.includes(p), p);
  }
  assert.ok(DEFAULT_ALLOW.some((re) => re.test('src/content/docs/ru/plugins/migrating.md')));
});

const hitsFor = (path, text) => findRuleHits([{ path, text }]).map((h) => [h.rule, h.phrase, h.line]);

test('a product version is reported with its line, in either language', () => {
  assert.deepEqual(hitsFor('ru/players/install.md', 'Скачайте файл.\nПроверьте NodeMP-Setup-1.2.0.exe.'), [['product version', '1.2.0', 2]]);
  assert.deepEqual(hitsFor('players/install.md', 'Download the file.\nCheck NodeMP-Setup-1.2.0.exe.'), [['product version', '1.2.0', 2]]);
});

test('addresses, game versions and plugin versions are not product versions', () => {
  const text = '`203.0.113.10:30814`, BeamNG 0.39, `integrity\\0.39.4.0.manifest`, demo v1.0 loaded';
  assert.deepEqual(hitsFor('ru/players/join.md', text), []);
  assert.deepEqual(hitsFor('players/join.md', text), []);
});

test('the protocol version is allowed on the protocol page and in code spans', () => {
  assert.deepEqual(hitsFor('ru/reference/protocol.md', 'wire protocol v23'), []);
  assert.deepEqual(hitsFor('reference/protocol.md', 'wire protocol v23'), []);
  assert.deepEqual(hitsFor('ru/players/install.md', 'в сообщении `launcher speaks v22`'), []);
});

test('the protocol version in prose on another page is reported, across a line break too', () => {
  assert.deepEqual(hitsFor('ru/players/install.md', 'по сетевому протоколу\nv23'), [['protocol version', 'протоколу\nv23', 1]]);
  assert.deepEqual(hitsFor('players/install.md', 'the launcher speaks v23'), [['protocol version', 'speaks v23', 1]]);
});

test('ресурс is checked on Russian pages, and the Russian glossary may name it', () => {
  assert.deepEqual(hitsFor('ru/players/settings.md', 'ресурс сервера включил'), [['ресурс for плагин', 'ресурс', 1]]);
  assert.deepEqual(hitsFor('ru/reference/glossary.md', 'Ресурс'), []);
  assert.deepEqual(hitsFor('players/settings.md', 'ресурс'), []);
});

test('resource in English prose is reported, and the English glossary may name it', () => {
  assert.deepEqual(hitsFor('plugins/overview.md', 'Write a resource.\nTwo resources.'),
    [['resource for plugin', 'resource', 1], ['resource for plugin', 'resources', 2]]);
  assert.deepEqual(hitsFor('reference/glossary.md', 'Resource (ресурс)'), []);
  assert.deepEqual(hitsFor('ru/plugins/overview.md', 'resource'), []);
});

test('the code\'s own resource names pass in English, in code spans or not', () => {
  const text = '## resource.toml\nCopy it to resources/ and list it in [resources]; node.resources and resourceUnload too.\n`resource` and `the resources folder`.';
  assert.deepEqual(hitsFor('plugins/resources.md', text), []);
});

test('code blocks and doctest tags are not prose, and lines are still counted through them', () => {
  const text = '<!-- doctest: skip a resource -->\r\n```text\r\n1 resource · speaks v23\r\n```\r\nA resource.';
  assert.deepEqual(hitsFor('hosting/resources.md', text), [['resource for plugin', 'resource', 5]]);
});
