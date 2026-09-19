# NodeMP Documentation

Source for https://docs.nodemp.com, built with [Astro](https://astro.build/) and
[Starlight](https://starlight.astro.build/). English is served at `/`, Russian at `/ru/`.

## Run locally

Requirements: Node 22 or newer with npm, and Python 3.12 (`python3` or `python` on `PATH`) for
the API reference generator.

```bash
npm ci
npm run dev      # http://localhost:4321
npm run build    # static output in dist/, with link validation
```

`npm run dev` and `npm run build` first run `scripts/import-api.mjs`, which generates the API
reference from the `sdk` repository:

- **With the sdk** — clone `NodeMP-BeamNG/sdk` next to this repository (`../sdk`) or point
  `NODEMP_SDK_DIR` at a checkout. The script copies `api.toml`, `node.h`, `lua/prelude.lua` and
  `tools/apigen.py` into a scratch folder, runs `apigen.py docs` and writes the five pages of
  `plugins/api/` into both locales. `NODEMP_PYTHON` names the interpreter to try first.
- **Without the sdk** — the script writes one placeholder page (`plugins/api/index.md`), so
  `npm run dev` and `npm run build` both work and `/plugins/api/` resolves. While only the
  placeholder exists, `astro.config.mjs` tells the link validator to skip links into
  `/plugins/api/**` and `/ru/plugins/api/**` (the plugin-development pages deep-link into
  `/plugins/api/lua/`, `/plugins/api/events/` and `/plugins/api/c/`); with the sdk present nothing
  is skipped. CI always builds the real reference: it sets `IMPORT_API_STRICT=1`, so a missing sdk,
  Python or guide page fails the job instead of falling back.

The generated pages are ignored by git (`src/content/docs/plugins/api/`,
`src/content/docs/ru/plugins/api/`). **The API reference is generated: edit `sdk/api.toml`, never
the generated pages.** The Russian copy of the reference is the English text by design.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Imports the API reference, then starts the Astro dev server. |
| `npm run build` | Imports the API reference, builds `dist/` and validates every internal link and anchor (`starlight-links-validator`; relative links are errors). |
| `npm test` | Runs the unit tests of the scripts (`node --test "scripts/*.test.mjs"`) and of the doctest runner (`scripts/doctest/run.py --self-test`). |
| `npm run check` | Runs `check:locales`, `check:stale` and `check:claims`; exit code 1 on the first problem. |
| `npm run doctest` | Runs every Lua example of the plugin guides against a real `Node-Server` ([Doctests](#doctests)). `-- --only <page>`, `-- --keep`, `-- --list`. |
| `npm run check:locales` | EN/RU parity: every page under `src/content/docs/` needs a twin at `ru/<same path>`, and every RU page needs an EN original. The generated `plugins/api/` is exempt. |
| `npm run check:stale` | Fails on old-stack wording (list below), case-insensitive, with file and line. The generated `plugins/api/` is exempt. |
| `npm run check:claims` | Compares what the pages state with the code that defines it (section below). Needs the `server`, `sdk`, `launcher`, `NodeMP` and `UI-launcher` checkouts beside this repository; without one of them the checks that need it are skipped with a warning (CI fails instead). |
| `npm run gen:api` | Runs the API import on its own (useful before `npm start`, which has no hook). |

## Gates

CI (`.github/workflows/ci.yml`, on pull requests and non-`main` pushes) and the Pages deploy
(`.github/workflows/deploy.yml`, on `main`) both check out the sdk, the server, the launcher, the
client mod (`NodeMP`) and the launcher interface (`UI-launcher`) with read-only deploy keys and
run `npm test`, `npm run check` and `npm run build` with `IMPORT_API_STRICT=1`; a second job,
`doctest`, runs the Lua examples of the plugin guides against the released server ([Doctests](#doctests)).
A change fails CI when:

- a page has no twin in the other locale (`check-locales`);
- a page contains one of the stale phrases (`check-stale`);
- a page states something the code does not (`check-claims`, below);
- an internal link or `#anchor` does not resolve (the build);
- a guide page the API reference links to does not exist (`IMPORT_API_STRICT=1`; without the
  flag the import links such guides to `/plugins/overview/` and prints one summary line);
- a Lua example under `plugins/` has no doctest tag, does not load, logs an error or a deprecated
  event name, misses a line it says it prints, or differs from its Russian twin (`doctest`).

Stale phrases (`scripts/check-stale.mjs`, `DEFAULT_PHRASES`): `BeamMP-compatible`,
`BeamMP compatible`, `ServerConfig.toml`, `[Backend]`, `NODEMP_BACKEND_URL`, `backend-less`,
`Resources/Server`, `NodeMP mesh`, `on the mesh`, `v12`, `v13`, and the variants the terminology
pass retired in favour of the glossary's words: `hoster` / `хостер` (say *host*), `press Play` /
`нажимаете Play` (the button is *Hold to play*), `guest mode` / `гостевой режим` (say *Test
Drive*), `in the NodeMP sources` / `в исходниках NodeMP` (the examples ship in the release
archive) and `directory.nodemp.com` (the directory is `api.nodemp.com`). Three pages are
allow-listed by path: `introduction/differences-from-beammp.md` and `plugins/migrating.md` discuss
the old stack on purpose, and `reference/glossary.md` names the retired variants in order to
retire them (all in both locales). Add a phrase to `DEFAULT_PHRASES` rather than weakening a
page; add a page to `DEFAULT_ALLOW` only when it has to name the old words.

`reference/glossary.md` is the arbiter for terminology: one word per thing, in both locales, with
the Russian term beside each English one. When a page needs a word for something the glossary
covers, use the glossary's word; when the software itself prints another word (a log line, a
toast), quote the software and say which glossary term it means. `reference/faq.md` collects the
questions readers actually asked, each answered in a few lines with a link to the page that has
the details; a new recurring question goes there, not into a new page.

The pages describe the current release, in the present tense. A behaviour that the *next* server
release changes may be documented from the release branch ahead of time, marked `(server x.y.z)`
next to what the current release does; `check-claims` flags the version mention, so
`scripts/claims-allow.json` then carries an entry for `server x.y.z` / `сервер x.y.z` (and for the
flags and keys that only exist there) with the reason. The release bump (`versions.json`, the
release strings, the doctest job's `SERVER_VERSION`) removes those entries, rewrites the notes
into present-tense behaviour, and keeps a short "before x.y.z: …" sentence only where a host on
the old release still needs it - the way `plugins/events.md` keeps the pre-1.2.0 event names.

The expected clean output is:

```
check-locales: EN and RU trees match
check-stale: clean (N files)
check-claims: clean (N pages, 6 checks, M allowlisted)
```

### Claims against the code (`check-claims`)

`scripts/check-claims.mjs` (library in `scripts/lib/claims/`) reads the code repositories beside
this one -- `NODEMP_SERVER_DIR` (`../server`), `NODEMP_SDK_DIR` (`../sdk`), `NODEMP_LAUNCHER_DIR`
(`../launcher`), `NODEMP_MOD_DIR` (`../NodeMP`), `NODEMP_UI_LAUNCHER_DIR` (`../UI-launcher`), all on
`main` in CI -- and reports every place a page disagrees with them, as
`page:line: [check] claim — expected: …; actual: …`:

| Check | What it compares |
|---|---|
| `config.*` | The `server.toml` table and the example file on `hosting/configuration` against `server/src/core/Config.cpp` + `Settings.cpp`: every section, key, type, default and `NODE_*` name, in the order the server writes them; "N sections" claims on any page; `[Section] Key` mentions and `NODE_*` names on any page. |
| `cli.*` | The `Node-Server --help` block against the help text in `server/src/core/main.cpp` (the binary prints that string verbatim), and every `Node-Server --flag` mention against the flags it registers. |
| `kick.*` | `players/troubleshooting` and `reference/error-codes`: every quoted server refusal is a literal of the server (`ClientKick` texts, with `{}` and `…` as wildcards); every `ClientKick` text has a row; the refusals the launcher interface rewrites (`UI-launcher/src/lib/joinErrors.ts`, evaluated as it ships) are documented with the words the player sees; helper exit-code rows name a real log line and the code that follows it; every other quoted message exists in the server, the helper or the launcher interface. |
| `events.*` | Event names on every page against `sdk/api.toml`: a deprecated alias may appear only in a table column headed *Before 1.2.0* / *Formerly* / *Alias* / *BeamMP*, in a paragraph that says *formerly*, *deprecated*, *alias*, *before 1.2.0* or *renamed* (RU: *прежн…*, *устаревш…*, *псевдоним*, *до 1.2.0*, *переименован*), or on a code line that says so; `old` → `new` pairs must match the alias table; unknown event-like names are reported. |
| `versions.*` | Every version a page states (server, launcher, client mod, wire protocol, C ABI, game, Docker tag -- as `Node-Server 1.2.0`, `server-v1.2.0`, `launcher 1.1.0`, `wire protocol v18`, `(ABI 1.12)`, `BeamNG 0.39.4.0`, `ghcr.io/nodemp-beamng/server:v1.2.0`, table cells, ...) against `src/content/versions.json`, and that file against the code (`CMakeLists.txt`, `Startup.cpp`, `package.json`, `sdk.lua`, `Protocol.h`, `node.h`). A release bumps `versions.json`, then fixes the pages the check lists. |
| `protocol.*` | The tables on `plugins/protocol` against `server/run/wire_taxonomy.py` (generated by `sdk/tools/wiregen.py` from `Protocol.h`): categories and bytes, every subtype in id order with its direction and channel, the `(N)` counts, explicit `0xNN` ids and `type field` tokens quoted in the purpose column, and the size limits. |

A deliberate exception goes into `scripts/claims-allow.json` as
`{ "check", "claim", "reason", "page"? }` (`page` is the slug without `ru/`; without it the entry
covers every page). Unused entries are reported as warnings so the list does not rot.
`node scripts/check-claims.mjs --json` prints the findings as JSON; `--all` prints the
allowlisted ones too.

What it cannot catch: prose that paraphrases behaviour without a quotable fact (a wrong
sentence about *when* a kick happens), messages of the directory (Backend) and of BeamNG itself,
event names written in a form none of the recognisers know, and the completeness of
`players/troubleshooting` (only `reference/error-codes` is checked for missing rows).

## Doctests

Every ```` ```lua ```` block under `src/content/docs/plugins/` is executed, or says why it is not.
The line above the fence classifies it:

```md
<!-- doctest: server -->                         runs as server/main.lua of a throwaway resource
<!-- doctest: server+client {"emit": [["chat:send", {"text": "/online"}]]} -->
                                                 ... and a fake player joins; the JSON lists what it sends
<!-- doctest: db -->  /  <!-- doctest: db+client -->   the same, with the db module loaded and a
                                                 PostgreSQL connection configured for it
<!-- doctest: client -->                         a client script: syntax-checked with luac and packaged
                                                 by the server; the game is not here to run it
<!-- doctest: skip <reason> -->                  not run; still syntax-checked
```

The runner, `scripts/doctest/run.py`, writes each block into `resources/dt<N>/` of a scratch
server home together with a stand-in for the `chat` resource (the guides tell the reader to
install `chat` for `player:tell` and chat commands; the stand-in speaks the documented
`chat:send` / `chat:command` / `chat:say` / `chat:msg` protocol), starts one `Node-Server` per
page, lets the fake players
join and send their events, stops the server cleanly (so `serverShutdown` and `resourceUnload`
run) and judges the log. A block **fails** when its resource never prints its load line, logs
`error in …`, a `[deprecated]` event name or a manifest problem, or misses an expectation.
Expectations are comments inside the block, so the reader sees what the example prints:

```lua
-- expect: Player#\d+ Alice joined from \S+      a regex one of this resource's own log lines must match
-- expect-not: credit failed                      ... must not match
-- expect-log: Bob kicked — Spamming              a line anywhere in the server log (the server's own tags)
-- expect-client: Alice chat:msg .*2 online       an event a fake player received: `<player> <event> <payload>`
```

The `+client` options: `players` (`["Alice", "Bob"]`; Alice is account 42, Bob 108, Carol a
directory admin, Guest a Test Drive session without an account - the runner brings its own
stand-in directory), `emit` (`[event, payload]` or `[event, payload, "Bob"]`, a table payload is
sent as JSON), `spawn` (`"coupe"`: the first player spawns a vehicle before the events). For any
running block: `config` (the resource's `[config]` table), `files` (extra files inside the
resource, `{"server/util.lua": "return {}"}`), `with` (`[5]`: the code of earlier blocks of the
page runs in front of this one - for a definition and its use split across two blocks), `wait`
(seconds to wait for the expectations, default 15).

The Russian twin carries the same tag comment and the same code byte for byte; the runner
compares the blocks by position and only the English ones execute. `--list` prints the
classification without running anything, `--only <page>` runs one page, `--keep` keeps every
scratch home under `.doctest/` (a failing page's home, with its `server.log` and the players'
`received.log`, is kept anyway), `--strict` makes a missing database a failure (CI).

To run it locally you need the server binary (`--server <path>`, `DOCTEST_SERVER`, or
`../server/run/Node-Server[.exe]`, or `.server/Node-Server` as CI unpacks it), a checkout of the
`server` repository for the fake player's wire codec (`run/wire.py`, `run/wire_taxonomy.py`,
`run/testclient.py`, imported at run time from `NODEMP_SERVER_DIR`, else `./server`, else
`../server`), `luac` (Lua 5.4; `DOCTEST_LUAC` names another), the `zstandard` Python package (the
fake player's frames are compressed) and, for the `db` blocks, two things: `NODE_DB_URL` pointing
at a throwaway PostgreSQL database, and the built `db` module - `DOCTEST_DB_MODULE` and
`DOCTEST_DB_LUA` name it and its Lua library, else the build directories beside `plugins/db` are
searched. Without either, those blocks are skipped. The runner copies the module into the scratch
server's `modules/` with a `db.toml`, and `db.lua` into each db resource, so the examples say
`db:query(...)` with no setup of their own. CI downloads
`Node-Server-<version>-linux-x64.tar.gz` from `NodeMP-BeamNG/releases` (checked against its
`.sha256`; the version is `SERVER_VERSION` in the workflow), clones the server's `run/` with the
read-only `SERVER_DEPLOY_KEY` (as it clones the sdk) and runs against a `postgres:16-alpine`
service. `scripts/doctest/lib/` holds only this repository's own code - the stand-in directory
and the stand-in `chat` (`lib/README.md`); the server repository and the examples are private,
and a unit test fails when a file of theirs is copied there.

## Writing pages

Content lives in `src/content/docs/`: English directly under it, Russian under `ru/` at the same
relative path. Every English page has a Russian twin with the same heading structure; code blocks,
config keys, URLs and log lines are identical in both.

To add a page:

1. Create `src/content/docs/<section>/<slug>.md` with frontmatter `title` and `description`
   (150 characters or fewer).
2. Create `src/content/docs/ru/<section>/<slug>.md` with the same frontmatter keys and structure.
3. Add `{ slug: '<section>/<slug>' }` to the matching group in `astro.config.mjs`. Sidebar labels
   come from the page titles, so the Russian sidebar needs no extra label.
4. Link internally with absolute paths and a trailing slash (`/hosting/quick-start/`; Russian pages
   link `/ru/hosting/quick-start/`). Do not link into private repositories; quote paths in
   backticks instead.
5. Run `npm run check` and `npm run build`. A page under `plugins/` with a ```` ```lua ```` block
   also needs the block tagged ([Doctests](#doctests)) in both locales and
   `npm run doctest -- --only <slug>` green.

Slugs that are removed get an entry in `redirects` in `astro.config.mjs`.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it to
GitHub Pages on the `docs.nodemp.com` domain. Design and implementation notes are in `specs/` and
`plans/`.
