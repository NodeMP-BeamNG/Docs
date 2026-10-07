---
title: Install the launcher
description: Download and install the NodeMP launcher for Windows — it sets up the client mod, updates automatically, and launches the game.
---

The **launcher** is where your multiplayer journey begins: you sign in, pick a server, and launch BeamNG.drive. It also automatically downloads and updates the **client mod**, so you never have to move files around by hand.

In short: grab the installer from [nodemp.com/download](https://nodemp.com/download), run it, sign in via your browser or choose Test Drive — and you're ready to [join a server](/players/join/).

## What you need

- Windows 10 or 11 (64-bit).
- BeamNG.drive **0.39.4.0** — the client mod is built and tested specifically for this version.
- The game launched at least once. Running BeamNG once creates its user folder, where the launcher installs the multiplayer mod.

The launcher detects Steam installations automatically. If your game is installed elsewhere, you can point to it manually in settings (see [below](#if-the-launcher-did-not-find-the-game)).

## Download and install

1. Download `NodeMP-Setup-<version>.exe` from the [Download page](https://nodemp.com/download) or from [GitHub releases](https://github.com/NodeMP-BeamNG/releases).
2. Run the installer. It installs to your user profile (`%LOCALAPPDATA%\NodeMP`), so no administrator privileges are required.
3. Once installation finishes, the launcher opens automatically.

:::caution[Windows warning]
The installer is not yet digitally signed, so Windows SmartScreen may show an "Unknown publisher" prompt. Simply click **More info → Run anyway** to proceed.
:::

## First start

On your first launch, the launcher takes care of initial setup:

1. **Checking for updates** — a small window with the NodeMP logo checks for newer versions and pulls the server list.
2. **Sign-in** — choose between **Sign in with browser** and **Continue as Test Drive**. Learn more on the [Account and sign-in](/players/sign-in/) page. Signing in is remembered across restarts, while Test Drive can be picked anytime you launch.
3. **Main window** — everything is ready. While you explore the interface, the launcher verifies your client mod in the background.

If an issue occurs before the main window opens, you might see one of these prompts:

| Window | What happened | What to do |
|---|---|---|
| **Connection lost** | Could not fetch the server list. | Click **Try again**, or choose **Continue without the list** if you plan to connect by direct IP address. |
| **Account banned** | The account has an active ban (the window shows the reason and duration). | You cannot join servers with this account until the ban expires. |

## Launcher updates

The launcher updates itself. It checks for new releases on startup and before each join, downloads them in the background, and prompts you to apply them with **Restart and update**. Updates never interrupt an active game session — they only apply after you leave the server.

You can manage update preferences under **Settings → Launcher → Updates**:

- **Update channel** — choose between stable releases (*Release*) and earlier test builds (*Beta*).
- **Check for updates automatically** — toggle automatic update checks on or off.
- **Roll back to previous version** — quickly reinstall the previously cached version if you encounter unexpected issues.

You can also always download the latest installer directly from the [Download page](https://nodemp.com/download) and install it over your current build.

## The client mod

The client mod (`NodeMP.zip`) powers everything inside the game: vehicle synchronization, chat, player nametags, and in-game menus. The launcher installs it directly into your BeamNG user folder:

```
%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\mods\multiplayer\NodeMP.zip
```

You never need to copy files manually. The launcher verifies the mod whenever you start it or join a server, downloads the latest build, and makes sure it's enabled in the game's mod manager. Just ensure BeamNG.drive is closed while the mod updates so the file isn't locked by the game. To check your mod status manually, head to **Settings → Launcher → Client mod** and click **Check now**.

:::note[If an update fails]
If the download service is temporarily unreachable, the launcher will still attempt to join using your existing mod (if present) and display a warning. Whether an older mod version is accepted depends on server settings.
:::

<details>
<summary>For developers: unpacked mod copies</summary>

If you are developing the mod and keep source files unpacked under `mods/unpacked/nodemp`, the launcher leaves them untouched and runs the unpacked copy. Custom user folders are also recognized automatically.

</details>

## If the launcher did not find the game

Check **Settings → Game**. The status line under the header displays your detected game build (for example, `Version 0.39.4.0`). If the game is reported as missing:

- click **Browse** and select the folder containing `Bin64\BeamNG.drive.x64.exe`, or
- launch BeamNG once through Steam, close it, and click **Find it** in the launcher.

Without a detected game installation, joins cannot start, so make sure this is configured before connecting.

## Next

- [Account and sign-in](/players/sign-in/) — sign in or jump right into Test Drive.
- [Join a server](/players/join/) — browse servers, use filters, and hit the road.
