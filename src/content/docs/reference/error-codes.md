---
title: Error messages
description: Every message a join can end with - launcher notifications, the server's refusals and kick reasons, and the helper's exit codes - with what to do about each.
---

NodeMP has no numbered errors. What stops you is a sentence from one of three places: a launcher
notification, a refusal or kick from the server, or the last line of the helper's log. This page
lists them all; `…` stands for a part that changes. For the common cases explained step by step,
start with [When something breaks](/players/troubleshooting/).

## Launcher notifications

A notification has a **title** naming the step that failed and, under it, the exact reason. Below
they are written as **title** · `reason`.

### Client mod

| Message | What happened | What to do |
|---|---|---|
| **Could not join** · `client mod is not installed and the directory is unreachable` | First join without `NodeMP.zip`, and NodeMP didn't answer. | Get online and join again. |
| **Could not join** · `client mod is not installed and no release has been published yet` | First join, and no client mod has been released yet. | Wait for a release. |
| **Could not join** · `could not start the download: …`, `the download server returned …`, `the download stopped: …`, `the download was N bytes, the release says M`, `the download is larger than the release says` | The download didn't start or broke off. | Check your connection, VPN or proxy and join again. |
| **Could not join** · `the downloaded client mod does not match the published checksum` | The file arrived damaged. | Join again. |
| **Could not join** · `LOCALAPPDATA is not set, so BeamNG's user folder cannot be found` | A standard Windows setting is missing. | Sign out of Windows and back in. |
| **Client mod could not be updated** · `Joining with the installed copy.` | The check failed, but you have an older `NodeMP.zip`. A warning only. | If the server refuses the old mod: close the game, then **Settings → Launcher → Client mod → Check now**. |
| **Could not check the client mod** · `could not replace …\NodeMP.zip (is BeamNG.drive running?): …` | The running game holds the file. | Close BeamNG.drive and click **Check now**. |

### Starting a session

| Message | What happened | What to do |
|---|---|---|
| **Could not start the session** · `could not start …: …` | Windows or an antivirus stopped the helper from starting. | Allow NodeMP in the antivirus, or reinstall from [nodemp.com/download](https://nodemp.com/download). |
| **The launcher's traffic helper stopped** · *the last line of its log* | The helper quit during the join. | Look the line up in [Helper exit codes](#helper-exit-codes). |
| **You are already on a server: leave the game to join another** | A join started while a session was running. | Close BeamNG.drive first. |
| **Connection cancelled** | You clicked **Cancel**. | Nothing. |

### Connecting

| Message | What happened | What to do |
|---|---|---|
| **Could not connect** · `Could not reach the server` | Nothing answers at that address: the server is off, its port is closed, or a firewall is in the way. | Refresh the list. If it's your server, check that the port is open for TCP and UDP. |
| **Could not connect** · `DNS Lookup Failed` | The name typed in Direct Connect doesn't resolve. | Check the spelling, or use the IP address. |
| **Could not connect** · `server certificate fingerprint mismatch` | A server joined by address shows another certificate than last time. | Ask the host. If they reinstalled the server, delete its line from `known_servers.json` in the launcher's cache folder. |
| **Could not connect** · `TLS handshake failed: …`, `server presented no certificate` | Something else than a NodeMP server answered, or the connection broke during the handshake. | Check the address and port and try again. With a VPN, see [A bad connection](/players/connection/#messages-you-may-see). |

### Downloading the server's mods

These come as **The server refused the join** or **Session ended** with one of the helper's own
reasons:

| Reason | What happened | What to do |
|---|---|---|
| `Server cannot find …`, `Server refused … (protected)`, `Server failed to read …` | The server lists a mod it can't or won't send. | Tell the host. |
| `Mod '…' is protected: the server does not send it, so it has to be put in the cache folder by hand: …` | The host wants players to get this mod themselves. | Get the zip from the host and put it into the folder the message names. |
| `Failed to verify "…"` | A downloaded mod didn't match what the server announced, twice. | Tell the host. Removing the file under **Content** forces a fresh download. |
| `Received corrupted download confirmation, aborting download.`, `Download announcement does not match the mod list, aborting download.` | The server's answer during the download didn't add up. | Join again; tell the host if it repeats. |

### The server list, the cache and updates

| Message | What happened | What to do |
|---|---|---|
| **Could not reach NodeMP** | The server list didn't load; the line under it names the address used. | Check your connection and VPN. Direct Connect still works. |
| **Could not remove the file** · `could not remove …: …`, `… is no longer in the cache`, `… is not a cached content file` | Removing a file under **Content** failed; the first one usually means the game has it open. | Close the game and try again. |
| **Could not install the launcher update** · `the downloaded installer does not match the published checksum`, `the download stopped (…); it resumes on the next try`, `the download stopped at N of M bytes; it resumes on the next try` | The update didn't download completely. | Try again; it continues where it stopped. |
| `Could not find a BeamNG.drive install. Browse to it, or launch the game once so Steam writes its path.` | Under **Settings → Game**: no game found. | **Browse** to the game folder, or start the game once through Steam and click **Find it**. |
| `No Bin64\BeamNG.drive.x64.exe in this folder` | Under **Settings → Game**: that isn't the game's main folder. | Pick the folder that holds `Bin64\`. |

## The server's refusals and kicks

The server says no in plain words. At the door the launcher shows it as **The server refused the
join**; during a session the game says the session ended and the launcher comes back with **Session
ended**. The server's log has the same text as `<name> kicked — <reason>`.

For version and game-file problems the launcher turns the server's sentence into advice with a
button; those rows say what is *shown*, and the server's own words stay under **Details**. Plugins
can kick with their own text, which you then see as it is.

| Reason | When | What to do |
|---|---|---|
| `Protocol version mismatch: launcher speaks v22, server speaks v21 - update the outdated side` | The launcher and the server speak different protocol versions (the numbers are the real ones). With the launcher behind, shown as `This server needs a newer launcher — update now` with **Update now**; with the server behind, as `This server runs an older NodeMP server (protocol v21; this launcher speaks v22)`. | **Update now** updates the launcher and joins again. If the server is behind, tell its host. |
| `Your NodeMP mod is out of date for this server (it speaks wire protocol …, the server …). Reinstall it from the launcher.` | Your client mod speaks another protocol version than the server. | Close the game, **Settings → Launcher → Client mod → Check now**, join again. |
| `Server full!` | The server has as many players as it allows. | Use the *Free slots* filter, or wait. |
| `The server is starting up; join again in a moment.` | The server is still loading its plugins. | Try again in a minute. |
| `Server shutdown` | The server is stopping; everyone on it gets this. | Wait for the host to bring it back. |
| `You are banned from this server` | Your address or account is on this server's ban list, without a reason. A ban with a reason shows that reason instead. | Ask the host. |
| `This server requires a NodeMP account: sign in to the launcher and join again` | The server doesn't allow Test Drive, and you joined without an account. | **Settings → Account → Sign in**, or use the *No account needed* filter. |
| `Your join ticket was not accepted (join ticket invalid or expired). Join again from the launcher to get a new one` | NodeMP didn't accept the one-time join ticket; the brackets say why. | Join again. |
| `The server could not verify your account with the directory (…). Try again in a moment` | The server couldn't reach NodeMP to check your account. | Try again in a moment. |
| `Resume rejected` | Your connection broke, and the server wouldn't take the reconnect back: the old session was already gone. | Join again. |
| `Resume rejected: too many failed attempts, try again later` | Too many failed reconnects from your address in a short time. | Wait a minute, then join again. |
| `Connection refused` | A plugin turned you away without a reason; with a reason, you see that reason. | Ask the host. |
| `Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | Some game files differ from the game's own list. The number is real. | Verify the game files in Steam. |
| `Your BeamNG install changed while you were playing, and this server requires it to match the game's own file list (1 file differs). …` | The same check, repeated during the session, found a change. | Undo what you installed; verify the game files. |
| `Game files do not match this server's reference (3 problems). userfolder:vehicles/pickup/pickup.jbeam (overlay), …` | A strict server: your install or user folder differs from the host's clean copy. Up to three examples follow. Shown as `Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam`, with the first problem in words and a command that lists them all. | See [A strict server refuses you](/players/troubleshooting/#a-strict-server-refuses-you). |
| `Game files changed while you were playing and no longer match this server's reference (1 problem). …` | The strict check, repeated during the session, found a change. Shown as `Your game files changed while you were playing and no longer match this server's reference (1 problem)`. | Undo the change and join again. |
| `Your launcher checked your BeamNG install against a different reference manifest than this server uses (checked against reference manifest … but this server uses …). Reconnect so it fetches the current one.` | The host replaced the server's reference manifest since your last visit. Shown as `This server's reference manifest changed — join again`. | Join again. |
| `This server requires the strict check of your BeamNG install, but your launcher ran only 'size'. Update your launcher and try again.` | A strict server got the result of a lighter check. Shown as `This server needs a newer launcher — update now`. | **Update now**, or reinstall from [nodemp.com/download](https://nodemp.com/download). |
| `` This server requires a strict check of your BeamNG install but has no integrity manifest to check it against. Ask the host to run `Node-Server --gen-integrity <gamedir>` and put the file in the server's integrity folder. `` | The host turned on the strict check without the file it needs. | Tell the host ([Strict file check](/hosting/strict-verification/)). |
| `This server has integrity manifests for 2 game versions (0.39.4.0, 0.39.3.0) and cannot tell which one you run. Ask the host to keep exactly one manifest in the server's integrity folder.` | The host keeps files for more than one game version. | Tell the host. |
| `Unknown integrity manifest requested` | The launcher asked for a file the server doesn't have, usually one the host just replaced. Shown as `The server would not send its reference manifest`. | Join again in a moment; tell the host if it repeats. |
| `Too many integrity manifest requests` | The launcher asked for that file too often in one session. Shown as `The server stopped sending its reference manifest (asked too often)`. | Join again in a moment; reinstall the launcher if it repeats. |
| `This server requires a check of your BeamNG install, which could not be completed: …` | The check couldn't run; the text after the colon says why. Shown as `BeamNG's user folder was not found`, `Could not download the server's reference manifest`, `The server's reference manifest is out of date` or `Your game files could not be checked`. | Follow the advice under it, then join again. |
| `Kicked`, `Kicked by the server`, `Kicked by module` | A plugin, the server console or a native module removed you without a reason. | Ask the host. |
| `Banned` | A plugin banned you without a reason. | Ask the host. |
| `Packet rate limit exceeded` | Your game sent packets faster than the server allows. | Join again; report it if it repeats. |
| `Disconnected after failing to receive packets` | The server couldn't deliver data to you. | Join again. |
| `TCP send of MODS_INFO failed` | The server couldn't send its mod list; the connection was already gone. | Join again. |
| `Expected HELLO`, `Malformed HELLO`, `Expected IDENTITY after HELLO`, `Unknown packet type during handshake`, `Frame length cap exceeded`, `Per-type body cap exceeded`, `Malformed frame`, `Packet decode failed`, `Sent a compressed packet that does not decompress`, `Malformed game verification report` | The launcher sent something the server doesn't accept. Only a modified or broken launcher does that. | Reinstall the launcher from [nodemp.com/download](https://nodemp.com/download). |

**Session ended** with no reason at all means BeamNG.drive was closed.

## Helper exit codes

The helper is the launcher's background part that does the joining. When it quits during a join, the
launcher shows **The launcher's traffic helper stopped** with the last line of its log. The number
itself is only visible when you start the helper by hand. The full log is
`%LOCALAPPDATA%\NodeMP\helper\logs\launcher.log`.

| Code | Last log line | Meaning | What to do |
|---|---|---|---|
| `0` | `game closed - launcher closing soon` | BeamNG.drive was closed and the session ended. | Nothing. |
| `1` | `Launcher.cfg is there but cannot be read; check its permissions, or delete it to start from the defaults`, `Launcher.cfg is not valid JSON; fix it, or delete it to start from the defaults` | The helper's settings file is unreadable or broken. | Delete `Launcher.cfg`; the helper writes a fresh one. |
| `1` | `Cannot create the mod cache …: …. Point CacheDirectory in Launcher.cfg at a folder you can write to.` | The folder for downloaded mods can't be created. | Fix the folder's permissions, or set `CacheDirectory` in `Launcher.cfg`. |
| `2` | `BeamNG.drive was not found. Choose its folder (the launcher's Settings > Game, or --game-dir), or start the game once so it records where it is.` | No game install found. The helper quits after 10 seconds. | Set the folder under **Settings → Game**, or start the game once through Steam. |
| `2` | `The game could not be started (through Steam, or by its executable); the launcher closes in 5 s.` | Neither Steam nor the game's own executable started BeamNG.drive. | Verify the game files in Steam and check **Settings → Game**. |
| `5` | `Another Node-Launcher is already running on port 4444 - closing` | A second helper was started while one is running. | Close the other one (or BeamNG.drive with it) and try again. |
| `6` | `port 4444 is in use by another program …` | Another program holds the local port the game talks to the helper on. | Close that program; the message names a command that shows which one it is. |

The helper's game-file check can also run on its own (the **Copy** button under a strict refusal
gives the command). It exits with `0` when the install is clean (`game files verified: …`), `1` when
something differs (`game files DIFFER: …`) and `2` when the check couldn't run
(`cannot read the manifest file …`, `not a reference manifest: …`, `could not check: …`).
