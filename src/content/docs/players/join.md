---
title: Join a server
description: Pick a server in the launcher's list or by address, hold Play, and follow the join from "Checking client mod" to the game window.
---

Servers are joined from the launcher, not from inside BeamNG.drive; the game's *NodeMP
Multiplayer* menu entry only says so. This page assumes the launcher is
[installed](/players/install/) and you are signed in or in Test Drive.

## The server list

The launcher opens on **Home**: after your first session it offers **Hold to play** for the
server you last joined; otherwise **Browse servers**. Open **Servers** in the rail. The list is built from the beacons servers send to the directory,
so only servers that are online and listed appear.

- Tabs: **Public**, **Favorites** (starred servers) and **Recent** (the last 30 addresses you
  joined, newest first).
- A row shows the name with the map and region underneath, the players as `players / max` and
  the mode. Click a heading (*Server*, *Players*, *Mode*) to sort, again to flip. The star adds
  the server to Favorites.
- **Search** (or `/`) matches name, tags, map, region and description. **Filters** has a
  *Required mods* slider from *Stock* to *Any* (the readout says `Stock only`, `Up to 512 MB`, …
  `Any size`) and the chips *Free slots*, *Players online*, *No account needed*.
- **Refresh** reloads the list: `12 servers online` or `Connected · nobody is hosting right now`.

Select a row and the panel beside the list describes the server: map preview and name, tags,
the host's description, then *Players*, *Access* (`Test Drive allowed` or `Account required`),
*Content* (`Stock content` or `3 files · 120 MB`), *Mode*, *Region*, *On the server now*
(player names) and *It will send you* (content files).

The same list is at [nodemp.com/servers](https://nodemp.com/servers), read-only: pick a server
there, then join it from the launcher.

## Direct Connect

**Direct Connect** in the toolbar takes `host:port`, or `[address]:port` for IPv6. The launcher
refreshes the list first; a listed server is joined with its fingerprint (`Found · starting
session…`). An unlisted address is joined anyway (`Not on the public list · connecting
anyway…`): it appears in the list under its address, and the server's TLS certificate is
trusted on first use and pinned. This is how you join a private server, or one without a
server key.

## Joining

Press and hold **Hold to play** for about a second. While the join runs, the button is replaced by the
current step and **Cancel**; Escape cancels too, with the toast `Connection cancelled`. The
steps, in order:

1. **Checking client mod** — the installed `NodeMP.zip` is compared with the published release.
   When it differs you see `Downloading client mod 42%`, `Verifying client mod`, `Client mod
   ready`. A failed check with a usable copy on disk continues with the toast `Client mod could
   not be updated · joining with the installed copy`.
2. The launcher asks the directory for a one-shot join ticket: your account when signed in, a
   fresh guest name in Test Drive.
3. **Starting BeamNG.drive** — the helper is started and starts the game with the graphics mode
   from Settings.
4. The moment BeamNG's window is on screen the launcher hides itself and puts the game in front
   (or closes, if *Close the launcher once the game starts* is on). It waits up to four minutes
   for the window, then steps aside anyway.

What happens on the wire from here is described in
[What is NodeMP](/introduction/what-is-nodemp/#how-a-session-starts); the game's loading screen
shows the helper's progress lines (`Downloading Resource 2/5: …`) until you spawn.

A join that fails brings the launcher back with the reason as a toast: `Could not connect · …`,
`Disconnected · …` or `The launcher stopped · …`. Every message is explained in
[Troubleshooting](/players/troubleshooting/).

## In the game

The **session panel** shows the server's name, your ping and the player count; click the count
to unfold the roster, and a player for *spectate* or *teleport camera*. `T` opens the chat,
`Tab` toggles the roster. Everything else is in the game's **Options → NodeMP** page; see
[Settings and UI](/players/settings/).

## Leaving

Hold **Leave** in the session panel; the game returns to its main menu. The launcher window
comes back when BeamNG.drive closes, or at once when the server ends the session, with the
toast `Session ended` (or `Session ended · ` followed by the reason the server gave) and the server list open. Servers cannot
be switched from inside the game: close BeamNG.drive, then pick the next one in the launcher.
