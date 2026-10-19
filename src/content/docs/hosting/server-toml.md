---
title: Configuring the server
description: How server.toml works, the settings hosts change most, environment variables and command-line options.
---

The server keeps its settings in one file, `server.toml`, in its working directory. Every key, with its type and default, is in the [settings reference](/hosting/configuration/).

## How the file works

On its first start the server writes a short file with the tables a host fills in: `[server]`, `[vehicles]` and `[listing]`.

```toml
# NodeMP server settings: https://docs.nodemp.com/hosting/configuration/
# Environment variables (NODE_PORT, NODE_NAME, ...) win over this file.

[server]
name = "Node Server"
port = 30814
max_players = 8
cars_per_player = 1
map = "/levels/gridmap_v2/info.json"
mods = "content"  # folder of mod zips players download

[vehicles]
queue = "allow"  # "off": every client applies at once (races, leagues)
queue_max_delay_sec = 0  # not 0: a client must apply within N s
edit_interval_sec = 5  # edits of one car reach the others at most once per N s
spawn_interval_sec = 2  # one player's new cars at most once per N s

[listing]
url = ""  # "https://api.nodemp.com" to be listed in the launcher
host_id = ""
host_secret = ""  # or NODE_DIRECTORY_HOST_SECRET, out of this file
description = ""
mode = "freeroam"
tags = ""
preview = ""  # a JPEG or PNG; empty: the map's own
public = true
guests = true  # players without a NodeMP account
```

- A setting that isn't in the file keeps its default. To change it, write it into its table, and add the table if the file doesn't have it yet.
- The server reads the file at start, so restart it after an edit.
- The server rejects a value of the wrong type or out of range: the default stays, and the log has a warning. The server also warns about an unknown key and names it, which is how a typo shows up.
- A table or a key written twice stops the server from starting. The message names the file and the line ([The server won't start](/hosting/troubleshooting/#the-server-wont-start)).
- Lists (`connection_limit_exempt`, `masked_commands`, `trusted`) can be a comma-separated string or a TOML list.

## What people change most

### Name, map and slots

These are `name`, `map`, `max_players` and `cars_per_player` in `[server]`. An example: [Run a server](/hosting/quick-start/#name-map-and-slots).

### The port

`[server] port` (`30814` by default) sets one port for both TCP and UDP. To make the server listen on every address, IPv4 and IPv6, leave `address` at `"::"`.

### The game file check

`[integrity] verify` sets how closely the launcher checks the player's game files:

- `"off"`: the server asks for nothing, but the launcher still checks `size`.
- `"size"`: the size of every game file and extra files in the game's `content/`. The default.
- `"scripts"`: the same, plus checksums of the game's `lua/` and `ui/`. Catches edited scripts.
- `"full"`: checksums of the whole game, about 50 GB, archives included. This is an audit, too slow for a check before joining.
- `"strict"`: the same as `scripts`, plus a comparison of the archives' tables of contents, the whole game folder and the user folder with a reference of a clean install ([Strict file check](/hosting/strict-verification/)).

### A place in the server list

The `[listing]` table sets it, including the links to your server's Discord, rules, site and voice chat. How to fill it in: [Get listed](/hosting/registering/).

### Chat

Chat is built into the server. `[chat] max_length`, `rate_per_sec` and `burst` limit the length of a line and how often a player can write, so that nobody floods the chat.

### Other players' cars

The client mod holds back other players' new cars and changes so that the game doesn't freeze to rebuild them mid-corner, and each player decides when to apply them ([what players see](/players/settings/#other-players-new-cars-and-changes)). For a race or a league, where everyone must see the same cars at once, you can turn the waiting off, or require that everything is built within a set time:

```toml
[vehicles]
queue = "off"            # or: queue = "allow" and queue_max_delay_sec = 10
```

A plugin can also switch this during a session and build everything before a start ([Players and vehicles](/plugins/players-and-vehicles/)). `edit_interval_sec` and `spawn_interval_sec` cut the number of rebuilds further ([Settings reference](/hosting/configuration/#vehicles)).

### Bad connections

A player who is silent for `lag_grace_sec` seconds counts as lagging, and after `disconnect_sec` the player is disconnected ([Settings reference](/hosting/configuration/#network)). For players on mobile data or a VPN, allow more time:

```toml
[network]
disconnect_sec = 60
```

More than 600 seconds doesn't help: after 600 seconds the launcher stops trying to come back. The timers must stay in order or the server won't start: `lag_grace_sec < seat_takeover_sec <= seat_release_sec <= disconnect_sec`, and `lag_grace_sec` is at least 1.

## Environment variables

Every setting has an environment variable of its own, named in the [settings reference](/hosting/configuration/). The variable wins over the file, and `--port` on the command line wins over both. Keep secrets such as `host_secret` in the environment: then they don't end up in a file that gets copied and sent around.

A few variables aren't settings:

| Variable | What it does |
|---|---|
| `NODE_LUA` | The path to Lua 5.1 for the obfuscator. Needed on Linux. |
| `NODE_TOOLS_DIR` | Another place for the `tools/` folder. |
| `NODE_PROVIDER_DISABLE_CONFIG` | `true` or `1` stops the server from reading `server.toml` and takes everything from the environment. The Docker image works this way. |
| `NODE_PROVIDER_IP_ENV`, `NODE_PROVIDER_PORT_ENV` | For hosting panels: the name of the variable in which the panel passes the address and the port. |
| `NODE_HEARTBEAT_FILE` | A file the server keeps updating while it runs. Docker's health check reads it. |
| `NODE_FORCE_ANSI` | `1` or `true` keeps the colors even when the output isn't a terminal. |

## Command line

| Option | What it does |
|---|---|
| `--config=FILE` | Which settings file to read. By default `server.toml` in the working directory. Put a path with spaces in quotes. |
| `--port=N` | The TCP and UDP port. Wins over the file and the environment. |
| `--working-directory=DIR` | The working directory: every relative path starts there, including the path in `--config`. |
| `--version` | Print the version and exit. |
| `--help` | Print the help and exit. |
| `--gen-integrity GAMEDIR` | Make the reference manifest for the strict check ([Strict file check](/hosting/strict-verification/#make-the-manifest)). |
| `--bans list`, `--bans remove …` | Show or lift bans while the server is stopped ([Console, kicks and bans](/hosting/administration/#bans)). |
| `--obf-selftest` | Check that the obfuscator works. |

A value may also follow its option after a space: `--port 30815`. To run two servers on one machine, give each its own working directory and port:

```bash
./Node-Server --working-directory=/srv/nodemp-2 --port=30815
```
