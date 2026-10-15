---
title: When something breaks
description: A server won't let you in, a strict server complains about files, mods don't download, the game doesn't start or drops you - what's usually behind it and what to do.
---

Find what you're seeing below. Each part says what's usually behind it and what to try, most likely
first.

The launcher always says why a join stopped. The notification's title names the step (*Could not
join*, *Could not connect*, *The server refused the join*, *Session ended*), and the line under it is
the exact reason. Old notifications stay under the bell icon.

## A server won't let you in

| Reason | What to do |
|---|---|
| `Server full!` | The server is full. Use the **Free slots** filter, or wait. |
| `This server requires a NodeMP account: sign in to the launcher and join again` | The server wants an account and you're in Test Drive. **Settings → Account → Sign in**. |
| `This server needs a newer launcher — update now` | Click **Update now**: the launcher updates, restarts and joins again. |
| `Your NodeMP mod is out of date for this server (it speaks wire protocol …, the server …). Reinstall it from the launcher.` | Close the game, click **Settings → Launcher → Client mod → Check now** and join again. |
| `Could not reach the server` | Nothing answers at that address: the server is off or its port is closed. Refresh the list or ask the host. |
| `server certificate fingerprint mismatch` | The server's certificate changed. Ask the host whether they reinstalled it. |
| `Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | Verify the game files in Steam: BeamNG.drive → *Properties → Installed Files → Verify integrity of game files*. |
| `You are banned from this server` | This server banned you. If the host gave a reason, you see that instead. |
| `The server is starting up; join again in a moment.` | The server is still starting. Try again in a minute. |
| `Connection refused` | A plugin on the server turned you away: a whitelist, a rule. Ask the host. |

If the reason isn't in this table, look it up on [Error messages](/reference/error-codes/).

## A strict server refuses you

A strict server wants everyone on a clean, untouched game. When something differs, the launcher
shows the first problem in plain words, some advice, and a **Copy** button that copies a command
listing every problem.

What usually trips it, even if you never changed anything on purpose:

- **Leftovers of unpacked mods in your user folder**: files like `info_*.json` or `*.jbeam` in
  `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\vehicles\` from mods removed long ago. Your saved
  configurations (`<name>.pc` with their pictures) are fine.
- **Your own maps and scripts** in `current\levels\`, `current\lua\`, `ui\`, `art\` or `scripts\`.
  Move them elsewhere while you play on strict servers.
- **Extra files in the game folder**: other tools, ReShade, a mod unpacked into the game folder by
  mistake.
- **A different game version.** The game just updated and the host hasn't yet, or the other way
  round. Then the list is full of the game's own files, such as `/Bin64/BeamNG.drive.x64.exe (hash)`.

Zip mods in your `mods\` folder **never** fail the check.

To see every problem: close BeamNG.drive, click **Copy** under the refusal, paste the command into
Command Prompt or PowerShell and press Enter. Each line of the result is a reason and a path:

| Reason | What it means | What to do |
|---|---|---|
| `overlay` | A file in your user folder replaces or adds game content. | Move it out of `current\`. Zip mods belong in `mods\`. |
| `unlisted` | An extra file in the game folder. | Delete it yourself: Steam's check doesn't remove extra files. |
| `hash`, `size`, `missing` | A game file was changed or is missing. Many of them, including `/Bin64/…`, mean you and the server have different game versions. | Verify the files in Steam, update the game, or wait for the host to update. |
| `crc`, `extra`, `duplicate` | Something inside one of the game's archives is off. | Verify the files in Steam. |

During the session a strict server checks again: on its own schedule (every 10 minutes unless the
host changed it) and after files change. If something changed, the session ends. Put the files back
as they were and join again.

## Mods don't download

- **The download is slow.** Give it time. A download is never stopped for being slow, only when
  nothing moves at all.
- **The download broke off.** Join again: what finished stays in the cache, and the rest is fetched.
- **One mod fails every time.** The server may not have it, the file may be broken, or the host marked
  it as one you get yourself; then the message says where to put it. Otherwise, tell the host.
- **The disk is full.** Server mods live in the launcher's cache. **Content** lists them with their
  sizes; remove the ones you don't need (with the game closed).

## The game doesn't start, or closes right away

1. Open **Settings → Game** and check that the launcher sees a game version. If not, click **Browse**
   or **Find it**.
2. Try another **Graphics mode**. Direct3D 11 is the fallback when D3D12 misbehaves.
3. Verify the game files in Steam.
4. If the game started and closed, its log says why:
   `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\beamng.log`.

If BeamNG.drive is already open when you join, the launcher uses it instead of starting a second
copy.

## You got dropped

A short drop doesn't end your session: the launcher reconnects by itself
([A bad connection](/players/connection/)). If the session did end, the reason is in the
notification:

| Reason | What to do |
|---|---|
| `Kicked`, `Banned`, or the host's own words | An admin or a plugin removed you. Ask the host. |
| `Server shutdown` | The server stopped or is restarting. Give it a few minutes. |
| `Resume rejected` | The server wouldn't take the reconnect back. Join again. |

**Session ended** with no reason at all means BeamNG.drive was closed.

## The server list is empty

- **Connection lost** at start: click **Try again**. If NodeMP can't be reached right now, choose
  **Continue without the list**: Direct Connect still works.
- *No servers online*: the launcher reached NodeMP fine; nobody is running a public server right now.
- *Nothing matches these filters*: there are servers, your filters hide them. Click **Reset all
  filters**.
- A server you know is running isn't listed: it may be private, or have no key at all. Join it with
  **Direct Connect**.

## The launcher's traffic helper

Every join starts a second copy of the launcher in the background, without a window. It starts the
game, talks to the server and carries your traffic while you play. When the launcher says **The
launcher's traffic helper stopped**, it means this background part, and the line under the title is
the last line of its log. Look it up under
[Helper exit codes](/reference/error-codes/#helper-exit-codes).

## What to send when you ask for help

On the [forum](https://forum.nodemp.com) or on Discord, send:

1. **`launcher.log`**, right after the problem; it starts over on the next join.
2. **The exact message**: the title, the line under it, and the text under **Details**.
3. **Which server**, and what you were doing.

If the problem is inside the game (a car missing, the chat acting up), add the game's log,
`beamng.log`.

| What | Where |
|---|---|
| `launcher.log` | `%LOCALAPPDATA%\NodeMP\helper\logs\` (**Settings → Launcher → Logs**) |
| `beamng.log` | `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\` |
| Downloaded server mods | `%LOCALAPPDATA%\NodeMP\helper\cache\` |
| The client mod | `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\mods\multiplayer\NodeMP.zip` |
