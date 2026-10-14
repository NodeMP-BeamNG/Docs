---
title: server.toml
description: The settings a host actually changes, how the file and environment variables work, every setting with its default, and the command line.
---

Everything about a server is set in one file, `server.toml`, in the server's working directory.
This page starts with the handful of settings most hosts touch, then explains how the file behaves,
and ends with [every setting](#every-setting) and [the command line](#command-line).

## The settings you'll change

**Name, map and size** (`[General]`):

```toml
[General]
Name = "Friday freeroam"
Map = "/levels/west_coast_usa/info.json"
MaxPlayers = 16
MaxCars = 2
```

- `Name` is what players see in the list and in the game.
- `Map` is the path to the map's `info.json`: `/levels/<folder>/info.json`. For a custom map, put
  its zip into `content/` and use the folder name it has under `levels/` inside the zip.
- `MaxPlayers` is how many players may be on at once; `MaxCars` how many cars each of them may have
  spawned.

**The port** (`[General] Port`, default `30814`) is used for both TCP and UDP. `IP` stays `"::"`,
which listens on every address, IPv4 and IPv6; set it only to tie the server to one network card.

**The game file check** (`[General] VerifyGame`) decides how closely a joining player's install is
checked:

| Value | What it checks | Cost for the player |
|---|---|---|
| `"size"` (default) | Every game file's size, and anything added under the game's `content/`. | About 2 seconds. |
| `"scripts"` | The above, plus a checksum of the game's `lua/` and `ui/`; catches edited scripts. | About 10 seconds. |
| `"full"` | A checksum of the whole install. | Minutes. An audit, not something for every join. |
| `"strict"` | The whole game folder, the archives' contents and the player's user folder, against a clean install you describe once. | A few seconds. See [Strict verification](/hosting/strict-verification/). |
| `"off"` | Nothing extra; the launcher still does `size`. | |

**Being listed** is the `[Directory]` table: `Url`, `HostId`, `HostSecret`, and what the list shows
(`Description`, `Mode`, `Tags`, `Preview`). [Get listed](/hosting/registering/) explains it.

**Chat** is built in. `[Chat] MaxLength` (256 bytes), `RatePerSec` (2) and `Burst` (5) keep it
readable; nobody is ever kicked for chatting too fast, the extra lines just aren't sent.
`LogToConsole` shows the chat in the console and the log, and `LogHiddenCommands` lists commands
whose arguments are never logged (`/login hunter2` becomes `/login ***`).

**Players on shaky connections** (`[Network]`): a silent player is marked as lagging after
`LagGraceSec` (8 s) and let go after `DisconnectSec` (30 s), which is also how long a broken
connection may take to come back. A server for players on mobile internet or VPNs can raise
`DisconnectSec`; the four timers must stay in the order
`LagGraceSec < AuthTakeoverSec <= AuthReleaseSec <= DisconnectSec`, or the server won't start.
`MaxConnectionsPerIp` (32) limits how many connections from one address may be joining at the same
time; see [hosting troubleshooting](/hosting/troubleshooting/#players-are-refused-at-the-door).

**The console** reads commands when the server runs in a terminal. `[General] Console = true` makes
it read standard input even without one. **Logs**: `[Log] Keep` (5 old logs) and `MaxSizeMB` (50).

## How the file works

- **Written once.** The first start writes `server.toml` with every setting, its default and a
  comment. After that the server never rewrites it: your edits, comments and order stay. When a
  newer server brings a new setting, it adds just that line at the end of its table and says so in
  the log.
- **Read at start.** Change a value, restart the server.
- **Mistakes are explained.** A value of the wrong type or out of range is reported with a warning
  and the default is used. A table that appears twice stops the server with a sentence that names
  the line, the most common case being a second `[Directory]` pasted from the website:
  `the table [Directory] appears twice. Put the keys into the existing [Directory] table …`.
- **Lists.** `ConnectionLimitExempt` and `LogHiddenCommands` take either a comma-separated string or
  a TOML list of strings.

### Environment variables

Every setting has an environment variable, which wins over the file; the table below names them.
`--port=` on the command line wins over both. The environment is the right place for
`HostSecret`, so the secret stays out of a file that gets copied around.

For hosting panels: `NODE_PROVIDER_IP_ENV` and `NODE_PROVIDER_PORT_ENV` name the variable that holds
the address and the port the panel assigns, and `NODE_PROVIDER_DISABLE_CONFIG=true` makes the server
ignore `server.toml` and take everything from the environment. The Docker image sets that last one.

A few variables aren't settings: `NODE_LUA` names the Lua 5.1 the obfuscator runs on,
`NODE_TOOLS_DIR` moves the `tools/` folder, `NODE_FORCE_ANSI=1` keeps colours when the output isn't a
terminal, and `NODE_HEARTBEAT_FILE` is the file the server touches every few seconds while it's
healthy (the Docker image uses it for its health check).

## Every setting

In the order the server declares them. Strings in quotes, as they appear in the file.

| Section | Key | Type | Default | Environment | What it does |
|---|---|---|---|---|---|
| `[General]` | `Debug` | bool | `false` | `NODE_DEBUG` | Debug logging from every part of the server, with the thread on each line. |
| `[General]` | `IP` | string | `"::"` | `NODE_IP` | The address to listen on. `"::"` listens on every interface, IPv4 and IPv6. Not your public address. |
| `[General]` | `Port` | int | `30814` | `NODE_PORT` | The TCP and UDP port players connect to. |
| `[General]` | `Name` | string | `"Node Server"` | `NODE_NAME` | The server's name, as players see it. |
| `[General]` | `MaxCars` | int | `1` | `NODE_MAX_CARS` | How many cars one player may have spawned at once. |
| `[General]` | `MaxPlayers` | int | `8` | `NODE_MAX_PLAYERS` | How many players may be on at once. |
| `[General]` | `Map` | string | `"/levels/gridmap_v2/info.json"` | `NODE_MAP` | The map, as the path to its `info.json`. |
| `[General]` | `VerifyGame` | string | `"size"` | `NODE_VERIFY_GAME` | How closely a joining player's install is checked: `off`, `size`, `scripts`, `full` or `strict`. |
| `[General]` | `IntegrityDir` | string | `"integrity"` | `NODE_INTEGRITY_DIR` | The folder with the clean-install descriptions (`*.manifest`) the strict check uses. |
| `[General]` | `Console` | bool | `false` | `NODE_CONSOLE` | Read console commands from standard input even when it isn't a terminal. |
| `[Resources]` | `Obfuscate` | bool | `true` | `NODE_OBFUSCATE` | Scramble the client scripts plugins send to players. `false` sends plain source, handy while debugging. |
| `[Content]` | `Folder` | string | `"content"` | `NODE_CONTENT_FOLDER` | The folder with mod zips sent to joining players. |
| `[Network]` | `TlsCert` | string | `"node_cert.pem"` | `NODE_TLS_CERT` | The server's TLS certificate, made on the first start. A relative path is next to the executable. |
| `[Network]` | `TlsKey` | string | `"node_key.pem"` | `NODE_TLS_KEY` | The private key that goes with it. |
| `[Network]` | `StateRelayRadius` | int | `0` | `NODE_STATE_RELAY_RADIUS` | Send a car's frequent position updates only to players within this many metres (half as often in the outer half). `0` sends to everyone. |
| `[Network]` | `LagGraceSec` | int | `8` | `NODE_NETWORK_LAG_GRACE_SEC` | Seconds of silence before a player is shown as lagging. Nothing is taken from them yet. |
| `[Network]` | `AuthTakeoverSec` | int | `10` | `NODE_NETWORK_AUTH_TAKEOVER_SEC` | Seconds a driver may be silent before another player who climbs into the driver's seat gets it. |
| `[Network]` | `AuthReleaseSec` | int | `30` | `NODE_NETWORK_AUTH_RELEASE_SEC` | Seconds of silence before the server frees a driver's seat and hands the car to another player's game. |
| `[Network]` | `DisconnectSec` | int | `30` | `NODE_NETWORK_DISCONNECT_SEC` | Seconds of silence before a player is let go. Also how long a broken connection may take to resume. |
| `[Network]` | `SendQueueBudgetMB` | int | `256` | `NODE_NETWORK_SEND_QUEUE_BUDGET_MB` | How much the outgoing queues of all players may hold together before the slowest player loses queued car state, then the connection. `0`: only the 64 MB per player. |
| `[Network]` | `StatsIntervalSec` | int | `15` | `NODE_NETWORK_STATS_INTERVAL_SEC` | Every this many seconds, one `netstats` log line per player (ping, traffic, loss, queue). `0`: only the line when they leave. |
| `[Network]` | `MaxConnectionsPerIp` | int | `32` | `NODE_NETWORK_MAX_CONNECTIONS_PER_IP` | Connections from one address that may be joining at the same time. Players behind one carrier NAT or VPN exit share an address. |
| `[Network]` | `MaxConnections` | int | `256` | `NODE_NETWORK_MAX_CONNECTIONS` | Connections that may be joining at the same time from all addresses together. |
| `[Network]` | `ConnectionLimitExempt` | string | `"127.0.0.0/8, ::1/128, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 100.64.0.0/10, fd00::/8"` | `NODE_NETWORK_CONNECTION_LIMIT_EXEMPT` | Address ranges `MaxConnectionsPerIp` doesn't apply to. `""` or `"none"` exempts nothing. |
| `[Network]` | `HandshakeTimeoutSec` | int | `20` | `NODE_NETWORK_HANDSHAKE_TIMEOUT_SEC` | Seconds a new connection gets for the secure handshake and the first steps of the join. |
| `[Network]` | `DownloadStallSec` | int | `60` | `NODE_NETWORK_DOWNLOAD_STALL_SEC` | A mod download is stopped when nothing of it has moved for this many seconds. Slow is never stopped. |
| `[Sync]` | `Variant` | string | `""` | `NODE_SYNC_VARIANT` | For sync tests: pin the client mod's sync variant (`"A"` to `"D"`) for everyone. Empty: each player's own. |
| `[Sync]` | `HoldTight` | string | `""` | `NODE_SYNC_HOLD_TIGHT` | `"on"` or `"off"` pins *Hold other cars tightly* for everyone. Empty: each player's own. |
| `[Sync]` | `SteerLead` | string | `""` | `NODE_SYNC_STEER_LEAD` | `"on"` or `"off"` pins *Steering look-ahead* for everyone. |
| `[Sync]` | `VerboseTrace` | string | `""` | `NODE_SYNC_VERBOSE_TRACE` | `"on"` turns on every player's most detailed sync logs (about 1 MB a minute per car in view). |
| `[Sync]` | `TraceRate` | int | `0` | `NODE_SYNC_TRACE_RATE` | The detailed logs' rate for everyone: `10`, `20` or `60` Hz. `0`: each player's own. |
| `[Chat]` | `MaxLength` | int | `256` | `NODE_CHAT_MAX_LENGTH` | The longest chat line in bytes, 16 to 2048. |
| `[Chat]` | `RatePerSec` | int | `2` | `NODE_CHAT_RATE_PER_SEC` | Lines (and `/` commands) a player may send per second on average. Extra lines aren't sent; nobody is kicked. |
| `[Chat]` | `Burst` | int | `5` | `NODE_CHAT_BURST` | How many lines a player may send at once before `RatePerSec` applies. |
| `[Chat]` | `LogToConsole` | bool | `true` | `NODE_CHAT_LOG_TO_CONSOLE` | Show the chat on the console and in the log as it happens, refused lines included. |
| `[Chat]` | `LogHiddenCommands` | string | `"login, register, reg, password, passwd, pass, pw, auth, changepassword, setpassword, 2fa, totp, otp, pin, token, apikey"` | `NODE_CHAT_LOG_HIDDEN_COMMANDS` | Commands whose arguments are logged as `***`. `""` logs every command as typed. |
| `[Log]` | `MaxSizeMB` | int | `50` | `NODE_LOG_MAX_SIZE_MB` | Start a new `server.log` when it grows past this many MB (and at every start). `0`: only at start. |
| `[Log]` | `Keep` | int | `5` | `NODE_LOG_KEEP` | How many old logs to keep. |
| `[Log]` | `Date` | bool | `false` | `NODE_LOG_DATE` | Put the date in front of the time on every line. |
| `[Experimental]` | `NodeGrab` | bool | `false` | `NODE_EXPERIMENTAL_NODEGRAB` | Allow the experimental server-checked node grabber. Each grab still needs a plugin that says yes. |
| `[Directory]` | `Url` | string | `""` | `NODE_DIRECTORY_URL` | Where to announce the server: `"https://api.nodemp.com"`. Empty: not listed. |
| `[Directory]` | `HostId` | string | `""` | `NODE_DIRECTORY_HOST_ID` | The server key's public half, from your NodeMP account. |
| `[Directory]` | `HostSecret` | string | `""` | `NODE_DIRECTORY_HOST_SECRET` | The secret half. Treat it like a password; never printed. |
| `[Directory]` | `Fingerprint` | string | `""` | `NODE_DIRECTORY_FINGERPRINT` | Only for a self-hosted directory with a self-signed certificate. Leave empty. |
| `[Directory]` | `CaFile` | string | `""` | `NODE_DIRECTORY_CA_FILE` | Only for a self-hosted directory behind a private CA. Leave empty. |
| `[Directory]` | `Description` | string | `""` | `NODE_DIRECTORY_DESCRIPTION` | One or two sentences under the name in the list. |
| `[Directory]` | `Mode` | string | `"freeroam"` | `NODE_DIRECTORY_MODE` | The kind of server, shown as a column: `freeroam`, `racing`, `roleplay`, … |
| `[Directory]` | `Tags` | string | `""` | `NODE_DIRECTORY_TAGS` | Up to eight comma-separated tags players can filter by. |
| `[Directory]` | `Preview` | string | `""` | `NODE_DIRECTORY_PREVIEW` | A JPEG or PNG for the list, at most 2 MB. Empty: a custom map's own picture, or the game's for a stock map. |
| `[Directory]` | `Public` | bool | `true` | `NODE_DIRECTORY_PUBLIC` | `false` keeps the server out of the public list; people who have its address still see it online. |
| `[Directory]` | `TestDrive` | bool | `true` | `NODE_DIRECTORY_TEST_DRIVE` | Whether players without an account may join. |
| `[Directory]` | `RedeemFailOpen` | bool | `false` | `NODE_DIRECTORY_REDEEM_FAIL_OPEN` | While NodeMP can't be reached: `false` refuses joins, `true` lets players in as unverified guests. |
| `[Directory]` | `AllowInsecure` | bool | `false` | `NODE_DIRECTORY_ALLOW_INSECURE` | Allow an `http://` directory address. Leave off: the secret would travel in the clear. |
| `[Http]` | `CaFile` | string | `""` | `NODE_HTTP_CA_FILE` | A CA bundle for plugins' HTTPS requests, instead of the system's roots. Empty: the system's roots plus the shipped `cacert.pem`. |
| `[Http]` | `Insecure` | bool | `false` | `NODE_HTTP_INSECURE` | Skip certificate checks for plugins' HTTPS requests. Leave off. |
| `[Http]` | `AllowPrivateNetworks` | bool | `false` | `NODE_HTTP_ALLOW_PRIVATE_NETWORKS` | Let plugins' HTTP requests reach local and private addresses (your LAN, this machine). |

## Command line

Options on the command line win over `server.toml` and the environment. `Node-Server --help`
prints:

```
Node-Server, the NodeMP game server.

Usage: Node-Server [--config=FILE] [--port=N] [--working-directory=DIR]

  --config=FILE            The server.toml to read (default: server.toml in the
                           working directory). Quote a path with spaces.
  --port=N                 The TCP and UDP port, over server.toml and the
                           environment.
  --working-directory=DIR  Where the server runs: every relative path starts
                           here, --config's included.
  --version                Prints the version and exits.
  --help                   Prints this and exits.
  A value may also follow its option after a space: --port 30815.

Tools (they need no server.toml and do not start the server):

  --gen-integrity GAMEDIR [--out FILE] [--game-version V]
      Writes the reference manifest that VerifyGame = "strict" checks players
      against, from a clean game install at GAMEDIR (the folder that holds
      integrity.json): every file with its size and SHA-256 -- the game's own
      integrity.json leaves some out -- and the table of contents of every
      archive. Hashing a few GB takes under a minute. The file goes to
      integrity/<game version>.manifest in the working directory ([General]
      IntegrityDir) unless --out names another; the version comes from
      integrity.json unless --game-version gives it. Prints the totals and the
      manifest's hash. Run it where the game is installed and copy the file to
      the server.

  --bans list
  --bans remove <ip | nodemp:<id> | <id>>
      Shows or lifts bans while the server is not running. They are kept in
      bans.json in the working directory, one JSON object: each key is a banned
      address ("203.0.113.7", or an IPv6 address without brackets) or a NodeMP
      account as "nodemp:<id>", and each value is
      {"reason": "<what the player is told>", "at": <unix seconds>,
       "name": "<the player's name at the time>"}.
      Stop the server before you edit the file, with this or by hand: a running
      server reads it once, at its first ban check or ban, keeps it in memory
      and writes it back on every new ban.

  --obf-selftest
      Checks that the client-script obfuscator in tools/ runs, prints
      "[obf-selftest] available=1" when it does, and exits.

Examples:
  Node-Server --config=../west-coast.toml
  Node-Server --gen-integrity "C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive"
  Node-Server --bans remove 203.0.113.7
```

Two servers on one machine each need their own working directory (or their own `--config=` and
paths) and their own port: `Node-Server --working-directory=/srv/nodemp-2 --port=30815`.
