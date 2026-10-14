---
title: Console, kicks and bans
description: The server console, kicking and banning players (for good or for a while), restarting with a warning, reading the log, and refused players.
---

## The console

A server started in a terminal (the window `Node-Server.exe` opens on Windows, a shell on Linux)
reads commands typed into it:

| Command | What it does |
|---|---|
| `help` | Lists the commands. |
| `status` | Version, uptime, players, cars, loaded resources, memory. |
| `players` | Everyone on the server: id, name, ping, cars and address (with its last part hidden). |
| `kick <id\|name> [reason]` | Disconnects a player, who sees the reason. A name with spaces goes in quotes: `kick "Big Joe" stop ramming`. Without a reason the player sees `Kicked by the server`. |
| `say <text>` | A system line in every player's chat. |
| `reload <resource>` | Runs a resource again; its `resourceUnload("reload")` handlers run first. |
| `stop` | Shuts the server down (`exit` and `quit` too). |

Anything else is answered with `unknown command, try help`. Players can't reach the console: a
`/kick 1` typed in chat is an ordinary chat line, and it becomes a command only if one of your
resources takes it as one. Under
systemd or in Docker without a terminal the console is off unless `[General] Console = true`
([Keeping it running](/hosting/running/#the-console-in-a-service)).

The console also shows the chat as it happens, with the player's id:

```
17:51:12.345  Chat   › (0) Alice: hello
17:51:14.101  Chat   › (0) Alice: /ping x y  [handled by a resource]
17:51:16.000  Chat   › System -> all: Restart in 5 minutes  [console]
```

Refused lines show why, and a line a resource took as its command is marked
`[handled by a resource]`. Commands that take a secret (`/login`, `/register`, …) appear with the
secret replaced by `***`; `[Chat] LogHiddenCommands` lists them. `[Chat] LogToConsole = false` keeps the chat out of the console and the
log.

## Kicks and bans

Kicking from the console is above. There is no ban command in the console: bans come from plugins
(`player:ban(reason)`, `node.bans.add`), and you lift them with the server stopped. A moderation
command takes a few lines of Lua; [Recipes](/plugins/recipes/#kick-and-ban-from-chat) has one with
`/kick`, `/ban` and a timed `/tempban` for players with the right role.

### Bans

Bans are kept in `bans.json` in the working directory. The file doesn't exist until the first ban;
the server reads it once (at the first ban check or ban after a start), keeps the list in memory
from then on and writes it back after every new ban. It's one JSON object; each key is a banned
address (`"203.0.113.7"`, or an IPv6 address without brackets) or a NodeMP account as
`"nodemp:<account id>"`, and each value holds the reason the player is shown, the time and the name
the player had:

```json
{
  "203.0.113.7": { "reason": "Spamming", "at": 1789558100, "name": "Bob" },
  "nodemp:108": { "reason": "Spamming", "at": 1789558100, "name": "Bob" },
  "198.51.100.4": { "reason": "Ramming", "at": 1789558100, "name": "Carl", "until": 1789565300 }
}
```

A ban with `"until"` is a timed one: it ends at that moment (Unix seconds), and the server drops it
from the file by itself the next time it checks, lists or starts. Plugins set it; a ban without
`"until"` is for good.

Banning a connected player bans both their address and, if they're signed in, their account, so
the ban follows them to another network. A banned player is turned away at the door with the
stored reason, or with `You are banned from this server` when there is none. At start the log counts
what it loaded: `2 banned IPs and 1 banned account loaded from bans.json`.

To lift a ban, **stop the server** and use the built-in tool on the same file:

```
Node-Server --bans list
Node-Server --bans remove 203.0.113.7
Node-Server --bans remove nodemp:108
```

`list` prints every ban with its key, date, name and reason, and `until` with the end date for a
timed one; `remove` takes an address, an account as `nodemp:<id>` or a bare account id. Editing the
file by hand with the server stopped works too. Editing it while the server runs doesn't: the server
keeps its own copy in memory and writes it back on the next ban. A plugin can lift a ban on a
running server with `node.bans.remove(who)`.

## Restarting with a warning

`stop` in the console sends everyone away at once. To give players a warning first, a resource can
schedule the stop: `node.server.shutdown("Nightly restart", 5 * 60 * 1000)` stops the server in
five minutes, and the log says so:

```
restarter stops the server in 300.0 s: Nightly restart
stop requested by a resource: Nightly restart
```

When the time comes, players are sent away with that reason, plugins save what they keep, and the
server exits with code 0, just as after Ctrl+C. Under systemd with `Restart=always` or in Docker with
`restart: unless-stopped` ([Keeping it running](/hosting/running/)) it then starts again by itself,
so this is a restart. A resource can call the stop off before then. The
[recipe](/plugins/recipes/#a-restart-with-a-countdown) adds a countdown in chat and an admin
command.

## Reading the log

Everything the server prints also goes to `logs/server.log`, without colours. The previous logs are
`server.1.log`, `server.2.log` and so on: a new file starts at every start and when the log passes
50 MB, and five old ones are kept (`[Log] MaxSizeMB`, `Keep`). Each line is
`time  tag › message`, with milliseconds on the time; `[Log] Date = true` adds the date.

Lines worth knowing:

- `server is ready`: every part started. `started, but … failed — what they do may not work` means
  one didn't; the lines above say which and why.
- `TLS 1.3 enabled — certificate fingerprint (SHA-256): …`: the identity launchers know the server
  by.
- `announcing this server to https://api.nodemp.com`, then `listed in the server browser`: listing
  worked ([Get listed](/hosting/registering/)).
- `client obfuscation ready · runner … · Prometheus (cache .obfcache)`: client scripts will be
  scrambled; a warning instead names what's missing.
- `Kick › <name> kicked — <reason>`: the server turned a player away or ended their session, in the
  words the player saw. A ban at the door reads `connection from 203.0.113.5 refused (banned: Spamming)`.
- `… disconnected (…)`: a player left; the reason is in the brackets (`Connection closed by the client`,
  `Timeout (silent 31 s)`, `Connection lost (not resumed within 30 s)`, …).
- `netstats id=… rtt=… loss=…`: every 15 seconds, one line per player with their ping, traffic and
  losses (`[Network] StatsIntervalSec`), and one with the totals when they leave. Useful when a
  player says it lags.

## When a player is refused

A player who can't get in quotes the launcher's message to you; every message is on
[Messages and exit codes](/support/error-codes/). On your side:

- The log has every refusal and kick under the `Kick` tag, in the same words the player saw.
- `Server cannot find …`, `Failed to verify "…"`: a zip in `content/` is missing, broken or was
  replaced while the server ran. Check the start-up lines about `content/`, fix the file and
  restart; the folder is read at start only.
- `Connection refused` with nothing else: a plugin turned the player away without a reason. Its own
  log lines (tagged with its name) usually say why.
- `You are banned from this server`, or a ban reason: the entry is in `bans.json`, [above](#bans).
- Anything about game files: the `VerifyGame` level you set. The player's side is
  [Strict servers](/support/strict-servers/), yours [Strict verification](/hosting/strict-verification/).
- Several players from the same place can't get in: see
  [hosting troubleshooting](/hosting/troubleshooting/#players-are-refused-at-the-door).
