---
title: Settings
description: The launcher's settings, the NodeMP tab in the game's options, and what locked rows mean.
---

There are settings in two places. The **launcher** has everything needed before the game starts.
The **NodeMP** tab in the game's own options has what you see during a session and how other
players' cars behave. Changes apply right away unless the row says otherwise.

## In the launcher

The gear at the bottom of the left rail opens **Settings**. There are three pages.

**Game**

- **Where BeamNG.drive is installed**: found by itself. **Browse** picks the folder by hand, **Find
  it** searches again.
- **Graphics mode**: Direct3D 12 (the default on BeamNG 0.39), Vulkan, or Direct3D 11 if D3D12 gives
  you trouble. The game starts straight in the chosen mode.

**Launcher**

- **Language** of the launcher. What servers and the game write stays as they wrote it.
- **Hold to play**: hold the join button for 0.4 seconds. Turned off, one click joins.
- **Start with Windows**.
- **Close the launcher once the game starts**: off by default, so the launcher waits out of the way
  and comes back when you leave the server.
- **Folders**: where the servers' downloaded mods and the logs are. Attach `launcher.log` when you
  report a problem.
- **Client mod**: the installed version and **Check now**.
- **Updates**: the channel, automatic checks, background downloads, going back a version
  ([more](/players/install/#launcher-updates)).
- **Reset**: back to the defaults. Favorites, recent servers and downloads stay.

**Account**: your name, links to your profile, **Sign in** or **Sign out** ([Your account](/players/sign-in/)).

### Downloaded mods

**Content** on the left rail lists every mod servers have sent you: the file, its size and when it
was downloaded. **Remove** frees the space (close BeamNG.drive first: the game keeps the files open).
If you need the mod again, the server sends it on your next join.

## In the game: the NodeMP tab

BeamNG.drive's options get a **NodeMP** tab. The **NodeMP settings** button on the mods tab of the
pause menu opens it too, as does a key bound to *NodeMP: Settings*. The tab has a search box, and
**Show advanced settings** reveals the rarer rows.

A row can be locked. **Set by the server** means the server you're on decides this for everyone
during the session. **Locked by the strict session** means a strict server turned it off. Your own
value comes back when you leave the server.

| Section | What's there |
|---|---|
| **Players** | Name tags over cars: whether to show them, your own tag, an *Empty* tag on empty cars, the distance, fading out far away, shortening long names, player IDs. Markers for deleted cars and for players in free camera. The character you walk as. |
| **Chat** | How many lines stay visible while the chat is closed, how many seconds a line stays, the time in front of each line, words hidden as `***` on your screen only. A separate overlay window with the chat and the player list. |
| **Cars & network** | Your cars: whether edits are sent automatically, protecting your configs from copying, who may get into your cars, whether others may use your triggers and grab your cars with Ctrl. Other cars: when their new cars and changes are built ([below](#other-players-new-cars-and-changes)), see-through after a reset, simplified models, holding them tightly on their real path. *Use my local mods in multiplayer*. |
| **Debug** | Detailed logs and switches for finding problems. Leave them alone unless a developer asks. **Tools** opens the diagnostics window. |

### Other players' new cars and changes

When another player spawns a car or changes its parts, tuning or model, your game has to build that
car, and building stops the game for a moment. NodeMP holds these and builds them when it suits you,
so somebody else's rebuild doesn't freeze your game mid-corner. While cars are waiting, a lime tab
with their number slides out of the session panel's left edge; clicking it builds them all now. A
key bound to *NodeMP: Load scheduled changes* does the same.

When they are built on their own is set under *Cars & network → Other players' cars*:

| Setting | |
|---|---|
| **Schedule other players' car changes** | On by default. Off: every change is built the moment it arrives. |
| **Apply scheduled changes** | *When I stop, at least every N s* (the default), *Every N s*, *Only when I stop*, *Only with the button*. |
| **N: longest wait** | 30 seconds by default, counted from the first change that came. |
| **Stopped: slower than**, **for at least** | 5 km/h for 2 seconds by default. On foot or without a car counts as stopped. |

Some things never wait: deletions, resets, colour changes, people on foot, and the car you sit in,
also as a passenger. While a new car waits, its name tag already shows where it drives. A server can
switch this off for everyone (a race or a league) or have everything built within a set time; the
row then says *Set by the server*.

## For the curious: Launcher.cfg

The launcher's background part reads a small settings file:
`%LOCALAPPDATA%\NodeMP\helper\Launcher.cfg`. You rarely need it: the launcher passes everything a
join needs by itself. Keep the file valid JSON, or the launcher can't connect.
