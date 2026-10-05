---
title: Join a server
description: Pick a server in the launcher's list, by address or on the website, hold Play — and the launcher takes you all the way to the game window.
---

Servers are joined from the launcher, not from BeamNG.drive's menu. This page is about finding a
server, what you can learn about it before joining, and what happens when you hold *Hold to play*. The
launcher should be [installed](/players/install/), and you [signed in or in Test Drive](/players/sign-in/).

## Find a server

The launcher opens on **Home**: if you have played before, it offers to rejoin your last server;
otherwise **Browse servers**. The full list is under **Servers** (the ▶ icon in the rail). It holds
only servers that are online and listed.

**Tabs:** **Public**, **Favorites** (starred servers) and **Recent** (the last 30 servers you
joined).

**A row:** the name with the map under it; the country with its flag, the players as
`online / slots` and the mode. Click a column heading to sort, again to flip. The star on the left
adds the server to Favorites.

**Search** (or the `/` key) matches name, tags, map, country and description.

**Filters:**

| Filter | What it does |
|---|---|
| Show only: *Free slots*, *Players online*, *No account needed* | Hides full, empty and guest-refusing servers. |
| Download size | How much the server may send: from *Stock only* to *Any size*. |
| Mods | *Any*, *No mods*, *With mods*, or a server that sends a mod with a given name. |
| Map, Country | One or several; *My country* is a quick pick. |

**Refresh** reloads the list.

:::note[Where a server's country comes from]
The country and city come from the DB-IP database, by the server's address. Its link is in the
tooltip of the ⓘ next to the *Country* column heading.
:::

## Look at a server

Click a row and the server's card opens on the right:

- the map's picture with its name;
- the host's links: *Discord*, *Rules*, *Website*, *Donate*, *Voice chat* (a voice chat address is
  copied rather than opened — paste it into the voice chat's app);
- the name, tags and the host's description;
- **Players**, **Access** (*Test Drive allowed* or *Account required*), **Content**, **Mode**,
  **Location**;
- **On the server now** — who is playing;
- **It will send you** — the mod files the server sends before you join.

**Content** and *It will send you* are about the server's own mods: the launcher downloads them
before the game starts, and they are kept apart from your own mods. *Stock content* means the
server sends nothing extra.

The same list is at [nodemp.com/servers](https://nodemp.com/servers). Its **Connect** button opens
the launcher right on that server — it needs a recent launcher version.

## Join by address

If a host gave you an address, press **Direct Connect** above the list and enter it: `host:port` or
`[IPv6]:port`, for example `203.0.113.10:30814`.

- If the server is in the list, the join goes as usual: *Found · starting session…*.
- If it is not (a private server, or one without a server key), the launcher joins anyway:
  *Not on the public list · connecting anyway…*.

On the first visit the launcher remembers such a server's certificate. If it is different next
time, the launcher refuses to connect — a protection against impersonation. Ask the host whether
they changed the server.

:::caution[A server without a key]
A server without a server key does not verify names: it takes the name the launcher sends, and
another player could join under yours.
:::

## Join

Pick a server and **press and hold the *Hold to play* button** at the bottom of its card for about
half a second, then let go. Holding guards against joining by accident; turn it off in
**Settings → Launcher → Hold to play** to join with one click. From the keyboard, hold Enter or
Space; on a gamepad, the A button.

While the join runs, the button is replaced by the current step and **Cancel**:

1. **Launcher update** — if automatic checks are on. If a new version is ready, the launcher
   restarts into it and carries on joining this server by itself.
2. **Client mod** — a new release is downloaded if there is one.
3. **Starting BeamNG.drive** — in the graphics mode from Settings. The launcher gets the one-time
   join ticket from NodeMP by itself: for your account, or a guest name in Test Drive.
4. **Checking game files** — on strict servers only: the launcher downloads the server's reference
   and compares your install with it (see [below](#what-the-server-checks-on-your-pc)).
5. As soon as the game window is on screen, the launcher steps aside and brings the game to the
   front.

The game's loading screen then shows the server's mods downloading — and you are in.

If the join fails, the launcher comes back with a notification saying why. What each message
means and what to do is in [Can't join a server](/support/joining/). Every notification is kept in
the notification centre — the bell in the rail.

## What the server checks on your PC

Before letting you in, every server checks your BeamNG install. The check runs in the launcher on
your PC; only the result goes to the server. How strict it is, is the host's choice:

| Level | What is compared | When it refuses you |
|---|---|---|
| Normal (the default) | The game's files against the game's own file list: sizes, and on stricter levels the contents of the scripts or of every file. Your user folder and your mods are not looked at. | A game file edited, replaced or deleted. Verifying the game files in Steam fixes it. |
| Strict (`strict`) | The whole game folder, the contents of the game's archives **and your BeamNG user folder** — against the host's reference of a clean install. | Anything a clean install does not have: unpacked mods in the user folder's `vehicles\`, `levels\`, `lua\`, files added to the game folder, another game version. |

**What about my mods?** Packed mods (the zips in your user folder's `mods\`) do not break the
check: they are switched off for the session unless you turn on *Use my local mods in multiplayer*
and the server allows it. A strict server refuses files **outside** `mods\`: leftovers of unpacked
mods, or mods installed straight into the game folder. How to find and move them is on
[Strict servers](/support/strict-servers/).

## In the game

Top left is the **session panel**: the server's name, your ping and the player count. Click the
count to unfold the roster; click a player to spectate them or move the camera to them.

- `T` opens the chat, Enter sends, Esc closes.
- `Tab` shows or hides the roster.
- Everything else is in **Options → NodeMP**, see [Settings and controls](/players/settings/).

## Leave

Hold **Leave** in the session panel — the game returns to its main menu. The launcher window comes
back when you close the game. If the server ended the session, the launcher comes back at once —
with a *Session ended* notification and the reason.

You cannot switch servers from inside the game: close BeamNG.drive, then pick the next server in
the launcher.
