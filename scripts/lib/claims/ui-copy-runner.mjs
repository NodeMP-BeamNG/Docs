#!/usr/bin/env node
// Runs the launcher interface's own refusal explainer (UI-launcher
// src/lib/joinErrors.ts, pure text in, structured advice out) on a list of
// server kick texts, so the checker can ask "what does the player actually see
// for this reason?" instead of keeping a copy of the rules.
//
// Started by ui-copy.mjs as `node --experimental-strip-types <this> <joinErrors.ts>`
// with the texts as a JSON array on stdin; prints a JSON array of
// { kind, headline, examplePath } in the same order.
import { pathToFileURL } from 'node:url';

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const texts = JSON.parse(chunks.join('') || '[]');
const mod = await import(pathToFileURL(process.argv[2]).href);
const out = texts.map((t) => {
  const f = mod.describeJoinFailure(t, {});
  return { kind: f.kind, headline: f.headline, examplePath: f.examplePath ?? null };
});
process.stdout.write(JSON.stringify(out));
