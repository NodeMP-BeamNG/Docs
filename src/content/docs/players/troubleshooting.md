---
title: When something breaks
description: A server won't let you in, a strict server complains about your files, mods don't download, the game doesn't start or you get dropped. What usually stands behind each and what to do.
---

## What the launcher says

If a join fails, the launcher shows a notification. Its title says at which stage: *Could not join* (before the game starts, because of the client mod or NodeMP's answer), *Could not connect* (the server didn't answer), *The server refused the join* (the server said no) or *Session ended* (the session ran and then ended). The line under the title is the reason. Servers write their reasons in English, and the host may write the reason for a ban or a kick in any language: search for them exactly as they appear. Earlier notifications are kept under the bell icon, and the **Details** button shows the full text.

What each reason means and what to do: [Error messages](/reference/error-codes/).

## A strict server refuses you

A strict server lets you in only with a clean installation of the game and a clean user folder ([What the server checks](/players/join/#what-the-server-checks)). If something differs, the server's card keeps a block with a heading like `Your game files do not match this server's reference (3 problems)`, the first problem, advice after the words **What to do**, and a command that lists all the problems, with a **Copy** button. The heading, the problem and the advice are in English.

Things you didn't change on purpose can get in the way too:

- Leftovers of unpacked mods in the user folder: files like `info_*.json` or `*.jbeam` in `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\vehicles\` from mods removed long ago. Your saved configurations (`<name>.pc` with pictures) don't get in the way.
- Your own maps and scripts in the `levels\`, `lua\`, `ui\`, `art\`, `scripts\` and `gameplay\` folders inside `current\`. Move them elsewhere while you play on strict servers.
- Extra files in the game folder: third-party programs, ReShade, a mod unpacked into the game folder by mistake.
- A different game version: the game updated recently and the host's copy hasn't, or the other way round. Then the list shows files of the game itself, for example `/Bin64/BeamNG.drive.x64.exe (hash)`.

To see all the problems:

1. Close BeamNG.drive.
2. Click **Copy** next to the command.
3. Paste the command into Command Prompt or PowerShell and press Enter. If the path to `NodeMP.exe` in the command is in quotes (it is when the path has spaces), put `& ` in front of the command in PowerShell.

Each line of the result is a path and a reason:

| Reason | What it means | What to do |
|---|---|---|
| `overlay` | A file in the user folder replaces or adds game content. | Remove it from `current\`. Put zip mods in `mods\`. |
| `unlisted` | An extra file in the game folder. | Delete it yourself: Steam's check doesn't remove extra files. |
| `hash`, `size`, `missing` | A game file was changed or is missing. If there are many of them and `/Bin64/…` is among them, you and the server have different game versions. | Verify the files in Steam, update the game, or wait for the host to update. |
| `crc`, `extra`, `duplicate` | Something is wrong inside a game archive. | Verify the files in Steam. |
| `unreadable` | The launcher couldn't read a file or folder. | Shorten the path or delete the file from the user folder. |

During the session the launcher checks the files again: when the server asks (every 10 minutes by default) and when files change. If something changed, the server ends the session. Put the files back as they were and join again. How the check works and how a host sets it up: [Strict file check](/hosting/strict-verification/).

## Mods don't download

- The download is slow: wait. As long as it moves, the server doesn't cut it off.
- The download broke off: see [A bad connection and VPNs](/players/connection/#when-the-connection-drops).
- The same mod fails again and again: the server may not have it, the file may be broken, or the host marked the mod as protected and you have to put it in the cache yourself. Then the message names the folder to put it in. All such messages: [Downloading the server's mods](/reference/error-codes/#downloading-the-servers-mods).
- The disk is full: delete mods you don't need on the **Content** tab ([Downloaded mods](/players/settings/#downloaded-mods)).

## The game doesn't start, or closes right away

1. Open **Settings → Game** and check that the launcher sees the game version. If it doesn't, click **Browse** or **Find it** ([The launcher can't find the game](/players/install/#the-launcher-cant-find-the-game)).
2. Choose another **Graphics mode** there, for example *Direct3D 11*.
3. Verify the game files in Steam.
4. If the game started and closed, look for the reason in its log, `beamng.log` ([where it is](#what-to-send-when-you-ask-for-help)).

If the game started but showed the error `Error loading NodeMP` with the text `NodeMP is not compatible with BeamNG.drive version …`, your game isn't from the 0.39 branch the mod is built for ([What you need](/players/install/#what-you-need)).

## You got dropped

A short drop doesn't end the session ([When the connection drops](/players/connection/#when-the-connection-drops)). If the session did end, the launcher window comes back and names the reason in a *Session ended* notification. Look up what it means under [The server's refusals and kicks](/reference/error-codes/#the-servers-refusals-and-kicks). *Session ended* with no reason means BeamNG.drive was closed.

## The server list is empty

- *Connection lost* at start-up: [The first start](/players/install/#the-first-start).
- *No servers online*: the list loaded, but no server is running right now.
- *Nothing matches these filters*: there are servers, but your filters hide them. Click **Reset all filters**.
- A server you know is running isn't on the list: the host may not have listed it. Join [by address](/players/join/#join-by-address).

## The launcher's traffic helper

Every join makes the launcher start a second copy of itself, without a window. It starts the game, connects to the server and carries your traffic while you play. If the launcher says *The launcher's traffic helper stopped*, it means this background part, and the line under the title is the last line of its log. What it means: [Helper exit codes](/reference/error-codes/#helper-exit-codes).

## What to send when you ask for help

On Discord, send:

1. `launcher.log` right after the problem: the launcher starts it over on the next join.
2. The exact text of the message: the title, the line under it and the text from **Details**.
3. The server's name and what you were doing.

If the problem is inside the game (a car disappeared, the chat acts strangely), add the game's log, `beamng.log`.

| What | Where |
|---|---|
| `launcher.log` | `%LOCALAPPDATA%\NodeMP\helper\logs\` (**Settings → Launcher → Folders → Logs → Open**) |
| `beamng.log` | `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\` |
| Mods downloaded from servers | `%LOCALAPPDATA%\NodeMP\helper\cache\` (**Settings → Launcher → Folders → Downloaded content → Open**) |
| The client mod | `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\mods\multiplayer\NodeMP.zip` |
| Remembered server certificates (delete a server's line if the host reinstalled it) | `%LOCALAPPDATA%\NodeMP\helper\cache\known_servers.json` |
| `Launcher.cfg`, the helper's settings | `%LOCALAPPDATA%\NodeMP\helper\`. You don't need to edit it: the launcher passes everything a join needs. |

The game's user folder is the default one in the table. If you moved it, the paths start from your folder.
