# NodeMP Documentation Site — Design

- Date: 2026-07-01
- Status: Approved (brainstorm), pending implementation plan
- Repo (target): `NodeMP-BeamNG/Docs` (public)
- Local path: `node/docs-site/`

## 1. Overview & goals

A standalone documentation website for NodeMP — a BeamMP-compatible multiplayer
system for BeamNG.drive. The site is static, fast, searchable, and bilingual
(EN/RU). It is the first sub-project of the larger NodeMP web presence; the main
site (landing, server browser, accounts), the forum (Discourse), the host
dashboard and the admin panel are separate sub-projects built later.

Goals:

- One place that documents how to **play**, how to **host a server**, and how to
  **develop plugins** (BeamMP-compatible Lua API).
- Built on an existing foundation (no hand-rolled docs engine).
- Easy to extend: new pages are Markdown/MDX files; sidebar is config-driven.
- Cheap and simple to deploy and keep updated via CI.

Non-goals (handled by other sub-projects): authentication, server browser,
news/blog, versioned docs, account integration.

## 2. Audience & scope

Three audiences (confirmed):

1. **Players** — install the launcher, join a server, settings, troubleshooting.
2. **Server hosts** — run/configure a server, deploy (Linux/Windows/Docker),
   register a host with the backend, update, manage resources/mods.
3. **Plugin developers** — BeamMP-compatible server Lua API + events, the wire
   protocol, the client mod API (`NodeMP.*`), migrating BeamMP plugins.

Contributors (building from source) are intentionally out of scope for v1.

## 3. Tech stack

- **Astro Starlight** (TypeScript, MDX). Rationale: built-in i18n, built-in local
  search (Pagefind), light/dark themes, fast static output, config-driven sidebar,
  good defaults, same JS toolchain as the future main site.
- Node.js LTS toolchain; package manager: npm (lockfile committed).
- Output: fully static (`astro build` → `dist/`).

Alternatives considered: Docusaurus (heavier React runtime; versioning + blog not
needed yet), VitePress (lighter but fewer batteries — no built-in i18n+search
combo as turnkey). Starlight chosen for the i18n+search balance.

## 4. Repository & local layout

- New repository `NodeMP-BeamNG/Docs`, **public** (required for free GitHub Pages,
  and docs are public content anyway).
- Local working dir `node/docs-site/` (its own git repo, like the other parts).
- Reserved: `NodeMP-BeamNG/Website` stays for the main site (not used here).

Planned project structure:

```
docs-site/
  astro.config.mjs        # Starlight config: site, i18n (en/ru), sidebar, theme
  package.json
  tsconfig.json
  src/
    content/
      docs/
        en/               # English pages (default locale)
        ru/               # Russian pages
      config.ts           # content collections schema (Starlight)
    assets/               # logo, images
    styles/               # brand color overrides
  public/                 # static files, CNAME, favicon
  specs/                  # design docs (this file)
  .github/workflows/      # deploy.yml (build + publish to Pages)
```

## 5. Hosting & deployment

- **GitHub Pages** via GitHub Actions: on push to `main`, CI runs `astro build`
  and publishes `dist/` to Pages.
- Custom domain **docs.nodemp.com** via `public/CNAME` + a DNS CNAME record
  pointing to the org Pages host. (Open item: add the DNS record — see §13.)
- Free-plan constraint: GitHub Pages serves only **public** repos on the free org
  plan, hence the public `Docs` repo. If the repo must stay private later, switch
  the deploy target to Cloudflare Pages or Netlify (free, private-repo capable,
  same custom domain) — the build command is identical, only the CI/host changes.

## 6. Internationalization

- Starlight i18n with `en` as the default (root) locale and `ru` as secondary.
- Content mirrored under `src/content/docs/en` and `.../ru`. Pages may be added in
  EN first; missing RU pages fall back to EN (Starlight default behavior).
- UI strings (sidebar group labels, etc.) localized via Starlight config.

## 7. Information architecture (sidebar)

- **Introduction**
  - What is NodeMP
  - BeamMP compatibility
- **For players**
  - Install the launcher
  - Join a server
  - In-game settings & UI
  - Troubleshooting / FAQ
- **Server hosting**
  - Quick start
  - Configuration (`ServerConfig.toml`)
  - Running: Linux / Windows / Docker
  - Registering your host (backend)
  - Updating the server
  - Resources & client mods
- **Plugin development**
  - Overview
  - Server Lua API (BeamMP-compatible) & events
  - Wire protocol
  - Client mod API (`NodeMP.*`)
  - Migrating BeamMP plugins
- **Reference**
  - Launcher error codes (`[NMP-Exxxx]`)
  - Glossary

## 8. Seed content mapping

Existing repo docs are imported as first drafts (then refined):

| Source (in other repos) | Target page |
| --- | --- |
| `NodeMP-Server/PROTOCOL.md` | Plugin development → Wire protocol |
| `NodeMP-Server/docs/beammp-compat.md` | Introduction → BeamMP compatibility |
| `NodeMP (mod)/MODDING.md` | Plugin development → Client mod API |
| `NodeMP-Server/DEPLOY.md`, `deploy/README.md` | Server hosting → Running / Registering |
| Repo READMEs | Introduction → What is NodeMP |
| Launcher `ErrorCodes.h` | Reference → Launcher error codes |

Seed content is copied into the docs repo (not linked), so the site is
self-contained; originals stay in their repos.

## 9. Branding & theme

- Logo: NodeMP mark (`nmp-logo.png` from the mod UI assets) in `src/assets/`.
- Dark theme default; one accent color via a small CSS override.
- Header links: GitHub org, (later) main site and forum.

## 10. Components / units

- `astro.config.mjs` — single source of truth for site URL, i18n, sidebar, theme,
  social links. One clear responsibility: site configuration.
- Content collections (`src/content/docs/**`) — pure Markdown/MDX; no logic.
- Optional small MDX components (e.g., a "download latest launcher" button that
  links to `/v1/releases/launcher`) kept in `src/components/`, each
  single-purpose. Kept minimal for v1.

Each unit is independently understandable: config vs content vs the rare
component. Adding a page never requires touching code, only content + sidebar.

## 11. Testing & quality

- CI builds the site (`astro build`) — a failing build blocks deploy.
- Broken-link check on internal links during/after build (Starlight surfaces
  bad links; add a link-check step in CI).
- Pagefind search index generated at build (Starlight default).
- Manual check: site renders EN+RU, search works, nav matches §7.

## 12. Out of scope (future sub-projects / iterations)

- Versioned docs (single "latest" for now — YAGNI).
- Blog / news (belongs to the main site).
- Account/login integration; embedded server browser.
- Auto-generating the Lua API reference from source (manual first; consider later).

## 13. Open items

- **DNS**: add a CNAME `docs.nodemp.com` → org GitHub Pages target (needs access
  to the nodemp.com DNS zone). Until then the site is reachable on the default
  `*.github.io` URL.

## 14. Success criteria

- `astro build` succeeds in CI and publishes to Pages.
- Site is reachable (github.io and, once DNS is set, docs.nodemp.com).
- All §7 sections exist with at least seeded content; EN complete, RU at least for
  Introduction + For players.
- Local search returns results; dark theme + logo applied.
- A new page can be added by creating one Markdown file + one sidebar line.
