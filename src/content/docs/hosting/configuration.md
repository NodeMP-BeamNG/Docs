---
title: Configuration
description: Every server.toml key with section, type, default and NODE_* variable; precedence, the file rewrite, provider variables and command-line flags.
---

The server reads one file, `server.toml`, from the folder it is started in (or the path given
with `--config=`). If the file does not exist at start, the server writes it with every key at
its default and a comment that explains it, then runs on those defaults. Settings are read once
at start: edit the file, then restart.

Every key can also be set with an environment variable named `NODE_…`. That is how the Docker
image is configured, and the right place for the host secret on any machine where the config
file gets copied around.

## Precedence

From strongest to weakest:

1. `--port=` on the command line (the port only).
2. The environment variable, when it is set and not empty.
3. The value in `server.toml`.
4. The built-in default.

Details that matter when a setting does not take effect:

- A boolean variable accepts `true`, `false`, `1` and `0` in any case. Any other value is
  ignored with `Environment variable NODE_DEBUG has non-boolean value 'yes', ignoring it (accepted: true/false/1/0)`,
  and the file decides.
- An integer variable must be a plain number; text is read as `0`.
- A key with the wrong type in the file (`Port = "30814"`, with quotes) is reported as
  `Value 'General.Port' has unexpected type, expected type 'integer'`, and the default is used.
- A key missing from the file takes its default silently. That is how a file written by an
  older version keeps working.
- A file the TOML parser rejects stops the server: `Error parsing config file value: …`,
  `Closing in 10 seconds`, exit code 1.

## The file is rewritten

After every successful read of the file (at start, before anything else) the server writes
`server.toml` back: every key it knows, with its own comments. Consequences:

- Comments you added are lost, and keys the server does not know are dropped. Keep notes
  elsewhere.
- Values set through the environment are not written into the file. The file keeps what it said
  before; a key the file did not mention gets its default, not the value from the environment.
  A one-run override never becomes permanent.
- Keys added by a new version appear with their defaults after the first start (see
  [Updating](/hosting/updating/)).

The rewrite is skipped when `NODE_PROVIDER_DISABLE_CONFIG` is set (see
[Provider variables](#provider-variables)).

## Reference

Strings are quoted in TOML (`Name = "My server"`); integers and booleans are not
(`Port = 30814`, `Debug = false`).

| Section | Key | Type | Default | Environment |
|---|---|---|---|---|
| `[General]` | `Debug` | bool | `false` | `NODE_DEBUG` |
| `[General]` | `IP` | string | `"::"` | `NODE_IP` |
| `[General]` | `Port` | int | `30814` | `NODE_PORT` |
| `[General]` | `Name` | string | `"Node Server"` | `NODE_NAME` |
| `[General]` | `MaxCars` | int | `1` | `NODE_MAX_CARS` |
| `[General]` | `MaxPlayers` | int | `8` | `NODE_MAX_PLAYERS` |
| `[General]` | `Map` | string | `"/levels/gridmap_v2/info.json"` | `NODE_MAP` |
| `[General]` | `VerifyGame` | string | `"size"` | `NODE_VERIFY_GAME` |
| `[Resources]` | `Obfuscate` | bool | `true` | `NODE_OBFUSCATE` |
| `[Content]` | `Folder` | string | `"content"` | `NODE_CONTENT_FOLDER` |
| `[Content]` | `Encrypt` | bool | `false` | `NODE_CONTENT_ENCRYPT` |
| `[Network]` | `TlsCert` | string | `"node_cert.pem"` | `NODE_TLS_CERT` |
| `[Network]` | `TlsKey` | string | `"node_key.pem"` | `NODE_TLS_KEY` |
| `[Network]` | `StateRelayRadius` | int | `0` | `NODE_STATE_RELAY_RADIUS` |
| `[Experimental]` | `NodeGrab` | bool | `false` | `NODE_EXPERIMENTAL_NODEGRAB` |
| `[Directory]` | `Url` | string | `""` | `NODE_DIRECTORY_URL` |
| `[Directory]` | `HostId` | string | `""` | `NODE_DIRECTORY_HOST_ID` |
| `[Directory]` | `HostSecret` | string | `""` | `NODE_DIRECTORY_HOST_SECRET` |
| `[Directory]` | `Fingerprint` | string | `""` | `NODE_DIRECTORY_FINGERPRINT` |
| `[Directory]` | `Description` | string | `""` | `NODE_DIRECTORY_DESCRIPTION` |
| `[Directory]` | `Mode` | string | `"freeroam"` | `NODE_DIRECTORY_MODE` |
| `[Directory]` | `Tags` | string | `""` | `NODE_DIRECTORY_TAGS` |
| `[Directory]` | `Public` | bool | `true` | `NODE_DIRECTORY_PUBLIC` |
| `[Directory]` | `TestDrive` | bool | `true` | `NODE_DIRECTORY_TEST_DRIVE` |
| `[Directory]` | `RedeemFailOpen` | bool | `false` | `NODE_DIRECTORY_REDEEM_FAIL_OPEN` |
| `[Directory]` | `AllowInsecure` | bool | `false` | `NODE_DIRECTORY_ALLOW_INSECURE` |
| `[Database]` | `Url` | string | `""` | `NODE_DATABASE_URL` |
| `[Database]` | `Pool` | int | `4` | `NODE_DATABASE_POOL` |
| `[Database]` | `QueryTimeoutMs` | int | `10000` | `NODE_DATABASE_QUERY_TIMEOUT_MS` |
| `[Database]` | `TxTimeoutMs` | int | `30000` | `NODE_DATABASE_TX_TIMEOUT_MS` |
| `[Database]` | `MaxRows` | int | `10000` | `NODE_DATABASE_MAX_ROWS` |

### `[General]`

- `Debug` — extra debug and trace lines in the log, and millisecond timestamps.
- `IP` — the address to listen on. `::` is every interface, IPv6 and IPv4; `0.0.0.0` is every
  IPv4 interface; a single address picks one interface. Not related to your public address.
- `Port` — the one port, used for TCP and UDP.
- `Name` — the name players see in the list and in the launcher.
- `MaxCars` — vehicles each player may have at once.
- `MaxPlayers` — players at once; the list shows it as the capacity.
- `Map` — the level sent to joining players, as the path of its `info.json` inside the game, for
  example `/levels/west_coast_usa/info.json`. A level from a mod works when its zip is in
  `content/`.
- `VerifyGame` — how much of a joining player's BeamNG install is compared with the game's own
  file list before the join. `off`: the launcher still runs the `size` check, and the server
  only logs a mismatch instead of refusing. `size`: every file's length plus a sweep for files
  added under the game's `content/` folder, about two seconds. `scripts`: also hashes the game's
  `lua/` and `ui/` trees, about ten seconds; this is what catches an edited script. `full`:
  hashes the whole install, about 50 GB, minutes — an audit, not a pre-join check. A player
  whose install does not match is refused with
  `Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again.`
  Any other value is logged as an error and treated as `scripts`.

### `[Resources]`

- `Obfuscate` — obfuscate the client Lua that resources stream to players. `false` ships plain
  source, for debugging. Details in [Resources and content](/hosting/resources/).

### `[Content]`

- `Folder` — the folder with client mod zips, relative to the working directory.
- `Encrypt` — deliver the zips ChaCha20-encrypted with a key made at each start; the launcher
  then keeps only encrypted copies in its cache.

### `[Network]`

- `TlsCert`, `TlsKey` — the server's TLS certificate and private key, PEM. Relative paths
  resolve next to the executable, not in the working directory. Missing files are generated at
  start (self-signed, valid ten years). The certificate's SHA-256 fingerprint is what launchers
  pin, so keep both files; [Updating](/hosting/updating/) explains why.
- `StateRelayRadius` — distance-based relay of vehicle positions, in metres. `0` (the default)
  relays every position update to every player. With a radius, players within half of it get
  updates at full rate, players in the outer half at half rate, and nobody beyond it.
  [How synchronization works](/framework/sync/) has the details.

### `[Experimental]`

- `NodeGrab` — accept node-grabber requests over the wire. Off, the server drops them. On, every
  grab still needs an explicit allow from a resource's `onVehicleNodeGrabRequest` handler; the
  `nodegrab-allow` example is the smallest one.

### `[Directory]`

Whether and how the server announces itself to the directory;
[Registering your server](/hosting/registering/) covers the workflow.

- `Url`, `HostId`, `HostSecret` — the directory, `https://api.nodemp.com`, and the server key
  from your account. All three are needed: with one of them empty the server warns and is not
  announced; with all three empty it is silent. The secret is a password — rotate it in your
  account if it leaks.
- `Fingerprint` — SHA-256 of the *directory's* TLS certificate as lowercase hex, for a directory
  you run yourself with a self-signed certificate. Empty means the normal check: a certificate
  signed by an authority the machine trusts that names the host. This is not your server's own
  fingerprint.
- `Description` — one or two sentences under the server name in the list (cut at 500
  characters).
- `Mode` — one word shown as a column in the list: `freeroam`, `racing`, `roleplay`, …
- `Tags` — up to eight comma-separated tags players can filter by, `"drift, no-crash, ru"`.
- `Public` — `true` puts the server in the list. `false` still announces it, so players who have
  the address see it as online, but it is not advertised.
- `TestDrive` — whether players without an account may join. With a directory configured this
  is enforced: a Test Drive ticket, or a join without a ticket, is refused with
  `This server requires a NodeMP account: sign in to the launcher and join again` when it is
  `false`.
- `RedeemFailOpen` — what to do with a join whose ticket cannot be checked because the directory
  is unreachable. `false` refuses it. `true` admits the player as an unverified guest under the
  name the launcher asked for — only when `TestDrive` is also `true`. It matters only while the
  directory is down.
- `AllowInsecure` — allow a `Url` that starts with `http://`. Leave it off: the secret is sent
  in every session request, and without TLS anyone on the path can read it. Only for a directory
  of your own on a LAN or VPN.

### `[Database]`

A PostgreSQL database for resources that use `node.pg`; the server itself never needs one.
[Database access](/plugins/database/) covers the setup and the API.

- `Url` — a libpq connection string, `postgres://user:password@host:5432/dbname?sslmode=require`
  (the `key=value` form works too). Empty, the default, means the driver is off: `node.pg.enabled()`
  is `false` and every `node.pg` call answers `pg_disabled`. Under Docker set `NODE_DATABASE_URL`
  like the other keys.
- `Pool` — connections kept open, one database thread each, 1 to 32. Each `node.pg.tx` reserves
  one for its whole duration, so with `Pool = 1` a transaction and a plain query cannot overlap.
- `QueryTimeoutMs` — `statement_timeout` set on every connection; a statement that runs longer
  fails with SQLSTATE `57014`. At least 100.
- `TxTimeoutMs` — the longest a `node.pg.tx` may stay open. Past it the server rolls the
  transaction back and the resource gets `tx_timeout`, so a stuck script cannot hold a connection
  forever. At least 100.
- `MaxRows` — the most rows one statement may return, 1 to 1 000 000; a larger result is dropped
  with `pg_result_cap`.

Values outside these ranges are clamped with a warning. The password never reaches the log: the
URL is printed as `postgres://nodemp:***@127.0.0.1:5432/nodemp`, in the `?password=` and the
`password=` spellings as `***` too. Give the server its own database role with rights on one
schema only, never a superuser, and use `sslmode=require` in the `Url` when the database is on
another machine. Connections are made in the background with retries (0.5 s to 30 s apart), so the
server starts and runs while the database is down; TCP keepalives (`keepalives_idle=30`,
`keepalives_interval=10`, `keepalives_count=3`) and a 10 s `connect_timeout` are set unless the
`Url` chooses its own values.

## Provider variables

Three variables exist for hosting panels and containers. They are read from the environment
only and have no key in the file.

| Variable | Effect |
|---|---|
| `NODE_PROVIDER_DISABLE_CONFIG` | When its value is exactly `true` or `1` (`TRUE` and `yes` do not count): no `server.toml` is read, generated or rewritten; settings come from the environment and the defaults. The Docker image sets it. |
| `NODE_PROVIDER_PORT_ENV` | The name of another variable that carries the port, for a panel that exports it under its own name (`SERVER_PORT`). Read instead of `NODE_PORT`. |
| `NODE_PROVIDER_IP_ENV` | The same for the bind address, instead of `NODE_IP`. |

## Other environment variables

| Variable | Effect |
|---|---|
| `NODE_LUA` | Path of the Lua 5.1 (or LuaJIT) executable that runs the obfuscator. Without it the server looks for `tools/lua515/lua5.1` (`lua5.1.exe` on Windows), then `tools/luajit`, `tools/lua5.1`, `tools/lua`. |
| `NODE_TOOLS_DIR` | The `tools/` folder, when it is not next to the executable. |
| `NODE_FORCE_ANSI` | `1` or `true`: coloured console output even when the output is not a terminal. |
| `NODE_PLUGIN_POOL` | Threads in the background job pool resources use for `node.job` and `node.await`. Default: the machine's core count, between 2 and 32. |

## Command line

`Node-Server --help` prints:

```
USAGE:
    Node-Server [arguments]

ARGUMENTS:
    --help
                        Displays this help and exits.
    --port=1234
                        Sets the server's listening TCP and
                        UDP port. Overrides ENV and server.toml.
    --config=/path/to/server.toml
                        Absolute or relative path to the
                        server config file, including the
                        filename. For paths and filenames with
                        spaces, put quotes around the path.
    --working-directory=/path/to/folder
                        Sets the working directory of the Server.
                        All paths are considered relative to this,
                        including the path given in --config.
    --version
                        Prints version info and exits.

EXAMPLES:
    Node-Server --config=../MyWestCoastServer.toml
        Runs the Node-Server and uses the server config file
        which is one directory above it and is named
        'MyWestCoastServer.toml'.
```

## Example

A `server.toml` with every key at its default (the comments the server writes are omitted):

```toml
[General]
Debug = false
IP = "::"
Port = 30814
Name = "Node Server"
MaxCars = 1
MaxPlayers = 8
Map = "/levels/gridmap_v2/info.json"
VerifyGame = "size"

[Resources]
Obfuscate = true

[Content]
Folder = "content"
Encrypt = false

[Network]
TlsCert = "node_cert.pem"
TlsKey = "node_key.pem"
StateRelayRadius = 0

[Experimental]
NodeGrab = false

[Directory]
Url = ""
HostId = ""
HostSecret = ""
Fingerprint = ""
Description = ""
Mode = "freeroam"
Tags = ""
Public = true
TestDrive = true
RedeemFailOpen = false
AllowInsecure = false

[Database]
Url = ""
Pool = 4
QueryTimeoutMs = 10000
TxTimeoutMs = 30000
MaxRows = 10000
```
