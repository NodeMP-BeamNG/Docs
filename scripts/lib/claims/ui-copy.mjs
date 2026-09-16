// What the launcher interface shows for a server refusal. Evaluates
// UI-launcher/src/lib/joinErrors.ts in a child node (type stripping needs no
// build step) and caches the answers per text.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The interface's prefixes (UI-launcher src/lib/store.svelte.ts): an explained
// refusal is `Could not join · <headline>[ · <examplePath>]` during a join and
// `Session ended · <headline>` in the game; anything else is shown as the server
// wrote it, behind `Disconnected · ` (session.ts `step`).
export const JOIN_PREFIX = 'Could not join · ';
export const SESSION_PREFIX = 'Session ended · ';
export const RAW_PREFIX = 'Disconnected · ';

export function describeJoinFailures(joinErrorsPath, texts) {
  if (!texts.length) return [];
  const runner = fileURLToPath(new URL('./ui-copy-runner.mjs', import.meta.url));
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', runner, joinErrorsPath], {
    input: JSON.stringify(texts), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`ui-copy: could not evaluate ${joinErrorsPath}: ${(r.stderr || '').trim()}`);
  return JSON.parse(r.stdout);
}

// One child process for a whole batch: describe(text) after prefetch(texts).
export function makeDescriber(joinErrorsPath) {
  const cache = new Map();
  const prefetch = (texts) => {
    const fresh = [...new Set(texts)].filter((t) => !cache.has(t));
    const answers = describeJoinFailures(joinErrorsPath, fresh);
    fresh.forEach((t, i) => cache.set(t, answers[i]));
  };
  const describe = (text) => {
    if (!cache.has(text)) prefetch([text]);
    return cache.get(text);
  };
  return { prefetch, describe };
}

// The toast for a server text during a join.
export function joinToast(f) {
  if (!f || f.kind === 'other') return null;
  return JOIN_PREFIX + f.headline + (f.examplePath ? ' · ' + f.examplePath : '');
}
