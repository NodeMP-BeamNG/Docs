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

It prints, for example, `Node-Server v1.8.0`. The start-up banner shows the same version.

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
$zip = "$HOME\Downloads\Node-Server-1.8.0-windows-x64.zip"
Expand-Archive $zip -DestinationPath C:\NodeMP -Force
```

Without `-Force` the command refuses to overwrite files.

## Linux

With the service from [Server on Linux](/hosting/linux/#a-systemd-service):

```bash
cd /tmp
url=https://github.com/NodeMP-BeamNG/releases/releases/download/server-v1.8.0
curl -LO "$url/Node-Server-1.8.0-linux-x64.tar.gz"
curl -LO "$url/Node-Server-1.8.0-linux-x64.tar.gz.sha256"
sha256sum -c Node-Server-1.8.0-linux-x64.tar.gz.sha256
```

Then stop the service, unpack the archive over the old files and start it again:

```bash
sudo systemctl stop nodemp
sudo tar -xzf Node-Server-1.8.0-linux-x64.tar.gz -C /opt/nodemp
sudo chown -R nodemp:nodemp /opt/nodemp
sudo systemctl start nodemp
```

Unpacking over the folder replaces exactly what the archive holds. Your `resources/`, including your
copies of the examples, isn't in the archive and isn't touched.

## Docker

Load the new image and use its tag:

```bash
docker load -i nodemp-server-v1.8.0-image.tar
```

In `compose.yaml`, change the `image:` line to the new tag and run `docker compose up -d`. With
`docker run`, remove the old container and start a new one with the same `-v` and variables. The
`data/` folder doesn't change. To go back, put the previous tag back.

## What survives an update

- **`server.toml`** stays as it is. If the new version has settings your file lacks, the server adds
  just those, with their defaults, and names them in the log. In Docker there's no file: a new
  setting takes its default until you set its variable.
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

## When players need a new launcher

The launcher and the server speak a versioned protocol. Server 1.8.0 speaks v23, like the releases
before it: launchers from version 1.1.23 and client mods from version 1.6.25 join it as before. When
a release changes the protocol, its description says so prominently, and an old launcher is refused
with a request to update. The launcher offers **Update now** by itself, and the client mod is updated
before every join. Update your server at the same time as players get the new launcher.
