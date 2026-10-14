---
title: Server settings
description: How server.toml works, environment variables, command-line options, and every server setting with its default.
---

Every server setting lives in one file, `server.toml`, in the server's working directory. This page
starts with how the file behaves, then the settings people change most, and ends with
[every setting](#every-setting), table by table.

## How the file works

On the first start the server writes a short file with the two tables a host fills in: `[server]`
and `[listing]`.

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
  names are in the tables [below](#every-setting).
- **The server only reads your file.** It doesn't add or change anything in it, and it reads it at
  start, so restart the server after a change.
- **Mistakes are explained.** A value of the wrong type or out of range is replaced by the default,
  with a warning in the log. A key the server doesn't know gets a warning with its name, which is
  how a typo shows up. A table written twice stops the server from starting. Usually that's a
  second `[listing]` pasted under the one already in the file: move its keys into the first one and
  delete the second.
- **Lists** (`connection_limit_exempt`, `masked_commands`) can be a comma-separated string or a TOML
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

Every setting has an environment variable of its own, named in the tables below. The variable wins
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

## Every setting

In the order the server declares them. Strings are in quotes, as in the file.

### `[server]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[server]` | `name` | string | `"Node Server"` | `NODE_NAME` | The server name in the list and in the game. |
| `[server]` | `port` | int | `30814` | `NODE_PORT` | The TCP and UDP port players connect to. |
| `[server]` | `max_players` | int | `8` | `NODE_MAX_PLAYERS` | How many players may be on at once. |
| `[server]` | `cars_per_player` | int | `1` | `NODE_MAX_CARS` | How many cars one player may have at once. |
| `[server]` | `map` | string | `"/levels/gridmap_v2/info.json"` | `NODE_MAP` | The map, as the path to its `info.json`. |
| `[server]` | `mods` | string | `"content"` | `NODE_CONTENT_FOLDER` | The folder with the mod zips players download. |
| `[server]` | `address` | string | `"::"` | `NODE_IP` | The address to listen on. `"::"` is every address, IPv4 and IPv6. Not your public address. |
| `[server]` | `console` | bool | `false` | `NODE_CONSOLE` | Read console commands from standard input even without a terminal. |

### `[listing]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[listing]` | `url` | string | `""` | `NODE_DIRECTORY_URL` | Where to announce the server: `"https://api.nodemp.com"`. Empty: not listed. |
| `[listing]` | `host_id` | string | `""` | `NODE_DIRECTORY_HOST_ID` | The public half of the server key. |
| `[listing]` | `host_secret` | string | `""` | `NODE_DIRECTORY_HOST_SECRET` | The secret half. Keep it like a password. |
| `[listing]` | `description` | string | `""` | `NODE_DIRECTORY_DESCRIPTION` | One or two sentences under the name in the list. |
| `[listing]` | `mode` | string | `"freeroam"` | `NODE_DIRECTORY_MODE` | The kind of server, shown as a column: `freeroam`, `racing`, `roleplay` and so on. |
| `[listing]` | `tags` | string | `""` | `NODE_DIRECTORY_TAGS` | Up to eight comma-separated tags players can filter by. |
| `[listing]` | `preview` | string | `""` | `NODE_DIRECTORY_PREVIEW` | A JPEG or PNG for the list, at most 2 MB. Empty: the map's own picture. |
| `[listing]` | `public` | bool | `true` | `NODE_DIRECTORY_PUBLIC` | `false` keeps the server out of the public list. |
| `[listing]` | `guests` | bool | `true` | `NODE_DIRECTORY_TEST_DRIVE` | Let players without an account in. |
| `[listing]` | `fingerprint` | string | `""` | `NODE_DIRECTORY_FINGERPRINT` | Only for a server list you run yourself. Leave empty. |
| `[listing]` | `ca_file` | string | `""` | `NODE_DIRECTORY_CA_FILE` | Only for a server list you run yourself. Leave empty. |
| `[listing]` | `admit_when_down` | bool | `false` | `NODE_DIRECTORY_REDEEM_FAIL_OPEN` | While NodeMP can't be reached: `false` refuses joins, `true` lets players in as unverified guests. |
| `[listing]` | `allow_http` | bool | `false` | `NODE_DIRECTORY_ALLOW_INSECURE` | Allow an `http://` address in `url`. Leave off. |
| `[listing]` | `discord` | string | `""` | `NODE_DIRECTORY_LINK_DISCORD` | An invite to your Discord: `https://discord.gg/…` or `https://discord.com/invite/…`. |
| `[listing]` | `rules` | string | `""` | `NODE_DIRECTORY_LINK_RULES` | A page with the server's rules. |
| `[listing]` | `site` | string | `""` | `NODE_DIRECTORY_LINK_SITE` | The server's website. |
| `[listing]` | `donate` | string | `""` | `NODE_DIRECTORY_LINK_DONATE` | A page where players can support the server. |
| `[listing]` | `voice` | string | `""` | `NODE_DIRECTORY_LINK_VOICE` | The voice chat: `https://…`, `mumble://…` or `ts3server://…`. |

### `[integrity]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[integrity]` | `verify` | string | `"size"` | `NODE_VERIFY_GAME` | How closely a player's game files are checked: `off`, `size`, `scripts`, `full` or `strict`. |
| `[integrity]` | `manifests` | string | `"integrity"` | `NODE_INTEGRITY_DIR` | The folder with the reference manifests for `strict`. |

### `[network]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[network]` | `tls_cert` | string | `"node_cert.pem"` | `NODE_TLS_CERT` | The server's TLS certificate, made on the first start. A relative path starts at the executable's folder. |
| `[network]` | `tls_key` | string | `"node_key.pem"` | `NODE_TLS_KEY` | The certificate's private key. |
| `[network]` | `relay_radius` | int | `0` | `NODE_STATE_RELAY_RADIUS` | Send a car's positions only to players within this many metres. `0`: to everyone. |
| `[network]` | `lag_grace_sec` | int | `8` | `NODE_NETWORK_LAG_GRACE_SEC` | Seconds of silence before a player shows as lagging. |
| `[network]` | `seat_takeover_sec` | int | `10` | `NODE_NETWORK_AUTH_TAKEOVER_SEC` | Seconds a silent driver keeps the seat before another player can take it. |
| `[network]` | `seat_release_sec` | int | `30` | `NODE_NETWORK_AUTH_RELEASE_SEC` | Seconds of silence before the server frees the driver's seat and hands the car on. |
| `[network]` | `disconnect_sec` | int | `30` | `NODE_NETWORK_DISCONNECT_SEC` | Seconds of silence before the player is dropped. Also how long a broken connection may take to come back. |
| `[network]` | `send_queue_budget_mb` | int | `256` | `NODE_NETWORK_SEND_QUEUE_BUDGET_MB` | Memory all outgoing queues may take together. `0`: no shared limit. |
| `[network]` | `max_connections_per_ip` | int | `32` | `NODE_NETWORK_MAX_CONNECTIONS_PER_IP` | Connections from one address that may be joining at the same time. |
| `[network]` | `max_connections` | int | `256` | `NODE_NETWORK_MAX_CONNECTIONS` | The same for all addresses together. |
| `[network]` | `connection_limit_exempt` | string | `"127.0.0.0/8, ::1/128, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 100.64.0.0/10, fd00::/8"` | `NODE_NETWORK_CONNECTION_LIMIT_EXEMPT` | Address ranges without the per-address limit. `""` or `"none"`: no exceptions. |
| `[network]` | `handshake_timeout_sec` | int | `20` | `NODE_NETWORK_HANDSHAKE_TIMEOUT_SEC` | Seconds a new connection gets for the handshake and the first steps of joining. |
| `[network]` | `download_stall_sec` | int | `60` | `NODE_NETWORK_DOWNLOAD_STALL_SEC` | A mod download ends after this many seconds without progress. A slow one is never cut off. |

### `[chat]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[chat]` | `max_length` | int | `256` | `NODE_CHAT_MAX_LENGTH` | The longest chat line, in bytes, from 16 to 2048. |
| `[chat]` | `rate_per_sec` | int | `2` | `NODE_CHAT_RATE_PER_SEC` | Lines a player may send per second on average. Extra lines aren't sent; nobody is kicked. |
| `[chat]` | `burst` | int | `5` | `NODE_CHAT_BURST` | Lines a player may send in a row before the rate applies. |
| `[chat]` | `log` | bool | `true` | `NODE_CHAT_LOG_TO_CONSOLE` | Show the chat in the console and in the log. |
| `[chat]` | `masked_commands` | string | `"login, register, reg, password, passwd, pass, pw, auth, changepassword, setpassword, 2fa, totp, otp, pin, token, apikey"` | `NODE_CHAT_LOG_HIDDEN_COMMANDS` | Commands whose arguments are logged as `***`. `""`: log every command as typed. |

### `[logs]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[logs]` | `debug` | bool | `false` | `NODE_DEBUG` | Debug logging from every part of the server. |
| `[logs]` | `max_size_mb` | int | `50` | `NODE_LOG_MAX_SIZE_MB` | Start a new `server.log` once it grows past this many MB, and at every start. `0`: only at start. |
| `[logs]` | `keep` | int | `5` | `NODE_LOG_KEEP` | How many old logs to keep. |
| `[logs]` | `date` | bool | `false` | `NODE_LOG_DATE` | Put the date before the time on every line. |
| `[logs]` | `netstats_sec` | int | `15` | `NODE_NETWORK_STATS_INTERVAL_SEC` | How often to log a `netstats` line for each player. `0`: only when they leave. |

### `[sync]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[sync]` | `variant` | string | `""` | `NODE_SYNC_VARIANT` | For sync tests: one variant, `"A"` to `"D"`, for everyone. Empty: each player's own. |
| `[sync]` | `hold_tight` | string | `""` | `NODE_SYNC_HOLD_TIGHT` | `"on"` or `"off"` sets *Hold other cars tightly* for everyone. |
| `[sync]` | `steer_lead` | string | `""` | `NODE_SYNC_STEER_LEAD` | `"on"` or `"off"` sets *Steering look-ahead* for everyone. |
| `[sync]` | `verbose_trace` | string | `""` | `NODE_SYNC_VERBOSE_TRACE` | `"on"` turns on everyone's most detailed sync logs. |
| `[sync]` | `trace_rate` | int | `0` | `NODE_SYNC_TRACE_RATE` | The rate of those logs for everyone: `10`, `20` or `60` Hz. `0`: each player's own. |

### `[http]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[http]` | `ca_file` | string | `""` | `NODE_HTTP_CA_FILE` | A CA bundle for plugins' HTTPS requests instead of the system's. |
| `[http]` | `insecure` | bool | `false` | `NODE_HTTP_INSECURE` | Skip certificate checks in plugins' HTTPS requests. Leave off. |
| `[http]` | `allow_private_networks` | bool | `false` | `NODE_HTTP_ALLOW_PRIVATE_NETWORKS` | Let plugins' HTTP requests reach local and private addresses. |

### `[resources]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[resources]` | `obfuscate` | bool | `true` | `NODE_OBFUSCATE` | Obfuscate the client scripts of resources. `false` sends them as they are. |

### `[experimental]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[experimental]` | `node_grab` | bool | `false` | `NODE_EXPERIMENTAL_NODEGRAB` | Allow the experimental node grabber checked by the server. Each grab still needs a plugin that allows it. |
