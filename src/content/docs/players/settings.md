---
title: Settings
description: The launcher's settings, the NodeMP tab in the game's settings, the Content tab with downloaded mods, and what the locked rows mean.
---

Settings are in two places. The launcher has what you need before the game starts. The **NodeMP** tab in the game's own settings has what you see during a session and how other players' cars behave. Changes apply at once unless the row says otherwise.

## In the launcher

The gear at the bottom of the left rail opens **Settings** with the pages **Game**, **Launcher** and **Account**.

**Game**

- **Where BeamNG.drive is installed**: the path to the game, with the **Browse** and **Find it** buttons ([The launcher can't find the game](/players/install/#the-launcher-cant-find-the-game)).
- **Graphics mode**: *Direct3D 12* (the default in BeamNG 0.39), *Vulkan* or *Direct3D 11*, the fallback if D3D12 doesn't work. The game starts in the chosen mode without asking.
- **Client mod**: the installed version and the **Check now** button ([The client mod](/players/install/#the-client-mod)).

**Launcher**

- **Language**: *Русский* or *English*. On the first start the launcher follows the system: Russian on a Russian Windows, English otherwise. Texts from servers and the game stay as they were written.
- **Hold to play**: when off, one click joins ([Join](/players/join/#join)).
- **Start with Windows**.
- **Close the launcher once the game starts**: off by default, so the launcher hides in the notification area instead ([Join](/players/join/#join)).
- **Updates**: the launcher's version, the check, automatic checks, background downloads, the channel and going back to the previous version ([Launcher updates](/players/install/#launcher-updates)).
- **Folders**: **Downloaded content** and **Logs**, each with an **Open** button.
- **Reset**: returns the launcher's settings to their defaults. The **Favorites** and **Recent** lists and downloaded mods stay.

**Account**: your name, links to your profile, **Sign in** or **Sign out** ([Your account in the launcher](/players/sign-in/#your-account-in-the-launcher)).

### Downloaded mods

The **Content** tab on the left rail lists every file servers have sent you, with its size and download date. The search box filters by name, **Open folder** opens the cache, and **Re-read the cache folder** refreshes the list after you change files by hand.

To free space, click **Remove**: the launcher shows how much it frees and asks you to confirm. Close BeamNG.drive first: the game holds the file while it runs. If you need the mod again, the server sends it on your next join.

## The NodeMP tab in the game

BeamNG.drive's settings get a **NodeMP** tab. The **NodeMP settings** button on the pause menu's mods tab also opens it, as does a key bound to *NodeMP: Settings*. The tab has a search box, and **Show advanced settings** reveals the rarer rows: overlay colors, the synced node grabber, and the launcher's port and address.

A row can be locked. *Set by the server* means the server decides it for everyone for the session. *Locked by the strict session* means a server plugin put you in a strict session. In one, you can't use the free camera without the server's permission, **Spectate** and **Teleport camera** don't work, you can't get into cars the server didn't seat you in or open the console or the editor, and local mods are off. How plugins turn it on: [Client scripts](/plugins/client-scripting/#strict-sessions). When you leave the server, your own values come back.

Each row's hint on the tab says what it does. The sections:

| Section | What's in it |
|---|---|
| **Players** | Name tags over cars, markers for cars and for players in free camera, the character you walk as, players' heads in cars, player IDs. |
| **Chat** | How many lines show while the chat is closed and for how long, timestamps, words hidden as `***` on your screen only, the overlay window with the chat and the player list. |
| **Cars & network** | **My cars**: sending edits (at most once every 15 seconds), protecting your configs from cloning, **Access to my cars**, triggers and grabbing with Ctrl. **Other players' cars**: when their new cars and changes are built ([below](#other-players-new-cars-and-changes)), **Ghost cars after a reset** (for 1.5 seconds after a reset, another player's car doesn't collide with yours), simplified models. **Use my local mods in multiplayer**. |

### Other players' new cars and changes

When another player spawns a car or changes its parts, tuning or model, BeamNG.drive rebuilds that car on your computer and freezes meanwhile. The client mod holds such changes and applies them at a better moment, so the game doesn't freeze mid-corner. The [session panel](/players/in-game/#the-session-panel) shows how many cars are waiting.

How long cars wait is set in **Cars & network → Other players' cars**:

| Setting | Default |
|---|---|
| **Schedule other players' car changes** | On. When off, every change is built as soon as it arrives. |
| **Apply scheduled changes**: *When I stop, at least every N s*, *Every N s*, *Only when I stop* or *Only with the button* | *When I stop, at least every N s* |
| **N: longest wait** | 30 seconds, counted from the first change that arrived. |
| **Stopped: slower than** and **Stopped: for at least** | 5 km/h for 2 seconds. On foot or without a car also counts as stopped. |

Some changes apply at once: deletions, resets, color changes, people on foot, and the car you sit in, even as a passenger. A server can turn waiting off for everyone (a race, a league) or require everything to be built within a set time. Then the row says *Set by the server*, and **Applied by the server within** shows that time. How a host sets this up: [Configuring the server](/hosting/server-toml/).
