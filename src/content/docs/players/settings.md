---
title: "Settings & UI"
description: The NodeMP options tab, in-game chat, the player list (collapse, spectate, apply config), and vehicle nametags.
---

NodeMP adds its own settings and a small set of in-game UI panels. This page covers where the
options live and how the in-game overlay works.

## The NodeMP options tab

All NodeMP settings live in one place: open BeamNG's **Options** and select the **NodeMP** tab
(it's added to the options sidebar, just after *Other*). Changes save as you make them. The
settings are grouped into sections:

| Section | What it controls |
|---|---|
| **Gameplay & sync** | Smooth (interpolate) other players' cars; the spawn/config queue interval (lower = faster remote spawns, but more hitching). |
| **Name tags** | Hide your own nametag, show distance on tags, hide tags behind objects, and the fade distance. |
| **Markers** | Show markers for cars that aren't spawned yet, and for deleted cars. |
| **Vehicle** | Show the owner's name on license plates, protect your configs (others can't clone/save them), and auto-apply other players' configs. |
| **Chat & UI** | Toggle the floating in-game chat / player overlay. |
| **Experimental & debug** | State-sync breadcrumb logging and other diagnostics — leave these off unless you're chasing a bug. |

There's also a **Tools** area to open the full Multiplayer screen and the diagnostics console
(see below).

## Chat

Turn on **In-game chat overlay** (in *Chat & UI*) to get a floating chat panel while you drive.
Type a message and press Enter to send it to everyone on the server; messages from other players
appear with their name and role color. The same chat is also available as a tab in the
diagnostics console.

## The player list

The in-game player list is a compact panel showing everyone on the server. Its header shows the
player count (and the server's max), and you can do a few things with it:

- **Collapse it** — click the header to fold the list down to just the count, and click again to
  expand it. Handy when you want it out of the way.
- **Spectate a player** — click a player's row to jump your camera to them.
- **Apply another player's vehicle config** — if *Auto-apply others' configs* is turned off, a
  player who has edited their vehicle is highlighted in the list with a refresh (⟳) button. Click
  it to pull in their latest vehicle configuration. (With auto-apply on, this happens
  automatically.)

Each row shows the player's name, their role tag, a *you* badge for yourself, and their ping
(color-coded green/yellow/red by latency).

## Nametags

NodeMP draws a floating label above every other player's vehicle with their name, role, and —
optionally — the distance to them. The labels fade out with distance so far-away cars don't
clutter the screen. You control them from the **Name tags** section of the options:

- hide the tag over your own vehicle,
- show or hide the distance,
- occlude tags behind walls and terrain, and
- set the fade distance.

NodeMP can also draw small **markers** for vehicles that aren't physically present yet (queued to
spawn) or that have been deleted, so you always know where other cars are. A server may pin some
of these nametag values for everyone, in which case the server's choice wins over your local
setting.

## Diagnostics console

For a deep look at a session there's an ImGui **diagnostics console** (open it from the NodeMP
options *Tools* area). It exposes live tabs for the session, players, vehicles, chat, per-packet
network stats, the spawn/apply queue, and an event feed. It's primarily a debugging tool, but
it's also the quickest way to confirm what the client is doing if something looks off.
