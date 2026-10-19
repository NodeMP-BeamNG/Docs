---
title: Error messages
description: Launcher notifications, the server's refusals and kicks, the helper's exit codes, and what to do about each message.
---

NodeMP has no error numbers. A join is stopped by a sentence: a launcher notification, a refusal or kick from the server, or the last line of the helper's log. They are all here, with `…` for a part that changes. The common cases step by step: [When something breaks](/players/troubleshooting/).

## Launcher notifications

A notification has a title that names the step and, under it, the reason; the tables write them as *title* · `reason`. Titles follow the interface language, while reasons from the helper and the server are in English. Errors and warnings stay in the notification center under the bell icon: **Copy** puts their text on the clipboard, and **Details** shows the server's or the helper's original words.

### Client mod

| Message | What happened | What to do |
|---|---|---|
| *Could not join* · `client mod is not installed and the directory is unreachable` | `NodeMP.zip` isn't on the disk yet, and NodeMP didn't answer. | Check your connection and join again. |
| *Could not join* · `client mod is not installed and no release has been published yet` | `NodeMP.zip` isn't there, and NodeMP hasn't published any version of the mod yet. | Join later. |
| *Could not join* · `could not start the download: …`, `the download server returned …`, `the download stopped: …`, `the download was N bytes, the release says M`, `the download is larger than the release says` | The mod download didn't start or broke off. | Check your connection, VPN or proxy and join again. |
| *Could not join* · `the downloaded client mod does not match the published checksum`, `the …'s signature does not verify: it was not signed by NodeMP` | The downloaded file failed the checksum or signature check, so the launcher doesn't install it. | Join again. |
| *Could not join* · `LOCALAPPDATA is not set, so BeamNG's user folder cannot be found` | Windows didn't pass the launcher the `LOCALAPPDATA` variable, which it uses to find the game's user folder. | Restart the computer. If that doesn't help, set the variable yourself; it's usually `%USERPROFILE%\AppData\Local`. |
| *Client mod could not be updated* · *Joining with the installed copy.* | The check failed, but the previous `NodeMP.zip` is in place, and the launcher joins with it. This is a warning. | If the server refuses the old mod, close the game and click **Settings → Game → Client mod → Check now**. |
| *Could not check the client mod* · `could not replace …\NodeMP.zip (is BeamNG.drive running?): …` | The running game holds the file. | Close BeamNG.drive and click **Check now**. |

### Starting a session

| Message | What happened | What to do |
|---|---|---|
| *Could not start the session* · `could not start …: …` | The system didn't start the helper, and its message follows the colon. | Check whether an antivirus blocks `NodeMP.exe`, or reinstall the launcher from [nodemp.com/download](https://nodemp.com/download). |
| *The launcher's traffic helper stopped* · the last line of its log | The helper ended with an error during the join or the game. | Look the line up under [Helper exit codes](#helper-exit-codes). |
| *You are already on a server: leave the game to join another* | A join was started while another session is running. | Close BeamNG.drive. |
| *Connection cancelled* | You clicked **Cancel**. | Nothing. |
| *Could not join* · *Your sign-in has ended. Sign in again to join as yourself.* | NodeMP no longer accepts the saved sign-in, and there is no join ticket. The game didn't start. | Click **Sign in** in the notification and sign in again ([Your account](/players/sign-in/)). |
| *Could not join* · *NodeMP could not be reached for a join ticket.* | NodeMP didn't answer. The game didn't start. | Click **Try again**. |
| *Could not join* · NodeMP's refusal text | NodeMP didn't issue a join ticket. Under the text there may be the advice *Try again in N s.* or a decision number to quote to support. | Follow the advice. If the server lets guests in, the notification has **Play as a guest**. |

### Connecting

| Message | What happened | What to do |
|---|---|---|
| *Could not connect* · `Could not reach the server` | Nothing answers at that address: the server is off, its port is closed, or a firewall is in the way. | Refresh the list. If it's your server, check that the port is open for TCP and UDP. |
| *Could not connect* · `DNS Lookup Failed` | The name you entered in Direct Connect can't be found. | Check the spelling or enter the IP address. |
| *Could not connect* · `server certificate fingerprint mismatch` | The server's certificate isn't the one the launcher expected: for a listed server, the one NodeMP knows; for an unlisted one, the one the launcher remembered on the first connection. | Ask the host: they may have reinstalled the server. If the server isn't listed, delete its line from `known_servers.json` in the launcher's cache folder. |
| *Could not connect* · `TLS handshake failed: …`, `server presented no certificate` | Something other than a NodeMP server answered, or the connection broke during the handshake. | Check the address and port and try again. Through a VPN: [A bad connection and VPNs](/players/connection/#connection-error-messages). |

### Downloading the server's mods

These reasons come in a *The server refused the join* or *Session ended* notification.

| Reason | What happened | What to do |
|---|---|---|
| `Server cannot find …`, `Server refused … (protected)`, `Server failed to read …` | The server named a mod it can't or won't send. | Tell the host. |
| `Mod '…' is protected: the server does not send it, so it has to be put in the cache folder by hand: …` | The host wants players to download this mod themselves. | Get the zip from the host and put it in the folder the message names. |
| `Failed to verify "…"` | The downloaded mod didn't match what the server announced, twice. | Tell the host. If you delete the file on the **Content** tab, it downloads again. |
| `Received corrupted download confirmation, aborting download.`, `Download announcement does not match the mod list, aborting download.` | The server's answer during the download didn't add up. | Join again. If it repeats, tell the host. |

### The server list, the cache and updates

| Message | What happened | What to do |
|---|---|---|
| *Could not reach NodeMP* | The server list didn't load. The line under the title names NodeMP's address. | Check your connection and VPN. |
| *Technical work: the server list is closed for now* | NodeMP is under maintenance and issues no join tickets, so you can't join by address either; games in progress go on. | Wait: the launcher asks again by itself. |
| *Could not remove the file* · `could not remove …: …`, `… is no longer in the cache`, `… is not a cached content file` | The file wasn't removed from the **Content** tab. The first message usually means the game holds the file. | Close the game and try again. |
| *Could not install the launcher update* · `the downloaded installer does not match the published checksum`, `the …'s signature does not verify: it was not signed by NodeMP`, `the download stopped (…); it resumes on the next try`, `the download stopped at N of M bytes; it resumes on the next try` | The installer didn't download completely or failed the check. | Try again: the download resumes where it stopped. |
| `Could not find a BeamNG.drive install. Browse to it, or launch the game once so Steam writes its path.` | The game isn't found under the path in **Settings → Game**. | Click **Browse** and choose the game folder, or start the game through Steam and click **Find it**. |
| `No Bin64\BeamNG.drive.x64.exe in this folder` | The path in **Settings → Game** isn't the game's main folder. | Choose the folder that holds `Bin64\`. |

## The server's refusals and kicks

At the door, a refusal shows as *The server refused the join*. During a session, the game reports that the session ended, and the launcher comes back with *Session ended*. The server's log has the same text as `<name> kicked — <reason>`.

For version and game-file refusals, the launcher replaces the server's sentence with its own advice, often with a button; such rows say what the launcher shows, and the server's own words are under **Details**. Plugins can kick with their own text, which you see as it is.

| Reason | When | What to do |
|---|---|---|
| `Protocol version mismatch: launcher speaks v22, server speaks v21 - update the outdated side` | The launcher and the server have different protocol versions; the message gives both real numbers. If the launcher is behind, it shows `This server needs a newer launcher — update now` with the **Update now** button; if the server is behind, `This server runs an older NodeMP server (protocol v21; this launcher speaks v22)`. | **Update now** updates the launcher and joins again. If the server is behind, tell the host. |
| `Your NodeMP mod is out of date for this server (it speaks wire protocol …, the server …). Reinstall it from the launcher.` | The client mod and the server have different protocol versions; the message gives both. | If the mod's number is lower, close the game, click **Settings → Game → Client mod → Check now** and join again. If it is higher, tell the host: the server is behind. |
| `Server full!` | The server is at its player limit, and you can't wait in its queue: you have no account, the launcher can't wait in a queue, the server isn't listed, or its queue is off. | Turn on **Free slots** in the list, or wait. |
| `The server is full and so is its join queue` | As many players are already waiting in the [join queue](/hosting/join-queue/) as the host allows. The launcher writes *The server is full, and so is its queue. Try again later.* | Try again later. |
| `Someone from your address is already in this server's join queue` | As many players from your address are already waiting in the queue as the host allows, one by default. Players on a shared connection all come from one address. The launcher writes *Someone on your network is already in this server's queue.* | Wait until that player gets in, or join from another connection. |
| `You did not join after your turn too often; this server's join queue is closed to you until …` | Your turn in the queue came several times, and you left before reaching the world. The word `until` is followed by the UTC time when the queue opens again. The launcher writes *You did not join when your turn came several times, so this server's queue is closed to you until …* and shows the time in your time zone. | Wait until then. You can join a server with a free slot now. |
| `The server is starting up; join again in a moment.` | The server is still loading its plugins. | Try again in a minute. |
| `Server shutdown` | The server is stopping. Everyone on it gets this. | Wait for the host to bring it back up. |
| `You are banned from this server` | Your address, account or launcher installation is on the server's ban list, and no reason is given. If the host gave one, you see it. | Ask the host. |
| `This server requires a NodeMP account: sign in to the launcher and join again` | The server doesn't let Test Drive in, and you joined without an account. | Sign in: **Settings → Account → Sign in**. Or turn on **No account needed** in the list. |
| `Your join ticket was not accepted (join ticket invalid or expired). Join again from the launcher to get a new one` | NodeMP didn't accept the one-time join ticket; the reason is in parentheses. | Join again. |
| `The server could not verify your account with the directory (…). Try again in a moment` | The server couldn't reach NodeMP to check the account. | Try again a little later. |
| `Resume rejected` | The connection broke and the launcher tried to resume the session, but the server refused: the session had already ended, or the key didn't match. | Join again. |
| `Resume rejected: too many failed attempts, try again later` | Too many failed attempts to resume a session from your address in a short time. | Wait a minute and join again. |
| `This account is banned from NodeMP` | NodeMP banned the account on all servers at once while you were playing. | See the ban window in the launcher ([Bans](/players/sign-in/#bans)). |
| `Disconnected by the NodeMP directory (…)` | NodeMP disconnected your account from the server; the reason code is in parentheses. | Join again. If it repeats, report it on Discord. |
| `Connection refused` | A plugin turned you away and gave no reason. If it gave one, you see it. | Ask the host. |
| `Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | Some game files differ from the game's own list. The number is real. | Verify the game files in Steam. |
| `Your BeamNG install changed while you were playing, and this server requires it to match the game's own file list (1 file differs). …` | The same check, run during the session, found a change. | Undo what you installed and verify the game files. |
| `Game files do not match this server's reference (3 problems). userfolder:vehicles/pickup/pickup.jbeam (overlay), …` | A strict server: your game or user folder differs from the host's clean installation. Up to three examples follow. The launcher shows `Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam`, and under it the first problem in words and a command for the full list. | [A strict server refuses you](/players/troubleshooting/#a-strict-server-refuses-you). |
| `Game files changed while you were playing and no longer match this server's reference (1 problem). …` | The strict check during the session found a change. The launcher shows `Your game files changed while you were playing and no longer match this server's reference (1 problem)`. | Put the files back as they were and join again. |
| `Your launcher checked your BeamNG install against a different reference manifest than this server uses (checked against reference manifest … but this server uses …). Reconnect so it fetches the current one.` | The host replaced the server's reference manifest since your last join. The launcher shows `This server's reference manifest changed — join again`. | Join again. |
| `This server requires the strict check of your BeamNG install, but your launcher ran only 'size'. Update your launcher and try again.` | A strict server got the result of a lighter check. The launcher shows `This server needs a newer launcher — update now`. | **Update now**, or reinstall the launcher from [nodemp.com/download](https://nodemp.com/download). |
| `` This server requires a strict check of your BeamNG install but has no integrity manifest to check it against. Ask the host to run `Node-Server --gen-integrity <gamedir>` and put the file in the server's integrity folder. `` | The host turned on the strict check, but the server has no reference manifest to check against. | Tell the host ([Strict file check](/hosting/strict-verification/)). |
| `This server has integrity manifests for 2 game versions (0.39.4.0, 0.39.3.0) and cannot tell which one you run. Ask the host to keep exactly one manifest in the server's integrity folder.` | The server's manifest folder holds files for several game versions. | Tell the host. |
| `Unknown integrity manifest requested` | The launcher asked for a manifest the server doesn't have, usually because the host replaced it a moment ago. The launcher shows `The server would not send its reference manifest`. | Join a little later. If it repeats, tell the host. |
| `Too many integrity manifest requests` | The launcher asked for the manifest too often in one session. The launcher shows `The server stopped sending its reference manifest (asked too often)`. | Join a little later. If it repeats, reinstall the launcher. |
| `This server requires a check of your BeamNG install, which could not be completed: …` | The check couldn't run; the reason follows the colon. The launcher shows `BeamNG's user folder was not found`, `Could not download the server's reference manifest`, `The server's reference manifest is out of date`, `The server asked for a strict check without a usable reference manifest`, `The server asked for too many game-file checks at once` or `Your game files could not be checked`. | Follow the advice under the message and join again. |
| `Kicked`, `Kicked by the server`, `Kicked by module` | A plugin, the server console or a native module removed you and gave no reason. | Ask the host. |
| `Banned` | A plugin banned you and gave no reason. | Ask the host. |
| `Packet rate limit exceeded` | Your game sent packets faster than the server allows. | Join again. If it repeats, report it. |
| `Disconnected after failing to receive packets` | The server couldn't deliver data to you. | Join again. |
| `TCP send of MODS_INFO failed` | The server couldn't send the mod list: the connection was already gone. | Join again. |
| `Expected HELLO`, `Malformed HELLO`, `Expected IDENTITY after HELLO`, `Unknown packet type during handshake`, `Frame length cap exceeded`, `Per-type body cap exceeded`, `Malformed frame`, `Packet decode failed`, `Sent a compressed packet that does not decompress`, `Malformed game verification report`, `Unexpected packet while waiting in the join queue` | The launcher sent something the server doesn't accept. Only a modified or broken launcher does this. | Reinstall the launcher from [nodemp.com/download](https://nodemp.com/download). |

*Session ended* with no reason means BeamNG.drive was closed.

## Helper exit codes

If the [helper](/players/troubleshooting/#the-launchers-traffic-helper) ends with an error, the launcher shows *The launcher's traffic helper stopped* and the last line of its log, and **Details** start with `exit code` and the number. The full log is `%LOCALAPPDATA%\NodeMP\helper\logs\launcher.log`.

| Code | Last log line | What it means | What to do |
|---|---|---|---|
| `0` | `game closed - launcher closing soon` | BeamNG.drive was closed and the session ended. | Nothing. |
| `1` | `Launcher.cfg is there but cannot be read; check its permissions, or delete it to start from the defaults`, `Launcher.cfg is not valid JSON; fix it, or delete it to start from the defaults` | The helper's settings file is unreadable or damaged. | Delete `Launcher.cfg`, and the helper writes a new one. |
| `1` | `Cannot create the mod cache …: …. Point CacheDirectory in Launcher.cfg at a folder you can write to.` | The folder for downloaded mods can't be created. | Fix the folder's permissions, or set `CacheDirectory` in `Launcher.cfg`. |
| `2` | `BeamNG.drive was not found. Choose its folder (the launcher's Settings > Game, or --game-dir), or start the game once so it records where it is.` | The game isn't found. The helper ends after 10 seconds. | Set the folder in **Settings → Game**, or start the game through Steam once. |
| `2` | `The game could not be started (through Steam, or by its executable); the launcher closes in 5 s.` | Neither Steam nor the game's own executable started the game. | Verify the game files in Steam and check the path in **Settings → Game**. |
| `5` | `Another Node-Launcher is already running on port 4444 - closing` | A second helper was started while the first is running. | Close the first one, or BeamNG.drive along with it, and try again. |
| `6` | `port 4444 is in use by another program …` | Another program holds the local port the game uses to talk to the helper. | Close it. The message names a command that shows which program it is. |

The helper can also run the game-file check on its own: the **Copy** button under a strict server's refusal gives the command. It exits with `0` if everything is clean (`game files verified: …`), `1` if there are differences (`game files DIFFER: …`) and `2` if the check couldn't run (`cannot read the manifest file …`, `not a reference manifest: …`, `could not check: …`).
