---
title: "Strict servers"
description: "What strict verification is, why a server rejects extra files, how to inspect the full list of differences, and how to get in."
---

A **strict** server ensures fair play by requiring every participant to run a clean, unmodified copy of BeamNG.drive. This guarantees equal conditions for tournaments and competitions, preventing unauthorized modifications to vehicle configurations.

When you join, the launcher compares your game files, zip archives, and BeamNG user directory against a reference manifest of a clean game installation. The entire scan takes place locally on your PC, and only the final pass/fail verdict is sent to the server — your personal files never leave your computer. To learn how hosts configure this mode, see [Strict verification](/hosting/strict-verification/).

## What it looks like

Joining a strict server includes two quick extra steps: downloading the server's manifest (`Fetching the server's reference manifest`, only once — it is cached for future joins) and checking local files against it (`Checking your game files against the server's reference`).

If any difference is found, the join stops:

> **The server refused the join**\
> `Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam`

The launcher displays a plain-language summary of the first issue, advice on resolving it, and a diagnostic command with a **Copy** button. The server notification lists at most three sample files, but you can inspect the complete list using the built-in diagnostic tool.

## The usual causes

Even if you never deliberately changed game files, the check may flag seemingly harmless leftovers:

- **Unpacked mod leftovers in your user folder** — files like `info_*.json`, `*.materials.json`, or `*.jbeam` inside `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\vehicles\` left behind after deleting or disabling older mods. Only your custom saved vehicle configurations (`<name>.pc` with thumbnail previews) and default `main.materials.json` files are permitted there.
- **Custom tracks or personal scripts** — local maps in `current\levels\`, an edited `current\lua\common\particles.json`, or any custom files under `current\lua\`, `ui\`, `art\`, or `scripts\`. Move them out to another folder while driving on strict servers.
- **Extra files in the game directory** — third-party utilities, reshade injectors, or mods accidentally unpacked into the game directory rather than the user directory. Windows system files (`desktop.ini`), shader cache files, and game logs are ignored.
- **Mismatched BeamNG.drive version** — if the game recently updated but the host hasn't regenerated the server manifest yet (or you haven't downloaded the game update yet). In that case, the differences will list core game files like `/Bin64/BeamNG.drive.x64.exe (hash)`.
- **Modified default archives** — altered or repacked `.zip` files in the `content\` directory. Easily fixed by running a file verification in Steam.

Standard zipped mods in your `mods\` folder **do not** block your join: the strict check skips them, and the launcher disables them during the multiplayer session anyway.

## See every problem

The launcher has a built-in diagnostic tool that outputs every single discrepancy. The quickest way is the **Copy** button directly under the refusal notification: it puts the complete command with all proper paths into your clipboard. Close BeamNG.drive and paste the command into Command Prompt or PowerShell.

You can also run the command manually. It needs the cached server manifest from `%LOCALAPPDATA%\com.nodemp.launcher\helper\cache\integrity\<id>.manifest` (the newest manifest file usually corresponds to the server you just attempted to join). The launcher helper executable is located in `%LOCALAPPDATA%\NodeMP`:

```
cd /d %LOCALAPPDATA%\com.nodemp.launcher\helper
"%LOCALAPPDATA%\NodeMP\<program>.exe" --helper --data-dir %LOCALAPPDATA%\com.nodemp.launcher\helper --integrity-check cache\integrity\<id>.manifest
```

If you configured custom directories in settings, add `--game-dir <folder>` for the game installation or `--user-path <folder>` for the user folder. The diagnostic writes to the console and to `launcher.log`:

```
integrity check (strict) against C:\Users\you\AppData\Local\com.nodemp.launcher\helper\cache\integrity\e326499d….manifest
  game folder  C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive
  user folder  C:\Users\you\AppData\Local\BeamNG\BeamNG.drive\current
  launcher     exe C:\Users\you\AppData\Local\NodeMP\nodemp-launcher.exe, data C:\Users\you\AppData\Local\com.nodemp.launcher\helper\, cache C:\Users\you\AppData\Local\com.nodemp.launcher\helper\cache
  manifest     id e326499d…, format 2, game 0.39.4.0 build 20972, 14193 root files, 173 archives, generated 2026-…
  overlay   userfolder:vehicles/bell407/info_bell407.json
  overlay   userfolder:levels/mytrack/info.json
  unlisted  /Node-Launcher.exe
game files DIFFER: 14193 files checked in 1.0s (strict), 7203 hashed, 1 not part of the game, 2 user-folder overrides -- e.g. userfolder:vehicles/bell407/info_bell407.json (overlay) userfolder:levels/mytrack/info.json (overlay) /Node-Launcher.exe (unlisted)
counts: missing 0, size 0, hash 0, unlisted 1, archive 0, userfolder 2, folders skipped 0
```

## Reading the result

Each problem is displayed on its own line: first the reason category, followed by the affected file path.

| Reason | Path | Meaning | What to do |
|---|---|---|---|
| `overlay` | `userfolder:<path>` | A file in your user folder overrides or injects game content. | Move or remove the file from `current\`. Packed mods belong in `mods\`. |
| `unreadable` | `userfolder:<folder>` | The launcher could not access the folder (typically due to Windows path length limits). | Shorten or delete the nested folder. |
| `unlisted` | `/<path>` | An unexpected file was found in the game folder. | Delete it manually: Steam integrity verification does not delete foreign files. |
| `hash`, `size`, `missing` | `/<path>` | A game file is modified, has an unexpected size, or is missing. If many core files differ (including `/Bin64/…`), game versions differ. | Run Steam file integrity check; update BeamNG or wait for the host to update their manifest. |
| `crc`, `size`, `extra`, `missing`, `duplicate` | `/<zip>!<entry>` | A file inside a default game archive differs from the official release. | Verify game files in Steam. |
| `unreadable` | `/<zip>` | The game archive is corrupted and cannot be read as a valid zip file. | Verify game files in Steam. |
| `not judged` | `<path> (the launcher's own)` | Launcher helper files inside the game folder. Not counted as a problem. | Nothing needed. |

Command exit codes: `0` means the installation is clean, `1` indicates discrepancies, and `2` means the scan could not run (e.g. outdated manifest format `manifest format outdated (format 1)` — ask the host to regenerate it, or user folder missing — launch BeamNG.drive once).

## While you play

A strict server continues to verify file integrity throughout the session: every 10 minutes and whenever files change in the game or user directory (at most once per minute). If changes are detected while playing, your session ends immediately:

> **Session ended**\
> `Your game files changed while you were playing and no longer match this server's reference (1 problem)`

Restore the modified files to their original state and rejoin the server. The check interval is configured via `StrictRecheckMin` in [Launcher.cfg](/players/settings/#advanced-launchercfg).
