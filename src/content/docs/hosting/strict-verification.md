---
title: Strict file check
description: What verify = "strict" checks, how to make the reference manifest, where to put it and what to do after a game update.
---

`[integrity] verify = "strict"` is the strictest check of the game files. The ordinary levels compare the player's install with the list of files that comes with the game, and a player can edit that list together with the files. The strict check compares the install with a reference manifest: a description of a clean install that you make once per game version.

It's for races and tournaments where everyone must have the same game. For freeroam the default check, `size`, is usually enough.

## What it checks

The player's launcher runs the check and the server judges the result. A player passes when everything listed here matches.

- The files in the manifest. The size of each is compared. The game's code (`lua/`, `ui/`), everything in `Bin64/` and `BinLinux/` and every `.exe` in the game folder are also compared by SHA-256, so an edit that keeps the size is visible too.
- The game's archives. The table of contents of each `.zip` is compared: the name, size and CRC-32 of every file inside.
- The whole game folder. An extra file is an error, except logs, caches and what the game and Windows write themselves. An extra `.dll` in `Bin64/` is always an error.
- The game's user folder (`…\BeamNG.drive\current`). What the game and the player write is allowed there: settings, screenshots, replays, saves, caches and temporary files, logs, mods in `mods/`, work from the built-in editors, your own car configurations (`vehicles/<model>/<name>.pc` with a picture). Everything else in `vehicles/`, `levels/`, `lua/`, `ui/`, `art/`, `scripts/`, `gameplay/` and in folders named like the game's folders counts as a substitution.

## What it doesn't catch

The strict check keeps honest players on a clean game, but it doesn't protect against cheating.

- Inside the archives only the table of contents is compared. CRC-32 can be forged by someone who edits an archive on purpose.
- The launcher runs on the player's computer, and the player controls the computer.
- Files other than code and programs are compared by size only.
- The manifest is only as clean as the install it was made from.

So rules on the server side, in your plugins, are still needed.

## Make the manifest

The generator is built into the server. Run it on a computer with Windows and a clean BeamNG.drive of the same version your players have: verify the game files in Steam and remove foreign programs and mods from the game folder. You need the Windows build of the server:

```powershell
$game = "C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive"
.\Node-Server.exe --gen-integrity $game
```

The argument is the game's main folder, the one that holds `integrity.json`. A Linux or Docker server has no game, so make the manifest where the game is installed and copy it to the server.

You can set the file name and the game version by hand: `--out FILE` names the file, and `--game-version V` gives the version instead of the one recorded in `integrity.json`.

At the end the generator prints a summary, including a `hash` line that names the manifest, and the path of the file, for example `integrity\<game version>.manifest`. Two runs on the same install give the same file. If something goes wrong, no file is written and the generator says `integrity manifest NOT written: …`.

## Put the manifest on the server

1. Copy the file into `integrity/` in the server's working directory. In Docker that's `data/integrity/`.
2. Set `verify = "strict"` in `[integrity]` (in Docker, the variable `NODE_VERIFY_GAME=strict`).
3. Restart the server.

The log then has `strict game verification ON: reference manifest for game … (…)`.

The folder must hold exactly one manifest. The launcher doesn't tell the server which game version it has, so with two files the server can't choose and lets nobody in. With no file it lets nobody in either and asks the host to make a manifest.

The manifest is also loaded on a server with another check level. A plugin can then start a strict check itself when it needs one, and refuse nobody at the door.

## After a game update

A manifest describes one game version. When BeamNG updates, players with the new version stop being let in. Make a new manifest from the updated clean install, replace the old file (there is still one file) and restart the server. Launchers notice the new manifest and download it at their next join. Now players who haven't updated the game yet are refused, and updating in Steam fixes that.

## What the player sees

A clean install joins as usual. What the launcher shows on a mismatch and what the player does: [When something breaks](/players/troubleshooting/#a-strict-server-refuses-you).

During play the launcher checks again when files change, and the server asks for a check every `[integrity] recheck_sec` seconds, by default every ten minutes ([settings reference](/hosting/configuration/#integrity)). If a mismatch is found, the session ends. Checks during a session don't recompute the game's programs: a replaced library takes effect only after the game restarts, and the next join checks the programs again.

## For plugin authors

`player:verify(level)` asks the player's launcher to check the files right now, and the `playerVerifyReported` event arrives with every check result. On a server with `verify = "off"` that is the only consequence, and this is how you build a check that doesn't kick anyone out. Details: [Lua API reference](/plugins/api/lua/) and [events](/plugins/api/events/).
