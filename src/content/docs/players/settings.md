---
title: Settings and controls
description: The launcher's settings, the NodeMP page in the game's options (players, chat, cars and network, debug), the chat and the keys.
---

There are two places with settings. The launcher's **Settings** cover everything before the game
starts. The **NodeMP** page in the game's options covers what you see and how other players' cars
behave during a session. Changes apply right away unless a row says otherwise.

## In the launcher

Click the gear at the bottom of the left rail. There are three pages.

**Game**

- **Where BeamNG.drive is installed**: found automatically; **Browse** picks the folder by hand,
  **Find it** searches again.
- **Graphics mode**: Direct3D 12 (the default for BeamNG 0.39), Vulkan, or Direct3D 11 if D3D12
  gives you trouble. The game starts straight in it without asking.

**Launcher**

- **Language** of the launcher. What servers and the game write stays as they wrote it.
- **Hold to play**: hold Play for 0.4 s to join, so you don't join by accident. Off: one click
  joins.
- **Start with Windows**.
- **Close the launcher once the game starts**: off by default, so the launcher waits out of the way
  and comes back when you leave the server.
- **Folders**: where downloaded server mods are kept, and the logs (attach `launcher.log` when you
  report a problem).
- **Client mod**: the installed version, and **Check now**.
- **Updates**: channel, automatic checks, going back a version; see
  [Launcher updates](/players/install/#launcher-updates).
- **Reset**: back to the defaults. Favorites, recent servers and downloads stay.

**Account**: your name, links to your profile on the site, **Sign in** or **Sign out**; see
[Your account](/players/sign-in/).

## Downloaded server mods

**Content** on the left rail lists every mod servers have sent you: the file, its size and when it
was downloaded. **Remove** deletes one to free space (close BeamNG.drive first, the game keeps the
files open); a server that needs it will send it again next time. **Open folder** shows the files.

## In the game: Options → NodeMP

In BeamNG.drive, the **Options** menu gets a **NodeMP** page. You also reach it from the pause
menu's Mods tab (**NodeMP settings**) or with a key you bind to *NodeMP: Settings*. The page has a
search box, and **Show advanced settings** reveals the rarer rows.

Some rows may be locked: **Set by the server** means the server you're on decides this for
everyone during the session, **Locked by the strict session** means a strict server switched it off.
Your own choice comes back when you leave. **Reset to default** restores a single row.

### Players

| Group | What you can change |
|---|---|
| Name tags | Show name tags over other players' cars; hide your own; an *Empty* tag over empty cars; the distance next to tags further than 10 m; hide tags behind walls and cars; the distance at which tags fade out, or keep faded tags faintly visible; shorten long names; show player IDs (`#12`) in tags and in the player list. A server may set a tag style or a maximum distance for everyone. |
| Markers | A sphere where another player's car is while it's deleted on your side, and its colour; a marker with the name where a player flies in free camera. |
| Characters | Who you are on foot (*Character on foot*), seen by everyone on the server; 3D heads at the seats of drivers and passengers. |

### Chat

| Group | What you can change |
|---|---|
| Chat window | How many recent lines stay on screen while the chat is closed; how long a line stays before it fades; the time in front of each line; words to hide as `***` on your screen only. |
| Overlay window | An extra floating window with the chat and the player list (off by default), with its fading and colours. |

### Cars & network

| Group | What you can change |
|---|---|
| My cars | Send your part and tuning changes to the others automatically (at most every 15 s); stop others from cloning your configs; who may get into your cars (*Open to everyone*, *Passengers only*, *Closed (only me)*); whether others may use your cars' triggers (doors, lights, levers) and grab your cars with Ctrl. |
| Other players' cars | Make other cars ghosts for 1.5 s after their driver resets (a server may decide this for everyone); lighter versions of other players' cars where one exists; how tightly other cars are held on their real path, and two experimental options for steering and cornering. |
| Mods | *Use my local mods in multiplayer*: keep your own mods on during a session. The server has to allow it too, and a strict session always turns them off. |
| Advanced | Correction strength and teleport threshold for other cars, the synced node grabber, and the launcher's local port and address (change these only if you know why). |

### Debug

Very detailed logs for testing the sync, and switches meant for diagnosing problems. Leave them
alone unless a developer asks you to turn one on. **Tools** opens the diagnostics window.

## Chat

Press `T` to type, Enter to send, Esc to close; Up and Down bring back what you typed before. While
the chat is open, your car ignores the keyboard.

A line you send shows dimmed with *sending…* until the server confirms it. If the server didn't
send it on, the line says why: *too many messages*, *you are muted on this server*, *the message
did not pass the server filter* and so on. Lines starting with `/` are commands for the server's
plugins; what they do depends on the server.

Players and plugins can colour text: `^0`–`^9` and `^a`–`^f` pick a colour, `^#RRGGBB` any colour,
`^l` bold, `^o` italic, `^n` underline, `^m` strike-through and `^r` back to normal.

## Keys

Change them in the game's **Options → Controls**, in the *gameplay* category:

| Default | Action | What it does |
|---|---|---|
| `T` | NodeMP: Chat | Open the chat to type. |
| `Tab` | NodeMP: Player list | Show or hide the player list. |
| not bound | NodeMP: Settings | Open the NodeMP options page. |
| not bound | NodeMP: Diagnostics window | Open the diagnostics window. |
| not bound | NodeMP: Toggle debug chat | Show or hide the overlay chat window. |
| not bound | NodeMP: Join grabbed node (alias) | While grabbing a node, link it to the node under the cursor (the game's own *fix node* action does the same). |

## Advanced: Launcher.cfg

The launcher's background helper reads a small settings file:

```
%LOCALAPPDATA%\com.nodemp.launcher\helper\Launcher.cfg
```

The launcher passes everything a join needs by itself, so you rarely need it. One value can be
useful: `StrictRecheckMin`, how many minutes apart a strict server's game-file check repeats during
a session (default `10`, `0` turns the repeats off). Keep the file valid JSON, or the helper won't
start.
