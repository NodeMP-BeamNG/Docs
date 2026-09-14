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
| `npm run check` | Runs `check:locales` and `check:stale`; exit code 1 on the first problem. |
| `npm run check:locales` | EN/RU parity: every page under `src/content/docs/` needs a twin at `ru/<same path>`, and every RU page needs an EN original. The generated `plugins/api/` is exempt. |
| `npm run check:stale` | Fails on old-stack wording (list below), case-insensitive, with file and line. The generated `plugins/api/` is exempt. |
| `npm run gen:api` | Runs the API import on its own (useful before `npm start`, which has no hook). |

## Gates

CI (`.github/workflows/ci.yml`, on pull requests and non-`main` pushes) and the Pages deploy
(`.github/workflows/deploy.yml`, on `main`) both check out the sdk with a read-only deploy key and
run `npm test`, `npm run check` and `npm run build` with `IMPORT_API_STRICT=1`. A change fails CI when:

- a page has no twin in the other locale (`check-locales`);
- a page contains one of the stale phrases (`check-stale`);
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
```

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
