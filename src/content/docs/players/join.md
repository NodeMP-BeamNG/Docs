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

*Required mods*, *Content* and *It will send you* are three views of one thing: the **content**
a server sends you before the game starts - its own mod zips, downloaded by the launcher for
that session. `Stock content` and `Stock only` mean the server sends nothing extra; they say
nothing about your own install or your own mods. The panel does not show how strictly a server
checks your game files ([below](#what-the-server-checks-on-your-pc)); hosts of strict servers
usually say so in the description or a `strict` tag, and the refusal names it either way.

The same list is at [nodemp.com/servers](https://nodemp.com/servers), read-only: pick a server
there, then join it from the launcher.

## Direct Connect

**Direct Connect** in the toolbar takes `host:port`, or `[address]:port` for IPv6 - the address a
host gave you, like `203.0.113.10:30814`. The launcher refreshes the list first; a listed server
is joined the normal way (`Found · starting session…`). An address that is not in the list is
joined anyway (`Not on the public list · connecting anyway…`): it appears in the list under its
address, and the launcher remembers that server's certificate from this first visit, so that a
later join to the same address refuses a server whose certificate changed
(`Could not connect · server certificate fingerprint mismatch` - the host confirms the change and
you clear the entry, see [Troubleshooting](/players/troubleshooting/#joining-fails)). This is how
you join a private server, or one that has no server key. On a server without a key nobody's
name is verified: it takes the name the launcher sends, and another player there could use yours.

## What the server checks on your PC

Every server checks your BeamNG install before it lets you in, and every server decides how
much; the check runs in the launcher's helper, on your PC, and only its result is sent. The
level is the host's `VerifyGame` setting ([Configuration](/hosting/configuration/#general)):

| Level | What is compared | What refuses you |
|---|---|---|
| `size` (the default), `scripts`, `full` | The game's own files against the game's own file list (`integrity.json`): sizes, or also hashes of the scripts, or of everything. Your user folder and your mods are not looked at. | A game file that was edited, replaced or deleted: `Your BeamNG install does not match the game's own file list (3 files differ). …`. Verifying the game files in Steam fixes it. |
| `strict` | The whole game folder, every game archive's table of contents **and your BeamNG user folder** against the host's reference of a clean install. Two extra join steps appear: `Downloading the server's integrity manifest` and `Checking game files`. | Anything a clean install does not have: loose files in the user folder's `vehicles\`, `levels\`, `lua\`, `ui\`, `art\` or `scripts\` (leftovers of unpacked mods, your own levels), files added to the game folder, a game version other than the server's. Shown as `Could not join · Your game files do not match this server's reference (N problems) · <path>`. |
| `off` | The `size` check still runs, but the server only logs a mismatch. | Nothing. |

**What about my mods?** Your packed mods - the zips in `mods\` of your user folder - stay where
they are and are not what a check refuses: no level looks into `mods\`. During a session they
are switched off unless you turn on *Use my local mods in multiplayer* (Options → NodeMP →
Mods) **and** the server allows it; a server that runs *strict sessions* (in-game rules a server
plugin switches on, usual on strict servers) keeps them off whatever you set. What a
strict server does refuse is what a mod left *outside* `mods\`: an unpacked mod's files under
`vehicles\`, `levels\` or `lua\` of the user folder, or a mod installed into the game folder
itself. Move those out (or delete them) before you join a strict server; a packed zip in `mods\`
needs no moving. The diagnostic that lists every such file, and the reasons it prints, are on
[Troubleshooting → Strict servers](/players/troubleshooting/#strict-servers); what the host set
up is on [Strict verification](/hosting/strict-verification/).

## Joining

Press and hold **Hold to play** for about a second. While the join runs, the button is replaced by the
current step and **Cancel**; Escape cancels too, with the toast `Connection cancelled`. The
steps, in order:

1. **Checking client mod** — the installed `NodeMP.zip` is compared with the published release.
   When it differs you see `Downloading client mod 42%`, `Verifying client mod`, `Client mod
   ready`. A failed check with a usable copy on disk continues with the toast `Client mod could
   not be updated · joining with the installed copy`; `Client mod check failed` is the step's
   own line for that moment.
2. The launcher asks the directory for a one-shot join ticket: your account when signed in, a
   fresh guest name in Test Drive.
3. **Starting BeamNG.drive**, then **Loading BeamNG.drive** — the helper is started and starts
   the game with the graphics mode from Settings.
4. On a strict server: **Downloading the server's integrity manifest** (once per reference; the
   file is cached) and **Checking game files** - normal steps, not a problem; a problem arrives
   as a toast.
5. The moment BeamNG's window is on screen the launcher hides itself and puts the game in front
   (or closes, if *Close the launcher once the game starts* is on). It waits up to four minutes
   for the window, then steps aside anyway.

What happens on the wire from here is described in
[What is NodeMP](/introduction/what-is-nodemp/#how-a-session-starts); the game's loading screen
shows the helper's progress lines (`Downloading Resource 2/5: …` - a *Resource* there is one of
the server's content files) until you spawn.

A join that fails brings the launcher back with the reason as a toast: `Could not join · …`,
`Could not connect · …`, `Disconnected · …` or `The launcher stopped · …`. Every message is
explained in [Troubleshooting](/players/troubleshooting/). One word in them needs a translation:
the **helper** is the part of the launcher that starts the game and holds the connection while
you play - the same `nodemp-launcher.exe`, run a second time without a window. The toasts call it
"the launcher": `The launcher stopped · …` and `Could not start the launcher · …` mean that this
background process stopped or would not start, not the window in front of you, which stays open
and shows you the toast.

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
