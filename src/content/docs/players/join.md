---
title: Join a server
description: Finding a server in the launcher, what it will send you, joining by address, and what happens between the click and the game.
---

You pick a server in the launcher, not in the game: the **NodeMP Multiplayer** button in the main menu only says so. First [install the launcher](/players/install/) and [sign in or choose Test Drive](/players/sign-in/).

## Find a server

The launcher opens on **Home**. If you've played before, you can rejoin your last server there or open **All servers**; if not, click **Browse servers**. The full list is on the **Servers** tab of the left rail and shows only servers running right now.

The list has the tabs **Public**, **Favorites** (servers you starred) and **Recent** (where you joined or tried to join).

A row shows the server's name (with a badge if it's official), the map, a **Test Drive** mark if it lets guests in, the country, players and slots (and **queue N** if there's a queue) and the mode. Click a column heading to sort by it; click again to reverse the order. A **can't connect** mark means the server isn't answering right now.

To narrow the list:

- The search box (`/`) matches names, tags, maps, cities and countries, descriptions and the names of the files a server sends.
- **Filters** opens the switches **Free slots**, **Players online** and **No account needed**, a **Download size** limit in megabytes (the **Stock** button keeps only servers without mods), a **Mods** choice (*No mods* or *With mods*) with the **Sends a mod named…** field, and **Map** and **Country**.

## Look at a server

Click a row to open the server's card on the right:

- a picture of the map and, under it, the host's links with icons and addresses (Discord, rules, website, donations, voice chat). Links open in your browser; a voice chat address is copied instead, to paste into Mumble or TeamSpeak;
- the name, description and tags;
- **Players**: how many are on the server; click the number to see who;
- **Access**: *Account required* or *Test Drive allowed*;
- **Content**: how many files the server sends and their size; click it to open the list (**It will send you**). If the server sends nothing, the row says *None*;
- **Mode** and **Location**.

The same list is on the website, [nodemp.com/servers](https://nodemp.com/servers). **Connect** on a server's page opens the launcher and starts joining that server at once.

## Join by address

If the host gave you an address, click **Direct Connect** above the list, enter `address:port` and click **Connect**. For example, `203.0.113.10:30814` or `example.com:30814`; put an IPv6 address in square brackets: `[2001:db8::1]:30814`.

If the server is on the list, the launcher joins it as usual. If not, it says *Not on the public list · connecting anyway…* and connects.

The launcher checks the server's certificate: for a listed server, against the one the server reported to NodeMP; for an unlisted one, against the certificate it remembered on the first connection. If the certificate has changed, the launcher doesn't connect, because someone may be posing as that server. Ask the host whether they reinstalled it. What to do next: [Error messages](/reference/error-codes/).

## Join

Select a server, press and hold **Hold to play** at the bottom of its card until it reads *Release to play*, then let go. The 0.4-second hold prevents joining by accident. Holding Enter, Space or a gamepad's A button works too. With **Settings → Launcher → Hold to play** off, the button reads **Play** and one click joins.

While you join, the button shows the current step and **Cancel** (or Esc), which stops the join:

1. `Checking for a launcher update`: with automatic update checks on, the launcher installs its own update if there is one ([Launcher updates](/players/install/#launcher-updates)).
2. `Checking client mod`: the launcher checks the client mod and downloads it if needed (`Downloading client mod`, `Verifying client mod`).
3. `Contacting the server`: the launcher connects, and the server lets you in or says why not.
4. `Checking your game files`: the server decides how closely ([below](#what-the-server-checks)). A strict server first sends its reference manifest (`Fetching the server's reference manifest`), which the launcher downloads once and keeps.
5. `Downloading …` and `Installing …`: the launcher downloads the server's mods you don't have yet and installs them.
6. `Starting BeamNG.drive`, then `Loading BeamNG.drive`: the game starts, the longest step. If the Steam copy of the game is already running, the launcher uses it instead of starting a second one.
7. `Entering the world`: the map loads and you appear on the server.

When the game starts, the launcher hides in an icon in the Windows notification area; click the icon to bring it back. It also comes back by itself when you close BeamNG.drive or when the session ends against your will: a kick, or a connection that didn't recover. With **Close the launcher once the game starts** on, the launcher closes instead.

If the join fails, a notification says why ([What the launcher says](/players/troubleshooting/#what-the-launcher-says)).

### When the server is full

If a full server has a queue, a signed-in player waits in it. The join line shows your place (*In queue: 3 of 7*) and what the launcher does meanwhile: it checks your game files and downloads mods, so the game starts as soon as your turn comes. If the host paused the queue, their note shows under your place. **Cancel** leaves the queue. A guest, or anyone on a server without a queue, gets `Server full!`. How the queue works: [The join queue](/hosting/join-queue/).

## What the server checks

Before you join, the launcher checks the game files on your computer and sends the server only the result. The server decides how strict the check is:

- A normal server has the launcher compare the game files with the game's own file list, leaving your user folder and mods alone. If it refuses you, verify the game files in Steam.
- A strict server has the launcher compare your installation and user folder with a clean installation the host prepared. If it refuses you, see [A strict server refuses you](/players/troubleshooting/#a-strict-server-refuses-you). How the check works is on the [page for hosts](/hosting/strict-verification/).

Your zip mods in `mods\` don't break the check, but the client mod turns them off for the session. To keep them on, turn on **Use my local mods in multiplayer** on the NodeMP tab; the server must allow it too ([Settings](/players/settings/#the-nodemp-tab-in-the-game)).
