---
title: Settings and UI
description: The launcher's Settings, the helper's Launcher.cfg, the in-game Options → NodeMP page, the chat overlay's chat.json, and the default keys.
---

Settings live in two places: the launcher's **Settings** view for everything around a session,
and the **NodeMP** page in BeamNG's Options for everything inside one. Both save as you change
them. One setting of the helper process has no control in either and lives in its
[`Launcher.cfg`](#helper-configuration-launchercfg).

## Launcher settings

The gear at the bottom of the rail opens three pages.

**Game**

- **Where BeamNG.drive is installed** — empty means *Found automatically*. **Browse** picks a
  folder, **Find it** searches again; the line under the heading reports the result, for example
  `Version 0.39.4.0` or `No Bin64\BeamNG.drive.x64.exe in this folder`.
- **Graphics mode** — *Direct3D 12* (the default on BeamNG 0.39), *Vulkan* or *Direct3D 11*,
  passed to the game as `-gfx`.

**Launcher**

- **Start with Windows** — adds a `NodeMP` entry to your user's Run key.
- **Close the launcher once the game starts** — off by default: the window hides during the
  session and comes back when BeamNG.drive closes or the server ends the session. On, the
  window is closed for good while the process that carries your traffic stays.
- **Folders → Downloaded content** — the helper's cache of content from servers, with its size;
  **Open** opens the folder. **Folders → Logs** — where `launcher.log` is written; attach it
  when you report a problem.
- **Client mod** — installed version and last result; **Check now** repeats the check. See
  [The client mod](/players/install/#the-client-mod).
- **Reset settings** — back to defaults; favourites, recent servers and downloads are kept.

**Account** — the name servers see you under. Signed in: your account id, roles and **Sign
out**. In Test Drive: `Guest · a new name each session, and servers may refuse it` and **Sign
in**.

The **Content** view in the rail lists that cache and lets you **Remove** files (close BeamNG
first; it holds the archives open). A server that needs a removed file downloads it again.

## Helper configuration: `Launcher.cfg`

The helper — the process that carries your traffic — reads one JSON file from its data folder,
written with defaults on its first run:

```
%LOCALAPPDATA%\com.nodemp.launcher\helper\Launcher.cfg
```

```json
{
    "Port": 4444,
    "Name": "",
    "DefaultServer": "",
    "ServerFingerprint": "",
    "CacheDirectory": "./cache",
    "StrictRecheckMin": 10
}
```

The launcher passes the server, your name and the ticket on the command line at every join, so
`Name`, `DefaultServer` and `ServerFingerprint` are for people running the helper by hand;
`Port` is the command channel the client mod connects to and `CacheDirectory` is where
downloaded content goes. The one key worth changing is:

- **`StrictRecheckMin`** — on a server with `VerifyGame = "strict"`
  ([Strict verification](/hosting/strict-verification/)), how many minutes pass between the
  helper's scheduled re-checks of your game files during the session. Default `10`; `0` turns
  the schedule off; a negative or non-integer value is ignored with
  `Ignoring StrictRecheckMin "…": expected a whole number of minutes (0 = no scheduled re-check)`
  in `launcher.log` and the default is used. The key has no effect on servers below `strict`.

A re-check is the same strict check the join ran — the game folder, every archive's table of
contents and the user folder — with one difference: the binaries (`Bin64\`, `BinLinux\`, the
`.exe` files in the game folder) are compared by size only, not hashed. A library the running
game has loaded cannot change what the game does until the next start, and the next start runs
the full check at the door again; a server can also ask for a full one at any time
(`player:verify`), and that request always hashes everything. A re-check that finds nothing is
not reported to the server. One that finds a change is, and the server then ends the session
with `Game files changed while you were playing and no longer match this server's reference (N problems). …`
([Troubleshooting](/players/troubleshooting/#strict-servers)). Besides the schedule, the
helper re-checks when it sees files change under the install's `content\`, `scripts\`, `lua\`
and `ui\` or the user folder's `vehicles\`, `levels\`, `lua\`, `ui\` and `art\`, at most once a
minute; the schedule exists for what the watcher does not cover.

A `Launcher.cfg` that is not valid JSON stops the helper with
`Config failed to parse make sure it's valid JSON!` ([Error codes](/reference/error-codes/#helper-exit-codes)).

## In-game: Options → NodeMP

BeamNG's **Options** sidebar gets a **NodeMP** entry (also in the pause menu under *Mods →
NodeMP settings*). The header shows the mod and launcher versions.

| Section | Settings |
|---|---|
| Gameplay & sync | *Correction strength* (0.25–2×) and *Teleport threshold* (0.25–4×) for other players' cars; *Ghost cars on reset (this machine)* (1.5 s without collisions on your screen; a server can override it). |
| Name tags | *Hide my own nametag*, *Show 'Empty' on empty cars*, *Show distance on tags*, *Hide tags behind objects*, *Fade distance* (0–2000 m, default 100). |
| Markers | *Markers for non-spawned cars*, *Markers for deleted cars*. |
| Vehicle | *My cars: access (0/1/2)* — 0 open, 1 passengers only, 2 only you; *Others may use my triggers*; *Name on license plates*; *Protect my configs*; *Auto-apply others' configs* (off: a player who edited their car is highlighted, click to apply); *3D player heads in cars*; *Freecam player markers*. |
| Mods | *Use my local mods in multiplayer* — off by default; the server must allow it too. |
| Chat & UI | *In-game chat overlay* — the extra ImGui chat and player-list window, off by default. |
| Experimental & debug | Behind *Enable experimental features*: *Synced node grabber (Ctrl)*, *Allow others to grab my cars (Ctrl)*, *Position-sync diagnostics*, *State-sync breadcrumb logging*, *Verbose breadcrumbs*, *Disable state apply*. Leave them off unless you are chasing a bug. |

**Tools** opens the **Diagnostics console (ImGui)**: live tabs: session, players, vehicles,
chat, network, queue, events, settings, debug. *My cars: access*, *Others may use my triggers* and *Allow others
to grab my cars* are sent to the server as your vehicle policy and applied to every car you
spawn.

## Chat and player list

The default in-game UI is two BeamNG UI apps: the **chat** (fading lines over the world; hover
the corner for the history) and the **session panel** (server name, ping, player count with the
roster underneath, hold **Leave**). Messages may use caret codes: `^0`–`^9` and `^a`–`^f` for
colours, `^#RRGGBB`, `^l` bold, `^o` italic, `^n` underline, `^m` strike-through, `^r` reset.

*In-game chat overlay* adds a third window, `NodeMP Chat`, with an options tab (*Theming*: a
colour per part; *General*: *Inactive fade*, *Fade time*, *Fade when collapsed*, *Show on
message*, *Keep active on Enter*). Its **Save** button writes these settings to a file in
BeamNG's user folder:

```
%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\settings\nodemp\chat.json
```

Delete the file to return the overlay to its defaults; a file from an older build is merged
onto the current defaults when it loads.

## Keys

The mod ships these bindings in the *gameplay* category of **Options → Controls**, where you can
change them:

| Default | Action | What it does |
|---|---|---|
| `T` | NodeMP: Chat | Opens the chat to type. Enter sends, Esc closes. |
| `Tab` | NodeMP: Player list | Toggles the roster, like clicking the player count. |
| unbound | NodeMP: Diagnostics window | Opens the diagnostics console. |
| unbound | NodeMP: Toggle debug chat | Toggles the ImGui chat window. |
| unbound | NodeMP: Join grabbed node (alias) | Same as the game's *Node grabber: fix node*. |

While the chat has the keyboard, the car does not: the vehicle action maps are disabled until
you press Esc or send an empty line.
