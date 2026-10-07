---
title: "Troubleshooting"
description: "Quickly solve issues: find your problem by what you see on screen and jump straight to the fix."
---

## How the launcher reports a problem

When something goes wrong, the launcher notifies you right away at the bottom of the window:

- **Title** — summarizes what stage failed: for example, *Could not join*, *The server refused the join*, or *Session ended*.
- **The line below the title** — the exact reason directly from the server or background helper. This phrase is the best way to look up solutions across the docs.
- **Action button** — if the launcher knows how to fix the issue, it suggests a quick action: *Update now*, *Copy* a command, or *Open logs*.

Failed joins, kicks, and client mod updates are kept in the **notification centre** (the bell icon on the left rail). The error history remains even after restarting the launcher. Click **Details** to see the full raw technical message: copy it if you are asking for help on the forum or in the community.

## What do you see?

| What is happening | Where to look |
|---|---|
| Windows warns about the installer, or the launcher fails to open | [Install the launcher → Download and install](/players/install/#download-and-install) |
| Signing in does not work | [Account and sign-in](/players/sign-in/#if-something-goes-wrong), then [Launcher problems → Signing in](/support/launcher/#signing-in) |
| The server list is empty, or you see *Connection lost* | [Launcher problems → The server list is empty](/support/launcher/#the-server-list-is-empty) |
| **Could not join** — message mentions the client mod | [Can't join → Client mod](/support/joining/#client-mod) |
| BeamNG.drive does not start | [Can't join → Starting the game](/support/joining/#starting-the-game) |
| **Could not connect** | [Can't join → Connecting](/support/joining/#connecting) |
| **The server refused the join** | [Can't join → The server refused](/support/joining/#the-server-refused) |
| *Your game files do not match this server's reference* | [Strict servers](/support/strict-servers/) |
| **Session ended** in the middle of a drive | [Can't join → The session ended in the game](/support/joining/#the-session-ended-in-the-game) |
| **The launcher's traffic helper stopped** | [Error codes → Helper exit codes](/support/error-codes/#helper-exit-codes) |
| The launcher fails to download updates | [Launcher problems → Launcher updates](/support/launcher/#launcher-updates) |
| Need to gather diagnostic logs for a report | [Logs and reports](/support/logs/) |

All technical messages from the server and helper are also indexed in the [Error codes](/support/error-codes/) reference.

## The launcher and its helper

The launcher runs as two separate parts:

- **The main window** — the visual interface where you choose servers, configure settings, and sign in.
- **The background helper** — the exact same program running silently without a window. It launches BeamNG.drive, synchronizes server mods, and maintains the network connection while you play.

Whenever an error mentions the *helper* or *traffic helper*, it points to this background process. Its detailed log is saved to `launcher.log` (see [Logs and reports](/support/logs/)).
