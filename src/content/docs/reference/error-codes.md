---
title: Launcher error codes
description: Reference table of the NodeMP launcher's [NMP-Exxxx] error codes, grouped by range, with what each one means and what to do about it.
---

When something goes wrong, the launcher logs a stable, numbered tag in the form
`[NMP-Exxxx]` — to its console and to `Launcher.log`. The number tells you which stage failed,
so you can search for it and report the exact code. The ranges are:

- **10xx** — backend / network
- **11xx** — connect / handshake
- **12xx** — resources / mods
- **13xx** — session

For step-by-step fixes, see [Troubleshooting](/players/troubleshooting/).

## 10xx — backend / network

These mean the launcher couldn't reach or get a valid answer from the **backend**.

| Code | Meaning | What to do |
|---|---|---|
| `[NMP-E1000]` | Backend unreachable — the backend host didn't respond at all. | Check your internet connection; the backend may be down. Retry shortly. |
| `[NMP-E1001]` | Server-browser list request failed. | Press Refresh again; if it keeps failing, the backend may be having issues. |
| `[NMP-E1002]` | Login / auth request failed. | Re-check your username and password; try again once the backend responds. |
| `[NMP-E1003]` | Join-ticket request failed (transient). | Usually temporary — try connecting again in a moment. |

## 11xx — connect / handshake

These happen while connecting to the **game server** and exchanging the initial handshake.

| Code | Meaning | What to do |
|---|---|---|
| `[NMP-E1100]` | Invalid server address — bad `ip:port` or DNS. | Double-check the host and port (in Direct Connect, the format is `host:port`). |
| `[NMP-E1101]` | Server unreachable — the TCP connect to the game server failed. | The server may be offline or its port isn't reachable; try another server. |
| `[NMP-E1102]` | Handshake failed — the server closed or sent an empty response mid-handshake. | Retry; if it persists the server may be misconfigured or restarting. |
| `[NMP-E1103]` | Version mismatch — client and server protocol versions differ. | Let the launcher update your client and mod, then reconnect. |
| `[NMP-E1104]` | No join ticket — the backend gave no ticket (down or rejected). | Make sure you're signed in and the backend is reachable, then retry. |
| `[NMP-E1105]` | Server rejected the join (ban, full, or similar). | The server is full, you're banned, or guests aren't allowed — try a registered account or another server. |

## 12xx — resources / mods

These cover downloading and applying a server's custom **resources / mods**.

| Code | Meaning | What to do |
|---|---|---|
| `[NMP-E1200]` | Mod download failed. | Accept the mod-download prompt, check disk space and antivirus, then leave and rejoin to retry. |
| `[NMP-E1201]` | Mod sync failed — downloaded resources couldn't be applied. | Rejoin to re-fetch; if it persists, clear partial downloads and try again. |

## 13xx — session

These occur during an active **session**.

| Code | Meaning | What to do |
|---|---|---|
| `[NMP-E1300]` | Kicked — the server removed you from the session. | Check the disconnect message for the reason (often an admin or plugin); rejoin if appropriate. |
| `[NMP-E1301]` | Connection lost. | Usually a network drop on your side — check your connection and rejoin. |
