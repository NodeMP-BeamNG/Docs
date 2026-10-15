---
title: What is NodeMP
description: NodeMP lets you play BeamNG.drive online with other people. The parts it's made of, what happens when you join, and which versions are current.
---

NodeMP lets you drive [BeamNG.drive](https://www.beamng.com/) online with other people: one map,
everyone's cars on it, everyone's crashes. You install one program, pick a server and hold a button.
The rest happens by itself.

## The parts

| Part | What it is | Who needs it |
|---|---|---|
| **Launcher** | A Windows program: signs you in, lists servers, keeps the mod up to date, starts the game. | Every player. [Install it](/players/install/). |
| **Client mod** | `NodeMP.zip`, the part inside the game: other players' cars, the chat, name tags. The launcher installs it. | Every player, without lifting a finger. |
| **Server** | `Node-Server`, the program players connect to. Runs on Windows, Linux or in Docker. | Whoever hosts. [Run a server](/hosting/quick-start/). |
| **Plugins** | What makes a server different: commands, roles, races, rules. Mostly Lua on the server. | Whoever writes them. [Plugin development](/plugins/overview/). |
| **Account** | A free account at nodemp.com. It keeps your name the same everywhere and puts servers in the list. | Optional for players, needed to list a server. [Your account](/players/sign-in/). |

## What happens when you join

1. You pick a server in the launcher and hold **Hold to play**.
2. The launcher checks the client mod and your game files, as closely as the server asks.
3. It downloads the server's mods you don't have yet.
4. BeamNG.drive starts and loads straight into the server's map.

While you play, your game simulates your own car and sends its position to the server many times a
second; the server passes it on to everyone else. If something goes wrong on the way in, the
launcher says what and why ([When something breaks](/players/troubleshooting/)).

## Versions

| Part | Version | Where to get it |
|---|---|---|
| Server (`Node-Server`) | 1.11.1 | [GitHub releases](https://github.com/NodeMP-BeamNG/releases/releases): Windows, Linux, Docker |
| Launcher | 1.1.25 | [nodemp.com/download](https://nodemp.com/download) |
| Client mod (`NodeMP.zip`) | 1.7.7 | Installed by the launcher |

The client mod is built for BeamNG.drive 0.39.4.0. The launcher and the server speak wire protocol
v23; when one of them is too old, the launcher says which, and offers to update itself.

## Where to go next

- **Playing:** [Install the launcher](/players/install/), then [join a server](/players/join/).
- **Hosting:** [Run a server](/hosting/quick-start/).
- **Writing plugins:** [Your first resource](/plugins/getting-started/). Wrote plugins for another
  multiplayer mod before? See [Moving from other platforms](/plugins/migrating/).
