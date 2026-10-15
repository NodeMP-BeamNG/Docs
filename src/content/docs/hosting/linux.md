---
title: Server on Linux
description: Download Node-Server for Linux, install Lua 5.1 for the obfuscator, open the port and run the server as a systemd service.
---

The Linux build runs on x64 with glibc 2.38 or newer: Ubuntu 24.04, Debian 13 and their peers. On
an older system, run the [Docker image](/hosting/docker/).

## Download and unpack

```bash
sudo mkdir -p /opt/nodemp && sudo chown "$USER" /opt/nodemp
cd /opt/nodemp
url=https://github.com/NodeMP-BeamNG/releases/releases/download/server-v1.10.0
curl -LO "$url/Node-Server-1.10.0-linux-x64.tar.gz"
curl -LO "$url/Node-Server-1.10.0-linux-x64.tar.gz.sha256"
sha256sum -c Node-Server-1.10.0-linux-x64.tar.gz.sha256
tar -xzf Node-Server-1.10.0-linux-x64.tar.gz
```

`sha256sum` should say `OK`. The folder now holds `Node-Server`, `tools/`, `modules/` and
`examples/`.

## Install Lua 5.1

The server obfuscates the client scripts of plugins before it sends them to players. The
obfuscator is written in Lua and runs on Lua 5.1, which the Linux archive doesn't include:

```bash
sudo apt install -y lua5.1
```

The server finds it through the `NODE_LUA` variable. Without Lua the server still runs; it sends
client scripts as they are and says so at start.

## Start it

```bash
NODE_LUA=/usr/bin/lua5.1 ./Node-Server
```

The server writes `server.toml`, `logs/` and `content/` into the current folder. Ctrl+C or `stop`
stops it.

## Open the port

With `ufw`:

```bash
sudo ufw allow 30814/tcp
sudo ufw allow 30814/udp
```

A VPS provider often has a firewall of its own in its control panel; open the port there too.

## A systemd service

This starts the server with the system and brings it back after a crash. Give the server a user
and the folder:

```bash
sudo useradd -r -s /usr/sbin/nologin -d /opt/nodemp nodemp
sudo chown -R nodemp:nodemp /opt/nodemp
```

Create `/etc/systemd/system/nodemp.service`:

```ini
[Unit]
Description=NodeMP server
After=network-online.target
Wants=network-online.target

[Service]
User=nodemp
WorkingDirectory=/opt/nodemp
Environment=NODE_LUA=/usr/bin/lua5.1
EnvironmentFile=-/etc/nodemp.env
ExecStart=/opt/nodemp/Node-Server
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start it, then follow the log:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nodemp
journalctl -u nodemp -f
```

`/etc/nodemp.env` is a good place for secrets such as the server key: one `NAME=value` per line,
without quotes. Environment variables win over `server.toml`, so the secret never ends up in a file
you might paste into a support chat one day. [Get listed](/hosting/registering/) has an example.

A service has no terminal, so the server's console is off. `[server] console` makes it read
standard input anyway, but a service rarely needs that.

## Next

- [Name, map and slots](/hosting/quick-start/#name-map-and-slots).
- [Get listed](/hosting/registering/).
- [Updating the server](/hosting/updating/).
