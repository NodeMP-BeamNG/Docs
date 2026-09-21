---
title: What is NodeMP
description: NodeMP is a multiplayer platform for BeamNG.drive — launcher, client mod, game server, directory and plugins — and this is how a session starts.
---

NodeMP is a multiplayer platform for [BeamNG.drive](https://www.beamng.com/). Many players share
one map: they drive, crash and spawn vehicles together, and the server keeps every car in step.
Around that core NodeMP adds accounts, a directory of servers and a plugin platform for hosts
and developers.

This page names the parts, walks through how a session starts and says what NodeMP is not.

## The parts

- **Launcher** — a desktop app for Windows. You sign in to your NodeMP account or continue as
  *Test Drive*, pick a server from the list and hold **Hold to play**. The launcher keeps the
  client mod up to date and starts BeamNG.drive through its **helper** — the part of the launcher
  that does the join itself: the same `nodemp-launcher.exe` run a second time with `--helper`,
  without a window, which starts the game and owns the connection to the server while you play.
  The launcher's messages call the helper "the launcher" (`The launcher stopped · …`).
- **Client mod** — `NodeMP.zip`, a BeamNG mod (id `multiplayernodemp`). The launcher downloads it
  from the directory into `mods/multiplayer/` in your BeamNG user folder and checks its hash
  before every join. Inside the game it synchronizes vehicles, draws the chat, the player list and
  the session info, and adds a NodeMP page to the game's Options.
- **Game server** — `Node-Server`, a C++ program for Linux and Windows, also shipped as a Docker
  image. It reads `server.toml`, listens on one port for TCP and UDP (`30814` by default), relays
  vehicle state between players, delivers content to joining players and runs plugins.
- **Directory** — the service at `https://api.nodemp.com`. It holds accounts, issues join tickets,
  lists servers, issues server keys to hosts and publishes launcher and mod releases.
- **Website** — `https://nodemp.com`: downloads, your account and the page where you create server
  keys.

## How a session starts

1. In the launcher you pick a server from the list, or type an address into *Direct Connect*.
2. The launcher compares the installed `NodeMP.zip` with the release the directory publishes and
   downloads the published one if the hashes differ.
3. The launcher asks the directory for a one-shot join ticket for that server. A signed-in player
   gets a ticket for their account; a Test Drive player gets a guest ticket and a generated guest
   name.
4. The launcher starts the helper with the server address, your name and the ticket. The helper
   starts BeamNG.drive and opens a TLS 1.3 connection to the server. The client mod talks to the
   helper over two local TCP channels: `4444` for commands and `4445` for game traffic.
5. The server redeems the ticket with the directory and takes the verified name from the answer.
   A server with `TestDrive = false` refuses guests and players without a ticket.
6. The helper checks your BeamNG install as strictly as the server asks (`VerifyGame`: file
   sizes, the game's scripts, everything, or — on a *strict* server — the whole install and your
   user folder against the host's reference of a clean game) and reports; a mismatch is refused
   with the reason.
7. The server sends the map and its content list, the helper downloads missing content into
   `mods/multiplayer/`, the server streams its client scripts, and you spawn.

A server without a server key skips step 5: it accepts anyone who knows its address and takes
names as the launcher sends them - on such a server, and only there, nobody's name is verified.
See the [framework overview](/framework/overview/).

## What a plugin is

*Plugin* is the umbrella word for two things:

- A **resource** is a folder under `resources/` in the server's working directory with a
  `resource.toml`. Its server half is Lua (`server/main.lua`), or JavaScript when the `js-host`
  module is installed, and uses the `node` API. Its client half, `client/*.lua`, is streamed to
  every player on join and runs inside the game.
- A **native module** is a shared library (`.so` or `.dll`) in `modules/` next to the server
  executable. It is written in C or C++ against `node.h` and can do what a resource cannot: teach
  the server a new resource language.

Start with the [plugin overview](/plugins/overview/).

## What NodeMP is not

NodeMP is not a replacement for BeamMP: it does not run BeamMP server plugins, and a BeamMP server
cannot be moved over as it is. See [Differences from BeamMP](/introduction/differences-from-beammp/).

## Versions

| Component | Version | Release |
|---|---|---|
| Game server (`Node-Server`) | 1.4.1 | tag `server-v1.4.1`: `Node-Server-1.4.1-linux-x64.tar.gz`, `Node-Server-1.4.1-windows-x64.zip`, image `ghcr.io/nodemp-beamng/server:v1.4.1` |
| Launcher | 1.1.10 | tag `launcher-v1.1.10`: `NodeMP-Setup-1.1.10.exe` |
| Client mod (`NodeMP.zip`) | 1.5.7 | tag `mod-v1.5.7`: `NodeMP-1.5.7.zip`, installed by the launcher |
| Wire protocol | v22 | launcher and server must match exactly; a mismatch is refused with a reason |

All releases are published at
[github.com/NodeMP-BeamNG/releases](https://github.com/NodeMP-BeamNG/releases).

## Next steps

- Players: [Install the launcher](/players/install/), then [Join a server](/players/join/).
- Hosts: [Hosting quick start](/hosting/quick-start/).
- Developers: [Plugin overview](/plugins/overview/) and the [API reference](/plugins/api/).
- Terms: the [glossary](/reference/glossary/); the questions readers ask most: the [FAQ](/reference/faq/).
