---
title: What is NodeMP
description: NodeMP is multiplayer for BeamNG.drive. What it is made of and what happens when you join a server.
---

NodeMP is multiplayer for [BeamNG.drive](https://www.beamng.com/). Players join a server, drive on one map and see each other's cars.

## The parts

| Part | What it is | Who needs it |
|---|---|---|
| Launcher | A Windows program: signs you in, lists servers, updates the client mod and starts the game. | Every player ([Install the launcher](/players/install/)). |
| Client mod | `NodeMP.zip`, the part inside the game: other players' cars, chat, name tags. | Every player. The launcher installs it. |
| Server | `Node-Server`, the program players connect to. Runs on Windows, Linux and in Docker. | Whoever runs a server ([Run a server](/hosting/quick-start/)). |
| Plugins | What makes one server different from another: chat commands, rules, game modes. Most are written in Lua. | Whoever writes them ([Overview](/plugins/overview/)). |
| Account | A free account at nodemp.com: one name on every server. | Optional for players ([Your account](/players/sign-in/)). Hosts need it to get a server into the list ([Get listed](/hosting/registering/)). |

## What happens when you join

You pick a server in the launcher and join it. The launcher checks the client mod and your game files, downloads the server's mods you don't have yet and starts BeamNG.drive ([Join a server](/players/join/#join)). If joining fails, the reason is in a launcher notification ([When something breaks](/players/troubleshooting/)).

While you play, your game simulates your own car and sends its position to the server, and the server passes it on to everyone else ([A bad connection and VPNs](/players/connection/#lag-and-jumping-cars)).
