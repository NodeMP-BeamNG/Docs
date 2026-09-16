// Check 5: every version the docs state against src/content/versions.json, and
// versions.json against the code repos when they are checked out.
//
//   versions.docs  a mention on a page disagrees with versions.json
//   versions.code  versions.json disagrees with the code (CMakeLists.txt,
//                  Startup.cpp, package.json, sdk.lua, Protocol.h, node.h)
//
// A "mention" is one of the RECOGNIZERS below -- a component word next to a
// version, a release tag, an asset name, a table cell. Historical statements
// ("v17 added Identity", "launchers before 1.0.0") deliberately match none of
// them; what is checked is what the pages state as current.
import { inlineCode } from './md.mjs';

const finding = (check, page, line, claim, expected, actual) => ({ check, page: page.path, locale: page.locale, line, claim, expected, actual });

const V3 = String.raw`(\d+\.\d+\.\d+)(?!\.\d)`;
const V4 = String.raw`(\d+\.\d+\.\d+\.\d+)`;
// `\b` is ASCII-only in JS; these are letter boundaries that work for Cyrillic too.
const B = String.raw`(?<![\p{L}\d])`;
const E = String.raw`(?![\p{L}\d])`;
const re = (s) => new RegExp(s, 'giu');

// [key, regex, { proseOnly }] -- the first capture is the version.
export const RECOGNIZERS = [
  ['server', re(String.raw`${B}Node-Server\x60?\s*\x60?\s*${V3}`)],
  ['server', re(String.raw`${B}(?:server|сервер[а-яё]*)\s*\x60?\s*${V3}`)],
  ['server', re(String.raw`${B}server-v${V3}`)],
  ['server', re(String.raw`${B}Node-Server-${V3}-(?:linux|windows)`)],
  ['launcher', re(String.raw`${B}(?:launcher|helper|лаунчер[а-яё]*|хелпер[а-яё]*)\s*\x60?\s*${V3}`)],
  ['launcher', re(String.raw`${B}Node-Launcher\s+${V3}`)],
  ['launcher', re(String.raw`${B}launcher-v${V3}`)],
  ['launcher', re(String.raw`${B}NodeMP-Setup-${V3}\.exe`)],
  ['mod', re(String.raw`${B}(?:client mod|mod|клиентск[а-яё]+ мод[а-яё]*|мод[а-яё]*)\s*\x60?\s*${V3}`)],
  ['mod', re(String.raw`${B}mod-v${V3}`)],
  ['mod', re(String.raw`${B}NodeMP-${V3}\.zip`)],
  ['mod', re(String.raw`NodeMP\.VERSION\x60[^\x60\n]{0,40}\x60${V3}\x60`)],
  ['mod', re(String.raw`\x60${V3}\x60\s*\(\x60NodeMP\.VERSION\x60\)`)],
  // Table rows "| Game server (...) | 1.2.0 |": the component named in the cell before.
  ['server', re(String.raw`\|[^|\n]*(?:server|сервер)[^|\n]*\|\s*${V3}\s*\|`)],
  ['launcher', re(String.raw`\|[^|\n]*(?:launcher|лаунчер)[^|\n]*\|\s*${V3}\s*\|`)],
  ['mod', re(String.raw`\|[^|\n]*(?:client mod|мод)[^|\n]*\|\s*${V3}\s*\|`)],
  // Quoted messages may carry other versions ("launcher speaks v17"); only prose states the current one.
  ['protocol', re(String.raw`${B}(?:wire protocol|protocol|proto|wire|протокол[а-яё]*)\s+v(\d+)${E}`), { proseOnly: true }],
  ['protocol', re(String.raw`${B}(?:speaks?|understands?|говор[а-яё]+)\s+v(\d+)${E}`), { proseOnly: true }],
  ['protocol', re(String.raw`${B}(?:ProtoVersion|PROTO_VERSION)\s*=\s*(\d+)`)],
  ['protocol', re(String.raw`${B}proto (\d+)${E}`)],
  ['protocol', re(String.raw`(?:protocol|протокол)\s*\|\s*v(\d+)${E}`)],
  ['abi', re(String.raw`\(ABI (\d+\.\d+)\)`)],
  ['abi', re(String.raw`${B}C ABI\s*\|\s*\x60(\d+\.\d+)\x60`)],
  ['abi', re(String.raw`\x60NODE_ABI_VERSION_MAJOR\x60\s*\x60(\d+)\x60,\s*\x60MINOR\x60\s*\x60(\d+)\x60`)],
  ['abi', re(String.raw`this server speaks (\d+\.\d+)${E}`)],
  ['game', re(String.raw`${B}(?:BeamNG(?:\.drive)?|game|игр[а-яё]+)\s+${V4}`)],
  ['game', re(String.raw`${B}[Vv]ersion ${V4}`)],
  ['game', re(String.raw`${B}верси[а-яё]+ ${V4}`)],
  ['game', re(String.raw`${B}${V4}\.manifest${E}`)],
  ['dockerTag', re(String.raw`ghcr\.io\/nodemp-beamng\/server:([\w.-]+)`)],
];

function value(key, m) {
  if (key === 'abi' && m[2] !== undefined) return `${m[1]}.${m[2]}`;
  return m[1];
}

// All version mentions of a page: [{ key, value, line, claim }].
export function versionMentions(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const spans = inlineCode(line);
    const inSpan = (col) => spans.some((s) => col >= s.start && col < s.start + s.text.length + 2);
    const found = [];
    for (const [key, re, opts] of RECOGNIZERS) {
      for (const m of line.matchAll(re)) {
        if (opts?.proseOnly && inSpan(m.index)) continue;
        const v = value(key, m);
        if (key === 'dockerTag' && (v === 'latest' || /^sha-/.test(v))) continue;
        found.push({ key, value: v, line: i + 1, claim: m[0].trim(), start: m.index, end: m.index + m[0].length });
      }
    }
    // One mention per span: "Node-Server 1.2.0" also matches "Server 1.2.0"; keep the longer.
    for (const f of found) {
      if (found.some((g) => g !== f && g.key === f.key && g.start <= f.start && g.end >= f.end && (g.end - g.start > f.end - f.start))) continue;
      out.push({ key: f.key, value: f.value, line: f.line, claim: f.claim });
    }
  });
  return out;
}

export function checkVersionMentions(page, versions) {
  const out = [];
  for (const m of versionMentions(page.text)) {
    const want = String(versions[m.key]);
    if (m.value !== want) out.push(finding('versions.docs', page, m.line, m.claim, `${m.key} ${want} (src/content/versions.json)`, m.value));
  }
  return out;
}

// versions.json vs the code. `code` is { server, launcher, uiLauncher, mod, protocol,
// protocolLauncher, abi, helpGame } with nulls for repos that are not checked out.
export function checkVersionsAgainstCode(versions, code, page = { path: 'src/content/versions.json', locale: 'en' }) {
  const out = [];
  const cmp = (key, actualKey, where) => {
    const got = code[actualKey];
    if (got == null) return;
    if (String(got) !== String(versions[key])) out.push(finding('versions.code', page, 0, key, `${got} (${where})`, String(versions[key])));
  };
  cmp('server', 'server', 'server/CMakeLists.txt project VERSION');
  cmp('launcher', 'launcher', 'launcher/src/core/Startup.cpp LauncherVersion()');
  cmp('launcher', 'uiLauncher', 'UI-launcher/package.json version');
  cmp('mod', 'mod', 'NodeMP/lua/ge/extensions/nodemp/api/sdk.lua NodeMP.VERSION');
  cmp('protocol', 'protocol', 'server/include/net/Protocol.h ProtoVersion');
  cmp('protocol', 'protocolLauncher', 'launcher/include/net/Protocol.h ProtoVersion');
  cmp('abi', 'abi', 'sdk/node.h NODE_ABI_VERSION_MAJOR.MINOR');
  cmp('game', 'helpGame', 'server/src/core/main.cpp --help example (integrity/<game>.manifest)');
  if (versions.dockerTag !== `v${versions.server}`) out.push(finding('versions.code', page, 0, 'dockerTag', `v${versions.server} (the server CI tags the image with the git tag v<version>)`, String(versions.dockerTag)));
  return out;
}

export const VERSION_KEYS = ['server', 'launcher', 'mod', 'protocol', 'abi', 'game', 'dockerTag'];

export function checkVersions(pages, sources) {
  const out = [];
  const { versions } = sources;
  if (!versions) return out;
  const missing = VERSION_KEYS.filter((k) => versions[k] === undefined);
  if (missing.length) out.push({ check: 'versions.json', page: 'src/content/versions.json', locale: 'en', line: 0, claim: 'keys', expected: VERSION_KEYS.join(', '), actual: `missing ${missing.join(', ')}` });
  for (const page of pages) out.push(...checkVersionMentions(page, versions));
  if (sources.codeVersions) out.push(...checkVersionsAgainstCode(versions, sources.codeVersions));
  return out;
}
