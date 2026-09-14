---
title: Troubleshooting
description: Every launcher message from a failed join with its cause and fix, where the logs are, and how testers point the launcher at another directory.
---

The launcher reports problems as toasts at the bottom of its window; a toast stays for a few
seconds. Each message starts with a prefix that says which part failed:

| Prefix | Who failed |
|---|---|
| `Could not join · …` | The client mod check, with no usable `NodeMP.zip` on disk. |
| `Could not start the launcher · …` | The helper process could not be started. |
| `Could not connect · …` | The helper could not reach the server. |
| `Disconnected · …` | The server refused or ended the session; the text is the reason it gave. |
| `The launcher stopped · …` | The helper exited during the join; the text is the last line of its log. |
| `Session ended · …` | The game was already running when the session ended. |

## Joining fails

Every `Could not join · …` message means there is no `NodeMP.zip` on disk yet; once one is
installed, the same failures show as `Client mod could not be updated · joining with the
installed copy` instead.

| Message | Cause | Fix |
|---|---|---|
| `Could not join · client mod is not installed and the directory is unreachable` | First join with no `NodeMP.zip` yet, and `https://api.nodemp.com` did not answer or published an unusable release. | Get online, join again; if it persists the directory is at fault, try later. |
| `Could not join · client mod is not installed and no release has been published yet` | First join; the directory has no client mod release yet. | Wait for a release. |
| `Could not join · could not start the download: …`, `… the download server returned 503 Service Unavailable`, `… the download stopped: …`, `… the download was N bytes, the release says M`, `… the download is larger than the release says` | First join; the release file host (not the directory) could not be reached or the transfer broke. | Check your connection and any VPN or proxy, join again. |
| `Could not join · the downloaded client mod does not match the published checksum` | The download was corrupted. | Join again. |
| `Could not join · cannot create …\mods\multiplayer: …`, `… could not create …\NodeMP.zip.part: …`, `… could not write …`, `… could not finish …`, `… could not read …\NodeMP.zip.part: …`, `… hashing …\NodeMP.zip.part was interrupted: …` | BeamNG's user folder is not writable, or the disk is full. | Free space; check permissions on `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\mods\multiplayer\`. |
| `Could not join · LOCALAPPDATA is not set, so BeamNG's user folder cannot be found` | The environment variable is missing. | Fix the user environment; sign out of Windows and in again. |
| `Client mod could not be updated · joining with the installed copy` | The check failed, but an older `NodeMP.zip` exists. Not an error by itself. | If the server refuses the old mod: **Settings → Launcher → Check now** with BeamNG closed. |
| `Could not check the client mod · could not replace …\NodeMP.zip (is BeamNG.drive running?): …` | BeamNG.drive has the zip open. | Close the game, then *Check now*. |
| `Could not start the launcher · could not start …\nodemp-launcher.exe: …` | Antivirus or a policy blocked the helper process. | Allow `nodemp-launcher.exe`, or reinstall from [nodemp.com/download](https://nodemp.com/download). |
| `The launcher stopped · … Failed to find the game please launch it. Report this if the issue persists code 8` | The helper could not find BeamNG.drive. | Start the game once through Steam, or set the folder in **Settings → Game**. |
| `The launcher stopped · … Failed to Launch the game! launcher closing soon.` | `Bin64\BeamNG.drive.x64.exe` would not start, through Steam either. | Verify the game files in Steam; check **Settings → Game**. |
| The step stays on `Starting BeamNG.drive` or `Loading BeamNG.drive` | The launcher waits up to four minutes for BeamNG's window; a cold start can take that long. | Wait. If the game never appears, read `launcher.log` (below). |
| `Could not connect · Could not reach the server` | Nothing answers at `host:port`: server down, port closed, firewall. | Refresh the list; the host checks `30814` TCP and UDP. |
| `Could not connect · DNS Lookup Failed` | The hostname in a Direct Connect address does not resolve. | Check the spelling, or use the IP. |
| `Could not connect · server certificate fingerprint mismatch` | The certificate of a server you joined by address changed; the pin is per `host:port`. | If the host confirms the change, delete the server's entry from `known_servers.json` in the cache folder (**Settings → Launcher → Downloaded content → Open**). |
| `Disconnected · Protocol version mismatch: launcher speaks v17, server speaks v16 - update the outdated side` | Launcher and server speak different wire protocol versions. | With launcher 1.0.0 the server is outdated; tell its host. |
| `Disconnected · This server requires a NodeMP account: sign in to the launcher and join again` | You are in Test Drive and the server refuses guests (*Account required*). | **Settings → Account → Sign in**, or filter by *No account needed*. |
| `Disconnected · Your join ticket was not accepted (join ticket invalid or expired). Join again from the launcher to get a new one` | A ticket is single-use and expires within a minute; a join from another IP fails too. | Join again from the launcher. |
| `Disconnected · The server could not verify your account with the directory (…). Try again in a moment` | The server could not reach the directory. | Try again in a moment. |
| `Disconnected · Server full!`, `Disconnected · You are banned from this server`, `Disconnected · The server is still starting, please try joining again later.` | What they say. | Filter by *Free slots*; ask the host; wait a minute. |
| `Disconnected · Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | The server checks game files and yours differ from the game's manifest. | Verify the game files in Steam. |
| `Disconnected · Invalid mod "…"`, `Disconnected · Failed to verify "…"`, `Disconnected · Server cannot find …` | A content file the server announced is broken or missing on the server. | Tell the host. Removing the file in **Content** forces a fresh download. |

If the game was already on screen, the same reason also arrives as `Session ended · …`, and
the game shows *The session has ended* with it. Every reason a server can send is listed in
[Error codes](/reference/error-codes/).

## Signing in

| Message | Cause | Fix |
|---|---|---|
| `Enter a username and a password of at least four characters.` | The form's own check. | Fill both fields. |
| `invalid username or password` | Wrong credentials. | Reset the password at [nodemp.com/forgot](https://nodemp.com/forgot). |
| `please verify your e-mail first` | The verification link was not opened. | Open it; it expires after a short while, so register again under another name if it is gone. |
| `username must be 3-24 chars [A-Za-z0-9_-]`, `password must be 8-200 chars`, `already exists` | The directory's rules for a new account. | Pick another name or a longer password. |
| `two-factor code required or invalid` | The account has two-factor authentication on; launcher 1.0.0 has no field for the code. | Play as Test Drive, or use an account without two-factor. |
| `could not reach the directory: …` | No connection to `https://api.nodemp.com`. | Check your connection and any VPN. |

## The server list is empty

- **No connection** screen (`NodeMP cannot reach its server list. Check that you are online —
  and if you use a VPN for a test server, that it is connected.`): the directory did not answer
  at start-up. *Try again*, or *Continue without the list*; Direct Connect still works. While
  it is down, Refresh reports `Could not reach NodeMP at https://api.nodemp.com`.
- `No servers online` / `Nobody is hosting right now.`: the directory answered with an empty
  list. Nothing is wrong on your side.
- `Nothing matches these filters`: open **Filters** and press *Reset*. Favorites and Recent only
  show servers that are online now.
- A server you know is running but cannot see is private, unlisted (no server key) or has
  stopped sending beacons. Join it through Direct Connect.

`could not remove …: …` in the Content view means BeamNG.drive is holding the archive; close
the game and remove again.

## Logs

- **Helper log** — `launcher.log` records one session: game detection, the connection, content
  downloads and why the session ended. **Settings → Launcher → Logs → Open** opens its folder:

  ```
  %LOCALAPPDATA%\com.nodemp.launcher\helper\logs\launcher.log
  ```

  The file is rewritten at every join, so copy it before you try again. Its parent folder,
  `%LOCALAPPDATA%\com.nodemp.launcher\helper\`, holds the helper's `Launcher.cfg` and its
  `cache\` of downloaded content (the folder **Downloaded content → Open** shows), including
  `known_servers.json` with the TLS pins.
- **Launcher window** — the interface writes no log file. What it knows is in the toast, and the
  last helper log line in `The launcher stopped · …`.
- **BeamNG** — `beamng.log` in the game's user folder,
  `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\`, carries the client mod's lines (tag `node.`).
  The in-game **Diagnostics console** (Options → NodeMP → Tools) shows the session live.

When you report a problem, attach `launcher.log`, the exact toast text and the server's name.

## Advanced: another directory

Testers running their own directory can repoint the launcher. In order of precedence:

1. The environment variable `NODEMP_API_BASE`, for example `http://localhost:8080`.
2. A file `directory.url` beside `nodemp-launcher.exe` in `%LOCALAPPDATA%\NodeMP`: one line
   with the base URL; lines starting with `#` are comments. The launcher never writes this file;
   a leftover from a launcher before 1.0.0 is removed on start.
3. The built-in `https://api.nodemp.com`.

The address in use appears in the toast `Could not reach NodeMP at …` when the list cannot be
loaded. `NODEMP_LAUNCHER=C:\dev\launcher\bin\Release\Node-Launcher.exe` makes the launcher start a separate helper executable instead
of its built-in one; it is for people building the helper themselves.
