---
title: Updating
description: Check the version, replace the server or load the new image, what survives an update, and when players need a new launcher.
---

An update replaces the executable and the folders that come with it (`tools/`, `modules/`,
`examples/`), or the Docker image. Everything else (`server.toml`, the TLS files, resources, mods,
storage, bans) is your data and stays.

## Which version is running

```bash
./Node-Server --version
```

prints `Node-Server v1.7.0`. The start-up banner shows the same on its `version` line.

## Where releases are

Server releases are the `server-v…` tags on
[GitHub releases](https://github.com/NodeMP-BeamNG/releases). Each has the Windows and Linux archives
and the Docker image, each with a `.sha256`, and the release notes in its description: what
changed, whether a default changed, and whether players need a new launcher. Read them before you
update.

## Windows

Stop the server, then in PowerShell, in the server's folder:

```powershell
Set-Location C:\NodeMP
$base = "https://github.com/NodeMP-BeamNG/releases/releases/download/server-v1.7.0"
Invoke-WebRequest "$base/Node-Server-1.7.0-windows-x64.zip" -OutFile Node-Server-1.7.0-windows-x64.zip
Invoke-WebRequest "$base/Node-Server-1.7.0-windows-x64.zip.sha256" -OutFile Node-Server-1.7.0-windows-x64.zip.sha256
(Get-FileHash Node-Server-1.7.0-windows-x64.zip).Hash.ToLower() -eq (Get-Content Node-Server-1.7.0-windows-x64.zip.sha256).Split(' ')[0]
Expand-Archive Node-Server-1.7.0-windows-x64.zip -DestinationPath . -Force
.\Node-Server.exe --version
```

`-Force` lets `Expand-Archive` overwrite the old files; without it, it refuses. Put the release you
are installing in the file names.

## Linux

With the folder and systemd unit from [Keeping it running](/hosting/running/):

```bash
cd /tmp
base=https://github.com/NodeMP-BeamNG/releases/releases/download/server-v1.7.0
curl -LO "$base/Node-Server-1.7.0-linux-x64.tar.gz"
curl -LO "$base/Node-Server-1.7.0-linux-x64.tar.gz.sha256"
sha256sum -c Node-Server-1.7.0-linux-x64.tar.gz.sha256
sudo systemctl stop nodemp-server
sudo tar -xzf Node-Server-1.7.0-linux-x64.tar.gz -C /opt/nodemp
sudo chown -R nodemp:nodemp /opt/nodemp
sudo systemctl start nodemp-server
/opt/nodemp/Node-Server --version
```

Unpacking over the folder replaces exactly what the archive holds. Your `resources/`, including
your copies of the examples, isn't in the archive and isn't touched.

## Docker

Load the new image and point the Compose file at its tag:

```bash
docker load -i nodemp-server-v1.7.0-image.tar
# in compose.yaml: image: nodemp-server:1.7.0-0c9c284
docker compose up -d gameserver
docker compose logs -f gameserver
```

The `/data` volume is untouched. To go back, put the previous tag in the file and run
`docker compose up -d` again.

## What survives an update

- **`server.toml`** stays as you wrote it. If the new version has settings your file lacks, the
  server adds just those lines, with their defaults, and the log names them. A setting the new
  version no longer has is ignored (and, where it matters, the log says so once). With Docker
  there's no file: a new setting takes its default until you set its variable.
- **`node_cert.pem` and `node_key.pem`** aren't in the archive and are only made when missing. Keep
  them: launchers that joined by address remember the certificate and refuse a server whose
  certificate changed.
- **`resources/`, `content/`, `storage/`, `bans.json`** are yours and untouched. If a resource of
  yours uses the database module's `db.lua`, copy the new `modules/db.lua` into it.
- **`integrity/`** belongs to a game version, not a server version: a server update leaves it
  alone, a BeamNG update makes it stale ([Strict verification](/hosting/strict-verification/#after-a-game-update)).
- **`.obfcache/`** is rebuilt as needed; deleting it is always safe.
- **Native modules** in `modules/` are checked at load. One built for an incompatible plugin
  interface is refused with
  `module 'my-module' was built against SDK ABI 1.12, this server speaks 2.4 -- refusing to load it. Rebuild the module.`
  Lua resources need nothing rebuilt.

## When players need a new launcher

The launcher and the server speak a versioned protocol. It's been `v23` since server 1.5.0, and
server 1.7.0 keeps it: launchers from 1.1.23 and client mods from 1.6.25 join it as before. When a
release does change the protocol, its notes say so in bold, and an old launcher is refused with
`Protocol version mismatch: launcher speaks v22, server speaks v23 - update the outdated side`. The
player's launcher then offers **Update now**, and the client mod is updated before every join
anyway. Update your server in the same window as your players get the new launcher.
