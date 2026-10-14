---
title: Strict verification
description: VerifyGame = strict - what it checks and what it doesn't, making the reference manifest with --gen-integrity, where it goes, game updates, and the plugin calls.
---

`[General] VerifyGame = "strict"` is the strongest game file check. The lighter levels compare a
player's install with the game's own file list, a list the player could edit together with the
files. `strict` compares it with a **reference manifest** instead: a description of a clean
install that you make once per game version and put on the server. The player's launcher fetches
it once, caches it, and checks the whole install and the game's user folder against it before
every join and again during the session.

It's meant for races and tournaments where everyone should drive the same game. For a freeroam
server the default `size` check is usually enough.

## What it checks

The check runs in the player's launcher; the server judges the report. A player passes when all of
this agrees:

- **Every file the manifest lists**, by length. The game's code (`lua/`, `ui/`), everything under
  `Bin64/` and `BinLinux/`, and the `.exe` files in the game folder are also checked by SHA-256,
  so an edit that keeps the length is caught. Other loose files are compared by size. Problems:
  `missing`, `size`, `hash`.
- **Every game archive** (`.zip`), by its table of contents: each entry's name, size and CRC-32,
  against the clean install. Problems: `missing`, `extra`, `duplicate`, `size`, `crc`, and
  `unreadable` for a damaged zip.
- **The whole game folder.** A file the manifest doesn't list is `unlisted`, except logs, caches
  and a few files the game or Windows write on their own (`integrity.json`, `*.log`, `temp/`,
  `startup.ini`, `shadercache/`, `desktop.ini`, …). A `.dll` in `Bin64/` is never excused. If the
  launcher is installed inside the game folder, its own files are left out.
- **The game's user folder** (`…\BeamNG.drive\current`), where the game lays loose files over the
  packed content. Only what players legitimately keep there is allowed: settings, screenshots,
  replays, saves, caches, mods in `mods/`, saved vehicle configurations
  (`vehicles/<model>/<name>.pc` with their pictures) and the editors' folders. Anything else under
  `vehicles/`, `levels/`, `lua/`, `ui/`, `art/`, `scripts/` or `gameplay/` is an `overlay`.

On BeamNG 0.39.4.0, with the files already in the system's cache, the whole check takes about a
second (14 193 files, 173 archives, 7 203 files hashed). The first check after a reboot reads it
all from disk and takes tens of seconds.

## What it doesn't check

The check keeps honest players on a clean game; it isn't a security boundary.

- **Inside the archives**, only the table of contents is compared. CRC-32 can be forged by someone
  who edits an archive on purpose and pads it back; hashing every archive would mean reading about
  50 GB per join. Your plugin's own rules on the server are the second line.
- **The launcher itself** runs on the player's machine, which the player controls.
- **Loose files outside the code and binaries** are compared by size only.
- **Checks during the session** (after files change, and on a timer) skip hashing the binaries; a
  library the running game already loaded can't change anything before the next start, which runs
  the full check again. A check a plugin asks for with `player:verify("strict")` hashes everything.
- **The manifest is only as clean as the install it was made from.**

## Making the manifest

The generator is part of the server. Run it on a PC with a **clean** BeamNG.drive install of the
version your players have (verify the files in Steam first, and keep tools and mods out of the game
folder), with the Windows build of `Node-Server`:

```powershell
.\Node-Server.exe --gen-integrity "C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive"
```

The argument is the game's main folder, the one with `integrity.json` in it. A Linux or Docker
server has no game to read, so make the file on a Windows PC and copy it over; it doesn't matter
where it was made. The output:

```
reading the game install at C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive (every file is hashed; a few GB take about a minute) ...
integrity manifest written
  game        0.39.4.0 (build 20972)
  root files  14193 (whole install, 2656.7 MB hashed)
  archives    173 (59594 entries)
  size        6.4 MB json, 1.2 MB compressed
  hash        e326499d35bdef6f1d937a6648113b34225d37c5d0e07b4fc22cdee5db1273a6
  file        integrity\0.39.4.0.manifest
Put the file in the server's [General] IntegrityDir (default "integrity") and set VerifyGame = "strict".
```

The `hash` is the manifest's id; everything refers to the manifest by it, and launchers cache it
under that name. Two runs over the same install give the same file and the same id.
`--out <file>` writes it somewhere else, `--game-version <x.y.z.w>` overrides the version read from
`integrity.json`. If something goes wrong, the tool writes nothing and says
`integrity manifest NOT written: …`.

## Putting it on the server

Copy the file into `integrity/` in the server's working directory (`/data/integrity/` in Docker),
or the folder `[General] IntegrityDir` names. Set `VerifyGame = "strict"` (`NODE_VERIFY_GAME=strict`)
and restart; both are read at start. A healthy start logs:

```
integrity manifest for game 0.39.4.0 (build 20972): 173 archives, 59594 entries, 14193 root files, 1.2 MB (38 chunks), hash e326499d…
strict game verification ON: reference manifest for game 0.39.4.0 (e326499d…)
```

Keep **exactly one** `.manifest` in the folder. The launcher doesn't tell the server which game
version it has, so with two files the server can't choose and refuses every join with
`This server has integrity manifests for 2 game versions (0.39.4.0, 0.39.3.0) and cannot tell which one you run. …`;
with none, with ``This server requires a strict check of your BeamNG install but has no integrity manifest to check it against. Ask the host to run `Node-Server --gen-integrity <gamedir>` and put the file in the server's integrity folder.``

A server on another level still loads the folder
(`1 integrity manifest loaded from "integrity" (available to Player:verify("strict"))`), so a plugin
can run a strict check when it wants without refusing anyone at the door.

## After a game update

A manifest describes one game version. When BeamNG updates, players with the new version are
refused against the old manifest. Make a new manifest from the updated clean install, replace the
old file (still one file in the folder) and restart. Launchers notice the new id and fetch it on
their next join. Players who haven't updated the game yet are then refused instead, with examples
like `/Bin64/BeamNG.drive.x64.exe (hash)`; updating the game in Steam fixes that.

## What players see

A strict join has two extra steps: fetching the manifest (once; about 1.2 MB) and checking against
it. A clean install then joins as anywhere else. A mismatch is refused with
`Game files do not match this server's reference (3 problems). userfolder:vehicles/pickup/pickup.jbeam (overlay), …`,
which the launcher explains in plain words with a command that lists every problem. The player's
side of it is [Strict servers](/support/strict-servers/).

During the session the launcher checks again when files change in the game or user folder, and
every 10 minutes. A check that finds a change ends the session with
`Game files changed while you were playing and no longer match this server's reference (1 problem). …`.

## For plugin authors

- [`player:verify(level)`](/plugins/api/lua/#playerverifylevel---boolean-string) asks the player's
  launcher to check again now, at `"size"`, `"scripts"`, `"full"` or `"strict"`. It returns `true`
  when the request went out, or `nil` and a reason: `"unknown player"`, `"unsupported"` (for
  example `"strict"` without exactly one manifest loaded) or `"pending"` (one request per player
  per 60 seconds; the check at the door doesn't count).
- [`playerVerifyReported`](/plugins/api/events/#playerverifyreported) fires for every report,
  after the server has decided, with `{ level, outcome, problems, detail, manifest }`. On a server
  with `VerifyGame = "off"` the event is the only consequence, which is how you build an audit
  that refuses nobody.
- [`player:setStrict(on)`](/plugins/api/lua/#playersetstricton---boolean-string) makes the server
  stop relaying camera reports in which that player follows a car they aren't in. It says nothing
  to the client; the client-side rules of a strict session are switched on by `session:config`
  ([Client scripts](/plugins/client-scripting/#strict-sessions-sessionconfigstrict)).
