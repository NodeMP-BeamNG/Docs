---
title: Settings and controls
description: The launcher's settings, the NodeMP page in the game's options, the chat, the player list and the keys.
---

Settings live in two places: the launcher's **Settings** for everything around a session, and the
**NodeMP** page in the game's options for everything inside one. Changes are saved at once.

## Launcher settings

The gear at the bottom of the rail opens three tabs.

### Game

| Setting | What it does |
|---|---|
| **Where BeamNG.drive is installed** | Empty — found automatically. **Browse** picks a folder, **Find it** searches again. The line under the heading shows the result, for example `Version 0.39.4.0`. |
| **Graphics mode** | *Direct3D 12* (the default on BeamNG 0.39), *Vulkan* or *Direct3D 11* (the fallback if D3D12 fails). The game starts straight into it and never asks. |

### Launcher

| Setting | What it does |
|---|---|
| **Language** | The launcher's language. What servers and the game write is shown as they wrote it. |
| **Hold to play** | On: hold Play for 0.4 s and let go — no joining by accident. Off: one click joins. |
| **Start with Windows** | Open NodeMP when you sign in to Windows. |
| **Close the launcher once the game starts** | Off by default: the window hides during the session and comes back when you leave. On: the window closes, and the process that carries your traffic stays. |
| **Folders → Downloaded content** | The servers' mods the launcher downloaded, and their size. **Open** opens the folder. |
| **Folders → Logs** | Where `launcher.log` is. Attach it when you report a problem. |
| **Client mod** | The installed version and the last result; **Check now** checks again. |
| **Updates** | The channel (*Release* or *Beta*), automatic checks, going back a version — see [Launcher updates](/players/install/#launcher-updates). |
| **Reset** | Back to defaults. Favorites, recent servers and downloads are kept. |

### Account

The name servers see you under, with **Manage on the website** and **Sign out** (in Test Drive:
**Sign in**). More on [Account and sign-in](/players/sign-in/).

## Downloaded server mods

**Content** in the rail lists everything servers sent: the file, its size and when it was
downloaded. It has a search and **Open folder**. **Remove** frees the space; close the game first —
while it runs, the archive is in use. A server that needs a removed file gets it downloaded again at
your next join.

## In the game: Options → NodeMP

BeamNG's **Options** sidebar gets a **NodeMP** entry (also in the pause menu under *Mods → NodeMP
settings*).

| Section | Settings |
|---|---|
| Gameplay & sync | *Correction strength* (0.25–2×) and *Teleport threshold* (0.25–4×) for other players' cars. *Hold other cars tightly* (off by default): other players' cars stay closer in corners and slides, but react harder when their driver touches throttle, brake or steering. *Steering look-ahead (experimental)* (off): other players' wheels turn slightly early, by half of the network delay. *Ghost cars on reset (this machine)*: 1.5 s without collisions on your screen; a server can override it. |
| Name tags | *Hide my own nametag*, *Show 'Empty' on empty cars*, *Show distance on tags*, *Hide tags behind objects*, *Fade distance* (0–2000 m, default 100). |
| Markers | *Markers for non-spawned cars*, *Markers for deleted cars*. |
| Vehicle | *My cars: access (0/1/2)*: 0 open, 1 passengers only, 2 only you. *Others may use my triggers*, *Name on license plates*, *Protect my configs*, *Auto-apply others' configs* (off: a player who edited their car is highlighted — click to apply), *3D player heads in cars*, *Freecam player markers*. |
| Mods | *Use my local mods in multiplayer* — off by default; the server must allow it too. |
| Chat & UI | *In-game chat overlay* — an extra chat and player-list window, off by default. |
| Experimental & debug | Behind *Enable experimental features*: the synced node grabber (Ctrl), letting others grab your cars, and sync debugging modes. Leave them off unless you are chasing a bug. |

**Tools** opens the diagnostics console: live session, players, vehicles, chat, network, events and
settings. *My cars: access*, *Others may use my triggers* and *Allow others to grab my cars* are sent
to the server as the rules for your cars and apply to every car you spawn.

## Chat and player list

By default the game has two NodeMP windows:

- the **chat** — lines over the world that fade out; hover the corner to see the history;
- the **session panel** — the server's name, your ping, the player count with the roster, and
  **Leave** (hold it).

Messages may use colour codes: `^0`–`^9` and `^a`–`^f` for colours, `^#RRGGBB` for any colour,
`^l` bold, `^o` italic, `^n` underline, `^m` strike-through, `^r` reset.

*In-game chat overlay* adds a third window, `NodeMP Chat`, with a settings tab: a colour per part
and how it fades. Its **Save** button writes them to:

```
%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\settings\nodemp\chat.json
```

Delete the file to return the overlay to its defaults.

## Keys

NodeMP's bindings are in the *gameplay* category of **Options → Controls**, where you can change
them:

| Default | Action | What it does |
|---|---|---|
| `T` | NodeMP: Chat | Open the chat. Enter sends, Esc closes. |
| `Tab` | NodeMP: Player list | Show or hide the roster. |
| unbound | NodeMP: Diagnostics window | Open the diagnostics console. |
| unbound | NodeMP: Toggle debug chat | Show or hide the chat overlay window. |
| unbound | NodeMP: Join grabbed node (alias) | Same as the game's *Node grabber: fix node*. |

While the chat is open, the car gets no key presses — until Esc or an empty line.

## Advanced: Launcher.cfg

The launcher's helper — the process that carries your connection during the game — reads a
settings file:

```
%LOCALAPPDATA%\com.nodemp.launcher\helper\Launcher.cfg
```

The launcher passes the server, your name and the ticket at every join, so most keys in the file are
for people running the helper by hand. One is worth changing:

- **`StrictRecheckMin`** — on a strict server: how many minutes pass between the helper's re-checks
  of your game files during the session. Default `10`; `0` turns the schedule off. No effect on
  servers that are not strict.

A re-check is the same strict check the join ran. If it finds a change, the server ends the
session. Besides the schedule, the helper re-checks when it sees files change in the game and user
folders, at most once a minute. A `Launcher.cfg` that is not valid JSON stops the helper (see
[Error codes](/support/error-codes/#helper-exit-codes)).
