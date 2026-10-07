---
title: "Can't join a server"
description: "What the launcher's messages mean at each stage of a join — client mod, game start, network connection, server refusal — and how to quickly resolve each issue."
---

Joining a server happens in a few clear stages. If something goes wrong along the way, the launcher immediately shows a helpful notification:

- **The title** tells you which stage got stuck (*Could not join*, *The server refused the join*, *Session ended*).
- **The line below the title** shows the exact reason returned by the game server or background helper — look it up in the tables below.
- **The action button** suggests the right fix right away (*Update now*, *Copy* command), whenever one is available.

All recent connection attempts and kicks are saved in the notification centre (the bell icon on the left sidebar).

| Stage | What the launcher shows | Where to look on failure |
|---|---|---|
| Client mod | `Checking client mod`, `Downloading client mod N%` | [Client mod](#client-mod) |
| Starting the game | `Starting BeamNG.drive`, `Waiting for BeamNG.drive` | [Starting the game](#starting-the-game) |
| Connection | `Contacting the server` | [Connecting](#connecting) |
| Server checks | `Checking your game files`, downloading server mods | [The server refused](#the-server-refused) |
| In the game | Active session panel | [The session ended in the game](#the-session-ended-in-the-game) |

## Client mod

Before every connection, the launcher checks your `NodeMP.zip` client mod and downloads any fresh release. If the mod is already installed on your PC but the directory is temporarily unreachable, the launcher won't block your join: it shows a warning and joins with the copy you have.

The errors below only halt your join when no client mod is installed on your computer at all.

| Message | Cause | What to do |
|---|---|---|
| **Could not join** · `client mod is not installed and the directory is unreachable` | First launch; the launcher could not reach `api.nodemp.com`. | Check your internet connection, turn off any conflicting VPN, and try joining again. |
| **Could not join** · `client mod is not installed and no release has been published yet` | First launch; no release of the client mod has been published yet. | Wait for the developers to publish the initial release. |
| **Could not join** · `could not start the download: …`, `the download server returned …`, `the download stopped: …`, `the download was N bytes, the release says M`, `the download is larger than the release says` | The download server could not be reached, or the file transfer was interrupted. | Check your network connection, proxy, or VPN settings, and join again. |
| **Could not join** · `the downloaded client mod does not match the published checksum` | The downloaded archive was corrupted during transfer. | Click join again to start a fresh download. |
| **Could not join** · `LOCALAPPDATA is not set, so BeamNG's user folder cannot be found` | A standard Windows environment variable is missing from your system. | Sign out of your Windows user account and back in, or restart your computer. |
| **Could not check the client mod** · `could not replace …\NodeMP.zip (is BeamNG.drive running?): …` | BeamNG.drive is currently running and has locked the mod file. | Close BeamNG.drive, then navigate to **Settings → Launcher → Client mod → Check now**. |

If an error mentions `…\mods\multiplayer` or `NodeMP.zip.part`, the launcher cannot write to BeamNG's user directory. Free up disk space and ensure write permissions for `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\mods\multiplayer\`.

## Starting the game

| Message | Cause | What to do |
|---|---|---|
| **Could not start the session** · `could not start …: …` | Starting the background helper was blocked by Windows or security software. | Add the launcher directory `%LOCALAPPDATA%\NodeMP` to your antivirus exclusions, or reinstall the launcher from [nodemp.com/download](https://nodemp.com/download). |
| **The launcher's traffic helper stopped** · `Failed to find the game please launch it. Report this if the issue persists code 8` | The launcher could not find your BeamNG.drive installation. `code 8` is a search status label, not an error code. | Select the game folder manually under **Settings → Game**, or launch BeamNG.drive once through Steam. |
| **The launcher's traffic helper stopped** · `Failed to Launch the game! launcher closing soon.` | BeamNG.drive failed to launch via Steam or directly through `Bin64\BeamNG.drive.x64.exe`. | Verify the integrity of game files in Steam and make sure the path under **Settings → Game** is correct. |
| Join is stuck on `Starting BeamNG.drive` or `Loading BeamNG.drive` | A cold start of BeamNG.drive takes time, especially on slower storage. | Give it a minute. If the game never appears, attach your `launcher.log` to a report on the forum ([Logs and reports](/support/logs/)). |

Under **Settings → Game**, you may see helpful hints right beneath the path:

- `Could not find a BeamNG.drive install. Browse to it, or launch the game once so Steam writes its path.` — click **Browse** to choose the game folder manually, or launch BeamNG.drive once through Steam and click **Find it**.
- `No Bin64\BeamNG.drive.x64.exe in this folder` — this is not the root game folder. Select the parent folder that contains the `Bin64\` directory.

## Connecting

| Message | Cause | What to do |
|---|---|---|
| **Could not connect** · `Could not reach the server` | Nothing is answering at that address: the server is offline, the port is closed, or a firewall is blocking traffic. | Refresh the server list. If you host this server, check that port `30814` is open for both TCP and UDP. |
| **Could not connect** · `DNS Lookup Failed` | The domain name entered in Direct Connect could not be resolved. | Check the spelling of the address or connect directly via IP. |
| **Could not connect** · `server certificate fingerprint mismatch` | A server you joined by direct address has a different security certificate than before. | Ask the host if the server was recently reinstalled. If so, open the launcher cache (**Settings → Launcher → Downloaded content → Open**) and delete the server's entry from `known_servers.json`. |
| **Could not connect** · `TLS handshake failed: …`, `server presented no certificate` | Another service is using that port, or the secure connection dropped mid-handshake. | Double-check the address and port, then try connecting again. |

## The server refused

Here the notification shows **The server refused the join**, along with the server's specific reason. When a join fails due to versions or strict verification, the launcher explains the situation in plain language and provides an action button. You can always view the raw server response under **Details**. For every possible reason, check the [Error codes](/support/error-codes/#server-refusals-and-kick-reasons) reference.

### Account and ticket

| Reason | What happened | What to do |
|---|---|---|
| `This server requires a NodeMP account: sign in to the launcher and join again` | You are using Test Drive, but this server only allows registered users. | Sign in to your profile via **Settings → Account → Sign in**, or filter the list with *No account needed*. |
| `Your join ticket was not accepted (join ticket invalid or expired). Join again from the launcher to get a new one` | Your one-time join ticket expired (tickets live for about a minute). | Simply click join again to receive a fresh ticket. |
| `The server could not verify your account with the directory (…). Try again in a moment` | The server could not contact the NodeMP directory to verify your account. | Wait a moment and try joining again. |

### Versions

| Shown as | What happened | What to do |
|---|---|---|
| `This server needs a newer launcher — update now` | The server requires a newer network protocol version. | Click **Update now**: the launcher updates automatically, restarts, and rejoins the server. If automatic update fails, download the latest installer from [nodemp.com/download](https://nodemp.com/download). |
| `This server runs an older NodeMP server (protocol v21; this launcher speaks v22)` | The server is running an older version than your launcher. | Nothing needs to be done on your end — the server host needs to update. |
| `Your NodeMP mod is out of date for this server (it speaks wire protocol …, the server …). Reinstall it from the launcher.` | Your installed client mod does not match the version expected by the server. | Close BeamNG.drive, open **Settings → Launcher → Client mod → Check now**, and reconnect. |

### Game files

| Reason or shown as | What happened | What to do |
|---|---|---|
| `Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | The server runs basic file verification, and your game files differ from the clean baseline. | In Steam: BeamNG.drive → *Properties → Installed Files → Verify integrity of game files*. |
| `Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam` | This server runs in **strict** mode: your game archives or user folder differ from a clean installation. | See the step-by-step instructions in [Strict servers](/support/strict-servers/). |
| `This server's reference manifest changed — join again` | The host updated the integrity manifest on the server while you were joining. | Just click join again. |
| `This server requires a strict check of your BeamNG install but has no integrity manifest to check it against. …` | The server configuration has an error: strict mode is on, but no integrity manifest was provided. | Notify the server host. |

### Server content

| Reason | What happened | What to do |
|---|---|---|
| `Invalid mod "…"`, `Failed to verify "…"`, `Server cannot find …` | A mod distributed by the server is corrupted or missing on the host side. | Notify the server host. If the issue is local, delete the mod under **Content** to force a fresh download. |

### Everything else

| Reason | What to do |
|---|---|
| `Server full!` | The server has reached its player limit. Use the *Free slots* filter or wait for someone to leave. |
| `You are banned from this server` | You have been banned from this server. If the host provided a reason, it will appear here instead. |
| `The server is still starting, please try joining again later.` | The server is currently starting up and loading resources. Try again in a minute. |
| `Connection refused` | Your connection was rejected by a server plugin (e.g. whitelist or rule filter). Contact the host. |

## The session ended in the game

If your game session unexpectedly disconnects while driving, BeamNG.drive displays *The session has ended* with a reason, and the launcher returns with a **Session ended** notification showing the same message. If the game closed cleanly without error messages, the process simply exited normally.

| Reason | What happened | What to do |
|---|---|---|
| `Kicked`, `Banned` or a custom message from the host | You were removed by a server administrator or security plugin. | Contact the server host for details. |
| `Server shutdown` | The server was stopped or restarted. | Give the host a couple of minutes to bring the server back online. |
| `Replaced` | Another session joined this server using your account (from another PC or a second launcher window). | Avoid logging into the same server from two devices at once. If this wasn't you, change your account password. |
| `Resume rejected`, `Resume rejected: too many failed attempts, try again later` | The connection dropped and the server declined to resume your session. | Rejoin the server. After repeated failures, wait a minute before trying again. |
| `Game files changed while you were playing and no longer match this server's reference (1 problem). …` | A strict server rechecked your files during the session and found alterations. | Check [Strict servers → While you play](/support/strict-servers/#while-you-play). |
| `Socket Closed Code 1`, `Invalid Socket`, `Malformed frame from server` | The network connection dropped due to network instability, VPN issues, or a server restart. | Check your internet connection and join the server again. |
