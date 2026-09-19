#!/usr/bin/env python3
"""Runs the Lua examples of the plugin guides against a real Node-Server.

Every ```lua block under src/content/docs/plugins/ is preceded by an HTML comment that says how
the block runs (an untagged block fails the check):

    <!-- doctest: server -->             the block is server/main.lua of a throwaway resource
    <!-- doctest: server+client -->      ... and a fake player joins the server; optional JSON:
                                         {"emit": [["chat:send", {"text": "/hello"}]],
                                          "players": ["Alice", "Bob"], "spawn": "coupe"}
    <!-- doctest: db -->  / db+client    the same, on a server with the db module loaded and a
                                         PostgreSQL connection configured for it
    <!-- doctest: client -->             a client script: syntax-checked with luac and packaged by
                                         the server as the resource's client file (the game is not
                                         here to run it)
    <!-- doctest: skip <reason> -->      not run; still syntax-checked

Options any running block may carry: "config" (its [config] table), "files" (extra files inside
the resource: {"server/util.lua": "return {}"}), "with" ([5]: the code of earlier blocks of the
page runs in front of this one), "wait" (seconds to wait for the expectations, default 15).

Inside a block, `-- expect: <regex>` names a log line the resource must print (matched against
the message part of the resource's own `dtN · ...` lines), `-- expect-not: <regex>` one it must
not, `-- expect-log: <regex>` a line anywhere in the server log (what the server prints on the
resource's behalf without the prefix, such as a kick) and `-- expect-client: <regex>` an event a
fake player received, as `<player> <event> <payload>`. A block fails when its resource does not
load, logs `error in ...`, a `[deprecated]` event name or a manifest problem, or misses an
expectation.

The Russian pages carry the same blocks byte for byte (tag comment and code, compared by
position), so only the English blocks run. One server per page: each block is its own resource
`dtN`, so the log attributes every line, and the examples of a page share the players and,
for the db blocks, the database -- as the resources of one server do.

    python scripts/doctest/run.py [--only <page>] [--keep] [--list] [--strict] [--server <exe>]

Environment: DOCTEST_SERVER (the Node-Server binary; default ../server/run/Node-Server[.exe] or
.server/Node-Server), NODEMP_SERVER_DIR (a checkout of NodeMP-BeamNG/server -- its run/ holds
the wire codec and the fake client the runner imports; default ./server as CI clones it, then
../server), NODE_DB_URL (a PostgreSQL URL to a throwaway database; NODE_DATABASE_URL is read
as its old name), DOCTEST_DB_MODULE (the built db module; default: the build directories beside
plugins/db) and DOCTEST_DB_LUA (its Lua library; default plugins/db/lua/db.lua). Without a URL or
without the module the db blocks are skipped, or fail with --strict. DOCTEST_LUAC (the luac to
use), DOCTEST_PORT (the first port of
the range the servers use, default 30950). The fake players need the `zstandard` package. Exit 0
when every block passed or was skipped with a reason, 1 on any failure, 2 when the runner itself
cannot run.

scripts/doctest/lib/ holds only this repository's own code (the stand-in directory and chat):
the server repository is not public, and nothing of it is copied here.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import time
from dataclasses import dataclass, field

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LIB = os.path.join(HERE, "lib")
DOCS = os.path.join(ROOT, "src", "content", "docs")
EN_DIR = os.path.join(DOCS, "plugins")
RU_DIR = os.path.join(DOCS, "ru", "plugins")
CHAT_DIR = os.path.join(LIB, "chat")

if LIB not in sys.path:
    sys.path.insert(0, LIB)

from directory import CAST, Directory, announcing_env, ticket_of  # noqa: E402

TAG_RE = re.compile(r"^\s*<!--\s*doctest:\s*(.*?)\s*-->\s*$")
FENCE_RE = re.compile(r"^(`{3,}|~{3,})\s*(\S*)")
EXPECT_RE = re.compile(r"^\s*--\s*expect(-not|-log|-client)?:\s*(.*?)\s*$")
TIMESTAMP_RE = re.compile(r"^\d\d:\d\d:\d\d")
# What the server prints with the resource's prefix when the example is wrong.
ERROR_RE = re.compile(r"^(error in |\[deprecated\] |failed to parse resource\.toml|.* escapes the resource folder"
                      r"|resource type .* has no language host|.*\(over the 900 KB cap\))")
STALL_RE = re.compile(r"plugin worker job stalled the thread")

KINDS = ("server", "server+client", "db", "db+client", "client", "skip")
OPTS = ("emit", "players", "spawn", "config", "files", "with", "wait")
DEFAULT_WAIT = 15.0
DEFAULT_PORT = 30950
HOST = "127.0.0.1"
# The spawn request a fake player sends for {"spawn": "<jbm>"}: the shape the tests in server/run use.
CAR = {"jbm": "coupe", "vid": 1001, "pid": 0, "vcf": {"parts": {}}, "pos": [1, 2, 3], "rot": [0, 0, 0, 1]}


# ---------------------------------------------------------------------------
# extraction
# ---------------------------------------------------------------------------

@dataclass
class Block:
    page: str
    path: str
    index: int              # 1-based within the page
    line: int               # of the opening fence, 1-based
    code: str               # between the fences, "\n"-terminated
    tag: str | None         # the text after "doctest:", None when untagged
    kind: str | None = None
    opts: dict = field(default_factory=dict)
    reason: str = ""
    expects: list = field(default_factory=list)
    expect_nots: list = field(default_factory=list)
    expect_logs: list = field(default_factory=list)
    expect_clients: list = field(default_factory=list)
    error: str | None = None   # a classification problem: no tag, a bad tag, a bad regex

    @property
    def name(self):
        return "dt%d" % self.index

    @property
    def where(self):
        return "%s.md:%d" % (self.page, self.line)

    @property
    def runs(self):
        """Whether the block is written into a resource and loaded by a server."""
        return self.error is None and self.kind in ("server", "server+client", "db", "db+client", "client")

    @property
    def needs_db(self):
        return self.kind in ("db", "db+client")

    @property
    def needs_client(self):
        return self.kind in ("server+client", "db+client")


def read_text(path):
    with open(path, encoding="utf-8") as f:
        return f.read().replace("\r\n", "\n")


def extract_blocks(text):
    """Every ```lua block of a page as (fence line number, code, tag text or None).

    The tag is the `<!-- doctest: ... -->` comment on the nearest non-blank line above
    the opening fence; anything else there (prose) leaves the block untagged.
    """
    lines = text.split("\n")
    out = []
    i = 0
    while i < len(lines):
        m = FENCE_RE.match(lines[i])
        if not m:
            i += 1
            continue
        fence, info = m.group(1), m.group(2)
        closing = re.compile("^" + re.escape(fence[0]) + "{%d,}\\s*$" % len(fence))
        start = i
        body = []
        i += 1
        while i < len(lines) and not closing.match(lines[i]):
            body.append(lines[i])
            i += 1
        if i >= len(lines) and body and body[-1] == "":
            body.pop()  # an unclosed fence at the end of the file: the text's final newline is not code
        if info == "lua":
            tag = None
            j = start - 1
            while j >= 0 and lines[j].strip() == "":
                j -= 1
            if j >= 0:
                tm = TAG_RE.match(lines[j])
                if tm:
                    tag = tm.group(1)
            out.append((start + 1, "\n".join(body) + "\n", tag))
        i += 1
    return out


def parse_tag(tag):
    """(kind, opts, reason) for the text after `doctest:`; ValueError when it is not one of ours."""
    tag = tag.strip()
    if tag == "skip" or tag.startswith("skip "):
        reason = tag[4:].strip()
        if not reason:
            raise ValueError("`skip` needs a reason: <!-- doctest: skip needs a real game client -->")
        return "skip", {}, reason
    if tag == "client":
        return "client", {}, ""
    m = re.match(r"^(server|db)(\+client)?(?:\s+(\S.*))?$", tag, re.S)
    if not m:
        raise ValueError("unknown tag %r (one of: %s)" % (tag, ", ".join(KINDS)))
    kind = m.group(1) + (m.group(2) or "")
    opts = {}
    if m.group(3):
        try:
            opts = json.loads(m.group(3))
        except ValueError as e:
            raise ValueError("the options are not JSON: %s" % e) from None
        if not isinstance(opts, dict):
            raise ValueError("the options must be a JSON object")
        unknown = sorted(set(opts) - set(OPTS))
        if unknown:
            raise ValueError("unknown option(s) %s (known: %s)" % (", ".join(unknown), ", ".join(OPTS)))
        if not m.group(2) and any(k in opts for k in ("emit", "players", "spawn")):
            raise ValueError("`emit`, `players` and `spawn` need a +client tag")
        players = opts.get("players", ["Alice"])
        if not isinstance(players, list) or not players or any(p not in CAST for p in players):
            raise ValueError("`players` must be a non-empty list of %s" % ", ".join(sorted(CAST)))
        for e in opts.get("emit", []):
            if not (isinstance(e, list) and 2 <= len(e) <= 3 and isinstance(e[0], str) and e[0]):
                raise ValueError("each `emit` entry is [\"event:name\", payload] or [event, payload, \"Bob\"]")
            if len(e) == 3 and e[2] not in players:
                raise ValueError("emit sender %r is not in `players`" % e[2])
        if "spawn" in opts and not (isinstance(opts["spawn"], str) and opts["spawn"]):
            raise ValueError("`spawn` is the jbm of the vehicle the first player spawns, e.g. \"coupe\"")
        if "config" in opts and not isinstance(opts["config"], dict):
            raise ValueError("`config` must be an object (the resource's [config] table)")
        files = opts.get("files", {})
        if not isinstance(files, dict) or not all(
                isinstance(k, str) and isinstance(v, str) and k and not k.startswith(("/", "\\"))
                and ".." not in k.replace("\\", "/").split("/") and ":" not in k for k, v in files.items()):
            raise ValueError("`files` maps relative paths inside the resource to their text, e.g. {\"server/util.lua\": \"return {}\"}")
        if "with" in opts and not (isinstance(opts["with"], list) and opts["with"]
                                   and all(isinstance(i, int) and i > 0 for i in opts["with"])):
            raise ValueError("`with` lists the blocks of this page whose code runs before this one, by number: [5]")
        if "wait" in opts and not (isinstance(opts["wait"], (int, float)) and 0 < opts["wait"] <= 120):
            raise ValueError("`wait` is the seconds to wait for the expectations (0 < wait <= 120)")
    return kind, opts, ""


def parse_expects(code):
    """(expects, expect_nots, expect_logs, expect_clients) as compiled regexes; ValueError on a bad one."""
    ex, exnot, exlog, excl = [], [], [], []
    for ln in code.split("\n"):
        m = EXPECT_RE.match(ln)
        if not m:
            continue
        which, pat = m.group(1), m.group(2)
        if not pat:
            raise ValueError("an empty `-- expect%s:`" % (which or ""))
        try:
            rx = re.compile(pat)
        except re.error as e:
            raise ValueError("bad regex in `-- expect%s: %s`: %s" % (which or "", pat, e)) from None
        {None: ex, "-not": exnot, "-log": exlog, "-client": excl}[which].append(rx)
    return ex, exnot, exlog, excl


def load_page(path):
    """The page's stem and its classified blocks."""
    page = os.path.splitext(os.path.basename(path))[0]
    blocks = []
    for n, (line, code, tag) in enumerate(extract_blocks(read_text(path)), 1):
        b = Block(page=page, path=path, index=n, line=line, code=code, tag=tag)
        if tag is None:
            b.error = "no <!-- doctest: ... --> comment before the block"
        else:
            try:
                b.kind, b.opts, b.reason = parse_tag(tag)
            except ValueError as e:
                b.error = "bad tag: %s" % e
        try:
            b.expects, b.expect_nots, b.expect_logs, b.expect_clients = parse_expects(code)
        except ValueError as e:
            b.error = (b.error + "; " if b.error else "") + str(e)
        if b.expect_clients and b.kind and not b.needs_client:
            b.error = (b.error + "; " if b.error else "") + "`-- expect-client:` needs a +client tag"
        blocks.append(b)
    by_index = {b.index: b for b in blocks}
    for b in blocks:
        for i in b.opts.get("with", []):
            other = by_index.get(i)
            if other is None or i >= b.index:
                b.error = "`with` names block %d, which is not an earlier block of this page" % i
            elif other.error or other.kind in ("skip", "client"):
                b.error = "`with` names block %d, which does not run as a server block" % i
    return page, blocks


def resource_code(block, blocks):
    """The block's code with the code of its `with` blocks in front."""
    by_index = {b.index: b for b in blocks}
    parts = [by_index[i].code for i in block.opts.get("with", [])] + [block.code]
    return "\n".join(parts)


def ru_findings(page, en_blocks, ru_dir=RU_DIR):
    """Where the Russian twin's lua blocks differ from the English ones (by position)."""
    ru_path = os.path.join(ru_dir, page + ".md")
    if not os.path.exists(ru_path):
        return ["no Russian twin at ru/plugins/%s.md" % page]
    ru = extract_blocks(read_text(ru_path))
    out = []
    if len(ru) != len(en_blocks):
        out.append("ru/plugins/%s.md has %d lua blocks, the English page %d" % (page, len(ru), len(en_blocks)))
    for en, (ru_line, ru_code, ru_tag) in zip(en_blocks, ru):
        where = "block %d (en line %d, ru line %d)" % (en.index, en.line, ru_line)
        if ru_tag != en.tag:
            out.append("%s: the doctest tag differs: en %r, ru %r" % (where, en.tag, ru_tag))
        if ru_code != en.code:
            en_lines, ru_lines = en.code.split("\n"), ru_code.split("\n")
            k = next((i for i, (a, b) in enumerate(zip(en_lines, ru_lines)) if a != b), min(len(en_lines), len(ru_lines)))
            out.append("%s: the code differs from line %d of the block: en %r, ru %r"
                       % (where, k + 1, en_lines[k] if k < len(en_lines) else "<end>",
                          ru_lines[k] if k < len(ru_lines) else "<end>"))
    return out


# ---------------------------------------------------------------------------
# syntax checks
# ---------------------------------------------------------------------------

def find_luac():
    """The command that parses a Lua file without running it, as a list; None when there is none."""
    wanted = [os.environ["DOCTEST_LUAC"]] if os.environ.get("DOCTEST_LUAC") else []
    for cand in wanted + ["luac5.4", "luac54", "luac"]:
        exe = shutil.which(cand)
        if exe:
            return [exe, "-p"]
    for cand in ["lua5.4", "lua54", "lua"]:
        exe = shutil.which(cand)
        if exe:
            return [exe, "-e"]  # the statement is built per file in syntax_check
    return None


def syntax_check(luac, code, path):
    """(ok, message) for `code` written to `path`."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(code)
    if luac[-1] == "-e":
        stat = "local f, e = loadfile(%s); if not f then io.stderr:write(e, '\\n'); os.exit(1) end" % lua_string(path)
        cmd = luac + [stat]
    else:
        cmd = luac + [path]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode == 0, (r.stderr or r.stdout).strip().replace(path, os.path.basename(path))


def lua_string(s):
    return "[==[" + s + "]==]"


# ---------------------------------------------------------------------------
# the scratch resource
# ---------------------------------------------------------------------------

def toml_value(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, str):
        return json.dumps(v)
    if isinstance(v, list):
        return "[" + ", ".join(toml_value(x) for x in v) + "]"
    raise TypeError("cannot write %r to resource.toml" % (v,))


def toml_key(k):
    return k if re.match(r"^[A-Za-z0-9_-]+$", k) else json.dumps(k)


def toml_table(name, table, out):
    scalars = {k: v for k, v in table.items() if not isinstance(v, dict)}
    subs = {k: v for k, v in table.items() if isinstance(v, dict)}
    out.append("[%s]" % name)
    for k, v in scalars.items():
        out.append("%s = %s" % (toml_key(k), toml_value(v)))
    out.append("")
    for k, v in subs.items():
        toml_table(name + "." + toml_key(k), v, out)


def write_resource(home, block, code):
    """resources/dtN/ with resource.toml, the block as server/main.lua (client/main.lua for a
    client block) and the extra `files` of its options."""
    folder = os.path.join(home, "resources", block.name)
    lines = ['name = "%s"' % block.name, ""]
    if block.kind == "client":
        lines += ["[client]", 'files = ["main.lua"]', 'obfuscation = "none"', ""]
        target = os.path.join(folder, "client", "main.lua")
    else:
        lines += ["[server]", 'main = "server/main.lua"', ""]
        target = os.path.join(folder, "server", "main.lua")
    if block.opts.get("config"):
        toml_table("config", block.opts["config"], lines)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(os.path.join(folder, "resource.toml"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines).rstrip() + "\n")
    with open(target, "w", encoding="utf-8", newline="\n") as f:
        f.write(code)
    for rel, text in block.opts.get("files", {}).items():
        path = os.path.join(folder, *rel.replace("\\", "/").split("/"))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
    return folder


# ---------------------------------------------------------------------------
# the server
# ---------------------------------------------------------------------------

def can_bind(port, kind):
    s = socket.socket(socket.AF_INET, kind)
    try:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(("0.0.0.0", port))
        return True
    except OSError:
        return False
    finally:
        s.close()


def wait_free(port, timeout):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if can_bind(port, socket.SOCK_STREAM) and can_bind(port, socket.SOCK_DGRAM):
            return True
        time.sleep(0.2)
    return False


def wait_listening(port, timeout):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        try:
            with socket.create_connection((HOST, port), timeout=1):
                return True
        except OSError:
            time.sleep(0.2)
    return False


def wait_for(predicate, timeout, step=0.2):
    end = time.monotonic() + timeout
    while True:
        value = predicate()
        if value or time.monotonic() >= end:
            return value
        time.sleep(step)


class Server:
    """One Node-Server on `port` with `home` as its working directory, stdout in home/server.log."""

    def __init__(self, exe, port, home, env):
        self.exe = exe
        self.port = port
        self.home = home
        self.env = env
        self.log_path = os.path.join(home, "server.log")
        self.proc = None
        self._log = None
        self.exit_code = None

    def start(self):
        if not wait_free(self.port, 15):
            raise RuntimeError("port %d is taken (tcp %s, udp %s)" % (
                self.port, "free" if can_bind(self.port, socket.SOCK_STREAM) else "TAKEN",
                "free" if can_bind(self.port, socket.SOCK_DGRAM) else "TAKEN"))
        env = dict(os.environ)
        env.pop("NODE_TEST_PORT", None)
        env.update(self.env)
        env["NODE_PORT"] = str(self.port)
        self._log = open(self.log_path, "w", encoding="utf-8")
        # Its own process group on Windows, so stop() can send it Ctrl-Break (terminate() there
        # is TerminateProcess and runs no shutdown at all: no serverShutdown, no resourceUnload).
        flags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
        self.proc = subprocess.Popen([self.exe], cwd=self.home, env=env, stdout=self._log,
                                     stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, creationflags=flags)
        if not wait_listening(self.port, 30):
            why = self.why_not_up()
            self.stop()
            raise RuntimeError("the server did not start listening on %d: %s" % (self.port, why))
        return self

    def alive(self):
        return self.proc is not None and self.proc.poll() is None

    def log(self):
        try:
            with open(self.log_path, encoding="utf-8", errors="replace") as f:
                return f.read()
        except OSError:
            return ""

    def wait_log(self, pattern, timeout):
        rx = re.compile(pattern, re.M)
        return wait_for(lambda: rx.search(self.log()) or not self.alive(), timeout)

    def why_not_up(self):
        code = self.proc.poll() if self.proc is not None else None
        bits = ["the process is still running" if code is None else "the process exited with %d" % code]
        tail = [ln.strip() for ln in self.log().splitlines() if ln.strip()][-5:]
        bits.append("last log: " + " | ".join(tail) if tail else "no log yet")
        return "; ".join(bits)

    def stop(self, timeout=10.0):
        """Asks the server to exit cleanly (Ctrl-Break on Windows, SIGTERM elsewhere -- both run the
        shutdown, so serverShutdown and resourceUnload("shutdown") fire) and kills it after `timeout`."""
        if self.proc is not None:
            if self.proc.poll() is None:
                try:
                    if hasattr(signal, "CTRL_BREAK_EVENT"):
                        self.proc.send_signal(signal.CTRL_BREAK_EVENT)
                    else:
                        self.proc.terminate()
                    self.proc.wait(timeout=timeout)
                except (subprocess.TimeoutExpired, OSError):
                    pass
            killed = False
            if self.proc.poll() is None:
                killed = True
                try:
                    self.proc.kill()
                    self.proc.wait(timeout=10)
                except Exception:
                    pass
            self.exit_code = None if killed else self.proc.poll()
            self.proc = None
        if self._log is not None:
            self._log.close()
            self._log = None
        time.sleep(0.3)  # the next server on this port needs the sockets released
        return self.exit_code


# ---------------------------------------------------------------------------
# evaluation
# ---------------------------------------------------------------------------

@dataclass
class Result:
    block: Block
    status: str = "PASS"        # PASS | FAIL | SKIP
    details: list = field(default_factory=list)

    def fail(self, detail):
        self.status = "FAIL"
        self.details.append(detail)

    def skip(self, reason):
        if self.status != "FAIL":
            self.status = "SKIP"
            self.details.append(reason)


def own_lines(log_lines, name):
    """(message, continuation lines) for every `dtN · message` line of the resource."""
    marker = "› " + name + " · "
    out = []
    for i, ln in enumerate(log_lines):
        k = ln.find(marker)
        if k < 0:
            continue
        msg = ln[k + len(marker):]
        cont = []
        j = i + 1
        while j < len(log_lines) and log_lines[j] and not TIMESTAMP_RE.match(log_lines[j]):
            cont.append(log_lines[j].rstrip())
            j += 1
        out.append((msg, cont))
    return out


def evaluate(block, log, received=()):
    """The problems the final server log (and the events the fake players received) show for
    one block; empty = pass."""
    problems = []
    lines = log.split("\n")
    load_rx = re.compile(r"›\s+" + re.escape(block.name) + r"(?: v\S+)? loaded — lua · (.*)$")
    loaded = None
    for ln in lines:
        m = load_rx.search(ln)
        if m:
            loaded = m.group(1).strip()
    if loaded is None:
        problems.append("the resource never loaded (no `%s loaded — lua` line)" % block.name)
    elif block.kind == "client" and "1 client file" not in loaded:
        problems.append("the client file was not packaged: `%s`" % loaded)
    own = own_lines(lines, block.name)
    for msg, cont in own:
        if ERROR_RE.match(msg):
            problems.append("\n".join([msg] + ["    " + c for c in cont[:6]]))
    for rx in block.expects:
        if not any(rx.search(msg) for msg, _ in own):
            problems.append("expect: /%s/ never appeared" % rx.pattern)
    for rx in block.expect_nots:
        hit = next((msg for msg, _ in own if rx.search(msg)), None)
        if hit is not None:
            problems.append("expect-not: /%s/ appeared: %s" % (rx.pattern, hit))
    for rx in block.expect_logs:
        if not any(rx.search(ln) for ln in lines):
            problems.append("expect-log: /%s/ never appeared in the server log" % rx.pattern)
    for rx in block.expect_clients:
        if not any(rx.search(ev) for ev in received):
            problems.append("expect-client: /%s/ was not received by a player (%d event(s) arrived)"
                            % (rx.pattern, len(received)))
    return problems


def expectations_met(block, log, received=()):
    lines = log.split("\n")
    own = [msg for msg, _ in own_lines(lines, block.name)]
    return (all(any(rx.search(m) for m in own) for rx in block.expects)
            and all(any(rx.search(ln) for ln in lines) for rx in block.expect_logs)
            and all(any(rx.search(ev) for ev in received) for rx in block.expect_clients))


class Inbox:
    """What the fake players received, one line per wire event: `Alice chat:msg {"text": ...}`."""

    def __init__(self, testclient):
        self.tc = testclient
        self.lines = []

    def pump(self, clients, budget=0.05):
        for name, c in clients.items():
            try:
                self.add(name, c.drain(budget))
            except self.tc.LOST:
                continue

    def add(self, name, frames):
        for sub, body in frames:
            event, payload = self.tc.parse_event(sub, body)
            if event is not None:
                self.lines.append("%s %s %s" % (name, event, payload.decode(errors="replace")))

    def spawn(self, name, client, car_json, budget=5.0):
        """testclient.Client.spawn, keeping the frames it reads past: the global id, or -1."""
        wire = self.tc.wire
        client.send(wire.Vehicle.SPAWN_REQ, wire.Writer().u32(0).tail(car_json).body)

        def mine(t, b):
            if t is not wire.Vehicle.SPAWN:
                return False
            r = wire.Reader(b)
            r.u32()
            return r.u32() == client.id

        seen = []
        got = client.wait(mine, budget, seen)
        self.add(name, [f for f in seen if f != got])
        return wire.Reader(got[1]).u32() if got != (None, None) else -1


def settle(srv, blocks, max_wait, quiet, minimum, inbox=None, clients=()):
    """Waits for the blocks' expectations: until every one is met, or the log has been quiet for
    `quiet` seconds, or `max_wait` passed -- and at least `minimum` seconds, so a line that arrives
    right after the expected one (an error, an expect-not) is still in the log that is judged.
    Reads what the players receive meanwhile into `inbox`."""
    start = time.monotonic()
    last_size, last_change = -1, start
    while srv.alive():
        if inbox is not None:
            inbox.pump(clients)
        now = time.monotonic()
        log = srv.log()
        size = len(log) + (len(inbox.lines) if inbox is not None else 0)
        if size != last_size:
            last_size, last_change = size, now
        elapsed = now - start
        received = inbox.lines if inbox is not None else ()
        met = blocks is not None and all(expectations_met(b, log, received) for b in blocks)
        if elapsed >= minimum and (met or now - last_change >= quiet or elapsed >= max_wait):
            return
        time.sleep(0.2)



# ---------------------------------------------------------------------------
# the db module
# ---------------------------------------------------------------------------

DB_PRELUDE = """-- doctest: db.lua travels with the resource, as it does for a real one
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\\\]")
package.path = here .. "/?.lua;" .. package.path
local db = require("db").open()
"""


def db_sources():
    """(module, db.lua) for the db blocks, or (None, why) / (module, None).

    The module is built out of tree, so it is looked for where the project's
    builds land; the library is a file in the same repository as its sources.
    DOCTEST_DB_MODULE and DOCTEST_DB_LUA name either directly.
    """
    name = "db.dll" if os.name == "nt" else "db.so"
    module = os.environ.get("DOCTEST_DB_MODULE") or ""
    if module and not os.path.exists(module):
        return None, "DOCTEST_DB_MODULE points at %s, which is not there" % module
    src_roots = [os.path.join(os.path.dirname(ROOT), d, "db")
                 for d in ("plugins", "examples")]
    lua = os.environ.get("DOCTEST_DB_LUA") or ""
    if not lua:
        for root in src_roots:
            candidate = os.path.join(root, "lua", "db.lua")
            if os.path.exists(candidate):
                lua = candidate
                break
    if not module:
        looked = []
        for root in src_roots:
            looked += [os.path.join(root, "build"), os.path.join(root, "build", "Release")]
        up = os.path.dirname(ROOT)
        for base in (os.path.join(up, "_build"),
                     os.path.join(os.path.dirname(up), "_build"),
                     os.path.join(os.path.dirname(os.path.dirname(up)), "_build")):
            looked += [base, os.path.join(base, "node-db-static"), os.path.join(base, "node-db")]
        for folder in looked:
            candidate = os.path.join(folder, name)
            if os.path.exists(candidate):
                module = candidate
                break
    if not module:
        return None, "the db module (%s) was not found; set DOCTEST_DB_MODULE" % name
    if not lua:
        return None, "db.lua was not found; set DOCTEST_DB_LUA"
    return (module, lua), None


def stage_db(home, module, lua, url):
    """modules/ with the module and a db.toml naming one PostgreSQL connection."""
    folder = os.path.join(home, "modules")
    os.makedirs(folder, exist_ok=True)
    shutil.copy2(module, os.path.join(folder, os.path.basename(module)))
    with open(os.path.join(folder, "db.toml"), "w", encoding="utf-8", newline="\n") as f:
        f.write('[connections.default]\ndriver = "postgres"\nurl = "%s"\nconnections = 4\n'
                % url.replace("\\", "\\\\").replace('"', '\\"'))


# ---------------------------------------------------------------------------
# running a page
# ---------------------------------------------------------------------------

class Context:
    def __init__(self, args):
        self.tmp = os.path.abspath(args.tmp)
        self.keep = args.keep
        self.strict = args.strict
        self.db_url = os.environ.get("NODE_DB_URL") or os.environ.get("NODE_DATABASE_URL", "")
        self.db, self.db_why = db_sources()
        self.port = args.port
        self.exe = None
        self.luac = None
        self.directory = None
        self.testclient = None


def payload_bytes(p):
    if p is None:
        return b""
    if isinstance(p, (dict, list)):
        return json.dumps(p).encode()
    if isinstance(p, bytes):
        return p
    return str(p).encode()


def run_page(page, blocks, ctx, port):
    """Runs one page's blocks on one server; (results by block index, warnings)."""
    results = {b.index: Result(b) for b in blocks}
    home = os.path.join(ctx.tmp, page)
    shutil.rmtree(home, ignore_errors=True)
    os.makedirs(os.path.join(home, "resources"))
    os.makedirs(os.path.join(home, "content"))
    shutil.copytree(CHAT_DIR, os.path.join(home, "resources", "chat"))

    for b in blocks:
        r = results[b.index]
        if b.error:
            r.fail(b.error)
            continue
        if b.kind in ("skip", "client"):
            ok, msg = syntax_check(ctx.luac, b.code, os.path.join(home, "syntax", b.name + ".lua"))
            if not ok:
                r.fail("luac: " + (msg or "syntax error"))
            elif b.kind == "skip":
                r.skip(b.reason)
    runnable = [b for b in blocks if b.runs and results[b.index].status != "FAIL"]
    needs_db = any(b.needs_db for b in runnable)
    # Two things a db block needs and cannot make for itself: a database to
    # talk to, and the module that talks to it (built out of this tree).
    missing, fatal = "", False
    if needs_db and not ctx.db_url:
        # A URL is configuration, and --strict exists to catch a CI that lost it.
        missing, fatal = "NODE_DB_URL is not set", True
    elif needs_db and ctx.db is None:
        # The module is a build artifact of another repository. Not having it
        # is not a mistake this run can be blamed for, so it is a skip even
        # under --strict -- with the reason on the line, not a silent pass.
        missing = ctx.db_why
    if missing:
        for b in [b for b in runnable if b.needs_db]:
            if ctx.strict and fatal:
                results[b.index].fail(missing + " (--strict)")
            else:
                results[b.index].skip(missing)
        runnable = [b for b in runnable if not b.needs_db]
        needs_db = False
    if needs_db:
        stage_db(home, ctx.db[0], ctx.db[1], ctx.db_url)
    for b in runnable:
        code = resource_code(b, blocks)
        folder = write_resource(home, b, (DB_PRELUDE + code) if b.needs_db else code)
        if b.needs_db:
            shutil.copy2(ctx.db[1], os.path.join(folder, "server", "db.lua"))
    if not runnable:
        return results, None

    env = announcing_env(ctx.directory.url)
    env.update({
        "NODE_OBFUSCATE": "false",
        "NODE_VERIFY_GAME": "off",
        "NODE_DEBUG": "false",
        "NODE_NAME": "docs doctest " + page,
        # The module reads modules/db.toml; nothing about the database is the
        # server's business any more.
    })
    srv = Server(ctx.exe, port, home, env)
    warnings = []
    clients = {}
    inbox = Inbox(ctx.testclient) if ctx.testclient else None
    try:
        srv.start()
        if not srv.wait_log(r"server is ready", 30) or not srv.alive():
            raise RuntimeError("the server never became ready: " + srv.why_not_up())
        if needs_db:
            if not srv.wait_log(r"db\[default\]: connected to", 20):
                raise RuntimeError("the database never became reachable: " + srv.why_not_up())
            # The examples poll db:ready() every 500 ms and then run their migrations; a player
            # joins once that has gone quiet, so the tables the join handlers query exist.
            settle(srv, None, 10.0, quiet=1.5, minimum=2.0)
        else:
            time.sleep(0.5)

        players = []
        for b in runnable:
            if b.needs_client:
                for p in b.opts.get("players", ["Alice"]):
                    if p not in players:
                        players.append(p)
        if players:
            tc = ctx.testclient
            for name in players:
                try:
                    clients[name] = tc.Client(port, hint=name, name=name, ticket=ticket_of(name), ready_timeout=20)
                except Exception as e:  # a refusal, a kick, a dead server
                    raise RuntimeError("%s could not join: %s" % (name, e)) from None
                inbox.pump(clients, 0.3)  # what the join handlers sent this player
            for b in runnable:
                if b.opts.get("spawn"):
                    car = dict(CAR, jbm=b.opts["spawn"])
                    try:
                        gid = inbox.spawn(players[0], clients[players[0]], json.dumps(car))
                    except tc.LOST as err:
                        gid = -1
                        warnings.append("%s could not spawn: %s" % (players[0], err))
                    if gid < 0:
                        warnings.append("%s: the spawn of a %s for %s was not answered (denied?)"
                                        % (b.where, car["jbm"], players[0]))
                    time.sleep(0.3)
            for b in runnable:
                for e in b.opts.get("emit", []):
                    sender = e[2] if len(e) == 3 else players[0]
                    try:
                        clients[sender].send_event(e[0], payload_bytes(e[1]))
                    except tc.LOST as err:
                        warnings.append("%s could not send %s: %s" % (sender, e[0], err))
                    time.sleep(0.3)
                    if inbox is not None:
                        inbox.pump(clients)

        # Phase 1, players connected: what the examples log at load, on the join and on the
        # events sent above. Phase 2, after the players left: the playerLeft handlers. What runs
        # at the stop (serverShutdown, resourceUnload) is judged from the final log.
        max_wait = max([float(b.opts.get("wait", DEFAULT_WAIT)) for b in runnable] + [1.0])
        settle(srv, runnable, max_wait, quiet=3.0, minimum=2.0, inbox=inbox, clients=clients)
        crashed = not srv.alive()
        for c in clients.values():
            try:
                c.close()
            except Exception:
                pass
        if clients and not crashed:
            settle(srv, runnable, 8.0, quiet=2.0, minimum=1.0)
            crashed = not srv.alive()
        code = srv.stop()
        log = srv.log()
        received = inbox.lines if inbox is not None else []
        if crashed:
            for b in runnable:
                results[b.index].fail("the server exited while the page ran (code %r)" % code)
        elif code not in (0, None):
            warnings.append("the server exited with code %r at the stop" % code)
        elif code is None:
            warnings.append("the server did not stop within 10 s of the stop request and was killed")
        for b in runnable:
            for p in evaluate(b, log, received):
                results[b.index].fail(p)
        for ln in log.split("\n"):
            if STALL_RE.search(ln):
                warnings.append(ln.strip())
        if received and (ctx.keep or any(r.status == "FAIL" for r in results.values())):
            with open(os.path.join(home, "received.log"), "w", encoding="utf-8", newline="\n") as f:
                f.write("\n".join(received) + "\n")
    except RuntimeError as e:
        for c in clients.values():
            try:
                c.close()
            except Exception:
                pass
        srv.stop()
        for b in runnable:
            results[b.index].fail(str(e))
    return results, warnings


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def find_server(explicit):
    cands = []
    if explicit:
        cands.append(explicit)
    if os.environ.get("DOCTEST_SERVER"):
        cands.append(os.environ["DOCTEST_SERVER"])
    parent = os.path.dirname(ROOT)
    cands += [
        os.path.join(ROOT, ".server", "Node-Server"),
        os.path.join(ROOT, ".server", "Node-Server.exe"),
    ]
    if os.environ.get("NODEMP_SERVER_DIR"):
        cands += [os.path.join(os.environ["NODEMP_SERVER_DIR"], "run", "Node-Server"),
                  os.path.join(os.environ["NODEMP_SERVER_DIR"], "run", "Node-Server.exe")]
    cands += [
        os.path.join(parent, "server", "run", "Node-Server"),
        os.path.join(parent, "server", "run", "Node-Server.exe"),
    ]
    for c in cands:
        if c and os.path.isfile(c):
            return os.path.abspath(c), cands
    return None, cands


HELPERS = ("wire.py", "wire_taxonomy.py", "testclient.py")


def find_server_run(explicit=None):
    """The run/ folder of a NodeMP-BeamNG/server checkout holding the three helpers, or None
    with the places that were looked at: NODEMP_SERVER_DIR, ./server (CI), ../server."""
    cands = []
    for d in (explicit, os.environ.get("NODEMP_SERVER_DIR"), os.path.join(ROOT, "server"),
              os.path.join(os.path.dirname(ROOT), "server")):
        if d:
            cands.append(os.path.join(os.path.abspath(d), "run"))
    for c in cands:
        if all(os.path.isfile(os.path.join(c, h)) for h in HELPERS):
            return c, cands
    return None, cands


def select_pages(only):
    pages = sorted(p for p in os.listdir(EN_DIR) if p.endswith(".md"))
    if only:
        want = os.path.splitext(os.path.basename(only.replace("\\", "/").rstrip("/")))[0]
        pages = [p for p in pages if os.path.splitext(p)[0] == want]
        if not pages:
            raise SystemExit("doctest: no page named %r under src/content/docs/plugins/" % only)
    return [os.path.join(EN_DIR, p) for p in pages]


def table(rows):
    widths = [max(len(str(r[i])) for r in rows) for i in range(len(rows[0]))]
    for r in rows:
        print("  ".join(str(c).ljust(w) for c, w in zip(r, widths)).rstrip())


def main(argv=None):
    ap = argparse.ArgumentParser(description="run the Lua examples of the plugin guides against a Node-Server")
    ap.add_argument("--only", metavar="PAGE", help="one page (events, plugins/events, a path)")
    ap.add_argument("--keep", action="store_true", help="keep every scratch server home (the failing ones are kept anyway)")
    ap.add_argument("--list", action="store_true", help="classify the blocks and print the table without running anything")
    ap.add_argument("--strict", action="store_true", default=os.environ.get("DOCTEST_STRICT") == "1",
                    help="a missing NODE_DB_URL or db module fails the db blocks instead of skipping them (CI)")
    ap.add_argument("--server", metavar="EXE", help="the Node-Server binary (default: $DOCTEST_SERVER, ../server/run, .server/)")
    ap.add_argument("--tmp", default=os.path.join(ROOT, ".doctest"), help="the scratch directory (default: .doctest/)")
    ap.add_argument("--port", type=int, default=int(os.environ.get("DOCTEST_PORT", DEFAULT_PORT)),
                    help="the first port of the range the servers use (default %d)" % DEFAULT_PORT)
    ap.add_argument("--self-test", action="store_true", help="run the runner's own unit tests")
    args = ap.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if args.self_test:
        import unittest
        sys.path.insert(0, HERE)
        import run_test
        suite = unittest.defaultTestLoader.loadTestsFromModule(run_test)
        return 0 if unittest.TextTestRunner(verbosity=1).run(suite).wasSuccessful() else 1

    pages = [load_page(p) for p in select_pages(args.only)]
    ru = {page: ru_findings(page, blocks) for page, blocks in pages}

    if args.list:
        rows = [("page", "block", "line", "kind", "expects", "tag")]
        for page, blocks in pages:
            for b in blocks:
                rows.append((page, b.name, b.line, b.kind or "?", len(b.expects) + len(b.expect_logs),
                             b.error or (b.tag if len(b.tag) <= 60 else b.tag[:57] + "...")))
        table(rows)
        bad = sum(1 for _, blocks in pages for b in blocks if b.error)
        for page, findings in ru.items():
            for f in findings:
                print("RU %s: %s" % (page, f))
        return 1 if bad or any(ru.values()) else 0

    ctx = Context(args)
    exe, looked = find_server(args.server)
    if exe is None:
        print("doctest: no Node-Server binary; pass --server or set DOCTEST_SERVER. Looked at:\n  " + "\n  ".join(looked))
        return 2
    ctx.luac = find_luac()
    if ctx.luac is None:
        print("doctest: no luac/lua on PATH (install lua5.4 or set DOCTEST_LUAC); the syntax checks need one")
        return 2
    if any(b.needs_client for _, blocks in pages for b in blocks):
        run_dir, looked = find_server_run()
        if run_dir is None:
            print("doctest: no server checkout with run/wire.py, run/wire_taxonomy.py and run/testclient.py "
                  "(the fake player's codec); set NODEMP_SERVER_DIR. Looked at:\n  " + "\n  ".join(looked))
            return 2
        sys.path.insert(0, run_dir)
        try:
            import testclient
            ctx.testclient = testclient
        except ImportError as e:
            print("doctest: the fake client needs the `zstandard` package (pip install zstandard): %s" % e)
            return 2
    if args.strict and not ctx.db_url and any(b.needs_db for _, blocks in pages for b in blocks):
        print("doctest: --strict and NODE_DB_URL is not set; the db blocks cannot run")
        return 2

    os.makedirs(ctx.tmp, exist_ok=True)
    # A private copy of the binary: modules are loaded from the folder next to the executable, and
    # the examples must run on the bare server, not with whatever modules a developer keeps there.
    bin_dir = os.path.join(ctx.tmp, "bin")
    os.makedirs(bin_dir, exist_ok=True)
    ctx.exe = os.path.join(bin_dir, os.path.basename(exe))
    shutil.copy2(exe, ctx.exe)
    version = subprocess.run([ctx.exe, "--version"], capture_output=True, text=True, encoding="utf-8",
                             errors="replace").stdout.strip().splitlines()
    print("doctest: %s (%s), luac: %s, database: %s%s" % (
        exe, version[0] if version else "version unknown", " ".join(ctx.luac[:1]),
        "NODE_DB_URL set" if ctx.db_url else "none (db blocks %s)" % ("fail" if args.strict else "skip"),
        (", wire helpers: " + os.path.dirname(ctx.testclient.__file__)) if ctx.testclient else ""))

    all_results = []
    kept = []
    failed_pages = []
    with Directory(ctx.port) as directory:
        ctx.directory = directory
        for i, (page, blocks) in enumerate(pages):
            port = ctx.port + 1 + i
            t0 = time.monotonic()
            results, warnings = run_page(page, blocks, ctx, port)
            n_fail = sum(1 for r in results.values() if r.status == "FAIL")
            print("doctest: %s -- %d block(s), %d failed, %.1f s" % (page, len(blocks), n_fail, time.monotonic() - t0))
            for w in warnings or []:
                print("  warning: " + w)
            all_results.extend(results[b.index] for b in blocks)
            home = os.path.join(ctx.tmp, page)
            if n_fail:
                failed_pages.append(page)
            if (n_fail or ctx.keep) and os.path.isdir(home):
                kept.append(home)
            elif os.path.isdir(home):
                shutil.rmtree(home, ignore_errors=True)

    print()
    rows = [("page", "block", "line", "kind", "result", "detail")]
    for r in all_results:
        b = r.block
        detail = r.details[0].split("\n")[0] if r.details else ""
        if len(r.details) > 1:
            detail += "  (+%d more)" % (len(r.details) - 1)
        rows.append((b.page, b.name, b.line, b.kind or "?", r.status, detail))
    table(rows)
    print()
    for page, findings in ru.items():
        for f in findings:
            print("FAIL ru/plugins/%s.md: %s" % (page, f))
    failures = [r for r in all_results if r.status == "FAIL"]
    for r in failures:
        print("FAIL %s (%s, %s):" % (r.block.where, r.block.name, r.block.kind or "untagged"))
        for d in r.details:
            print("    " + d.replace("\n", "\n    "))
    passed = sum(1 for r in all_results if r.status == "PASS")
    skipped = sum(1 for r in all_results if r.status == "SKIP")
    ru_bad = sum(len(v) for v in ru.values())
    print("doctest: %d block(s) on %d page(s): %d passed, %d failed, %d skipped; ru parity: %s"
          % (len(all_results), len(pages), passed, len(failures), skipped, "ok" if not ru_bad else "%d problem(s)" % ru_bad))
    if kept:
        print("doctest: server homes kept under %s: %s" % (ctx.tmp, ", ".join(os.path.basename(k) for k in kept)))
    return 1 if failures or ru_bad else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
