---
title: Wire protocol
description: The protocol between the launcher and a NodeMP server, v23 - transport, the (Category, SubType) frame, every packet by category, and the order of a join.
---

This is the protocol between the launcher's helper and a NodeMP server, wire protocol v23.
Resources never see it: they send and receive events. You meet it in the relay filter of a native
module, which is asked about packets by category and subtype, and when you read a packet capture
or the server's debug log. The page names the packets and their order; field-by-field layouts are
in `include/net/Protocol.h` of the server, which the helper carries an identical copy of.

## Transport

A session has two channels between the helper and the server: one TCP connection inside **TLS 1.3**
for everything reliable, and, once bound, one **UDP** flow for car positions.

- **UDP** carries only `State::Pos`, `State::HeadPose`, `State::PosBatch` and the handshake's
  `Ping`, `Pong`, `UdpHello` and `UdpHelloAck`. Datagrams from a client are signed with a
  per-session key that comes once over TLS (`UdpToken`) and never travels over UDP. Until UDP is
  bound, positions go over TCP.
- **Loopback.** The game talks to the helper on two local TCP ports: `4444`, the command channel,
  and `4445`, the relay. The first frame on each is `Command::Auth` with the helper's per-run token;
  a wrong token closes the connection.
- **Compression.** A compressed body carries the flag bit `FlagCompressed` and its exact unpacked
  size, so the receiver checks it against the packet's cap before unpacking. The client mod never
  sees a compressed body: the helper unpacks it.
- **Limits.** A frame may be 4 KB before `Welcome` and 1 MB after it; a UDP datagram at 10 KB.
  A vehicle config may be 768 KB, so that its join replay still fits a frame. A reference manifest
  goes in slices of `IntegrityChunkBytes` = 32 KiB.

## The frame

Every packet is named by two bytes: a **category** and a **subtype** inside it. A TCP frame is
`[u32 length][category][subtype][flags][body]`; a UDP datagram is the same without the length.
Eight categories exist:

| Category | Byte | What it covers |
|---|---|---|
| `Handshake` | `0x01` | Connection setup, liveness, UDP binding. |
| `Session` | `0x02` | Players coming and going, pushes for the whole session. |
| `Content` | `0x03` | The mod list, file downloads, the resources' client scripts. |
| `Vehicle` | `0x04` | Cars: spawning, seats, authority. |
| `State` | `0x05` | High-rate car state. |
| `Event` | `0x06` | Named events: the plugin and client-script API. |
| `Command` | `0x07` | The command channel between the game and the helper. |
| `Module` | `0x08` | Binary data between native modules and clients. |

Subtype `0` is invalid in every category, so a zeroed buffer never names a packet. Integers are
little-endian, strings are UTF-8 without a terminator, and at most one variable-length field is
not prefixed with its length: the last one, which takes the rest of the frame.

In the tables, **L** is the helper, **S** the server, **G** the client mod in the game; **T** is
the server's TCP channel, **U** its UDP channel, **R** the relay port and **CC** the command port.

## Packets by category

### Handshake (16)

| Subtype | Direction | Purpose |
|---|---|---|
| `Hello` | L→S, T | The protocol version and the name the player asked for. A version mismatch is refused with both versions named. |
| `Welcome` | S→L, T | The player's id, a resume token, the resume window and the server's capability bits. |
| `Ping` | L→S, T and U | Liveness and round-trip probe; an optional stamp comes back in `Pong`. |
| `Pong` | S→L, T and U | The answer to `Ping`. |
| `UdpToken` | S→L, T | The session's 64-byte key for signing UDP. |
| `UdpHello` | L→S, U | Binds the client's UDP address with a nonce and an HMAC. A valid one binds from any address, which is what VPN split tunnels need. |
| `MapInfo` | S→L, T | The map the game must load. |
| `JoinWorld` | L→S, T | The map is loaded; send the world. |
| `VerifyRequest` | S→L, T | How closely to check the game install (`[integrity] verify`) and, for strict, the id of the reference manifest. Also sent mid-session by `player:verify`. |
| `VerifyReport` | L→S, T | What the launcher checked and found: the level, the outcome, the number of problems and a detail line. |
| `Identity` | L→S, T | The join ticket, always right after `Hello`; empty means no ticket. |
| `IntegrityManifestRequest` | L→S, T | The launcher has no cached reference manifest with this id and asks for it. |
| `IntegrityManifestChunk` | S→L, T | One slice of the compressed manifest, in order. |
| `IntegrityManifestDone` | S→L, T | Every slice was sent; the hash the launcher checks before caching the file. |
| `Resume` | L→S, T | Sent after `Hello` instead of `Identity`, to take a broken session back within the resume window. |
| `UdpHelloAck` | S→L, U | Confirms an accepted `UdpHello` to the bound address. |

### Session (10)

| Subtype | Direction | Purpose |
|---|---|---|
| `Kick` | S→G, T and R | The connection is refused or ended, with the reason as text. |
| `SelfInfo` | S→G, T and R | The joiner's own id and final name. |
| `PlayerJoined` | S→G, T and R | Another player's id and name. |
| `PlayerLeft` | S→G, T and R | A player left. |
| `PlayerList` | S→G, T and R | The roster: count, maximum, every id and name. |
| `SessionEnd` | L→G, R | The helper tells the game the session ended, and why. |
| `ClientId` | L→G, R | The helper tells the game its player id. |
| `Policy` | G→S, T and R | The player's choices for the cars it spawns: who may get in, use the triggers, grab the nodes. |
| `Reconnecting` | L→G, R | The link broke and the helper is resuming; the attempt and the next wait. |
| `Resumed` | L→G, R | The server took the session back. |

### Content (8)

| Subtype | Direction | Purpose |
|---|---|---|
| `ModsRequest` | L→S, T | Ask for the server's mod list. |
| `ModsInfo` | S→L, T | The mod list as JSON. |
| `FileRequest` | L→S, T | Ask for one mod file by name. |
| `FileBegin` | S→L, T | The file follows: its size, then the raw bytes. |
| `FileDeny` | S→L, T | No file: unknown, protected or unreadable. |
| `SyncDone` | L→S, T | The helper has every file it needs. |
| `ResourceChunk` | S→G, T and R | One part of one resource's client scripts, as JSON. |
| `ResourceDone` | S→G, T and R | Every resource has been delivered. |

### Vehicle (30)

| Subtype | Direction | Purpose |
|---|---|---|
| `SpawnReq` | G→S, T and R | The player asks to spawn a car, or to replace the one it drives. |
| `Spawn` | S→G, T and R | A car exists: its id, spawner, damage and config. |
| `SpawnDeny` | S→one, T and R | A refused spawn, with the reason; the requester removes its local car. |
| `Edit` | G↔S, T and R | A new config (parts, tuning). |
| `Delete` | G↔S, T and R | A car is deleted. |
| `Reset` | G↔S, T and R | A car is reset to a position. |
| `Coupler` | G↔S, T and R | A coupler or door changed. |
| `Paint` | G↔S, T and R | New paints. |
| `Camera` | G↔S, T and R | Which car a player's camera follows. |
| `SeatClaim` | G→S, T and R | The player asks for the driver's seat, a passenger seat, or to leave. |
| `SeatVerdict` | S→one, T and R | The answer to a `SeatClaim`, with a reason when a plugin refused. |
| `Driver` | S→G, T and R | Who drives a car now. |
| `SeatFree` | S→G, T and R | A car's driver's seat is free. |
| `Authority` | S→G, T and R | Whose game simulates a car now. |
| `AuthRevoke` | S→one, T and R | That game no longer simulates the car. |
| `PlayerVehicle` | S→G, T and R | Which car a player is in, and in which role. |
| `Resync` | S→G, T and R | The car's full cached state again. |
| `ResyncReq` | G→S, T and R | A client asks for a resync of one car or all. |
| `Trigger` | G↔S, T and R | A trigger or door actuation, echoed to everyone. |
| `DamageStat` | G→S, T and R | The damage counter from the car's authority; stays on the server. |
| `DamageBlob` | G→S, T and R | The damage data itself, rarely; stays on the server for joins and resyncs. |
| `CouplerSet` | S→G, T and R | The server opens or closes a coupler or door. |
| `Tag` | S→G, T and R | One tag a plugin set on a car; an empty value removes it. |
| `Lock` | S→G, T and R | Who may take a seat in the car. |
| `ConfigHash` | G↔S, T and R | A checksum of the cached config; a mismatch leads to a quiet resync. |
| `TriggerReq` | G→S, T and R | Ask the car's authority to run a trigger; plugins can refuse it. |
| `NodeGrab` | G→S, T and R | The experimental node grabber's request; refused unless a plugin allows it. |
| `NodeGrabSet` | S→one, T and R | An allowed grab, forwarded to the car's authority. |
| `Grab` | G↔S, T and R | The synced node grabber's stream, relayed to the other clients. |
| `EditDeny` | S→one, T and R | A refused edit or paint, with the plugin's reason, before the rollback. |

### State (11)

| Subtype | Direction | Purpose |
|---|---|---|
| `Pos` | G↔S, U with T fallback | The car's position, rotation, speeds and driving controls, as fixed binary. |
| `Inputs` | G↔S, T | Input axes beyond the controls in `Pos`, sent on change. |
| `Electrics` | G↔S, T | Lights, signals, gauges, as a delta. |
| `Nodes` | G↔S, T | Node positions: deformation. |
| `BreakGroups` | G↔S, T | Parts that broke off. |
| `Controller` | G↔S, T | One controller call. |
| `Powertrain` | G↔S, T | Powertrain device modes. |
| `Engine` | G↔S, T | Engine and ignition state. |
| `HeadPose` | G↔S, U with T fallback | A player's camera or head pose; never cached. |
| `PosBatch` | S→G, U | Several `Pos` snapshots in one datagram. Only the server sends it. |
| `Fire` | G↔S, T | The car's fire state from its authority, cached like `Electrics`. |

### Event (1)

| Subtype | Direction | Purpose |
|---|---|---|
| `Event` | G↔S, T and R | A named event: the name and the data. `node.emitServer` on the client, `player:send` and `node.broadcast` on the server. |

### Command (23)

`Command` packets never leave the player's computer.

| Subtype | Direction | Purpose |
|---|---|---|
| `Keepalive` | G↔L, CC | Echoed back as it is. |
| `VersionReq` | G→L, CC | Ask for the helper's protocol version. |
| `Version` | L→G, CC | The protocol version. |
| `Connect` | G→L, CC | Join the server at this host and port. |
| `Quit` | G→L, CC | Leave the session. |
| `StatusReq` | G→L, CC | Ask for the session status. |
| `Status` | L→G, CC | The session status, with a detail line. |
| `PingReq` | G→L, CC | Ask for the ping to the server. |
| `Ping` | L→G, CC | The ping in milliseconds, `-1` when unknown. |
| `MapReq` | G→L, CC | Ask which map the session is on. |
| `Map` | L→G, CC | The map; empty before a session. |
| `ModLoaded` | G→L, CC | The game loaded a mod file. |
| `ModList` | L→G, CC | The mod files the session needs. |
| `ConnectFailed` | L→G, CC | The join failed, with the reason. |
| `Prompt` | L→G, CC | A question for the player. |
| `PromptAnswer` | G→L, CC | The player's yes or no. |
| `Auth` | G→L, CC and R | The loopback token; the first frame on both channels. |
| `Server` | L→G, CC | Which server the session is on, for a join the launcher started. |
| `ClockPing` | G→L, CC | The game's clock; the helper answers at once. |
| `ClockPong` | L→G, CC | The game's stamp and the helper's clock, to align the two. |
| `ArrivalStamp` | L→G, R | When the next relayed datagram reached the helper. |
| `ServerName` | L→G, CC | The server's name as the list shows it. |
| `GameCaps` | G→L, CC | What this client mod can take, sent once on connecting. |

### Module (1)

| Subtype | Direction | Purpose |
|---|---|---|
| `Data` | G↔S, T and R | Raw bytes on a channel number the module picks. `node.modules.on` and `node.modules.send` on the server. |

## The order of a join

1. The helper opens TLS and sends `Hello`, then `Identity` with the join ticket (or `Resume` to take
   a broken session back).
2. The server checks bans, capacity and the ticket, gives the player an id and asks the plugins:
   `playerConnectRequest`, then `playerAuthenticated`. A refusal is a `Kick` with the reason.
3. `Welcome` and `VerifyRequest`. The helper fetches the reference manifest if a strict server needs
   one, runs the check and sends `VerifyReport`. A failed check is a `Kick` before any download.
4. The mods: `ModsRequest`, `ModsInfo`, then `FileRequest` and `FileBegin` or `FileDeny` for each
   missing file, until `SyncDone`.
5. `UdpToken` and `MapInfo`, followed right away by the resources' client scripts (`ResourceChunk`
   … `ResourceDone`). The server fires `playerJoining`; the game loads the map.
6. The helper binds UDP with `UdpHello` and sends `JoinWorld`.
7. The server answers with `SelfInfo` to the joiner and `PlayerJoined` to the others, replays every
   car with its state, and fires `playerJoined`.

## Versions

The protocol version goes up with every change on the wire and is carried in `Hello` and
`Command::Version`. Versions must match exactly: a launcher speaking another version is refused
with a message that names both. Additions that older peers can safely ignore, such as the
capability bits at the end of `Welcome`, come without a new version.
