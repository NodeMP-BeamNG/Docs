---
title: Strict servers
description: What a strict server checks, why it turns away extra files, how to see the full list of differences, and how to get in.
---

A **strict** server wants everybody on a clean, unmodified BeamNG.drive, so that a race or a
tournament is fair. Before you join, the launcher compares your game folder, the inside of the
game's archives and your BeamNG user folder with a description of a clean install that the host
prepared. All of it happens on your PC; the server only hears whether you passed. How a host sets
this up is on [Strict verification](/hosting/strict-verification/).

## What it looks like

A join to a strict server has two extra steps. The first time, the launcher downloads the server's
description of a clean install (*Fetching the server's reference manifest*; it's kept for next
time). Then it checks your files against it (*Checking your game files against the server's
reference*).

If anything differs, the join stops:

> **The server refused the join**\
> `Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam`

Under it you get the first problem in plain words, advice on what to do, and a command with a
**Copy** button that lists every problem. The server's message itself names at most three.

## What usually trips it

Even if you never touched the game on purpose, leftovers trip the check:

- **Unpacked mod leftovers in your user folder**: files like `info_*.json`, `*.materials.json` or
  `*.jbeam` in `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\vehicles\`, left behind by mods you
  removed long ago. Your own saved configurations (`<name>.pc` with their thumbnails) are fine.
- **Your own maps and scripts**: a track in `current\levels\`, anything under `current\lua\`,
  `ui\`, `art\` or `scripts\`. Move them somewhere else while you play on strict servers.
- **Extra files in the game folder**: tools, ReShade, a mod unpacked into the game folder by
  mistake. Windows' own files (`desktop.ini`), shader caches and the game's logs don't count.
- **A different game version**: the game just updated and the host hasn't caught up yet (or the
  other way round). Then the list is full of the game's own files, such as
  `/Bin64/BeamNG.drive.x64.exe (hash)`.
- **Changed game archives**: a repacked `.zip` in the game's `content\` folder. Steam's file check
  fixes that.

Zip mods in your `mods\` folder **never** fail the check: it skips them, and the game turns them
off for the session anyway.

## See every problem

The quickest way is the **Copy** button under the refusal: it puts the whole command, with the
right paths, on your clipboard. Close BeamNG.drive, paste it into Command Prompt or PowerShell and
press Enter.

It looks like this, with the server's cached file from
`%LOCALAPPDATA%\com.nodemp.launcher\helper\cache\integrity\` (the newest one is usually the server
you just tried):

```
"<the launcher's exe>" --helper --data-dir %LOCALAPPDATA%\com.nodemp.launcher\helper --integrity-check "%LOCALAPPDATA%\com.nodemp.launcher\helper\cache\integrity\<id>.manifest"
```

If you set the game or user folder by hand, add `--game-dir <folder>` or `--user-path <folder>`.
The result goes to the console and to `launcher.log`:

```
integrity check (strict) against C:\Users\you\AppData\Local\com.nodemp.launcher\helper\cache\integrity\e326499d….manifest
  game folder  C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive
  user folder  C:\Users\you\AppData\Local\BeamNG\BeamNG.drive\current
  launcher     exe …, data …, cache …
  manifest     id e326499d…, format 2, game 0.39.4.0 build 20972, 14193 root files, 173 archives, generated 2026-…
  overlay   userfolder:vehicles/bell407/info_bell407.json
  overlay   userfolder:levels/mytrack/info.json
  unlisted  /ReShade.ini
game files DIFFER: 14193 files checked in 1.0s (strict), 7203 hashed, 1 not part of the game, 2 user-folder overrides …
counts: missing 0, size 0, hash 0, unlisted 1, archive 0, userfolder 2, folders skipped 0
```

## Reading the result

One problem per line: the reason first, then the path.

| Reason | Path | Meaning | What to do |
|---|---|---|---|
| `overlay` | `userfolder:<path>` | A file in your user folder replaces or adds game content. | Move it out of `current\`. Zip mods belong in `mods\`. |
| `unreadable` | `userfolder:<folder>` | The launcher couldn't read that folder, usually because the path is too long for Windows. | Shorten or delete the folder. |
| `unlisted` | `/<path>` | A file in the game folder that isn't part of the game. | Delete it yourself: Steam's file check doesn't remove extra files. |
| `hash`, `size`, `missing` | `/<path>` | A game file was changed or is missing. If it's many files, including `/Bin64/…`, the game versions differ. | Verify the game files in Steam; update the game, or wait for the host to update. |
| `crc`, `size`, `extra`, `missing`, `duplicate` | `/<zip>!<entry>` | Something inside one of the game's archives differs from the release. | Verify the game files in Steam. |
| `unreadable` | `/<zip>` | One of the game's archives is damaged. | Verify the game files in Steam. |
| `not judged` | `<path> (the launcher's own)` | The launcher's own files in the game folder. Not a problem. | Nothing. |

The command ends with `0` when everything is clean, `1` when something differs and `2` when the
check couldn't run, for example `manifest format outdated (format 1)` (ask the host to make a new
one) or a missing user folder (start BeamNG.drive once).

## While you play

A strict server keeps checking during the session: every 10 minutes, and again shortly after files
in the game or user folder change. If something changed, the session ends:

> **Session ended**\
> `Your game files changed while you were playing and no longer match this server's reference (1 problem)`

Put the files back as they were and join again. How often the timed check runs is
`StrictRecheckMin` in [Launcher.cfg](/players/settings/#advanced-launchercfg).
