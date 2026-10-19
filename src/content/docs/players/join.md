---
title: Join a server
description: How to find a server in the launcher, what it will ask you to download, how to join by address, and what happens between the click and the game.
---

You pick a server in the launcher, not in the game: the **NodeMP Multiplayer** button in the main menu only reminds you of that. First [install the launcher](/players/install/) and [sign in or choose Test Drive](/players/sign-in/).

## Find a server

The launcher opens on **Home**. If you have played before, you can go straight back to your last server or open **All servers**; if you haven't, click **Browse servers**. The whole list is on the **Servers** tab of the left rail. It shows only servers that are running right now.

The list has the tabs **Public**, **Favorites** (servers you starred) and **Recent** (where you joined or tried to join).

A server's row shows its name (an official server has a badge next to it), the map, a **Test Drive** mark if the server lets guests in, the country, the number of players and slots (and **queue N** if there is a queue) and the mode. Click a column heading to sort the list, and click again to reverse the order. The **can't connect** mark means the server isn't answering right now.

To narrow the list down, use the search box and the filters:

- The search box (press `/`) looks at names, tags, maps, cities and countries, descriptions, and the names of the files a server sends.
- **Filters** opens the switches **Free slots**, **Players online** and **No account needed**, a **Download size** limit in megabytes (the **Stock** button keeps only servers without mods), a **Mods** choice (*No mods* or *With mods*) with the **Sends a mod named…** field, and **Map** and **Country**.

## Look at a server

Click a row and the server's card opens on the right:

- a picture of the map and, under it, the host's links, each with an icon and an address (Discord, rules, website, donations, voice chat). A link opens in your browser. A voice chat address is copied instead, so you can paste it into Mumble or TeamSpeak;
- the name, description and tags;
- **Players**: how many people are on the server. Click the number to see who they are;
- **Access**: *Account required* or *Test Drive allowed*;
- **Content**: how many files the server sends and how much they weigh. Click it to open the list (**It will send you**). If the server sends nothing, the row says *None*;
- **Mode** and **Location**.

The same list is on the website, [nodemp.com/servers](https://nodemp.com/servers). The **Connect** button on a server's page opens the launcher and starts joining that server at once.

## Join by address

If the host gave you an address, click **Direct Connect** above the list, enter `address:port` and click **Connect**. For example: `203.0.113.10:30814` or `example.com:30814`. Put an IPv6 address in square brackets: `[2001:db8::1]:30814`.

If the server is on the list, the launcher finds it and joins as usual. If it isn't, the launcher says *Not on the public list · connecting anyway…* and connects.

For a server on the list, the launcher compares its certificate with the one the server reported to NodeMP. For a server that isn't listed, the launcher remembers the certificate on the first connection and compares against it afterwards. If the certificate has changed, the launcher doesn't connect: someone may be pretending to be that server. Ask the host whether they reinstalled the server. What to do next: [Error messages](/reference/error-codes/).

## Join

Select a server, press and hold **Hold to play** at the bottom of its card until the label changes to *Release to play*, then let go. The hold (0.4 seconds) protects you from joining by accident. You can hold Enter, Space or the A button on a gamepad instead of using the mouse. If you turn off **Settings → Launcher → Hold to play**, the button is called **Play** and one click is enough.

While you join, the button is replaced by the current step and **Cancel** (or Esc), which stops the join. The launcher names the steps in English:

1. `Checking for a launcher update`: if automatic update checks are on, the launcher looks for its own update and installs it if there is one ([Launcher updates](/players/install/#launcher-updates)).
2. `Checking client mod`: the launcher checks the client mod and downloads it if needed (`Downloading client mod`, `Verifying client mod`).
3. `Contacting the server`: the launcher connects to the server, which lets you in or gives a reason for refusing.
4. `Checking your game files`: the launcher checks your game files. The server decides how closely ([below](#what-the-server-checks)). A strict server first sends its reference manifest (`Fetching the server's reference manifest`): the launcher downloads it once and keeps it.
5. `Downloading …` and `Installing …`: the launcher downloads and installs the server's mods you don't have yet. Mods you already have aren't downloaded again.
6. `Starting BeamNG.drive`, then `Loading BeamNG.drive`: the game starts. This is the longest step. If the Steam copy of the game is already running, the launcher attaches to it instead of starting a second one.
7. `Entering the world`: the map loads and you appear on the server.

When the game starts, the launcher window hides in an icon in the Windows notification area. Click the icon to bring the window back. It also comes back by itself when you close BeamNG.drive, or when the session ends against your will: you were kicked, or the connection didn't recover. If **Close the launcher once the game starts** is on, the launcher closes instead.

If the join fails, the reason is in a notification ([What the launcher says](/players/troubleshooting/#what-the-launcher-says)).

### When the server is full

If the server is full and has a queue, a signed-in player joins the queue. The join line shows your place (*In queue: 3 of 7*) and what the launcher does meanwhile: it checks your game files and downloads mods, so the game starts as soon as your turn comes. If the host paused the queue, the host's note shows under your place. **Cancel** takes you out of the queue. A guest, or a player on a server without a queue, gets `Server full!`. How the queue works: [The join queue](/hosting/join-queue/).

## What the server checks

Before you join, the launcher checks the game files on your computer and sends the server only the result. The server decides how strict the check is:

- A normal server asks the launcher to compare the game files with the game's own file list. The launcher doesn't look at your user folder or your mods. If the server refuses you, verify the game files in Steam.
- A strict server asks the launcher to compare your installation and user folder with a clean installation the host prepared. If it refuses you, see [A strict server refuses you](/players/troubleshooting/#a-strict-server-refuses-you). The [page for hosts](/hosting/strict-verification/) explains how the check works.

Your zip mods from `mods\` don't break the check, but the client mod turns them off for the session. To keep them on, turn on **Use my local mods in multiplayer** on the NodeMP tab. The server must allow it too ([Settings](/players/settings/#the-nodemp-tab-in-the-game)).
