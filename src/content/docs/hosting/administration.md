---
title: Console, kicks and bans
description: The server console's commands, kicking and banning players, lifting a ban, restarting with a warning, and what to look for in the log.
---

## The console

A server started in a terminal takes commands right in its window. On Windows that's the
`Node-Server.exe` window, on Linux the terminal you started it from.

| Command | What it does |
|---|---|
| `help` | Lists the commands. |
| `status` | Version, uptime, players, cars, resources, memory. |
| `players` | Everyone on the server: id, name, ping, cars and address (with its last part hidden). |
| `kick <id\|name> [reason]` | Disconnects a player, who sees the reason. A name with spaces goes in quotes. |
| `say <text>` | A system line in every player's chat. |
| `reload <resource>` | Runs a resource again. |
| `stop` | Stops the server. `exit` and `quit` do the same. |

Without a reason, a kicked player sees `Kicked by the server`. Players can't reach the console: a
`/kick 1` typed in chat is an ordinary chat line. It becomes a command only if a resource takes it
as one.

Under systemd and in Docker without a terminal, the console is off. The [Linux](/hosting/linux/#a-systemd-service)
and [Docker](/hosting/docker/#the-console) pages say how to turn it on.

### The chat in the console

The console shows the chat as players write, with each player's id:

```
17:51:12.345  Chat   › (0) Alice: hello
17:51:16.000  Chat   › System -> all: Restart in 5 minutes  [console]
```

A line that wasn't sent says why, and a line a resource took as its command is marked
`[handled by a resource]`. The arguments of commands that take a password (`/login`, `/register` and
the others in `[Chat] LogHiddenCommands`) show as `***`. `[Chat] LogToConsole = false` keeps the chat
out of the console and the log.

## Kicks and bans

Kicking is the console command above. There is no ban command in the console: bans come from
resources, such as a `/ban` command for moderators ([example](/plugins/chat/#commands-for-moderators)).

### Bans

Bans are kept in `bans.json` in the working directory. It's one JSON object: each key is a banned
address or a NodeMP account as `nodemp:<id>`, and each value holds the reason, the time and the
player's name:

```json
{
  "203.0.113.7": { "reason": "Spamming", "at": 1789558100, "name": "Bob" },
  "nodemp:108": { "reason": "Spamming", "at": 1789558100, "name": "Bob" }
}
```

A timed ban also has `"until"`, the moment it ends in Unix seconds. When it comes, the server lifts
the ban by itself.

Banning a player who is on the server bans their address and, if they're signed in, their account,
so the ban follows them to another network. A banned player trying to join sees the reason, or
`You are banned from this server` when there is none.

To lift a ban, **stop the server** and run:

```
Node-Server --bans list
Node-Server --bans remove 203.0.113.7
Node-Server --bans remove nodemp:108
```

`list` shows every ban, `remove` lifts one: by address, by `nodemp:<id>` or by a bare account
number. Editing the file by hand works too, also with the server stopped. A running server keeps the
list in memory and overwrites the file on the next ban.

## Restarting with a warning

`stop` sends everyone away at once. To warn players first, a resource schedules the stop:
`node.server.shutdown("Nightly restart", 5 * 60 * 1000)` stops the server in five minutes. Players
see that reason, resources save their data and the server exits with code 0. A systemd service with
`Restart=always` or a container with `restart: unless-stopped` starts it again, so this is a
restart. [Timers and coroutines](/plugins/concurrency/#a-restart-with-a-countdown) has an example
with a countdown in chat.

## The log

Everything the server prints also goes to `logs/server.log`. A new file starts at every start and
when the old one grows past 50 MB. Five old ones are kept as `server.1.log`, `server.2.log` and so on
(`[Log] MaxSizeMB`, `Keep`).

Lines worth knowing:

| Line | What it means |
|---|---|
| `server is ready` | The server started completely. |
| `started, but … failed — what they do may not work` | A part didn't start. The lines above say why. |
| `listed in the server browser` | The server is in the list ([Get listed](/hosting/registering/)). |
| `<name> kicked — <reason>` | The server refused a player or ended their session, in the words the player saw. |
| `netstats id=… rtt=… loss=…` | Every 15 seconds for each player: ping, traffic, losses. Useful when a player says it lags. |

## A player can't get in

The player usually sends you the launcher's message. Every message is on
[Error messages](/reference/error-codes/). What to check on your side:

- The log has every refusal and kick under the `Kick` tag, in the words the player saw.
- `Connection refused` with nothing else: a resource turned the player away without a reason. Look
  for lines with that resource's name.
- A ban: the entry is in `bans.json`, [see above](#bans).
- Anything about game files: the `VerifyGame` level ([Strict file check](/hosting/strict-verification/)).
- Several players from one place can't get in: see
  [When the server misbehaves](/hosting/troubleshooting/#players-are-refused-at-the-door).
