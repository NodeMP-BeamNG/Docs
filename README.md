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
| `npm test` | Runs the unit tests of the scripts (`node --test "scripts/*.test.mjs"`). |
| `npm run check` | Runs `check:locales`, `check:stale` and `check:claims`; exit code 1 on the first problem. |
| `npm run check:locales` | EN/RU parity: every page under `src/content/docs/` needs a twin at `ru/<same path>`, and every RU page needs an EN original. The generated `plugins/api/` is exempt. |
| `npm run check:stale` | Fails on old-stack wording (list below), case-insensitive, with file and line. The generated `plugins/api/` is exempt. |
| `npm run check:claims` | Compares what the pages state with the code that defines it (section below). Needs the `server`, `sdk`, `launcher`, `NodeMP` and `UI-launcher` checkouts beside this repository; without one of them the checks that need it are skipped with a warning (CI fails instead). |
| `npm run gen:api` | Runs the API import on its own (useful before `npm start`, which has no hook). |

## Gates

CI (`.github/workflows/ci.yml`, on pull requests and non-`main` pushes) and the Pages deploy
(`.github/workflows/deploy.yml`, on `main`) both check out the sdk, the server, the launcher, the
client mod (`NodeMP`) and the launcher interface (`UI-launcher`) with read-only deploy keys and
run `npm test`, `npm run check` and `npm run build` with `IMPORT_API_STRICT=1`. A change fails CI when:

- a page has no twin in the other locale (`check-locales`);
- a page contains one of the stale phrases (`check-stale`);
- a page states something the code does not (`check-claims`, below);
- an internal link or `#anchor` does not resolve (the build);
- a guide page the API reference links to does not exist (`IMPORT_API_STRICT=1`; without the
  flag the import links such guides to `/plugins/overview/` and prints one summary line).

Stale phrases (`scripts/check-stale.mjs`, `DEFAULT_PHRASES`): `BeamMP-compatible`,
`BeamMP compatible`, `ServerConfig.toml`, `[Backend]`, `NODEMP_BACKEND_URL`, `backend-less`,
`Resources/Server`, `NodeMP mesh`, `on the mesh`, `v12`, `v13`. Two pages are allow-listed by path
because they discuss the old stack on purpose: `introduction/differences-from-beammp.md` and
`plugins/migrating.md` (both locales). Add a phrase to `DEFAULT_PHRASES` rather than weakening a
page; add a page to `DEFAULT_ALLOW` only when it has to name the old stack.

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
5. Run `npm run check` and `npm run build`.

Slugs that are removed get an entry in `redirects` in `astro.config.mjs`.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it to
GitHub Pages on the `docs.nodemp.com` domain. Design and implementation notes are in `specs/` and
`plans/`.
