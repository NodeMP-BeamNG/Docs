---
title: Join a server
description: Find a server in the launcher, see what it will ask you to download, join by address, and what happens while the game loads.
---

You pick servers in the launcher, not in the game's own menu. First [install the launcher](/players/install/)
and [sign in or choose Test Drive](/players/sign-in/).

## Find a server

The launcher opens on **Home**. If you've played before, it offers to take you back to your last
server, and **All servers** opens the full list. The list itself is under **Servers**. It shows only
servers that are running right now.

The tabs above the list are **Public**, **Favorites** (the servers you starred) and **Recent** (where
you played lately).

Each row shows the server's name and map, its country, how many players are on out of how many
slots, and its mode. Click a column heading to sort by it, click again to reverse.

To narrow the list down:

- **Search** (press `/`) looks at names, tags, maps, countries and descriptions.
- **Filters** hide full or empty servers and servers that need an account (**Free slots**,
  **Players online**, **No account needed**). You can also limit the **Download size**, ask for
  servers with no mods or with a particular mod, and pick maps and countries.

## Look at a server

Click a row and the server's card opens on the right:

- a picture of the map, the name and the description;
- the host's links: Discord, rules, website, donations, voice chat. A link opens in your browser; a
  Mumble or TeamSpeak address is copied instead, to paste into that app;
- tags, how many players are on, whether you need an account, the mode and the location;
- who's playing right now;
- **It will send you**: the server's mods you don't have yet, with their total size. **Stock
  content** means the server sends nothing extra.

The same list is on the website: [nodemp.com/servers](https://nodemp.com/servers). Its **Connect**
button opens the launcher straight on that server.

## Join by address

If the host gave you an address, click **Direct Connect** above the list and enter `address:port`,
such as `203.0.113.10:30814` or `example.com:30814`. An IPv6 address goes in square brackets:
`[2001:db8::1]:30814`.

If the server is listed, the launcher finds it and joins as usual. If it isn't, the launcher says so
and connects anyway.

The first time you connect to a server that isn't listed, the launcher remembers its certificate.
If the certificate is different next time, the launcher refuses to connect: somebody could be
pretending to be that server. Ask the host whether they reinstalled it.

## Join

Select a server, press and hold **Hold to play** at the bottom of its card, then let go. The hold is
there so you don't join by accident. You can turn it off under **Settings → Launcher → Hold to
play**, and then one click joins. Holding Enter, Space or a gamepad's A button works too.

While you wait, the button shows what's happening, and **Cancel** stops it. In order:

1. If a launcher update was found, the launcher updates, restarts and carries on.
2. The launcher checks the client mod and downloads a new version if there is one.
3. The launcher connects to the server, which lets you in or says why not.
4. The launcher checks your game files. How closely is up to the server, see
   [below](#what-the-server-checks).
5. The server's mods you don't have are downloaded.
6. BeamNG.drive starts. This is the longest step.
7. The server's map loads and you appear in the world.

### When the server is full

A full server may let you wait in its queue, if you are signed in. The button then reads
**In queue: 3 of 7**, next to the download progress: while you wait, the launcher checks your game
files and downloads the server's mods, so the game starts as soon as your turn comes. Places go in
queue order, to the first player whose mods are ready.

If the host paused the queue, his note shows under your place. **Cancel** leaves the queue; joining
again puts you at the end. With Test Drive, or on a server without a queue, a full server says
*Server full!*. More on [The join queue](/hosting/join-queue/#what-the-player-sees).

If something goes wrong, the launcher tells you what and why, and the notification stays under the
bell icon. Common cases are on [When something breaks](/players/troubleshooting/).

## What the server checks

Before letting you in, every server asks the launcher to check your game files. The check runs on
your computer; the server only hears the result.

- **A normal server** compares the game's files with the list that comes with the game. It doesn't
  look at your user folder or your mods. If it refuses you, verify the game files in Steam.
- **A strict server** compares the whole game folder, the contents of its archives and your user
  folder with a clean install the host prepared. Extra files in your user folder, other programs in
  the game folder or a different game version get in the way. What to do about it is on
  [When something breaks](/players/troubleshooting/#a-strict-server-refuses-you).

**What about my own mods?** Zip mods in your `mods\` folder never fail a check. During a session the
game turns them off, unless you turned on *Use my local mods in multiplayer* and the server allows
it.
