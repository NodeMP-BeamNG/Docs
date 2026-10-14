---
title: Strict file check
description: VerifyGame = strict - what it checks and what it doesn't, making the reference manifest, where it goes, and what to do after a game update.
---

`[General] VerifyGame = "strict"` is the strongest game file check. The lighter levels compare a
player's install with the file list that comes with the game, and a player can edit that list
together with the files. The strict check compares the install with a **reference manifest**
instead: a description of a clean install that you make once per game version.

It's meant for races and tournaments where everyone should drive the same game. For freeroam the
default check, `size`, is usually enough.

## What it checks

The player's launcher runs the check and the server judges the result. A player passes when all of
this matches:

- **The files in the manifest.** The size of each. The game's code (`lua/`, `ui/`), everything in
  `Bin64/` and `BinLinux/`, and the `.exe` files in the game folder are also checked by SHA-256, so
  an edit that keeps the size shows up too.
- **The game's archives.** Each `.zip` by its table of contents: the name, size and CRC-32 of every
  file inside.
- **The whole game folder.** An extra file fails, except logs, caches and what the game and Windows
  write themselves. An extra `.dll` in `Bin64/` always fails.
- **The game's user folder** (`…\BeamNG.drive\current`). Only what players legitimately keep there
  is allowed: settings, screenshots, replays, saves, caches, mods in `mods/`, their own car
  configurations (`vehicles/<model>/<name>.pc`). Anything else in `vehicles/`, `levels/`, `lua/`,
  `ui/`, `art/`, `scripts/` and `gameplay/` counts as an overlay.

With the files already in the system's cache the check takes about a second. The first check after
a reboot reads everything from disk and takes longer.

## What it doesn't catch

The strict check keeps honest players on a clean game, but it isn't protection against cheating.

- Inside the archives only the table of contents is compared. CRC-32 can be forged by someone who
  edits an archive on purpose.
- The launcher runs on the player's computer, which the player controls.
- Files other than code and programs are compared by size only.
- The manifest is only as clean as the install it was made from.

So rules on the server side, in your resources, are still needed.

## Make the manifest

The generator is part of the server. Run it on a computer with a **clean** BeamNG.drive of the same
version your players have: verify the game files in Steam and keep other tools and mods out of the
game folder. You need the Windows build of the server:

```powershell
$game = "C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive"
.\Node-Server.exe --gen-integrity $game
```

The argument is the game's main folder, the one with `integrity.json` in it. A Linux or Docker
server has no game, so make the manifest on Windows and copy it over. Where it was made doesn't
matter.

At the end the generator prints a summary, including a `hash` line, which is the manifest's id, and
the file's path, such as `integrity\0.39.4.0.manifest`. Two runs over the same install give the same
file. If something goes wrong, nothing is written and the generator says
`integrity manifest NOT written: …`.

## Put the manifest on the server

1. Copy the file into `integrity/` in the server's working directory. In Docker that's
   `data/integrity/`.
2. Set `VerifyGame = "strict"` (in Docker, `NODE_VERIFY_GAME=strict`).
3. Restart the server.

The log then says `strict game verification ON: reference manifest for game 0.39.4.0 (…)`.

Keep **exactly one** manifest in the folder. The launcher doesn't tell the server which game version
it has, so with two files the server can't choose and refuses everyone. With none it refuses
everyone too and asks the host to make a manifest.

A server on another level loads the manifest as well. A resource can then run a strict check when
it wants to, without refusing anyone at the door.

## After a game update

A manifest describes one game version. When BeamNG updates, players with the new version are
refused. Make a new manifest from the updated clean install, replace the old file (still one file)
and restart. Launchers notice the new manifest and fetch it on their next join. Now players who
haven't updated the game yet are refused instead; updating in Steam fixes that.

## What players see

A strict join has two extra steps: fetching the manifest (once, about 1.2 MB) and the check. A clean
install joins as anywhere else. On a mismatch the launcher explains what's wrong and offers a
command that lists every problem. The player's side is on
[When something breaks](/players/troubleshooting/#a-strict-server-refuses-you).

During the session the launcher checks again when files change, and every 10 minutes. A check that
finds a mismatch ends the session.

## For plugin authors

- `player:verify(level)` asks the player's launcher to check the files right now.
- The `playerVerifyReported` event comes with every check result. On a server with
  `VerifyGame = "off"` that event is the only consequence, which is how you build a check that
  refuses nobody.

The details are in the [API reference](/plugins/api/lua/) and the [events](/plugins/api/events/).
