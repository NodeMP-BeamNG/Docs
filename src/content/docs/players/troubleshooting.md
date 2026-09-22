---
title: Troubleshooting
description: Every launcher message from a failed join with its cause and fix, where the logs are, and how testers point the launcher at another directory.
---

The launcher reports problems as toasts at the bottom of its window; a toast stays for a few
seconds. Each message starts with a prefix that says which part failed. Two of them say "the
launcher" and mean the **helper**: the part of the launcher that starts the game and holds the
connection while you play, the same `nodemp-launcher.exe` run a second time without a window. Its
log is `launcher.log` ([Logs](#logs)); the launcher window itself is what shows you the toast.

| Prefix | Who failed |
|---|---|
| `Could not join · …` | Either the client mod check, with no usable `NodeMP.zip` on disk, or a server refusal the launcher explains in its own words: the strict game-file check, the reference manifest, an outdated launcher or server. |
| `Could not start the launcher · …` | The helper process could not be started. |
| `Could not connect · …` | The helper could not reach the server. |
| `Disconnected · …` | The server refused or ended the session; the text is the reason it gave, word for word. |
| `The launcher stopped · …` | The helper exited during the join; the text is the last line of its log. |
| `Session ended · …` | The game was already running when the session ended. |

Every text below is quoted as the software prints it, so you can search this page for it. The
same texts, one line each, are indexed on [Error codes](/reference/error-codes/).

## Joining fails

A `Could not join · …` message about the client mod means there is no `NodeMP.zip` on disk yet;
once one is installed, the same failures show as `Client mod could not be updated · joining with
the installed copy` instead. A `Could not join · …` message about your game files, the server's
reference manifest or the launcher version is a server refusal rewritten by the launcher; those
rows quote both the launcher's line and the server's own reason, which the panel under the
server's card explains with what to do. Everything else a server sends arrives as
`Disconnected · …` with the server's text.

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
| `The launcher stopped · … Failed to find the game please launch it. Report this if the issue persists code 8` | The helper could not find BeamNG.drive in any of the places it looks (**Settings → Game**, `BeamNG.Drive.ini`, the registry, Steam's library folders). `code 8` is the helper's own number for that search, not an error code to look up. | Start the game once through Steam, or set the folder in **Settings → Game**. |
| **Settings → Game** says `Could not find a BeamNG.drive install. Browse to it, or launch the game once so Steam writes its path.` | Not a toast: the launcher's own search found no install. A join would end with the `code 8` line above. | **Browse** to the folder that contains `Bin64\BeamNG.drive.x64.exe`, or start the game once through Steam and press **Find it**. |
| **Settings → Game** says `No Bin64\BeamNG.drive.x64.exe in this folder` | You browsed to a folder that is not the game's root. | Pick the folder that contains `Bin64\` (the one with `integrity.json` in it). |
| `The launcher stopped · … Failed to Launch the game! launcher closing soon.` | Neither Steam nor `Bin64\BeamNG.drive.x64.exe` brought the game up. | Verify the game files in Steam; check **Settings → Game**. |
| The step stays on `Starting BeamNG.drive` or `Loading BeamNG.drive` | The launcher waits up to four minutes for BeamNG's window; a cold start can take that long. | Wait. If the game never appears, read `launcher.log` (below). |
| `Could not connect · Could not reach the server` | Nothing answers at `host:port`: server down, port closed, firewall. | Refresh the list; the host checks `30814` TCP and UDP. |
| `Could not connect · DNS Lookup Failed` | The hostname in a Direct Connect address does not resolve. | Check the spelling, or use the IP. |
| `Could not connect · server certificate fingerprint mismatch` | The certificate of a server you joined by address changed; the pin is per `host:port`. | If the host confirms the change, delete the server's entry from `known_servers.json` in the cache folder (**Settings → Launcher → Downloaded content → Open**). |
| `Could not join · This server needs a newer launcher — update from the Download page` | The server speaks a newer wire protocol than this launcher. The server's reason is `Protocol version mismatch: launcher speaks v17, server speaks v23 - update the outdated side`, with the live numbers; launcher 1.1.11 speaks v23. | Install the current launcher from [nodemp.com/download](https://nodemp.com/download); the panel under the server's card has an *Open the Download page* button. |
| `Could not join · This server runs an older NodeMP server (protocol v21; this launcher speaks v22)` | The same mismatch the other way round: the server is behind the launcher. | Nothing on your side; the host has to update the server. |
| `Disconnected · This server requires a NodeMP account: sign in to the launcher and join again` | You are in Test Drive and the server refuses guests (*Account required*). | **Settings → Account → Sign in**, or filter by *No account needed*. |
| `Disconnected · Your join ticket was not accepted (join ticket invalid or expired). Join again from the launcher to get a new one` | A ticket is single-use and expires within a minute; a join from another IP fails too. | Join again from the launcher. |
| `Disconnected · The server could not verify your account with the directory (…). Try again in a moment` | The server could not reach the directory. | Try again in a moment. |
| `Disconnected · Server full!`, `Disconnected · You are banned from this server`, `Disconnected · The server is still starting, please try joining again later.` | What they say. | Filter by *Free slots*; ask the host; wait a minute. |
| `Disconnected · Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | The server checks game files and yours differ from the game's manifest. | Verify the game files in Steam. |
| `Could not join · Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam` | A **strict** server: your install or your BeamNG user folder differs from the server's reference of a clean game. The count and the path are live; the server's reason is `Game files do not match this server's reference (3 problems). userfolder:vehicles/pickup/pickup.jbeam (overlay), …`. The panel under the server's card names the first problem in words (`vehicles/pickup/pickup.jbeam — in the BeamNG user folder, overrides the game's files`), says what to do about it, and offers the diagnostic command with a *Copy* button. | Follow the panel, then run the diagnostic in [Strict servers](#strict-servers) below to see the whole list. |
| `Could not join · This server's reference manifest changed — join again` | The launcher checked against a cached reference the server no longer uses (the host regenerated it). The server's reason is `Your launcher checked your BeamNG install against a different reference manifest than this server uses (…). Reconnect so it fetches the current one.` | Join again; the launcher fetches the current manifest. |
| `Disconnected · This server requires a strict check of your BeamNG install but has no integrity manifest to check it against. …`, `Disconnected · This server has integrity manifests for 2 game versions (…) and cannot tell which one you run. …` | The server is set to strict but has no reference, or more than one. Nothing is wrong on your side. | Tell the host. |
| `Could not join · BeamNG's user folder was not found` | Strict needs the game's user folder; `startup.ini` or `BeamNG.Drive.ini` points it somewhere that does not exist. The server's reason is `This server requires a check of your BeamNG install, which could not be completed: the game's user folder … does not exist`. | Fix the path in that file, or start the game once so the folder is created. |
| `Could not join · Could not download the server's reference manifest`, `Could not join · The server's reference manifest is out of date`, `Could not join · Your game files could not be checked` | The strict check could not run: the manifest transfer failed (for example `the server sent nothing for 30 s during the manifest transfer`), the server's reference is in an outdated format, or something else the panel names. The server's reason starts with `This server requires a check of your BeamNG install, which could not be completed: …`. | Join again; if it repeats, tell the host, attaching `launcher.log`. |
| `Could not join · The server would not send its reference manifest`, `Could not join · The server stopped sending its reference manifest (asked too often)` | The server refused the manifest transfer (`Unknown integrity manifest requested`, `Too many integrity manifest requests`). A current launcher asks only for the id the server named and only once, so this points at a replaced manifest on the host's side or a broken launcher. | Join again in a moment; if it keeps happening, tell the host or reinstall the launcher. |
| `Disconnected · Invalid mod "…"`, `Disconnected · Failed to verify "…"`, `Disconnected · Server cannot find …` | A content file the server announced is broken or missing on the server. | Tell the host. Removing the file in **Content** forces a fresh download. |

If the game was already on screen, the same reason also arrives as `Session ended · …`, and
the game shows *The session has ended* with it. Every reason a server can send is listed in
[Error codes](/reference/error-codes/).

## Strict servers

A server with `VerifyGame = "strict"` compares your whole BeamNG install — the game folder,
every archive's table of contents and your BeamNG user folder — with a reference of a clean
install of the game version it runs ([Strict verification](/hosting/strict-verification/)
explains what the host set up). Two more steps appear while you join,
`Downloading the server's integrity manifest` (once; the file is cached) and
`Checking game files`, and a mismatch refuses you with
`Could not join · Your game files do not match this server's reference (N problems) · <path>`
(the server's reason, `Game files do not match this server's reference (N problems). …`, carries
up to three examples; the panel under the server's card explains the first one). The launcher
keeps checking during the session, so a change you make while playing ends it with
`Session ended · Your game files changed while you were playing and no longer match this server's reference (N problems)`.

The usual causes on an unmodified game are files the check cannot tell from a modification:

- **Leftovers of unpacked mods in the user folder** — `vehicles\<model>\info_*.json`,
  `*.materials.json`, `*.jbeam` under `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\vehicles\`,
  left behind after a mod was removed from `mods\`. Only saved configurations
  (`vehicles\<model>\<name>.pc` with their `.png`/`.jpg` previews) and the game's own
  `main.materials.json` placeholders, which the engine writes under `vehicles\` and `art\` by
  itself, are allowed there; any other `*.materials.json` is a leftover.
- **Your own levels or particles** — a level under `current\levels\`, an edited
  `current\lua\common\particles.json`, anything under `current\lua\`, `ui\`, `art\` or `scripts\`
  that is not the game's. Move it out while you play on a strict server; `mods\` and the editors'
  own save folders are not checked.
- **Files added to the game folder** — a launcher or tool copied next to `BeamNG.drive.exe`, a
  mod installed into the install instead of the user folder. Anything the reference does not list
  counts, logs, the shader cache and Windows' own `desktop.ini` excepted.
- **A game version other than the server's** — after a BeamNG update, until the host regenerates
  the reference (or until you update): the examples then name game files such as
  `/Bin64/BeamNG.drive.x64.exe (hash)`.
- **A changed game archive** — a `.zip` under `content\` repacked or edited: verify the game files
  in Steam.

The refusal shows three examples. To see the whole list, run the same check yourself: it is built
into the launcher as `--integrity-check`, takes the reference the server sent (cached under
`%LOCALAPPDATA%\com.nodemp.launcher\helper\cache\integrity\<id>.manifest`; one file per reference
you have fetched), and prints every problem. The easiest way to get the command is the panel
under the server's card after a refusal: its **Copy** button gives it with the right file filled
in. Typed by hand, `<id>` is the 64-character name of the manifest file, and with several files
in that folder the newest one is normally the reference of the server you were just refused by.
From a Command Prompt, with BeamNG closed:

```
cd %LOCALAPPDATA%\com.nodemp.launcher\helper
%LOCALAPPDATA%\NodeMP\nodemp-launcher.exe --helper --data-dir %LOCALAPPDATA%\com.nodemp.launcher\helper --integrity-check cache\integrity\<id>.manifest
echo %ERRORLEVEL%
```

(`--helper` turns the launcher executable into the helper; `--data-dir` and the working
directory are what the launcher itself passes, so the check reads the same `Launcher.cfg` as a
join. Add `--game-dir <folder>` when **Settings → Game** names a folder, as the launcher does;
`--user-path <folder>` overrides the user folder. A standalone `Node-Launcher.exe` build takes
the same options without `--helper`.) The output, also written to `launcher.log`, looks like
this:

```
integrity check (strict) against C:\Users\you\AppData\Local\com.nodemp.launcher\helper\cache\integrity\e326499d….manifest
  game folder  C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive
  user folder  C:\Users\you\AppData\Local\BeamNG\BeamNG.drive\current
  launcher     exe C:\Users\you\AppData\Local\NodeMP\nodemp-launcher.exe, data C:\Users\you\AppData\Local\com.nodemp.launcher\helper\, cache C:\Users\you\AppData\Local\com.nodemp.launcher\helper\cache
  manifest     id e326499d…, format 2, game 0.39.4.0 build 20972, 14193 root files, 173 archives, generated 2026-…
  overlay   userfolder:vehicles/bell407/info_bell407.json
  overlay   userfolder:levels/mytrack/info.json
  unlisted  /Node-Launcher.exe
game files DIFFER: 14193 files checked in 1.0s (strict), 7203 hashed, 1 not part of the game, 2 user-folder overrides -- e.g. userfolder:vehicles/bell407/info_bell407.json (overlay) userfolder:levels/mytrack/info.json (overlay) /Node-Launcher.exe (unlisted)
counts: missing 0, size 0, hash 0, unlisted 1, archive 0, userfolder 2, folders skipped 0
```

Each problem is one line: the reason, then the path, aligned in two columns:

| Reason | Path | Meaning | Fix |
|---|---|---|---|
| `overlay` | `userfolder:<path>` | A file in your user folder's `current\` that overlays game content. | Move it out of `current\`; a packed mod belongs in `mods\`, which is not checked. |
| `unreadable` | `userfolder:<folder>` | A folder there the launcher could not read, usually a path longer than Windows allows. | Shorten or remove it. |
| `unlisted` | `/<path>` | A file in the game folder that a clean install does not have. | Remove it from the game folder. |
| `hash`, `size`, `missing` | `/<path>` | A game file was edited, resized or deleted. Many of them, `/Bin64/…` included, mean your game version is not the one the reference describes. | Verify the game files in Steam; update the game, or wait for the host to regenerate. |
| `crc`, `size`, `extra`, `missing`, `duplicate` | `/<zip>!<entry>` | An entry of a game archive differs from the clean one. | Verify the game files in Steam. |
| `unreadable` | `/<zip>` | The archive is not a readable zip. | Verify the game files in Steam. |
| `not judged` | `<path> (the launcher's own)` | Not a problem: the launcher lives inside the game folder and left its own files out. | Nothing. |

The last line before the summary, `counts: missing N, size N, hash N, unlisted N, archive N,
userfolder N, folders skipped N`, is the same breakdown as totals. The exit code is `0` when the
install is clean, `1` when there are problems, and `2` when the check could not be made at all —
`cannot read the manifest file …`, `not a reference manifest: …`,
`could not check: manifest format outdated (format 1)` (an outdated reference file: tell the
host to regenerate it) or `could not check: the game's user folder … does not exist`.

## Signing in

| Message | Cause | Fix |
|---|---|---|
| `Enter a username and a password of at least four characters.` | The form's own check. | Fill both fields. |
| `invalid username or password` | Wrong credentials. | Reset the password at [nodemp.com/forgot](https://nodemp.com/forgot). |
| `please verify your e-mail first` | The verification link was not opened. | Open it; it expires after a short while, so register again under another name if it is gone. |
| `username must be 3-24 chars [A-Za-z0-9_-]`, `password must be 8-200 chars`, `already exists` | The directory's rules for a new account. | Pick another name or a longer password. |
| `two-factor code required or invalid` | The account has two-factor authentication on; the launcher has no field for the code. | Play as Test Drive, or use an account without two-factor. |
| `could not reach the directory: …` | No connection to `https://api.nodemp.com`. | Check your connection and any VPN. |

## The server list is empty

- **No connection** screen (`NodeMP cannot reach its server list. Check that you are online —
  and if you use a VPN for a test server, that it is connected.`): the directory did not answer
  at start-up. *Try again*, or *Continue without the list*; Direct Connect still works. While
  it is down, Refresh reports `Could not reach NodeMP at https://api.nodemp.com`. A join made
  while the directory is unreachable carries no join ticket, so nobody verifies who you are:
  signed in, you arrive under your account name, unverified. A server without a server key
  takes names as they come anyway. A listed server that allows Test Drive admits a ticket-less
  join as an unverified guest; one that says *Account required* refuses it with
  `Disconnected · This server requires a NodeMP account: sign in to the launcher and join again`.
- `No servers online` / `Nobody is hosting right now.`: the directory answered with an empty
  list. Nothing is wrong on your side.
- `Nothing matches these filters`: open **Filters** and press *Reset*. Favorites and Recent only
  show servers that are online now.
- A server you know is running but cannot see is private, unlisted (no server key) or has
  stopped sending beacons. Join it through Direct Connect.

`could not remove …: …` in the Content view means BeamNG.drive is holding the archive; close
the game and remove again.

## Logs

The launcher keeps two folders under `%LOCALAPPDATA%`: `NodeMP\` holds the program
(`nodemp-launcher.exe`, what the installer wrote), `com.nodemp.launcher\helper\` holds its data -
the helper's `Launcher.cfg`, the `cache\` of downloaded content and manifests, and `logs\`. When
you report a problem, the second folder is the one with the evidence; nothing in the first one is
worth attaching.

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

This section is for developers and testers who run their own directory; players can skip it -
the launcher is pointed at `https://api.nodemp.com` and needs no setting. Testers running their
own directory can repoint the launcher. In order of precedence:

1. The environment variable `NODEMP_API_BASE`, for example `http://localhost:8080`.
2. A file `directory.url` beside `nodemp-launcher.exe` in `%LOCALAPPDATA%\NodeMP`: one line
   with the base URL; lines starting with `#` are comments. The launcher never writes this file;
   a leftover from a launcher before 1.0.0 is removed on start.
3. The built-in `https://api.nodemp.com`.

The address in use appears in the toast `Could not reach NodeMP at …` when the list cannot be
loaded. `NODEMP_LAUNCHER=C:\dev\launcher\bin\Release\Node-Launcher.exe` makes the launcher start a separate helper executable instead
of its built-in one; it is for people building the helper themselves.
