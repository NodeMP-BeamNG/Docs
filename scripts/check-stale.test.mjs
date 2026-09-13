import test from 'node:test';
import assert from 'node:assert/strict';
import { findStale, DEFAULT_PHRASES, DEFAULT_ALLOW } from './check-stale.mjs';

test('reports phrase, path and 1-based line', () => {
  const hits = findStale([{ path: 'a/b.md', text: 'ok\nNodeMP is BeamMP-compatible\n' }], ['BeamMP-compatible'], []);
  assert.deepEqual(hits, [{ path: 'a/b.md', line: 2, phrase: 'BeamMP-compatible' }]);
});

test('matching is case-insensitive and literal (brackets are not regex)', () => {
  const hits = findStale([{ path: 'x.md', text: 'paste into the [backend] section' }], ['[Backend]'], []);
  assert.equal(hits.length, 1);
});

test('allow-listed paths are skipped', () => {
  const files = [{ path: 'introduction/differences-from-beammp.md', text: 'BeamMP-compatible? No.' }];
  assert.deepEqual(findStale(files, ['BeamMP-compatible'], [/differences-from-beammp\.md$/]), []);
});

test('defaults cover the phase-4 list', () => {
  for (const p of ['BeamMP-compatible', 'ServerConfig.toml', '[Backend]', 'NODEMP_BACKEND_URL', 'backend-less', 'Resources/Server', 'NodeMP mesh', 'on the mesh', 'v12', 'v13']) {
    assert.ok(DEFAULT_PHRASES.includes(p), p);
  }
  assert.ok(DEFAULT_ALLOW.some((re) => re.test('src/content/docs/ru/plugins/migrating.md')));
});
