---
title: Error codes
description: Every text a failed join can show — the launcher's messages, the helper's exit codes and the reasons a server gives — with what it means and what to do.
---

NodeMP has no numbered error codes. What you see is text from one of three places: a launcher
notification, the last line of the helper's log, or the reason a server gave when it refused or
ended a session. This page indexes those texts exactly as the code prints them; `…` stands for a
part that varies. The step-by-step explanations are on [Can't join a server](/support/joining/).

The one number a player may see, `code 8` at the end of `Failed to find the game please launch it …`,
is the helper's label for its game search, not a code to look up.

## Launcher messages

A notification's **title** names what failed; the line under it, shown here after ` · `, is the
reason word for word. Titles follow the launcher's language; the reasons are in English.

### Client mod

| Message | Meaning | What to do |
|---|---|---|
| **Could not join** · `client mod is not installed and the directory is unreachable` | First join with no `NodeMP.zip`, and `api.nodemp.com` did not answer. | Get online and join again. |
| **Could not join** · `client mod is not installed and no release has been published yet` | First join; there is no client mod release yet. | Wait for a release. |
| **Could not join** · `could not start the download: …`, `the download server returned …`, `the download stopped: …`, `the download was N bytes, the release says M`, `the download is larger than the release says` | The file host could not be reached, or the transfer broke. | Check the connection, VPN, proxy; join again. |
| **Could not join** · `the downloaded client mod does not match the published checksum` | The download was corrupted. | Join again. |
| **Could not join** · `LOCALAPPDATA is not set, so BeamNG's user folder cannot be found` | A Windows environment variable is missing. | Sign out of Windows and back in. |
| **Client mod could not be updated** · `Joining with the installed copy.` | The check failed, but an older `NodeMP.zip` exists. A warning, not an error. | If the server refuses the old mod: close the game, **Settings → Launcher → Client mod → Check now**. |
| **Could not check the client mod** · `could not replace …\NodeMP.zip (is BeamNG.drive running?): …` | The game holds the zip open. | Close BeamNG.drive, then *Check now*. |

### Starting the session

| Message | Meaning | What to do |
|---|---|---|
| **Could not start the session** · `could not start …: …` | Windows refused to start the helper (antivirus, policy). | Allow `%LOCALAPPDATA%\NodeMP` in the antivirus, or reinstall from [nodemp.com/download](https://nodemp.com/download). |
| **Could not start the session** · `NODEMP_LAUNCHER points at …, which is not a file` | Developer builds only: the `NODEMP_LAUNCHER` override points nowhere. | Fix the variable ([Logs → Advanced](/support/logs/#advanced-another-directory)). |
| **The launcher's traffic helper stopped** · *the last line of its log* | The helper exited during the join. | Find the line in [Helper exit codes](#helper-exit-codes). |
| **You are already on a server: leave the game to join another** | A join was started while a session runs. | Close BeamNG.drive first. |
| **Connection cancelled** | You pressed *Cancel*. Not an error. | Nothing. |

### Connecting

| Message | Meaning | What to do |
|---|---|---|
| **Could not connect** · `Could not reach the server` | Nothing answers at `host:port`: the server is down, the port is closed, a firewall. | Refresh the list; a host checks `30814` TCP and UDP. |
| **Could not connect** · `DNS Lookup Failed`, `WSA failed to start` | The name in a Direct Connect address does not resolve; Windows networking could not start. | Check the spelling or use the IP; restart Windows for the second. |
| **Could not connect** · `server certificate fingerprint mismatch` | A server you joined by address has another certificate than last time. | If the host confirms the change, delete its line from `known_servers.json`. |
| **Could not connect** · `TLS handshake failed: …`, `TLS context creation failed: …`, `TLS session creation failed: …`, `TLS socket binding failed: …`, `server presented no certificate` | Something other than a NodeMP server answered, or the connection broke during the handshake. | Check the address and port; try again. |

### The server refused, or the session ended

**The server refused the join** (at the door) and **Session ended** (in the game) carry a reason
from the [table of server refusals](#server-refusals-and-kick-reasons) below — or one of the helper's
own errors:

| Reason | Meaning | What to do |
|---|---|---|
| `Invalid mod "…"`, `Failed to verify "…"`, `Server cannot find …`, `Server refused … (protected)`, `Server failed to read …`, `Mod '…' is protected and therefore must be placed in the cache folder manually here: …`, `Received corrupted download confirmation, aborting download.`, `Download announcement does not match the mod list, aborting download.` | Content sync failed: a mod the server sends is broken, missing or protected, or its transfer did not match the announcement. | Tell the host. Removing the file in **Content** forces a fresh download. |
| `Authentication failed!`, `Unexpected reply after the welcome`, `Unexpected reply to the mod list request`, `Unknown packet from server during handshake` | The server answered the handshake with something the helper did not expect. | Update the launcher; if the server is outdated, tell its host. |
| `Socket Closed Code 1`, `Socket Closed Code 2`, `Socket Closed Code 3`, `Socket Closed Code 5`, `Invalid Socket`, `Oversized frame from server`, `Malformed frame from server`, `Corrupt compressed frame from server` | The connection broke or carried a frame the helper could not read: the server stopped, a NAT or VPN dropped the connection, an unstable network. | Join again; check the connection. |

**Session ended** without a reason means BeamNG.drive was closed.

### Server list, content and updates

| Message | Meaning | What to do |
|---|---|---|
| **Could not reach NodeMP** | The server list could not be loaded; the line under it is the address in use. | Check the connection and VPN ([The server list is empty](/support/launcher/#the-server-list-is-empty)). |
| **Could not remove the file** · `could not remove …: …`, `… is no longer in the cache`, `… is not a cached content file` | Deleting a file in **Content** failed; the first means BeamNG.drive holds the archive. | Close the game and delete again. |
| **Browser sign-in did not work:** `could not reach the directory: …`, `the directory returned …`, `unexpected reply from the directory: …`, `could not save the sign-in: …`, `could not reach the credential store: …` | Signing in failed ([Launcher problems → Signing in](/support/launcher/#signing-in)). | Check the connection; sign in again. |
| **Could not install the launcher update** · `the downloaded installer does not match the published checksum`, `the download stopped (…); it resumes on the next try`, `the download stopped at N of M bytes; it resumes on the next try` | The launcher update did not download ([Launcher updates](/support/launcher/#launcher-updates)). | Try again. |
| `Could not find a BeamNG.drive install. Browse to it, or launch the game once so Steam writes its path.` | Under **Settings → Game**: the launcher found no game. | **Browse** to the game folder, or start the game once through Steam and press **Find it**. |
| `No Bin64\BeamNG.drive.x64.exe in this folder` | Under **Settings → Game**: the folder is not the game's root. | Pick the folder that contains `Bin64\`. |

## Helper exit codes

The helper is the traffic process of the launcher — the same program started with `--helper`. When it
exits during a join, the launcher shows **The launcher's traffic helper stopped** with the last line of
its log; in the game, **Session ended** with that line. The number itself is never shown: it is the
process exit code, seen only when you start the helper from a terminal. The full log is
`%LOCALAPPDATA%\com.nodemp.launcher\helper\logs\launcher.log`, rewritten at every start.

| Code | Last log line | Meaning | What to do |
|---|---|---|---|
| `0` | `game closed - launcher closing soon` | BeamNG.drive was closed. The helper ends the session, waits 5 s and exits. | Nothing. |
| `0` | `game files verified: 14193 files checked in 0.9s (strict), 7203 hashed (0.912 s)` | `--integrity-check <manifest>` ran the strict check and the install is clean. | Nothing. |
| `1` | `game files DIFFER: … (strict), …`, then `counts: missing N, size N, hash N, unlisted N, archive N, userfolder N, folders skipped N` | `--integrity-check <manifest>` found problems; each is printed above the summary. | See [Strict servers](/support/strict-servers/#reading-the-result). |
| `2` | `cannot read the manifest file …`, `not a reference manifest: …`, `could not check: manifest format outdated (format 1)`, `could not check: the game's user folder … does not exist` | `--integrity-check <manifest>` could not run: no such file, not a manifest, an outdated one, or no user folder. | Check the path; ask the host for a current reference; start the game once. |
| `1` | `Config failed to parse make sure it's valid JSON!`, `Failed to open Launcher.cfg!`, `Failed to write config on disk!` | `Launcher.cfg` is corrupt or locked, or the folder is read-only. | Delete `Launcher.cfg` (it is recreated), or fix the permissions of `%LOCALAPPDATA%\com.nodemp.launcher\helper\`. |
| `1` | `Failed to create caching directory: …. This is a fatal error. Please make sure to configure a directory which you have permission to create, read and write from/to.` | The `cache\` folder could not be created. | Fix the permissions, or `CacheDirectory` in `Launcher.cfg`. |
| `1` | `failed to create HKEY_CURRENT_USER\Software\Valve\Steam\Apps\284160`, `failed to create the value "Name" under HKEY_CURRENT_USER\Software\Valve\Steam\Apps\284160` | Wine or Proton only: the helper's registry patch failed. | Give the helper write access to the registry. |
| `1` | `Exception in main(): …`, then `closing in 5 seconds` | An unexpected error at start-up, before the game was started. | Read the lines above it in `launcher.log`. |
| `2` | `Failed to find the game please launch it. Report this if the issue persists code 8` | No BeamNG.drive install in **Settings → Game**, `BeamNG.Drive.ini`, the registry or Steam's library folders. The helper exits after 10 s. | Start the game once through Steam, or set the folder in **Settings → Game**. |
| `2` | `Failed to Launch the game! launcher closing soon.` | Neither Steam (`steam.exe -applaunch 284160`) nor `Bin64\BeamNG.drive.x64.exe` started the game. The helper exits after 5 s. | Verify the game files in Steam; check **Settings → Game**. |

## Server refusals and kick reasons

A server refuses or ends a session with one line of text. At the door the launcher shows it under
**The server refused the join**; in the game the game shows *The session has ended* with it, and
the launcher **Session ended**. The server logs the same text as `<name> kicked — <reason>`.

For the version checks and the strict check, the launcher shows its own explanation instead, with
advice under it — the *Shown as* text in those rows; the server's original is under **Details**.
Plugins may send any text of their own; the rows below are the texts built into `Node-Server` and
the defaults of the plugin API.

| Reason | When | What to do |
|---|---|---|
| `Protocol version mismatch: launcher speaks v22, server speaks v21 - update the outdated side` | Launcher and server speak different protocol versions; the numbers are live (the current ones speak v23). When the launcher is behind, shown as `This server needs a newer launcher — update now`, with an **Update now** button; when the server is behind, as `This server runs an older NodeMP server (protocol v21; this launcher speaks v22)`. | **Update now** updates the launcher and rejoins. When the server is behind, tell its host. |
| `Your NodeMP mod is out of date for this server (it speaks wire protocol …, the server …). Reinstall it from the launcher.` | The client mod speaks another protocol version than the server. | Close the game, **Settings → Launcher → Client mod → Check now**, join again. |
| `Server full!` | `[General] MaxPlayers` is reached. | Filter by *Free slots*, or wait. |
| `The server is still starting, please try joining again later.` | The server was still loading its plugins, and the hold on the handshake ran out. | Try again in a minute. |
| `Server shutdown` | The server is stopping; also sent to everyone in the session when it shuts down. | Wait for the host to bring it back. |
| `You are banned from this server` | Your IP or account is in the server's ban list without a reason. A ban with a reason shows that reason instead. | Ask the host ([Running the server → Bans](/hosting/administration/#bans)). |
| `This server requires a NodeMP account: sign in to the launcher and join again` | `[Directory] TestDrive = false`: you joined in Test Drive, or without a join ticket. | **Settings → Account → Sign in**, or filter by *No account needed*. |
| `Your join ticket was not accepted (join ticket invalid or expired). Join again from the launcher to get a new one` | NodeMP rejected the ticket; the parentheses carry its message. A ticket is single-use, lives about a minute and is bound to your IP. | Join again. |
| `The server could not verify your account with the directory (…). Try again in a moment` | The server could not ask NodeMP; the parentheses say why. A server with `RedeemFailOpen = true` and Test Drive allowed lets you in unverified instead. | Try again in a moment. |
| `Replaced` | A new login of your account joined this server — from another PC or a second launcher — and this session was closed. Next server release; not in 1.5.0. | Do not play from two places at once; change your password if it was not you. |
| `Resume rejected` | The connection broke, and the server would not let the launcher resume the session: the old connection was gone or did not let go. Next server release; not in 1.5.0. | Join again. |
| `Resume rejected: too many failed attempts, try again later` | Too many failed resume attempts from your address in a short time. Next server release; not in 1.5.0. | Wait a minute, then join again. |
| `Connection refused` | A plugin refused the join without a reason; with a reason, that reason is shown. | Ask the host. |
| `Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | `[General] VerifyGame` is `size`, `scripts` or `full`, and your install differs from the game's own list. The count is live. | Verify the game files in Steam. |
| `Your BeamNG install changed while you were playing, and this server requires it to match the game's own file list (1 file differs). …` | The same check, repeated during the session, found a change. | Undo what you installed; verify the game files. |
| `Game files do not match this server's reference (3 problems). userfolder:vehicles/pickup/pickup.jbeam (overlay), …` | `VerifyGame = "strict"`, and your install or user folder differs from the server's reference. The text carries up to three examples as `path (reason)`. Shown as `Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam`, with the first problem in words and the diagnostic command. | See [Strict servers](/support/strict-servers/). |
| `Game files changed while you were playing and no longer match this server's reference (1 problem). …` | The strict check, repeated during the session, found a change. Shown as `Your game files changed while you were playing and no longer match this server's reference (1 problem)`. | Undo the change; run the diagnostic. |
| `Your launcher checked your BeamNG install against a different reference manifest than this server uses (checked against reference manifest … but this server uses …). Reconnect so it fetches the current one.` | The launcher used a cached reference the host has since replaced. Shown as `This server's reference manifest changed — join again`. | Join again. |
| `This server requires the strict check of your BeamNG install, but your launcher ran only 'size'. Update your launcher and try again.` | A strict server received the result of a weaker check. A current launcher runs the check it is asked for, so this points at a modified or broken one. Shown as `This server needs a newer launcher — update now`. | **Update now**, or reinstall from [nodemp.com/download](https://nodemp.com/download). |
| `` This server requires a strict check of your BeamNG install but has no integrity manifest to check it against. Ask the host to run `Node-Server --gen-integrity <gamedir>` and put the file in the server's integrity folder. `` | `VerifyGame = "strict"` with no `.manifest` in `[General] IntegrityDir`. | Tell the host ([Strict verification](/hosting/strict-verification/)). |
| `This server has integrity manifests for 2 game versions (0.39.4.0, 0.39.3.0) and cannot tell which one you run. Ask the host to keep exactly one manifest in the server's integrity folder.` | More than one `.manifest` in the folder. | Tell the host. |
| `Unknown integrity manifest requested` | The launcher asked for a reference the server does not have — usually one the host just replaced. Shown as `The server would not send its reference manifest`. | Join again in a moment; if it repeats, tell the host. |
| `Too many integrity manifest requests` | More than four reference transfers in one session. Shown as `The server stopped sending its reference manifest (asked too often)`. | Join again in a moment; if it repeats, reinstall the launcher. |
| `This server requires a check of your BeamNG install, which could not be completed: …` | The helper could not run the check; the text after the colon says why, for example `the game's user folder … does not exist`, `could not obtain the server's reference manifest: …`, `manifest format outdated (format 1)`. Shown as `BeamNG's user folder was not found`, `Could not download the server's reference manifest`, `The server's reference manifest is out of date` or `Your game files could not be checked`. | Read the advice under it, then join again. |
| `Kicked`, `Kicked by module` | A plugin removed you without a reason. | Ask the host. |
| `Banned` | A plugin banned you without a reason. | Ask the host. |
| `Packet rate limit exceeded` | Your client sent packets faster than the server allows. | Join again; report it if it repeats. |
| `Disconnected after failing to receive packets` | The server could not deliver data to you. | Join again. |
| `TCP send of MODS_INFO failed` | The server could not send its mod list: the connection was already gone. | Join again. |
| `Expected HELLO`, `Malformed HELLO`, `Expected IDENTITY after HELLO`, `Unknown packet type during handshake`, `Frame length cap exceeded`, `Per-type body cap exceeded`, `Malformed frame`, `Packet decode failed`, `Sent invalid compressed packet (this is likely a bug on your end)`, `Malformed game verification report` | The launcher sent something the server does not accept — only a modified or broken launcher does that. | Reinstall the launcher from [nodemp.com/download](https://nodemp.com/download). |
