---
title: Install the launcher
description: How to install the NodeMP launcher for Windows, what it does on the first start, and how it installs the client mod and updates itself.
---

The launcher is the program you play NodeMP through: you sign in, pick a server and join. It also installs and updates the client mod, which runs inside the game.

## What you need

- Windows 10 or 11.
- BeamNG.drive 0.39, started at least once: its first start creates the game's user folder.

The launcher finds the game by itself. If it doesn't, point it to the game folder ([below](#the-launcher-cant-find-the-game)).

## Install

1. Download the installer from the [download page](https://nodemp.com/download).
2. Run it. The launcher installs for your Windows user only and needs no administrator rights.
3. Wait for the installer to finish. The launcher opens by itself.

:::caution[Windows warning]
The installer isn't code-signed yet, so Windows may say the publisher is unknown. Click **More info**, then **Run anyway**. To check the file, run `Get-FileHash .\NodeMP-Setup-*.exe` in PowerShell and compare the result with the SHA-256 on the download page.
:::

## The first start

A small window checks for launcher updates and loads the server list. Then the launcher asks you to sign in: click **Sign in with browser** or **Continue as Test Drive** ([Your account](/players/sign-in/)). The main window opens next.

Another window may open instead:

- *Connection lost*: the server list didn't load. Check your connection and click **Try again**. If you know a server's address, click **Continue without the list** and join [by address](/players/join/#join-by-address).
- *Technical work*: NodeMP is down for maintenance. If the end time is known, the window shows it in Moscow time. **status.nodemp.com** opens the service status page. The launcher checks again by itself; **Try again** checks at once.
- *Account banned*: see [Bans](/players/sign-in/#bans).

## The client mod

The client mod (`NodeMP.zip`) does everything inside the game: other players' cars, the chat, name tags, the session panel. The launcher installs it in `mods\multiplayer\` in the game's user folder (by default `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\`). At startup and before every join, it checks the mod and downloads a new version if there is one. You don't need to copy the mod by hand.

:::caution[Close the game]
Don't start BeamNG.drive while the mod downloads: a running game holds the file, and the launcher can't replace it.
:::

If the check fails but a mod is already installed, the launcher warns you (*Client mod could not be updated*) and joins with the old version. The server decides whether that version will do.

To check the mod yourself, click **Settings → Game → Client mod → Check now**. The installed version is shown there too.

## Launcher updates

The launcher checks for updates at startup and before every join and downloads them in the background. An update installs when you click **Restart and update** or right before a join: the launcher restarts and continues the join in the new version. No update installs while you're on a server.

Set up updates in **Settings → Launcher → Updates**:

- **Check for updates automatically**: when off, the launcher doesn't check on its own, at startup or before a join. **Check now** in the version row checks by hand.
- **Download updates in the background**: when off, the launcher only tells you a new version is out and downloads it when you click **Update now**. A required update still installs before a join.
- **Update channel**: *Release* or *Beta*. Not every build has this row.
- **Go back to v…**: reinstalls the previous version from the cache if the new one gives you trouble. The row appears only when the cache holds one.

If the launcher can't update itself, download the installer from the [download page](https://nodemp.com/download) and install it over the current one.

## The launcher can't find the game

Open **Settings → Game**. The line under the heading shows what the launcher found: `Version` and the game's version, or what's wrong, such as `No Bin64\BeamNG.drive.x64.exe in this folder`.

If the game isn't found, click **Browse** and choose the folder that holds `Bin64\BeamNG.drive.x64.exe`. Or start BeamNG.drive once through Steam, close it and click **Find it**.
