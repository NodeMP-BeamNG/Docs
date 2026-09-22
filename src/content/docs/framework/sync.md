---
title: How synchronization works
description: Transport hops, the packet categories of wire protocol v22, control modes, the position snapshot, seats, damage, identity, events and the relay.
---

This page follows the data through a NodeMP session on wire protocol **v21**: what travels
where, at which rate, and who is allowed to send what. Every packet is named, with its purpose, on
the [wire protocol](/plugins/protocol/) page; the byte layouts are in
`server/include/net/Protocol.h`, the normative contract, kept byte-identical in the helper.

## Transport: three hops

```
client mod (GE Lua)  <-- TCP 4444 (commands) + TCP 4445 (game traffic) -->  helper
helper               <-- TCP + TLS 1.3 + UDP                           -->  Node-Server
```

- The client mod talks to the helper over two loopback TCP channels: **4444** (commands: connect,
  quit, status, map, mod list) and **4445** (relay: all game traffic). The first frame on both is
  a per-run auth token.
- The helper owns the TLS 1.3 session with the server. For a listed server it pins the certificate
  fingerprint the directory reported; for a direct connection it pins on first use. Of the game
  traffic, only `State::Pos` and `State::HeadPose` ride UDP, each with an HMAC trailer keyed by a
  per-session token delivered once over TLS. The client mod never sees UDP or compression.
- Every TCP frame is `[u32 length][category][subtype][flags][body]`; bodies over about 400 bytes
  may be zstd-compressed on the helper–server hop only.

## Packet categories

Every packet is identified by a `(Category, SubType)` pair. Subtype names, from `Protocol.h`:

| Category | Subtypes | Names |
|---|---:|---|
| `Handshake` | 14 | `Hello`, `Welcome`, `Ping`, `Pong`, `UdpToken`, `UdpHello`, `MapInfo`, `JoinWorld`, `VerifyRequest`, `VerifyReport`, `Identity`, `IntegrityManifestRequest`, `IntegrityManifestChunk`, `IntegrityManifestDone` |
| `Session` | 7 | `Kick`, `SelfInfo`, `PlayerJoined`, `PlayerLeft`, `PlayerList`, `SessionEnd`, `ClientId` |
| `Content` | 8 | `ModsRequest`, `ModsInfo`, `FileRequest`, `FileBegin`, `FileDeny`, `SyncDone`, `ResourceChunk`, `ResourceDone` |
| `Vehicle` | 28 | `SpawnReq`, `Spawn`, `SpawnDeny`, `Edit`, `Delete`, `Reset`, `Coupler`, `Paint`, `Camera`, `SeatClaim`, `SeatVerdict`, `Driver`, `SeatFree`, `Authority`, `AuthRevoke`, `PlayerVehicle`, `Resync`, `ResyncReq`, `Trigger`, `DamageStat`, `DamageBlob`, `CouplerSet`, `Tag`, `Lock`, `ConfigHash`, `TriggerReq`, `NodeGrab`, `NodeGrabSet` |
| `State` | 9 | `Pos`, `Inputs`, `Electrics`, `Nodes`, `BreakGroups`, `Controller`, `Powertrain`, `Engine`, `HeadPose` |
| `Event` | 1 | `Event` |
| `Command` | 18 | `Keepalive`, `VersionReq`, `Version`, `Connect`, `Quit`, `StatusReq`, `Status`, `PingReq`, `Ping`, `MapReq`, `Map`, `ModLoaded`, `ModList`, `ConnectFailed`, `Prompt`, `PromptAnswer`, `Auth`, `Server` |
| `Module` | 1 | `Data` |

`Command` packets never leave the machine; `Handshake` and the content-control half of `Content`
end at the helper; everything else is relayed to the game.

## Joining: handshake and identity

The helper sends `Hello` (protocol version and requested name) and then, always, `Identity` with
the join ticket — empty when there is none. A version mismatch is refused with a reason naming
both versions; `VerifyRequest`/`VerifyReport` then check the game install at the strictness of
`[General] VerifyGame`, before any content is downloaded. At the `strict` level (v18) the request
also names the server's reference manifest by its SHA-256 id; a helper without that manifest in
its cache fetches it in between (`IntegrityManifestRequest`, 32 KiB `IntegrityManifestChunk`
frames, `IntegrityManifestDone`), and its report names the manifest it checked against. A
`VerifyRequest` may come again mid-session when a resource calls `player:verify`. Identity is decided last, because a
redeemed ticket is spent: a server with `[Directory]` configured redeems it and takes the verified
name — the account's username or the guest name the directory minted — in place of what `Hello`
asked for. Names are sanitized either way (control characters stripped, 24-byte UTF-8-safe cap,
`#<id>` suffix on duplicates; no name at all becomes `Player<id>`) and broadcast as a
`player:identity` event, which is what `NodeMP.getAccount()` reads on the client.

## Who streams a vehicle: control modes L/S/R

| Mode | Meaning | What this client sends for it |
|---|---|---|
| `L` | local driver | everything, controls folded into the snapshot |
| `S` | sync authority (keeper of an empty or foreign car) | everything except controls |
| `R` | remote ghost | nothing; inbound state overwrites it, local inputs are ghost-suppressed |

The server assigns driver and authority (`Driver`, `Authority`, `AuthRevoke` broadcasts), each
stamped with a per-vehicle **seat epoch** so stale packets are dropped and a gap triggers a
resync. The authority's `Pos` stream doubles as its liveness heartbeat: a silent authority is
released after a grace period so another client can take the car over.

The client scheduler polls synced vehicles at fixed rates: **position 60 Hz**, inputs 30,
electrics 30, controllers 30, nodes and break groups 15, powertrain 10, fire 4, plus an optional
full-state snapshot at 0.5 Hz (off by default). All channels except position are diff-gated, so
an idle car sends almost nothing.

## Position: the only binary state channel

`State::Pos` is a fixed **56-byte snapshot** (wire v23; 72 bytes of `f32` up to v22): position as
`f32`, the orientation quaternion as three `i16` ("smallest three" -- the largest component is
dropped and rebuilt from the other three), linear velocity (1/128 m/s), angular velocity
(1/1024 rad/s) and the **sender's own acceleration** (1/256 m/s²) as `i16` fixed point, the five
driving controls (steering, throttle, brake, clutch, parking brake) quantized to single bytes, the
gear, the sender's timer, ping, a sequence counter and a flags byte (paused, controls valid,
teleport, velocity step, the dropped quaternion index, acceleration valid). It rides UDP with a
per-datagram HMAC and an anti-replay window on the sequence.

The acceleration is a least-squares slope of the sender's velocity over the last 0.1 s of its
2000 Hz physics steps. The receiver used to difference two consecutive 60 Hz velocities for it,
which amplifies the sample noise by 2/h; integrating a measured value instead is what lets the
fixed-point fields be this compact -- on the offline harness the layout is indistinguishable from
`f32` in every scenario, while the acceleration itself improves pedal work and parking.

The receiver applies it in the vehicle VM with the client mod's prediction math:
extrapolation toward a dead-reckoned target, PD-style velocity corrections and a velocity-scaled
teleport for large errors. A car resting on a moving body (a flatbed, another car's roof) is
corrected by velocity only, so the spring cannot load up and launch it; a sender-detected teleport
(reset, recover) makes receivers snap instead. Correction strength and the teleport threshold are
player-tunable in the mod's settings; remote cars are fully simulated at every distance.

The server can add distance-based interest management: with `[Network] StateRelayRadius` set in
metres, `Pos` reaches players within half that radius at full rate, players in the outer half at
half rate, and nobody beyond it. The default `0` relays every snapshot to everyone.

## Everything else per vehicle

- **Secondary channels** (`u32 gid + JSON` over TCP): electrics, nodes and break groups,
  controllers, powertrain and engine. The server caches the last body per (vehicle, subtype) and
  replays it to joiners, so a late joiner sees correct lights and damage.
- **Lifecycle**: `SpawnReq -> Spawn` (the server assigns the global id and caches the config);
  `Edit`, `Reset` and `Paint` are accepted only from the current driver; `Delete` from the driver
  or the spawner. `SpawnDeny` carries a plugin's veto reason. Clients report a `ConfigHash` of the config they hold; a
  mismatch triggers a silent, targeted resync.
- **Damage**: the authority reports a damage counter (`DamageStat`) and, once it settles, uploads
  a deformation blob (`DamageBlob`). Joiners spawn damaged cars already damaged, in one spawn.
- **Seats**: a transactional `SeatClaim -> SeatVerdict` pair plus epoch-stamped broadcasts.
  Claiming an occupied driver seat grants a passenger seat; claiming a new car while the registry
  still thinks you drive another one frees the old wheel first. `PlayerVehicle` tells everyone
  which seat a player occupies.
- **Tags and locks**: plugins attach key–value tags to vehicles (`Tag`) and lock them (`Lock`:
  `unlocked`, `driver-only`, `locked`, with a whitelist). Locks gate client seat claims only;
  server-driven seating bypasses them. Both are replayed to joiners after the vehicle's `Spawn`.
- **Triggers**: `Trigger` (doors, couplers) is echoed to every client including the sender;
  `TriggerReq` asks the vehicle's sync authority to run a controller call and is never cached.

## Events, the relay and the module channel

Client-emitted `Event` packets are **server-terminal**: they reach server resources only. Wire
event names are `<domain>:<verb>` in lowercase (`chat:send`, `vehicle:fire`, `player:policy`,
`modules:request`); camelCase names (`playerJoined`, `vehicleSpawnRequest`) are server-side hooks
that never cross the wire. The client mod's own peer features do not ride events at all
since wire v21: fire is `State::Fire`, the synced grabber is `Vehicle::Grab`, in-world triggers
go through `Vehicle::TriggerReq`, and a player's vehicle policy (lock mode, trigger and grab
permissions for its cars) is `Session::Policy` — all relayed and enforced by the core, no
resource needed. Chat is the `chat` resource. `Module::Data` is the binary counterpart of `Event`: arbitrary bytes on a `u32` channel
id, server-terminal from the client, targeted or relay-filtered broadcast from the server.

## Node grabber (experimental)

The client mod's synced grabber is off by default (`nodempSyncedGrabber` in the mod's settings).
When on, Ctrl+drag picks a node and streams `Vehicle::Grab` frames at up to 60 Hz; the core
relays them verbatim to every other player and drops those aimed at a car whose spawner cleared
the grab bit of its `Session::Policy`; a player who has turned off `nodempAllowNodeGrab` also
ignores grabs on their own cars. Every client — the grabber included — runs the same spring on its copy of the car, so the
deformation is identical for everyone. The wire also has a typed, server-arbitrated path:
`node.requestNodeGrab` in a client script sends `Vehicle::NodeGrab`, which the server forwards as
`NodeGrabSet` to the vehicle's **sync authority** only when `[Experimental] NodeGrab = true` and a
resource allows the request through the fail-closed `vehicleNodeGrabRequest` hook.

## Head poses

Every client streams its camera pose (`HeadPose`: 33 bytes — player id, position, quaternion,
freecam flag) at 30 Hz over UDP. The client mod renders a marker and the player's name for players
in free camera, interpolated on the receiver. Poses are ephemeral: never cached, never replayed,
expired after 3 s of silence. The server drops a pose whose player id is not the sender's.
