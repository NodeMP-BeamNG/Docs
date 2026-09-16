---
title: Strict verification
description: VerifyGame = strict - what the reference manifest covers and what it does not, --gen-integrity, where the file goes, what players see, plugin calls.
---

`[General] VerifyGame = "strict"` is the fourth level of the game install check, added with
server 1.1.0, launcher 1.1.0 and wire protocol v18. The three lower levels compare a player's
BeamNG install with the game's own file list, `integrity.json` — a list the player can edit
along with the files it names. `strict` compares against a **reference manifest**: a
description of a clean install that you generate once per game version and put on the server.
The launcher fetches it, caches it, and checks the whole install and the game's user folder
against it before every join and again during the session.

This page says what the check covers and what it does not, how to generate and place the
manifest, and what players and plugin authors see. The key itself is described in
[Configuration](/hosting/configuration/#general).

## What strict checks

The check runs in the player's launcher, against the reference manifest the server named.
A player passes when every item below agrees; the counts of what did not are the `problems`
in the refusal.

- **Every file the reference lists** — its length. `lua/` and `ui/` (the game's code and
  interface), everything under `Bin64/` and `BinLinux/`, and the `*.exe` files in the game
  root are also hashed with SHA-256 against the reference's digests, so a same-length edit is
  caught there. Every other loose file (`art/`, `campaigns/`, `gameplay/`, …) is compared by
  size only. Findings: `missing`, `size`, `hash`.
- **Every archive** (`*.zip`) — its table of contents. The vehicles and levels live inside
  multi-gigabyte zips that cannot be hashed before a join, but each zip ends with a list of its
  entries with their uncompressed sizes and CRC-32s, and the reference holds that list for
  every archive of the clean install. Entry by entry: `missing`, `extra`, `duplicate`, `size`,
  `crc`; a zip whose table cannot be read at all is `unreadable`. A finding names the entry as
  `/content/vehicles/pickup.zip!vehicles/pickup/pickup.jbeam`.
- **The whole game folder** — any file the reference does not list is `unlisted`, wherever it
  sits, unless it matches one of the manifest's *volatile* patterns (`integrity.json`, `*.log`,
  `temp/`, `startup.ini`, `Bin64/*.pdb`, `shadercache/`, `desktop.ini`, `Thumbs.db`). A `.dll`
  under `Bin64/` or a `.so` under `BinLinux/` is never excused by a pattern. When the launcher
  itself is installed inside the game folder, its own files (the executable, `Launcher.cfg`,
  `logs/`, `cache/`) are left out and the report says so (`excluded=`).
- **The game's user folder** (`current/`) — the folder where the game mounts loose files over
  the packed content, so a `vehicles/pickup/pickup.jbeam` there replaces the packed one. Only
  what a player legitimately keeps there is allowed: the trees `settings/`, `screenshots/`,
  `replays/`, `cache/`, `temp/`, `saves/`, `mods/` (the client mod's own `mods/multiplayer/`
  included), `art/nodemp/`, `trackEditor/`, `flowgraphEditor/`, `roadArchitect/`; `*.log`
  anywhere; saved vehicle configurations and their previews, `vehicles/<model>/<name>.pc`,
  `.png`, `.jpg`, at exactly that depth; the `main.materials.json` placeholders the engine
  writes anywhere under `vehicles/` and `art/`; `desktop.ini` and `Thumbs.db`. Any other file
  under `vehicles/`, `levels/`, `lua/`, `ui/`, `art/`, `scripts/`, `gameplay/`, or under a
  top-level folder that also exists in the game folder (`campaigns/`, …), is an `overlay`,
  named as `userfolder:vehicles/pickup/pickup.jbeam`. Files in other top-level folders
  (`multiplayer/`, …) and loose files directly in `current/` overlay nothing and are ignored.
  A folder in one of those trees that the launcher cannot read is a finding too
  (`unreadable`), and a user folder that does not exist fails the check by name.

Which user folder is judged is the one the game uses: `--user-path` when the launcher was
given one, else `startup.ini` beside the game (`[filesystem] UserPath`; a relative value is
anchored at the folder holding the ini), else `BeamNG.Drive.ini` under `%LOCALAPPDATA%\BeamNG`
(`userFolder`), else `%LOCALAPPDATA%\BeamNG\BeamNG.drive` — always with `current` appended. The
launcher logs it at every join: `user folder judged by the strict check: …`.

The report the launcher sends names the manifest it checked against (`manifest=<id>;`), what it
left out as its own (`excluded=1:NodeMP/cache/;`), how many folders it could not read
(`skipped=1;`) and up to three examples, `path (reason)`. The server compares the id with the
manifest it served: a report against another manifest — a stale cache, another server's file —
is judged as a mismatch whatever its outcome.

Measured on BeamNG 0.39.4.0 with the install already in the file cache, the whole check takes
about a second: 14 193 files in the game folder, 173 archive tables, 7 203 files hashed
(about 1.9 GB), and the user folder walked. The first check after a reboot reads that from disk
and takes tens of seconds.

## What strict does not check

The check is a check on an honest client, not a security boundary. Where it stops:

- **Archive contents.** An archive is described by its table of contents only — entry name,
  uncompressed size, CRC-32 — and CRC-32 is forgeable: a member can be edited and padded back
  to its CRC with four bytes. Hashing every archive's content would read about 50 GB per join,
  which is not a check anyone would run. Strict therefore holds against an install that has
  changed the way installs change — mods, user-folder overlays, stray or edited loose files, a
  repacked zip — not against a player who edits a game archive's member and tunes its CRC on
  purpose. This is an accepted residual; the server-side rules of your resource remain the
  second layer.
- **The launcher itself.** The whole check runs on the player's machine, in a launcher the
  player could patch. The server judges reports; it cannot observe the install.
- **Loose files outside the code and the binaries** are compared by size only (their SHA-256
  is in the manifest, but hashing another 2 GB before every join is not affordable).
- **Re-checks during the session** — the folder watcher's and the scheduled ones — leave the
  binaries unhashed: a library the running game has loaded cannot change what the game does
  until the next start, and the next start re-runs the full check at the door. A request from a
  resource (`player:verify("strict")`) hashes everything.
- **The reference is as good as the install it came from.** A manifest generated over a
  modified install ships that modification as clean. Generate on a clean install.
- The user-folder allowlist is a list: a file the engine writes somewhere not on it would be
  reported as an `overlay`. The diagnostic on [Troubleshooting](/players/troubleshooting/#strict-servers)
  is how such a case is found.

## Generating the manifest

The generator is built into the server binary. Run it on a Windows machine with a **clean**
BeamNG.drive install of the version your players run (verify the files in Steam first, and
make sure nothing is installed into the game folder), using the Windows build of `Node-Server`
from the release archive. The game has to be installed on the machine that runs the generator -
a Linux or Docker server has no game to read, so a host on Linux generates the file on a Windows
PC (the players' game is a Windows program anyway) and copies the one file to the server; the
manifest is portable and does not depend on where it was made:

```powershell
.\Node-Server.exe --gen-integrity "C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive"
```

The argument is the game's root folder — the one with `integrity.json` in it. The tool reads
that file for the game version and build number only; it does not copy its list, because the
game's own list omits some shipped files, and any omission would make a clean install fail
strict. Instead it walks the whole install, hashes every loose file with SHA-256, reads every
archive's table of contents, drops the volatile paths, and writes one zstd-compressed JSON file:

```
reading the game install at C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive (every file is hashed; a few GB take about a minute) ...
integrity manifest written
  game        0.39.4.0 (build 20972)
  root files  14193 (whole install, 2656.7 MB hashed)
  archives    173 (59594 entries)
  size        6.4 MB json, 1.2 MB compressed
  hash        e326499d35bdef6f1d937a6648113b34225d37c5d0e07b4fc22cdee5db1273a6
  file        integrity\0.39.4.0.manifest
Put the file in the server's [General] IntegrityDir (default "integrity") and set VerifyGame = "strict".
```

The numbers are those of 0.39.4.0; the run took about 12 seconds on a desktop with an NVMe
disk. The `hash` line is the **manifest id**: the SHA-256 of the file's bytes, 64 lowercase hex
digits — the digest `Get-FileHash -Algorithm SHA256` prints for the file, in lower case. Everything on the
wire names the manifest by this id, and the launcher caches it under that name. Two runs over
the same install produce byte-identical files with the same id, because the `generated`
timestamp inside is taken from `integrity.json`'s modification time, not from the clock.

Options: `--out <file>` writes elsewhere than `integrity/<game-version>.manifest` under the
working directory; `--game-version <x.y.z.w>` overrides the version read from `integrity.json`.
Both accept the `--flag=value` spelling too. The tool refuses to write anything when the folder
has no readable `integrity.json` (`no readable integrity.json in … (is this the game's root
folder?)`), when a file cannot be read, when an archive is malformed, or when the output cannot
be written: `integrity manifest NOT written: …`, exit code 1.

The file is **format 2**: the `format` key inside is `2`, every id and digest is SHA-256. An
earlier draft used XXH64 (format 1); the server refuses such a file at start with
`integrity manifest integrity/0.39.4.0.manifest skipped: format 1 is not supported (this server reads format 2, SHA-256 ids and digests); regenerate with --gen-integrity`.

## Placing the manifest

Copy the file into the `integrity/` folder of the server's working directory — the folder you
start `Node-Server` in, `/opt/nodemp/integrity/` or `C:\NodeMP\integrity\` in the
[quick start](/hosting/quick-start/) layout — or into the folder `[General] IntegrityDir`
names. Under Docker the working directory is `/data`, so the file goes to `/data/integrity/`
on the host's data volume. Then set `VerifyGame = "strict"` (`NODE_VERIFY_GAME=strict`) and
restart: both the setting and the manifests are read at start.

Keep **exactly one** `.manifest` in the folder. The handshake does not carry the player's game
version, so the server cannot pick between manifests; with two files every join is refused with
`This server has integrity manifests for 2 game versions (0.39.4.0, 0.39.3.0) and cannot tell which one you run. Ask the host to keep exactly one manifest in the server's integrity folder.`,
and with none with
`` This server requires a strict check of your BeamNG install but has no integrity manifest to check it against. Ask the host to run `Node-Server --gen-integrity <gamedir>` and put the file in the server's integrity folder. ``
Both cases are also errors in the start-up log. A healthy start logs one line per manifest,

```
integrity manifest for game 0.39.4.0 (build 20972): 173 archives, 59594 entries, 14193 root files, 1.2 MB (38 chunks), hash e326499d…
strict game verification ON: reference manifest for game 0.39.4.0 (e326499d…)
```

A server on another level still loads the folder (`1 integrity manifest loaded from "integrity"
(available to Player:verify("strict"))`): a resource can then run a strict audit on demand
without refusing anyone at the door.

## After a game update

The manifest describes one game version. When BeamNG updates, a player's updated install differs
from the old reference in the binaries, the code and the archives, and is refused with
`Game files do not match this server's reference (N problems). …`. Generate a new manifest
from the updated clean install, replace the old file (one file in the folder), restart.
Launchers notice the new id, fetch the new manifest on their next
join and cache it. A player who has **not** updated the game yet is then refused the same way,
with examples such as `/Bin64/BeamNG.drive.x64.exe (hash)`; updating the game in Steam fixes it.

## What players see

On a strict server the join has two extra steps in the launcher: `Downloading the server's
integrity manifest` — once per manifest, about 1.2 MB in 32 KiB chunks, then cached as
`%LOCALAPPDATA%\com.nodemp.launcher\helper\cache\integrity\<id>.manifest` — and
`Checking game files`. A clean install then joins as on any other server; its log says
`game files verified: 14193 files checked in 0.9s (strict), 7203 hashed`. The server refuses a
mismatch with
`Game files do not match this server's reference (3 problems). userfolder:vehicles/pickup/pickup.jbeam (overlay), …`;
launcher 1.1.0 shows that in its own words, as
`Could not join · Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam`,
with the first problem explained in the panel under the server's card. If the check fails later
in the session the server ends it with
`Game files changed while you were playing and no longer match this server's reference (1 problem). …`,
shown as
`Session ended · Your game files changed while you were playing and no longer match this server's reference (1 problem)`
in the game.

During the session the launcher checks again: on Windows when files change under the install's
`content/`, `scripts/`, `lua/`, `ui/` or the user folder's `vehicles/`, `levels/`, `lua/`, `ui/`,
`art/` (at most once a minute), and on a schedule every `StrictRecheckMin` minutes of its
`Launcher.cfg` (default 10; see [Settings](/players/settings/#helper-configuration-launchercfg)).
A re-check that finds nothing is not reported; one that finds a change is, and the server ends
the session with the text above. The refusal texts and the diagnostic a refused player can run
are on [Troubleshooting](/players/troubleshooting/#strict-servers) and in
[Error codes](/reference/error-codes/#server-refusals-and-kick-reasons).

## For plugin authors

Three additions to the server API (ABI 1.12) belong to strict:

- [`player:verify(level)`](/plugins/api/lua/#playerverifylevel---boolean-string) asks the
  player's launcher to run the check again, now, at `"size"`, `"scripts"`, `"full"` or
  `"strict"`. It returns `true` when the request went out, or `nil` and `"unknown player"`,
  `"unsupported"` (a level not on offer — `"strict"` on a server without exactly one loaded
  manifest) or `"pending"` (one request per player per 60 s; the check every join runs does not
  count, so a call from `playerJoined` goes out at once). A strict request from a resource hashes
  the binaries, unlike the launcher's own re-checks.
- [`playerVerifyReported`](/plugins/api/events/#playerverifyreported) fires for every report —
  the one at the door and every mid-session one — **after** the server's verdict, with
  `{ level, outcome, problems, detail, manifest }`: `outcome` is what the server decided
  (`"clean"`, `"differs"`, `"failed"`), `manifest` the id the launcher named (`""` below
  strict). A `differs` or `failed` report has already kicked the player when `VerifyGame` is
  not `off`; on an `off` server the event is the only consequence, which is how an audit
  without refusals is built.
- [`player:setStrict(on)`](/plugins/api/lua/#playersetstricton---boolean-string) marks the
  session strict on the server side, which changes one relay rule: a `Vehicle::Camera` frame
  from that player targeting a vehicle it does not drive, ride in or own as its walking avatar
  is not relayed, so a strict client cannot follow other players' cars with its camera. The
  refused report still fires `playerCameraChanged`, and `player:camera()` then carries
  `denied = true`. It tells the client nothing: the client-side rules are switched on with the
  `strict` table of `session:config`, described on
  [Client scripting](/plugins/client-scripting/#strict-sessions-sessionconfigstrict).

Native modules have the same three as `player_verify`, `player_set_strict` and the
`playerVerifyReported` notification in the
[C ABI](/plugins/api/c/#strict-session-install-verification-and-the-camera-rule).

## Next

- [Configuration](/hosting/configuration/) — `VerifyGame`, `IntegrityDir`, the `--help` text.
- [Troubleshooting](/players/troubleshooting/#strict-servers) — what a refused player does.
- [Wire protocol](/plugins/protocol/) — the v18 frames that carry the manifest and the report.
- [Client scripting](/plugins/client-scripting/#strict-sessions-sessionconfigstrict) — the client half of a strict session.
