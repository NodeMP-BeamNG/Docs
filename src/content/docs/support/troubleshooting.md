---
title: When something goes wrong
description: Start from what you see - can't join, mods don't load, the game doesn't start, lag and jumping cars, sign-in and update trouble - and what to send when you ask for help.
---

Find what you're seeing below. Each part says what's usually behind it and what to try, in the
order most likely to help.

## I can't join a server

The launcher always says why a join stopped. Look the message up on
[Can't join a server](/support/joining/); every message is also in the
[full list](/support/error-codes/).

## Mods don't download, or don't show up

- **The download is slow.** Let it run. A download is never stopped for being slow, only when
  nothing has moved for a while.
- **The download broke off.** Join again. Whatever finished downloading stays in the launcher's
  cache, so the next try only fetches the rest.
- **One mod fails every time.** The server may be missing it or have a broken copy, or the host
  marked it *protected* (you get it yourself). See
  [Downloading the server's mods](/support/joining/#downloading-the-servers-mods).
- **The disk is full.** Server mods take space in the launcher's cache. **Content** on the left
  rail lists them with their sizes; remove the ones you don't need (with the game closed).
- **A server's mod isn't there in the game.** Server mods are switched on only while you're on
  that server. Your own mods are switched off during a session, unless you turned on *Use my local
  mods in multiplayer* and the server allows it.

## The game doesn't start, or closes right away

1. Open **Settings → Game** and check that the launcher shows a game version. If not, **Browse** to
   the game folder or click **Find it**.
2. Try another **Graphics mode** there. Direct3D 11 is the fallback when Direct3D 12 misbehaves.
3. Verify the game files in Steam: BeamNG.drive → *Properties → Installed Files → Verify integrity
   of game files*.
4. If the game started and then closed, its own log says why:
   `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\beamng.log`.

If BeamNG.drive is already open when you join, the launcher uses that copy instead of starting a
second one.

## Lag, rubber-banding, cars jumping

Usually it's somebody's connection: a car that jumps for everyone is that player's, not yours.
Pick a server near you, play on a cable rather than Wi-Fi, and pause big downloads.
[VPN and bad connections](/players/vpn/#lag-and-jumping-cars) explains what you see and which
settings help.

## I got disconnected

A short drop doesn't end your session: the launcher reconnects on its own and the game shows
*Connection lost, reconnecting…* with a countdown. If the session did end, the reason is in the
notification; see [The session ended in the game](/support/joining/#the-session-ended-in-the-game).

## The launcher and its helper

Every join starts a second copy of the launcher in the background, without a window: the
**helper**. It starts the game, talks to the server and carries your traffic while you play. When
the launcher says **The launcher's traffic helper stopped**, it means this background part, not
the window you see, and the line under it is the last line of its log. Look it up in
[Helper exit codes](/support/error-codes/#helper-exit-codes).

## Signing in

The basics are on [Your account](/players/sign-in/#if-sign-in-doesnt-work). When the sign-in window
says *Browser sign-in did not work:*, the text after the colon tells you why:

| Text after the colon | What happened | What to do |
|---|---|---|
| `could not reach the directory: …` | No connection to NodeMP. | Check your internet; turn off a VPN that might be in the way. |
| `the directory returned …` | A hiccup on NodeMP's side. | Wait a few minutes and try again. |
| `unexpected reply from the directory: …` | Something on your network answered instead, often a hotel or café Wi-Fi login page. | Open any website in your browser, finish the Wi-Fi login, try again. |
| `could not save the sign-in: …`, `could not reach the credential store: …` | Windows couldn't store your sign-in. | Try again. Until it works, the launcher won't remember your sign-in between starts. |

## The server list is empty

- **Connection lost** at start: click **Try again**. If NodeMP can't be reached for now,
  **Continue without the list**; Direct Connect still works.
- **Could not reach NodeMP** after **Refresh**: the list didn't load this time. Refresh again in a
  moment.
- *No servers online*, *Nobody is hosting right now.*: the launcher reached NodeMP fine, there just
  aren't any public servers running.
- *Nothing matches these filters*: servers are there, your filters hide them. Click **Reset all
  filters**. Favorites and Recent also show only servers that are online.
- A server you know is running isn't listed: it may be private, or not listed at all. Join it with
  **Direct Connect**.

While NodeMP can't be reached, joins go ahead without a ticket: servers that want an account turn
you away, servers that allow Test Drive let you in as an unchecked guest, and servers without a key
take your name as it is.

## Launcher updates

| Message | What happened | What to do |
|---|---|---|
| **Could not check for launcher updates** | NodeMP's update service didn't answer. | Nothing urgent; you can keep playing, and the launcher checks again next time. |
| **The update installs after you leave the server** | The launcher never updates during a session. | Leave the server; the update installs then. |
| **No newer launcher has been published yet** | A server wants a launcher newer than any release so far. | Wait for the next release. |
| **Could not install the launcher update** · `the downloaded installer does not match the published checksum` | The update arrived damaged. | Try again. |
| `This copy does not update itself: …` (under **Settings → Launcher → Updates**) | This launcher wasn't installed with the NodeMP installer. | Install it with the installer from [nodemp.com/download](https://nodemp.com/download). |
| **The update to v… did not install** | The installer failed or was cancelled. | It's offered again next start. If it keeps failing, download the installer yourself. |
| **Could not go back to the previous version** | Going back a version failed. | Install the current launcher from the website. |

## Other launcher messages

| Message | What to do |
|---|---|
| **Could not remove the file** · `could not remove …: …` | The game has the file open. Close BeamNG.drive and remove it again. |
| **Could not open the browser** | Copy the link instead (**Copy link** in the sign-in window) and open it in any browser. |
| **Could not open the folder** | Open it in Explorer yourself; the folders are listed [below](#where-the-files-are). |
| **Could not change Start with Windows** | Windows refused. Turn NodeMP on or off in *Windows Settings → Apps → Startup*. |

## Logs and what to send

When you ask for help on the [forum](https://forum.nodemp.com) or on Discord, send:

1. **`launcher.log`**, right after the problem; it's started over on the next join.
2. **The exact message**: the title, the line under it and the text under **Details**. Old
   notifications are in the bell icon.
3. **Which server**, and what you were doing.

If the problem is inside the game (a car missing, the chat acting up), add the game's log,
`beamng.log`, as well.

### Where the files are

| What | Where |
|---|---|
| `launcher.log` | `%LOCALAPPDATA%\com.nodemp.launcher\helper\logs\` (**Settings → Launcher → Logs**) |
| `beamng.log` | `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\` |
| The helper's settings | `%LOCALAPPDATA%\com.nodemp.launcher\helper\Launcher.cfg` |
| Downloaded server mods | `%LOCALAPPDATA%\com.nodemp.launcher\helper\cache\` (**Settings → Launcher → Downloaded content**); strict servers' files in `integrity\`, the certificates of servers you joined by address in `known_servers.json` |
| The client mod | `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\mods\multiplayer\NodeMP.zip` |

The launcher window itself keeps no log of its own; what it knows, it shows in notifications. In the
game, **Options → NodeMP → Tools** opens a live diagnostics window.

### For developers: another NodeMP service

Players don't need this. The launcher talks to `https://api.nodemp.com`; to point it elsewhere, set
the environment variable `NODEMP_API_BASE`, or put a `directory.url` file with one URL line next to
the launcher's executable. `NODEMP_LAUNCHER=<path to Node-Launcher.exe>` makes the launcher run a
helper you built yourself instead of its own.
