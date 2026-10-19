---
title: Wire protocol
description: The protocol between the launcher and a NodeMP server, v23. The transport, the frame of a category and a subtype, every packet by category, and the order of a join.
---

Wire protocol v23, between the launcher's helper and a NodeMP server. Plugins don't see it: they send and receive events. Packets are seen by authors of native modules, whose relay filter describes a packet by category and subtype, and by anyone reading a traffic capture or the server's debug log. This page names the packets and the order of a join; the field layouts are in the server's `include/net/Protocol.h`, which the helper carries an exact copy of.

## Transport

A session has two channels between the helper and the server: one TCP connection inside TLS 1.3 for everything reliable and, once bound, one UDP flow for car positions.

- UDP carries only `State::Pos`, `State::HeadPose`, `State::PosBatch` and the handshake packets `Ping`, `Pong`, `UdpHello` and `UdpHelloAck`. UDP isn't encrypted. The session key arrives once over TLS (`UdpToken`) and is never sent over UDP: `UdpHello` carries an HMAC made with it, and `State::Pos` datagrams from the client carry an authentication tag and a sequence number against replay. Until UDP is bound, positions go over TCP.
- The game talks to the helper over two local TCP ports: `4444` for commands and `4445` for the relay. The first frame on each channel is `Command::Auth` with the helper's token, and a wrong token closes the connection.
- A compressed body has the `FlagCompressed` bit and starts with its exact decompressed size, so the receiver checks it against the packet's limit before decompressing. Only the link between the helper and the server is compressed: the client mod never sees a compressed body.
- Limits: a frame up to 4 KB before `Welcome` and 1 MB after it, a UDP datagram 10 KB, a vehicle config 768 KB so that its replay on join fits in a frame. The reference manifest goes in parts of `IntegrityChunkBytes` = 32 KiB.

## The frame

Every packet is named by two bytes: a category and a subtype within it. A TCP frame is `[u32 length][category][subtype][flags][body]`. A UDP datagram starts with `[category][subtype][flags]`; from the client, `[u32 client_id]` follows, then the body. The game doesn't speak UDP; the helper does.

| Category | Byte | What it covers |
|---|---|---|
| `Handshake` | `0x01` | Connection setup, liveness, UDP binding. |
| `Session` | `0x02` | Players joining and leaving, messages for the whole session. |
| `Content` | `0x03` | The mod list, file downloads, the plugins' client scripts. |
| `Vehicle` | `0x04` | Cars: spawning, seats, authority. |
| `State` | `0x05` | High-rate car state. |
| `Event` | `0x06` | Named events: the API of plugins and client scripts. |
| `Command` | `0x07` | The command channel between the game and the helper. |
| `Module` | `0x08` | Binary data between native modules and clients. |

Subtype `0` is invalid in every category, so a zeroed buffer can't mean a packet. Integers are little-endian; strings are UTF-8 without a terminating zero. Only the last variable-length field may have no length prefix: it takes the rest of the frame.

In the tables, the direction uses L (the helper), S (the server) and G (the client mod in the game); S→one means the server sends the packet to a single client. The channel uses T (the server's TCP channel), U (its UDP channel), R (the relay port) and CC (the command port).

## Packets by category

### Handshake (18)

| Subtype | Direction | Purpose |
|---|---|---|
| `Hello` | L→S, T | The protocol version, the helper's capability bits and the name the player asked for. |
| `Welcome` | S→L, T | The player's id, a token for resuming the session, the resume window and the server's capability bits. |
| `Ping` | L→S, T and U | Liveness and round-trip probe. An optional stamp comes back in `Pong`. |
| `Pong` | S→L, T and U | The answer to `Ping`. |
| `UdpToken` | S→L, T | The session's 64-byte key for signing UDP. |
| `UdpHello` | L→S, U | Binds the client's UDP address with a nonce and an HMAC. A correct packet binds from any address, which VPN split tunneling needs. |
| `MapInfo` | S→L, T | The map the game must load. |
| `JoinWorld` | L→S, T | The map is loaded; the world can be sent. |
| `VerifyRequest` | S→L, T | How strictly to check the game installation (`[integrity] verify`) and, for `strict`, the id of the reference manifest. During a session, a strict server's rechecks and `player:verify` send it again. |
| `VerifyReport` | L→S, T | What the launcher checked and found: the level, the outcome, the number of problems and a detail line. |
| `Identity` | L→S, T | The join ticket, always right after `Hello`. Empty without a ticket. |
| `IntegrityManifestRequest` | L→S, T | The launcher asks for the reference manifest with this id, which its cache lacks. |
| `IntegrityManifestChunk` | S→L, T | The next part of the compressed manifest. |
| `IntegrityManifestDone` | S→L, T | All parts are sent. The hash the launcher checks before it saves the file. |
| `Resume` | L→S, T | Sent after `Hello` instead of `Identity` to resume a broken session within the resume window. |
| `UdpHelloAck` | S→L, U | Confirms an accepted `UdpHello` to the bound address. |
| `Queued` | S→L, T | The server is full and the join waits in the queue: the place, how many are waiting, and the host's note while the queue is paused. Sent instead of `Welcome`, then on every change. |
| `QueueAdmit` | S→L, T | A place has freed up for this join. `Welcome` follows. |

### Session (10)

| Subtype | Direction | Purpose |
|---|---|---|
| `Kick` | S→G, T and R | The connection is refused or ended, with the reason as text. |
| `SelfInfo` | S→G, T and R | The joining player's own id and final name. |
| `PlayerJoined` | S→G, T and R | The id and name of another player. |
| `PlayerLeft` | S→G, T and R | A player left. |
| `PlayerList` | S→G, T and R | The roster: how many players, the maximum, every id and name. |
| `SessionEnd` | L→G, R | The helper tells the game that the session ended, and why. |
| `ClientId` | L→G, R | The helper tells the game its player id. |
| `Policy` | G→S, T and R | The player's choice for their cars: who may get in, use triggers, pull nodes. |
| `Reconnecting` | L→G, R | The link broke and the helper is restoring the session: the attempt number and the next pause. |
| `Resumed` | L→G, R | The server took the session back. |

### Content (9)

| Subtype | Direction | Purpose |
|---|---|---|
| `ModsRequest` | L→S, T | Ask for the server's mod list. |
| `ModsInfo` | S→L, T | The mod list as JSON. |
| `FileRequest` | L→S, T | Ask for one mod file by name. |
| `FileBegin` | S→L, T | A file follows: its size, then the bytes. |
| `FileDeny` | S→L, T | No file will follow: it is unknown, protected or unreadable. |
| `SyncDone` | L→S, T | The helper has all the files it needs. |
| `ResourceChunk` | S→G, T and R | A part of one plugin's client scripts, as JSON. |
| `ResourceDone` | S→G, T and R | All client scripts are delivered. |
| `ModsReady` | L→S, T | A queued join has all its mods in the cache; only then can it get a place. |

### Vehicle (30)

| Subtype | Direction | Purpose |
|---|---|---|
| `SpawnReq` | G→S, T and R | The player asks to spawn a car or to replace the one they sit in. |
| `Spawn` | S→G, T and R | The car exists: its id, who spawned it, damage and config. |
| `SpawnDeny` | S→one, T and R | A refused spawn, with the reason. The player removes their local car. |
| `Edit` | G↔S, T and R | A new config (parts, tuning). |
| `Delete` | G↔S, T and R | A car was deleted. |
| `Reset` | G↔S, T and R | A car was reset to a position. |
| `Coupler` | G↔S, T and R | A coupling or door changed. |
| `Paint` | G↔S, T and R | A new paint job. |
| `Camera` | G↔S, T and R | Which car a player's camera follows. |
| `SeatClaim` | G→S, T and R | The player asks for the driver's seat or a passenger seat, or wants to get out. |
| `SeatVerdict` | S→one, T and R | The answer to `SeatClaim`, with a reason if a plugin refused. |
| `Driver` | S→G, T and R | Who drives the car now. |
| `SeatFree` | S→G, T and R | The driver's seat has become free. |
| `Authority` | S→G, T and R | Whose game simulates the car now. |
| `AuthRevoke` | S→one, T and R | This game no longer simulates the car. |
| `PlayerVehicle` | S→G, T and R | Which car a player is in, and in which role. |
| `Resync` | S→G, T and R | The car's full saved state again. |
| `ResyncReq` | G→S, T and R | A client asks to resync one car or all of them. |
| `Trigger` | G↔S, T and R | A trigger or door press, repeated to everyone. |
| `DamageStat` | G→S, T and R | The damage counter from the car's authority. Stays on the server. |
| `DamageBlob` | G→S, T and R | The damage data itself, now and then. Stays on the server for joins and resyncs. |
| `CouplerSet` | S→G, T and R | The server opens or closes a coupling or door. |
| `Tag` | S→G, T and R | A tag a plugin set on a car. An empty value removes it. |
| `Lock` | S→G, T and R | Who may get into the car. |
| `ConfigHash` | G↔S, T and R | A checksum of the saved config. A mismatch triggers a quiet resync. |
| `TriggerReq` | G→S, T and R | Ask the car's authority to run a trigger. Plugins can refuse. |
| `NodeGrab` | G→S, T and R | A request for the experimental node grab. Refused unless a plugin allowed it. |
| `NodeGrabSet` | S→one, T and R | An allowed grab, passed on to the car's authority. |
| `Grab` | G↔S, T and R | The stream of the synced node grab, forwarded to the other clients. |
| `EditDeny` | S→one, T and R | A refused edit or paint job, with the plugin's reason, before the rollback. |

### State (11)

| Subtype | Direction | Purpose |
|---|---|---|
| `Pos` | G↔S, U with T fallback | The car's position, rotation, speeds and driving controls, in a fixed binary form. |
| `Inputs` | G↔S, T | Input axes beyond those in `Pos`, sent on change. |
| `Electrics` | G↔S, T | Lights, indicators and gauges: changes. |
| `Nodes` | G↔S, T | Node positions: deformation. |
| `BreakGroups` | G↔S, T | Parts that broke off. |
| `Controller` | G↔S, T | One controller call. |
| `Powertrain` | G↔S, T | Powertrain modes. |
| `Engine` | G↔S, T | The engine and ignition. |
| `HeadPose` | G↔S, U with T fallback | The position of a player's camera or head. Not saved. |
| `PosBatch` | S→G, U | Several `Pos` snapshots in one datagram. Only the server sends it. |
| `Fire` | G↔S, T | Fire on a car, from its authority. Saved like `Electrics`. |

### Event (1)

| Subtype | Direction | Purpose |
|---|---|---|
| `Event` | G↔S, T and R | A named event: the name and the data. The client sends it with `node.emitServer`, the server with `player:send` and `node.broadcast`. |

### Command (23)

`Command` packets never leave the player's computer.

| Subtype | Direction | Purpose |
|---|---|---|
| `Keepalive` | G↔L, CC | Echoed back as is. |
| `VersionReq` | G→L, CC | Ask for the helper's protocol version. |
| `Version` | L→G, CC | The protocol version. |
| `Connect` | G→L, CC | Join the server at this address and port. |
| `Quit` | G→L, CC | Leave the session. |
| `StatusReq` | G→L, CC | Ask for the session's state. |
| `Status` | L→G, CC | The session's state, with a detail line. |
| `PingReq` | G→L, CC | Ask for the ping to the server. |
| `Ping` | L→G, CC | The ping in milliseconds, `-1` if unknown. |
| `MapReq` | G→L, CC | Ask for the session's map. |
| `Map` | L→G, CC | The map. Empty before a session. |
| `ModLoaded` | G→L, CC | The game loaded a mod file. |
| `ModList` | L→G, CC | The mod files the session needs. |
| `ConnectFailed` | L→G, CC | The join failed, with the reason. |
| `Prompt` | L→G, CC | A question for the player. |
| `PromptAnswer` | G→L, CC | The player's answer: yes or no. |
| `Auth` | G→L, CC and R | The local token. The first frame on both channels. |
| `Server` | L→G, CC | Which server the session is on, if the launcher started the join. |
| `ClockPing` | G→L, CC | The game's clock. The helper answers at once. |
| `ClockPong` | L→G, CC | The game's stamp and the helper's clock, to align them. |
| `ArrivalStamp` | L→G, R | When the next relayed datagram reached the helper. |
| `ServerName` | L→G, CC | The server's name as the list shows it. |
| `GameCaps` | G→L, CC | What this client mod can take. Sent once on connecting. |

### Module (1)

| Subtype | Direction | Purpose |
|---|---|---|
| `Data` | G↔S, T and R | Raw bytes on a channel the module numbers. On the server, `node.modules.on` and `node.modules.send` handle it. |

## The order of a join

1. The helper opens TLS and sends `Hello`, then `Identity` with the join ticket. To resume a broken session, it sends `Resume` instead of `Identity`.
2. The server checks bans, free places and the ticket, gives the player an id and asks the plugins: `playerConnectRequest`, then `playerAuthenticated`. A refusal arrives as `Kick` with a reason.
3. `Welcome` and `VerifyRequest` follow. The helper checks the game and sends `VerifyReport`. For a strict server it first downloads the reference manifest unless it's cached. A failed check ends with `Kick` before any download.
4. Mods: `ModsRequest`, `ModsInfo`, then `FileRequest` and `FileBegin` or `FileDeny` for each missing file, until `SyncDone` arrives.
5. `UdpToken` and `MapInfo`, and right after them the plugins' client scripts (`ResourceChunk` and `ResourceDone`). The server fires `playerJoining`, and the game loads the map.
6. The helper binds UDP with `UdpHello` and sends `JoinWorld`.
7. The server answers the joining player with `SelfInfo` and the others with `PlayerJoined`, replays all cars with their state and fires `playerJoined`.

Instead of refusing a player with an account, a full server may put them in the [join queue](/hosting/join-queue/). It answers `Queued` in place of `Welcome`; steps 3 and 4 run while the player waits and end with `ModsReady` instead of `SyncDone`. A waiting helper sends `Ping` every 30 seconds. When a place frees up, `QueueAdmit` and `Welcome` arrive, the helper puts the mods into the game and sends `SyncDone`, and the join continues from step 5.

## Versions

The protocol version travels in `Hello` and `Command::Version` and goes up when an old peer stops understanding a new one. Versions must match exactly: if the launcher or the client mod has another one, the server refuses and names both. Additions an old peer can skip, such as the capability bits at the end of `Welcome` and the helper's bits in `Hello`, don't change the number. The helper says in `Hello` that it can wait in a queue; a full server answers a helper that doesn't with `Server full!`.
