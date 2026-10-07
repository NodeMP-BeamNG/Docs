---
title: How synchronization works
description: Network transport, packet structure of wire protocol v23, control modes, position snapshots, damage, and event relaying.
---

In BeamNG.drive, soft-body physics is computed locally on each player's machine. The NodeMP server does not simulate physics itself; instead, it acts as an authoritative coordinator: validating permissions, managing vehicle spawning, and relaying coordinates, velocities, and deformation states between all connected participants.

This page explains how data travels under network protocol **v23**: which communication channels are used, update rates, and how vehicle synchronization operates.

## Transport: three hops

Data exchange is split into three distinct stages:

```
Client Mod (BeamNG Lua) <-- TCP (commands & relay) --> Launcher
Launcher                <-- TCP + TLS 1.3 + UDP     --> Node-Server
```

- **Mod ↔ Launcher**: The client mod inside the game communicates with the launcher over local loopback TCP connections (one for control commands like status and mod lists, and another for game traffic relaying).
- **Launcher ↔ Server**: The launcher maintains a single secure TLS 1.3 connection over TCP, while high-frequency position and camera streams travel over UDP. UDP datagrams are protected with an HMAC signature using a session key negotiated via TLS.
- **Traffic Compression**: TCP frames carry typed binary headers. Large payloads can be compressed with zstd on the link between the launcher and the server.

## Packet categories

Every network packet is uniquely identified by a `(Category, SubType)` pair. Category and subtype names correspond to `Protocol.h`:

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

Packets in the `Command` category are strictly local to the player's computer; `Handshake` and file delivery are handled by the launcher, while the rest of the game traffic is relayed to the BeamNG client mod.

## Joining: handshake and identity

When connecting, the launcher sends a `Hello` packet stating its protocol version, followed by an `Identity` packet containing the session ticket. If the protocol versions differ, the server terminates the join immediately with an informative message.

Before mod downloads begin, the server triggers game file verification via `VerifyRequest` according to the level configured in `[General] VerifyGame`. If strict mode (`strict`) is active, files are compared against a reference manifest, which the launcher can download from the server on the fly (`IntegrityManifestRequest`) if it is not already cached.

Once integrity is verified and required mods are downloaded, the server redeems the join ticket through the NodeMP directory, assigning either the verified account name or an anonymous Test Drive guest handle.

## Who streams a vehicle: control modes L/S/R

Each vehicle in the session is managed under one of three states:

| Mode | Meaning | What this client sends |
|---|---|---|
| `L` (Local) | Your car (you are in the driver's seat) | Full stream: coordinates, velocity, control inputs, and telemetry |
| `S` (Sync) | Unoccupied car maintained by your client | Position, velocity, and damage states (no driving inputs) |
| `R` (Remote) | Another player's car | Nothing; local inputs are ignored, and position updates arrive from the network |

The player behind the wheel is the authoritative source for that vehicle. If the driver exits, the vehicle shifts to mode `S` — another client takes over temporary custody to keep it simulated in the world. The server tracks seat transitions and seat epochs, dropping stale packets.

The client mod polls subsystems at tailored frequencies:
- **Position and orientation**: 60 Hz (streamed continuously);
- **Controls, electrics, and controllers**: 30 Hz;
- **Chassis nodes and break groups**: 15 Hz;
- **Powertrain and engine**: 10 Hz;
- **Fire**: 4 Hz.

Except for positions, all channels only transmit when changes occur — so parked vehicles generate negligible network traffic.

## Position: the only binary state channel

The `State::Pos` packet is a compact **78-byte binary snapshot**: it packs 3D coordinates, orientation quaternions, linear and angular velocities, steering and pedal positions, gear selection, ping, and status flags (pause, teleport, reset).

Position packets are sent over UDP. On the receiving end, the client mod interpolates motion using dead-reckoning and PD-style velocity correction:
- ping fluctuations are smoothed to maintain fluid motion;
- vehicles carried on flatbed tow trucks or trailers are velocity-corrected without spring bounce artifacts;
- vehicle resets or recoveries instantly snap to their new coordinates without stretching geometry.

Servers can also enable distance-based interest management via `[Network] StateRelayRadius`, delivering full update rates to nearby players and reducing frequency for distant vehicles.

## Everything else per vehicle

Beyond continuous coordinates, other vehicle subsystems are synchronized:

- **Spawning and removal**: Creation requests (`SpawnReq`) are assigned a global ID by the server. Only the driver or spawner is permitted to edit colors, swap parts, or delete the car.
- **Damage and deformation**: The authoritative client reports damage counters (`DamageStat`), uploading mesh deformation data (`DamageBlob`) after major crashes. Joining players spawn wrecked vehicles pre-damaged in a single pass.
- **Seats and occupants**: Seating arrangements are negotiated via `SeatClaim` and `SeatVerdict`. If the driver's seat is already taken, players join as passengers.
- **Tags and locks**: Server plugins can attach key-value tags (`Tag`) or restrict access (`Lock`), such as locking doors to unauthorized players.
- **Doors and latches**: Door openings, tailgates, and interactive couplers are broadcast to all clients via `Trigger` events.

## Events, the relay and the module channel

Client-emitted `Event` packets are **server-terminal**: they are routed exclusively to server resources. They are named in lowercase colon format (`chat:send`, `player:policy`).

Core engine systems (node grabbing, fires, vehicle locks) travel over dedicated binary packets rather than scripting events. For custom binary communication between server plugins and game scripts, the `Module::Data` channel is available.

## Node grabber (experimental)

Synchronized node grabbing (holding Ctrl to drag vehicle parts with the mouse) is disabled by default. When enabled via `nodempSyncedGrabber`, node movements are streamed as `Vehicle::Grab` frames at up to 60 Hz. The server relays these forces to all clients, allowing vehicle bodies to deform realistically for everyone.

Players can disable node grab permissions on their own vehicles in privacy settings.

## Head poses

In free camera mode or first-person view, clients broadcast their camera orientation (`HeadPose`, 33 bytes) at 30 Hz over UDP. The client mod renders floating player nametags with smooth interpolation. If updates pause for more than 3 seconds, the indicator fades out automatically.
