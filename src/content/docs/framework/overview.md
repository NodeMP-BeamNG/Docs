---
title: Framework overview (new stack)
description: The backend-less, alt:V-style NodeMP framework - server core, TLS transport, native SDK, Lua resources, and the trust-on-first-use launcher.
---

This documents the **new NodeMP framework stack** (repos `server`, `launcher`, `client`, `sdk`,
`examples`). It is **backend-less**: there is no central accounts service, join-ticket flow, or
server browser. Players connect directly to a `host:port` over TLS 1.3 with trust-on-first-use
certificate pinning. The design is alt:V-style: a small, fast core plus an SDK, with everything
optional shipped as a **Lua resource** or a **native module**.

## The parts

- **Server** (`server`, C++20) - the core. Boost.Asio networking, a binary wire protocol
  (`include/net/Protocol.h`), authoritative vehicle state (`include/game/VehicleRegistry.h`:
  seats, locks, tags, damage versioning + resync, authority modes L/S/R), a native plugin host
  (`include/plugin/PluginFramework.h`) and the Lua resource runtime. It streams each resource's
  client Lua to players, obfuscates delivered Lua with a vendored Prometheus (BeamNG-safe step
  whitelist, fail-closed), and can ChaCha20-encrypt content mods.
- **Launcher** (`launcher`, C++) - a stripped BeamMP-Launcher fork with no login, backend or
  self-update. It bridges the in-game mod (loopback TCP 4444 command / 4445 relay) to a server
  over TLS 1.3, pinning the server certificate SHA-256 per `host:port` on first connect
  (`cache/known_servers.json`, pre-seed via `--server-fp` / `Launcher.cfg` `ServerFingerprint`),
  and downloads (and optionally decrypts) content mods into `mods/multiplayer`.
- **Client mod** (`client`, Lua) - the in-game half: a headless framework (no accounts, chat,
  HUD or server browser) with the vehicle synchronization, a local settings panel
  (`ui/modModules/nodesettings`, backed by `MPSettingsGE.lua`), and the `node` client-scripting
  API (see below).
- **SDK** (`sdk`, C) - `node.h`, the native-module ABI.
- **Examples** (`examples`) - reference Lua resources and native modules.

## Wire protocol (v12)

Every packet is a `(Category, SubType)` pair. TCP frames are
`[u32 length][cat][sub][flags][body]`; the launcher<->server hop is TLS 1.3 and may zlib-compress
(`FlagCompressed`); `StatePacket::Pos` and `HeadPose` travel over UDP with an HMAC auth trailer.
Categories: `Handshake` (0x01), `Session` (0x02), `Content` (0x03), `Vehicle` (0x04),
`State` (0x05), `Event` (0x06), `Command` (0x07), `Module` (0x08).

The high-rate `StatePacket::Pos` (0x01) is a fixed 72-byte binary snapshot: position, rotation
quaternion, linear + angular velocity as f32, plus the five driving controls
(steering/throttle/brake/clutch/parkingbrake) and gear folded in at position rate, a timer, ping,
sequence and a flags byte. `StatePacket::Inputs` (0x02) carries only the non-core input axes.
Damage is persistent: the authority reports a `DamageStat` counter and uploads a `DamageBlob`, so
a damaged vehicle spawns already-damaged and late joiners get a full `Resync`. Vehicle
`ConfigHash` reconciliation silently auto-resyncs a client whose config marker drifts.

## Native modules (the SDK)

A native module is a shared library (`.dll`/`.so`) in the server's `modules/` folder that exports:

```c
NODE_EXPORT int  node_plugin_init(const NodeApi* api);  /* 0 = ok, nonzero = refuse load */
NODE_EXPORT void node_plugin_shutdown(void);
```

`NodeApi` (in `sdk/node.h`) groups the capabilities: console, players, vehicles, events, timers,
HTTP, background jobs, and a typed module<->client binary channel. Modules observe events
(`playerJoin`, `serverTick`, `vehicleSpawned/Deleted/DamageChanged/TagsChanged/LockChanged`) and
can **veto** cancellable requests (`onPlayerConnectRequest`, `onVehicleSpawn/Enter/Exit/Edit/
Paint/Coupler/Trigger/NodeGrabRequest`). All callbacks run on a single framework worker thread.
See `examples/plugin-example` and `examples/dimensions-module`.

## Lua resources

A resource is a folder with a `resource.toml` and `server/main.lua` (server logic) and/or
`client/main.lua` + `client/lua/**` (delivered to every player on join). The server streams the
client files as typed `Content::ResourceChunk` packets; the mod runs them with full game access
(alt:V-style, no sandbox - server code is trusted) and tears them down on leave. Server Lua uses
the same event/registration model as the native SDK. See `examples/` (`chat`, `dimensions`,
`freeroam-example`, `gatekeeper-example`, `seat-demo`, `vehicle-cleanup`, `devapi-example`).

## Client scripting (the `node` table)

Inside the game mod, client scripts use the global `node` table:

| Function | Meaning |
|---|---|
| `node.on(name, fn, source?)` | subscribe to a server/local event (`fn(data)`, pcall-guarded) |
| `node.off(name, source?)` | unsubscribe |
| `node.emitServer(name, data)` | send an event to the server |
| `node.emitLocal(name, data)` | dispatch locally |
| `node.log(msg)` | logger |

Local user scripts drop into `lua/ge/extensions/node/` (auto-loaded GE extensions); server
resources arrive as `resources/<name>/client/*.lua`. Vehicles are identified by a single
server-assigned integer `globalID`; per-vehicle control mode is `L` (local driver), `S` (sync
authority) or `R` (remote), driven entirely by server packets. `MPVehicleGE` exposes the
scripter lookups (`getGameVehicleID`, `getVehicleOccupants`, `requestEnterVehicle`,
`enterAsPassenger`, `getVehicleTags`, ...).

## What is intentionally gone

Compared with the earlier NodeMP, the framework drops accounts/login, the central server browser,
join tickets, in-game chat/HUD, roles/avatars and launcher self-update. Those were backend-coupled;
the framework is self-contained. A server that wants chat, a welcome banner, roleplay economy, or a
scoreboard ships it as a resource or module (see `examples`).
