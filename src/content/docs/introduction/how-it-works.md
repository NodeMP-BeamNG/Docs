---
title: How it works
description: What happens between your game and the server - who simulates which car, what travels over the network and how often, and what happens when a connection drops.
---

You don't need any of this to play or to run a server. It is here for the curious, and for plugin
authors who want a picture of what their code sits inside.

## Three programs and two links

```
BeamNG.drive + client mod  ⇄  launcher helper  ⇄  Node-Server
        (on your PC, local ports)       (over the internet)
```

- The **client mod** runs inside BeamNG.drive. It reads your car's state, applies everybody else's
  and draws the chat and the player list.
- The **launcher** starts a background helper for every session. The helper joins the server,
  downloads the server's mods, starts the game and then carries the game's traffic. Between the
  game and the helper it uses two local ports, `4444` and `4445`.
- The **server** listens on one port, TCP and UDP together (`30814` unless the host changed it).
  Everything reliable — joins, chat, spawns, damage — goes over a TLS 1.3 connection. Car
  positions go over UDP, each datagram signed with a key from that TLS session, so nobody can fake
  them.

The launcher, the mod and the server agree on a protocol version when they connect. A launcher
that is too old is told so and offered an update before anything else happens.

## Accounts and the server list

The launcher and the servers also talk to NodeMP's own service at `api.nodemp.com`. It keeps
accounts, signs you in through the browser and lists the public servers. When you join a server,
the launcher asks it for a one-time ticket, the server checks that ticket, and that is how the
server knows the name you play under is really yours. A server without a key from
[nodemp.com](https://nodemp.com) works too; it just isn't listed and takes names as the launcher
sends them.

## Who simulates a car

BeamNG.drive's soft-body physics runs on the players' PCs, not on the server. For every car one
player's game is in charge:

- the car you drive is simulated by your game, and your game sends its state to everyone;
- an empty car is simulated by one of the players, chosen by the server;
- everybody else's game receives the state and steers its copy of the car to follow it.

The server decides who is in charge of which car, hands a car over when its driver leaves or goes
quiet, and passes the state on to everyone else. It never runs the physics itself.

## What travels, and how often

| What | Rate | Notes |
|---|---|---|
| Position, rotation, speed, steering and pedals | 60 times a second | Over UDP. The server gathers them and sends each player one packet every 4 ms. |
| Lights, gauges, other inputs, controllers | up to 30 a second | Only when something changed. |
| Deformation (node positions) | up to 15 a second | Only while the body is moving. |
| Engine and gearbox | up to 10 a second | Only when something changed. |
| Fire | up to 4 a second | |
| Where your camera is (free camera, first person) | 30 a second | Shown to others as a small marker with your name. |

A parked car costs next to nothing: apart from the position, everything is sent only when it
changes. Spawns, part changes, paint, seat changes and damage go over TCP, and the server keeps the
latest copy of each so a player who joins later sees every car as it is now.

## When a connection drops

A short drop doesn't end your session. If the server hears nothing from you for 8 seconds, the
other players see your car stop and turn see-through, with a *LAG* mark by your name. Your launcher
reconnects on its own, and in the game you see *Connection lost, reconnecting…* with a countdown.
If it gets back within 30 seconds (the host can change both numbers), you carry on where you were,
with the same cars. Only after that does the server let you go.

More on this, and on VPNs: [VPN and bad connections](/players/vpn/).

## Mods

A server keeps its mods (custom cars, maps) as zip files. Before the game starts, the launcher
compares that list with what it already has and downloads only the missing ones. They stay in the
launcher's cache, so the next join to that server downloads nothing, and the game loads them only
while you're on that server.

## Plugins

A server does the basics on its own: the session, the cars, the chat, the mods. Everything else is
a plugin:

- **Resources** are folders of Lua code on the server. A resource can also carry scripts that the
  server sends to every player's game when they join.
- **Native modules** are libraries written in C or C++ for the work that has to be fast.

All of a server's Lua code runs on one thread, one handler at a time, so plugin authors never have
to think about locks. → [Plugin development](/plugins/overview/)
