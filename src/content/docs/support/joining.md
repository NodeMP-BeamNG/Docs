---
title: "Can't join a server"
description: "What the launcher's message means at each stage of a join — the client mod, the game, the connection, the server's answer — and what to do."
---

A join goes through stages, and each fails with its own notification. Its **title** says which
stage failed; the line under it is the reason, word for word from the server or the launcher's
helper — search this page for it. When the launcher knows the fix, the notification adds advice
and a button (*Update now*, *Copy*). Every failed join stays in the notification centre — the bell
in the rail.

| Stage | What the join shows | If it fails |
|---|---|---|
| Client mod | `Checking client mod`, `Downloading client mod N%` | [Client mod](#client-mod) |
| The game | `Starting BeamNG.drive`, `Waiting for BeamNG.drive` | [Starting the game](#starting-the-game) |
| The connection | `Contacting the server` | [Connecting](#connecting) |
| The server's checks | `Checking your game files`, the server's mods downloading | [The server refused](#the-server-refused) |
| In the game | the session panel | [The session ended in the game](#the-session-ended-in-the-game) |

## Client mod

Before every join the launcher checks the client mod, `NodeMP.zip`, and downloads a new release.
If a copy is already installed and the check fails, the join goes on with that copy and only a
warning is shown — *Client mod could not be updated* / *Joining with the installed copy*. The
errors below stop a join only when there is no copy at all.

| Message | Cause | What to do |
|---|---|---|
| **Could not join** · `client mod is not installed and the directory is unreachable` | First join; `api.nodemp.com` did not answer. | Get online and join again. |
| **Could not join** · `client mod is not installed and no release has been published yet` | First join; there is no client mod release yet. | Wait for a release. |
| **Could not join** · `could not start the download: …`, `the download server returned …`, `the download stopped: …`, `the download was N bytes, the release says M`, `the download is larger than the release says` | The file host could not be reached, or the transfer broke. | Check the connection, VPN or proxy; join again. |
| **Could not join** · `the downloaded client mod does not match the published checksum` | The download was corrupted. | Join again. |
| **Could not join** · `LOCALAPPDATA is not set, so BeamNG's user folder cannot be found` | A Windows environment variable is missing. | Sign out of Windows and back in. |
| **Could not check the client mod** · `could not replace …\NodeMP.zip (is BeamNG.drive running?): …` | The game holds the old zip open. | Close BeamNG.drive, then **Settings → Launcher → Client mod → Check now**. |

Errors that name `…\mods\multiplayer` or `NodeMP.zip.part` mean BeamNG's user folder cannot be
written: free some disk space and check the permissions of
`%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\mods\multiplayer\`.

## Starting the game

| Message | Cause | What to do |
|---|---|---|
| **Could not start the session** · `could not start …: …` | Windows refused to start the launcher's helper — usually an antivirus. | Allow the launcher's folder `%LOCALAPPDATA%\NodeMP` in the antivirus, or reinstall from [nodemp.com/download](https://nodemp.com/download). |
| **The launcher's traffic helper stopped** · `Failed to find the game please launch it. Report this if the issue persists code 8` | The game was not found. `code 8` is the helper's label for its search, not an error code. | Set the game folder in **Settings → Game**, or start the game once through Steam. |
| **The launcher's traffic helper stopped** · `Failed to Launch the game! launcher closing soon.` | Neither Steam nor `Bin64\BeamNG.drive.x64.exe` started the game. | Verify the game files in Steam; check **Settings → Game**. |
| The join stays on `Starting BeamNG.drive` or `Loading BeamNG.drive` | A cold start of BeamNG takes a while. | Wait. If the game never appears, attach `launcher.log` to a report ([Logs](/support/logs/)). |

**Settings → Game** shows its own messages under the path:

- `Could not find a BeamNG.drive install. Browse to it, or launch the game once so Steam writes its path.`
  — press **Browse** and pick the game folder, or start the game once through Steam and press
  **Find it**.
- `No Bin64\BeamNG.drive.x64.exe in this folder` — this is not the game's root; pick the folder
  that contains `Bin64\`.

## Connecting

| Message | Cause | What to do |
|---|---|---|
| **Could not connect** · `Could not reach the server` | Nothing answers at that address: the server is down, the port is closed, a firewall. | Refresh the list. If you are the host, check port `30814` TCP and UDP. |
| **Could not connect** · `DNS Lookup Failed` | The name in a Direct Connect address does not resolve. | Check the spelling, or use the IP. |
| **Could not connect** · `server certificate fingerprint mismatch` | A server you joined by address has a different certificate than last time. | Ask the host whether the server was reinstalled. If so, delete its line from `known_servers.json` in the launcher's cache folder (**Settings → Launcher → Downloaded content → Open**). |
| **Could not connect** · `TLS handshake failed: …`, `server presented no certificate` | Something other than a NodeMP server answered on that port, or the connection broke halfway. | Check the address and port; try again. |

## The server refused

The notification's title is **The server refused the join**, and under it the server's reason.
For the refusals of the version checks and of the strict check, the launcher shows its own
explanation instead, with advice under it; the server's original text is under **Details**.
Every reason a server can send is on [Error codes](/support/error-codes/#server-refusals-and-kick-reasons).

### Account and ticket

| Reason | Cause | What to do |
|---|---|---|
| `This server requires a NodeMP account: sign in to the launcher and join again` | You are in Test Drive and the server only takes accounts. | **Settings → Account → Sign in**, or filter the list by *No account needed*. |
| `Your join ticket was not accepted (join ticket invalid or expired). Join again from the launcher to get a new one` | A ticket is single-use and lives about a minute. | Join again. |
| `The server could not verify your account with the directory (…). Try again in a moment` | The server could not reach NodeMP to check you. | Try again in a moment. |

### Versions

| Shown as | Cause | What to do |
|---|---|---|
| `This server needs a newer launcher — update now` | The server speaks a newer protocol. | Press **Update now**: the launcher updates, restarts and joins this server again. If it cannot update itself, install the current one from [nodemp.com/download](https://nodemp.com/download). |
| `This server runs an older NodeMP server (protocol v21; this launcher speaks v22)` | The server is behind your launcher. | Nothing on your side — the host has to update. |
| `Your NodeMP mod is out of date for this server (it speaks wire protocol …, the server …). Reinstall it from the launcher.` | The client mod is not the version the server expects. | Close the game, **Settings → Launcher → Client mod → Check now**, join again. |

### Game files

| Reason or shown as | Cause | What to do |
|---|---|---|
| `Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | The server checks game files, and yours differ from the game's own list. | In Steam: BeamNG.drive → *Properties → Installed Files → Verify integrity of game files*. |
| `Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam` | A **strict** server: your install or user folder differs from a clean install. | See [Strict servers](/support/strict-servers/). |
| `This server's reference manifest changed — join again` | The host replaced the server's reference. | Join again. |
| `This server requires a strict check of your BeamNG install but has no integrity manifest to check it against. …` | The server is set up wrong. | Tell the host. |

### Server content

| Reason | Cause | What to do |
|---|---|---|
| `Invalid mod "…"`, `Failed to verify "…"`, `Server cannot find …` | A mod the server sends is broken or missing on the server. | Tell the host. Removing the file in **Content** forces a fresh download. |

### Everything else

| Reason | What to do |
|---|---|
| `Server full!` | Filter by *Free slots*, or wait. |
| `You are banned from this server` | Ask the host. A ban with a reason shows that reason instead. |
| `The server is still starting, please try joining again later.` | Try again in a minute. |
| `Connection refused` | One of the server's plugins did not let you in. Ask the host. |

## The session ended in the game

If the session ends while you play, the game shows *The session has ended* with the reason, and the
launcher comes back with **Session ended** and the same reason. Without a reason, BeamNG.drive was
simply closed.

| Reason | Cause | What to do |
|---|---|---|
| `Kicked`, `Banned` or the host's own words | A host or a plugin removed you. | Ask the host. |
| `Server shutdown` | The server stopped. | Wait for the host to bring it back. |
| `Replaced` | Someone joined this server with your account — another PC, or a second launcher. (Next server release.) | Do not play from two places at once; change your password if it was not you. |
| `Resume rejected`, `Resume rejected: too many failed attempts, try again later` | The connection broke, and the server would not let the launcher pick the session back up. (Next server release.) | Join again; after repeated failures, wait a minute. |
| `Game files changed while you were playing and no longer match this server's reference (1 problem). …` | A strict server re-checked your files and found a change. | See [Strict servers](/support/strict-servers/#while-you-play). |
| `Socket Closed Code 1`, `Invalid Socket`, `Malformed frame from server` | The connection to the server broke: the network, a VPN, the server itself. | Join again; check the connection. |
