---
title: Install the launcher
description: Download and install the NodeMP launcher for Windows. It sets up the multiplayer mod, keeps itself up to date and starts the game for you.
---

The **launcher** is where all things multiplayer happen: you sign in, pick a server and join. It
also installs and updates the **client mod**, the part of NodeMP that runs inside the game.

The short version: download the installer from [nodemp.com/download](https://nodemp.com/download),
run it, sign in through your browser or choose Test Drive, and you're ready to
[join a server](/players/join/).

## What you need

- Windows 10 or 11.
- BeamNG.drive 0.39.4.0, the version the client mod is built for.
- BeamNG.drive started at least once. The first start creates the game's user folder, which is
  where the launcher puts the multiplayer mod.

The launcher finds a Steam install by itself. If your game lives somewhere else, you can point
the launcher at it, see [below](#if-the-launcher-cant-find-the-game).

## Download and install

1. Download `NodeMP-Setup-<version>.exe` from the [download page](https://nodemp.com/download) or
   from [GitHub releases](https://github.com/NodeMP-BeamNG/releases).
2. Run it. It installs for your Windows user only, so it doesn't ask for administrator rights.
3. The launcher opens when the installer finishes.

:::caution[Windows SmartScreen]
The installer isn't signed with a code-signing certificate yet, so Windows may say the publisher
is unknown. Click **More info**, then **Run anyway**.
:::

## The first start

1. A small window checks for a newer launcher and loads the server list.
2. The sign-in window asks you to **Sign in with browser** or **Continue as Test Drive**.
   [Your account](/players/sign-in/) explains both.
3. The main window opens and you can play.

### If you see a message instead of the main window

| Window | What happened | What to do |
|---|---|---|
| **Connection lost** | The launcher couldn't load the server list. | Check your internet and click **Try again**. If you know a server's address, **Continue without the list** and use Direct Connect. |
| **Account banned** | Your account is banned from NodeMP servers. The window shows the reason and until when. | You can't join with this account while the ban lasts. **Appeal** opens the page to contest it. |

## Launcher updates

The launcher looks for updates on its own and downloads them in the background. It installs one
only when you let it: when you click **Restart and update**, or when it finds one right before a
join (then it updates, restarts and carries on with the join). It never installs anything while
you're on a server.

The update settings are in **Settings → Launcher → Updates**:

- **Update channel**: *Release*, or *Beta* to get new versions earlier.
- **Check for updates automatically**: at start-up and before each join. You can turn it off.
- **Go back to v…**: reinstalls the previous version if the new one gives you trouble. That
  version isn't offered again automatically afterwards.

If a server needs a launcher newer than yours, the launcher says so and offers **Update now**. You
can always download the latest installer from the [download page](https://nodemp.com/download) and
run it over your current version.

## The client mod

The client mod (`NodeMP.zip`) does everything inside the game: other players' cars, the chat, the
name tags and the multiplayer menus. The launcher puts it into the game's user folder:

```
%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\mods\multiplayer\NodeMP.zip
```

You never copy it by hand. The launcher checks the mod when it starts and before every join,
downloads a new version when there is one and turns it on in the game's mod manager.

:::caution[Close the game first]
Don't start BeamNG.drive while the mod is downloading: the running game locks the file.
:::

To check the mod yourself, open **Settings → Launcher → Client mod** and click **Check now**.

:::note[If the update didn't download]
When the download service can't be reached, the launcher joins with the copy you already have and
shows a warning. Whether a server accepts an older mod is up to the server.
:::

## If the launcher can't find the game

Open **Settings → Game**. The line under the heading shows the game version the launcher found.
If it found nothing:

- click **Browse** and pick the folder that contains `Bin64\BeamNG.drive.x64.exe`, or
- start BeamNG.drive once through Steam, close it, and click **Find it**.

Joining needs the game, so sort this out before you try a server.

## Next

- [Your account](/players/sign-in/): sign in, or play as Test Drive.
- [Find and join a server](/players/join/).
