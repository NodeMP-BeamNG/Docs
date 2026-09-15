---
title: Differences from BeamMP
description: How NodeMP differs from BeamMP in accounts, listing, plugins, transport and content — and why a BeamMP server cannot move over as it is.
---

This page is for people who know BeamMP. NodeMP shares ancestry with it: the game server and the
connection helper started as forks of BeamMP code under the AGPL-3.0-or-later licence, and the client mod's
vehicle synchronization is ported from BeamMP's. Everything around that core is different, and the
two networks do not interoperate: the NodeMP launcher joins only NodeMP servers, and a NodeMP
server accepts only the NodeMP launcher.

## Side by side

| Area | NodeMP | BeamMP |
|---|---|---|
| Accounts | A NodeMP account, created in the launcher or at `https://nodemp.com` and used from the launcher, or a *Test Drive* guest session when the server allows it. The server verifies who you are through a one-shot join ticket issued by the directory. | A BeamMP forum account, signed in through the BeamMP launcher. |
| Server listing | A *server key* (Host ID + Host secret), created once per server on the `/hosts` page of nodemp.com and written to `[Directory]` in `server.toml`. The server opens a session with the directory and sends a beacon to stay listed. | An `AuthKey` from the BeamMP keymaster, written to `ServerConfig.toml`. |
| Configuration | `server.toml` with eight sections - `[General]`, `[Resources]`, `[Content]`, `[Network]`, `[Experimental]`, `[Directory]`, `[Database]` and `[Http]`; every key also has a `NODE_*` environment variable (see [Configuration](/hosting/configuration/)). | `ServerConfig.toml` with a `[General]` section. |
| Plugins | Resources under `resources/`: Lua or JavaScript on the server with the `node` API (`node.on`, `node.players`, `node.vehicles`, `Player`, `Vehicle`, …), plus native modules in C or C++. BeamMP plugins do not run on NodeMP. | Lua plugins under `Resources/Server` with the `MP.*` API (`MP.RegisterEvent`, `MP.TriggerClientEvent`, …). |
| Client scripting | A resource ships `client/*.lua`; the server streams these files to every player on join and they run inside the game with the `node` table. Locally installed mods use the `NodeMP.*` SDK. | Client-side Lua ships inside client mod zips. |
| Transport | TLS 1.3 over TCP between the helper and the server, UDP for the position stream with an authentication trailer; every packet is a typed `(Category, SubType)` frame, wire protocol v18. The server refuses a launcher with another version. | Plain TCP and UDP with text-tagged packets. |
| Content delivery | Zips in the server's `content/` folder, hash-checked by the helper and optionally ChaCha20-encrypted on the wire (`[Content] Encrypt = true`). | Zips in `Resources/Client`, downloaded by the launcher. |
| Client Lua obfuscation | Streamed client Lua is obfuscated with Prometheus by default; each resource picks `none`, `light`, `medium` or `strong` in its `resource.toml`. | Not built in. |

## Can I run my BeamMP server on NodeMP?

No. `Node-Server` is a different program with a different configuration file, a different listing
key and a different plugin API, and it does not load `MP.*` plugins. What you can carry over:

- **Your maps and vehicles.** Put the zips in `content/`; the server distributes them to joining
  players.
- **Your plugin logic.** Port it to the `node` API. [Migrating BeamMP plugins](/plugins/migrating/)
  maps the `MP.*` calls and events to their NodeMP equivalents.
- **Your players.** They install the NodeMP launcher ([Install the launcher](/players/install/))
  and find your server in the list once it has a server key
  ([Registering your host](/hosting/registering/)).
