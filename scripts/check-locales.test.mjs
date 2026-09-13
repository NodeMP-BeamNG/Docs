import test from 'node:test';
import assert from 'node:assert/strict';
import { missingTwins } from './check-locales.mjs';

test('every EN page needs a RU twin at the same relative path', () => {
  const r = missingTwins(['players/install.md', 'ru/players/install.md', 'hosting/updating.md']);
  assert.deepEqual(r, { missingRu: ['hosting/updating.md'], orphanRu: [] });
});

test('RU pages without an EN original are orphans', () => {
  const r = missingTwins(['ru/players/legacy.md']);
  assert.deepEqual(r, { missingRu: [], orphanRu: ['ru/players/legacy.md'] });
});

test('the generated API directory is exempt in both locales', () => {
  const r = missingTwins(['plugins/api/lua.md', 'ru/plugins/api/index.md']);
  assert.deepEqual(r, { missingRu: [], orphanRu: [] });
});

test('index.mdx counts like any page and backslashes are normalised', () => {
  const r = missingTwins(['index.mdx', 'ru\\index.mdx']);
  assert.deepEqual(r, { missingRu: [], orphanRu: [] });
});
