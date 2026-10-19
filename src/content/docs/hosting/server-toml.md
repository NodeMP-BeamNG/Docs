---
title: Configuring the server
description: How server.toml works, the settings people change most, environment variables and command-line options.
---

Every server setting lives in one file, `server.toml`, in the server's working directory. This page
starts with how the file behaves, then the settings people change most, and ends with the
environment variables and the command line. [Every setting](/hosting/configuration/), table by
table, is on its own page.

## How the file works

On the first start the server writes a short file with the tables a host fills in: `[server]`,
`[listing]` and `[vehicles]`.

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

- **Everything else you add yourself.** A setting that isn't in the file keeps its default. To
  change one, write it into its table, and add the table if the file doesn't have it yet. The
  names are in the [settings reference](/hosting/configuration/).
- **The server only reads your file.** It doesn't add or change anything in it, and it reads it at
  start, so restart the server after a change.
- **Mistakes are explained.** A value of the wrong type or out of range is replaced by the default,
  with a warning in the log. A key the server doesn't know gets a warning with its name, which is
  how a typo shows up. A table written twice stops the server from starting. Usually that's a
  second `[listing]` pasted under the one already in the file: move its keys into the first one and
  delete the second.
- **Lists** (`connection_limit_exempt`, `masked_commands`, `trusted`) can be a comma-separated string or a TOML
  list.
- **A file from before 1.9.0** (`[General]`, `[Directory]` and the rest) is converted once, on the
  first start of 1.9.0. The server writes it in the new layout with the same settings and keeps the
  old one as `server.toml.old`. [Updating](/hosting/updating/#settings-since-190) lists the
  names that changed.

## What people change most

**Name, map and slots**: `name`, `map`, `max_players` and `cars_per_player` in `[server]`.
[Run a server](/hosting/quick-start/#name-map-and-slots) has an example.

**The port**: `[server] port`, `30814` by default, the same for TCP and UDP. Leave `address` at
`"::"`: the server then listens on every address, IPv4 and IPv6.

**The game file check**: `[integrity] verify`.

| Value | What is checked | How long the player waits |
|---|---|---|
| `"size"` | The size of every game file, and extra files in the game's `content/`. The default. | About 2 seconds. |
| `"scripts"` | The same, plus checksums of the game's `lua/` and `ui/`. Catches edited scripts. | About 10 seconds. |
| `"full"` | Checksums of the whole game, about 50 GB. An audit, not a check before every join. | Minutes. |
| `"strict"` | The whole game folder, the contents of its archives and the user folder, against a clean install. | A few seconds. See [Strict file check](/hosting/strict-verification/). |
| `"off"` | The server asks for nothing, but the launcher still checks `size`. | |

**A place in the server list**: the `[listing]` table, and in it the links to your Discord, rules,
site and voice chat. [Get listed](/hosting/registering/) explains how to fill it in.

**Chat** is part of the server. `[chat] max_length`, `rate_per_sec` and `burst` keep it from being
flooded: extra lines just aren't sent, and nobody is kicked for chatting.

**Other players' cars.** A new car, or a change of a car's parts, tuning or model, has to be built
on every player's machine, and building stops the game for a moment. So each player's mod holds
other players' new cars and changes and builds them when the player stops, every 30 seconds at the
latest, or on a click ([what players see](/players/settings/#other-players-new-cars-and-changes)).
For a race or a league, where everyone must see the same cars at once, turn it off; or keep it and
have everything built within a time you set:

```toml
[vehicles]
queue = "off"            # or: queue = "allow" and queue_max_delay_sec = 10
```

A resource can switch it during the session too, and have everything built right before a start
([plugin API](/plugins/players-and-vehicles/#scheduled-changes)). Two more settings keep the
rebuilds few to begin with: the edits of one car reach the others at most once per
`edit_interval_sec` (5), the latest one, and one player's new cars come at most once per
`spawn_interval_sec` (2); a car spawned sooner is refused with *Wait 2 s*.

**Bad connections.** A player silent for `lag_grace_sec` seconds (8) shows as lagging. After
`disconnect_sec` (30) they are dropped, and that's also how long the server waits for a broken
connection to come back. For players on mobile internet or a VPN you can give them longer:

```toml
[network]
disconnect_sec = 60
```

More than 600 seconds doesn't help: a launcher stops trying to come back after 600. The four
timers must stay in order, or the server won't start:
`lag_grace_sec < seat_takeover_sec <= seat_release_sec <= disconnect_sec`.

## Environment variables

Every setting has an environment variable of its own, named in the
[settings reference](/hosting/configuration/). The variable wins
over the file, and `--port` on the command line wins over both. Secrets such as `host_secret` belong
in the environment: then they don't end up in a file that gets copied and sent around.

A few variables aren't settings:

| Variable | What it does |
|---|---|
| `NODE_LUA` | The Lua 5.1 the obfuscator runs on. Needed on Linux. |
| `NODE_TOOLS_DIR` | Another place for the `tools/` folder. |
| `NODE_PROVIDER_DISABLE_CONFIG` | `true` ignores `server.toml` and takes everything from the environment. The Docker image works this way. |
| `NODE_PROVIDER_IP_ENV`, `NODE_PROVIDER_PORT_ENV` | For hosting panels: the name of the variable that carries the address and port the panel assigns. |
| `NODE_HEARTBEAT_FILE` | A file the server keeps touching while it runs. Docker's health check reads it. |
| `NODE_FORCE_ANSI` | `1` keeps colours when the output isn't a terminal. |

## Command line

| Option | What it does |
|---|---|
| `--config=FILE` | Which settings file to read. By default, `server.toml` in the working directory. |
| `--port=N` | The TCP and UDP port. Wins over the file and the environment. |
| `--working-directory=DIR` | The working directory: every relative path starts there. |
| `--version` | Print the version and exit. |
| `--help` | Print the help and exit. |
| `--gen-integrity GAMEDIR` | Make the reference manifest for the strict check ([more](/hosting/strict-verification/#make-the-manifest)). |
| `--bans list`, `--bans remove …` | Show or lift bans while the server is stopped ([more](/hosting/administration/#bans)). |
| `--obf-selftest` | Check that the obfuscator works. |

A value may also follow its option after a space: `--port 30815`. To run two servers on one
machine, give each its own working directory and port:

```bash
./Node-Server --working-directory=/srv/nodemp-2 --port=30815
```
