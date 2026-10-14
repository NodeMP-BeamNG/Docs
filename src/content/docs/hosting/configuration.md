---
title: Server settings
description: How server.toml works, environment variables, command-line options, and every server setting with its default.
---

Every server setting lives in one file, `server.toml`, in the server's working directory. This page
starts with how the file behaves, then the settings people change most, and ends with
[every setting](#every-setting), section by section.

## How the file works

- **Written once.** On the first start the server writes the file with every setting, its default
  and a comment. After that it never rewrites the file. When a newer version brings a new setting,
  the server adds just that one, at the end of its table, and says so in the log.
- **Read at start.** Change a value, then restart the server.
- **Mistakes are explained.** A value of the wrong type or out of range is replaced by the default,
  with a warning in the log. A table written twice stops the server from starting. Usually that's a
  second `[Directory]` pasted from the website: move its keys into the table the file already has
  and delete the second one.
- **Lists** (`ConnectionLimitExempt`, `LogHiddenCommands`) can be a comma-separated string or a TOML
  list.

## What people change most

**Name, map and slots**: `Name`, `Map`, `MaxPlayers` and `MaxCars` in `[General]`.
[Run a server](/hosting/quick-start/#name-map-and-slots) has an example.

**The port**: `[General] Port`, `30814` by default, the same for TCP and UDP. Leave `IP` at `"::"`:
the server then listens on every address, IPv4 and IPv6.

**The game file check**: `[General] VerifyGame`.

| Value | What is checked | How long the player waits |
|---|---|---|
| `"size"` | The size of every game file, and extra files in the game's `content/`. The default. | About 2 seconds. |
| `"scripts"` | The same, plus checksums of the game's `lua/` and `ui/`. Catches edited scripts. | About 10 seconds. |
| `"full"` | Checksums of the whole game, about 50 GB. An audit, not a check before every join. | Minutes. |
| `"strict"` | The whole game folder, the contents of its archives and the user folder, against a clean install. | A few seconds. See [Strict file check](/hosting/strict-verification/). |
| `"off"` | The server asks for nothing, but the launcher still checks `size`. | |

**A place in the server list**: the `[Directory]` table. [Get listed](/hosting/registering/)
explains how to fill it in.

**Chat** is part of the server. `[Chat] MaxLength`, `RatePerSec` and `Burst` keep it from being
flooded: extra lines just aren't sent, and nobody is kicked for chatting.

**Bad connections.** A player silent for `LagGraceSec` seconds (8) shows as lagging. After
`DisconnectSec` (30) they are dropped, and that's also how long the server waits for a broken
connection to come back. For players on mobile internet or a VPN you can raise `DisconnectSec`. The
four `[Network]` timers must stay in order,
`LagGraceSec < AuthTakeoverSec <= AuthReleaseSec <= DisconnectSec`, or the server won't start.

## Environment variables

Every setting has an environment variable of its own, named in the tables below. The variable wins
over the file, and `--port` on the command line wins over both. Secrets such as `HostSecret` belong
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

### `[General]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[General]` | `Debug` | bool | `false` | `NODE_DEBUG` | Debug logging from every part of the server. |
| `[General]` | `IP` | string | `"::"` | `NODE_IP` | The address to listen on. `"::"` is every address, IPv4 and IPv6. Not your public address. |
| `[General]` | `Port` | int | `30814` | `NODE_PORT` | The TCP and UDP port players connect to. |
| `[General]` | `Name` | string | `"Node Server"` | `NODE_NAME` | The server name in the list and in the game. |
| `[General]` | `MaxCars` | int | `1` | `NODE_MAX_CARS` | How many cars one player may have at once. |
| `[General]` | `MaxPlayers` | int | `8` | `NODE_MAX_PLAYERS` | How many players may be on at once. |
| `[General]` | `Map` | string | `"/levels/gridmap_v2/info.json"` | `NODE_MAP` | The map, as the path to its `info.json`. |
| `[General]` | `VerifyGame` | string | `"size"` | `NODE_VERIFY_GAME` | How closely a player's game files are checked: `off`, `size`, `scripts`, `full` or `strict`. |
| `[General]` | `IntegrityDir` | string | `"integrity"` | `NODE_INTEGRITY_DIR` | The folder with the reference manifests for `strict`. |
| `[General]` | `Console` | bool | `false` | `NODE_CONSOLE` | Read console commands from standard input even without a terminal. |

### `[Resources]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[Resources]` | `Obfuscate` | bool | `true` | `NODE_OBFUSCATE` | Obfuscate the client scripts of resources. `false` sends them as they are. |

### `[Content]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[Content]` | `Folder` | string | `"content"` | `NODE_CONTENT_FOLDER` | The folder with the mod zips players download. |

### `[Network]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[Network]` | `TlsCert` | string | `"node_cert.pem"` | `NODE_TLS_CERT` | The server's TLS certificate, made on the first start. A relative path starts at the executable's folder. |
| `[Network]` | `TlsKey` | string | `"node_key.pem"` | `NODE_TLS_KEY` | The certificate's private key. |
| `[Network]` | `StateRelayRadius` | int | `0` | `NODE_STATE_RELAY_RADIUS` | Send a car's positions only to players within this many metres. `0`: to everyone. |
| `[Network]` | `LagGraceSec` | int | `8` | `NODE_NETWORK_LAG_GRACE_SEC` | Seconds of silence before a player shows as lagging. |
| `[Network]` | `AuthTakeoverSec` | int | `10` | `NODE_NETWORK_AUTH_TAKEOVER_SEC` | Seconds a silent driver keeps the seat before another player can take it. |
| `[Network]` | `AuthReleaseSec` | int | `30` | `NODE_NETWORK_AUTH_RELEASE_SEC` | Seconds of silence before the server frees the driver's seat and hands the car on. |
| `[Network]` | `DisconnectSec` | int | `30` | `NODE_NETWORK_DISCONNECT_SEC` | Seconds of silence before the player is dropped. Also how long a broken connection may take to come back. |
| `[Network]` | `SendQueueBudgetMB` | int | `256` | `NODE_NETWORK_SEND_QUEUE_BUDGET_MB` | Memory all outgoing queues may take together. `0`: no shared limit. |
| `[Network]` | `StatsIntervalSec` | int | `15` | `NODE_NETWORK_STATS_INTERVAL_SEC` | How often to log a `netstats` line for each player. `0`: only when they leave. |
| `[Network]` | `MaxConnectionsPerIp` | int | `32` | `NODE_NETWORK_MAX_CONNECTIONS_PER_IP` | Connections from one address that may be joining at the same time. |
| `[Network]` | `MaxConnections` | int | `256` | `NODE_NETWORK_MAX_CONNECTIONS` | The same for all addresses together. |
| `[Network]` | `ConnectionLimitExempt` | string | `"127.0.0.0/8, ::1/128, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 100.64.0.0/10, fd00::/8"` | `NODE_NETWORK_CONNECTION_LIMIT_EXEMPT` | Address ranges without the per-address limit. `""` or `"none"`: no exceptions. |
| `[Network]` | `HandshakeTimeoutSec` | int | `20` | `NODE_NETWORK_HANDSHAKE_TIMEOUT_SEC` | Seconds a new connection gets for the handshake and the first steps of joining. |
| `[Network]` | `DownloadStallSec` | int | `60` | `NODE_NETWORK_DOWNLOAD_STALL_SEC` | A mod download ends after this many seconds without progress. A slow one is never cut off. |

### `[Sync]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[Sync]` | `Variant` | string | `""` | `NODE_SYNC_VARIANT` | For sync tests: one variant, `"A"` to `"D"`, for everyone. Empty: each player's own. |
| `[Sync]` | `HoldTight` | string | `""` | `NODE_SYNC_HOLD_TIGHT` | `"on"` or `"off"` sets *Hold other cars tightly* for everyone. |
| `[Sync]` | `SteerLead` | string | `""` | `NODE_SYNC_STEER_LEAD` | `"on"` or `"off"` sets *Steering look-ahead* for everyone. |
| `[Sync]` | `VerboseTrace` | string | `""` | `NODE_SYNC_VERBOSE_TRACE` | `"on"` turns on everyone's most detailed sync logs. |
| `[Sync]` | `TraceRate` | int | `0` | `NODE_SYNC_TRACE_RATE` | The rate of those logs for everyone: `10`, `20` or `60` Hz. `0`: each player's own. |

### `[Chat]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[Chat]` | `MaxLength` | int | `256` | `NODE_CHAT_MAX_LENGTH` | The longest chat line, in bytes, from 16 to 2048. |
| `[Chat]` | `RatePerSec` | int | `2` | `NODE_CHAT_RATE_PER_SEC` | Lines a player may send per second on average. Extra lines aren't sent; nobody is kicked. |
| `[Chat]` | `Burst` | int | `5` | `NODE_CHAT_BURST` | Lines a player may send in a row before the rate applies. |
| `[Chat]` | `LogToConsole` | bool | `true` | `NODE_CHAT_LOG_TO_CONSOLE` | Show the chat in the console and in the log. |
| `[Chat]` | `LogHiddenCommands` | string | `"login, register, reg, password, passwd, pass, pw, auth, changepassword, setpassword, 2fa, totp, otp, pin, token, apikey"` | `NODE_CHAT_LOG_HIDDEN_COMMANDS` | Commands whose arguments are logged as `***`. `""`: log every command as typed. |

### `[Log]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[Log]` | `MaxSizeMB` | int | `50` | `NODE_LOG_MAX_SIZE_MB` | Start a new `server.log` once it grows past this many MB, and at every start. `0`: only at start. |
| `[Log]` | `Keep` | int | `5` | `NODE_LOG_KEEP` | How many old logs to keep. |
| `[Log]` | `Date` | bool | `false` | `NODE_LOG_DATE` | Put the date before the time on every line. |

### `[Experimental]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[Experimental]` | `NodeGrab` | bool | `false` | `NODE_EXPERIMENTAL_NODEGRAB` | Allow the experimental node grabber checked by the server. Each grab still needs a plugin that allows it. |

### `[Directory]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[Directory]` | `Url` | string | `""` | `NODE_DIRECTORY_URL` | Where to announce the server: `"https://api.nodemp.com"`. Empty: not listed. |
| `[Directory]` | `HostId` | string | `""` | `NODE_DIRECTORY_HOST_ID` | The public half of the server key. |
| `[Directory]` | `HostSecret` | string | `""` | `NODE_DIRECTORY_HOST_SECRET` | The secret half. Keep it like a password. |
| `[Directory]` | `Fingerprint` | string | `""` | `NODE_DIRECTORY_FINGERPRINT` | Only for a server list you run yourself. Leave empty. |
| `[Directory]` | `CaFile` | string | `""` | `NODE_DIRECTORY_CA_FILE` | Only for a server list you run yourself. Leave empty. |
| `[Directory]` | `Description` | string | `""` | `NODE_DIRECTORY_DESCRIPTION` | One or two sentences under the name in the list. |
| `[Directory]` | `Mode` | string | `"freeroam"` | `NODE_DIRECTORY_MODE` | The kind of server, shown as a column: `freeroam`, `racing`, `roleplay` and so on. |
| `[Directory]` | `Tags` | string | `""` | `NODE_DIRECTORY_TAGS` | Up to eight comma-separated tags players can filter by. |
| `[Directory]` | `Preview` | string | `""` | `NODE_DIRECTORY_PREVIEW` | A JPEG or PNG for the list, at most 2 MB. |
| `[Directory]` | `Public` | bool | `true` | `NODE_DIRECTORY_PUBLIC` | `false` keeps the server out of the public list. |
| `[Directory]` | `TestDrive` | bool | `true` | `NODE_DIRECTORY_TEST_DRIVE` | Let players without an account in. |
| `[Directory]` | `RedeemFailOpen` | bool | `false` | `NODE_DIRECTORY_REDEEM_FAIL_OPEN` | While NodeMP can't be reached: `false` refuses joins, `true` lets players in as unverified guests. |
| `[Directory]` | `AllowInsecure` | bool | `false` | `NODE_DIRECTORY_ALLOW_INSECURE` | Allow an `http://` address in `Url`. Leave off. |

### `[Http]`

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[Http]` | `CaFile` | string | `""` | `NODE_HTTP_CA_FILE` | A CA bundle for plugins' HTTPS requests instead of the system's. |
| `[Http]` | `Insecure` | bool | `false` | `NODE_HTTP_INSECURE` | Skip certificate checks in plugins' HTTPS requests. Leave off. |
| `[Http]` | `AllowPrivateNetworks` | bool | `false` | `NODE_HTTP_ALLOW_PRIVATE_NETWORKS` | Let plugins' HTTP requests reach local and private addresses. |
