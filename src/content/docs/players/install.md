---
title: Install the launcher
description: Download and install the NodeMP launcher for Windows. It installs the multiplayer mod, keeps itself up to date and starts the game for you.
---

The **launcher** is the program you play NodeMP through: you sign in, pick a server and join. It
also installs and updates the **client mod**, the part of NodeMP that runs inside the game.

## What you need

- Windows 10 or 11.
- BeamNG.drive 0.39.4.0, the version the client mod is built for.
- The game started at least once. Its first start creates the game's user folder, which is where
  the launcher puts the mod.

The launcher finds a Steam install by itself. If your game is somewhere else, you can point the
launcher at it, see [below](#the-launcher-cant-find-the-game).

## Install

1. Download `NodeMP-Setup-1.1.26.exe` from the [download page](https://nodemp.com/download).
2. Run it. It installs for your Windows user only, so it doesn't ask for administrator rights.
3. The launcher opens when the installer is done.

:::caution[Windows warning]
The installer isn't signed with a certificate yet, so Windows may say the publisher is unknown.
Click **More info**, then **Run anyway**.
:::

## The first start

1. A small window checks for launcher updates and loads the server list.
2. The sign-in window offers **Sign in with browser** or **Continue as Test Drive**.
   [Your account](/players/sign-in/) explains the difference.
3. The main window opens, and you can play.

If you see something else instead of the main window:

- **Connection lost**: the server list didn't load. Check your internet and click **Try again**. If
  you know a server's address, choose **Continue without the list** and use Direct Connect.
- **Account banned**: your account is banned from NodeMP servers. The window shows the reason and
  until when. **Appeal** opens the page where you can contest it.

## The client mod

The client mod (`NodeMP.zip`) does everything inside the game: other players' cars, the chat, the
name tags, the multiplayer menus. The launcher puts it into the game's user folder, checks it at
every start and before every join, and downloads a new version when there is one. You never copy
it by hand.

:::caution[Close the game]
Don't start BeamNG.drive while the mod is downloading: the running game holds the file, and the
launcher can't replace it.
:::

To check the mod yourself, use **Settings → Launcher → Client mod → Check now**.

## Launcher updates

The launcher checks for updates on its own and downloads them in the background. It installs one
only when you let it: when you click **Restart and update**, or right before a join. It never
installs anything while you're on a server.

The settings are in **Settings → Launcher → Updates**:

- **Update channel**: *Release*, or *Beta*, which gets new versions first.
- **Check for updates automatically**: at start-up and before each join.
- **Download updates in the background**: turn it off and the launcher only tells you a new version
  is out, then downloads it when you click **Update now**. An update that servers require is still
  installed before a join.
- **Go back to v…**: reinstalls the previous version if the new one gives you trouble.

The latest installer is always on the [download page](https://nodemp.com/download), and you can run
it over your current version.

## The launcher can't find the game

Open **Settings → Game**. The line under the heading shows the game version the launcher found. If
it's empty:

- click **Browse** and pick the folder that holds `Bin64\BeamNG.drive.x64.exe`;
- or start BeamNG.drive once through Steam, close it and click **Find it**.

## Next

- [Your account](/players/sign-in/).
- [Join a server](/players/join/).
