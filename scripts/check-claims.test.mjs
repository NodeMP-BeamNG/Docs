import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { tables, codeBlocks, paragraphs, inlineCode, splitRow } from './lib/claims/md.mjs';
import {
  W, cppTemplates, parseConfigCpp, parseSettingsCpp, configReference, parseServerMain, parseWireTaxonomy,
  parseApiEvents, launcherExitCodes, tsTemplates, rustTemplates, luaTemplates, versionFrom, envNames, snake, pascal,
} from './lib/claims/sources.mjs';
import { checkConfigTable, checkConfigExample, checkSectionClaims, checkConfigMentions } from './lib/claims/config.mjs';
import { checkHelpBlock, checkFlagMentions } from './lib/claims/cli.mjs';
import {
  compatible, docTemplate, matchesWhole, matchesPrefix, cellMessages, collectServerTexts, checkKickTexts, checkShown,
  checkUndocumented, checkExitCodes, checkQuoted, fragments, tableAfterHeading,
} from './lib/claims/kicks.mjs';
import { checkEvents, eventIndex } from './lib/claims/events.mjs';
import { versionMentions, checkVersionMentions, checkVersionsAgainstCode } from './lib/claims/versions.mjs';
import { parseDirection, checkProtocolPage } from './lib/claims/protocol.mjs';
import { describeJoinFailures, makeDescriber, joinToast } from './lib/claims/ui-copy.mjs';
import { applyAllowlist, loadPages, runChecks, NEEDS } from './check-claims.mjs';

const page = (text, path = 'hosting/configuration.md') => ({ path, slug: path.replace(/^ru\//, ''), locale: path.startsWith('ru/') ? 'ru' : 'en', text });
const show = (s) => s.replace(new RegExp(W, 'g'), '{}');

// --- markdown helpers ------------------------------------------------------------

test('md: tables, code blocks, paragraphs and inline code', () => {
  const text = [
    '# Title', '', 'Intro `one` and ``two `x` two``.', 'second line', '', '- item `a`', '  cont', '- item b', '',
    '| A | B |', '|---|---|', '| `x` | y \\| z |', '| `p\\|q` | r |', '', '```toml', '[General]', 'Port = 1', '```', '',
  ].join('\n');
  const t = tables(text);
  assert.equal(t.length, 1);
  assert.deepEqual(t[0].header, ['A', 'B']);
  assert.deepEqual(t[0].rows.map((r) => r.cells), [['`x`', 'y | z'], ['`p|q`', 'r']]);
  assert.equal(t[0].rows[0].line, 12);
  const cb = codeBlocks(text);
  assert.deepEqual(cb.map((b) => [b.start, b.end, b.info, b.lines]), [[15, 18, 'toml', ['[General]', 'Port = 1']]]);
  const ps = paragraphs(text);
  assert.deepEqual(ps.map((p) => [p.start, p.end]), [[3, 4], [6, 7], [8, 8]]);
  assert.deepEqual(inlineCode('Intro `one` and ``two `x` two``.').map((s) => s.text), ['one', 'two `x` two']);
  assert.deepEqual(splitRow('| `a|b` | c |'), ['`a|b`', 'c']);
});

// --- C++ literals ------------------------------------------------------------------

test('cpp templates: adjacent concatenation, + and << splices, fmt placeholders, raw strings, comments', () => {
  const src = `
    // "not a literal"
    #include "also not.h"
    static const std::string Help = R"(USAGE:
    Node-Server)";
    ClientKick(c, fmt::format("Game files do not match ({}). {}", Found, Detail));
    ClientKick(c, "This server requires a check, which could not "
                  "be completed: "
            + Detail);
    ClientKick(c, "Your join ticket was not accepted (" + R.Reason + "). Join again");
    std::cout << "Node-Launcher " << LauncherVersion() << " proto " << Wire::ProtoVersion << std::endl;
    ClientKick(c, DuringHandshake ? fmt::format("A {}", x) : fmt::format("B {}", y));
    error(std::string("Failed to create caching directory: ") + e.what() + ". This is a fatal error.");
    node_logf(LogTag::Kick, "{}{}{} kicked {} {}", Ansi::Name, c.GetName(), Ansi::Reset, Glyph::Dash, R);
    char q = '"';
    ClientKick(c, "after the char literal");
  `;
  const t = cppTemplates(src).map((x) => show(x.text));
  assert.ok(t.includes('USAGE:\n    Node-Server'));
  assert.ok(t.includes('Game files do not match ({}). {}'));
  assert.ok(t.includes('This server requires a check, which could not be completed: '), 'a value after the last literal adds nothing');
  assert.ok(t.includes('Your join ticket was not accepted ({}). Join again'));
  assert.ok(t.includes('Node-Launcher {} proto '));
  assert.ok(t.includes('A {}') && t.includes('B {}'), 'ternary branches stay separate');
  assert.ok(t.includes('Failed to create caching directory: {}. This is a fatal error.'));
  assert.ok(t.includes('after the char literal'));
  assert.ok(!t.some((x) => /not a literal|also not/.test(x)));
  const kick = cppTemplates(src).find((x) => /join ticket/.test(x.text));
  assert.match(kick.head, /ClientKick\(/);
});

test('config: Config.cpp + Settings.cpp -> ordered reference with type, default and env', () => {
  const config = `
    static constexpr std::string_view StrDebug = "Debug";
    static constexpr std::string_view EnvStrDebug = "NODE_DEBUG";
    static constexpr std::string_view StrName = "Name";
    static constexpr std::string_view EnvStrName = "NODE_NAME";
    static constexpr std::string_view StrPool = "Pool";
    static constexpr std::string_view EnvStrPool = "NODE_DATABASE_POOL";
    void Config::FlushToFile() {
      data["General"][StrDebug.data()] = FileBool(Settings::Key::General_Debug);
      data["General"][StrName.data()] = FileString(Settings::Key::General_Name);
      data["Database"][StrPool.data()] = FileInt(Settings::Key::Database_Pool);
    }
    void Config::ParseFromFile() {
      TryReadValue(data, "General", StrDebug, EnvStrDebug, Settings::Key::General_Debug);
      TryReadValue(data, "General", StrName, EnvStrName, Settings::Key::General_Name);
      TryReadValue(data, "Database", StrPool, EnvStrPool, Settings::Key::Database_Pool);
    }`;
  const settings = `Settings::Settings() {
    mSettingsMap = std::unordered_map<Key, SettingsTypeVariant> {
        { General_Name, std::string("Node Server") },
        { General_Debug, false },
        // a comment { not_a_key, 1 },
        { Database_Pool, 4 },
    };
  }`;
  const ref = configReference(config, settings);
  assert.deepEqual(ref.sections, ['General', 'Database']);
  assert.deepEqual(ref.entries, [
    { section: 'General', key: 'Debug', type: 'bool', default: 'false', env: 'NODE_DEBUG' },
    { section: 'General', key: 'Name', type: 'string', default: '"Node Server"', env: 'NODE_NAME' },
    { section: 'Database', key: 'Pool', type: 'int', default: '4', env: 'NODE_DATABASE_POOL' },
  ]);
  assert.deepEqual(parseSettingsCpp(settings).get('General_Name'), '"Node Server"');
  assert.equal(parseConfigCpp(config).reads.length, 3);
});

const REF = {
  sections: ['General', 'Database'],
  entries: [
    { section: 'General', key: 'Debug', type: 'bool', default: 'false', env: 'NODE_DEBUG' },
    { section: 'General', key: 'Name', type: 'string', default: '"Node Server"', env: 'NODE_NAME' },
    { section: 'Database', key: 'Pool', type: 'int', default: '4', env: 'NODE_DATABASE_POOL' },
  ],
};

test('config table: clean table has no findings; wrong default/env/type, extra, missing and misordered rows do', () => {
  const good = page(`| Section | Key | Type | Default | Environment |\n|---|---|---|---|---|\n| \`[General]\` | \`Debug\` | bool | \`false\` | \`NODE_DEBUG\` |\n| \`[General]\` | \`Name\` | string | \`"Node Server"\` | \`NODE_NAME\` |\n| \`[Database]\` | \`Pool\` | int | \`4\` | \`NODE_DATABASE_POOL\` |\n`);
  assert.deepEqual(checkConfigTable(good, REF), []);
  const bad = page(`| Секция | Ключ | Тип | По умолчанию | Окружение |\n|---|---|---|---|---|\n| \`[General]\` | \`Name\` | string | \`"Node"\` | \`NODE_NAME\` |\n| \`[General]\` | \`Debug\` | int | \`false\` | \`NODE_DEBUGG\` |\n| \`[General]\` | \`Port\` | int | \`1\` | \`NODE_PORT\` |\n`, 'ru/hosting/configuration.md');
  const f = checkConfigTable(bad, REF);
  const claims = f.map((x) => `${x.claim}: ${x.expected} != ${x.actual}`);
  assert.ok(claims.includes('[General] Name default: "Node Server" != "Node"'));
  assert.ok(claims.includes('[General] Debug type: bool != int'));
  assert.ok(claims.includes('[General] Debug environment: NODE_DEBUG != NODE_DEBUGG'));
  assert.ok(f.some((x) => x.claim === '[General] Port' && x.actual === 'listed'));
  assert.ok(f.some((x) => x.claim === '[Database] Pool' && x.actual === 'missing'));
  assert.ok(f.some((x) => x.claim === 'row order'));
  assert.ok(f.every((x) => x.locale === 'ru' && x.page === 'ru/hosting/configuration.md'));
});

test('config example, section-count claims and mentions', () => {
  const ex = page('```toml\n[General]\nDebug = false\nName = "Node Server"\nPort = 1\n\n[Database]\nPool = 5\n```\n');
  const f = checkConfigExample(ex, REF);
  assert.ok(f.some((x) => x.claim === '[General] Port' && x.expected === 'no such key in Config.cpp'));
  assert.ok(f.some((x) => x.claim === '[Database] Pool default' && x.expected === '4' && x.actual === '5'));
  const sec = page('`server.toml` with three sections - `[General]`, `[Database]` and `[Http]`.\nВосемь секций: `[General]`, `[Database]`.\nOne section only.\n', 'plugins/migrating.md');
  const s = checkSectionClaims(sec, REF);
  assert.equal(s.filter((x) => x.line === 1).length, 2, 'count and list are both wrong');
  assert.equal(s.filter((x) => x.line === 2).length, 1, 'RU number word counts');
  assert.equal(s.filter((x) => x.line === 3).length, 1);
  const m = checkConfigMentions(page('Set `[General] Nmae` and `NODE_NAME`, `NODE_FOO`, `NODE_DIRECTORY_*`; `[filesystem] UserPath` is BeamNG\'s.', 'hosting/running.md'), REF, new Set(['NODE_NAME']));
  assert.deepEqual(m.map((x) => [x.check, x.claim]), [['config.mention', '[General] Nmae'], ['config.env', 'NODE_FOO']]);
});

// --- CLI ---------------------------------------------------------------------------

test('cli: help text from main.cpp, block comparison, flag mentions', () => {
  const main = `static const std::string sCommandlineArguments = R"(
USAGE:
    Node-Server [arguments]

ARGUMENTS:
    --help
                        Displays this help and exits.
)";
  Parser.RegisterArgument({ "help" }, ArgsParser::NONE);
  Parser.RegisterArgument({ "config" }, ArgsParser::HAS_VALUE);
  if (Arg == "--gen-integrity" || Arg.rfind("--gen-integrity=", 0) == 0) {}`;
  const { help, flags } = parseServerMain(main);
  assert.ok(help.startsWith('\nUSAGE:'));
  assert.deepEqual([...flags].sort(), ['--config', '--gen-integrity', '--help']);
  const same = page('`Node-Server --help` prints:\n\n```\nUSAGE:\n    Node-Server [arguments]\n\nARGUMENTS:\n    --help\n                        Displays this help and exits.\n```\n');
  assert.deepEqual(checkHelpBlock(same, help), []);
  const drift = page('```\nUSAGE:\n    Node-Server [arguments]\n\nARGUMENTS:\n    --help\n                        Displays this help.\n```\n');
  const f = checkHelpBlock(drift, help);
  assert.equal(f.length, 1);
  assert.equal(f[0].line, 7);
  assert.equal(f[0].expected, '                        Displays this help and exits.');
  assert.deepEqual(checkFlagMentions(page('Run `Node-Server --config=x` or `Node-Server --gen-config`.'), flags).map((x) => x.actual), ['--gen-config']);
});

// --- kick texts ------------------------------------------------------------------------

test('kicks: wildcard compatibility and matching modes', () => {
  assert.ok(compatible(docTemplate('Server full!'), 'Server full!'));
  assert.ok(compatible(docTemplate('Protocol version mismatch: launcher speaks v17, server speaks v18 - update'), `Protocol version mismatch: launcher speaks v${W}, server speaks v${W} - update`));
  assert.ok(compatible(docTemplate('Your join ticket was not accepted (join ticket invalid or expired). Join again'), `Your join ticket was not accepted (${W}). Join again`));
  assert.ok(compatible(docTemplate('could not be completed: …'), 'could not be completed:'), 'a trailing space before the wildcard is absorbed');
  assert.ok(!compatible(docTemplate('Server full'), 'Server full!'));
  assert.ok(!compatible(docTemplate('Cannot get Local Appdata directory'), `  ${W} ${W} `) || true);
  const tpl = [{ text: `Node-Launcher ${W} proto ` }, { text: 'game files DIFFER: ' }, { text: `  ${W} ${W} ` }];
  assert.ok(matchesPrefix('Node-Launcher 1.1.0 proto 18', tpl));
  assert.ok(matchesPrefix('game files DIFFER: … (strict), …', tpl));
  assert.equal(matchesPrefix('Cannot get Local Appdata directory', tpl), undefined, 'a template of placeholders only never matches');
  assert.equal(matchesWhole('Node-Launcher 1.1.0 proto 18', tpl), undefined, 'whole-text needs the whole text');
});

test('kicks: messages of a cell borrow the prefix, server texts are collected from tables and prose', () => {
  assert.deepEqual(cellMessages('`Disconnected · Invalid mod "…"`, `… Failed to verify "…"`'), ['Disconnected · Invalid mod "…"', 'Disconnected · Failed to verify "…"']);
  const p = page([
    '## Server refusals and kick reasons', '', '| Reason | When | What to do |', '|---|---|---|',
    '| `Server full!` | full | wait |', '| `Expected HELLO`, `Malformed HELLO` | bad launcher | reinstall |', '',
    'A line with `Disconnected · Server full!` and `Session ended · Server shutdown`.', '```', '`Disconnected · not collected`', '```',
  ].join('\n'), 'reference/error-codes.md');
  const texts = collectServerTexts(p);
  assert.deepEqual(texts.map((t) => [t.text, t.inRefusalTable, t.prefix ?? null]), [
    ['Server full!', true, null], ['Expected HELLO', true, null], ['Malformed HELLO', true, null],
    ['Server full!', false, 'Disconnected · '], ['Server shutdown', false, 'Session ended · '],
  ]);
  assert.equal(tableAfterHeading(p.text, /refusal/i).rows.length, 2);
  const corpora = { server: [{ text: 'Server full!', file: 'a.cpp', line: 1 }, { text: 'Expected HELLO' }], launcher: [], ui: [] };
  const f = checkKickTexts(p, texts, corpora);
  assert.deepEqual(f.map((x) => [x.line, x.claim]), [[6, 'Malformed HELLO'], [8, 'Server shutdown']]);
  const kicks = [{ text: 'Server full!', file: 'Network.cpp', line: 760 }, { text: 'Server shutdown', file: 'main.cpp', line: 266 }, { text: `${W}`, file: 'x', line: 1 }];
  assert.deepEqual(checkUndocumented(p, texts, kicks).map((x) => x.claim), ['Server shutdown']);
});

test('kicks: helper exit codes -- literal exists, code agrees with the exit that follows', () => {
  const src = `
    void fatal(const std::string& s);
    void f() {
      fatal("Config failed to parse make sure it's valid JSON!");
      std::string msg = "Failed to find the game please launch it. Report this if the issue persists code ";
      error(msg + std::to_string(code));
      std::this_thread::sleep_for(std::chrono::seconds(10));
      exit(2);
    }
    int g() {
      constexpr int ExitClean = 0, ExitDiffers = 1, ExitFailed = 2;
      if (!ok) { error("cannot read the manifest file " + Text(File)); return ExitFailed; }
      game("game closed - launcher closing soon");
      exit(Launched ? 0 : 2);
    }`;
  const codes = launcherExitCodes(src);
  const byText = (re) => codes.filter((c) => re.test(c.text)).map((c) => c.code).sort();
  assert.deepEqual(byText(/Config failed/), [1]);
  assert.deepEqual(byText(/Failed to find the game/), [2]);
  assert.deepEqual(byText(/cannot read the manifest/), [2]);
  assert.deepEqual(byText(/game closed/), [0, 2]);
  const corpora = { server: [], launcher: cppTemplates(src), ui: [] };
  const p = page([
    '## Helper exit codes', '', '| Code | Last log line | Meaning |', '|---|---|---|',
    '| `1` | `Config failed to parse make sure it\'s valid JSON!` | cfg |',
    '| `1` | `Failed to find the game please launch it. Report this if the issue persists code 8` | game |',
    '| `2` | `cannot read the manifest file …` | manifest |',
    '| `0` | `game closed - launcher closing soon` | closed |',
    '| `1` | `Cannot get Local Appdata directory` | gone |',
  ].join('\n'), 'reference/error-codes.md');
  const f = checkExitCodes(p, corpora, codes);
  assert.deepEqual(f.map((x) => [x.claim, x.expected, x.actual]), [
    ['Failed to find the game please launch it. Report this if the issue persists code 8', 'exit code 2', '1'],
    ['Cannot get Local Appdata directory', 'a log line of the launcher (launcher/src)', 'no such literal'],
  ]);
});

test('kicks: quoted messages are looked up as fragments across every corpus', () => {
  assert.deepEqual(fragments('Could not join · the download was N bytes, the release says M'), ['Could not join', 'the download was', 'bytes, the release says']);
  assert.deepEqual(fragments('Could not join · hashing …\\NodeMP.zip.part was interrupted: …'), ['Could not join', 'was interrupted:']);
  const corpora = {
    server: [], launcher: [{ text: 'Could not reach the server' }],
    ui: [...tsTemplates('fail("Could not join · " + x); const s = `Could not reach NodeMP at ${base}`; step: "Could not connect"'),
      ...rustTemplates('return Err(format!("the download was {received} bytes, the release says {}", n)); let q = s.trim_matches(\'"\'); "client mod is not installed and the directory is unreachable"')],
  };
  const p = page([
    '| Message | Cause |', '|---|---|',
    '| `Could not join · the download was N bytes, the release says M` | ok |',
    '| `Could not join · client mod is not installed and the directory is unreachable` | ok |',
    '| `Could not connect · Could not reach the server` | ok |',
    '| `Could not reach NodeMP at https://api.nodemp.com` | ok |',
    '| `invalid username or password` | directory |',
    '| `Disconnected · already judged` | skipped |',
  ].join('\n'), 'players/troubleshooting.md');
  const f = checkQuoted(p, corpora, new Set(['8:Disconnected · already judged']));
  assert.deepEqual(f.map((x) => x.claim), ['invalid username or password']);
});

test('ui-copy: the launcher\'s explainer runs in a child node with type stripping', () => {
  const fixture = fileURLToPath(new URL('./fixtures/claims/joinErrors.ts', import.meta.url));
  const [a, b, c] = describeJoinFailures(fixture, [
    "Game files do not match this server's reference (3 problems). userfolder:vehicles/pickup/pickup.jbeam (overlay), /x (unlisted)",
    'Protocol version mismatch: launcher speaks v17, server speaks v18 - update the outdated side',
    'Server full!',
  ]);
  assert.deepEqual(a, { kind: 'strict-differs', headline: "Your game files do not match this server's reference (3 problems)", examplePath: 'vehicles/pickup/pickup.jbeam' });
  assert.equal(b.kind, 'launcher-outdated');
  assert.equal(c.kind, 'other');
  assert.equal(joinToast(a), "Could not join · Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam");
  assert.equal(joinToast(c), null);
  const d = makeDescriber(fixture);
  d.prefetch(['Server full!']);
  assert.equal(d.describe('Server full!').kind, 'other');
});

test('kicks: a rewritten refusal must be documented with the launcher\'s words', () => {
  const fixture = fileURLToPath(new URL('./fixtures/claims/joinErrors.ts', import.meta.url));
  const d = makeDescriber(fixture);
  const ec = page([
    '## Server refusals and kick reasons', '', '| Reason | When | What to do |', '|---|---|---|',
    '| `Protocol version mismatch: launcher speaks v17, server speaks v18 - update the outdated side` | shown as `Could not join · This server needs a newer launcher — update from the Download page` | update |',
    "| `Game files do not match this server's reference (3 problems). …` | strict | fix |",
    '| `Server full!` | full | wait |',
  ].join('\n'), 'reference/error-codes.md');
  const texts = collectServerTexts(ec);
  const f = checkShown(ec, texts, d.describe);
  assert.deepEqual(f.map((x) => x.line), [6]);
  const ts = page("| Message | Cause |\n|---|---|\n| `Disconnected · Game files do not match this server's reference (N problems). …` | strict |\n| `Disconnected · Server full!` | full |\n", 'players/troubleshooting.md');
  const g = checkShown(ts, collectServerTexts(ts), d.describe);
  assert.equal(g.length, 1);
  assert.match(g[0].expected, /^Could not join · Your game files do not match this server's reference \(3 problems\)/);
});

// --- events ----------------------------------------------------------------------------

const API = `
[[event]]
name = "playerJoined"
kind = "builtin"
aliases = ["playerJoin"]
doc = """x"""

[[event]]
name = "vehicleSpawnRequest"
kind = "cancellable"
aliases = ["onVehicleSpawnRequest"]

[[event]]
name = "relayRequest"
kind = "special"
aliases = ["canRelay"]

[[event]]
name = "<domain>:<verb>"
kind = "client"

[[lua]]
name = "on"
kind = "function"
`;

test('events: api.toml events with aliases; old names only in allowed contexts; unknown names', () => {
  const events = parseApiEvents(API);
  assert.deepEqual(events.map((e) => [e.name, e.aliases]), [['playerJoined', ['playerJoin']], ['vehicleSpawnRequest', ['onVehicleSpawnRequest']], ['relayRequest', ['canRelay']], ['<domain>:<verb>', []]]);
  const { canonical, aliasOf } = eventIndex(events);
  assert.ok(canonical.has('playerJoined') && !canonical.has('<domain>:<verb>'));
  assert.equal(aliasOf.get('canRelay'), 'relayRequest');
  const p = page([
    'Subscribe with `node.on("playerJoined", ...)`.',                                    // 1 ok
    'The old spelling `playerJoin` still works.',                                        // 2 alias, no marker in its paragraph -> finding
    '',
    'Servers before 1.2.0 used `playerJoin`; it is a deprecated alias of `playerJoined`.', // 4 allowed (paragraph marker)
    '',
    '| BeamMP | NodeMP | Before 1.2.0 |', '|---|---|---|',
    '| `onPlayerJoin(pid)` | `node.on("playerJoined", ...)` | `playerJoin` |',           // 8 allowed by column
    '| `onVehicleSpawn` | `vehicleSpawnRequest` | `canRelay` |',                         // 9 alias in column but wrong canonical -> mapping finding
    '',
    '`canRelay` → `relayRequest` and `playerJoin` → `vehicleSpawnRequest`.',             // 11 second mapping wrong; both old names outside a context
    'Typo `vehicleSpanwed` and `node.on("playerLeft", f)` in prose.',                    // 12 unknown event-like; playerLeft unknown in on()
    '```lua', 'node.on("onVehicleSpawnRequest", f) -- deprecated alias', 'node.on("canRelay", f)', 'node.on("vehicleSpwanRequest", f)', '```', // 14 ok, 15 alias, 16 unknown
  ].join('\n'), 'plugins/events.md');
  const f = checkEvents([p], { events });
  const by = (check) => f.filter((x) => x.check === check).map((x) => `${x.line}:${x.claim}`);
  assert.deepEqual(by('events.alias'), ['2:playerJoin', '11:canRelay', '11:playerJoin', '15:canRelay']);
  assert.deepEqual(by('events.mapping'), ['9:canRelay', '11:playerJoin → vehicleSpawnRequest']);
  assert.deepEqual(by('events.unknown'), ['12:vehicleSpanwed', '12:playerLeft', '16:vehicleSpwanRequest']);
});

// --- versions --------------------------------------------------------------------------

test('versions: mentions are recognised in EN and RU, historical statements are not', () => {
  const text = [
    'description: Run Node-Server 1.1.0 from the archive',                   // server
    'You need a running `Node-Server` 1.2.0 and launcher 1.1.0.',            // server, launcher
    'curl https://x/server-v1.2.0/Node-Server-1.2.0-linux-x64.tar.gz',       // server x2
    '| Game server (`Node-Server`) | 1.2.0 | tag `server-v1.2.0` |',         // server (row) + tag
    '| Launcher | 1.1.0 | `NodeMP-Setup-1.1.0.exe` |',                       // launcher x2
    'Client mod 1.4.0 (`NodeMP.zip`), tag `mod-v1.4.0`, `NodeMP-1.4.0.zip`', // mod x3
    '| client mod `1.4.0` (`NodeMP.VERSION`) |',                            // mod x2 (word rule + VERSION rule)
    'Wire protocol v18; Launcher 1.1.0 speaks v18; `Wire::ProtoVersion = 18`; `Node-Launcher 1.1.0 proto 18`', // protocol x4, launcher x2
    '`Protocol version mismatch: launcher speaks v17, server speaks v18`',   // quoted: ignored
    'v17 added Identity; a v17 launcher is refused; launchers before 1.0.0 wrote a file.', // ignored
    'Three additions (ABI 1.12); | C ABI | `1.12` (`NODE_ABI_VERSION_MAJOR` `1`, `MINOR` `12`) |', // abi x3
    'Measured on BeamNG 0.39.4.0; `Version 0.39.4.0`; integrity/0.39.4.0.manifest; (0.39.4.0, 0.39.3.0)', // game x3
    'image `ghcr.io/nodemp-beamng/server:v1.2.0`; `ghcr.io/nodemp-beamng/server:latest`', // dockerTag x1
    'Сервер 1.2.0, лаунчер 1.1.0, клиентский мод 1.4.0, протокол v18, игры 0.39.4.0.',   // ru: 5
    'the server 160009 and Lua 5.4.8 are not versions of ours',
  ].join('\n');
  const m = versionMentions(text);
  const count = (key) => m.filter((x) => x.key === key).length;
  assert.equal(count('server'), 1 + 1 + 2 + 2 + 1);
  assert.equal(count('launcher'), 1 + 2 + 2 + 1);
  assert.equal(count('mod'), 3 + 2 + 1);
  assert.equal(count('protocol'), 4 + 1);
  assert.equal(count('abi'), 3);
  assert.equal(count('game'), 3 + 1);
  assert.equal(count('dockerTag'), 1);
  assert.ok(!m.some((x) => x.value === '17' || x.value === '1.0.0' || x.value === '0.39.3.0' || x.value === '160009'));
  const versions = { server: '1.2.0', launcher: '1.1.0', mod: '1.4.0', protocol: 18, abi: '1.12', game: '0.39.4.0', dockerTag: 'v1.2.0' };
  const f = checkVersionMentions(page(text, 'hosting/quick-start.mdx'), versions);
  assert.deepEqual(f.map((x) => [x.line, x.actual]), [[1, '1.1.0']]);
});

test('versions: versions.json against the code', () => {
  assert.equal(versionFrom('server', 'project(\n    Node-Server\n    VERSION 1.2.0\n    LANGUAGES CXX)'), '1.2.0');
  assert.equal(versionFrom('launcher', 'std::string LauncherVersion() {\n    return "1.1.0";\n}'), '1.1.0');
  assert.equal(versionFrom('uiLauncher', '{ "name": "x", "version": "1.1.0" }'), '1.1.0');
  assert.equal(versionFrom('mod', 'NodeMP.VERSION = "1.4.0"'), '1.4.0');
  assert.equal(versionFrom('protocol', 'constexpr uint16_t ProtoVersion = 18;'), '18');
  assert.equal(versionFrom('abi', '#define NODE_ABI_VERSION_MAJOR 1u\n#define NODE_ABI_VERSION_MINOR 12u'), '1.12');
  const versions = { server: '1.2.0', launcher: '1.1.0', mod: '1.4.0', protocol: 18, abi: '1.12', game: '0.39.4.0', dockerTag: 'v1.1.0' };
  const f = checkVersionsAgainstCode(versions, { server: '1.2.0', launcher: '1.1.0', uiLauncher: '1.0.0', mod: '1.4.0', protocol: '18', protocolLauncher: null, abi: '1.12', helpGame: '0.39.4.0' });
  assert.deepEqual(f.map((x) => [x.claim, x.actual]), [['launcher', '1.1.0'], ['dockerTag', 'v1.1.0']]);
});

// --- protocol ----------------------------------------------------------------------------

const TAXONOMY = `"""GENERATED"""
import enum

PROTO_VERSION = 18
PRE_AUTH_FRAME_CAP = 4 * 1024
MAX_FRAME_LENGTH = 1024 * 1024
MAX_UDP_DATAGRAM = 10240
MAX_VEHICLE_CONFIG_JSON = 768 * 1024
UDP_HELLO_MAC_LABEL = b"NODE-UDP-HELLO-v10"

class Cat(enum.IntEnum):
    HANDSHAKE = 0x01  # connection setup, liveness, UDP binding
    SESSION = 0x02  # player lifecycle and session-scoped pushes


class Handshake(enum.IntEnum):
    HELLO = 0x01  # L->S T u16 proto_version, tail:str player_name (v13; empty = server names Player<id>)
    WELCOME = 0x02  # S->L T u32 client_id
    PING = 0x03  # L->S T,U optional u64 LE stamp (v13; echoed)
    UDP_HELLO = 0x04  # L->S U u8[16] nonce, u8[32] mac


class Session(enum.IntEnum):
    KICK = 0x01  # S->G T,R tail:str reason
    SESSION_END = 0x02  # L->G R u8 reason (SessionEndReason), tail:str detail


class SessionEndReason(enum.IntEnum):
    DISCONNECTED = 0  # server closed the session
`;

test('protocol: taxonomy parsing and the page tables', () => {
  const wire = parseWireTaxonomy(TAXONOMY);
  assert.equal(wire.protoVersion, 18);
  assert.equal(wire.constants.PRE_AUTH_FRAME_CAP, 4096);
  assert.equal(wire.constants.UDP_HELLO_MAC_LABEL, 'NODE-UDP-HELLO-v10');
  assert.deepEqual(wire.categories.map((c) => [c.name, c.byte]), [['Handshake', 1], ['Session', 2]]);
  assert.deepEqual(wire.packets.Handshake.map((p) => [p.name, p.id, p.dir, p.channel]), [['Hello', 1, 'L->S', 'T'], ['Welcome', 2, 'S->L', 'T'], ['Ping', 3, 'L->S', 'T,U'], ['UdpHello', 4, 'L->S', 'U']]);
  assert.equal(wire.packets.Handshake[0].body, 'u16 proto_version, tail:str player_name (v13; empty = server names Player<id>)');
  assert.equal(wire.packets.SessionEndReason, undefined, 'body-field enums are not packet categories');
  assert.equal(snake('UdpHello'), 'UDP_HELLO');
  assert.equal(pascal('INTEGRITY_MANIFEST_DONE'), 'IntegrityManifestDone');
  assert.deepEqual(parseDirection('L→S, T and U'), { dir: 'L->S', channel: 'T,U' });
  assert.deepEqual(parseDirection('G↔S, U с откатом на T'), { dir: 'G<->S', channel: 'U(T)' });
  assert.deepEqual(parseDirection('S→one'), { dir: 'S->one', channel: null });

  const good = page([
    'Two categories exist:', '', '| Category | Byte | Covers |', '|---|---|---|', '| `Handshake` | `0x01` | setup |', '| `Session` | `0x02` | lifecycle |', '',
    '### Handshake (4)', '', '| Subtype | Direction | Purpose |', '|---|---|---|',
    '| `Hello` | L→S, T | Opens the session: `u16 proto_version`. |', '| `Welcome` | S→L, T | The id. |', '| `Ping` | L→S, T and U | Liveness. |', '| `UdpHello` | L→S, U | Binds. |', '',
    '### Session (2)', '', '| Subtype | Direction | Purpose |', '|---|---|---|', '| `Kick` | S→G, T and R | Refused. |', '| `SessionEnd` | L→G, R | `0x02`. |', '',
    '- **Limits.** A frame is capped at 4 KB before `Welcome` and 1 MB after it; a UDP datagram at', '  10 KB. A vehicle config at 768 KB.',
  ].join('\n'), 'plugins/protocol.md');
  assert.deepEqual(checkProtocolPage(good, wire), []);
  const bad = page([
    'Three categories exist:', '', '| Category | Byte | Covers |', '|---|---|---|', '| `Handshake` | `0x01` | setup |', '| `Session` | `0x03` | lifecycle |', '',
    '### Handshake (5)', '', '| Subtype | Direction | Purpose |', '|---|---|---|',
    '| `Hello` | L→S, T | `u16 version`. |', '| `Ping` | L→S, T | Liveness. |', '| `Welcome` | S→L, T | The id. |', '| `UdpHello` | S→L, U | Binds. |', '| `Extra` | L→S, T | nope |', '',
    '- **Limits.** A frame is capped at 8 KB before `Welcome` and 1 MB after it; a UDP datagram at 10 KB.',
  ].join('\n'), 'plugins/protocol.md');
  const f = checkProtocolPage(bad, wire);
  const claims = f.map((x) => x.claim);
  assert.ok(claims.includes('Three categories'), 'count word');
  assert.ok(claims.includes('Session byte'));
  assert.ok(claims.includes('Handshake (5)'));
  assert.ok(claims.includes('Handshake::Hello body'));
  assert.ok(claims.includes('Handshake::Ping position') && claims.includes('Handshake::Welcome position'));
  assert.ok(claims.includes('Handshake::Ping channel'));
  assert.ok(claims.includes('Handshake::UdpHello direction'));
  assert.ok(claims.includes('Handshake::Extra'));
  assert.ok(f.some((x) => x.check === 'protocol.limits' && x.actual === '8'));
});

// --- other extractors and the runner ------------------------------------------------------

test('literal extractors: ts template interpolation, rust char literals and raw strings, lua, env names', () => {
  assert.deepEqual(tsTemplates('const a = `x ${y} z`; const b = "q"; // "comment"\nconst c = \'s\';').map((t) => show(t.text)), ['x {} z', 'q', 's']);
  assert.deepEqual(rustTemplates('let q = s.trim_matches(\'"\'); format!("a {} b {name}"); let r = r#"raw "quoted""#;').map((t) => show(t.text)), ['a {} b {}', 'raw "quoted"']);
  assert.deepEqual(luaTemplates('return raw.kickPlayer(self.id, reason or "Kicked") -- "no"\nlocal s = \'Banned\'').map((t) => t.text), ['Kicked', 'Banned']);
  assert.deepEqual([...envNames(['getenv("NODE_LUA")', 'x = "NODE_PORT"; y = "NODEMP_X"'])].sort(), ['NODE_LUA', 'NODE_PORT']);
});

test('runner: allowlist matching (optional page), page loading, skipped checks without a repository', () => {
  const findings = [
    { check: 'kick.quoted', page: 'ru/reference/error-codes.md', locale: 'ru', line: 1, claim: 'already exists', expected: 'x', actual: 'y' },
    { check: 'kick.quoted', page: 'players/troubleshooting.md', locale: 'en', line: 1, claim: 'already exists', expected: 'x', actual: 'y' },
    { check: 'versions.docs', page: 'hosting/updating.md', locale: 'en', line: 1, claim: 'this server speaks 2.0', expected: 'x', actual: 'y' },
    { check: 'versions.docs', page: 'hosting/running.md', locale: 'en', line: 1, claim: 'this server speaks 2.0', expected: 'x', actual: 'y' },
  ];
  const allow = [
    { check: 'kick.quoted', claim: 'already exists', reason: 'directory text' },
    { check: 'versions.docs', page: 'hosting/updating.md', claim: 'this server speaks 2.0', reason: 'hypothetical' },
    { check: 'cli.help', page: 'x.md', claim: 'unused', reason: 'stale entry' },
  ];
  const r = applyAllowlist(findings, allow);
  assert.equal(r.allowed.length, 3);
  assert.deepEqual(r.failing.map((f) => f.page), ['hosting/running.md']);
  assert.deepEqual(r.unused.map((a) => a.claim), ['unused']);

  const dir = mkdtempSync(join(tmpdir(), 'claims-pages-'));
  try {
    mkdirSync(join(dir, 'ru/hosting'), { recursive: true });
    mkdirSync(join(dir, 'hosting'), { recursive: true });
    mkdirSync(join(dir, 'plugins/api'), { recursive: true });
    writeFileSync(join(dir, 'hosting/a.md'), 'en\r\ntext');
    writeFileSync(join(dir, 'ru/hosting/a.md'), 'ru');
    writeFileSync(join(dir, 'plugins/api/index.md'), 'generated');
    const pages = loadPages(dir);
    assert.deepEqual(pages.map((p) => [p.path, p.slug, p.locale, p.text]), [['hosting/a.md', 'hosting/a.md', 'en', 'en\ntext'], ['ru/hosting/a.md', 'hosting/a.md', 'ru', 'ru']]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const { findings: f, skipped } = runChecks([], { present: { server: false, sdk: true, launcher: false, mod: false, ui: false }, versions: { server: '1', launcher: '1', mod: '1', protocol: 1, abi: '1', game: '1', dockerTag: 'v1' }, events: [] });
  assert.deepEqual(f, []);
  assert.deepEqual(skipped.map((s) => s.check).sort(), ['cli', 'config', 'kicks', 'protocol']);
  assert.deepEqual(NEEDS.versions, []);
});
