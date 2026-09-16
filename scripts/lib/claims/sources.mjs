// Readers for the code that the docs make claims about. Every function here
// takes text (so the tests can feed fixtures) and returns plain data; nothing
// in this file knows about markdown.

// Wildcard marker inside templates: a `{}` fmt placeholder, a `+ expr +` splice,
// a `${...}` interpolation or a `…` in the docs all become this one character.
export const W = '\u0000';

// --- C++ ---------------------------------------------------------------------

// Every string literal of a C++ translation unit, as templates:
//   - adjacent literals are concatenated ("a" "b" -> "ab", as the compiler does);
//   - literals spliced with `+ expr +` inside one statement are joined with W;
//   - `{}` / `{:...}` fmt placeholders become W.
// Comments and #include lines are skipped. Returns [{ text, line, head }] with the
// 1-based line of the first piece and `head`, the code of the statement before
// its first literal (`ClientKick(c, ` -- what the literal is an argument of).
export function cppTemplates(source) {
  const pieces = readCppLiterals(source);
  const out = [];
  // Group by statement, then decide for each pair of neighbours whether the code
  // between them is a `+ expr +` splice.
  let stmt = [];
  const flush = () => {
    if (!stmt.length) { return; }
    const head = stmt[0].before.replace(/\s+/g, ' ').trim();
    let cur = { text: stmt[0].text, line: stmt[0].line, head };
    for (let i = 1; i < stmt.length; i++) {
      if (isSplice(stmt[i].before)) {
        cur.text += W + stmt[i].text;
      } else {
        out.push(cur);
        cur = { text: stmt[i].text, line: stmt[i].line, head };
      }
    }
    out.push(cur);
    stmt = [];
  };
  for (const p of pieces) {
    if (p.newStatement) flush();
    stmt.push(p);
  }
  flush();
  return out.map((t) => ({ text: fmtToWildcards(t.text), line: t.line, head: t.head }));
}

// Is the code between two literals of one statement a splice -- `+ expr +` or
// `<< expr <<` with one expression between (a std::string("...") wrapper's `)`
// may lead)? A `,` or `?` outside parentheses means the literals belong to
// different arguments or ternary branches instead.
function isSplice(between) {
  let s = between.replace(/\s+/g, '').replace(/->/g, '.');
  for (let guard = 0; guard < 20 && /\([^()]*\)/.test(s); guard++) s = s.replace(/\([^()]*\)/g, '');
  return /^\)*(?:\+|<<)[^+?,;()<>]*(?:\+|<<)$/.test(s);
}

export function fmtToWildcards(s) {
  return s.replace(/\{\{/g, '\u0001').replace(/\}\}/g, '\u0002')
    .replace(/\{[^{}]*\}/g, W)
    .replace(/\u0001/g, '{').replace(/\u0002/g, '}');
}

// Low-level scan: literals with the code that preceded them inside the same
// statement (`before`), a flag when a statement boundary was crossed, and the line.
function readCppLiterals(src) {
  const out = [];
  let i = 0;
  let line = 1;
  let lineStart = 0;
  let before = ''; // code since the previous literal (or statement start)
  let newStatement = true;
  let pending = null; // previous literal of this statement, for adjacent-literal concatenation
  const push = (text, startLine) => {
    // Adjacent literals (only whitespace/comments between) concatenate.
    if (pending && before.trim() === '') { pending.text += text; before = ''; return; }
    pending = { text, line: startLine, before, newStatement };
    out.push(pending);
    before = '';
    newStatement = false;
  };
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; lineStart = i + 1; before += c; i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const seg = src.slice(i, end < 0 ? src.length : end + 2);
      line += (seg.match(/\n/g) || []).length;
      i = end < 0 ? src.length : end + 2;
      continue;
    }
    if (c === '#' && src.slice(lineStart, i).trim() === '') { // preprocessor line
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === "'") { // char literal
      let j = i + 1;
      if (src[j] === '\\') j++;
      j++;
      while (j < src.length && src[j] !== "'") j++;
      before += src.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === 'R' && src[i + 1] === '"') { // raw string R"delim(...)delim"
      const open = src.indexOf('(', i + 2);
      const delim = src.slice(i + 2, open);
      const closeTok = ')' + delim + '"';
      const close = src.indexOf(closeTok, open + 1);
      const body = src.slice(open + 1, close < 0 ? src.length : close);
      push(body, line);
      line += (body.match(/\n/g) || []).length;
      i = close < 0 ? src.length : close + closeTok.length;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let text = '';
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\\') {
          const n = src[j + 1];
          const esc = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', "'": "'", 0: '\0' };
          text += n in esc ? esc[n] : n;
          j += 2;
        } else {
          text += src[j++];
        }
      }
      push(text, line);
      i = j + 1;
      continue;
    }
    if (c === ';' || c === '{' || c === '}') { newStatement = true; before = ''; pending = null; i++; continue; }
    before += c;
    i++;
  }
  return out;
}

// Config.cpp: the `Str*`/`EnvStr*` constants, the FlushToFile writes (section,
// key constant, File<Type>) and the TryReadValue reads (section, key, env).
export function parseConfigCpp(source) {
  const constants = new Map();
  for (const m of source.matchAll(/std::string_view\s+(\w+)\s*=\s*"([^"]*)"/g)) constants.set(m[1], m[2]);
  const writes = [];
  const typeOf = { FileBool: 'bool', FileInt: 'int', FileString: 'string' };
  for (const m of source.matchAll(/data\["(\w+)"\]\[(\w+)\.data\(\)\]\s*=\s*(FileBool|FileInt|FileString)\(Settings::Key::(\w+)\)/g)) {
    writes.push({ section: m[1], key: constants.get(m[2]) ?? m[2], type: typeOf[m[3]], settingsKey: m[4] });
  }
  const reads = [];
  for (const m of source.matchAll(/TryReadValue\(data,\s*"(\w+)",\s*(\w+),\s*([^,]+?),\s*Settings::Key::(\w+)\)/g)) {
    const envExpr = m[3].trim();
    const env = constants.has(envExpr) ? constants.get(envExpr) : null; // provider-name lookups are not literals
    reads.push({ section: m[1], key: constants.get(m[2]) ?? m[2], env, settingsKey: m[4] });
  }
  return { constants, writes, reads };
}

// Settings.cpp: default of every Settings::Key, rendered as TOML would show it
// ("Node Server" -> "\"Node Server\"", 8 -> "8", false -> "false").
export function parseSettingsCpp(source) {
  const defaults = new Map();
  const body = /mSettingsMap\s*=\s*std::unordered_map<Key,\s*SettingsTypeVariant>\s*\{([\s\S]*?)\};/.exec(source);
  const text = body ? body[1] : source;
  for (const m of text.matchAll(/\{\s*(\w+),\s*(std::string\("((?:[^"\\]|\\.)*)"\)|true|false|-?\d+)\s*\}/g)) {
    const [, key, raw, str] = m;
    if (raw.startsWith('std::string')) defaults.set(key, JSON.stringify(str.replace(/\\"/g, '"')));
    else defaults.set(key, raw);
  }
  return defaults;
}

// The reference the docs table must reproduce: one entry per key, in the order
// server.toml is written, with section, key, type, default and environment name.
export function configReference(configCpp, settingsCpp) {
  const { writes, reads } = parseConfigCpp(configCpp);
  const defaults = parseSettingsCpp(settingsCpp);
  const envOf = new Map(reads.filter((r) => r.env).map((r) => [r.settingsKey, r.env]));
  const entries = writes.map((w) => ({
    section: w.section,
    key: w.key,
    type: w.type,
    default: defaults.get(w.settingsKey) ?? null,
    env: envOf.get(w.settingsKey) ?? null,
  }));
  const sections = [...new Set(entries.map((e) => e.section))];
  return { entries, sections };
}

// main.cpp: the `--help` text (the raw string assigned to sCommandlineArguments)
// and the argument names the parser registers.
export function parseServerMain(source) {
  const m = /sCommandlineArguments\s*=\s*R"(\w*)\(([\s\S]*?)\)\1"/.exec(source);
  const help = m ? m[2] : null;
  const flags = new Set();
  for (const f of source.matchAll(/RegisterArgument\(\{\s*"([\w-]+)"\s*\}/g)) flags.add('--' + f[1]);
  // --gen-integrity is dispatched before the parser; its own options live in the help text.
  for (const f of source.matchAll(/Arg\s*==\s*"(--[\w-]+)"/g)) flags.add(f[1]);
  if (help) for (const f of help.matchAll(/(--[a-z][\w-]*)/g)) flags.add(f[1]);
  return { help, flags };
}

// Every "NODE_*" literal of the server sources: the environment names that exist.
export function envNames(sources) {
  const names = new Set();
  for (const s of sources) for (const m of s.matchAll(/"(NODE_[A-Z0-9_]+)"/g)) names.add(m[1]);
  return names;
}

// --- wire taxonomy (server/run/wire_taxonomy.py, generated by wiregen) ---------

const DIR_RE = /^([LSG](?:<->|->)(?:[LSG]|one))$/;
const CHANNEL_RE = /^(T|U|R|CC|T,U|T,R|CC,R|U\(T\))$/;

export function parseWireTaxonomy(source) {
  const protoVersion = Number((/PROTO_VERSION\s*=\s*(\d+)/.exec(source) || [])[1]);
  const constants = {};
  for (const m of source.matchAll(/^([A-Z][A-Z0-9_]+)\s*=\s*([^#\n]+?)\s*(?:#.*)?$/gm)) {
    const expr = m[2].trim();
    const num = /^(\d+)(?:\s*\*\s*(\d+))?$/.exec(expr);
    const hex = /^0x([0-9A-Fa-f]+)$/.exec(expr);
    constants[m[1]] = num ? Number(num[1]) * (num[2] ? Number(num[2]) : 1)
      : hex ? parseInt(hex[1], 16)
        : expr.replace(/^b?"(.*)"$/, '$1');
  }
  const categories = [];
  const packets = {};
  const catBlock = /class Cat\(enum\.IntEnum\):\n((?:[ \t]+.*\n?)+)/.exec(source);
  if (catBlock) {
    for (const m of catBlock[1].matchAll(/^\s+([A-Z_]+)\s*=\s*(0x[0-9A-Fa-f]+|\d+)\s*(?:#\s*(.*))?$/gm)) {
      categories.push({ name: pascal(m[1]), byte: Number(m[2]), comment: (m[3] || '').trim() });
    }
  }
  for (const cls of source.matchAll(/class (\w+)\(enum\.IntEnum\):\n((?:[ \t]+.*\n?)+)/g)) {
    const name = cls[1];
    if (name === 'Cat' || !categories.some((c) => c.name === name)) continue;
    const list = [];
    for (const m of cls[2].matchAll(/^\s+([A-Z_0-9]+)\s*=\s*(0x[0-9A-Fa-f]+|\d+)\s*(?:#\s*(.*))?$/gm)) {
      const words = (m[3] || '').trim().split(/\s+/);
      let dir = null; let channel = null; let rest = words;
      if (words.length && DIR_RE.test(words[0])) {
        dir = words[0]; rest = words.slice(1);
        if (rest.length && CHANNEL_RE.test(rest[0])) { channel = rest[0]; rest = rest.slice(1); }
      }
      list.push({ name: pascal(m[1]), snake: m[1], id: Number(m[2]), dir, channel, body: rest.join(' ') });
    }
    packets[name] = list;
  }
  return { protoVersion, constants, categories, packets };
}

// UPPER_SNAKE -> PascalCase the way wiregen derived it (UDP_TOKEN -> UdpToken).
export function pascal(snake) {
  return snake.toLowerCase().split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join('');
}

// PascalCase -> UPPER_SNAKE (SeatClaim -> SEAT_CLAIM), the inverse used on doc names.
export function snake(pascalName) {
  return pascalName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
}

// --- sdk/api.toml events -------------------------------------------------------

export function parseApiEvents(source) {
  const events = [];
  const blocks = source.split(/^\[\[event\]\]\s*$/m).slice(1);
  for (const b of blocks) {
    const head = b.split(/^\[\[/m)[0];
    const name = (/^name\s*=\s*"([^"]+)"/m.exec(head) || [])[1];
    const kind = (/^kind\s*=\s*"([^"]+)"/m.exec(head) || [])[1];
    const aliasesRaw = (/^aliases\s*=\s*\[([^\]]*)\]/m.exec(head) || [])[1] || '';
    const aliases = [...aliasesRaw.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    if (name) events.push({ name, kind, aliases });
  }
  return events;
}

// --- other literal extractors -------------------------------------------------

// TypeScript / Svelte <script>: "..." '...' and `...${x}...` (interpolations -> W).
export function tsTemplates(source) {
  const out = [];
  const src = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1');
  const re = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  for (const m of src.matchAll(re)) {
    const line = src.slice(0, m.index).split('\n').length;
    if (m[1] !== undefined || m[2] !== undefined) out.push({ text: unescapeJs(m[1] ?? m[2]), line });
    else out.push({ text: unescapeJs(m[3]).replace(/\$\{[^}]*\}/g, W), line });
  }
  return out;
}

function unescapeJs(s) {
  return s.replace(/\\(n|t|r|"|'|`|\\)/g, (_, c) => ({ n: '\n', t: '\t', r: '\r' }[c] ?? c));
}

// Rust: "..." with escapes, r"..." / r#"..."#; `{}` `{name}` `{:?}` -> W.
export function rustTemplates(source) {
  const out = [];
  // Char literals go first: '"' would otherwise flip the quote parity of the rest.
  const src = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/'(?:[^'\\\n]|\\.)'/g, "' '");
  const re = /r(#*)"([\s\S]*?)"\1|"((?:[^"\\]|\\[\s\S])*)"/g;
  for (const m of src.matchAll(re)) {
    const line = src.slice(0, m.index).split('\n').length;
    const raw = m[2] !== undefined ? m[2] : unescapeJs(m[3]).replace(/\\\n\s*/g, '');
    out.push({ text: fmtToWildcards(raw), line });
  }
  return out;
}

// Lua: "..." and '...'.
export function luaTemplates(source) {
  const out = [];
  const src = source.replace(/--\[\[[\s\S]*?\]\]/g, '').replace(/--.*$/gm, '');
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'/g)) {
    const line = src.slice(0, m.index).split('\n').length;
    out.push({ text: unescapeJs(m[1] ?? m[2]), line });
  }
  return out;
}

// --- launcher exit codes -------------------------------------------------------

// (log line template -> exit code) pairs the launcher source implies. A heuristic,
// read as "the code that follows this message":
//   fatal("...")                                   -> 1 (Logger.cpp: fatal sleeps 5 s and exits 1)
//   error/game/info/warn("...") then exit(N) or return ExitX within five lines -> N
//   `std::string msg = "..."` then error(msg + ...) and exit(N) likewise
// A message may collect several codes (platform branches); each is one entry
// { text, code, line }. Messages with no exit in sight are not listed.
export function launcherExitCodes(source) {
  const out = [];
  const templates = cppTemplates(source);
  const lines = source.split(/\r?\n/);
  const named = { ExitClean: 0, ExitDiffers: 1, ExitFailed: 2 };
  for (const t of templates) {
    const ctx = lines[t.line - 1] || '';
    if (/\bfatal\s*\(/.test(ctx) || (t.line > 1 && /\bfatal\s*\(\s*$/.test(lines[t.line - 2] || ''))) {
      out.push({ text: t.text, code: 1, line: t.line });
      continue;
    }
    if (!/\b(error|game|info|warn)\s*\(/.test(ctx) && !/std::string \w+ = /.test(ctx)) continue;
    for (let l = t.line - 1; l < Math.min(lines.length, t.line + 4); l++) {
      const m = /\b(?:std::)?exit\(\s*(\d+|[A-Za-z_]\w*)\s*\)|return\s+(ExitClean|ExitDiffers|ExitFailed|\d)\s*;/.exec(lines[l]);
      if (m) {
        const tok = m[1] ?? m[2];
        const code = /^\d+$/.test(tok) ? Number(tok) : named[tok];
        if (code !== undefined) out.push({ text: t.text, code, line: t.line });
        break;
      }
      // `exit(Launched ? 0 : 2)`: both branches are possible codes.
      const tern = /\bexit\(\s*\w+\s*\?\s*(\d+)\s*:\s*(\d+)\s*\)/.exec(lines[l]);
      if (tern) {
        out.push({ text: t.text, code: Number(tern[1]), line: t.line });
        out.push({ text: t.text, code: Number(tern[2]), line: t.line });
        break;
      }
    }
  }
  return out;
}

// --- versions in the code repos ------------------------------------------------

export const versionPatterns = {
  server: [/project\s*\([^)]*?VERSION\s+(\d+\.\d+\.\d+)/s],
  launcher: [/LauncherVersion\(\)\s*\{\s*return\s+"(\d+\.\d+\.\d+)"/],
  uiLauncher: [/"version"\s*:\s*"(\d+\.\d+\.\d+)"/],
  mod: [/NodeMP\.VERSION\s*=\s*"(\d+\.\d+\.\d+)"/],
  protocol: [/constexpr\s+uint16_t\s+ProtoVersion\s*=\s*(\d+)/],
  abi: [/NODE_ABI_VERSION_MAJOR\s+(\d+)u[\s\S]*?NODE_ABI_VERSION_MINOR\s+(\d+)u/],
};

export function versionFrom(kind, source) {
  for (const re of versionPatterns[kind]) {
    const m = re.exec(source);
    if (m) return kind === 'abi' ? `${m[1]}.${m[2]}` : m[1];
  }
  return null;
}
