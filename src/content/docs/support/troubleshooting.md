---
title: "Troubleshooting"
description: "Find your problem by what you see, and go straight to the page that says what to do."
---

## How the launcher reports a problem

A problem shows as a notification at the bottom of the launcher window:

- the **title** says what failed — *Could not join*, *The server refused the join*, *Session ended*…;
- the line under it is the reason, word for word from the server or the launcher's helper — search
  these pages for it;
- when the launcher knows the fix, it adds advice and a button: *Update now*, *Copy*, *Open logs*.

Failed joins, kicks and client mod updates stay in the **notification centre** — the bell in the
rail; errors are kept across restarts. **Details** shows the original text: copy it into a report.

## What do you see?

| What you see | Where to look |
|---|---|
| Windows warns about the installer, or the launcher does not start | [Install the launcher](/players/install/#download-and-install) |
| Signing in does not work | [Account and sign-in](/players/sign-in/#if-something-goes-wrong), then [Launcher problems](/support/launcher/#signing-in) |
| The server list is empty, or *Connection lost* | [Launcher problems → The server list is empty](/support/launcher/#the-server-list-is-empty) |
| **Could not join**, about the client mod | [Can't join → Client mod](/support/joining/#client-mod) |
| The game does not start | [Can't join → Starting the game](/support/joining/#starting-the-game) |
| **Could not connect** | [Can't join → Connecting](/support/joining/#connecting) |
| **The server refused the join** | [Can't join → The server refused](/support/joining/#the-server-refused) |
| *Your game files do not match this server's reference* | [Strict servers](/support/strict-servers/) |
| **Session ended** in the middle of a game | [Can't join → The session ended in the game](/support/joining/#the-session-ended-in-the-game) |
| **The launcher's traffic helper stopped** | [Error codes → Helper exit codes](/support/error-codes/#helper-exit-codes) |
| The launcher will not update | [Launcher problems → Launcher updates](/support/launcher/#launcher-updates) |
| You need to report a bug | [Logs and reports](/support/logs/) |

Every message, one line each, is also indexed on [Error codes](/support/error-codes/).

## The launcher and its helper

The launcher is two processes. The **window** is what you see. The **helper** starts BeamNG.drive
and carries your connection while you play — the same program, started again without a window. When
a message says *helper*, it means that background part; its log is `launcher.log`
([Logs and reports](/support/logs/)).
