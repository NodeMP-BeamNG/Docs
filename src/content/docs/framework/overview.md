---
title: Framework overview
description: How the NodeMP stack fits together — server core, the directory's role, TLS transport, three plugin runtimes, native modules and the relay.
---

NodeMP is a small server core plus a plugin platform. The core — `Node-Server`, one process on
one TCP and UDP port, configured by `server.toml` — does what every server needs: accepts
players, verifies who they are, owns the vehicle registry (seats, authority, damage, tags, locks),
delivers content and streams client scripts. Everything else — chat, rules, economy, parallel
worlds — is a plugin: a **resource** (Lua or JavaScript) or a **native module** (C or C++). This
page is the map; the [plugin overview](/plugins/overview/) is where you start writing one. The
parts around the server (launcher, helper, client mod, directory) are introduced in
[What is NodeMP](/introduction/what-is-nodemp/).

## The directory's role

- **Listing.** With `[Directory] Url`, `HostId` and `HostSecret` set, the server opens a host
  session and sends a beacon on the interval the directory asks for (15 s by default); the
  launcher's list is built from those beacons. `Public = false` keeps announcing, so players who
  have the address see the server as online, but hides it from the list.
- **Identity.** The launcher gets a one-shot join ticket for the server it is about to join and
  sends it right after the handshake. The server redeems the ticket and takes the verified name
  from the answer: the account's username, or the guest name the directory minted.
  `TestDrive = false` refuses guests and ticket-less joins. `RedeemFailOpen = true` admits
  players unverified while the directory is unreachable — only on a server that also allows
  Test Drive; the default refuses them.
- **Releases.** The launcher asks the directory which client mod build is current and installs it
  before every join.

A server can run without any of this. Leave `[Directory] Url` empty and the server is not listed,
verifies nobody and takes names as the launcher sends them — but it still runs, and anyone who
knows its address can join through the launcher's **Direct Connect** form (`host:port`, or
`[addr]:port` for IPv6). Direct Connect also works for listed and for `Public = false` servers.

## Transport

```
client mod   <-- loopback TCP 4444 (commands) + 4445 (game traffic) -->  helper
helper       <-- TLS 1.3 over TCP + UDP (position, head pose)       -->  Node-Server
Node-Server  <-- HTTPS                                              -->  directory
```

Every packet is a typed `(Category, SubType)` frame; the launcher and the server must speak the
same wire protocol version (`v21`) and refuse each other otherwise. The server generates a
self-signed TLS certificate on first start and logs its SHA-256 fingerprint; a listed server's
fingerprint reaches the launcher through the directory, and a direct connection pins it on first
use. Of the game traffic, only `State::Pos` and `State::HeadPose` travel over UDP, each with an
HMAC trailer. Details:
[How synchronization works](/framework/sync/) and the [wire protocol](/plugins/protocol/).

## Three runtimes

1. **Server Lua or JavaScript.** Each resource's `server/main.lua` gets its own Lua state with the
   `node` API: `node.on("playerJoined", fn)`, `node.players`, `node.vehicles`, `Player` and
   `Vehicle` objects, `node.storage`, `node.http`, timers and coroutines. Every handler of every
   resource runs on one worker thread, so plugins never race each other. JavaScript resources
   (`type = "js"`) need the `js-host` module and get the same API in JavaScript spelling.
   Reference: [API reference](/plugins/api/) (Lua API and events).
2. **Streamed client Lua.** Files under a resource's `client/` folder are pushed to every player
   after content sync as `Content::ResourceChunk` packets and run inside the game with full game
   access — no sandbox, because server code is trusted. Game-engine files become BeamNG extensions
   (a returned table with `onUpdate` ticks every frame); files under `lua/vehicle/` are injected
   into the vehicle VMs. They use the global `node` table: `node.on`, `node.off`,
   `node.emitServer`, `node.emitLocal`, `node.log`, `node.onModule`, `node.offModule`,
   `node.sendModule`, `node.requestVehicleTrigger`, `node.requestNodeGrab`. The client mod unloads
   game-engine scripts when you leave; vehicle-side scripts cannot be unloaded cleanly, so ship
   vehicle Lua as content instead. Client Lua is obfuscated with Prometheus before delivery unless
   `[Resources] Obfuscate = false` or the resource sets `obfuscation = "none"`.
3. **The mod SDK (`NodeMP.*`).** Locally installed BeamNG mods talk to the client mod through the
   global `NodeMP` table (`NodeMP.isInSession()`, `NodeMP.getAccount()`, `NodeMP.players`,
   `NodeMP.vehicles`, `NodeMP.chat`, `NodeMP.events`, `NodeMP.keys`), with a per-vehicle subset
   in the vehicle VM. Reference: [Client scripting](/plugins/client-scripting/).

## Resource folder layout

```
resources/
└── demo-numbers/
    ├── resource.toml
    ├── server/
    │   └── main.lua        # server half: the node API
    └── client/
        └── main.lua        # streamed to every player
```

```toml
name = "demo-numbers"
version = "1.0"
type = "lua"                 # or "js" (needs the js-host module)

[server]
main = "server/main.lua"     # the default

[client]
files = ["main.lua"]         # default: every .lua under client/
obfuscation = "none"         # none | light | medium | strong; default light
```

`resources/` is scanned once at startup; a folder with neither `server/main.lua` nor client
scripts is skipped. `node.resources.reload(name)` reloads one resource without a restart. Paths
in `resource.toml` cannot leave the resource folder.

## Native modules

A module is a shared library in `modules/` next to the server executable that exports
`node_plugin_abi`, `node_plugin_init(const NodeApi*)` and `node_plugin_shutdown`. `NodeApi`
(declared in `node.h`) offers the Lua API's capabilities plus what only native code can do:
register a language host for a new resource type (`js-host`), or run a relay filter inline on the
network thread (`plugin-example` shows one; `dimensions` uses the core's visibility groups
instead) — Lua's `node.relay.filter` runs on the worker with cached verdicts.
Modules load before
resources, so a language host is in place before the first resource is scanned. Reference:
[API reference](/plugins/api/) (C ABI).

## Content

Zips in `content/` (`[Content] Folder`) are BeamNG mods the server distributes to joining players;
the helper compares hashes and downloads what is missing into `mods/multiplayer/`. With
`[Content] Encrypt = true` they travel ChaCha20-encrypted with a per-startup key and the helper
deletes the decrypted copies when the session ends. See [Resources and content](/hosting/resources/).

## The relay

Client-emitted events are server-terminal: `node.emitServer("name", data)` reaches server
resources and nothing else. Anything of YOUR resource's that must reach other players goes through
your resource. The client mod's own peer features do not need one: fire (`State::Fire`), the
synced grabber (`Vehicle::Grab`), in-world triggers (`Vehicle::TriggerReq`) and each player's
vehicle policy (`Session::Policy`: lock mode, trigger and grab permissions) are typed packets the
core relays and enforces itself since wire v21; chat is its own `chat` resource. A
relay filter (`node.relay.filter` in Lua, the `relayRequest` hook) can veto every relayed packet per
recipient. Parallel worlds do not need one: `dimensions` puts players and vehicles into the core's
visibility groups (`Player:setGroup`, `Vehicle:setGroup`), and the core never relays between two
groups. Binary payloads use the module
channel, keyed by a `u32` channel id: `node.modules.send` on the server, `node.sendModule` and
`node.onModule` in client scripts.
