---
title: "Logs and reports"
description: "Where the launcher, the helper and the game write their logs, and what to attach to a report."
---

## Logs

The launcher keeps two folders under `%LOCALAPPDATA%`: `NodeMP\` holds the program
(`nodemp-launcher.exe`, what the installer wrote), `com.nodemp.launcher\helper\` holds its data -
the helper's `Launcher.cfg`, the `cache\` of downloaded content and manifests, and `logs\`. When
you report a problem, the second folder is the one with the evidence; nothing in the first one is
worth attaching.

- **Helper log** — `launcher.log` records one session: game detection, the connection, content
  downloads and why the session ended. **Settings → Launcher → Logs → Open** opens its folder:

  ```
  %LOCALAPPDATA%\com.nodemp.launcher\helper\logs\launcher.log
  ```

  The file is rewritten at every join, so copy it before you try again. Its parent folder,
  `%LOCALAPPDATA%\com.nodemp.launcher\helper\`, holds the helper's `Launcher.cfg` and its
  `cache\` of downloaded content (the folder **Downloaded content → Open** shows), including
  `known_servers.json` with the TLS pins.
- **Launcher window** — the interface writes no log file. What it knows is in the toast, and the
  last helper log line in `The launcher stopped · …`.
- **BeamNG** — `beamng.log` in the game's user folder,
  `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\`, carries the client mod's lines (tag `node.`).
  The in-game **Diagnostics console** (Options → NodeMP → Tools) shows the session live.

When you report a problem, attach `launcher.log`, the exact toast text and the server's name.

## Advanced: another directory

This section is for developers and testers who run their own directory; players can skip it -
the launcher is pointed at `https://api.nodemp.com` and needs no setting. Testers running their
own directory can repoint the launcher. In order of precedence:

1. The environment variable `NODEMP_API_BASE`, for example `http://localhost:8080`.
2. A file `directory.url` beside `nodemp-launcher.exe` in `%LOCALAPPDATA%\NodeMP`: one line
   with the base URL; lines starting with `#` are comments. The launcher never writes this file;
   a leftover from a launcher before 1.0.0 is removed on start.
3. The built-in `https://api.nodemp.com`.

The address in use appears in the toast `Could not reach NodeMP at …` when the list cannot be
loaded. `NODEMP_LAUNCHER=C:\dev\launcher\bin\Release\Node-Launcher.exe` makes the launcher start a separate helper executable instead
of its built-in one; it is for people building the helper themselves.
