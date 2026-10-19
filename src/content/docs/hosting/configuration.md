---
title: Settings reference
description: Every server setting, table by table, with its type, default and environment variable.
---

How the file works, the command line and the settings people change most are on
[Configuring the server](/hosting/server-toml/).

In the order the server declares them. Strings are in quotes, as in the file.

## `[server]`

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

## `[vehicles]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[vehicles]` | `queue` | string | `"allow"` | `NODE_VEHICLES_QUEUE` | `"allow"`: each player's mod may hold other players' new cars and part, tuning or model changes until the player takes them, as the player chose. `"off"`: every change is built as it arrives. |
| `[vehicles]` | `queue_max_delay_sec` | int | `0` | `NODE_VEHICLES_QUEUE_MAX_DELAY_SEC` | Not `0`: every player builds what waits no later than this many seconds after the first of it came, whatever they chose. Up to `3600`. |
| `[vehicles]` | `edit_interval_sec` | int | `5` | `NODE_VEHICLES_EDIT_INTERVAL_SEC` | The edits of one car reach the other players at most once per this many seconds, as the latest config; the editor's own car changes at once. `0`: every edit as it comes. |
| `[vehicles]` | `spawn_interval_sec` | int | `2` | `NODE_VEHICLES_SPAWN_INTERVAL_SEC` | One player's new cars at most once per this many seconds; one sooner is refused with *Wait N s*. Walking and replacing your own car don't count. `0`: no limit. |

## `[listing]`

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

## `[integrity]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[integrity]` | `verify` | string | `"size"` | `NODE_VERIFY_GAME` | How closely a player's game files are checked: `off`, `size`, `scripts`, `full` or `strict`. |
| `[integrity]` | `manifests` | string | `"integrity"` | `NODE_INTEGRITY_DIR` | The folder with the reference manifests for `strict`. |
| `[integrity]` | `recheck_sec` | int | `600` | `NODE_INTEGRITY_RECHECK_SEC` | Under `strict`, how many seconds apart each player's files are checked again during the session. `0`: never; anything under `60` counts as `60`. Since 1.12.0. |

## `[network]`

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

## `[queue]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[queue]` | `enabled` | bool | `true` | `NODE_QUEUE_ENABLED` | When the server is full, signed-in players wait in its [join queue](/hosting/join-queue/) instead of being turned away. Only on a listed server (`[listing] url`), where accounts are checked. |
| `[queue]` | `max_waiting` | int | `50` | `NODE_QUEUE_MAX_WAITING` | How many players may wait at once, from 0 to 1000. `0`: nobody waits. |
| `[queue]` | `max_waiting_per_ip` | int | `1` | `NODE_QUEUE_MAX_WAITING_PER_IP` | How many may wait from one address, from 1 to 1000. Addresses in `[network] connection_limit_exempt` are not limited. |
| `[queue]` | `downloads_while_waiting` | int | `3` | `NODE_QUEUE_DOWNLOADS_WHILE_WAITING` | How many waiting players download mods at once, from 1 to 64, in queue order. Players joining a free place count too, and go first. |
| `[queue]` | `max_no_shows` | int | `3` | `NODE_QUEUE_MAX_NO_SHOWS` | After this many no-shows within `no_show_window_min`, an account may not queue for `no_show_bar_min`. A no-show is a player who got a place and left before reaching the world. `0`: never. |
| `[queue]` | `no_show_window_min` | int | `60` | `NODE_QUEUE_NO_SHOW_WINDOW_MIN` | The minutes over which no-shows are counted, from 1 to 10080. |
| `[queue]` | `no_show_bar_min` | int | `30` | `NODE_QUEUE_NO_SHOW_BAR_MIN` | How many minutes the queue stays closed to such an account, up to 10080. `0`: never closed. |

## `[chat]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[chat]` | `max_length` | int | `256` | `NODE_CHAT_MAX_LENGTH` | The longest chat line, in bytes, from 16 to 2048. |
| `[chat]` | `rate_per_sec` | int | `2` | `NODE_CHAT_RATE_PER_SEC` | Lines a player may send per second on average. Extra lines aren't sent; nobody is kicked. |
| `[chat]` | `burst` | int | `5` | `NODE_CHAT_BURST` | Lines a player may send in a row before the rate applies. |
| `[chat]` | `log` | bool | `true` | `NODE_CHAT_LOG_TO_CONSOLE` | Show the chat in the console and in the log. |
| `[chat]` | `masked_commands` | string | `"login, register, reg, password, passwd, pass, pw, auth, changepassword, setpassword, 2fa, totp, otp, pin, token, apikey"` | `NODE_CHAT_LOG_HIDDEN_COMMANDS` | Commands whose arguments are logged as `***`. `""`: log every command as typed. |

## `[logs]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[logs]` | `debug` | bool | `false` | `NODE_DEBUG` | Debug logging from every part of the server. |
| `[logs]` | `details` | bool | `false` | `NODE_LOG_DETAILS` | Show on the console the statistics and housekeeping lines that otherwise go only to `logs/server.log`: `netstats`, seat changes, failed connection attempts. |
| `[logs]` | `max_size_mb` | int | `50` | `NODE_LOG_MAX_SIZE_MB` | Start a new `server.log` once it grows past this many MB, and at every start. `0`: only at start. |
| `[logs]` | `keep` | int | `5` | `NODE_LOG_KEEP` | How many old logs to keep. |
| `[logs]` | `date` | bool | `false` | `NODE_LOG_DATE` | Put the date before the time on every line. |
| `[logs]` | `netstats_sec` | int | `15` | `NODE_NETWORK_STATS_INTERVAL_SEC` | How often to log a `netstats` line for each player. `0`: only when they leave. |

## `[sync]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[sync]` | `variant` | string | `""` | `NODE_SYNC_VARIANT` | For sync tests: one variant, `"A"` to `"D"`, for everyone. Empty: each player's own. |
| `[sync]` | `hold_tight` | string | `""` | `NODE_SYNC_HOLD_TIGHT` | `"on"` or `"off"` sets *Hold other cars tightly* for everyone. |
| `[sync]` | `steer_lead` | string | `""` | `NODE_SYNC_STEER_LEAD` | `"on"` or `"off"` sets *Steering look-ahead* for everyone. |
| `[sync]` | `verbose_trace` | string | `""` | `NODE_SYNC_VERBOSE_TRACE` | `"on"` turns on everyone's most detailed sync logs. |
| `[sync]` | `trace_rate` | int | `0` | `NODE_SYNC_TRACE_RATE` | The rate of those logs for everyone: `10`, `20` or `60` Hz. `0`: each player's own. |

## `[http]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[http]` | `ca_file` | string | `""` | `NODE_HTTP_CA_FILE` | A CA bundle for plugins' HTTPS requests instead of the system's. |
| `[http]` | `insecure` | bool | `false` | `NODE_HTTP_INSECURE` | Skip certificate checks in plugins' HTTPS requests. Leave off. |
| `[http]` | `allow_private_networks` | bool | `false` | `NODE_HTTP_ALLOW_PRIVATE_NETWORKS` | Let plugins' HTTP requests reach local and private addresses. |

## `[resources]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[resources]` | `obfuscate` | bool | `true` | `NODE_OBFUSCATE` | Obfuscate the client scripts of resources. `false` sends them as they are. |
| `[resources]` | `trusted` | string | `""` | `NODE_RESOURCES_TRUSTED` | Resources whose Lua gets the whole standard library: files anywhere, programs, the environment. `"*"` trusts every one. Others reach only their own folder ([what a resource can do](/plugins/resources/#the-lua-environment)). |

## `[experimental]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[experimental]` | `node_grab` | bool | `false` | `NODE_EXPERIMENTAL_NODEGRAB` | Allow the experimental node grabber checked by the server. Each grab still needs a plugin that allows it. |
