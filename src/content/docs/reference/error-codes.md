---
title: Error codes
description: Every text a failed join can show - launcher messages, helper exit codes and the refusals a server sends - with its meaning, the action and the fix.
---

NodeMP has no numbered error codes. What you see is text from one of three places: a toast in
the launcher window, the last line of the helper's log, or the reason a server gave when it
refused or ended a session. This page is the index of those texts, quoted exactly as the code
prints them; `…` stands for a part that varies. The longer explanations are in
[Troubleshooting](/players/troubleshooting/), and each row links to its section there.

## Launcher messages

The launcher (`nodemp-launcher.exe`) shows a toast for a few seconds. The text before ` · ` names
the stage that failed; the text after it is the reason, taken word for word from the component
that failed. Sign-in messages appear in the sign-in form instead of a toast.

| Message | Meaning | Action | Details |
|---|---|---|---|
| `Could not join · client mod is not installed and the directory is unreachable` | First join with no `NodeMP.zip` on disk, and `https://api.nodemp.com` did not answer or published an unusable release. | Get online and join again; if it persists, wait for the directory. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Could not join · client mod is not installed and no release has been published yet` | First join; the directory has no client mod release yet. | Wait for a release. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Could not join · could not start the download: …`, `… the download server returned 503 Service Unavailable`, `… the download stopped: …`, `… the download was N bytes, the release says M`, `… the download is larger than the release says` | The release file host could not be reached or the transfer broke. | Check your connection, VPN and proxy; join again. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Could not join · the downloaded client mod does not match the published checksum` | The download was corrupted. | Join again. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Could not join · cannot create …\mods\multiplayer: …`, `… could not create …\NodeMP.zip.part: …`, `… could not write …`, `… could not finish …`, `… could not read …\NodeMP.zip.part: …`, `… hashing …\NodeMP.zip.part was interrupted: …` | BeamNG's user folder is not writable, or the disk is full. | Free space; check permissions on `mods\multiplayer\`. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Could not join · LOCALAPPDATA is not set, so BeamNG's user folder cannot be found` | The environment variable is missing. | Fix the user environment; sign out of Windows and in again. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Client mod could not be updated · joining with the installed copy` | One of the checks above failed, but an older `NodeMP.zip` exists. Not an error by itself. | If the server refuses the old mod: **Settings → Launcher → Check now** with BeamNG closed. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Could not check the client mod · …` | The start-up check or *Check now* failed. The text after ` · ` is one of the reasons above, or `could not replace …\NodeMP.zip (is BeamNG.drive running?): …` when the game holds the zip open. | Close BeamNG.drive, then *Check now*. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Client mod check failed` | The progress line during a join, not a toast: the check failed and the join goes on with the installed copy or ends with `Could not join · …`. | See the toast that follows. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Could not start the launcher · could not start …\nodemp-launcher.exe: …` | Windows refused to start the helper process (antivirus, policy). | Allow `nodemp-launcher.exe`, or reinstall from [nodemp.com/download](https://nodemp.com/download). | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Could not start the launcher · cannot locate app data: …`, `… cannot create …\helper: …` | The helper's data folder under `%LOCALAPPDATA%\com.nodemp.launcher\` could not be created. | Check permissions and free space. | [Logs](/players/troubleshooting/#logs) |
| `Could not start the launcher · "…" is not a host:port address` | The address handed to the helper has no port. | Type the address as `host:port`. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Could not start the launcher · NODEMP_LAUNCHER points at …, which is not a file`, `… this build has no traffic helper compiled in, and no Node-Launcher.exe was found in the build tree` | Developer builds only: the `NODEMP_LAUNCHER` override points nowhere, or the interface was built without the helper linked in. | Fix the variable, or build the helper. | [Advanced](/players/troubleshooting/#advanced-another-directory) |
| `The launcher stopped · …`, `The launcher stopped` | The helper exited during the join; the text is the last line of its log. | Read the [helper exit codes](#helper-exit-codes) below. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Could not connect · Could not reach the server` | Nothing answers at `host:port`: server down, port closed, firewall. | Refresh the list; the host checks `30814` TCP and UDP. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Could not connect · DNS Lookup Failed`, `Could not connect · WSA failed to start` | The hostname in a Direct Connect address does not resolve; Winsock could not be initialised. | Check the spelling, or use the IP; restart Windows for the second. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Could not connect · server certificate fingerprint mismatch` | The certificate of a server you joined by address changed; the pin is per `host:port`. | If the host confirms the change, delete the entry from `known_servers.json`. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Could not connect · TLS handshake failed: …`, `… TLS context creation failed: …`, `… TLS session creation failed: …`, `… TLS socket binding failed: …`, `… server presented no certificate` | Something other than a NodeMP server answered on that port, or the connection was cut during the TLS handshake. | Check the address and port; try again. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Disconnected · …` | The server refused or ended the session. The text after ` · ` is a reason from the [server table](#server-refusals-and-kick-reasons) below, or one of the helper's own session errors in the next three rows. | Read the reason. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Disconnected · Invalid mod "…"`, `… Failed to verify "…"`, `… Server cannot find …`, `… Server refused … (protected)`, `… Server failed to read …`, `… Mod '…' is protected and therefore must be placed in the cache folder manually here: …`, `… Received corrupted download confirmation, aborting download.`, `… Download announcement does not match the mod list, aborting download.` | Content sync failed: a zip the server announced is broken, missing or protected on the server, or its transfer did not match the announcement. | Tell the host. Removing the file in **Content** forces a fresh download. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Disconnected · Authentication failed!`, `… Unexpected reply after the welcome`, `… Unexpected reply to the mod list request`, `… Unknown packet from server during handshake` | The server answered the handshake with a packet the helper did not expect. | Update the launcher; if the server is outdated, tell its host. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Disconnected · Socket Closed Code 1`, `… Socket Closed Code 2`, `… Socket Closed Code 3`, `… Socket Closed Code 5`, `… Invalid Socket`, `… Oversized frame from server`, `… Malformed frame from server`, `… Corrupt compressed frame from server` | The TCP link to the server broke or carried a frame the helper could not read: the server stopped, a NAT or VPN dropped the connection, or the network is unstable. | Join again; check the connection. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Session ended · …`, `Session ended` | The game was already running when the session ended. The text is the server's reason, or the last helper log line when the helper exited with an error; `Session ended` alone means BeamNG.drive was closed. The game shows *The session has ended* with the same text. | Pick the next server. | [Joining fails](/players/troubleshooting/#joining-fails) |
| `Connection cancelled` | You cancelled the join (Escape). Not an error. | Nothing. | [Joining](/players/join/#joining) |
| `Could not reach NodeMP at https://api.nodemp.com`, `Could not reach NodeMP` | Refresh could not load the server list; the URL is the directory in use. | Check your connection and VPN. | [The server list is empty](/players/troubleshooting/#the-server-list-is-empty) |
| `NodeMP cannot reach its server list. Check that you are online — and if you use a VPN for a test server, that it is connected.` | The *No connection* screen: the directory did not answer at start-up. | *Try again*, or *Continue without the list*; Direct Connect still works. | [The server list is empty](/players/troubleshooting/#the-server-list-is-empty) |
| `could not remove …: …`, `… is no longer in the cache`, `… is not a cached content file` | Deleting a file in **Content** failed; the first means BeamNG.drive holds the archive. | Close the game and delete again. | [The server list is empty](/players/troubleshooting/#the-server-list-is-empty) |
| `Enter a username and a password of at least four characters.` | The sign-in form's own check. | Fill both fields. | [Signing in](/players/troubleshooting/#signing-in) |
| `invalid username or password`, `please verify your e-mail first`, `two-factor code required or invalid` | The directory's answer to a sign-in. | Reset the password at [nodemp.com/forgot](https://nodemp.com/forgot); open the verification link; use an account without two-factor. | [Signing in](/players/troubleshooting/#signing-in) |
| `username must be 3-24 chars [A-Za-z0-9_-]`, `password must be 8-200 chars`, `already exists` | The directory's rules for *Create an account*. | Pick another name or a longer password. | [Signing in](/players/troubleshooting/#signing-in) |
| `could not reach the directory: …`, `the directory returned 503 Service Unavailable`, `unexpected reply from the directory: …`, `too many requests, slow down` | No connection to `https://api.nodemp.com`, an error on its side, or too many attempts in a row. | Check your connection and VPN; wait a moment. | [Signing in](/players/troubleshooting/#signing-in) |
| `could not save the sign-in: …`, `could not reach the credential store: …`, `Could not sign in. Try again.` | Windows Credential Manager refused the sign-in token, or the failure had no text. | Sign in again; until the store works, the sign-in is not remembered across restarts. | [Signing in](/players/troubleshooting/#signing-in) |

## Helper exit codes

The helper is the C++ traffic process linked into the launcher and run as
`nodemp-launcher.exe --helper`. When it exits during a join, the launcher shows
`The launcher stopped · …` with the last line of its log; when it exits while you are in the game,
the window returns with `Session ended · …`. The number itself is never shown: it is the process
exit code, visible only when you start the helper from a terminal yourself. The full log is
`%LOCALAPPDATA%\com.nodemp.launcher\helper\logs\launcher.log`, rewritten at every start.

| Code | Last log line | Meaning | Action |
|---|---|---|---|
| `0` | `game closed - launcher closing soon` | BeamNG.drive was closed. The helper ends the session, waits 5 s and exits. | Nothing; the launcher window returns with `Session ended`. |
| `0` | none; `Node-Launcher 1.0.0 proto 17` or the `USAGE:` text on stdout | `--version` or `--help` was asked for. | Nothing. |
| `1` | `Cannot get Local Appdata directory` | Windows did not return the Local AppData folder, so BeamNG's user folder cannot be resolved. | Check the Windows account; `%LOCALAPPDATA%` must be set. |
| `1` | `Config failed to parse make sure it's valid JSON!`, `Failed to open Launcher.cfg!`, `Failed to write config on disk!` | `Launcher.cfg` in the helper folder is corrupt, locked or the folder is read-only. | Delete `Launcher.cfg` (it is regenerated) or fix the permissions on `%LOCALAPPDATA%\com.nodemp.launcher\helper\`. |
| `1` | `Failed to create caching directory: …. This is a fatal error. Please make sure to configure a directory which you have permission to create, read and write from/to.` | The `cache\` folder could not be created. | Fix the permissions, or `CacheDirectory` in `Launcher.cfg`. |
| `1` | `failed to create HKEY_CURRENT_USER\Software\Valve\Steam\Apps\284160`, `failed to create the value "Name" under HKEY_CURRENT_USER\Software\Valve\Steam\Apps\284160` | Wine or Proton only: the registry patch the helper applies there failed. | Give the helper write access to the registry. |
| `1` | `Exception in main(): …`, then `closing in 5 seconds` | An unhandled error during start-up, before the game was started. | Read the lines above it in `launcher.log`. |
| `2` | `Failed to find the game please launch it. Report this if the issue persists code 8` | No BeamNG.drive install was found in **Settings → Game**, `BeamNG.Drive.ini`, the BeamNG and Steam registry keys or Steam's library folders. `8` is the code of that search and the only number the helper prints. The helper exits after 10 s. | Start the game once through Steam, or set the folder in **Settings → Game**. |
| `2` | `Failed to Launch the game! launcher closing soon.` | `Bin64\BeamNG.drive.x64.exe` could not be started, and asking Steam (`steam://run/284160`) did not bring the game up either. The helper exits after 5 s. | Verify the game files in Steam; check **Settings → Game**. |

Every `1` above is a fatal log line: the helper waits a few seconds so the line can be read (5 s;
3 s for the cache folder), then exits.

## Server refusals and kick reasons

A server refuses or ends a session with a `Kick` frame that carries one line of text. During a
join the launcher shows it as `Disconnected · …`; once you are in the game it arrives as
`Session ended · …` and the game shows the dialog *The session has ended* with the same line. The
server logs the same text as `<name> kicked — <reason>`. Plugins may send any text of their own;
the rows below are the texts built into `Node-Server` 1.0.0 and the defaults of the plugin API.

| Reason | When | What to do |
|---|---|---|
| `Protocol version mismatch: launcher speaks v17, server speaks v16 - update the outdated side` | Launcher and server speak different wire protocol versions; the two numbers are the live values. | With launcher 1.0.0 the server is behind: tell its host. |
| `Server full!` | `[General] MaxPlayers` is reached. | Filter by *Free slots*, or wait. |
| `The server is still starting, please try joining again later.` | The server was still loading modules and resources; the handshake was held for a while and the hold ran out. | Try again in a minute. |
| `Server shutdown` | The server is stopping; also sent to everyone in the session when it shuts down. | Wait for the host to bring it back. |
| `You are banned from this server` | Your IP or account is in the server's `bans.json` without a stored reason. A ban with a reason shows that reason instead. | Ask the host. |
| `This server requires a NodeMP account: sign in to the launcher and join again` | `[Directory] TestDrive = false`: you joined as Test Drive, or without a join ticket. | **Settings → Account → Sign in**, or filter by *No account needed*. |
| `Your join ticket was not accepted (join ticket invalid or expired). Join again from the launcher to get a new one` | The directory rejected the ticket; the parentheses carry the directory's own message. A ticket is single-use, expires within a minute and is bound to your IP. | Join again from the launcher. |
| `The server could not verify your account with the directory (…). Try again in a moment` | The server could not ask the directory; the parentheses name why, for example `no directory session (the directory is unreachable or this server has just started)`. A server with `RedeemFailOpen = true` and Test Drive allowed admits you unverified instead. | Try again in a moment. |
| `Connection refused` | A plugin vetoed `onPlayerConnectRequest` without giving a reason; with a reason, that reason is shown. | Ask the host. |
| `Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | `[General] VerifyGame` is `size`, `scripts` or `full` and your install differs from the game's manifest. The count is live. | Verify the game files in Steam. |
| `Your BeamNG install changed while you were playing, and this server requires it to match the game's own file list (1 file differs). …` | The same check, repeated during the session, found a change. | Undo what you installed; verify the game files. |
| `This server requires a check of your BeamNG install, which could not be completed: …` | The helper could not run the check the server asked for; the text after the colon says why. | Read the detail, then try again. |
| `Kicked` | `player:kick()` from a resource with no reason given. A native module calling `kick_player` with no reason sends `Kicked by module`. | Ask the host. |
| `Banned` | `player:ban()` or `node.bans.add()` with no reason given; the ban is stored with that text. | Ask the host. |
| `Packet rate limit exceeded` | Your client sent TCP packets faster than the server's flood limit allows. | Join again; report it if it repeats. |
| `Disconnected after failing to receive packets` | The server could not deliver an event or module packet to you. | Join again. |
| `Expected HELLO`, `Malformed HELLO`, `Expected IDENTITY after HELLO`, `Unknown packet type during handshake`, `Frame length cap exceeded`, `Per-type body cap exceeded`, `Malformed frame`, `Packet decode failed`, `Sent invalid compressed packet (this is likely a bug on your end)`, `Malformed game verification report` | The launcher sent something the server does not accept. Only a modified or broken launcher does that. | Reinstall the launcher from [nodemp.com/download](https://nodemp.com/download). |

Hosts: the reasons a plugin can send are described in [Recipes](/plugins/recipes/); the
`VerifyGame` levels are in [Configuration](/hosting/configuration/).
