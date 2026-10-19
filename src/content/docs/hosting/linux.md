---
title: Server on Linux
description: Download Node-Server for Linux, install Lua 5.1 for the obfuscator, open the port and run the server as a systemd service.
---

The Linux build is for x64 and is built on Ubuntu 24.04. On an older system, run the [Docker image](/hosting/docker/).

## Download and unpack

On the [download page](https://nodemp.com/download), the **Linux x64** button in the **Your own server** block downloads the archive. On a machine without a browser, take it from GitHub:

```bash
sudo mkdir -p /opt/nodemp && sudo chown "$USER" /opt/nodemp
cd /opt/nodemp
version=<version>
url=https://github.com/NodeMP-BeamNG/releases/releases/download/server-v$version
curl -LO "$url/Node-Server-$version-linux-x64.tar.gz"
curl -LO "$url/Node-Server-$version-linux-x64.tar.gz.sha256"
sha256sum -c Node-Server-$version-linux-x64.tar.gz.sha256
tar -xzf Node-Server-$version-linux-x64.tar.gz
```

`sha256sum` must print `OK`. The folder now holds `Node-Server`, `tools/`, `modules/` and `examples/`.

## Install Lua 5.1

Before sending plugins' client scripts to players, the server obfuscates them. The obfuscator is written in Lua and runs on Lua 5.1, which the Linux archive doesn't include:

```bash
sudo apt install -y lua5.1
```

The server takes the path to it from the `NODE_LUA` variable. Without Lua the server still works; it sends the client scripts as they are and says so at start.

## Start it

```bash
NODE_LUA=/usr/bin/lua5.1 ./Node-Server
```

The server writes `server.toml`, `logs/` and `content/` into the current folder. Stop it with Ctrl+C or the `stop` command.

## Open the port

With `ufw`:

```bash
sudo ufw allow 30814/tcp
sudo ufw allow 30814/udp
```

Many VPS providers also have a firewall in their control panel: open the port there too.

## A systemd service

A service starts the server with the system and restarts it after a crash. Create a user for the server and give it the folder:

```bash
sudo useradd -r -s /usr/sbin/nologin -d /opt/nodemp nodemp
sudo chown -R nodemp:nodemp /opt/nodemp
```

Create the file `/etc/systemd/system/nodemp.service`:

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

Enable and start the service, then follow the log:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nodemp
journalctl -u nodemp -f
```

Keep secrets, such as the server key, in `/etc/nodemp.env`, one `NAME=value` per line, and not in `server.toml` ([Put the key into the settings](/hosting/registering/#put-the-key-into-the-settings)).

A service has no terminal, so it has no console. Stop the server with `sudo systemctl stop nodemp`, and kick and ban players with plugins ([Console, kicks and bans](/hosting/administration/#kicks-and-bans)).
