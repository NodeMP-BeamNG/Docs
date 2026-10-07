---
title: Framework overview
description: How the NodeMP stack fits together — server core, the directory's role, TLS transport, three plugin runtimes, native modules and the relay.
---

NodeMP is designed around a modular architecture: a lightweight, high-performance server core paired with an open plugin system.

The core (`Node-Server`) is a single process listening on one TCP and UDP port (`30814` by default, configured via `server.toml`). It manages the multiplayer fundamentals: player connections, vehicle state relaying (positions, authority, damage, and ownership locks), mod distribution, and streaming client scripts.

All custom game mechanics — chat, economy, custom game modes, and administration — are built as plugins: script resources in Lua or JavaScript, or native modules in C or C++.

## The directory's role

The directory (`api.nodemp.com`) is a central web service that handles two straightforward tasks: publishing servers to the launcher's public browser via periodic heartbeats, and verifying player accounts. If the server enables guest access (`TestDrive = true`), players can also join without an account.

A server can also run completely offline or privately without the directory. In standalone mode, the server does not appear in the public list, and players connect directly by IP address using **Direct Connect** in the launcher.

## Transport

Communication between components operates on local and remote layers:

```
client mod   <-- local TCP 4444 (commands) + 4445 (traffic)  -->  helper
helper       <-- TLS 1.3 (TCP) + low-latency UDP (positions) -->  Node-Server
Node-Server  <-- HTTPS                                       -->  directory
```

Commands and reliable state travel over an encrypted TLS 1.3 TCP connection. Vehicle movement and position streams (`State::Pos`, `State::HeadPose`) travel over UDP with per-packet HMAC verification for minimum latency. Game traffic is strictly typed, and protocol compatibility is validated during handshake.

For details on vehicle simulation, see [How synchronization works](/framework/sync/).

## Three runtimes

Developers have three levels of integration:

1. **Server Lua (or JavaScript).** The foundation for server logic. Each resource runs in an isolated Lua state with the `node` API (`node.on`, `node.players`, `node.vehicles`, timers, storage). Handlers execute sequentially on a single worker thread, preventing race conditions. JavaScript resources (`type = "js"`) are supported via the `js-host` module. See [API reference](/plugins/api/).
2. **Streamed client Lua.** Scripts in a resource's `client/` directory are delivered to connecting players and run directly inside BeamNG. They can render custom UI, trigger effects, or manage client-side vehicle logic. Engine-level scripts unload cleanly when disconnecting.
3. **Locally installed mod SDK (`NodeMP.*`).** Standard BeamNG mods installed on the player's system can query multiplayer state via the global `NodeMP` table. See [Client scripting](/plugins/client-scripting/).

## Resource folder layout

Each resource lives in its own subdirectory inside `resources/`:

```
resources/
└── my-gamemode/
    ├── resource.toml
    ├── server/
    │   └── main.lua        # server logic (node API)
    └── client/
        └── main.lua        # streamed to joining players
```

The `resource.toml` manifest configures the resource:

```toml
name = "my-gamemode"
version = "1.0"
type = "lua"                 # or "js" (requires js-host)

[server]
main = "server/main.lua"

[client]
files = ["main.lua"]         # scripts sent to clients
```

Resources can be reloaded on the fly without restarting the server using `node.resources.reload(name)`.

## Native modules

For heavy workloads or low-level C/C++ access, NodeMP supports native modules — shared libraries (`.dll` or `.so`) placed in `modules/`. They allow embedding alternative language runtimes (such as `js-host`), performing computationally intensive tasks off the main thread, or intercepting network packets directly on the networking thread.

See the [API reference](/plugins/api/) (C ABI) for details.

## Content

Vehicle mods and maps are placed in `content/` as standard zip archives. The server verifies file hashes and delivers missing content to joining players automatically.

Content can also be encrypted: `[Content] Encrypt = true` encrypts archives with ChaCha20 using an ephemeral session key, and the client helper deletes local copies upon disconnect. See [Resources and content](/hosting/resources/).

## The relay

Client network events are never broadcast to all players directly. When a client emits an event using `node.emitServer`, it reaches the server first, allowing your plugin logic to validate and route the data where needed.

Standard multiplayer interactions — such as vehicle ignition, node grabs, world triggers, and vehicle permissions — are relayed and enforced by the engine automatically. If you need to separate players into isolated worlds or sessions on the same map, assign them to core visibility groups, ensuring traffic between distinct groups never crosses over.
