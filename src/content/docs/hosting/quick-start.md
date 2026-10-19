---
title: Run a server
description: What a NodeMP server needs, where to get Node-Server, and how to get from the download to your first join.
---

`Node-Server` is the program players connect to. It runs on Windows, on Linux and in Docker. You don't need an account to run one: without one, the server isn't in the public list, and players join by address.

## What you need

- A computer or a VPS that players can reach on one port, over TCP and UDP. The default is `30814`. If the server is at home, forward the port on your router.
- Windows x64 or Linux x64 ([what Linux needs](/hosting/linux/)).
- An account at [nodemp.com](https://nodemp.com), if the server should be in the list.

## Steps

1. Download and start the server. The Windows and Linux archives are on the [download page](https://nodemp.com/download) in the **Your own server** block, with their checksums. Instructions for each system: [Windows](/hosting/windows/), [Linux](/hosting/linux/) or [Docker](/hosting/docker/).
2. Open port `30814` for TCP and UDP. The firewall commands are on the same pages.
3. Set the name, the map and the number of slots ([below](#name-map-and-slots)).
4. Add the server to the list with a server key: [Get listed](/hosting/registering/).
5. Join it from the launcher ([below](#join-your-server)).

The same files are on [GitHub](https://github.com/NodeMP-BeamNG/releases/releases) under the tag `server-v<version>`: the Windows archive, the Linux archive and a `.sha256` file next to each.

## The first start

On its first start the server writes a short `server.toml` with the settings a host usually changes, creates a TLS certificate and the `content/` and `logs/` folders. When all is well, the console shows:

```text
listening on [::]:30814 (udp, dual-stack: IPv4 + IPv6)
listening on [::]:30814 (tcp, tls 1.3, dual-stack: IPv4 + IPv6)
server is ready
```

To stop the server, press Ctrl+C or type `stop` in its window.

## Name, map and slots

Open `server.toml` and change the lines in the `[server]` table:

```toml
[server]
name = "Evening freeroam"
map = "/levels/west_coast_usa/info.json"
max_players = 16
cars_per_player = 2
```

The map is the path to its `info.json`: `/levels/<map folder>/info.json`. To use a map of your own, see [Mods and maps](/hosting/mods/). `max_players` is how many players the server takes, and `cars_per_player` how many cars each of them can have.

Save the file and restart the server. The other settings are in [Configuring the server](/hosting/server-toml/) and [Settings reference](/hosting/configuration/). In Docker there is no file; the same settings are environment variables ([Server in Docker](/hosting/docker/)).

## Join your server

A server with a key shows up in the **Servers** tab of the launcher. A server without a key isn't in the list: click **Direct Connect** and enter its public address with the port, such as `203.0.113.10:30814` ([Join a server](/players/join/#join-by-address)). From a computer on the same home network, use the server's local address, such as `192.168.1.20:30814`.
