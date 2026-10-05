---
title: Install the launcher
description: Download and install the NodeMP launcher for Windows — it installs the client mod, keeps itself up to date and starts the game.
---

The **launcher** is the Windows app you play NodeMP through: you sign in, pick a server and join
from it. It installs and updates the **client mod** and starts BeamNG.drive for you — nothing to
copy by hand.

**In short:** download the installer from [nodemp.com/download](https://nodemp.com/download), run
it, sign in through your browser or pick Test Drive — and [join a server](/players/join/).

## What you need

- Windows 10 or 11, 64-bit.
- BeamNG.drive **0.39.4.0**, the current game version. The client mod is built and tested for it;
  strict servers compare your game with a reference made for one version.
- The game started at least once. The first start creates the user folder the launcher installs
  the mod into, and the `BeamNG.Drive.ini` file the launcher finds the game by.

A Steam copy is found on its own. If the game lives somewhere else, point **Settings → Game** at
its folder (see [below](#if-the-launcher-did-not-find-the-game)).

## Download and install

1. Download the installer `NodeMP-Setup-<version>.exe` from [nodemp.com/download](https://nodemp.com/download).
   The same file is in the [GitHub releases](https://github.com/NodeMP-BeamNG/releases), with a
   `.sha256` file next to it.
2. Run it. It installs for the current user only, into `%LOCALAPPDATA%\NodeMP` — no
   administrator rights needed.
3. The launcher opens on its own.

:::caution[Windows warning]
The installer is not code-signed yet, so SmartScreen may say *Unknown publisher*. Choose **More
info → Run anyway**. To make sure the file is the published one, run
`Get-FileHash .\NodeMP-Setup-<version>.exe` in PowerShell — the SHA-256 must equal the published
value (on the Download page and in the `.sha256` file).
:::

## First start

1. **Checking for updates** — a small window with the NodeMP mark. The launcher looks for a newer
   version and loads the server list.
2. **Sign in** — a window with two buttons: **Sign in with browser** and **Continue as Test
   Drive**. How it works is on [Account and sign-in](/players/sign-in/). A sign-in is remembered, so
   the window is skipped next time; Test Drive is not — you pick it at every start.
3. **The main window** — the launcher is ready. While you look around, it checks the client mod in
   the background.

Instead of the main window you may get one of two small windows:

| Window | What it means | What to do |
|---|---|---|
| **Connection lost** | The launcher could not load the server list. | **Try again**, or **Continue without the list** — Direct Connect by address still works. |
| **Account banned** | The account is banned; the window shows the reason and the end date. | While the ban lasts, the account cannot join servers. |

## Launcher updates

The launcher updates itself: it looks for a new version at start-up and before every join,
downloads it in the background and installs it when you press **Restart and update**. An update
never installs during a session — only after you leave the server.

All of it is under **Settings → Launcher → Updates**:

- **Update channel** — *Release* or *Beta*. Beta gets new versions first; they may be less stable.
- **Check for updates automatically** — turn it off to check by hand.
- **Go back to v…** — reinstalls the previous version from the cache if you do not like the new
  one. The skipped version is not offered again on its own.

You can always download the current version from the [Download page](https://nodemp.com/download)
and install it over the old one.

## The client mod

The **client mod** is the BeamNG mod that does the multiplayer work inside the game. The launcher
puts it into BeamNG's user folder:

```
%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\mods\multiplayer\NodeMP.zip
```

- **When it updates.** At every launcher start and before every join, the launcher compares the
  installed mod with the published one (by SHA-256) and downloads the new one if they differ.
  Usually the mod is downloaded the first time you open the launcher.
- **The game must be closed** while the mod is replaced: BeamNG keeps the file open. Keep it
  closed the first time you open the launcher, and when a new mod release comes out.
- **It is switched on for you.** Before every game start the launcher enables it in the mod
  manager, even if you disabled it in the game.
- **To check by hand:** **Settings → Launcher → Client mod → Check now**.

Do not copy `NodeMP.zip` into the folder yourself — the launcher replaces it with the published one.

:::note[If the mod could not be updated]
If the new version did not download but the old one is on disk, the launcher joins with the old
one and shows *Client mod could not be updated*. Whether the server accepts an older mod is the
server's call. With no mod on disk and the service unreachable, the join cannot start.
:::

<details>
<summary>For developers: an unpacked copy of the mod and a moved user folder</summary>

If the mod's source is kept unpacked at `mods/unpacked/nodemp`, the launcher installs nothing and
reports `Unpacked developer copy at mods/unpacked/nodemp is in use`. A moved user folder
(`UserPath` in `startup.ini` beside the game, or `userFolder` in `BeamNG.Drive.ini`) is followed.

</details>

## If the launcher did not find the game

Open **Settings → Game**. The line under the heading says what was found, for example
`Version 0.39.4.0`. If it says the game was not found:

- press **Browse** and pick the folder that contains `Bin64\BeamNG.drive.x64.exe`, or
- start the game once through Steam and press **Find it**.

With no game found, a join stops with an error — better to check this first.

## Next

- [Account and sign-in](/players/sign-in/) — sign in, or play without an account.
- [Join a server](/players/join/) — pick a server and get in.
