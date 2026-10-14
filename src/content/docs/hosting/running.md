---
title: Keeping it running
description: Run Node-Server as a service on Linux, at startup on Windows or with Docker Compose; where its files live, how it stops, and what to back up.
---

Once the server runs by hand ([Run a server](/hosting/quick-start/)), make it start on its own and
come back after a crash. This page covers the three usual setups and the files that matter.

## Files and folders

The server finds its files in two places: the **working directory** it's started in, and the
**folder of the executable**. When you start it from its own folder, as the quick start does, the
two are the same.

| Path | Where | What it is |
|---|---|---|
| `server.toml` | working directory (or `--config=`) | Your settings. Written once on the first start; after that only settings a newer version brings are added. |
| `resources/<name>/` | working directory | Plugins. |
| `content/` | working directory (`[Content] Folder`) | Mod zips for players, plus `mods.json`, the server's cache of their checksums. |
| `storage/` | working directory | What plugins save with the storage API. |
| `bans.json` | working directory | Banned addresses and accounts ([Bans](/hosting/administration/#bans)). |
| `integrity/` | working directory (`[General] IntegrityDir`) | Descriptions of a clean game install for the strict check. |
| `logs/server.log` | working directory | The log. The previous ones are `server.1.log`, `server.2.log` and so on; five are kept by default. |
| `node_cert.pem`, `node_key.pem` | executable folder (`[Network] TlsCert`, `TlsKey`) | The server's identity towards launchers. |
| `modules/` | executable folder | Native modules, including the database module that ships with the server. |
| `tools/` | executable folder (or `NODE_TOOLS_DIR`) | The script obfuscator and, on Windows, the Lua it runs on. |
| `.obfcache/` | next to `tools/` | Cache of obfuscated client scripts; safe to delete. |

`--working-directory=/path` moves the first group without a `cd`; `--config=` moves only the
settings file.

## Linux: systemd

Give the server a user and a folder of its own, and a unit that restarts it:

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

The lines in `EnvironmentFile` are `NAME=value`, without quotes. Environment variables win over
`server.toml`, so a secret kept in `/etc/nodemp.env` never ends up in a file you might paste into a
support thread.

## Windows

Run `Node-Server.exe` in its folder and leave the window open; it's also the console. To start the
server with the machine, create a Task Scheduler task that runs `C:\NodeMP\Node-Server.exe` with
*Start in* set to `C:\NodeMP`, at startup, whether or not anyone is signed in. The Lua it needs for
obfuscation is in the archive, so no setting is needed.

Closing the console window stops the server properly: it finishes stopping before the window goes.

## Docker Compose

The image takes its settings from `NODE_*` variables and keeps its state in `/data`. Load the image
from the release first (`docker load -i nodemp-server-v1.8.0-image.tar`), then:

```yaml
services:
  gameserver:
    image: nodemp-server:1.8.0-e11def6
    restart: unless-stopped
    ports:
      - "30814:30814/tcp"
      - "30814:30814/udp"
    environment:
      NODE_NAME: My server
      NODE_MAP: /levels/west_coast_usa/info.json
      NODE_MAX_PLAYERS: "16"
      NODE_MAX_CARS: "2"
      NODE_TLS_CERT: /data/tls/node_cert.pem
      NODE_TLS_KEY: /data/tls/node_key.pem
      NODE_DIRECTORY_URL: https://api.nodemp.com
      NODE_DIRECTORY_HOST_ID: ${NODE_DIRECTORY_HOST_ID}
      NODE_DIRECTORY_HOST_SECRET: ${NODE_DIRECTORY_HOST_SECRET}
    volumes:
      - ./data:/data
    stdin_open: true
    tty: true
```

Put the two secrets into a `.env` file next to `compose.yaml` (`NODE_DIRECTORY_HOST_ID=…`,
`NODE_DIRECTORY_HOST_SECRET=…`, readable only by you), give the data folder to the container's
user and start:

```bash
mkdir -p data && sudo chown 10001:10001 data
docker compose up -d
docker compose logs -f gameserver
```

- The image doesn't read `server.toml`; every setting is a variable, listed on
  [server.toml](/hosting/configuration/#every-setting).
- The two TLS variables are required: inside the image the executable's folder is read-only.
- To change a variable, edit the file and run `docker compose up -d` again. Compose recreates the
  container; `data/` stays.
- Files you copy into `data/resources/` or `data/content/` must be readable by user 10001
  (`sudo chown -R 10001:10001 data`). Mods are indexed at start, so restart after adding one:
  `docker compose restart gameserver`.
- `stdin_open` and `tty` give the server a terminal, which turns its console on.
  `docker attach <container>` takes you to it; Ctrl+P, Ctrl+Q leaves without stopping the server.
- The image checks itself: the container is marked unhealthy when the server's main loop stops
  moving.

## The console in a service

The console reads commands only from a terminal. Under systemd, in Docker without a terminal or
behind a pipe it stays off, unless `[General] Console = true` (`NODE_CONSOLE=true`) asks it to read
from standard input anyway. Plugins and the server's own log work the same either way.

## Stopping

Ctrl+C, `stop` in the console, `systemctl stop` and `docker compose stop` all stop the server the
same way. It logs `stop requested by …` (`Ctrl+C`, `SIGTERM`, …), sends every player away with
`Server shutdown`, shuts down its parts and ends with `Shutdown.`. If a part doesn't finish within
10 seconds, the server says which one, ends anyway and exits with code 1; pressing Ctrl+C a few
more times ends it at once.

If the server crashes, it writes a `FATAL:` line and a stack trace into `logs/server.log` first (on
Windows also a `logs/crash-<pid>.dmp` file). Send those along when you report it.

## What to back up

| Keep | Why |
|---|---|
| `server.toml` | Your settings. With Docker, keep the Compose and `.env` files instead. |
| `node_cert.pem`, `node_key.pem` (`data/tls/` in Docker) | The server's identity. Launchers that joined by address remember it; a new pair looks like a different server to them. |
| `resources/`, `content/` | Your plugins and mods. |
| `storage/`, `bans.json` | What your plugins saved, and your bans. |

`logs/`, `.obfcache/` and `content/mods.json` are made again on their own.
