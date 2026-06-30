---
title: What is NodeMP
description: An overview of NodeMP — a BeamMP-compatible multiplayer system for BeamNG.drive and the four parts it is built from.
---

NodeMP is a multiplayer system for [BeamNG.drive](https://www.beamng.com/) that lets many
players share the same world — driving, crashing, and spawning vehicles together. It is
designed to be **BeamMP-compatible**, so existing BeamMP server plugins run on a NodeMP
server with little or no change.

NodeMP is made of four parts. Each one is a separate program, and together they cover the
whole journey from launching the game to syncing vehicles in a live session.

## The four parts

- **Launcher** — a desktop app (C++) that you run before BeamNG. It signs you in against the
  backend, keeps the in-game mod up to date, and proxies your connection to game servers.
- **Mod** — the in-game add-on (Lua, with a Vue/Angular UI) that runs inside BeamNG.drive.
  It adds the Multiplayer screen and server browser, in-game chat, the player list,
  nametags, and the vehicle synchronization that keeps everyone's cars in step.
- **Server** — the game server (C++) that hosts a session. It accepts player connections,
  relays vehicle and chat traffic, and runs server-side Lua plugins (including BeamMP ones).
- **Backend** — the central API (Go) for the whole network: accounts and login, one-time
  join tickets, the public server list, host registration, and release metadata.

## How they fit together

When you start the launcher it signs in to the backend and downloads the current mod build.
Inside BeamNG you open **Multiplayer**, where the mod shows the server list (provided by the
backend) and lets you connect. The launcher fetches a single-use *join ticket* from the
backend, hands it to the chosen game server, and proxies the session. The game server checks
that ticket with the backend, then streams the world to your mod for the rest of the session.

Server owners run the **server** program and register their host with the **backend** so it
appears in the public list; the backend keeps that listing fresh through a periodic *beacon*.

## BeamMP compatibility

A core goal of NodeMP is to be a drop-in home for the BeamMP ecosystem. Server-side BeamMP
Lua plugins use the same global API (`MP`, `Util`, `FS`, `Http`) and event model on NodeMP.
See [BeamMP compatibility](/introduction/beammp-compatibility/) for exactly what is supported
and the few differences to know about.

## Next steps

- Players: start with [Install the launcher](/players/install/) and then
  [Join a server](/players/join/).
- Server owners: head to the [hosting quick start](/hosting/quick-start/).
- New to the terminology? The [glossary](/reference/glossary/) defines the key terms.
