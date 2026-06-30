---
title: Troubleshooting
description: Fixes for the most common NodeMP problems — can't connect, mod download stuck, and lost connections — plus where to find logs and error codes.
---

Most problems fall into a few buckets. When something fails, the launcher writes a stable
`[NMP-Exxxx]` code to its console and to `Launcher.log` (next to `NodeMP-Launcher.exe`) — note
that code and cross-reference the [launcher error codes](/reference/error-codes/) for the exact
meaning.

## Launcher not connected

If the Multiplayer screen says the launcher is offline:

- Make sure `NodeMP-Launcher.exe` is actually running, and start it **before** opening
  Multiplayer.
- Close any **stale launcher** still running in the background — it can hold local ports 4444 /
  4445 and stop a fresh launcher from binding them.
- Allow the launcher through Windows Firewall / your antivirus.

## Can't connect to a server

If a connection fails ("Couldn't connect" / "the server didn't respond"):

- **Refresh** the server list — the server may have gone offline or filled up.
- Try **Direct Connect** with the server's `host:port` in case it isn't in the public list.
- A **version mismatch** (`[NMP-E1103]`) means the server runs a different protocol version —
  let the launcher update your client and mod, then retry.
- Being refused (`[NMP-E1105]`) usually means the server is full, you're banned, or guests
  aren't allowed — try a registered account or another server.
- Codes in the `10xx` range point at the **backend** (no internet, backend down, or login/ticket
  failures) rather than the server itself.

## Mod download stuck or failed

If joining hangs on *Downloading mods* or fails with `[NMP-E1200]` / `[NMP-E1201]`:

- When prompted that a server requires custom mods, choose **Accept and download** — declining
  cancels the join.
- Check you have free disk space and that antivirus isn't quarantining the downloaded files.
- Leave and rejoin to restart the download; a half-finished resource will be re-fetched.

## Connection lost or kicked

- **Connection lost** (`[NMP-E1301]`) is almost always your network dropping mid-session — check
  your connection and rejoin.
- **Kicked** (`[NMP-E1300]`) means the server removed you (often by an admin or a plugin); the
  reason is usually shown on the disconnect overlay.
- Persistent high ping (shown red in the player list) can cause rubber-banding — try a server
  closer to you.

## Where to look

- **`Launcher.log`** — the most useful file; run the launcher with `--verbose` for extra detail.
- The in-game **diagnostics console** (NodeMP options → *Tools*) shows live session, network,
  and event data.
- The full code table lives in [Launcher error codes](/reference/error-codes/).

If you're stuck on a term, the [glossary](/reference/glossary/) explains the moving parts.
