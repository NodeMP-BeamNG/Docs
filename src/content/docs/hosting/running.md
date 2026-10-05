---
title: Running the server
description: Run Node-Server as a systemd or Docker Compose service, know where its files live, read the logs, stop it cleanly and back up the right folders.
---

This page assumes the server already starts by hand as in the [quick start](/hosting/quick-start/).
It turns that into something that survives a reboot, and lists the files you are responsible for.

## Files and folders

The server resolves its paths from two places: the **working directory** it is started in, and
the **folder of the executable**. When you run it from its own folder, as the quick start does,
the two are the same.

| Path | Relative to | What it is |
|---|---|---|
| `server.toml` | working directory (or `--config=`) | The configuration, rewritten at every start. |
| `resources/<name>/` | working directory | Resources: server-side scripts and streamed client scripts. |
| `content/` | working directory (`[Content] Folder`) | Client mod zips, plus the hash cache `content/mods.json`. |
| `storage/<store>.json`, `.log` | working directory | Persistent data resources keep through the storage API. |
| `bans.json` | working directory | Banned addresses and accounts ([Bans](/hosting/administration/#bans)). |
| `logs/server.log`, `logs/server.old.log` | working directory | The current and the previous run's log. |
| `node_cert.pem`, `node_key.pem` | executable folder (`[Network] TlsCert`, `TlsKey`) | The server's TLS identity. |
| `modules/` | executable folder | Native modules (`.so`, `.dll`). |
| `tools/` | executable folder (or `NODE_TOOLS_DIR`) | The obfuscator and, on Windows, its Lua runner. |
| `.obfcache/` | next to `tools/` | Cache of obfuscated client scripts; safe to delete. |

`--working-directory=/path` changes the first group without a `cd`; `--config=` moves the config
file alone.

## Linux: systemd

Give the server its own user and folder, then a unit that restarts it and carries the two
environment variables it needs — the Lua runner for obfuscation and, if you keep the server key
out of `server.toml`, the `NODE_DIRECTORY_*` variables from a root-only file.

```bash
sudo useradd -r -s /usr/sbin/nologin -d /opt/nodemp nodemp
sudo chown -R nodemp:nodemp /opt/nodemp
sudo install -m 600 /dev/null /etc/nodemp.env   # optional: NODE_DIRECTORY_URL, _HOST_ID, _HOST_SECRET
```

`/etc/systemd/system/nodemp-server.service`:

```ini
[Unit]
Description=NodeMP game server
After=network-online.target
Wants=network-online.target

[Service]
User=nodemp
Group=nodemp
WorkingDirectory=/opt/nodemp
Environment=NODE_LUA=/usr/bin/lua5.1
EnvironmentFile=-/etc/nodemp.env
ExecStart=/opt/nodemp/Node-Server
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nodemp-server
journalctl -u nodemp-server -f
```

`EnvironmentFile` lines are `NAME=value` without quotes. Variables override the same keys in
`server.toml`, so a secret that lives in `/etc/nodemp.env` never gets written into the file.

## Windows

Run `Node-Server.exe` from a shell opened in its folder and leave the window open; Ctrl+C stops
it. For a server that starts with the machine, create a Task Scheduler task that runs
`C:\NodeMP\Node-Server.exe` with *Start in* set to `C:\NodeMP`, at startup, whether the user is
logged on or not. The bundled `tools\lua515\lua5.1.exe` is found automatically; no environment
variable is needed.

## Docker Compose

The image is configured entirely through `NODE_*` variables and keeps its state in `/data`.
This service is the shape the official server runs with:

```yaml
services:
  gameserver:
    image: ghcr.io/nodemp-beamng/server:v1.5.0
    restart: unless-stopped
    ports:
      - "30814:30814/tcp"
      - "30814:30814/udp"
    environment:
      NODE_NAME: My server
      NODE_MAP: /levels/west_coast_usa/info.json
      NODE_MAX_PLAYERS: "16"
      NODE_MAX_CARS: "2"
      NODE_VERIFY_GAME: size
      NODE_TLS_CERT: /data/tls/node_cert.pem
      NODE_TLS_KEY: /data/tls/node_key.pem
      NODE_DIRECTORY_URL: https://api.nodemp.com
      NODE_DIRECTORY_HOST_ID: ${NODE_DIRECTORY_HOST_ID}
      NODE_DIRECTORY_HOST_SECRET: ${NODE_DIRECTORY_HOST_SECRET}
    volumes:
      - ./data:/data
```

Put the two secrets into a `.env` file next to `compose.yaml` (`NODE_DIRECTORY_HOST_ID=…`,
`NODE_DIRECTORY_HOST_SECRET=…`, mode 600), create the data folder for the container's user, and
start:

```bash
mkdir -p data && sudo chown 10001:10001 data
docker compose up -d
docker compose logs -f gameserver
```

The two TLS variables are required in a container: the executable's folder inside the image is
read-only, so the certificate and key must live on the volume. To change a variable, edit the
file and run `docker compose up -d` again; Compose recreates the container and `data/` stays.
Files you copy into `data/resources/` or `data/content/` must be readable by user id 10001
(`sudo chown -R 10001:10001 data`), and content is indexed at start, so restart after adding a
zip: `docker compose restart gameserver`.

There is no console: the process reads nothing from standard input, in a container or outside
one. Administration happens through resources - chat commands such as the ones in
[Recipes](/plugins/recipes/#kick-and-ban-with-a-reason) - and, for bans, through the file
described [below](/hosting/administration/#bans).

## Stopping

Ctrl+C, `systemctl stop`, or `docker compose stop` send SIGINT or SIGTERM. The server logs
`gracefully shutting down via SIGTERM`, kicks every player with the reason `Server shutdown`,
stops its subsystems and ends with `Shutdown.`. Pressing Ctrl+C repeatedly forces the exit. Two
things a clean stop prints are noise, not damage: on Windows, after `Shutdown.`,
`Error › UDP recvfrom() failed: A blocking operation was interrupted by a call to WSACancelBlockingCall`
and `Error › Failed to accept() new client: …` are the network threads reporting their own
cancellation; with a database configured, `Warn › pg: no live database connection (reconnecting)`
is the pool announcing a reconnect it will not make.

