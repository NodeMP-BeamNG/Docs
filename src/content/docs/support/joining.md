---
title: "Can't join a server"
description: What the launcher's messages mean at each step of a join - client mod, connecting, the server's checks, downloads, starting the game - and how to get past each one.
---

A join goes through a few steps, and when one of them fails the launcher tells you which and why:

- the **title** names the step (*Could not join*, *Could not connect*, *The server refused the
  join*, *Session ended*);
- the **line under it** is the exact reason, from the server or from the launcher's helper;
- a **button** offers the fix when there is one (*Update now*, *Copy* for a command).

Every failed join and kick is kept in the bell icon on the left rail. The steps, in the order they
happen:

| Step | What the button says | If it fails |
|---|---|---|
| Client mod | `Checking client mod`, `Downloading client mod N%` | [Client mod](#client-mod) |
| Connecting | `Contacting the server` | [Connecting](#connecting) |
| The server's checks | `Checking your game files` | [The server refused](#the-server-refused) |
| Downloads | `Downloading …`, `Installing …` | [Downloading the server's mods](#downloading-the-servers-mods) |
| Starting the game | `Starting BeamNG.drive`, `Loading BeamNG.drive` | [Starting the game](#starting-the-game) |
| In the game | the session panel | [The session ended in the game](#the-session-ended-in-the-game) |

## Client mod

Before every join the launcher checks `NodeMP.zip` and downloads a new release if there is one. If
you already have the mod and only the check failed, the launcher doesn't stop you: it warns and
joins with your copy. The messages below stop a join only when there is no mod installed at all.

| Message | What happened | What to do |
|---|---|---|
| **Could not join** · `client mod is not installed and the directory is unreachable` | First join, and NodeMP's service didn't answer. | Check your internet and VPN, then join again. |
| **Could not join** · `could not start the download: …`, `the download stopped: …` | The download couldn't start or broke off. | Check your connection and join again. |
| **Could not join** · `the downloaded client mod does not match the published checksum` | The file arrived damaged. | Join again for a fresh download. |
| **Could not check the client mod** · `could not replace …\NodeMP.zip (is BeamNG.drive running?): …` | The game is running and holds the file. | Close BeamNG.drive, then **Settings → Launcher → Client mod → Check now**. |

If a message mentions `…\mods\multiplayer` or `NodeMP.zip.part`, the launcher can't write into the
game's user folder. Free some disk space and check that you can write to
`%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\mods\multiplayer\`.

## Connecting

| Message | What happened | What to do |
|---|---|---|
| **Could not connect** · `Could not reach the server` | Nothing answers at that address: the server is off, its port is closed, or a firewall blocks it. | Refresh the list. If it's your own server, see [hosting troubleshooting](/hosting/troubleshooting/). |
| **Could not connect** · `DNS Lookup Failed` | The name typed in Direct Connect doesn't resolve. | Check the spelling, or use the IP address. |
| **Could not connect** · `server certificate fingerprint mismatch` | A server you joined by address has another certificate than last time. | Ask the host whether they reinstalled it. If so, open the launcher's cache folder (**Settings → Launcher → Downloaded content**) and delete the server's line from `known_servers.json`. |
| **Could not connect** · `TLS handshake failed: …` | The secure handshake didn't finish. | Check the address and port. Through a VPN, see [VPN and bad connections](/players/vpn/#messages-you-may-see). |

## The server refused

Now the notification says **The server refused the join** and gives the server's reason. For
version and game-file problems the launcher explains it in plain words and offers a button; the
server's own sentence is under **Details**. Every reason is in the
[full list](/support/error-codes/#server-refusals-and-kick-reasons).

### Account and ticket

| Reason | What happened | What to do |
|---|---|---|
| `This server requires a NodeMP account: sign in to the launcher and join again` | You're in Test Drive and this server wants an account. | **Settings → Account → Sign in**, or use the *No account needed* filter. |
| `Your join ticket was not accepted (join ticket invalid or expired). Join again from the launcher to get a new one` | The one-time ticket expired or was already used. | Join again; you get a fresh ticket. |
| `The server could not verify your account with the directory (…). Try again in a moment` | The server couldn't reach NodeMP to check your account. | Wait a moment and join again. |

### Versions

| Shown as | What happened | What to do |
|---|---|---|
| `This server needs a newer launcher — update now` | The server speaks a newer protocol than your launcher. | Click **Update now**: the launcher updates, restarts and joins again. If it can't update itself, install the current one from [nodemp.com/download](https://nodemp.com/download). |
| `This server runs an older NodeMP server (protocol v21; this launcher speaks v22)` | The server is older than your launcher. | Nothing to do on your side; the host has to update. |
| `Your NodeMP mod is out of date for this server (it speaks wire protocol …, the server …). Reinstall it from the launcher.` | Your client mod doesn't match the server. | Close BeamNG.drive, **Settings → Launcher → Client mod → Check now**, join again. |

### Game files

| Reason or shown as | What happened | What to do |
|---|---|---|
| `Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | Some game files differ from the game's own list. | In Steam: BeamNG.drive → *Properties → Installed Files → Verify integrity of game files*. |
| `Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam` | A **strict** server: your install or user folder differs from a clean copy. | Follow [Strict servers](/support/strict-servers/). |
| `This server's reference manifest changed — join again` | The host updated the server's description of a clean install. | Join again. |
| `This server requires a strict check of your BeamNG install but has no integrity manifest to check it against. …` | The server is set up for the strict check without the file it needs. | Tell the host. |

### Everything else

| Reason | What to do |
|---|---|
| `Server full!` | The server is full. Use the *Free slots* filter or wait for someone to leave. |
| `You are banned from this server` | This server banned you. If the host gave a reason, you see that instead. |
| `The server is starting up; join again in a moment.` | The server is still starting. Try again in a minute. |
| `Connection refused` | A plugin on the server turned you away (a whitelist, a rule). Ask the host. |

## Downloading the server's mods

The launcher downloads the server's mods before it starts the game, and keeps them in its cache.
A big download can take a while; a slow one is never cut off as long as it keeps moving.

| Reason | What happened | What to do |
|---|---|---|
| `Server cannot find …`, `Server refused … (protected)`, `Failed to verify "…"` | A mod the server lists is missing, protected or broken on the server's side. | Tell the host. To rule out a damaged local copy, remove the file under **Content** and join again. |
| `Mod '…' is protected: the server does not send it, so it has to be put in the cache folder by hand: …` | The host wants you to get this mod yourself. | Get the zip from the host (their site or Discord) and put it into the folder the message names. |

If a download breaks off, join again: what finished downloading stays in the cache.

## Starting the game

| Message | What happened | What to do |
|---|---|---|
| **Could not start the session** · `could not start …: …` | Windows or an antivirus stopped the launcher's helper. | Allow NodeMP in your antivirus, or reinstall from [nodemp.com/download](https://nodemp.com/download). |
| **The launcher's traffic helper stopped** · `BeamNG.drive was not found. Choose its folder (the launcher's Settings > Game, or --game-dir), or start the game once so it records where it is.` | The launcher couldn't find the game. | Pick the folder under **Settings → Game**, or start BeamNG.drive once through Steam. |
| **The launcher's traffic helper stopped** · `The game could not be started (through Steam, or by its executable); the launcher closes in 5 s.` | Neither Steam nor the game's own executable started it. | Verify the game files in Steam and check the path under **Settings → Game**. |
| The join sits on *Loading BeamNG.drive* | BeamNG.drive takes a while to start, especially from a hard drive. | Give it a minute. If the game never appears, send `launcher.log` with your report ([logs](/support/troubleshooting/#logs-and-what-to-send)). |

If BeamNG.drive is already running when you join, the launcher uses that copy instead of starting a
second one.

## The session ended in the game

If you're dropped while driving, the game says the session has ended and why, and the launcher
comes back with **Session ended** and the same reason. A short drop usually doesn't get that far:
the launcher reconnects on its own first ([VPN and bad connections](/players/vpn/)).

| Reason | What happened | What to do |
|---|---|---|
| `Kicked`, `Banned`, or the host's own words | An admin or a plugin removed you. | Ask the host. |
| `Server shutdown` | The server stopped or restarted. | Give the host a few minutes. |
| `Resume rejected`, `Resume rejected: too many failed attempts, try again later` | Your connection broke and the server wouldn't take the reconnect back. | Join again. After several failures in a row, wait a minute first. |
| `Game files changed while you were playing and no longer match this server's reference (1 problem). …` | A strict server checked again and found a change. | See [Strict servers → While you play](/support/strict-servers/#while-you-play). |
