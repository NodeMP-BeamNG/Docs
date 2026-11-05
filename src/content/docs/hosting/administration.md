---
title: Console, kicks and bans
description: The server console's commands, how to kick and ban a player, lift a ban, restart the server with a warning and what to look for in the log.
---

## The console

A server started in a terminal takes commands right in its window. On Windows that is the `Node-Server.exe` window, on Linux the terminal you started it from.

| Command | What it does |
|---|---|
| `help` | The list of commands. |
| `status` | Version, uptime, players, cars, plugins, memory. |
| `players` | Everyone on the server: id, name, ping, cars and address (the last part is hidden). |
| `kick <id\|name> [reason]` | Disconnect a player and show them the reason. Put a name with spaces in quotes. |
| `say <text>` | A system message in the chat for all players. |
| `reload <resource>` | Restart a plugin. |
| `stop` | Stop the server. `exit` and `quit` do the same. |

Plugins can add commands of their own, and `help` lists them under `from resources:` with the name of the plugin. Input that no command takes gets the answer `unknown command, try help`.

A player kicked without a reason sees `Kicked by the server`. Players have no access to the console: a `/kick 1` typed in chat stays a chat line until some plugin takes it.

A systemd service has no console ([A systemd service](/hosting/linux/#a-systemd-service)). In Docker the console appears if you give the container a terminal ([The console](/hosting/docker/#the-console)).

### The chat in the console

The console shows the chat as players write, with the player's id:

```text
17:51:12.345  Chat   › (0) Alice: hello
17:51:16.000  Chat   › System -> all: Restart in 5 minutes  [console]
```

If a line wasn't sent, the reason is written beside it, and a line that a plugin took as a command is marked `[handled by a resource]`. The arguments of commands with passwords (`/login`, `/register` and the others in `[chat] masked_commands`) are replaced with `***`. `[chat] log = false` takes the chat out of the console and the log.

## Kicks and bans

You can kick from the console with the command above. There is no ban command in the console: plugins ban, for example with a `/ban` command for moderators ([example](/plugins/chat/)).

### Bans

Bans are kept in `bans.json` in the working directory, as one JSON object. A record's key names what is blocked: an address, a NodeMP account as `nodemp:<id>`, or a launcher installation as `install:<id>` (64 hexadecimal digits). The value holds the reason, the time and the player's name:

```json
{
  "203.0.113.7": { "reason": "Spam", "at": 1789558100, "name": "Bob" },
  "nodemp:108": { "reason": "Spam", "at": 1789558100, "name": "Bob" },
  "install:6b46e2582a74234a47a4fa2c7046023be8ea6043e62ff00f1d6c166d39f57fd4": { "reason": "Spam", "at": 1789558100, "name": "Bob" }
}
```

A timed ban also has the field `"until"`: the end time in Unix seconds. When it comes, the server removes the ban by itself.

Banning a player who is on the server blocks their address and, if they are signed in, their account, so the ban works from another network too. On a listed server it also blocks the player's launcher installation, whose id the server gets from NodeMP when the player joins: that launcher can't join with any account or in Test Drive. The installation id is different on each server (other servers know the same launcher by other ids) and changes when NodeMP changes its key, after which a ban on the old id no longer matches. A banned player sees the reason when joining, or `You are banned from this server` if there is none.

NodeMP can ban an account on every server at once. Such a player gets no join ticket for any listed server, and a player who is already playing is disconnected at the server's next report to NodeMP, with `This account is banned from NodeMP`.

To lift a ban, stop the server and run:

```text
Node-Server --bans list
Node-Server --bans remove 203.0.113.7
Node-Server --bans remove nodemp:108
Node-Server --bans remove install:6b46e2582a74234a47a4fa2c7046023be8ea6043e62ff00f1d6c166d39f57fd4
```

`list` shows all bans, and `remove` lifts one: by address, by `nodemp:<id>` or the bare account number, or by `install:<id>`. You can also edit the file by hand, but only while the server is stopped. A running server keeps the list in memory and rewrites the file at the next ban.

## Restarting with a warning

`stop` disconnects everyone at once. To warn players first, a plugin schedules the restart: the call `node.server.shutdown("Nightly restart", 5 * 60 * 1000)` stops the server in five minutes. Players see that reason, plugins save their data and the server exits with code 0. A systemd service with `Restart=always` or a container with `restart: unless-stopped` then starts it again. An example with a countdown in chat: [Timers and coroutines](/plugins/concurrency/).

## The log

Everything the server writes to the console also goes to `logs/server.log`, and the file has more. The console shows what needs a reaction: joins and leaves, spawns, refusals, chat, warnings and errors. Statistics and housekeeping lines, such as `netstats`, go only to the file unless `[logs] details = true`. The server starts a new file at every start and when the current one grows past 50 MB, and keeps five old ones as `server.1.log`, `server.2.log` and so on (`[logs] max_size_mb` and `keep`).

The main lines of the log:

| Line | What it means |
|---|---|
| `server is ready` | The server has fully started. |
| `started, but … failed — what they do may not work` | Some part didn't start ([The server won't start](/hosting/troubleshooting/#the-server-wont-start)). |
| `listed in the server browser` | The server is in the list ([Get listed](/hosting/registering/)). |
| `<name> kicked — <reason>` | The server refused a player or ended their session, in the same words the player saw. |
| `netstats id=… rtt=… loss=…` | In the file, every 15 seconds for each player: ping, traffic, loss ([A player says it lags](/hosting/troubleshooting/#a-player-says-it-lags)). |

## A player can't get in

The player usually sends the text from the launcher. What it means is in [Error messages](/reference/error-codes/), and in the log the same text is in a line with the `Kick` tag. If several players from one place can't get in, read [Players are refused at the door](/hosting/troubleshooting/#players-are-refused-at-the-door).
