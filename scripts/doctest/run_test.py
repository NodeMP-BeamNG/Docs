#!/usr/bin/env python3
"""Unit tests of the doctest runner's pure parts: block extraction, the tag grammar, the
expectation comments, the RU parity check and the judging of a server log.

    python scripts/doctest/run.py --self-test
"""
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import run  # noqa: E402

PAGE = """---
title: T
---

Prose.

<!-- doctest: server -->
```lua
node.log("one")

-- expect: one
```

```toml
name = "x"
```

Some prose right above the fence.
```lua
node.log("two")
```

<!-- doctest: skip needs a real game client -->

```lua
print("three")
```
"""


class ExtractTests(unittest.TestCase):
    def test_lua_blocks_with_their_tags(self):
        got = run.extract_blocks(PAGE)
        self.assertEqual([(line, tag) for line, _, tag in got],
                         [(8, "server"), (19, None), (25, "skip needs a real game client")])
        self.assertEqual(got[0][1], 'node.log("one")\n\n-- expect: one\n')
        self.assertEqual(got[2][1], 'print("three")\n')

    def test_other_fences_are_ignored_and_crlf_is_normalised(self):
        got = run.extract_blocks(PAGE.replace("\n", "\r\n").replace("\r\n", "\n"))
        self.assertEqual(len(got), 3)

    def test_unclosed_fence_runs_to_the_end(self):
        got = run.extract_blocks("<!-- doctest: server -->\n```lua\nnode.log(1)\n")
        self.assertEqual(got, [(2, "node.log(1)\n", "server")])

    def test_longer_fence_closes_only_with_as_many_ticks(self):
        got = run.extract_blocks("<!-- doctest: server -->\n````lua\n```\nx = 1\n````\n")
        self.assertEqual(got[0][1], "```\nx = 1\n")


class TagTests(unittest.TestCase):
    def test_plain_kinds(self):
        self.assertEqual(run.parse_tag("server"), ("server", {}, ""))
        self.assertEqual(run.parse_tag("pg"), ("pg", {}, ""))
        self.assertEqual(run.parse_tag("client"), ("client", {}, ""))
        self.assertEqual(run.parse_tag("skip needs the launcher"), ("skip", {}, "needs the launcher"))

    def test_client_options(self):
        kind, opts, _ = run.parse_tag('server+client {"emit": [["chat:send", {"text": "/hello"}]], "players": ["Alice", "Bob"], "spawn": "coupe"}')
        self.assertEqual(kind, "server+client")
        self.assertEqual(opts["emit"], [["chat:send", {"text": "/hello"}]])
        self.assertEqual(opts["players"], ["Alice", "Bob"])
        kind, opts, _ = run.parse_tag('pg+client {"config": {"admins": [42]}, "wait": 20, "with": [5], "files": {"server/util.lua": "return {}"}}')
        self.assertEqual(kind, "pg+client")
        self.assertEqual(opts["config"], {"admins": [42]})

    def test_rejections(self):
        for tag, why in [
            ("skip", "reason"),
            ("run", "unknown tag"),
            ("server {", "not JSON"),
            ("server []", "JSON object"),
            ('server {"emit": []}', "+client"),
            ('server+client {"players": ["Zed"]}', "players"),
            ('server+client {"emit": ["chat:send"]}', "emit"),
            ('server+client {"emit": [["chat:send", {}, "Bob"]]}', "sender"),
            ('server+client {"spawn": 1}', "spawn"),
            ('server {"config": 1}', "config"),
            ('server {"files": {"../x.lua": ""}}', "files"),
            ('server {"with": [0]}', "with"),
            ('server {"wait": 0}', "wait"),
            ('server {"bogus": 1}', "unknown option"),
        ]:
            with self.assertRaises(ValueError, msg=tag) as cm:
                run.parse_tag(tag)
            self.assertIn(why, str(cm.exception), tag)


class ExpectTests(unittest.TestCase):
    def test_four_kinds(self):
        ex, exnot, exlog, excl = run.parse_expects(
            "x = 1\n-- expect: a\\d+\n  -- expect-not: b\n-- expect-log: Kick.*\n-- expect-client: Alice chat:msg .*hi\n-- expected: not one\n")
        self.assertEqual([r.pattern for r in ex], ["a\\d+"])
        self.assertEqual([r.pattern for r in exnot], ["b"])
        self.assertEqual([r.pattern for r in exlog], ["Kick.*"])
        self.assertEqual([r.pattern for r in excl], ["Alice chat:msg .*hi"])

    def test_bad_or_empty_regex(self):
        with self.assertRaises(ValueError):
            run.parse_expects("-- expect: (\n")
        with self.assertRaises(ValueError):
            run.parse_expects("-- expect-not:\n")


class PageTests(unittest.TestCase):
    def write(self, folder, name, text):
        path = os.path.join(folder, name)
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        return path

    def test_load_page_classifies_and_validates_with(self):
        with tempfile.TemporaryDirectory() as d:
            path = self.write(d, "p.md",
                              "<!-- doctest: server -->\n```lua\nlocal function f() end\n```\n\n"
                              '<!-- doctest: pg {"with": [1]} -->\n```lua\nf()\n-- expect: ok\n```\n\n'
                              '<!-- doctest: server {"with": [3]} -->\n```lua\nx()\n```\n\n'
                              "```lua\nuntagged()\n```\n\n"
                              "<!-- doctest: server -->\n```lua\ny()\n-- expect-client: z\n```\n")
            page, blocks = run.load_page(path)
            self.assertEqual(page, "p")
            self.assertEqual([b.kind for b in blocks], ["server", "pg", "server", None, "server"])
            self.assertIsNone(blocks[0].error)
            self.assertIsNone(blocks[1].error)
            self.assertIn("not an earlier block", blocks[2].error)
            self.assertIn("no <!-- doctest", blocks[3].error)
            self.assertIn("+client", blocks[4].error)
            self.assertEqual(run.resource_code(blocks[1], blocks), "local function f() end\n\nf()\n-- expect: ok\n")
            self.assertTrue(blocks[1].needs_pg and not blocks[1].needs_client and blocks[1].runs)
            self.assertFalse(blocks[3].runs)

    def test_ru_parity(self):
        with tempfile.TemporaryDirectory() as d:
            en_dir, ru_dir = os.path.join(d, "en"), os.path.join(d, "ru")
            os.makedirs(en_dir)
            os.makedirs(ru_dir)
            en = "<!-- doctest: server -->\n```lua\nnode.log(1)\n```\n\n<!-- doctest: client -->\n```lua\nlocal M = {}\nreturn M\n```\n"
            _, blocks = run.load_page(self.write(en_dir, "p.md", en))
            self.write(ru_dir, "p.md", "Проза.\n\n" + en)
            self.assertEqual(run.ru_findings("p", blocks, ru_dir), [])
            self.write(ru_dir, "p.md", en.replace("<!-- doctest: client -->", "").replace("return M", "return  M"))
            findings = run.ru_findings("p", blocks, ru_dir)
            self.assertEqual(len(findings), 2)
            self.assertIn("tag differs", findings[0])
            self.assertIn("code differs from line 2", findings[1])
            self.write(ru_dir, "p.md", "```lua\nx\n```\n")
            self.assertTrue(any("has 1 lua blocks" in f for f in run.ru_findings("p", blocks, ru_dir)))
            self.assertEqual(run.ru_findings("q", blocks, ru_dir), ["no Russian twin at ru/plugins/q.md"])


LOG = """14:38:24  Res    › dt1 · hello loaded, players online: 0
14:38:24  Res    › dt1 loaded — lua · server 1 file · 0 client files
14:38:24  Res    › dt2 loaded — lua · server 0 files · 1 client file
14:38:24  Warn   › dt3 · [deprecated] event "playerJoin" is now "playerJoined"
14:38:24  Res    › dt3 v1.0 loaded — lua · server 1 file · 0 client files
14:38:25  Res    › dt1 · Player#0 Alice joined from 127.0.0.1
14:38:25  Error  › dt1 · error in event 'boom': .../server/main.lua:19: attempt to index a nil value (local 'x')
stack traceback:
\t.../server/main.lua:19: in function <.../server/main.lua:17>
14:38:43  Kick   › Bob kicked — Spamming
"""


def block(index, kind, code):
    b = run.Block(page="p", path="p.md", index=index, line=1, code=code, tag=kind)
    b.kind = kind
    b.expects, b.expect_nots, b.expect_logs, b.expect_clients = run.parse_expects(code)
    return b


class EvaluateTests(unittest.TestCase):
    def test_own_lines_carry_the_traceback(self):
        own = run.own_lines(LOG.split("\n"), "dt1")
        self.assertEqual([m for m, _ in own][:2], ["hello loaded, players online: 0", "Player#0 Alice joined from 127.0.0.1"])
        self.assertEqual(own[2][1], ["stack traceback:", "\t.../server/main.lua:19: in function <.../server/main.lua:17>"])

    def test_errors_expectations_and_load_line(self):
        problems = run.evaluate(block(1, "server", "-- expect: players online: 0\n-- expect-not: Bob joined\n-- expect-log: Bob kicked — Spamming\n"), LOG)
        self.assertEqual(len(problems), 1)
        self.assertTrue(problems[0].startswith("error in event 'boom'"))
        self.assertIn("stack traceback", problems[0])
        problems = run.evaluate(block(1, "server", "-- expect: never\n-- expect-not: Alice joined\n-- expect-log: nope\n"), LOG.replace("error in", "fine in"))
        self.assertEqual([p.split(":")[0] for p in problems], ["expect", "expect-not", "expect-log"])
        self.assertEqual(run.evaluate(block(2, "client", ""), LOG), [])
        self.assertIn("client file was not packaged", run.evaluate(block(2, "client", ""), LOG.replace("1 client file", "0 client files"))[0])
        problems = run.evaluate(block(3, "server", ""), LOG)
        self.assertTrue(problems and problems[0].startswith("[deprecated]"))
        self.assertIn("never loaded", run.evaluate(block(4, "server", ""), LOG)[0])

    def test_client_expectations(self):
        b = block(1, "server+client", "-- expect-client: Alice chat:msg .*Welcome\n")
        received = ["Alice chat:msg {\"text\":\"Welcome, Alice\"}"]
        self.assertEqual(run.evaluate(b, LOG.replace("error in", "fine in"), received), [])
        self.assertTrue(run.expectations_met(b, LOG, received))
        self.assertFalse(run.expectations_met(b, LOG, []))
        self.assertIn("expect-client", run.evaluate(b, LOG.replace("error in", "fine in"), [])[0])


class NothingVendoredTests(unittest.TestCase):
    """scripts/doctest/lib/ holds this repository's own code only. The server repository and
    the examples are not public; their files must not be copied into this public one. The
    runner imports the wire codec and the fake client from a server checkout at run time."""

    LIB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib")
    FORBIDDEN_NAMES = {"wire.py", "wire_taxonomy.py", "testclient.py", "servertest.py", "identity_test.py"}
    # Fingerprints of the server's run/ helpers and of the chat example: a header line, a
    # definition that only exists there.
    FORBIDDEN_MARKERS = (
        "Node wire v1",                       # wire.py docstring
        "def chacha20_block",                 # wire.py
        "GENERATED by sdk/tools/wiregen.py",  # wire_taxonomy.py
        "One fake launcher client",           # testclient.py docstring
        "Spawn a Node-Server for a test",     # servertest.py docstring
        "Node example resource \"chat\"",     # examples/chat/server/main.lua
        "recipientsFor",                      # examples/chat/server/main.lua
        "NodeMP server",                      # the server's source headers
    )

    def files(self):
        for folder, dirs, names in os.walk(self.LIB):
            dirs[:] = [d for d in dirs if d != "__pycache__"]
            for n in names:
                yield os.path.join(folder, n)

    def test_no_server_or_example_file_by_name(self):
        found = sorted(os.path.relpath(p, self.LIB) for p in self.files() if os.path.basename(p) in self.FORBIDDEN_NAMES)
        self.assertEqual(found, [], "server/run files copied into scripts/doctest/lib/: %s" % found)

    def test_no_server_or_example_content(self):
        hits = []
        for path in self.files():
            with open(path, encoding="utf-8", errors="replace") as f:
                text = f.read()
            for marker in self.FORBIDDEN_MARKERS:
                if marker in text:
                    hits.append("%s contains %r" % (os.path.relpath(path, self.LIB), marker))
        self.assertEqual(hits, [], "private code copied into scripts/doctest/lib/:\n" + "\n".join(hits))

    def test_runner_does_not_import_the_helpers_from_lib(self):
        with open(os.path.join(os.path.dirname(self.LIB), "run.py"), encoding="utf-8") as f:
            src = f.read()
        self.assertNotIn("from wire import", src)
        self.assertIn("find_server_run", src)


class TomlTests(unittest.TestCase):
    def test_config_table(self):
        out = []
        run.toml_table("config", {"admins": [42, 108], "url": "http://x/?a=1", "on": True, "nested": {"depth": 2.5}}, out)
        self.assertEqual(out, ["[config]", "admins = [42, 108]", 'url = "http://x/?a=1"', "on = true", "",
                              "[config.nested]", "depth = 2.5", ""])


if __name__ == "__main__":
    unittest.main()
