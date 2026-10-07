---
title: "Logs and reports"
description: "Where the launcher, background helper, and BeamNG.drive write their logs, and what files to attach when asking for support."
---

## What to attach to a report

If you run into an issue and need help on the [forum](https://forum.nodemp.com) or in the Discord community, gather the following details:

1. **The `launcher.log` file** — copy it immediately after encountering the problem, as it is overwritten with each new join attempt.
2. **The exact notification message** — the title, the line underneath, and the raw text from **Details**. Past notifications can always be found in the notification centre (the bell icon on the left).
3. **The server name** and a brief description of what you were doing when the issue occurred.

If the bug happens while driving inside BeamNG.drive (such as a missing vehicle or an in-game UI glitch), also include the game log `beamng.log`.

## Where the logs are

| Log | Location | What it records |
|---|---|---|
| `launcher.log` | `%LOCALAPPDATA%\com.nodemp.launcher\helper\logs\` (quick access: **Settings → Launcher → Logs → Open**) | The full log of a single helper session: game path resolution, connection negotiation, server mod downloads, and the reason the session ended. |
| `beamng.log` | `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\` | BeamNG.drive's main log, including NodeMP client mod output (marked with the `node.` prefix). |

The launcher window itself does not write a separate log file: all essential troubleshooting info is provided directly in notifications. While driving, you can also view real-time diagnostics in the game under **Options → NodeMP → Tools**.

## The launcher's folders

The launcher stores its files across a few standard Windows directories:

| Directory | What it contains |
|---|---|
| `%LOCALAPPDATA%\NodeMP\` | Installed application binaries created by the installer. You do not need to attach or modify files from here. |
| `%LOCALAPPDATA%\com.nodemp.launcher\helper\` | Runtime data for the background helper: `Launcher.cfg`, `logs\`, and `cache\`. |
| `…\helper\cache\` | Downloaded server mods (quick access: **Settings → Launcher → Downloaded content → Open**), strict verification manifests in `integrity\`, and `known_servers.json` storing fingerprints for direct-connect servers. |

## Advanced: another directory

This section is for developers and testers running custom directories or private backends; regular players do not need this.

By default, the launcher communicates with `https://api.nodemp.com`. You can override this URL (in order of priority):

1. By setting the `NODEMP_API_BASE` environment variable (for example, `http://localhost:8080`).
2. By placing a `directory.url` file next to the launcher binary in `%LOCALAPPDATA%\NodeMP`. The file should contain a single line with the base URL (lines starting with `#` are treated as comments). The launcher never creates this file automatically.

The URL currently in use is displayed in the **Could not reach NodeMP** notification if the server list cannot be fetched.

For developers compiling components from source: the `NODEMP_LAUNCHER=<path to Node-Launcher.exe>` environment variable instructs the launcher to run a custom-built helper executable instead of the packaged one.
