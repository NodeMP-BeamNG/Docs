---
title: Install the launcher
description: Download and install the NodeMP launcher on Windows, run it for the first time, and sign in (or play as a guest).
---

The **launcher** is the desktop app you run alongside BeamNG.drive. It signs you in, keeps the
in-game mod up to date, and proxies your connection to game servers. You only need to install
it once — after that it keeps itself and the mod updated automatically.

## 1. Download the launcher

Download the launcher from the **official NodeMP site**. The site serves the current build
straight from the backend's release endpoint (`GET /v1/releases/launcher`), so you always get
the latest version. Avoid copies from anywhere else.

By default the launcher talks to the production backend at `https://api.nodemp.com`; you don't
need to configure anything to play on public servers.

## 2. Install on Windows

NodeMP currently targets **Windows**. After downloading:

1. Extract the launcher (the executable is `NodeMP-Launcher.exe`) to a folder you can find
   again, for example `C:\NodeMP`.
2. Make sure BeamNG.drive is installed and has been run at least once, so its user folder
   exists.
3. If Windows SmartScreen or your antivirus prompts you, allow the launcher to run and to
   access the network — it needs to reach the backend and bind a couple of local ports.

:::note
The launcher uses local ports **4444** (meta) and **4445** (game) to talk to the mod. If a
previous launcher is still running it can hold these ports and stop a new one from starting,
so close any stale instance first.
:::

## 3. First run

Start `NodeMP-Launcher.exe`. On first launch it will:

- connect to the backend and check for updates, then
- download and install the current in-game mod into your BeamNG user folder.

Leave the launcher running, then start BeamNG.drive. Multiplayer lives on the main menu under
**NodeMP Multiplayer**.

A detailed log is written to `Launcher.log` next to the executable — keep it handy if you ever
need to [troubleshoot](/players/troubleshooting/).

## 4. Log in or play as a guest

NodeMP uses a BeamMP-style account gate. When you open the **Multiplayer** screen in BeamNG
you can:

- **Log in** with your NodeMP username (or email) and password,
- **Create account** to register a new one, or
- **Play as guest** to jump straight in without an account.

The launcher remembers your session, so next time it signs you in automatically. Some servers
restrict or disable guest access — if so, you'll need a registered account to join.

## Advanced: pointing at a local backend

If you're testing against your own backend, the launcher reads a few environment variables
(otherwise it defaults to production):

| Variable | Purpose |
|---|---|
| `NODEMP_API_BASE` | Backend API base URL (e.g. `http://localhost:8080`) |
| `NODEMP_CDN_BASE` | Where mod/launcher releases are fetched from |
| `NODEMP_DEV=1` | Dev mode: allows `http://` and `localhost` hosts |

Useful command-line flags:

- `--no-download` — keep the already-installed mod (skip fetching a release).
- `--verbose` — detailed debug logging to the console and `Launcher.log`.

## Next step

Once the launcher is installed and you're signed in, head to [Join a server](/players/join/).
