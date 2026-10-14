---
title: Find and join a server
description: Find a server in the launcher or on the website, look at what it will send you, join by address, and get into the game.
---

You pick servers in the launcher, not in the game's own menu. Make sure the launcher is
[installed](/players/install/) and that you have [signed in or chosen Test Drive](/players/sign-in/).

## Find a server

The launcher opens on **Home**. If you've played before, it offers to take you back to your last
server; **All servers** opens the full list. The list itself lives under **Servers**, the ▶ icon on
the left, and shows only servers that are online right now.

There are three tabs: **Public** (every listed server), **Favorites** (the ones you starred) and
**Recent** (where you played lately).

Each row shows the server's name and map, its country, how many players are on out of how many
slots, and its mode. Click a column heading to sort by it, click again to reverse.

To narrow the list down:

- **Search** (press `/`) looks at names, tags, maps, countries and descriptions.
- **Filters** hide full or empty servers and servers that need an account (*Free slots*, *Players
  online*, *No account needed*). You can also limit the **Download size**, ask for servers with no
  mods or with a particular mod, and pick maps and countries (*My country* is one click).

**Refresh** reloads the list. The country is worked out from the server's IP address; the ⓘ next to
the *Country* heading says where that information comes from.

## Look at a server

Click a row and its card opens on the right:

- a picture of the map, the name and the description;
- the host's links: Discord, rules, website, donations, voice chat (a voice chat address is copied
  to your clipboard, because it opens in its own app);
- tags, how many players are on, whether you need an account (*Test Drive allowed* or *Account
  required*), the mode and the location;
- who is on the server right now;
- **It will send you**: the mod files you'll download before you join, with their total size.
  *Stock content* means the server sends nothing extra.

The same list is on the web at [nodemp.com/servers](https://nodemp.com/servers). Its **Connect**
button opens the launcher straight on that server.

## Join by address

If the host gave you an address, click **Direct Connect** above the list and type `host:port` (or
`[IPv6]:port`), for example `203.0.113.10:30814` or `example.com:30814`.

- If the server is listed, the launcher finds it and joins as usual.
- If it isn't listed, the launcher says so and connects anyway.

The first time you connect to an unlisted server, the launcher remembers its certificate. If that
certificate is different on a later visit, the launcher refuses to connect, because somebody could
be pretending to be that server. Ask the host whether they reinstalled it.

:::caution[Servers without a key]
A server without a key from nodemp.com doesn't check names with NodeMP: it takes the name your
launcher sends.
:::

## Join

Select a server and **press and hold Hold to play** at the bottom of its card for a moment
(0.4 s), then let go. The hold is there so you don't join by accident; you can turn it off in
**Settings → Launcher → Hold to play**, and then one click joins. Holding Enter, Space or a
gamepad's A button works too.

While you wait, the button shows what is happening, and **Cancel** stops it:

1. **Launcher update**: if one was found, the launcher updates, restarts and carries on.
2. **Client mod**: checked, and downloaded if there is a new version.
3. **Contacting the server**: the launcher connects and the server lets you in or says why not.
4. **Checking your game files**: how much depends on the server. A strict server first sends a
   description of a clean game install, once; see [what the server checks](#what-the-server-checks-on-your-pc).
5. **Downloading** the server's mods you don't have yet, file by file, then putting them in place.
6. **Starting BeamNG.drive**, and loading it. This is the longest part.
7. **Entering the world**: the server's map loads and you appear in it.

If something goes wrong, the launcher tells you what and why, and the notification stays in the
bell icon on the left. [Can't join a server](/support/joining/) goes through the usual messages.

## What the server checks on your PC

Before letting you in, every server asks the launcher to check your game files. The check runs on
your PC; the server only hears the result.

| Level | What is checked | When you're refused |
|---|---|---|
| Normal (most servers) | The game's own files, against the list the game ships with. Your user folder and your own mods aren't looked at. | A game file was edited, replaced or deleted. Steam's *Verify integrity of game files* usually fixes it. |
| Strict | The whole game folder, the inside of the game's archives, **and your BeamNG user folder**, against a clean install the host prepared. | Something extra or changed: loose files in `vehicles\`, `levels\` or `lua\` of your user folder, extra files in the game folder, or an old game version. |

**What about my own mods?** Zip files in your user folder's `mods\` folder never fail a check. During
a session the game turns them off, unless you turned on *Use my local mods in multiplayer* and the
server allows it. Strict servers only mind loose files outside `mods\`.
[Strict servers](/support/strict-servers/) explains how to clean up.

## In the game

The **session panel** sits in a corner: the server's name, your ping and how many players are on.
Click the player count to see who's there; click a name to **Spectate** them or **Teleport camera**
to them.

- `T` opens the chat (Enter sends, Esc closes).
- `Tab` shows or hides the player list.
- Everything else is in the game's **Options → NodeMP**; see [Settings and controls](/players/settings/).

If your connection drops, you see *Connection lost, reconnecting…* with a countdown, and the
launcher tries to get you back on its own. More in [VPN and bad connections](/players/vpn/).

## Leave

Hold **Leave** in the session panel for a moment. The launcher comes back when you leave the
server. If the server ended the session itself, the launcher comes forward and says why.

You can't hop from one server to another inside the game: close BeamNG.drive and pick the next
server in the launcher.
