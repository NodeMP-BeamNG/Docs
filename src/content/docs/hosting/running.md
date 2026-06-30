---
title: Running the server
description: Build the NodeMP game-server binary and run it on Linux (systemd), Windows (native), or with Docker / docker-compose.
---

This page covers building the NodeMP **game server** and running it three ways: natively on
Linux under systemd, natively on Windows, and with Docker (single container or an all-in-one
compose stack). For the configuration file every method shares, see
[Configuration](/hosting/configuration/).

## Ports and the backend URL

Two things apply to every method:

- **Ports** — the server listens on **`30814/tcp` and `30814/udp`** by default (one port, both
  protocols). Open both in your firewall for remote players.
- **Backend URL** — the address of the backend is supplied through the **`NODEMP_BACKEND_URL`**
  environment variable, *not* the TOML file. It defaults to `https://api.nodemp.com`. A
  private/loopback server needs no backend at all (see [the quick start](/hosting/quick-start/)).

## Build the binary

Prebuilt downloads aside, the supported way to produce the binary is the provided **Dockerfile**,
which pins the toolchain (modern CMake + vcpkg) and runs the build for you. From the `server/`
directory:

```bash
docker build -t nodemp-server-build .
id=$(docker create nodemp-server-build)
sudo mkdir -p /opt/nodemp
docker cp "$id":/workspace/build/NodeMP-Server /opt/nodemp/NodeMP-Server
docker rm "$id"
sudo chmod +x /opt/nodemp/NodeMP-Server
```

There is also a `Dockerfile.ubuntu` (Ubuntu 24.04 base) if you prefer it over the Debian default.
The first launch from `/opt/nodemp` creates `ServerConfig.toml` and the empty `Resources/Server`
and `Resources/Client` folders.

## Linux — systemd (native)

Best for a dedicated host: build once, run the binary directly under systemd (no Docker at
runtime).

1. Install the runtime libraries the binary links against:

```bash
sudo apt install -y liblua5.4-0 libssl3 libcurl4 zlib1g
```

2. Install the unit file shipped in `deploy/nodemp-server.service`:

```bash
sudo cp deploy/nodemp-server.service /etc/systemd/system/
sudo nano /etc/systemd/system/nodemp-server.service   # set NODEMP_BACKEND_URL
sudo systemctl daemon-reload
sudo systemctl enable --now nodemp-server
journalctl -u nodemp-server -f                          # watch it come up
```

The unit assumes the binary at `/opt/nodemp/NodeMP-Server` and runs from `/opt/nodemp` (where the
config and `Resources/` live). It restarts on failure and includes optional hardening
(`NoNewPrivileges`, `ProtectSystem`, `ProtectHome`, `PrivateTmp`) you can enable after creating a
dedicated user:

```ini
[Service]
WorkingDirectory=/opt/nodemp
ExecStart=/opt/nodemp/NodeMP-Server
Environment=NODEMP_BACKEND_URL=https://api.example.com
Restart=on-failure
RestartSec=5
```

3. Open the firewall:

```bash
sudo ufw allow 30814/tcp
sudo ufw allow 30814/udp
```

## Windows — native

NodeMP runs natively on Windows. Place `NodeMP-Server.exe` in its own folder and run it from
there so the config and `Resources/` are created beside it.

If you build from source, the helper script **`run-server-local.bat`** is the easiest path for a
local test: it runs the freshly built `build\Release\NodeMP-Server.exe` from a `run-local\`
working folder, points `NODEMP_BACKEND_URL` at `http://localhost:8080`, frees port 30814 from any
stale instance, and keeps the window open so you can read `run-local\Server.log`.

For a real Windows host, set `NODEMP_BACKEND_URL` yourself (a system environment variable, or in
the shell before launching) and allow `30814/tcp` + `30814/udp` through Windows Firewall.

## Docker

### Single container

The same image used for the build also runs the server. Mount a host folder at `/data` so your
config and resources persist, and publish the port for both protocols:

```bash
docker build -t nodemp-server:local -f Dockerfile .
docker run -d --name nodemp-server \
  -e NODEMP_BACKEND_URL=https://api.example.com \
  -v "$PWD/gamedata:/data" -w /data \
  -p 30814:30814/tcp -p 30814:30814/udp \
  nodemp-server:local /workspace/build/NodeMP-Server
```

### All-in-one with docker-compose

For a self-contained stack — **Postgres + Redis + backend + game server** on one host — use
`deploy/docker-compose.yml`. It is ideal for an end-to-end test where you also want accounts and
the server list.

```bash
cd deploy
cp .env.example .env        # set NODEMP_JWT_SECRET (openssl rand -base64 48)
docker compose up -d --build
docker compose logs -f game-server
```

The compose file wires the game server to the backend automatically
(`NODEMP_BACKEND_URL=http://backend:8080`) and persists config + resources in
`deploy/gamedata/` (`ServerConfig.toml`, `Resources/Server`, `Resources/Client`). Its defaults
suit a private/IP test on a single host:

```
NODEMP_PROBE_ENABLED=false
NODEMP_STRICT_REDEEM_IP=false
```

To get listed publicly, register the host and flip those flags — see
[Registering your host](/hosting/registering/).

:::note
In the single-host compose setup the backend sees the game server by its container IP, so keep
`NODEMP_STRICT_REDEEM_IP=false`. For a real public server, run the components with their real
public addressing.
:::

## Verify it works

A healthy start prints the node name, map, and an uplink summary (port, max players, max cars). If
you set `[Backend]` credentials, it also reports the mesh as *registered*; otherwise *private /
LAN*. To test the full account/join chain before players connect, run `deploy/preflight.sh`
(covered in [Registering your host](/hosting/registering/)).

## Next steps

- [Registering your host](/hosting/registering/) — appear in the public server list.
- [Updating](/hosting/updating/) — replace the binary while keeping your config.
- [Resources & mods](/hosting/resources/) — add server plugins and client mods.
