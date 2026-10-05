---
title: "Strict servers"
description: "What a strict server checks on your PC, why it refuses a modified install and how to get in."
---

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

