# NodeMP Documentation Site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a bilingual (EN/RU) static documentation site for NodeMP on Astro Starlight, covering players, server hosts and plugin developers.

**Architecture:** A single Astro Starlight project in `node/docs-site/` (its own git repo → `NodeMP-BeamNG/Docs`). Content is Markdown/MDX under `src/content/docs/{en,ru}`; navigation and i18n are config-driven in `astro.config.mjs`. Static output is built in CI and published to GitHub Pages on the `docs.nodemp.com` custom domain.

**Tech Stack:** Astro + @astrojs/starlight, TypeScript, npm, Pagefind (bundled search), GitHub Actions, GitHub Pages.

## Global Constraints

- Framework: **Astro Starlight**, fully static output (`astro build` → `dist/`).
- Locales: **`en` (default/root)** + **`ru`**; missing RU pages fall back to EN.
- Package manager: **npm**; commit `package-lock.json`.
- Repo: **`NodeMP-BeamNG/Docs`**, **public**; local dir `node/docs-site/`.
- Preserve the existing `specs/` and `plans/` folders and git history in `docs-site/`.
- Hosting: **GitHub Pages** via GitHub Actions; custom domain **`docs.nodemp.com`** (via `public/CNAME`); `site`/`base` set for the Pages URL.
- Search: **Pagefind** (Starlight default) — no Algolia.
- Out of scope: docs versioning, blog/news, auth/login, embedded server browser.
- Sidebar structure (verbatim from spec §7): Introduction; For players; Server hosting; Plugin development; Reference.
- Seed content is **copied** from the other repos into this repo (self-contained); do not symlink.

---

### Task 1: Scaffold Starlight project + build baseline

**Files:**
- Create: `docs-site/package.json`, `docs-site/astro.config.mjs`, `docs-site/tsconfig.json`, `docs-site/src/content/config.ts`, `docs-site/src/content/docs/index.mdx`, `docs-site/.gitignore`
- Preserve: `docs-site/specs/`, `docs-site/plans/`, `docs-site/.git`

**Interfaces:**
- Produces: a buildable Starlight site with default config; later tasks edit `astro.config.mjs` (Starlight integration options) and add files under `src/content/docs/`.

- [ ] **Step 1: Scaffold into the existing dir**

Run (from `node/docs-site`):

```bash
npm create astro@latest . -- --template starlight --typescript strict --install --no-git --skip-houston
```

If prompted that the directory is not empty, choose to continue (the only existing entries are `specs/`, `plans/`, `.git`, which the template leaves untouched).

- [ ] **Step 2: Add a docs `.gitignore`**

Create `docs-site/.gitignore`:

```gitignore
# build output & deps
node_modules/
dist/
.astro/

# pagefind cache
.pagefind/

# os / editor
.DS_Store
Thumbs.db
/.idea/
.vscode/
```

- [ ] **Step 3: Build to verify the baseline**

Run: `npm run build`
Expected: build succeeds, `dist/` produced, Pagefind index generated (log mentions "pagefind").

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro Starlight docs site"
```

---

### Task 2: Site config — branding, i18n (en/ru), sidebar skeleton

**Files:**
- Modify: `docs-site/astro.config.mjs`
- Create: `docs-site/src/assets/nmp-logo.png` (copied from the mod), `docs-site/src/styles/custom.css`
- Create placeholder index pages so the sidebar/build is valid:
  `docs-site/src/content/docs/index.mdx` (overwrite splash), and one `index.md` per section group created in their content tasks (here we only wire config + the home page).

**Interfaces:**
- Produces: `astro.config.mjs` exporting a Starlight integration with `title`, `logo`, `customCss`, `defaultLocale: 'en'`, `locales: { root: en, ru }`, `social` (GitHub org), and a `sidebar` matching spec §7. Content tasks add the referenced pages.

- [ ] **Step 1: Copy the logo asset**

```bash
mkdir -p src/assets
cp ../client-mod-lua/ui/nodemp/nmp-logo.png src/assets/nmp-logo.png
```

- [ ] **Step 2: Brand CSS**

Create `docs-site/src/styles/custom.css`:

```css
:root {
  --sl-color-accent-low: #0d1f2d;
  --sl-color-accent: #2f81f7;
  --sl-color-accent-high: #b6d6ff;
}
:root[data-theme='light'] {
  --sl-color-accent: #1666d0;
}
```

- [ ] **Step 3: Write `astro.config.mjs`**

Replace `docs-site/astro.config.mjs` with:

```js
// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  // Pages URL; replaced by the custom domain once DNS is set.
  site: 'https://docs.nodemp.com',
  integrations: [
    starlight({
      title: 'NodeMP',
      logo: { src: './src/assets/nmp-logo.png', alt: 'NodeMP' },
      customCss: ['./src/styles/custom.css'],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/NodeMP-BeamNG' },
      ],
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        ru: { label: 'Русский', lang: 'ru' },
      },
      sidebar: [
        {
          label: 'Introduction',
          translations: { ru: 'Введение' },
          items: [
            { label: 'What is NodeMP', slug: 'introduction/what-is-nodemp' },
            { label: 'BeamMP compatibility', slug: 'introduction/beammp-compatibility' },
          ],
        },
        {
          label: 'For players',
          translations: { ru: 'Игрокам' },
          items: [
            { label: 'Install the launcher', slug: 'players/install' },
            { label: 'Join a server', slug: 'players/join' },
            { label: 'Settings & UI', slug: 'players/settings' },
            { label: 'Troubleshooting', slug: 'players/troubleshooting' },
          ],
        },
        {
          label: 'Server hosting',
          translations: { ru: 'Хостинг серверов' },
          items: [
            { label: 'Quick start', slug: 'hosting/quick-start' },
            { label: 'Configuration', slug: 'hosting/configuration' },
            { label: 'Running the server', slug: 'hosting/running' },
            { label: 'Registering your host', slug: 'hosting/registering' },
            { label: 'Updating', slug: 'hosting/updating' },
            { label: 'Resources & mods', slug: 'hosting/resources' },
          ],
        },
        {
          label: 'Plugin development',
          translations: { ru: 'Разработка плагинов' },
          items: [
            { label: 'Overview', slug: 'plugins/overview' },
            { label: 'Server Lua API', slug: 'plugins/server-api' },
            { label: 'Wire protocol', slug: 'plugins/protocol' },
            { label: 'Client mod API', slug: 'plugins/client-api' },
            { label: 'Migrating BeamMP plugins', slug: 'plugins/migrating' },
          ],
        },
        {
          label: 'Reference',
          translations: { ru: 'Справочник' },
          items: [
            { label: 'Launcher error codes', slug: 'reference/error-codes' },
            { label: 'Glossary', slug: 'reference/glossary' },
          ],
        },
      ],
    }),
  ],
});
```

- [ ] **Step 4: Home page (splash)**

Overwrite `docs-site/src/content/docs/index.mdx`:

```mdx
---
title: NodeMP
description: BeamMP-compatible multiplayer for BeamNG.drive.
template: splash
hero:
  tagline: BeamMP-compatible multiplayer for BeamNG.drive.
  actions:
    - text: Get started
      link: /players/install/
      icon: right-arrow
    - text: Host a server
      link: /hosting/quick-start/
      variant: minimal
---
```

- [ ] **Step 5: Build (will fail until section pages exist) — verify only config errors are missing-page links**

Run: `npm run build`
Expected: build reports missing referenced slugs (e.g. `introduction/what-is-nodemp`). This confirms the sidebar/config is parsed. (Pages are added in Tasks 3-7; do not commit a broken build — proceed to Step 6 which adds stubs.)

- [ ] **Step 6: Add minimal stubs so the build passes**

For each `slug` referenced in the sidebar, create a stub `docs-site/src/content/docs/<slug>.md` with only front-matter, e.g. `src/content/docs/introduction/what-is-nodemp.md`:

```md
---
title: What is NodeMP
---

Coming soon.
```

Create the same minimal stub (matching `title`) for all 19 referenced slugs across the five groups.

- [ ] **Step 7: Build to verify it passes**

Run: `npm run build`
Expected: PASS, no missing-link errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: site config — branding, en/ru i18n, sidebar + page stubs"
```

---

### Task 3: Introduction content (EN)

**Files:**
- Modify: `docs-site/src/content/docs/introduction/what-is-nodemp.md`, `docs-site/src/content/docs/introduction/beammp-compatibility.md`

**Interfaces:**
- Consumes: stubs from Task 2.
- Produces: real Introduction pages; later RU task (Task 8) mirrors these under `ru/`.

- [ ] **Step 1: What is NodeMP**

Replace the file with front-matter + prose seeded from the repo READMEs (`NodeMP-Server/README.md`, `NodeMP-Launcher/README.md`, mod readme). Structure:

```md
---
title: What is NodeMP
description: Overview of the NodeMP multiplayer system for BeamNG.drive.
---

## Overview
<!-- 2-3 paragraphs: what NodeMP is, the four parts (launcher, mod, server, backend), BeamMP-compatibility goal. Seed from README files. -->

## The parts
<!-- bullet list: Launcher, Client mod, Game server, Backend — one line each. -->
```

Fill the comment regions with prose adapted from the READMEs (no placeholders left in the committed file).

- [ ] **Step 2: BeamMP compatibility**

Copy `NodeMP-Server/docs/beammp-compat.md` body into `introduction/beammp-compatibility.md` and add front-matter:

```md
---
title: BeamMP compatibility
description: How NodeMP maps to BeamMP's server API, client mod and protocol.
---
```

Adjust any relative links to site routes.

- [ ] **Step 3: Build + link check**

Run: `npm run build`
Expected: PASS, no broken-link warnings for these pages.

- [ ] **Step 4: Commit**

```bash
git add src/content/docs/introduction
git commit -m "docs: introduction (what is NodeMP, BeamMP compatibility)"
```

---

### Task 4: For players content (EN)

**Files:**
- Modify: `players/install.md`, `players/join.md`, `players/settings.md`, `players/troubleshooting.md` (under `src/content/docs/`)

**Interfaces:**
- Produces: player-facing guide pages.

- [ ] **Step 1: Install the launcher**

`players/install.md` — front-matter + steps: download from the site/release endpoint (`/v1/releases/launcher`), Windows install, first run, login/guest. Seed from launcher README + `run-launcher-local.bat` header comments.

```md
---
title: Install the launcher
description: Download and install the NodeMP launcher for BeamNG.drive.
---
```

- [ ] **Step 2: Join a server**

`players/join.md` — open Multiplayer, browse the server list, connect, mod download/sync flow, authorization (login/register/guest). Seed from the mod's UI behavior.

- [ ] **Step 3: Settings & UI**

`players/settings.md` — NodeMP options tab, chat, player list (spectate/apply-config), nametags. Seed from mod `MODDING.md` / UI.

- [ ] **Step 4: Troubleshooting**

`players/troubleshooting.md` — common issues: can't connect, mod download stuck, connection lost; link to Reference → error codes.

- [ ] **Step 5: Build + commit**

Run: `npm run build` (Expected: PASS)

```bash
git add src/content/docs/players
git commit -m "docs: player guide (install, join, settings, troubleshooting)"
```

---

### Task 5: Server hosting content (EN)

**Files:**
- Modify: `hosting/quick-start.md`, `hosting/configuration.md`, `hosting/running.md`, `hosting/registering.md`, `hosting/updating.md`, `hosting/resources.md`

**Interfaces:**
- Produces: host-facing guide. Seed from `NodeMP-Server/DEPLOY.md`, `NodeMP-Server/deploy/README.md`, `NodeMP-Server/PROTOCOL.md` (intro only), Dockerfiles, `run-server-local.bat`.

- [ ] **Step 1: Quick start** — `hosting/quick-start.md`: get the server binary, minimal `ServerConfig.toml`, first launch, connect locally. Seed from `run-server-local.bat` + server README.

- [ ] **Step 2: Configuration** — `hosting/configuration.md`: document `ServerConfig.toml` keys (General, Logging, etc.). Seed from server config example/defaults.

- [ ] **Step 3: Running the server** — `hosting/running.md`: Linux (systemd via `deploy/nodemp-server.service`), Windows (native), Docker (`Dockerfile`, `docker-compose`). Seed from `DEPLOY.md` + `deploy/`.

- [ ] **Step 4: Registering your host** — `hosting/registering.md`: how the host registers with the backend (`/v1/hosts`, host session/beacon), `register-host.sh`, TrustLoopback for local/LAN. Seed from `deploy/register-host.sh` + backend behavior.

- [ ] **Step 5: Updating** — `hosting/updating.md`: replacing the binary, config migration notes.

- [ ] **Step 6: Resources & mods** — `hosting/resources.md`: `Resources/Server` plugins, `Resources/Client` mods, `mods.json`, serving client mods to players.

- [ ] **Step 7: Build + commit**

Run: `npm run build` (Expected: PASS)

```bash
git add src/content/docs/hosting
git commit -m "docs: server hosting guide (setup, config, running, registering, updating, resources)"
```

---

### Task 6: Plugin development content (EN)

**Files:**
- Modify: `plugins/overview.md`, `plugins/server-api.md`, `plugins/protocol.md`, `plugins/client-api.md`, `plugins/migrating.md`

**Interfaces:**
- Produces: developer reference. Seed: `NodeMP-Server/PROTOCOL.md` → protocol; mod `MODDING.md` → client API; `beammp-compat.md` + server Lua prelude → server API.

- [ ] **Step 1: Overview** — `plugins/overview.md`: plugin model, where plugins live, lifecycle, threading model (one Lua state/thread per plugin).

- [ ] **Step 2: Server Lua API** — `plugins/server-api.md`: the BeamMP-compatible `MP.*`/event API and the namespaced `NodeMP.*` server prelude (events, players, vehicles, chat, ui, timers, util, http, fs, bans). Seed from `beammp-compat.md` and the server's injected API prelude.

- [ ] **Step 3: Wire protocol** — copy `NodeMP-Server/PROTOCOL.md` body into `plugins/protocol.md`; add front-matter:

```md
---
title: Wire protocol
description: NodeMP packet protocol (BeamMP-derived) and sync-owner model.
---
```

- [ ] **Step 4: Client mod API** — copy mod `MODDING.md` body into `plugins/client-api.md` (the `NodeMP.*` client API); add front-matter; fix links.

- [ ] **Step 5: Migrating BeamMP plugins** — `plugins/migrating.md`: differences from BeamMP (global vehicle ids, sync-owner, signature changes), how to port a plugin. Seed from server breaking-change notes.

- [ ] **Step 6: Build + commit**

Run: `npm run build` (Expected: PASS)

```bash
git add src/content/docs/plugins
git commit -m "docs: plugin development (overview, server API, protocol, client API, migrating)"
```

---

### Task 7: Reference content (EN)

**Files:**
- Modify: `reference/error-codes.md`, `reference/glossary.md`

**Interfaces:**
- Produces: reference pages. Seed: launcher `client/include/Common/ErrorCodes.h` → error-codes table.

- [ ] **Step 1: Error codes** — `reference/error-codes.md`: a table of `[NMP-Exxxx]` codes (10xx backend, 11xx connect, 12xx resources, 13xx session) with meaning + user action. Build the table from `ErrorCodes.h`.

- [ ] **Step 2: Glossary** — `reference/glossary.md`: launcher, mod, host, backend, sync-owner, ticket, host secret, dimension, etc.

- [ ] **Step 3: Build + commit**

Run: `npm run build` (Expected: PASS)

```bash
git add src/content/docs/reference
git commit -m "docs: reference (launcher error codes, glossary)"
```

---

### Task 8: Russian translations (Introduction + For players)

**Files:**
- Create: `src/content/docs/ru/introduction/what-is-nodemp.md`, `ru/introduction/beammp-compatibility.md`, `ru/players/install.md`, `ru/players/join.md`, `ru/players/settings.md`, `ru/players/troubleshooting.md`

**Interfaces:**
- Consumes: the EN pages from Tasks 3-4 (same slugs under `ru/`).
- Produces: RU locale pages; other sections fall back to EN automatically.

- [ ] **Step 1: Translate Introduction** — create the two `ru/introduction/*.md` files: same front-matter `title`/`description` translated to Russian, body translated from the EN versions.

- [ ] **Step 2: Translate For players** — create the four `ru/players/*.md` files, translated from EN.

- [ ] **Step 3: Build + verify locale routing**

Run: `npm run build`
Expected: PASS; `/ru/` routes exist for the translated pages; untranslated pages fall back to EN.

- [ ] **Step 4: Commit**

```bash
git add src/content/docs/ru
git commit -m "docs(i18n): Russian translations for Introduction and For players"
```

---

### Task 9: CI deploy to GitHub Pages + create and push the public repo

**Files:**
- Create: `docs-site/.github/workflows/deploy.yml`, `docs-site/public/CNAME`, `docs-site/README.md`

**Interfaces:**
- Consumes: the buildable site from Tasks 1-8.
- Produces: a GitHub Pages deployment of `dist/` on push to `main`.

- [ ] **Step 1: CNAME**

Create `docs-site/public/CNAME`:

```
docs.nodemp.com
```

- [ ] **Step 2: Deploy workflow**

Create `docs-site/.github/workflows/deploy.yml`:

```yaml
name: Deploy docs to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: README**

Create `docs-site/README.md`:

```md
# NodeMP Documentation

Source for the NodeMP documentation site (Astro Starlight), published to
https://docs.nodemp.com.

## Develop

```bash
npm install
npm run dev      # local preview at http://localhost:4321
npm run build    # static output in dist/
```

Content lives in `src/content/docs/{en,ru}`; navigation and i18n are in
`astro.config.mjs`. See `specs/` and `plans/` for design and implementation notes.
```

- [ ] **Step 4: Final local build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Create the public repo and push**

```bash
gh repo create NodeMP-BeamNG/Docs --public --description "NodeMP documentation (docs.nodemp.com)" --source . --remote origin --push
```

Expected: repo created, `main` pushed.

- [ ] **Step 6: Enable Pages (build type = GitHub Actions)**

```bash
gh api -X POST repos/NodeMP-BeamNG/Docs/pages -f build_type=workflow
```

(If Pages is already enabled, set the source instead; the deploy workflow will run on the push.)

- [ ] **Step 7: Verify the deployment**

Check the Actions run succeeds and the Pages URL serves the site:

```bash
gh run list --repo NodeMP-BeamNG/Docs --limit 1
```

Expected: latest "Deploy docs to GitHub Pages" run is green. Site reachable at the Pages URL (and `docs.nodemp.com` once DNS CNAME is added — see spec §13).

---

## Self-Review

**1. Spec coverage:**
- Stack (Starlight) → Task 1-2. i18n en/ru → Task 2, 8. Repo/public/local layout → Task 1, 9. Hosting (Pages + CNAME) → Task 9. Sidebar structure §7 → Task 2 (config) + Tasks 3-7 (pages). Seed content mapping §8 → Tasks 3,5,6,7. Branding §9 → Task 2. Testing §11 (build + link check) → every task's build step + CI. Out-of-scope §12 honored (no versioning/blog/auth). Open item DNS §13 → noted in Task 9 Step 7. Success criteria §14 → covered by Tasks 2 (search/theme/logo), 3-7 (sections), 8 (RU for intro+players), 9 (CI publish). No gaps found.

**2. Placeholder scan:** Content tasks intentionally instruct "seed from <file>" and include the exact source→target mapping and front-matter; the committed files must contain real prose (each task says "no placeholders left in the committed file"). Config/CI steps contain complete code. No "TBD/TODO" remain in the plan.

**3. Type/identifier consistency:** Sidebar `slug` values in Task 2 exactly match the file paths created in Tasks 3-8 (e.g. `introduction/what-is-nodemp`, `players/install`, `hosting/quick-start`, `plugins/protocol`, `reference/error-codes`). RU files (Task 8) reuse the same slugs under `ru/`. The build steps would fail on any mismatch, which is the gate.
