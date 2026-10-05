---
title: "Administration"
description: "Bans, logs, why a player was refused and what to back up."
---

## Bans

Bans live in `bans.json` in the working directory. The file does not exist until the first ban;
the server reads it once - at the first ban check or ban after a start - keeps the list in memory
from then on and writes it back after every new ban. It is one JSON object
whose keys are the banned IP address (`"203.0.113.7"`, or an IPv6 address without brackets) or
the NodeMP account as `"nodemp:<account id>"`, and whose values carry the reason the player is
shown, the time and the name at the time:

```json
{
  "203.0.113.7": { "reason": "Spamming", "at": 1789558100, "name": "Bob" },
  "nodemp:108": { "reason": "Spamming", "at": 1789558100, "name": "Bob" }
}
```

A ban placed on a connected player through `node.bans.add(player)` or `player:ban()` writes two
entries, the address and the account; a ban on a bare address or account id writes one. A player
whose address or account is in the file is refused at the door with the stored reason, or with
`You are banned from this server` when the reason is empty. The start-up log counts what it
loaded: `2 banned IPs and 1 banned account loaded from bans.json`.

To lift a ban, **stop the server** and use the built-in tool on the same file:

```
Node-Server --bans list
Node-Server --bans remove 203.0.113.7
Node-Server --bans remove nodemp:108
```

`list` prints every entry with its key, date, name and reason (`no bans in …` when the file does
not exist yet); `remove` takes an IP address, an account as `nodemp:<id>` or a bare account id,
removes it and says how many bans are left. `--working-directory=` is honoured, `server.toml` is
not read. Editing the JSON by hand with the server stopped does the same. Editing it while the
server runs does not work - the server keeps the list in memory and writes the old list back on
its next ban, which is why every line the tool prints says to stop the server first. A resource
can also lift a ban at run time with `node.bans.remove(who)`; the `/unban` command of the
[moderation recipe](/plugins/recipes/#kick-and-ban-with-a-reason) is that in eight lines, and
needs the `chat` resource. (Before 1.2.1 there was no `--bans`; the hand edit was the only way.)

## Logs

Everything the server prints also goes to `logs/server.log` without the colour codes. At every
start the previous file is moved to `logs/server.old.log`, so exactly one older run is kept. Each
line is `time  tag › message`, the tag being `Core`, `Net`, `Res`, `Mods`, `Join`, `Leave`,
`Kick`, `Warn`, `Error` and so on. `[General] Debug = true` (or `NODE_DEBUG=true`) adds the debug
lines and millisecond timestamps; `NODE_FORCE_ANSI=1` keeps the colours when the output is not a
terminal.

Lines worth knowing at a glance:

- `server is ready` — every subsystem started.
- `TLS 1.3 enabled — certificate fingerprint (SHA-256): …` — the identity launchers pin.
- `announcing this server to https://api.nodemp.com`, then `listed in the server browser` — the
  directory accepted the key. Only the second line means listed.
- `client obfuscation ready · runner lua5.1 · Prometheus (cache .obfcache)` — client scripts
  will be obfuscated; a `Warn` instead names what is missing.
- `startup not successful, systems [Directory] had errors — this may or may not cause issues` —
  one subsystem failed; the lines above it say which and why.
- `Cannot listen on port 30814 (udp): the port is already in use (…). Usually another Node-Server is still running on this machine -- a previous instance that was not stopped, or a second copy started by mistake -- or another program owns the port. Stop it, or give this server a different port with [General] Port in server.toml or --port=<number>. Closing.`
  — **the port is taken** (the parentheses carry the operating system's own words; the second
  half of the port fails a line later with `Cannot listen on port 30814 (tcp) either: …`). The
  server stops itself: no `server is ready`, `Shutdown.`, `Closing in 10 seconds`, exit code 1 -
  a supervisor sees a failure, not a clean stop. Stop the other instance (or change
  `[General] Port` / `--port=`) and start again. On Windows a second instance can no longer bind
  the TCP port beside a running one. (Before 1.2.1 the line was the bare `bind() failed: …`, and
  the server went on for a few seconds - it could still print `listening on …` and even
  `server is ready` - before it shut itself down with exit code 0.)
- `[General] IP = "…" is not an IP address (…); the server cannot listen. Leave it at "::" to listen on every interface, or give the address of one of this machine's interfaces. Closing.`
  — the same exit, code 1, for a bind address that does not parse.
- `Kick › <name> kicked — <reason>` — the server refused or ended a player's session; the reason
  is the text the player quotes to you (see [When a player is refused](#when-a-player-is-refused)).

## When a player is refused

A player who cannot join quotes a toast; [Error codes](/support/error-codes/) lists every text
with its meaning. On your side:

- The server logs every refusal and kick under the `Kick` tag as `<name> kicked — <reason>`
  (`connection from 203.0.113.5 refused (banned: Spamming)` for a ban at the door), so
  `logs/server.log` says whom it refused and why, in the same words the player saw.
- `Invalid mod "…"`, `Failed to verify "…"`, `Server cannot find …`: a zip in `content/` is broken,
  was replaced while the server ran, or is missing. Look at the content lines of the start-up log
  (`serving 2 mods (148.3 MB) from content/`, `'…' is not a ZIP file and will be ignored`), fix or
  remove the file and restart - the folder is indexed at start only.
- `Connection refused` with no reason: a resource denied `playerConnectRequest` without giving
  one. The resource's own log lines (its name is the tag) say which; the server does not.
- `You are banned from this server` or a ban reason: the entry is in `bans.json`,
  [above](#bans).
- Anything about game files or the reference manifest: the `VerifyGame` level you set; the
  player's side is on [Troubleshooting → Strict servers](/support/strict-servers/#strict-servers),
  yours on [Strict verification](/hosting/strict-verification/).

## What to back up

| Keep | Why |
|---|---|
| `server.toml` | Your settings. Not needed for the env-only Docker setup; keep the Compose and `.env` files instead. |
| `node_cert.pem`, `node_key.pem` (`data/tls/` in Docker) | The fingerprint launchers and the directory know your server by. A new pair means a new identity. |
| `resources/`, `content/` | Your add-ons. |
| `storage/`, `bans.json` | Data your resources wrote, and your bans. |

`logs/`, `.obfcache/` and `content/mods.json` are regenerated and need no backup.
