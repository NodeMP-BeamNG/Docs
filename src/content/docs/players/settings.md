---
title: Settings and controls
description: Launcher options, the in-game NodeMP menu, chat commands, player roster, and keybindings.
---

Settings are organized into two intuitive places: the launcher's **Settings** menu manages everything before you launch, while the **NodeMP** panel inside the game options lets you fine-tune gameplay and interface behaviors on the fly. All changes take effect immediately.

## Launcher settings

To open launcher settings, click the gear icon at the bottom of the left rail. Settings are split across three tabs:

### Game

| Setting | What it does |
|---|---|
| **Where BeamNG.drive is installed** | The path to your game folder. If left empty, the launcher detects it automatically. Click **Browse** to select the directory manually, or **Find it** to search again. The status line below indicates the detected build, such as `Version 0.39.4.0`. |
| **Graphics mode** | Chooses your graphics API: *Direct3D 12* (standard default for BeamNG 0.39), *Vulkan*, or *Direct3D 11* (reliable fallback if D3D12 encounters issues). The game launches directly into your chosen mode without extra popups. |

### Launcher

| Setting | What it does |
|---|---|
| **Language** | The display language of the launcher interface. Server descriptions and in-game messages remain in their original languages. |
| **Hold to play** | Guards against accidental clicks: requires holding the "Hold to play" button for 0.4 seconds to join. Turning this off enables instant one-click joins. |
| **Start with Windows** | Automatically launches NodeMP when you log into Windows. |
| **Close the launcher once the game starts** | Off by default: the launcher hides during your session and reopens when you quit. Turning it on closes the launcher window completely while keeping the lightweight background traffic helper running. |
| **Folders → Downloaded content** | Displays the list and disk footprint of mods downloaded from servers. Click **Open** to reveal the folder in Windows Explorer. |
| **Folders → Logs** | Location of `launcher.log` (useful when diagnosing problems or reporting bugs). |
| **Client mod** | Displays the installed mod version with a **Check now** button to verify integrity manually. |
| **Updates** | Update channel (*Release* or *Beta*), automatic check toggles, and version rollback options — see [Launcher updates](/players/install/#launcher-updates). |
| **Reset** | Restores launcher settings to their defaults. Your favorites, recent history, and downloaded mods are preserved. |

### Account

Shows your verified username and provides **Manage on the website** and **Sign out** buttons (or **Sign in** while in Test Drive). Learn more on the [Account and sign-in](/players/sign-in/) page.

## Downloaded server mods

The **Content** tab on the left rail lists every mod downloaded while joining servers: filename, size, and download date.

You can use the search bar or click **Open folder**. The **Remove** button frees up disk space by deleting unwanted files (make sure BeamNG.drive is closed before deleting). If a server needs a deleted mod later, the launcher simply downloads it again on your next visit.

## In the game: Options → NodeMP

Inside BeamNG.drive, a new **NodeMP** section appears in the **Options** sidebar (also accessible from the pause menu under *Mods → NodeMP settings*):

| Section | Settings |
|---|---|
| Gameplay & sync | Fine-tune multiplayer vehicle synchronization. *Correction strength* and *Teleport threshold* adjust position smoothing during network lag. The *Hold other cars tightly* toggle (off by default) keeps other cars closer to their true trajectory during drifts at the cost of slightly snappier throttle and brake reactions. *Steering look-ahead* turns other players' wheels slightly early based on latency, while *Ghost cars on reset* grants 1.5 seconds of collision-free ghosting after resetting your car. |
| Name tags | Customize nametags above vehicles: hide your own nametag (*Hide my own nametag*), hide tags on unoccupied cars (*Show 'Empty' on empty cars*), display distance, and set the tag visibility cutoff (*Fade distance*). |
| Markers | Display indicators for vehicles that are still loading or have been removed. |
| Vehicle | Access permissions for your vehicles (*My cars: access*: 0 open to all, 1 passengers only, 2 locked to you), allow others to use interior triggers, show username on license plates, protect custom configurations, and automatically apply others' tuning setups. |
| Mods | *Use my local mods in multiplayer* allows your local mods to stay active during multiplayer (off by default and requires server permission). |
| Chat & UI | Toggle the optional floating chat overlay window (*In-game chat overlay*). |
| Experimental & debug | Experimental options such as synchronized node grabbing via Ctrl, letting others grab your car's nodes, and sync debug overlays. Leave these off unless troubleshooting bugs. |

The **Tools** button opens the live diagnostics console: monitor session stats, ping, network packets, event logs, and active vehicles in real time.

## Chat and player list

By default, the game provides two key NodeMP interface components:

- **Chat** — semi-transparent text messages floating over the game that gently fade out. Hover your mouse over the corner to browse message history.
- **Session panel** — in the top corner: server name, current ping, online player count with an expandable roster, and a hold-to-leave **Leave** button.

Chat messages support color codes: `^0`–`^9` and `^a`–`^f` for primary colors, `^#RRGGBB` for custom HEX values, along with formatting styles: `^l` (bold), `^o` (italic), `^n` (underline), `^m` (strikethrough), and `^r` (reset format).

Enabling the chat overlay (*In-game chat overlay*) brings up a customizable `NodeMP Chat` window. Its preferences are saved to:

```
%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\settings\nodemp\chat.json
```

Deleting this file resets the chat overlay back to default styling.

## Keys

NodeMP keybindings can be customized in **Options → Controls** under the *gameplay* category:

| Default | Action | What it does |
|---|---|---|
| `T` | NodeMP: Chat | Open the chat input window (Enter sends, Esc closes). |
| `Tab` | NodeMP: Player list | Show or hide the active player roster. |
| unbound | NodeMP: Diagnostics window | Open the diagnostics console. |
| unbound | NodeMP: Toggle debug chat | Toggle the debug chat overlay window. |
| unbound | NodeMP: Join grabbed node (alias) | Fix a grabbed node in place (same as *Node grabber: fix node*). |

While the chat input box is active, vehicle controls are paused to avoid accidental driving inputs.

## Advanced: Launcher.cfg

The launcher's background helper — the process handling network traffic during your game — reads its settings from:

```
%LOCALAPPDATA%\com.nodemp.launcher\helper\Launcher.cfg
```

The launcher passes server addresses, session tokens, and player names automatically, so you rarely need to touch this file. One setting that can be useful:

- **`StrictRecheckMin`** — on strict servers, specifies the interval (in minutes) between automated integrity rechecks during a session. Defaults to `10` minutes; setting it to `0` disables scheduled rechecks (has no effect on standard servers).

If the helper detects modified game files mid-game, the server terminates the session. Make sure `Launcher.cfg` remains valid JSON, otherwise the helper will fail to start (see [Error codes](/support/error-codes/#helper-exit-codes)).
