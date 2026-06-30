---
title: Join a server
description: Open the Multiplayer screen in BeamNG, sign in or play as guest, browse the server list, and connect — including the mod download and sync step.
---

With the [launcher installed](/players/install/) and running, joining a server happens entirely
inside BeamNG.drive.

## 1. Open Multiplayer

From the BeamNG main menu, choose **NodeMP Multiplayer**. The top of the screen shows whether
the launcher is connected — if it says the launcher is offline, start the launcher and wait a
moment.

## 2. The authorization gate

Before you can browse servers, NodeMP asks you to authorize. This is the BeamMP-style gate:

- **Log in** — enter your NodeMP username (or email) and password.
- **Create account** — opens the registration page to make a new account.
- **Play as guest** — continue without an account.

Once you're signed in (or have chosen guest), the launcher caches your session and signs you in
automatically next time. Note that individual servers may refuse guests, so a registered account
is the most reliable way to play.

## 3. Browse the server list

The **Servers** tab lists every public server the backend currently knows about. For each one
you'll see its name, map, player count, and ping. You can:

- press **Refresh** to re-fetch the list,
- type in the filter box to narrow it down, and
- star a server to keep it under the **Favorites** tab.

Select a server and press **Connect**, or simply **double-click** a row.

### Direct connect

If a server isn't on the public list — for example a local server, or one whose port isn't
forwarded — use the **Direct Connect** tab and enter the `host` and `port` (you can also paste
`host:port` straight into the host field).

## 4. Connecting, mod download, and sync

When you connect, an overlay walks you through the steps:

1. **Connecting** to the server.
2. **Downloading mods** — if the server uses custom resources, the launcher downloads them
   (you'll see `Downloading Resource x/y` progress).
3. **Installing mods** — the downloaded resources are loaded into the game.
4. **Loading world** — BeamNG loads the map and you spawn in.

If a server requires custom mods, you may be shown a prompt listing them; choose **Accept and
download** to continue or **Decline** to abort. Behind the scenes the launcher fetches a
single-use *join ticket* from the backend and hands it to the server, which verifies it before
letting you in — you don't have to do anything for this step.

## 5. You're in

Once the world finishes loading you're sharing the session with everyone else on the server.
From here you can open the [in-game chat and player list](/players/settings/) and tweak your
[settings](/players/settings/).

If a connection fails or drops, the overlay shows the reason and the launcher logs an
`[NMP-Exxxx]` code. See [Troubleshooting](/players/troubleshooting/) and the
[launcher error codes](/reference/error-codes/) to decode it.
