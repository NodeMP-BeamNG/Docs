---
title: Glossary
description: Short definitions of the key NodeMP terms — launcher, mod, host, backend, sync-owner, join ticket, host secret, dimension, presence, and beacon.
---

A quick reference for the terms used throughout these docs. For how the pieces fit together,
see [What is NodeMP](/introduction/what-is-nodemp/).

| Term | Definition |
|---|---|
| **Launcher** | The desktop app you run alongside BeamNG that signs you in, keeps the in-game mod updated, and proxies your connection to game servers. |
| **Mod** | The in-game BeamNG add-on (Lua, with a Vue/Angular UI) that adds the Multiplayer screen, chat, player list, nametags, and vehicle synchronization. |
| **Host** | A registered game server — its owner and machine — that can appear in the public server list. |
| **Backend** | The central API for the network: accounts and login, join tickets, the public server list, host registration, and release metadata. |
| **Sync-owner** | The single connected client currently responsible for syncing a given vehicle; the server reassigns it if that client leaves. |
| **Join ticket** | A single-use token the launcher fetches from the backend and hands to a server to prove you're allowed to join. |
| **Host secret** | The secret credential a server presents (together with its host id) to open its authenticated session with the backend. |
| **Dimension** | A parallel world on the same map; players in different dimensions don't see or collide with each other. Off by default. |
| **Presence** | A host's live "online" record that powers the public server browser; kept fresh by the beacon and expiring after a short time-to-live. |
| **Beacon** | The periodic update a running server sends to the backend to stay listed in the server browser. |
