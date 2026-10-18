---
title: Updating the server
description: Check the version, install a new release on Windows, Linux and Docker, what survives an update, and when players need a new launcher.
---

An update replaces the program and the folders that come with it (`tools/`, `modules/`,
`examples/`), or the Docker image. Everything else is your data and stays: `server.toml`, the TLS
certificate, resources, mods, storage, bans.

## Which version is running

```bash
./Node-Server --version
```

It prints, for example, `Node-Server v1.13.0`. The start-up banner shows the same version.

## Where releases are

Server releases are the `server-v…` tags on
[GitHub](https://github.com/NodeMP-BeamNG/releases/releases). Each release's description says what
changed, whether a default changed, and whether players need a new launcher. Read it before you
update.

## Windows

1. Stop the server.
2. Download the new archive and unpack it into the same folder over the old files. Let Explorer
   replace them.
3. Start the server and check the version in the banner.

From PowerShell, unpacking with replacement looks like this:

```powershell
$zip = "$HOME\Downloads\Node-Server-1.13.0-windows-x64.zip"
Expand-Archive $zip -DestinationPath C:\NodeMP -Force
```

Without `-Force` the command refuses to overwrite files.

## Linux

With the service from [Server on Linux](/hosting/linux/#a-systemd-service):

```bash
cd /tmp
url=https://github.com/NodeMP-BeamNG/releases/releases/download/server-v1.13.0
curl -LO "$url/Node-Server-1.13.0-linux-x64.tar.gz"
curl -LO "$url/Node-Server-1.13.0-linux-x64.tar.gz.sha256"
sha256sum -c Node-Server-1.13.0-linux-x64.tar.gz.sha256
```

Then stop the service, unpack the archive over the old files and start it again:

```bash
sudo systemctl stop nodemp
sudo tar -xzf Node-Server-1.13.0-linux-x64.tar.gz -C /opt/nodemp
sudo chown -R nodemp:nodemp /opt/nodemp
sudo systemctl start nodemp
```

Unpacking over the folder replaces exactly what the archive holds. Your `resources/`, including your
copies of the examples, isn't in the archive and isn't touched.

## Docker

Load the new image and use its tag:

```bash
docker load -i nodemp-server-v1.13.0-image.tar
```

In `compose.yaml`, change the `image:` line to the new tag and run `docker compose up -d`. With
`docker run`, remove the old container and start a new one with the same `-v` and variables. The
`data/` folder doesn't change. To go back, put the previous tag back.

## What survives an update

- **`server.toml`** stays as it is. A setting the new version brings takes its default until you
  add it to the file; the server doesn't add it for you. In Docker there's no file: a new setting
  takes its default until you set its variable. The one exception is the move to 1.9.0, below.
- **`node_cert.pem` and `node_key.pem`** aren't in the archive and are only made when missing. Keep
  them: players who joined by address remember the certificate and won't connect to a server with a
  different one.
- **`resources/`, `content/`, `storage/`, `bans.json`** are yours, and the update doesn't touch
  them. If a resource of yours uses the database module's `db.lua`, copy the new `modules/db.lua`
  into it.
- **`integrity/`** belongs to a game version, not a server version. After a BeamNG update, make it
  again ([Strict file check](/hosting/strict-verification/#after-a-game-update)).
- **Native modules** in `modules/` are checked at load. One built for an incompatible interface
  version is refused with a request to rebuild it. Lua resources need no rebuilding.

Since server 1.8.0 the server has no chat commands of its own; resources add them. A resource that
called `node.commands` stops at that line with `attempt to index a nil value (field 'commands')`.
Update it, or start from `examples/chat-commands` ([Chat and commands](/plugins/chat/)).

## Settings since 1.9.0

Since server 1.9.0, `server.toml` has a new layout: lower-case keys in tables named for what they set.
You don't have to redo the file by hand.

- On the first start of 1.9.0 the server rewrites a file in the old layout with the same settings
  and keeps the old one next to it as `server.toml.old`. The log says
  `server.toml was in the legacy layout: rewritten in the new one with the same settings`.
- The new file has `[server]` and `[listing]`, like a fresh one, plus every other setting whose
  value wasn't the default. A key the server doesn't read isn't carried over, and the log names it.
- The `NODE_*` variables are the same as before, so a server set up through them, the Docker image
  included, notices nothing.
- If the server can't write the new file, it says so in the log and reads the old one as it is.

Old guides still show the old names. Write the new ones: a table with an old name in the new file
works, but the server then converts the file again, drops the comments you wrote in it and replaces
`server.toml.old`. Where each key went:

| Before 1.9.0 | Since 1.9.0 |
|---|---|
| `[General] Name` | `[server] name` |
| `[General] Port` | `[server] port` |
| `[General] MaxPlayers` | `[server] max_players` |
| `[General] MaxCars` | `[server] cars_per_player` |
| `[General] Map` | `[server] map` |
| `[Content] Folder` | `[server] mods` |
| `[General] IP` | `[server] address` |
| `[General] Console` | `[server] console` |
| `[Directory] Url` | `[listing] url` |
| `[Directory] HostId` | `[listing] host_id` |
| `[Directory] HostSecret` | `[listing] host_secret` |
| `[Directory] Description` | `[listing] description` |
| `[Directory] Mode` | `[listing] mode` |
| `[Directory] Tags` | `[listing] tags` |
| `[Directory] Preview` | `[listing] preview` |
| `[Directory] Public` | `[listing] public` |
| `[Directory] TestDrive` | `[listing] guests` |
| `[Directory] Fingerprint` | `[listing] fingerprint` |
| `[Directory] CaFile` | `[listing] ca_file` |
| `[Directory] RedeemFailOpen` | `[listing] admit_when_down` |
| `[Directory] AllowInsecure` | `[listing] allow_http` |
| `[General] VerifyGame` | `[integrity] verify` |
| `[General] IntegrityDir` | `[integrity] manifests` |
| `[Network] TlsCert` | `[network] tls_cert` |
| `[Network] TlsKey` | `[network] tls_key` |
| `[Network] StateRelayRadius` | `[network] relay_radius` |
| `[Network] LagGraceSec` | `[network] lag_grace_sec` |
| `[Network] AuthTakeoverSec` | `[network] seat_takeover_sec` |
| `[Network] AuthReleaseSec` | `[network] seat_release_sec` |
| `[Network] DisconnectSec` | `[network] disconnect_sec` |
| `[Network] SendQueueBudgetMB` | `[network] send_queue_budget_mb` |
| `[Network] MaxConnectionsPerIp` | `[network] max_connections_per_ip` |
| `[Network] MaxConnections` | `[network] max_connections` |
| `[Network] ConnectionLimitExempt` | `[network] connection_limit_exempt` |
| `[Network] HandshakeTimeoutSec` | `[network] handshake_timeout_sec` |
| `[Network] DownloadStallSec` | `[network] download_stall_sec` |
| `[Chat] MaxLength` | `[chat] max_length` |
| `[Chat] RatePerSec` | `[chat] rate_per_sec` |
| `[Chat] Burst` | `[chat] burst` |
| `[Chat] LogToConsole` | `[chat] log` |
| `[Chat] LogHiddenCommands` | `[chat] masked_commands` |
| `[General] Debug` | `[logs] debug` |
| `[Log] MaxSizeMB` | `[logs] max_size_mb` |
| `[Log] Keep` | `[logs] keep` |
| `[Log] Date` | `[logs] date` |
| `[Network] StatsIntervalSec` | `[logs] netstats_sec` |
| `[Sync] Variant` | `[sync] variant` |
| `[Sync] HoldTight` | `[sync] hold_tight` |
| `[Sync] SteerLead` | `[sync] steer_lead` |
| `[Sync] VerboseTrace` | `[sync] verbose_trace` |
| `[Sync] TraceRate` | `[sync] trace_rate` |
| `[Http] CaFile` | `[http] ca_file` |
| `[Http] Insecure` | `[http] insecure` |
| `[Http] AllowPrivateNetworks` | `[http] allow_private_networks` |
| `[Resources] Obfuscate` | `[resources] obfuscate` |
| `[Experimental] NodeGrab` | `[experimental] node_grab` |

## Resources since 1.10.0

Since server 1.10.0 a resource's Lua reaches only its own folder: it can't read `server.toml`,
delete files elsewhere, run programs or read environment variables
([what a resource can do](/plugins/resources/#the-lua-environment)). The example resources and the
db module work as before. A resource that wrote files next to the server, ran a backup script or
read a setting from the environment now gets `nil` or an error naming `[resources] trusted`. If
you trust it, list it:

```toml
[resources]
trusted = ["backup"]
```

## NodeMP's new service

When NodeMP moved to a new service, it started its accounts and server list from scratch, and the
server released with the move speaks only to the new one. An older server can't be listed, and the
new one isn't listed with a key made before the move. Update the server, create a new key in
[**My servers**](https://nodemp.com/account/servers) and put it into `[listing]`
([Get listed](/hosting/registering/)). The `[listing]` keys and the rest of `server.toml` stay as
they are.

## When players need a new launcher

The launcher and the server speak a versioned protocol. Server 1.13.0 speaks v23, like the releases
before it, and client mods from version 1.6.25 join it as before; launchers join from version 1.2.0,
the first on the new directory, which older ones install by themselves before they sign in. When
a release changes the protocol, its description says so prominently, and an old launcher is refused
with a request to update. The launcher offers **Update now** by itself, and the client mod is updated
before every join. Update your server at the same time as players get the new launcher.
