---
title: Run a server
description: What a NodeMP server needs, where to get Node-Server, and five steps from the download to your first join.
---

`Node-Server` is the program players connect to. It runs on Windows, on Linux and in Docker. You
don't need an account to run one: without it the server just isn't in the public list, and players
join it by address.

## What you need

- A computer or a VPS players can reach on one port, TCP and UDP. The default is `30814`. If the
  server is at home, forward that port on your router.
- Windows x64, or Linux x64 as new as Ubuntu 24.04: the Linux build needs glibc 2.38 and the
  libstdc++ of GCC 13. On an older Linux, run the Docker image.
- An account at [nodemp.com](https://nodemp.com), only if the server should be in the list.

## Five steps

1. **Download and start the server.** Follow the page for your system:
   [Windows](/hosting/windows/), [Linux](/hosting/linux/) or [Docker](/hosting/docker/).
2. **Open the port** `30814` for TCP and UDP. The firewall commands are on the same pages.
3. **Give it a name, a map and slots**, [below](#name-map-and-slots).
4. **Put it in the list** with a server key: [Get listed](/hosting/registering/).
5. **Join it** from the launcher, [below](#join-your-server).

The server is published on [GitHub](https://github.com/NodeMP-BeamNG/releases/releases/tag/server-v1.10.0)
under the tag `server-v1.10.0`: an archive for Windows, one for Linux and the Docker image, each with
a `.sha256` file next to it for checking the download.

## The first start

On its first start the server writes a short `server.toml` with the settings a host usually changes,
makes a TLS certificate and creates the `content/` and `logs/` folders. When all went well, the console ends
with:

```
listening on [::]:30814 (tcp, tls 1.3, dual-stack: IPv4 + IPv6)
0 resources · 1 module loaded
server is ready
```

The `no database configured` warning above them is normal. The database module ships with the
server and waits until a plugin needs it.

To stop the server, press Ctrl+C or type `stop` in its window.

## Name, map and slots

Open `server.toml` and change these lines in the `[server]` table:

```toml
[server]
name = "Friday freeroam"
map = "/levels/west_coast_usa/info.json"
max_players = 16
cars_per_player = 2
```

- `name` is the server's name in the list and in the game.
- `map` is the path to the map's `info.json`: `/levels/<map folder>/info.json`.
  [Mods and maps](/hosting/mods/) explains how to add a map of your own.
- `max_players` is how many players can be on at once.
- `cars_per_player` is how many cars one player can have.

The server reads the file only when it starts, so restart it after a change. It doesn't write to the
file itself: your edits and comments stay. Every other setting is on
[server.toml](/hosting/configuration/). In Docker there is no file; the same settings are
environment variables there.

## Join your server

Open the launcher. A server with a key is in the **Servers** tab; find it by name.

A server without a key isn't in the list. Click **Direct Connect** and enter the public address
with the port, such as `203.0.113.10:30814`. From a computer on the same home network, use the
server's local address instead, such as `192.168.1.20:30814`.

## Next

- [Mods and maps](/hosting/mods/) and [resources](/hosting/resources/): what to add to the server.
- [Console, kicks and bans](/hosting/administration/): running it day to day.
- [Updating](/hosting/updating/): installing new releases.
