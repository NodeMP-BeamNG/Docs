import test from 'node:test';
import assert from 'node:assert/strict';
import { findStale, findRuleHits, DEFAULT_PHRASES, DEFAULT_ALLOW, RULES } from './check-stale.mjs';

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

test('a product version on a rewritten page is reported with its line', () => {
  assert.deepEqual(hitsFor('ru/players/install.md', 'Скачайте файл.\nПроверьте NodeMP-Setup-1.2.0.exe.'), [['product version', '1.2.0', 2]]);
});

test('addresses, game versions and plugin versions are not product versions', () => {
  const text = '`203.0.113.10:30814`, BeamNG 0.39, `integrity\\0.39.4.0.manifest`, demo v1.0 loaded';
  assert.deepEqual(hitsFor('ru/players/join.md', text), []);
});

test('the protocol version is allowed on the protocol page and in code spans', () => {
  assert.deepEqual(hitsFor('ru/reference/protocol.md', 'wire protocol v23'), []);
  assert.deepEqual(hitsFor('ru/players/install.md', 'в сообщении `launcher speaks v22`'), []);
});

test('the protocol version in prose on another page is reported, across a line break too', () => {
  assert.deepEqual(hitsFor('ru/players/install.md', 'по сетевому протоколу\nv23'), [['protocol version', 'протоколу\nv23', 1]]);
});

test('ресурс is checked on Russian pages only, and the glossary may name it', () => {
  assert.deepEqual(hitsFor('ru/players/settings.md', 'ресурс сервера включил'), [['ресурс for плагин', 'ресурс', 1]]);
  const glossary = [{ path: 'ru/reference/glossary.md', text: 'Ресурс' }];
  assert.deepEqual(findRuleHits(glossary, RULES, []), []);
  assert.deepEqual(findRuleHits([{ path: 'players/settings.md', text: 'a resource and 1.2.0' }], RULES, [])
    .map((h) => h.rule), ['product version']);
});

test('pages the rewrite has not reached are skipped', () => {
  const files = [{ path: 'ru/introduction/what-is-nodemp.md', text: 'Начиная с сервера 1.9.0 ресурс' }];
  const pending = [/^ru[\\/]introduction[\\/]/];
  assert.deepEqual(findRuleHits(files, RULES, pending), []);
  assert.deepEqual(findRuleHits(files, RULES, []).map((h) => h.rule), ['product version', 'ресурс for плагин']);
});
