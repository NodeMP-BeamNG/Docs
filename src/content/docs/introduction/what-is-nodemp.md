---
title: What is NodeMP
description: NodeMP is a multiplayer platform for BeamNG.drive — launcher, client mod, game server, directory and plugins — and this is how a session starts.
---

NodeMP lets you play [BeamNG.drive](https://www.beamng.com/) online with others: cruising, crashing, and spawning vehicles together on the same map. The server relays vehicle state and motion between players. The platform provides a desktop launcher, an open server browser, and a plugin system.

## The parts

The platform consists of five primary components:

- **Launcher** — a desktop app for Windows. Choose a server, sign in or continue in Test Drive, and launch BeamNG.drive.
- **Client mod** — the NodeMP in-game mod. Automatically downloaded by the launcher, it handles vehicle synchronization, in-game chat, the player list, and networking settings.
- **Game server** — the `Node-Server` program (available for Linux, Windows, and Docker). Synchronizes vehicle state, distributes mods, and executes server plugins.
- **Directory** — the web service at `https://api.nodemp.com`, managing the public server browser and account authentication.
- **Website** — the portal at `https://nodemp.com` for downloads, account management, and server keys.

## How a session starts

1. Select a server from the launcher's browser or enter an address manually in Direct Connect.
2. The launcher checks the client mod and updates it automatically if a newer release exists.
3. The launcher starts BeamNG.drive and establishes a secure connection to the server.
4. The server validates client game files according to its verification settings (from basic checks to strict clean-install matching).
5. The map loads, missing mods are downloaded automatically, and you spawn onto the map.

For a deeper look at the network architecture, see the [framework overview](/framework/overview/).

## What a plugin is

The term *plugin* covers two distinct extension formats:

- **Resources** — folders configured with a `resource.toml` manifest. Server-side code is written in Lua or JavaScript (requires `js-host`), while client scripts stream to players dynamically to run inside the game.
- **Native modules** — shared libraries (`.dll` or `.so`) written in C or C++ against `node.h`. Used for high-performance tasks, network packet filtering, or adding new language runtimes.

To get started, see the [plugin overview](/plugins/overview/).

## What NodeMP is not

NodeMP is not a replacement for BeamMP: it uses its own architecture and does not run BeamMP server plugins. See [Differences from BeamMP](/introduction/differences-from-beammp/).

## Versions

| Component | Version | Download |
|---|---|---|
| Game server (`Node-Server`) | 1.5.0 | [Linux / Windows releases](https://github.com/NodeMP-BeamNG/releases) or Docker `ghcr.io/nodemp-beamng/server:v1.5.0` |
| Launcher | 1.1.18 | [NodeMP-Setup-1.1.18.exe](https://github.com/NodeMP-BeamNG/releases) |
| Client mod (`NodeMP.zip`) | 1.6.19 | Installed automatically by the launcher |
| Wire protocol | v23 | Launcher and server versions must match |

All official builds are published on [GitHub Releases](https://github.com/NodeMP-BeamNG/releases).
