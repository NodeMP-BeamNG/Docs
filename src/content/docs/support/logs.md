---
title: "Logs and reports"
description: "Where the launcher, its helper and the game write their logs, and what to attach when you report a problem."
---

## What to attach to a report

When you report a problem on the [forum](https://forum.nodemp.com), attach:

1. **`launcher.log`** — copy it right away: it is rewritten at every join.
2. **The notification's text** — the title, the line under it and, under **Details**, the original
   text. The notification centre (the bell) keeps it.
3. **The server's name**, and what you were doing.

For a problem inside the game, add `beamng.log`.

## Where the logs are

| Log | Where | What is in it |
|---|---|---|
| `launcher.log` | `%LOCALAPPDATA%\com.nodemp.launcher\helper\logs\` — **Settings → Launcher → Logs → Open** | One session of the launcher's helper: finding the game, the connection, the server's mods downloading, why the session ended. |
| `beamng.log` | `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\` | The game's log, with the client mod's lines (tag `node.`). |

The launcher window itself writes no log: what it knows is in its notifications. The in-game
diagnostics console (**Options → NodeMP → Tools**) shows the session live.

## The launcher's folders

| Folder | What is in it |
|---|---|
| `%LOCALAPPDATA%\NodeMP\` | The program, as the installer wrote it. Nothing here is worth attaching. |
| `%LOCALAPPDATA%\com.nodemp.launcher\helper\` | The helper's data: `Launcher.cfg`, `logs\` and `cache\`. |
| `…\helper\cache\` | The servers' mods (**Settings → Launcher → Downloaded content → Open**), the strict servers' references in `integrity\`, and `known_servers.json` — the certificates of servers you joined by address. |

## Advanced: another directory

For developers and testers running their own directory; players do not need this. The launcher
talks to `https://api.nodemp.com`, unless, in order of precedence:

1. the environment variable `NODEMP_API_BASE` is set, for example `http://localhost:8080`;
2. a file `directory.url` lies beside the launcher's program in `%LOCALAPPDATA%\NodeMP`: one line
   with the base URL, lines starting with `#` are comments. The launcher never writes this file
   itself.

The address in use is shown in **Could not reach NodeMP** when the list cannot be loaded.
`NODEMP_LAUNCHER=<path to Node-Launcher.exe>` makes the launcher start a separately built helper
instead of its own — for people building the helper themselves.
