---
title: Wire protocol
description: Wire protocol v18 by name - transport, the (Category, SubType) frame, every packet per category with its purpose, the join and content sequences.
---

This is the protocol between the launcher's helper and a NodeMP server, **v18**
(`Wire::ProtoVersion = 18`). Resources never see it: they send and receive events. Native module
authors meet it in the relay filter, which is asked about packets by category and subtype, and
anyone reading a packet capture or the server's debug log meets it by name. This page names the
frames and orders them; it does not give byte layouts. The normative definition, field by field,
is `server/include/net/Protocol.h`, kept byte-identical in the helper, and the launcher and the
client mod ship with a matching version - there are no mixed-version sessions. How the same
traffic drives vehicle synchronization is on [How synchronization works](/framework/sync/).

## Transport

Between the helper and the server a session has two channels: one TCP connection wrapped in
**TLS 1.3** - the reliable channel, where everything but position state travels - and, once
bound, one **UDP** flow for the state channel. Nothing in the frame format carries TLS state. The
three hops from the game to the server, the loopback ports and certificate pinning are described
on [How synchronization works](/framework/sync/); here are the rules the frames themselves follow.

- **UDP.** Only three things travel over UDP: `State::Pos`, `State::HeadPose`, and the
  `Ping`/`Pong`/`UdpHello` handshake packets. `UdpHello` and every state datagram from a client are
  authenticated with a per-session key delivered once over TLS (`UdpToken`) and never sent over UDP
  itself; `Ping` is the one unauthenticated datagram, and it refreshes a player's liveness only when
  it comes from the endpoint the player's UDP channel is bound to. A packet type that is not
  UDP-valid is dropped when it arrives over UDP.
- **Loopback.** The first frame the game sends on each of the two helper channels is
  `Command::Auth` with the helper's per-run token; a wrong token closes the connection.
- **Compression.** A compressed body (helper-server hop only) carries flag bit `FlagCompressed`
  and its exact decompressed size in front, so a receiver checks it against the packet's body cap
  before inflating. The helper normalizes frames, so the game mod never sees a compressed body.
- **Limits.** A frame is capped at 4 KB before `Welcome` and 1 MB after it; a UDP datagram at
  10 KB. Handshake, session, state and content-control bodies are capped at 4 KB (a `FileRequest`
  name at 1 KB), with one exception: an `IntegrityManifestChunk` body may be
  `IntegrityChunkBodyCap` = 32 KiB + 8 bytes, one slice of `IntegrityChunkBytes` = 32 KiB plus
  its two counters. Vehicle, event, module and resource-chunk bodies are capped at the frame
  cap; a vehicle config at 768 KB so that its join-replay wrapper still fits. An oversized frame
  is dropped after the handshake and kills the connection before it.

## Frames: (Category, SubType)

Every packet is identified by two bytes: a **category** and a **subtype** within it. A TCP frame is
`[u32 length][category][subtype][flags][body]`; a UDP datagram is the same without the length
(client-to-server datagrams carry the client id after the flags). Eight categories exist:

| Category | Byte | Covers |
|---|---|---|
| `Handshake` | `0x01` | connection setup, liveness, UDP binding |
| `Session` | `0x02` | player lifecycle and session-scoped pushes |
| `Content` | `0x03` | mod list, file delivery, client resource streaming |
| `Vehicle` | `0x04` | vehicle lifecycle, seating, authority |
| `State` | `0x05` | high-rate vehicle state streams |
| `Event` | `0x06` | named custom events - the plugin and client API |
| `Command` | `0x07` | game mod to helper command channel |
| `Module` | `0x08` | typed binary channel between modules and clients |

Subtype `0x00` is invalid in every category, so a zeroed buffer never names a packet. Bodies follow
a few fixed rules: integers are little-endian; strings are UTF-8 without a terminator; at most one
variable-length field per packet, always last, its length implied by the frame (`tail`); a variable
field that is not last carries a two-byte length prefix (`str16`); JSON rides as opaque bytes.
There is no `:` delimiter anywhere on the wire - names, reasons and JSON may contain it freely.

In the tables below, **L** is the helper, **S** the server, **G** the game mod; **T** is the
server TCP channel, **U** the server UDP channel, **R** the relay (4445) and **CC** the command
channel (4444).

## Packets by category

### Handshake (14)

| Subtype | Direction | Purpose |
|---|---|---|
| `Hello` | L→S, T | Opens the session: the protocol version and the requested player name. A version mismatch is refused with a reason that names both versions. |
| `Welcome` | S→L, T | The assigned client id - sent once the player has passed the identity, ban and connect checks. |
| `Ping` | L→S, T and U | Liveness and round-trip probe, with an optional stamp the `Pong` echoes. A `Ping` as the first frame of a fresh connection is answered and closed. |
| `Pong` | S→L, T and U | The answer to `Ping`, echoing its body. |
| `UdpToken` | S→L, T | The 64-byte per-session key for the UDP channel, delivered once over TLS. |
| `UdpHello` | L→S, U | Binds the client's UDP endpoint: a nonce and an HMAC-SHA256 over the token, the client id and the nonce. Accepted only from the address the TLS session came from, and only once. |
| `MapInfo` | S→L, T | The level the game must load. |
| `JoinWorld` | L→S, T | The map is loaded; stream the world. |
| `VerifyRequest` | S→L, T | How strictly the game install must be checked (`[General] VerifyGame`): `u8 level` - off, size, scripts, full or, since v18, strict (`VerifyLevel::Strict = 4`) - followed by `tail:str manifest_hash`, the id of the reference manifest to judge against (SHA-256 of the manifest file, 64 lowercase hex digits), empty for every level but strict. Sent on every join, and since v18 also mid-session when a resource calls `player:verify`. |
| `VerifyReport` | L→S, T | What the launcher checked and found: `u8 level_run, u8 outcome, u32 problems, tail:str detail`. A strict report's `detail` starts with `manifest=<id>;` naming the manifest it was judged against, then `excluded=N:a,b;` (what the launcher left out as its own) and `skipped=N;` (folders it could not read) when they apply, then up to three examples as `path (reason)`. Sent again during the session when the install changes, on the launcher's schedule, and in answer to a mid-session `VerifyRequest`. |
| `Identity` | L→S, T | The join ticket from the directory, always the frame after `Hello`; an empty body means no ticket. |
| `IntegrityManifestRequest` | L→S, T | `0x0C` (v18). `tail:str hash`: the launcher has no cached reference manifest with the id the `VerifyRequest` named and asks for its body. An id the server does not serve - or a string that is not an id - is answered with `Kick` (`Unknown integrity manifest requested`); more than four transfers in one session too (`Too many integrity manifest requests`). |
| `IntegrityManifestChunk` | S→L, T | `0x0D` (v18). `u32 index, u32 total, tail:bytes part`: one slice of the zstd-compressed manifest, at most `IntegrityChunkBytes` (32 KiB), sent in order, `index` from `0` to `total - 1`. An empty manifest is one empty chunk. TCP only, never cached; the one handshake body that outgrows the 4 KB cap. |
| `IntegrityManifestDone` | S→L, T | `0x0E` (v18). `tail:str hash`: every chunk was sent; the SHA-256 of the reassembled compressed bytes, which the launcher recomputes and compares before it caches the file under that id (`cache/integrity/<id>.manifest`) and runs the check. |

### Session (7)

| Subtype | Direction | Purpose |
|---|---|---|
| `Kick` | S→G, T and R | The connection is refused or ended, with the reason as text. |
| `SelfInfo` | S→G, T and R | The joiner's own client id and final name. |
| `PlayerJoined` | S→G, T and R | Another player's id and name, to everyone already in. |
| `PlayerLeft` | S→G, T and R | A player's id and name on disconnect. |
| `PlayerList` | S→G, T and R | The roster: count, maximum, and every id and name. |
| `SessionEnd` | L→G, R | The helper tells the game the session ended - server closed it, connection lost or the player quit - with a detail line. |
| `ClientId` | L→G, R | The helper tells the game its client id. |

### Content (8)

| Subtype | Direction | Purpose |
|---|---|---|
| `ModsRequest` | L→S, T | Ask for the server's content list. |
| `ModsInfo` | S→L, T | The content list as JSON, plus the session key when `[Content] Encrypt` is on. |
| `FileRequest` | L→S, T | Ask for one content file by name. |
| `FileBegin` | S→L, T | The file follows: its size and, when encrypted, the nonce; then the raw bytes, unframed, inside TLS. |
| `FileDeny` | S→L, T | No file: unknown, protected, or unreadable. |
| `SyncDone` | L→S, T | The helper has every file it needs. |
| `ResourceChunk` | S→G, T and R | One part of one resource's client files, as JSON. |
| `ResourceDone` | S→G, T and R | Every resource has been delivered. |

### Vehicle (28)

| Subtype | Direction | Purpose |
|---|---|---|
| `SpawnReq` | G→S | A client asks to spawn a vehicle from a config; the requested id is `0` for a new one. |
| `Spawn` | S→G | The server registers the vehicle and tells everyone: global id, spawner, owner label, damage blob, config. |
| `SpawnDeny` | S→one | A targeted refusal of `SpawnReq` - the `MaxCars` limit or a plugin's veto with its reason; the requester removes its local car. |
| `Edit` | G↔S | A config change (parts, tuning). |
| `Delete` | G↔S | The vehicle is removed. |
| `Reset` | G↔S | The vehicle was reset or recovered, with the position it went to. |
| `Coupler` | G↔S | A coupler or door state. |
| `Paint` | G↔S | The paint layers. |
| `Camera` | G↔S | Which vehicle a player's camera is on. |
| `SeatClaim` | G→S | A transactional seat request: driver, passenger or leave, with a claim id. |
| `SeatVerdict` | S→one | The outcome of one `SeatClaim`: granted driver or passenger, left, or denied (by a plugin, occupied, a walking avatar, gone, or locked). |
| `Driver` | S→G | Who drives the vehicle now, stamped with the seat epoch. |
| `SeatFree` | S→G | The driver seat is empty. |
| `Authority` | S→G | Which client simulates the vehicle. |
| `AuthRevoke` | S→one | Stop simulating this vehicle. |
| `PlayerVehicle` | S→G | The seat a player occupies: vehicle and role, or on foot. |
| `Resync` | S→G | A full cached-state push with the body of `Spawn`; the client re-applies it. |
| `ResyncReq` | G→S | A client asks for a resync of one vehicle or of all. |
| `Trigger` | G↔S | A controller call (doors, couplers) from any client, gated by `vehicleCouplerRequest` and echoed to everyone including the sender. |
| `DamageStat` | G→S | The authority's periodic damage version; server-terminal. |
| `DamageBlob` | G→S | The authority's deformation blob after the counter settled; server-terminal, replayed inside later spawns. |
| `CouplerSet` | S→G | A server-driven coupler or door actuation, applied by every client. |
| `Tag` | S→G | One server-assigned key/value tag; an empty value removes it. |
| `Lock` | S→G | The vehicle's lock mode and whitelist. |
| `ConfigHash` | G↔S | The config marker: broadcast by the server on every change, reported back by clients; a mismatch triggers a silent targeted resync. |
| `TriggerReq` | G→S | Ask the vehicle's sync authority to run a controller call; gated by `vehicleTriggerRequest`, forwarded as a targeted `Trigger`. |
| `NodeGrab` | G→S | The experimental node grabber's request; dropped unless enabled and allowed. |
| `NodeGrabSet` | S→one | An allowed grab, forwarded to the vehicle's sync authority. |

Vehicle packets are TCP (`T` and `R`); none of them is UDP-valid.

### State (9)

| Subtype | Direction | Purpose |
|---|---|---|
| `Pos` | G↔S, U with T fallback | The kinematic snapshot: position, orientation, velocities, the driving controls, timers and flags. Fixed-size binary, as is `HeadPose`; the seven others are `gid + JSON`. |
| `Inputs` | G↔S, T | Extra input axes beyond the controls folded into `Pos`, sent on change; driver-only, never cached. |
| `Electrics` | G↔S, T | Lights, signals, gauges, as a delta. |
| `Nodes` | G↔S, T | Node positions - deformation. |
| `BreakGroups` | G↔S, T | Break groups reported broken. |
| `Controller` | G↔S, T | One controller call. |
| `Powertrain` | G↔S, T | Powertrain device modes. |
| `Engine` | G↔S, T | Engine and ignition state. |
| `HeadPose` | G↔S, U with T fallback | The sender's camera or head pose, per player; ephemeral, never cached. |

All but `Inputs` and `HeadPose` are cached per (vehicle, subtype) and replayed to joiners.

### Event (1)

| Subtype | Direction | Purpose |
|---|---|---|
| `Event` | G↔S, T and R | A named custom event: the name and an opaque payload as two separate fields. This is `node.emitServer` on the client and `player:send`, `node.broadcast`, `emit_client`, `emit_all` on the server. Names starting with `node:` are reserved. |

### Command (18)

| Subtype | Direction | Purpose |
|---|---|---|
| `Keepalive` | G↔L, CC | Echoed verbatim. |
| `VersionReq` | G→L, CC | Ask the helper's protocol version. |
| `Version` | L→G, CC | The protocol version. |
| `Connect` | G→L, CC | Join a server at host and port. |
| `Quit` | G→L, CC | Leave the session. |
| `StatusReq` | G→L, CC | Ask for the session status. |
| `Status` | L→G, CC | Idle, loading, done, connect failed or disconnected, with a detail line. |
| `PingReq` | G→L, CC | Ask for the server ping. |
| `Ping` | L→G, CC | The ping in milliseconds, `-1` when unknown. |
| `MapReq` | G→L, CC | Ask which map the session is on. |
| `Map` | L→G, CC | The map, empty before a session. |
| `ModLoaded` | G→L, CC | The game mounted a content file. |
| `ModList` | L→G, CC | The content files the session needs. |
| `ConnectFailed` | L→G, CC | The join failed, with a reason. |
| `Prompt` | L→G, CC | A question for the player (local mods found). |
| `PromptAnswer` | G→L, CC | The player's yes or no. |
| `Auth` | G→L, CC and R | The loopback token; must be the first frame on both channels. |
| `Server` | L→G, CC | Which server the session is on - the mirror of `Connect`, for a session the launcher started itself. |

`Command` packets never leave the machine.

### Module (1)

| Subtype | Direction | Purpose |
|---|---|---|
| `Data` | G↔S, T and R | Arbitrary bytes on a module-chosen `u32` channel id. Client-to-server data is server-terminal (`node.modules.on`, `register_module_channel`); server-to-client is targeted or a broadcast that respects the relay filter (`node.modules.send`, `send_module`). |

## Joining

The order in which a player enters, packet by packet. The server's log lines in parentheses are
what you see on the console.

1. The helper opens the TLS connection and sends `Hello` with the protocol version and the name the
   player asked for. A different version is answered with `Kick` (`Protocol version mismatch: launcher speaks v17, server speaks v18 - update the outdated side`).
2. The helper sends `Identity`, always: the join ticket, or an empty body. The server reads it before
   deciding anything, so the stream stays in step even when the answer is a refusal.
3. The server holds the handshake while it is still starting, refuses a full server
   (`Server full!`), and only then redeems the ticket with the directory: the verified name replaces
   the requested one, a ticket-less or Test Drive join is admitted or refused by `[Directory] TestDrive`, an unreachable directory by `RedeemFailOpen`. A ticket is spent when redeemed, which is why identity is decided last.
4. The player id is assigned and the name de-duplicated. `playerConnectRequest` runs; a veto is a
   `Kick` with the plugin's reason. `playerAuthenticated` fires.
5. `Welcome` carries the client id, `VerifyRequest` the install check level - and, for strict,
   the id of the reference manifest. A server set to strict that has no manifest to name, or
   more than one, refuses here instead (`Kick` with a reason that tells the player to ask the
   host). A launcher asked for strict that has no cached manifest of that id fetches it first:
   `IntegrityManifestRequest`, the `IntegrityManifestChunk` frames, `IntegrityManifestDone`.
   It then runs the check and answers `VerifyReport`; the server judges it at once - a strict
   report naming another manifest than the one served is judged as a mismatch whatever its
   outcome - and a refusal is a `Kick` before any content is downloaded. The content phase
   follows ([below](#content-delivery)) until the helper sends `SyncDone`.
6. `UdpToken` and `MapInfo` are sent; the console prints `Alice connected (id 0)`. The helper starts
   the game, or hands the session to a running one, and the game loads the map.
7. When the client mod has connected to the relay channel and authenticated, the helper binds UDP:
   `UdpHello` from the TLS address, carrying the HMAC over the token. It then pushes `ClientId` to
   the game and sends `JoinWorld` to the server. From here `Pos` and `HeadPose` datagrams carry the
   per-datagram authentication trailer and are checked against an anti-replay window on the
   sequence; until the bind succeeds, position traffic falls back to TCP.
8. The server answers `JoinWorld` with `SelfInfo` to the joiner and `PlayerJoined` to everyone else,
   then replays the world: one `Spawn` bundle per vehicle with its cached state, tags, lock, config
   hash and seats. Damaged vehicles (those with a blob) are deferred and streamed a moment later,
   one at a time.
9. The roster is followed by a `player:identity` event for each player - id, name, verified, guest,
   roles, account id - which is what `NodeMP.account.get()` reads. Idle vehicles with no simulating
   client are handed to the joiner. The console prints `Alice synced`.
10. The client resources are streamed (`ResourceChunk` … `ResourceDone`), then `playerJoined` fires
    on the server - the first event at which the player is a normal participant.

## Content delivery

Two deliveries happen on a join, over the reliable channel, in this order.

**Content files** (the mod zips under `content/`), between `Welcome` and `UdpToken`: the helper sends
`ModsRequest`; the server answers `ModsInfo` with the list as JSON and, when `[Content] Encrypt` is
on, the 32-byte session key as a raw field inside TLS. For each file it does not already have, the
helper sends `FileRequest` and receives `FileBegin` - the exact size and, when encrypted, the nonce -
followed by that many raw bytes, unframed; or `FileDeny` with a reason. When the helper is done it
sends `SyncDone`. A `VerifyReport` may arrive at any point during this phase and is judged at once,
and so may an `IntegrityManifestRequest`, which is served in place.

**Client resources** (the `client/` files of every resource), after the world replay and right before
`playerJoined`: one or more `ResourceChunk` packets per resource, then exactly one `ResourceDone`. The
body of a chunk is JSON:

```json
{
  "res": "race",
  "part": 0,
  "final": true,
  "files": [
    { "path": "main.lua", "kind": "ge", "body": "<base64 Lua source>" },
    { "path": "lua/vehicle/ready.lua", "kind": "vehicle", "body": "<base64 Lua source>" }
  ]
}
```

`path` is relative to the resource's `client/` directory with forward slashes; `kind` is `vehicle`
when the path starts with `lua/vehicle/`, `ge` otherwise; `part` counts from `0` and the last part
carries `final`; chunks are split so each payload stays under 900 KB. `body` is base64 of the exact
source the client runs - obfuscated or verbatim, the wire does not care. The client accumulates a
resource's parts and activates it on `final`; `ResourceDone` ends the whole delivery. The client
side of this is on [Client scripting](/plugins/client-scripting/).

## Versioning and tooling

`ProtoVersion` is bumped on any wire change and carried in `Hello` and `Command::Version`; the policy
is exact match, because all components ship together. Event names carry no version of their own,
which is why the v16 rename of every wire event to `<domain>:<verb>` was a protocol bump: a stale
peer with a renamed event does not fail, it goes quiet. v17 added `Identity` and nothing else.
v18 added the strict level and the reference manifest: `VerifyLevel::Strict = 4`, the
`manifest_hash` tail of `VerifyRequest`, the `manifest=<id>;` prefix of a strict `VerifyReport`,
the three `IntegrityManifest*` frames (`0x0C`-`0x0E`) with their 32 KiB chunk, and a
`VerifyRequest` that may arrive mid-session. A v17 launcher is refused with the protocol-mismatch
text, as the exact-match policy says.

The header is the only description. `sdk/tools/wiregen.py` parses it and regenerates the mirrors
that must match it byte for byte: the Python taxonomy the server's tests use, and the taxonomy block
inside the client mod's Lua codec; `wiregen.py --check` fails when either has drifted. The helper
carries an identical copy of the header, asserted by the same test suite. When you need a field
layout - the 72-byte `Pos` snapshot, the `Spawn` body, the UDP trailer - read `Protocol.h`; this page
will not repeat it.

## Next

- [How synchronization works](/framework/sync/) - what the vehicle and state packets do at the sync level.
- [Client scripting](/plugins/client-scripting/) - the `Event` and `Module` frames from the client's side.
- [Native modules](/plugins/native-modules/) - the relay filter that sees (category, subtype) per packet.
- [Events](/plugins/events/) - the server end of `Event`.
