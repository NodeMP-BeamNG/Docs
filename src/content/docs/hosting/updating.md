---
title: Updating
description: Check the version, replace the binary or pull the new image, keep server.toml and the TLS files, and what a protocol change means for players.
---

An update replaces the executable and its `tools/` folder, or the container image. Everything
else — `server.toml`, the TLS files, resources, content, storage, bans — is data next to it and
stays.

## Check the version

```bash
./Node-Server --version
```

prints `Node-Server v1.5.0`. The startup banner shows the same number on its `version` line, and
a listed server reports it to the directory in every beacon.

## Where releases are

Server releases are tags `server-v*` at
[github.com/NodeMP-BeamNG/releases](https://github.com/NodeMP-BeamNG/releases). Each carries
the two archives named after the version (`Node-Server-1.5.0-linux-x64.tar.gz`,
`Node-Server-1.5.0-windows-x64.zip`) and their `.sha256` files, and its body carries the release
notes (the server repository's `RELEASE_NOTES.md` section for that tag): what changed, whether a
default changed and whether the wire protocol moved. Releases before 1.2.1 have a one-sentence
body instead. These pages describe the current release; the
[version table](/introduction/what-is-nodemp/#versions) says which server, launcher and client mod
belong together and which wire protocol they speak, and a feature that arrived with an earlier
release is marked where it is described (`added in server 1.2.0`). The Docker image of the same
build carries the tag with the `v` (`ghcr.io/nodemp-beamng/server:v1.5.0`); `latest` follows the
newest main-branch build, which may be ahead of the latest release — pin a version tag.

## Binary

Linux, with the layout from the [quick start](/hosting/quick-start/) and the systemd unit from
[Running the server](/hosting/running/):

```bash
cd /tmp
curl -LO https://github.com/NodeMP-BeamNG/releases/releases/download/server-v1.5.0/Node-Server-1.5.0-linux-x64.tar.gz
curl -LO https://github.com/NodeMP-BeamNG/releases/releases/download/server-v1.5.0/Node-Server-1.5.0-linux-x64.tar.gz.sha256
sha256sum -c Node-Server-1.5.0-linux-x64.tar.gz.sha256
sudo systemctl stop nodemp-server
sudo tar -xzf Node-Server-1.5.0-linux-x64.tar.gz -C /opt/nodemp
sudo chown -R nodemp:nodemp /opt/nodemp
sudo systemctl start nodemp-server
/opt/nodemp/Node-Server --version
```

The archive holds `Node-Server`, `tools/`, `examples/` and `EXAMPLES_COMMIT`; extracting it over
the folder replaces exactly those and touches nothing else - `resources/`, where your copies of
the examples live, is not in the archive. Replace the version in the file names with the release
you are installing.

Windows, with the layout from the quick start: stop the server, then in PowerShell

```powershell
Set-Location C:\NodeMP
Invoke-WebRequest https://github.com/NodeMP-BeamNG/releases/releases/download/server-v1.5.0/Node-Server-1.5.0-windows-x64.zip -OutFile Node-Server-1.5.0-windows-x64.zip
Invoke-WebRequest https://github.com/NodeMP-BeamNG/releases/releases/download/server-v1.5.0/Node-Server-1.5.0-windows-x64.zip.sha256 -OutFile Node-Server-1.5.0-windows-x64.zip.sha256
(Get-FileHash Node-Server-1.5.0-windows-x64.zip).Hash.ToLower() -eq (Get-Content Node-Server-1.5.0-windows-x64.zip.sha256).Split(' ')[0]
Expand-Archive Node-Server-1.5.0-windows-x64.zip -DestinationPath . -Force
.\Node-Server.exe --version
```

`-Force` is what the quick start's command lacks: without it `Expand-Archive` refuses to
overwrite the existing `Node-Server.exe` and `tools\` (`… already exists. Use the -Force
parameter`). Everything else in the folder stays.

## Docker

Change the tag in the Compose file, then:

```bash
docker compose pull gameserver
docker compose up -d gameserver
docker compose logs -f gameserver
```

With `image: ghcr.io/nodemp-beamng/server:latest` the same two commands move to the newest
main-branch build, which may be ahead of the latest release — pin a version tag. The `/data`
volume is untouched. To roll back, put the previous tag in the file and run
the same commands.

## What survives an update

- **`server.toml`** is read by the new version and rewritten on its first start. Keys the new
  version adds appear with their defaults; keys it no longer has are dropped; your values stay.
  The file does not show you which key is new: compare it with the
  [reference table](/hosting/configuration/#reference), which always describes the current
  release (a key that arrived with a release is marked there with its version). The env-only
  Docker image has no file: a new key simply takes its default until you set its variable.
- **`node_cert.pem` and `node_key.pem`** are not part of the archive and are only generated
  when missing. Keep them: their fingerprint is how the directory and every launcher identify
  your server, and players who used Direct Connect have pinned it. A server that comes back with
  a new certificate is refused by those launchers with `server certificate fingerprint mismatch`
  until they clear the pin; listed servers get a new fingerprint recorded by the directory's
  probe within a couple of minutes.
- **`resources/`, `content/`, `storage/`, `bans.json`** are yours and untouched.
- **`integrity/`** — the reference manifest of a strict server — is yours too. It is tied to a
  game version, not to a server version: a server update leaves it alone, a **BeamNG** update
  makes it stale, and you regenerate it then
  ([Strict verification](/hosting/strict-verification/#after-a-game-update)). 1.1.0 adds the
  `[General] IntegrityDir` key, which appears in `server.toml` at its default `"integrity"`
  after the first start.
- **`.obfcache/`** is keyed by the obfuscator's revision, so a new build rebuilds it as needed.
  Deleting it is always safe.
- **Native modules** in `modules/` are checked against the server's plugin ABI at load. A module
  built for an older major ABI is refused with
  `module 'js-host' was built against SDK ABI 1.0, this server speaks 2.3 -- refusing to load it. Rebuild the module.`
  (the numbers are the live values) and needs a rebuild; resources written in a language such a module provides then do not
  load. Lua resources need nothing rebuilt, but re-test them after a major update.

Going back to an older version works the same way in reverse: it ignores keys it does not know
and rewrites the file without them.

## Protocol versions

Launcher and server speak a versioned wire protocol: **`v23` since server 1.5.0**, which belongs
together with launcher 1.1.12 and client mod 1.6.1. 1.1.0 raised it from `v17` to `v18` for the
strict install check and 1.1.1, 1.2.0 and 1.2.1 kept `v18`; 1.3.0 moved it to `v21` (position
batching, the synced node grabber and in-world triggers as core packets, vehicle fire and the
player's entry policy as frames) and 1.4.0 to `v22` (a refusal carries its reason: the seat
verdict's text and `Vehicle::EditDeny`); 1.5.0 moved it to `v23` (the sender's own acceleration
rides the position snapshot, 72 -> 78 bytes, so a remote car's forecast no longer has to
difference two noisy packets), so a 1.4.x server and a 1.1.11 launcher refuse each other in
both directions -- update the server in the same window your players get the launcher.
When a release changes it, a launcher on the old version is refused at the handshake with
`Protocol version mismatch: launcher speaks v22, server speaks v23 - update the outdated side`
(the two numbers are the live values). Players fix that by installing the current launcher from
[nodemp.com/download](https://nodemp.com/download); the client mod is kept current by the
launcher automatically before every join, the launcher itself is not. As a host, update the
server soon after such a release, since players are on the new launcher already. Whether a
release changed the protocol is stated in its release notes, here and in the
[version table](/introduction/what-is-nodemp/#versions): a server release that keeps the protocol
(1.1.1, 1.2.0, 1.2.1, 1.4.1) needs no launcher update from your players; one that moves it (1.3.0, 1.4.0) does.
