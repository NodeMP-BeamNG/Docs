---
title: Updating the server
description: How to check the server's version, install a new release on Windows, Linux and in Docker, what survives an update and when players need a new launcher.
---

An update replaces the program and the folders that come with it (`tools/`, `modules/`, `examples/`), or the Docker image. Your data stays ([What survives an update](#what-survives-an-update)).

## Which version is running

```bash
./Node-Server --version
```

The command prints `Node-Server v` and the version number. The startup banner shows the same version.

## Where releases are

The archives are on the [download page](https://nodemp.com/download) in the **Your own server** block. Every server release is also on [GitHub](https://github.com/NodeMP-BeamNG/releases/releases) under a tag `server-v<version>`. The release description says what changed, whether any defaults changed and whether the protocol version changed. Read it before you update.

## Windows

1. Stop the server.
2. Download the new archive and unpack it into the same folder over the old files. When Explorer asks about files with the same names, choose to replace them.
3. Start the server and check the version in the banner.

To unpack over the old files from PowerShell:

```powershell
$zip = "$HOME\Downloads\Node-Server-<version>-windows-x64.zip"
Expand-Archive $zip -DestinationPath C:\NodeMP -Force
```

Without `-Force` the command refuses to overwrite files.

## Linux

With the service from [Server on Linux](/hosting/linux/#a-systemd-service):

```bash
cd /tmp
version=<version>
url=https://github.com/NodeMP-BeamNG/releases/releases/download/server-v$version
curl -LO "$url/Node-Server-$version-linux-x64.tar.gz"
curl -LO "$url/Node-Server-$version-linux-x64.tar.gz.sha256"
sha256sum -c Node-Server-$version-linux-x64.tar.gz.sha256
```

Then stop the service, unpack the archive over the old files and start it again:

```bash
sudo systemctl stop nodemp
sudo tar -xzf Node-Server-$version-linux-x64.tar.gz -C /opt/nodemp
sudo chown -R nodemp:nodemp /opt/nodemp
sudo systemctl start nodemp
```

Unpacking over the folder replaces exactly what the archive holds. The `resources/` folder, including the examples you copied into it, isn't in the archive, and unpacking doesn't touch it.

## Docker

Pull the new image:

```bash
docker pull ghcr.io/nodemp-beamng/server:<tag>
```

In `compose.yaml`, change the `image:` line to the new tag and run `docker compose up -d`. With `docker run`, remove the old container and start a new one with the same `-v` and the same variables. The `data/` folder doesn't change. To roll back, put the previous tag back.

## What survives an update

- `server.toml` stays as it is. A new setting that is neither in the file nor in the environment takes its default.
- `node_cert.pem` and `node_key.pem` aren't in the archive and are created only if they are missing. Don't lose them ([The server's fingerprint](/hosting/registering/#the-servers-fingerprint)).
- `resources/`, `content/`, `storage/` and `bans.json` are yours, and an update doesn't touch them. If your plugin uses the database module's `db.lua`, copy the new `modules/db.lua` into it.
- `integrity/` belongs to a game version, not a server version. After a BeamNG update, make the manifest again ([Strict file check](/hosting/strict-verification/#after-a-game-update)).
- The server doesn't load a native module built for an incompatible interface version ([Native modules](/hosting/resources/#native-modules)). Lua plugins don't need rebuilding.

## When players need a new launcher

The network protocol between the launcher and the server has a version number, and it must be the same on both ([Wire protocol](/reference/protocol/#versions)). If a release changes the protocol, its description says so prominently, and a launcher that is behind is refused and offers **Update now**. The launcher updates the client mod by itself before every join. Update the server when players get the new launcher: with a launcher newer than the server, players are refused with a message that explains the server is behind ([Error messages](/reference/error-codes/#the-servers-refusals-and-kicks)).
