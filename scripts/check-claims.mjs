#!/usr/bin/env node
// Claims-vs-code: the facts the pages state (config keys and defaults, the CLI
// help, kick and refusal texts, event names, versions, wire-protocol tables)
// against the code that defines them. A finding fails the check unless
// scripts/claims-allow.json lists it with a reason.
//
// Repositories (read-only; every one is on main in CI):
//   NODEMP_SERVER_DIR       ../server       Config.cpp, Settings.cpp, main.cpp, Network.cpp, wire_taxonomy.py
//   NODEMP_SDK_DIR          ../sdk          api.toml, node.h, lua/prelude.lua
//   NODEMP_LAUNCHER_DIR     ../launcher     Startup.cpp, Options.cpp, ModSync.cpp, exit codes
//   NODEMP_MOD_DIR          ../NodeMP       lua/ge/extensions/nodemp/api/sdk.lua (NodeMP.VERSION)
//   NODEMP_UI_LAUNCHER_DIR  ../UI-launcher  src/lib/joinErrors.ts, store.svelte.ts, src-tauri
// A missing repository skips the checks that need it, with a warning; under CI
// (or CHECK_CLAIMS_STRICT=1) it is an error.
//
// Options: --json (findings as JSON), --all (print allowlisted findings too).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from './lib/claims/sources.mjs';
import { checkConfig } from './lib/claims/config.mjs';
import { checkCli } from './lib/claims/cli.mjs';
import { checkKicks } from './lib/claims/kicks.mjs';
import { checkEvents } from './lib/claims/events.mjs';
import { checkVersions } from './lib/claims/versions.mjs';
import { checkProtocol } from './lib/claims/protocol.mjs';
import { makeDescriber } from './lib/claims/ui-copy.mjs';

// Generated API reference (scripts/import-api.mjs) is never checked, same as check-stale.
const GENERATED = /^(ru\/)?plugins\/api\//;

const posix = (p) => p.replace(/\\/g, '/');
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

export function walk(dir, test, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (!/^(node_modules|build|\.git|target|dist)$/.test(name)) walk(p, test, out); }
    else if (test(p)) out.push(p);
  }
  return out;
}

export function loadPages(root) {
  return walk(root, (p) => /\.(md|mdx)$/.test(p))
    .map((p) => posix(relative(root, p)))
    .filter((p) => !GENERATED.test(p))
    .sort()
    .map((path) => ({
      path,
      slug: path.replace(/^ru\//, ''),
      locale: path.startsWith('ru/') ? 'ru' : 'en',
      text: read(join(root, path)),
    }));
}

// Which checks need which repository.
export const NEEDS = {
  config: ['server'], cli: ['server'], kicks: ['server', 'sdk', 'launcher', 'ui'],
  events: ['sdk'], versions: [], protocol: ['server'],
};

export function loadSources(dirs, versions) {
  const have = (r) => existsSync(dirs[r]) && existsSync(join(dirs[r], REPO_MARKER[r]));
  const present = Object.fromEntries(Object.keys(dirs).map((r) => [r, have(r)]));
  const sources = { present, versions, codeVersions: {} };
  const templatesOf = (root, sub, ext, fn) => walk(join(root, sub), (p) => ext.test(p))
    .flatMap((p) => fn(read(p)).map((t) => ({ ...t, file: posix(relative(root, p)) })));

  if (present.server) {
    const d = dirs.server;
    sources.configReference = S.configReference(read(join(d, 'src/core/Config.cpp')), read(join(d, 'src/core/Settings.cpp')));
    const serverCpp = [...templatesOf(d, 'src', /\.cpp$/, S.cppTemplates), ...templatesOf(d, 'include', /\.h$/, S.cppTemplates)];
    sources.envNames = S.envNames(walk(join(d, 'src'), (p) => /\.cpp$/.test(p)).concat(walk(join(d, 'include'), (p) => /\.h$/.test(p))).map(read));
    // `NODE_*` identifiers of the SDK header count as known names (the sdk is
    // beside the server in every checkout that has the server).
    if (existsSync(join(dirs.sdk, 'node.h'))) for (const m of read(join(dirs.sdk, 'node.h')).matchAll(/\bNODE_[A-Z][A-Z0-9_]*\b/g)) sources.envNames.add(m[0]);
    sources.serverMain = S.parseServerMain(read(join(d, 'src/core/main.cpp')));
    sources.wire = S.parseWireTaxonomy(read(join(d, 'run/wire_taxonomy.py')));
    // Kick texts: arguments of ClientKick anywhere, plus Network.cpp's two indirections
    // (the `Why` a refused VerifyRequest carries, the AccountRequired constant).
    sources.kickTemplates = serverCpp.filter((t) => /ClientKick\(/.test(t.head)
      || (/net\/Network\.cpp$/.test(t.file) && /\bWhy\s*=|AccountRequired\s*=/.test(t.head)));
    sources.corpora = { server: serverCpp, launcher: [], ui: [] };
    sources.codeVersions.server = S.versionFrom('server', read(join(d, 'CMakeLists.txt')));
    sources.codeVersions.protocol = S.versionFrom('protocol', read(join(d, 'include/net/Protocol.h')));
    const gm = /integrity\/(\d+\.\d+\.\d+\.\d+)\.manifest/.exec(sources.serverMain.help || '');
    sources.codeVersions.helpGame = gm ? gm[1] : null;
  }
  if (present.sdk) {
    const d = dirs.sdk;
    sources.events = S.parseApiEvents(read(join(d, 'api.toml')));
    const prelude = join(d, 'lua/prelude.lua');
    if (existsSync(prelude)) {
      const lua = S.luaTemplates(read(prelude)).map((t) => ({ ...t, file: 'lua/prelude.lua' }));
      const src = read(prelude).split('\n');
      const kicks = lua.filter((t) => /kickPlayer\(|banPlayer\(/.test(src[t.line - 1] || ''));
      if (sources.corpora) sources.corpora.server.push(...lua);
      if (sources.kickTemplates) sources.kickTemplates.push(...kicks);
    }
    sources.codeVersions.abi = S.versionFrom('abi', read(join(d, 'node.h')));
  }
  if (present.launcher) {
    const d = dirs.launcher;
    const launcher = [...templatesOf(d, 'src', /\.cpp$/, S.cppTemplates), ...templatesOf(d, 'include', /\.h$/, S.cppTemplates)];
    if (sources.corpora) sources.corpora.launcher = launcher;
    sources.exitCodes = walk(join(d, 'src'), (p) => /\.cpp$/.test(p)).flatMap((p) => S.launcherExitCodes(read(p)).map((e) => ({ ...e, file: posix(relative(d, p)) })));
    sources.codeVersions.launcher = S.versionFrom('launcher', read(join(d, 'src/core/Startup.cpp')));
    const proto = join(d, 'include/net/Protocol.h');
    sources.codeVersions.protocolLauncher = existsSync(proto) ? S.versionFrom('protocol', read(proto)) : null;
  }
  if (present.mod) {
    sources.codeVersions.mod = S.versionFrom('mod', read(join(dirs.mod, 'lua/ge/extensions/nodemp/api/sdk.lua')));
  }
  if (present.ui) {
    const d = dirs.ui;
    const ui = [
      ...templatesOf(d, 'src', /\.(ts|svelte)$/, S.tsTemplates).filter((t) => !/\.test\.ts$/.test(t.file)),
      ...templatesOf(d, 'src-tauri/src', /\.rs$/, S.rustTemplates),
    ];
    if (sources.corpora) sources.corpora.ui = ui;
    sources.describe = makeDescriber(join(d, 'src/lib/joinErrors.ts'));
    sources.codeVersions.uiLauncher = S.versionFrom('uiLauncher', read(join(d, 'package.json')));
  }
  return sources;
}

const REPO_MARKER = { server: 'src/core/Config.cpp', sdk: 'api.toml', launcher: 'src/core/Startup.cpp', mod: 'lua/ge/extensions/nodemp/api/sdk.lua', ui: 'src/lib/joinErrors.ts' };

export const CHECKS = { config: checkConfig, cli: checkCli, kicks: checkKicks, events: checkEvents, versions: checkVersions, protocol: checkProtocol };

export function runChecks(pages, sources, only = Object.keys(CHECKS)) {
  const findings = [];
  const skipped = [];
  for (const name of only) {
    const missing = NEEDS[name].filter((r) => !sources.present[r]);
    if (missing.length) { skipped.push({ check: name, missing }); continue; }
    findings.push(...CHECKS[name](pages, sources));
  }
  return { findings, skipped };
}

// Allowlist entries: { check, claim, reason, page? } -- `page` is the slug without
// the locale prefix (one entry covers EN and RU); without it the entry applies to
// every page.
export function applyAllowlist(findings, allow) {
  const used = new Set();
  const failing = [];
  const allowed = [];
  for (const f of findings) {
    const slug = f.page.replace(/^ru\//, '');
    const i = allow.findIndex((a) => a.check === f.check && (!a.page || a.page === slug) && a.claim === f.claim);
    if (i >= 0) { used.add(i); allowed.push({ ...f, reason: allow[i].reason }); } else failing.push(f);
  }
  const unused = allow.filter((_, i) => !used.has(i));
  return { failing, allowed, unused };
}

export const format = (f) => `${f.page}:${f.line}: [${f.check}] ${f.claim} — expected: ${f.expected}; actual: ${f.actual}`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = new Set(process.argv.slice(2));
  const root = process.env.CHECK_CONTENT_DIR || 'src/content/docs';
  const dirs = {
    server: resolve(process.env.NODEMP_SERVER_DIR || '../server'),
    sdk: resolve(process.env.NODEMP_SDK_DIR || '../sdk'),
    launcher: resolve(process.env.NODEMP_LAUNCHER_DIR || '../launcher'),
    mod: resolve(process.env.NODEMP_MOD_DIR || '../NodeMP'),
    ui: resolve(process.env.NODEMP_UI_LAUNCHER_DIR || '../UI-launcher'),
  };
  const strict = Boolean(process.env.CI) || process.env.CHECK_CLAIMS_STRICT === '1';
  const versions = JSON.parse(read(process.env.CHECK_VERSIONS_FILE || 'src/content/versions.json'));
  const allowPath = process.env.CHECK_CLAIMS_ALLOW || 'scripts/claims-allow.json';
  const allow = existsSync(allowPath) ? JSON.parse(read(allowPath)) : [];

  const pages = loadPages(root);
  const sources = loadSources(dirs, versions);
  const absent = Object.entries(sources.present).filter(([, ok]) => !ok).map(([r]) => `${r} (${dirs[r]})`);
  if (absent.length && strict) {
    console.error(`check-claims: repositories missing: ${absent.join(', ')}; CI must have every one checked out`);
    process.exit(1);
  }
  const { findings, skipped } = runChecks(pages, sources);
  for (const s of skipped) console.warn(`check-claims: skipping ${s.check} (no ${s.missing.join(', ')} checkout)`);
  const { failing, allowed, unused } = applyAllowlist(findings, allow);
  for (const u of unused) console.warn(`check-claims: allowlist entry unused: [${u.check}] ${u.page}: ${u.claim}`);
  if (args.has('--json')) {
    console.log(JSON.stringify({ failing, allowed, skipped }, null, 2));
  } else {
    for (const f of failing) console.error(format(f));
    if (args.has('--all')) for (const f of allowed) console.log(`allowed: ${format(f)} (${f.reason})`);
  }
  const ran = Object.keys(CHECKS).filter((c) => !skipped.some((s) => s.check === c));
  (args.has('--json') ? console.error : console.log)(failing.length
    ? `check-claims: ${failing.length} finding(s), ${allowed.length} allowlisted`
    : `check-claims: clean (${pages.length} pages, ${ran.length} checks${allowed.length ? `, ${allowed.length} allowlisted` : ''})`);
  process.exit(failing.length ? 1 : 0);
}
