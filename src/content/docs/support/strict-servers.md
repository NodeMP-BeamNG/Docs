---
title: "Strict servers"
description: "What a strict server checks on your PC, why it refuses a modified install, how to see every problem and how to get in."
---

A **strict** server compares your whole BeamNG install — the game folder, the contents of the
game's archives and your BeamNG user folder — with a reference of a clean install of the game
version it runs. Anything a clean install does not have refuses the join. The check runs in the
launcher on your PC; the server receives the verdict. What the host set up is on
[Strict verification](/hosting/strict-verification/).

## What it looks like

A strict join has two extra steps: `Fetching the server's reference manifest` (only the first time
— the reference is kept for later) and `Checking your game files against the server's reference`.
If something differs, the join stops with:

> **The server refused the join**\
> `Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam`

Under it, the launcher names the first problem in plain words, says what to do about it and offers
the command that lists every problem, with a **Copy** button. The server's message carries up to
three examples; the full list is in [the diagnostic](#see-every-problem).

## The usual causes

On a game you never modified, the usual culprits are files the check cannot tell from a modification:

- **Leftovers of unpacked mods in the user folder** — `info_*.json`, `*.materials.json`, `*.jbeam`
  under `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\vehicles\`, left after a mod was removed from
  `mods\`. Allowed there are only your saved configurations (`<name>.pc` with their `.png`/`.jpg`
  previews) and the game's own `main.materials.json` placeholders.
- **Your own levels or edits** — a level under `current\levels\`, an edited
  `current\lua\common\particles.json`, anything of yours under `current\lua\`, `ui\`, `art\` or
  `scripts\`. Move it out while you play on a strict server.
- **Files added to the game folder** — a tool copied next to the game, a mod installed into the game
  folder instead of the user folder. Logs, the shader cache and Windows' `desktop.ini` do not count.
- **Another game version** — after a BeamNG update, until the host regenerates the reference (or
  until you update). The examples then name game files such as `/Bin64/BeamNG.drive.x64.exe (hash)`.
- **A changed game archive** — a `.zip` under `content\` repacked or edited. Verify the game files
  in Steam.

**Not a cause:** packed mods in `mods\`. The strict check does not look there, and they are switched
off for the session anyway.

## See every problem

The launcher has the same check built in and prints the whole list. The simplest way is the
**Copy** button under the refusal: it gives the full command with every path filled in. Paste it
into a Command Prompt, with BeamNG closed.

By hand, the command needs the reference the server sent. References are cached as
`%LOCALAPPDATA%\com.nodemp.launcher\helper\cache\integrity\<id>.manifest` — one file per server
reference you fetched; the newest is normally the one of the server that just refused you. The
launcher's program is the only `.exe` in `%LOCALAPPDATA%\NodeMP` other than `uninstall.exe`:

```
cd /d %LOCALAPPDATA%\com.nodemp.launcher\helper
"%LOCALAPPDATA%\NodeMP\<program>.exe" --helper --data-dir %LOCALAPPDATA%\com.nodemp.launcher\helper --integrity-check cache\integrity\<id>.manifest
```

Add `--game-dir <folder>` if **Settings → Game** names a folder; `--user-path <folder>` overrides
the user folder. The output is also written to `launcher.log` and looks like this:

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

One line per problem: the reason, then the path.

| Reason | Path | Meaning | What to do |
|---|---|---|---|
| `overlay` | `userfolder:<path>` | A file in your user folder that overrides game content. | Move it out of `current\`. A packed mod belongs in `mods\`. |
| `unreadable` | `userfolder:<folder>` | A folder the launcher could not read, usually a path longer than Windows allows. | Shorten or remove it. |
| `unlisted` | `/<path>` | A file in the game folder that a clean install does not have. | Delete it — Steam's file check does not remove extra files. |
| `hash`, `size`, `missing` | `/<path>` | A game file was edited, resized or deleted. Many of them, `/Bin64/…` included, mean another game version. | Verify the game files in Steam; update the game, or wait for the host. |
| `crc`, `size`, `extra`, `missing`, `duplicate` | `/<zip>!<entry>` | A file inside a game archive differs from the clean one. | Verify the game files in Steam. |
| `unreadable` | `/<zip>` | The archive is not a readable zip. | Verify the game files in Steam. |
| `not judged` | `<path> (the launcher's own)` | Not a problem: the launcher's own files inside the game folder are left out. | Nothing. |

The exit code is `0` for a clean install, `1` when there are problems and `2` when the check could
not run at all — for example `could not check: manifest format outdated (format 1)` (tell the host
to regenerate the reference) or `could not check: the game's user folder … does not exist` (start
the game once).

## While you play

A strict server checks again during the session: every 10 minutes, and whenever files change in
the game or user folder (at most once a minute). If something changed, the session ends with
**Session ended** and
`Your game files changed while you were playing and no longer match this server's reference (1 problem)`.
Undo the change and join again. The interval is `StrictRecheckMin` in
[Launcher.cfg](/players/settings/#advanced-launchercfg).
