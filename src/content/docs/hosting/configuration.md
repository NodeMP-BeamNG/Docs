---
title: Settings reference
description: Every server setting, table by table, with its type, default and environment variable.
---

The keys of `server.toml` in the order the server declares them. Strings are in quotes, as in the file. How the file works, the environment variables and the command line: [Configuring the server](/hosting/server-toml/).

## `[server]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[server]` | `name` | string | `"Node Server"` | `NODE_NAME` | The server's name in the list and in the game. |
| `[server]` | `port` | int | `30814` | `NODE_PORT` | The TCP and UDP port players connect to. |
| `[server]` | `max_players` | int | `8` | `NODE_MAX_PLAYERS` | How many players can be on the server at once. |
| `[server]` | `cars_per_player` | int | `1` | `NODE_MAX_CARS` | How many cars one player can have. |
| `[server]` | `map` | string | `"/levels/gridmap_v2/info.json"` | `NODE_MAP` | The map, as the path to its `info.json`. |
| `[server]` | `mods` | string | `"content"` | `NODE_CONTENT_FOLDER` | The folder with the mod zips players download. |
| `[server]` | `address` | string | `"::"` | `NODE_IP` | The address to listen on. `"::"` means every address, IPv4 and IPv6. It isn't the server's public address. |
| `[server]` | `console` | bool | `false` | `NODE_CONSOLE` | Read console commands from standard input even when it isn't a terminal but a pipe or a file. With a terminal the console turns on by itself. |

## `[vehicles]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[vehicles]` | `queue` | string | `"allow"` | `NODE_VEHICLES_QUEUE` | With `"allow"`, each player decides whether to hold back other players' new cars and changes ([Other players' cars](/hosting/server-toml/#other-players-cars)). With `"off"`, every change is built as soon as it arrives. |
| `[vehicles]` | `queue_max_delay_sec` | int | `0` | `NODE_VEHICLES_QUEUE_MAX_DELAY_SEC` | Not `0`: every player builds what is waiting no later than this many seconds after the first change, whatever the player chose. Up to `3600`. |
| `[vehicles]` | `edit_interval_sec` | int | `5` | `NODE_VEHICLES_EDIT_INTERVAL_SEC` | The edits of one car reach the other players at most once per this many seconds, as the latest configuration. The editor's own car changes at once. `0` turns the limit off. |
| `[vehicles]` | `spawn_interval_sec` | int | `2` | `NODE_VEHICLES_SPAWN_INTERVAL_SEC` | One player's new cars at most once per this many seconds. A car ordered sooner is refused by the server with `Wait N s`, and the game shows *Wait N s*. Walking and replacing your own car don't count. `0` turns the limit off. |

## `[listing]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[listing]` | `url` | string | `""` | `NODE_DIRECTORY_URL` | Where to report the server: `"https://api.nodemp.com"`. Empty means the server isn't in the list. |
| `[listing]` | `host_id` | string | `""` | `NODE_DIRECTORY_HOST_ID` | The public half of the server key. |
| `[listing]` | `host_secret` | string | `""` | `NODE_DIRECTORY_HOST_SECRET` | The secret half. Keep it like a password. |
| `[listing]` | `description` | string | `""` | `NODE_DIRECTORY_DESCRIPTION` | One or two sentences under the name in the list. |
| `[listing]` | `mode` | string | `"freeroam"` | `NODE_DIRECTORY_MODE` | The kind of server, a column of its own in the list: `freeroam`, `racing`, `roleplay` and so on. |
| `[listing]` | `tags` | string | `""` | `NODE_DIRECTORY_TAGS` | Comma-separated tags players filter the list by ([how many and how long](/hosting/registering/#how-the-server-looks-in-the-list)). |
| `[listing]` | `preview` | string | `""` | `NODE_DIRECTORY_PREVIEW` | Your own picture for the list ([The picture](/hosting/registering/#the-picture)). Empty means the map's own picture. |
| `[listing]` | `public` | bool | `true` | `NODE_DIRECTORY_PUBLIC` | `false` keeps the server out of the public list. |
| `[listing]` | `guests` | bool | `true` | `NODE_DIRECTORY_TEST_DRIVE` | Let in players without an account. |
| `[listing]` | `fingerprint` | string | `""` | `NODE_DIRECTORY_FINGERPRINT` | Only for a server list you run yourself. Leave empty. |
| `[listing]` | `ca_file` | string | `""` | `NODE_DIRECTORY_CA_FILE` | Only for a server list you run yourself. Leave empty. |
| `[listing]` | `admit_when_down` | bool | `false` | `NODE_DIRECTORY_REDEEM_FAIL_OPEN` | While NodeMP is unreachable, `false` turns players away and `true` lets them in as unverified guests if `guests = true`. |
| `[listing]` | `allow_http` | bool | `false` | `NODE_DIRECTORY_ALLOW_INSECURE` | Allow an `http://` address in `url`. Leave it off. |
| `[listing]` | `discord` | string | `""` | `NODE_DIRECTORY_LINK_DISCORD` | An invite to your Discord. The links the list accepts: [Links](/hosting/registering/#links). |
| `[listing]` | `rules` | string | `""` | `NODE_DIRECTORY_LINK_RULES` | A page with the server's rules. |
| `[listing]` | `site` | string | `""` | `NODE_DIRECTORY_LINK_SITE` | The server's website. |
| `[listing]` | `donate` | string | `""` | `NODE_DIRECTORY_LINK_DONATE` | A page where players can support the server. |
| `[listing]` | `voice` | string | `""` | `NODE_DIRECTORY_LINK_VOICE` | The voice chat. |

## `[integrity]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[integrity]` | `verify` | string | `"size"` | `NODE_VERIFY_GAME` | How closely to check the player's game files: `off`, `size`, `scripts`, `full` or `strict`. |
| `[integrity]` | `manifests` | string | `"integrity"` | `NODE_INTEGRITY_DIR` | The folder with the reference manifests for `strict`, relative to the working directory. |
| `[integrity]` | `recheck_sec` | int | `600` | `NODE_INTEGRITY_RECHECK_SEC` | Under `strict`, how many seconds apart each player's files are checked again during the session. `0` turns the recheck off, and values from `1` to `59` count as `60`. |

## `[network]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[network]` | `tls_cert` | string | `"node_cert.pem"` | `NODE_TLS_CERT` | The server's TLS certificate, made on the first start. A relative path starts at the program's folder. |
| `[network]` | `tls_key` | string | `"node_key.pem"` | `NODE_TLS_KEY` | The certificate's private key. |
| `[network]` | `relay_radius` | int | `0` | `NODE_STATE_RELAY_RADIUS` | Send a car's positions only to players within this radius, in meters. `0` means to everyone. |
| `[network]` | `lag_grace_sec` | int | `8` | `NODE_NETWORK_LAG_GRACE_SEC` | Seconds of silence before a player counts as lagging. |
| `[network]` | `seat_takeover_sec` | int | `10` | `NODE_NETWORK_AUTH_TAKEOVER_SEC` | Seconds a silent driver keeps the seat before another player can take it. |
| `[network]` | `seat_release_sec` | int | `30` | `NODE_NETWORK_AUTH_RELEASE_SEC` | Seconds of silence before the server frees the driver's seat and hands the car on. |
| `[network]` | `disconnect_sec` | int | `30` | `NODE_NETWORK_DISCONNECT_SEC` | Seconds of silence before the player is disconnected. The server waits as long for a broken connection to recover. |
| `[network]` | `send_queue_budget_mb` | int | `256` | `NODE_NETWORK_SEND_QUEUE_BUDGET_MB` | How much memory all outgoing queues may take together. `0` removes the shared limit and leaves the limit of 64 MB per player. |
| `[network]` | `max_connections_per_ip` | int | `32` | `NODE_NETWORK_MAX_CONNECTIONS_PER_IP` | How many connections from one address may be joining at the same time. |
| `[network]` | `max_connections` | int | `256` | `NODE_NETWORK_MAX_CONNECTIONS` | The same for all addresses together. |
| `[network]` | `connection_limit_exempt` | string | `"127.0.0.0/8, ::1/128, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 100.64.0.0/10, fd00::/8"` | `NODE_NETWORK_CONNECTION_LIMIT_EXEMPT` | Address ranges without the per-address limit. They still count toward `max_connections`. `""` or `"none"` removes the exceptions. |
| `[network]` | `handshake_timeout_sec` | int | `20` | `NODE_NETWORK_HANDSHAKE_TIMEOUT_SEC` | Seconds a new connection gets for the TLS handshake and for each of the first frames of joining. |
| `[network]` | `download_stall_sec` | int | `60` | `NODE_NETWORK_DOWNLOAD_STALL_SEC` | A mod download is cut off if the player receives not a single kilobyte for this many seconds. A slow download isn't cut off. |

## `[queue]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[queue]` | `enabled` | bool | `true` | `NODE_QUEUE_ENABLED` | When the server is full, players with an account wait in the [join queue](/hosting/join-queue/) instead of being turned away. Works only on a listed server (`[listing] url`), where accounts are checked. |
| `[queue]` | `max_waiting` | int | `50` | `NODE_QUEUE_MAX_WAITING` | How many players can wait at once, from 0 to 1000. `0` means nobody waits. |
| `[queue]` | `max_waiting_per_ip` | int | `1` | `NODE_QUEUE_MAX_WAITING_PER_IP` | How many can wait from one address, from 1 to 1000. Addresses in `[network] connection_limit_exempt` aren't limited. |
| `[queue]` | `downloads_while_waiting` | int | `3` | `NODE_QUEUE_DOWNLOADS_WHILE_WAITING` | How many waiting players download mods at once, from 1 to 64, in queue order. The downloads of players joining a free place count too and go first. |
| `[queue]` | `max_no_shows` | int | `3` | `NODE_QUEUE_MAX_NO_SHOWS` | After this many no-shows within `no_show_window_min`, an account can't join the queue for `no_show_bar_min` minutes. A no-show is a player who got a place and left before reaching the world. `0` turns the ban off. |
| `[queue]` | `no_show_window_min` | int | `60` | `NODE_QUEUE_NO_SHOW_WINDOW_MIN` | The minutes over which no-shows are counted, from 1 to 10080. |
| `[queue]` | `no_show_bar_min` | int | `30` | `NODE_QUEUE_NO_SHOW_BAR_MIN` | How many minutes the queue stays closed to such an account, up to 10080. `0` means it isn't closed. |

## `[chat]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[chat]` | `max_length` | int | `256` | `NODE_CHAT_MAX_LENGTH` | The longest chat line, in bytes. The server brings the value into the range from 16 to 2048. |
| `[chat]` | `rate_per_sec` | int | `2` | `NODE_CHAT_RATE_PER_SEC` | How many lines per second a player can send on average, at least 1. Extra lines aren't sent, and the player isn't kicked. |
| `[chat]` | `burst` | int | `5` | `NODE_CHAT_BURST` | How many lines in a row can be sent before the limit applies, at least 1. |
| `[chat]` | `log` | bool | `true` | `NODE_CHAT_LOG_TO_CONSOLE` | Show the chat in the console and in the log. |
| `[chat]` | `masked_commands` | string | `"login, register, reg, password, passwd, pass, pw, auth, changepassword, setpassword, 2fa, totp, otp, pin, token, apikey"` | `NODE_CHAT_LOG_HIDDEN_COMMANDS` | Commands whose arguments are logged as `***`. Write the names without `/`; case doesn't matter. `""` means log everything as typed. |

## `[logs]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[logs]` | `debug` | bool | `false` | `NODE_DEBUG` | A detailed debug log of every part of the server. |
| `[logs]` | `details` | bool | `false` | `NODE_LOG_DETAILS` | Print to the console the statistics and housekeeping lines that otherwise go only to `logs/server.log`, such as `netstats`. |
| `[logs]` | `max_size_mb` | int | `50` | `NODE_LOG_MAX_SIZE_MB` | Start a new `server.log` when it has grown past this many MB, and at every start. `0` means only at start. |
| `[logs]` | `keep` | int | `5` | `NODE_LOG_KEEP` | How many old logs to keep. |
| `[logs]` | `date` | bool | `false` | `NODE_LOG_DATE` | Put the date before the time on every line. |
| `[logs]` | `netstats_sec` | int | `15` | `NODE_NETWORK_STATS_INTERVAL_SEC` | How often to log a `netstats` line for each player. `0` means only when the player leaves. |

## `[http]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[http]` | `ca_file` | string | `""` | `NODE_HTTP_CA_FILE` | Your own set of root certificates for plugins' HTTPS requests instead of the system's. |
| `[http]` | `insecure` | bool | `false` | `NODE_HTTP_INSECURE` | Don't verify certificates in plugins' HTTPS requests. Leave it off. |
| `[http]` | `allow_private_networks` | bool | `false` | `NODE_HTTP_ALLOW_PRIVATE_NETWORKS` | Let plugins' HTTP requests reach local and private addresses. |

## `[resources]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[resources]` | `obfuscate` | bool | `true` | `NODE_OBFUSCATE` | Obfuscate plugins' client scripts. `false` sends them as they are. |
| `[resources]` | `trusted` | string | `""` | `NODE_RESOURCES_TRUSTED` | Plugins whose Lua gets the whole Lua standard library: any files, running programs, environment variables. `"*"` trusts all of them. The others reach only their own folder ([what a plugin can do](/plugins/resources/)). |

## `[experimental]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[experimental]` | `node_grab` | bool | `false` | `NODE_EXPERIMENTAL_NODEGRAB` | Allow the experimental node grabber, checked on the server. Each grab still has to be allowed by a plugin. |
