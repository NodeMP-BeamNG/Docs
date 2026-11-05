---
title: Configuration reference
description: Every server setting by section, with environment variables, descriptions, and options.
---

The keys of `server.toml` in the order the server declares them. Strings are in quotes, as in the file. How the file, environment variables and command line work: [Configuring the server](/hosting/server-toml/).

## `[server]`

| Key | Environment | Description and options |
|---|---|---|
| `name` | `NODE_NAME` | The server's name in the server list and in the game. Default `"Node Server"`. |
| `port` | `NODE_PORT` | The TCP and UDP port players connect to. Default `30814`. |
| `max_players` | `NODE_MAX_PLAYERS` | How many players can be on the server at once. Default `8`. |
| `cars_per_player` | `NODE_MAX_CARS` | How many cars one player can have. Default `1`. |
| `map` | `NODE_MAP` | The map, as the path to its `info.json`. Default `"/levels/gridmap_v2/info.json"`. |
| `mods` | `NODE_CONTENT_FOLDER` | The folder with the mod zips players download. Default `"content"`. |
| `allow_client_mods` | `NODE_ALLOW_CLIENT_MODS` | Allow players to load client-side mods from their client `mods` folder. Options: `true`, `false`. Default `false`. |
| `address` | `NODE_IP` | The address to listen on. `"::"` means all IPv4 and IPv6 addresses. Not the server's public IP. Default `"::"`. |
| `console` | `NODE_CONSOLE` | Read console commands from standard input (for pipes and files). Options: `true`, `false`. Default `false`. |

## `[vehicles]`

| Key | Environment | Description and options |
|---|---|---|
| `queue` | `NODE_VEHICLES_QUEUE` | Vehicle queue behavior: `"allow"` (players decide whether to hold back new cars) or `"off"` (build immediately). Default `"allow"`. |
| `queue_max_delay_sec` | `NODE_VEHICLES_QUEUE_MAX_DELAY_SEC` | Maximum queue delay in seconds (up to `3600`). `0` disables forced building. Default `0`. |
| `edit_interval_sec` | `NODE_VEHICLES_EDIT_INTERVAL_SEC` | Minimum interval in seconds between configuration updates sent to others. `0` disables the limit. Default `5`. |
| `spawn_interval_sec` | `NODE_VEHICLES_SPAWN_INTERVAL_SEC` | Minimum interval in seconds between spawning new cars by the same player. `0` disables the limit. Default `2`. |

## `[listing]`

| Key | Environment | Description and options |
|---|---|---|
| `url` | `NODE_DIRECTORY_URL` | Directory server address: `"https://api.nodemp.com"`. Empty string leaves the server unlisted. Default `""`. |
| `host_id` | `NODE_DIRECTORY_HOST_ID` | Public identifier part of the server directory keypair. |
| `host_secret` | `NODE_DIRECTORY_HOST_SECRET` | Secret key part of the server directory keypair. Keep confidential. |
| `description` | `NODE_DIRECTORY_DESCRIPTION` | Short server description (1–2 sentences under the server name). |
| `mode` | `NODE_DIRECTORY_MODE` | Server game mode column in the list: `freeroam`, `racing`, `roleplay`, `drift`, etc. Default `"freeroam"`. |
| `tags` | `NODE_DIRECTORY_TAGS` | Comma-separated tags for filtering in the list (up to 8 tags). |
| `preview` | `NODE_DIRECTORY_PREVIEW` | Custom image URL for the server card. Empty string uses the map's preview image. |
| `public` | `NODE_DIRECTORY_PUBLIC` | Show server in the public master list. Options: `true`, `false`. Default `true`. |
| `guests` | `NODE_DIRECTORY_TEST_DRIVE` | Allow players without an account to join. Options: `true`, `false`. Default `true`. |
| `fingerprint` | `NODE_DIRECTORY_FINGERPRINT` | Certificate fingerprint for a private directory. Leave empty. |
| `ca_file` | `NODE_DIRECTORY_CA_FILE` | Path to custom CA certificate for a private directory. Leave empty. |
| `admit_when_down` | `NODE_DIRECTORY_REDEEM_FAIL_OPEN` | When directory is down: `true` admits players as guests, `false` refuses logins. Options: `true`, `false`. Default `false`. |
| `allow_http` | `NODE_DIRECTORY_ALLOW_INSECURE` | Allow insecure `http://` in `url`. Options: `true`, `false`. Default `false`. |
| `discord` | `NODE_DIRECTORY_LINK_DISCORD` | Invite link to your Discord community. |
| `rules` | `NODE_DIRECTORY_LINK_RULES` | Web link to server rules page. |
| `site` | `NODE_DIRECTORY_LINK_SITE` | Web link to official server website. |
| `donate` | `NODE_DIRECTORY_LINK_DONATE` | Web link to server support / donation page. |
| `voice` | `NODE_DIRECTORY_LINK_VOICE` | Web link to voice chat server. |

## `[integrity]`

| Key | Environment | Description and options |
|---|---|---|
| `verify` | `NODE_VERIFY_GAME` | Game file integrity check level. Options: `off`, `size`, `scripts`, `full`, `strict`. Default `"size"`. |
| `manifests` | `NODE_INTEGRITY_DIR` | Folder containing reference manifests for `strict` mode. Default `"integrity"`. |
| `recheck_sec` | `NODE_INTEGRITY_RECHECK_SEC` | Periodic recheck interval in seconds in `strict` mode. `0` disables periodic checks. Default `600`. |
| `auto_fetch` | `NODE_INTEGRITY_AUTO_FETCH` | Automatically fetch official reference manifest from backend if no local files exist in `strict` mode. Options: `true`, `false`. Default `true`. |
| `url` | `NODE_INTEGRITY_URL` | Backend URL for downloading official reference manifests. Defaults to `[listing] url` or `"https://api.nodemp.com"`. |
| `game_version` | `NODE_INTEGRITY_GAME_VERSION` | Game version of the reference manifest to download (e.g. `"0.39.4.0"`). Default is empty string (downloads latest available). |

## `[network]`

| Key | Environment | Description and options |
|---|---|---|
| `tls_cert` | `NODE_TLS_CERT` | Server TLS certificate path. Created automatically on first run. Default `"node_cert.pem"`. |
| `tls_key` | `NODE_TLS_KEY` | Private key for the server TLS certificate. Default `"node_key.pem"`. |
| `relay_radius` | `NODE_STATE_RELAY_RADIUS` | Position relay radius in meters. `0` sends positions to all players. Default `0`. |
| `lag_grace_sec` | `NODE_NETWORK_LAG_GRACE_SEC` | Silence threshold in seconds before a player is flagged as lagging. Default `8`. |
| `seat_takeover_sec` | `NODE_NETWORK_AUTH_TAKEOVER_SEC` | Seconds a silent driver holds a seat before another player can take it over. Default `10`. |
| `seat_release_sec` | `NODE_NETWORK_AUTH_RELEASE_SEC` | Seconds of silence before the server frees the driver seat. Default `30`. |
| `disconnect_sec` | `NODE_NETWORK_DISCONNECT_SEC` | Silence timeout in seconds before dropping connection. Default `30`. |
| `send_queue_budget_mb` | `NODE_NETWORK_SEND_QUEUE_BUDGET_MB` | Memory budget in MB for all outgoing queues. `0` removes the shared limit. Default `256`. |
| `max_connections_per_ip` | `NODE_NETWORK_MAX_CONNECTIONS_PER_IP` | Maximum concurrent connections during handshake per IP address. Default `32`. |
| `max_connections` | `NODE_NETWORK_MAX_CONNECTIONS` | Total concurrent connections during handshake across all IP addresses. Default `256`. |
| `connection_limit_exempt` | `NODE_NETWORK_CONNECTION_LIMIT_EXEMPT` | Subnets exempt from per-IP connection limits (CIDR). Default includes local subnets. |
| `handshake_timeout_sec` | `NODE_NETWORK_HANDSHAKE_TIMEOUT_SEC` | Timeout in seconds for TLS handshake and initial login frames. Default `20`. |
| `download_stall_sec` | `NODE_NETWORK_DOWNLOAD_STALL_SEC` | Mod download stall timeout in seconds if no data is received. Default `60`. |

## `[queue]`

| Key | Environment | Description and options |
|---|---|---|
| `enabled` | `NODE_QUEUE_ENABLED` | Enable join queue when server is full. Requires directory listing. Options: `true`, `false`. Default `true`. |
| `max_waiting` | `NODE_QUEUE_MAX_WAITING` | Maximum join queue capacity (`0` to `1000`). `0` disables queue. Default `50`. |
| `max_waiting_per_ip` | `NODE_QUEUE_MAX_WAITING_PER_IP` | Maximum queued players from a single IP address (`1` to `1000`). Default `1`. |
| `downloads_while_waiting` | `NODE_QUEUE_DOWNLOADS_WHILE_WAITING` | Number of queued players downloading mods concurrently (`1` to `64`). Default `3`. |
| `max_no_shows` | `NODE_QUEUE_MAX_NO_SHOWS` | Maximum no-shows within window before temporary queue bar. `0` disables penalty. Default `3`. |
| `no_show_window_min` | `NODE_QUEUE_NO_SHOW_WINDOW_MIN` | Time window in minutes for counting queue no-shows (`1` to `10080`). Default `60`. |
| `no_show_bar_min` | `NODE_QUEUE_NO_SHOW_BAR_MIN` | Penalty duration in minutes an account is barred from queuing. Default `30`. |

## `[chat]`

| Key | Environment | Description and options |
|---|---|---|
| `max_length` | `NODE_CHAT_MAX_LENGTH` | Maximum chat message length in bytes (`16` to `2048`). Default `256`. |
| `rate_per_sec` | `NODE_CHAT_RATE_PER_SEC` | Average messages per second allowed per player (minimum `1`). Default `2`. |
| `burst` | `NODE_CHAT_BURST` | Message burst allowed before rate limiting engages (minimum `1`). Default `5`. |
| `log` | `NODE_CHAT_LOG_TO_CONSOLE` | Log chat messages to console and `server.log`. Options: `true`, `false`. Default `true`. |
| `masked_commands` | `NODE_CHAT_LOG_HIDDEN_COMMANDS` | Commands whose arguments are masked as `***` in server logs. Default includes login keywords. |

## `[logs]`

| Key | Environment | Description and options |
|---|---|---|
| `debug` | `NODE_DEBUG` | Verbose debug log for all server components. Options: `true`, `false`. Default `false`. |
| `details` | `NODE_LOG_DETAILS` | Output statistics and service messages to terminal console. Options: `true`, `false`. Default `false`. |
| `max_size_mb` | `NODE_LOG_MAX_SIZE_MB` | Rotate `server.log` when file reaches this size in MB. `0` rotates only on start. Default `50`. |
| `keep` | `NODE_LOG_KEEP` | Number of rotated log files to keep. Default `5`. |
| `date` | `NODE_LOG_DATE` | Include date before timestamp in log lines. Options: `true`, `false`. Default `false`. |
| `netstats_sec` | `NODE_NETWORK_STATS_INTERVAL_SEC` | Interval in seconds to write player `netstats` to log. `0` logs only on disconnect. Default `15`. |

## `[http]`

| Key | Environment | Description and options |
|---|---|---|
| `ca_file` | `NODE_HTTP_CA_FILE` | Custom root CA certificates path for plugin HTTPS requests. |
| `insecure` | `NODE_HTTP_INSECURE` | Disable TLS certificate verification in plugin HTTPS requests. Options: `true`, `false`. Default `false`. |
| `allow_private_networks` | `NODE_HTTP_ALLOW_PRIVATE_NETWORKS` | Allow plugin HTTP requests to access private/local network addresses. Options: `true`, `false`. Default `false`. |

## `[resources]`

| Key | Environment | Description and options |
|---|---|---|
| `obfuscate` | `NODE_OBFUSCATE` | Obfuscate client Lua scripts before sending to players. Options: `true`, `false`. Default `true`. |
| `trusted` | `NODE_RESOURCES_TRUSTED` | Trusted plugins with full system access. `"*"` trusts all. Other plugins can only access their own directory. |

## `[experimental]`

| Key | Environment | Description and options |
|---|---|---|
| `node_grab` | `NODE_EXPERIMENTAL_NODEGRAB` | Enable experimental vehicle node grabbing with server validation. Options: `true`, `false`. Default `false`. |
