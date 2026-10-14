---
title: Settings and controls
description: The launcher's settings, the NodeMP tab in the game's options, the chat, the keys, and what locked rows mean.
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
- **Updates**: the channel, automatic checks, going back a version
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
| **Cars & network** | Your cars: whether edits are sent automatically, protecting your configs from copying, who may get into your cars, whether others may use your triggers and grab your cars with Ctrl. Other cars: see-through after a reset, simplified models, holding them tightly on their real path. *Use my local mods in multiplayer*. |
| **Debug** | Detailed logs and switches for finding problems. Leave them alone unless a developer asks. **Tools** opens the diagnostics window. |

## Chat

`T` opens the chat, Enter sends, Esc closes. Up and Down bring back what you typed before. While the
chat is open, your car ignores the keyboard.

A line you send shows dimmed with *sending…* until the server confirms it. If the server didn't let
it through, the reason replaces it: too many messages, muted on this server, didn't pass the filter
and so on.

Lines starting with `/` are commands. What they do depends on the server's resources; on many
servers `/help` lists them.

You can colour text: `^0`–`^9` and `^a`–`^f` pick a colour, `^#RRGGBB` any colour, `^l` bold, `^o`
italic, `^n` underline, `^m` strike-through, and `^r` resets everything.

## Keys

Change them in the game's controls options, in the *gameplay* category:

| Default | Action | What it does |
|---|---|---|
| `T` | NodeMP: Chat | Open the chat. |
| `Tab` | NodeMP: Player list | Show or hide the player list. |
| not bound | NodeMP: Settings | Open the NodeMP tab. |
| not bound | NodeMP: Diagnostics window | Open the diagnostics window. |
| not bound | NodeMP: Toggle debug chat | Show or hide the overlay chat window. |

## For the curious: Launcher.cfg

The launcher's background part reads a small settings file:
`%LOCALAPPDATA%\com.nodemp.launcher\helper\Launcher.cfg`. You rarely need it: the launcher passes
everything a join needs by itself. One useful line is `StrictRecheckMin`: how many minutes apart a
strict server re-checks your game files during a session (default `10`, `0` turns the repeats off).
Keep the file valid JSON, or the launcher can't connect.
