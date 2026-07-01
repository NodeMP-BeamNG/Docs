---
title: Wire protocol
description: The NodeMP unified network protocol — transport framing, packet types, state-diff and sync-owner semantics, security rules, and launcher channel routing.
---

This is the wire protocol spoken between the launcher/mod and a NodeMP server. Plugin authors
rarely touch it directly — the [Server Lua API](/plugins/server-api/) and
[Client mod API](/plugins/client-api/) sit on top — but it is the source of truth for vehicle
ids, events, and packet semantics.

> **Version:** 1.1  
> **Date:** 2026-06-21  
> **Status:** Global `VehicleID` + persistent sync-owner model  

## 1. Goals & Design Principles

1. **Systematic type identification** — every packet is identified by a single `uint8` type ID. Legacy random single-letter codes (`Z`, `O`, `C`, `E`, …) are abolished.
2. **Clear channel separation** —
   * **UDP** — high-frequency unreliable state: vehicle transform (position, rotation, velocity, input). Loss is acceptable; server spatial-culls the relay.
   * **TCP** — everything else: diffs, lifecycle, occupancy, freeze/state, chat, players, events, file transfer.
   * The launcher (BeamMP-Launcher) enforces this split automatically: packets whose first byte is not `O`, `T`, `N`, `W`, `Y`, `V`, `E`, or `C` and whose size is ≤ 1000 bytes travel UDP; everything else goes TCP.
3. **VehicleID** — a single **global** id, unique server-wide and allocated monotonically (it does **not** encode the owner). It is sent as a decimal **string** (e.g. `"42"`) in all wire payloads to avoid IEEE-754 precision issues and keep table keys stable. Ownership/attribution (`spawner`) and the current sync authority (`syncOwner`) are carried as separate fields. Vehicles are **persistent**: they are not destroyed when a player disconnects.
4. **Compact JSON** — JSON is kept for unstructured/dynamic data (electrics, controllers, vehicle configs, events). Keys are single-letter or very short. Arrays are preferred over objects where the schema is fixed.
5. **State-diff** — electrics and controllers packets contain *only* fields that changed since the last acknowledged state.
6. **Backward migration path** — the spec explicitly maps legacy codes to new IDs so the refactor can be done incrementally.

---

## 2. Transport Framing

### 2.1 TCP
```
[int32  length] [uint8 type_id] [payload_body ...]
```
* `length` — total size of everything **after** the length field itself (`type_id + payload_body`).
* `type_id` — one of the IDs defined in §4.
* `payload_body` — JSON (UTF-8) for all packet types **except** file-stream chunks, which may carry raw binary after a small JSON header (see §4.6).
* **Compression** — payloads larger than 400 bytes MAY be zlib-compressed. If compressed, the payload (after `type_id`) starts with the ASCII marker `ABG:` followed by the zlib stream. The `type_id` lives *before* the compressed wrapper. This is fully transparent to the logical protocol.

### 2.2 UDP
UDP datagrams are prefixed with the sender's `PlayerID + 1` and a colon for endpoint binding. The launcher injects this prefix automatically; the server core strips it before parsing.

```
[uint8 player_id_plus_1] ':' [uint8 type_id] [payload_body ...]
```

* `player_id_plus_1` — transport-level prefix added by the launcher. `PlayerID = byte - 1`.
* `type_id` for UDP is **always** in the range `0x00–0x0F`.
* `payload_body` — compact JSON. There is **no** length prefix inside UDP; the payload runs to the end of the datagram.
* **Compression** — same `ABG:` + zlib rule as TCP, applied to `payload_body` when it exceeds 400 bytes.
* **Channel binding** — the server MUST trust `player_id_plus_1` only after the launcher's UDP auth handshake is complete (see §9).

---

## 3. Common Types

| Logical type | Wire format | Notes |
|--------------|-------------|-------|
| `VehicleID`  | string (decimal) | A single global id, e.g. `"42"`. Unique server-wide, monotonic, never reused within a session, and independent of the owner. |
| `PlayerID`   | `uint32`    | Serialized as JSON number. `-1` denotes "none" (e.g. no sync owner). |
| `SeatName`   | string      | E.g. `"driver"`, `"passenger"`. |
| `RoleTag`    | string      | Short uppercase tag, e.g. `"SCR"`, `"ADM"`, `"MOD"`. |
| `Timestamp`  | `uint64`    | Server epoch milliseconds; used only where ordering matters (rare). |

### Compact key glossary (used throughout)
| Key | Meaning |
|-----|---------|
| `v` | VehicleID (global id string) |
| `p` | PlayerID **or** position (contextual) |
| `o` | Spawner PlayerID (vehicle attribution) |
| `so`| Sync-owner PlayerID (current sync authority; `-1` = none) |
| `n` | Name |
| `r` | Reason / RoleTag / rotation (contextual) |
| `m` | Message / map (contextual) |
| `d` | Data / diff / delete payload (contextual) |
| `c` | Car config / count / controller (contextual) |
| `s` | Seat / state / size (contextual) |
| `g` | Gear / guest flag (contextual) |
| `l` | List / lights (contextual) |
| `t` | Throttle / type / timestamp (contextual) |
| `b` | Brake |
| `vl`| Linear velocity (`vel`) |
| `vr`| Angular velocity (`rvel`) |
| `f` | From / file (contextual) |

---

## 4. Packet Type Reference

### 4.1 `0x00 – 0x0F` — UDP State

> **Channel:** UDP only  
> **Rate:** Up to 60 Hz per vehicle  

#### `0x01` — VehicleTransform
* **Direction:** Client → Server → Relevant clients (spatial cull)
* **Channel:** UDP only
* **When:** Every simulation tick for every active vehicle owned by the client. Rate is client-dependent (historically ~50 Hz).
* **Payload (compact JSON):**
  ```json
  {"v":"42","p":[1234.56,78.90,12.34],"sp":[1234.60,78.95,12.30],"r":[0.0,0.0,0.7071,0.7071],"vl":[5.2,0.0,-1.1],"vr":[0.0,0.0,0.5],"tim":12.3,"ping":0.05}
  ```
* **Schema:**
  * `v` — `VehicleID` (global id string)
  * `p` — position `[x, y, z]` (float array). The centre-of-gravity (COG) position; used as the **fallback** when `sp` is absent.
  * `sp` — ref-node position `[x, y, z]` (float array). **Preferred** — the point the engine spawns a car against, so the server bakes it into re-streamed spawns. Optional: older clients send only `p`.
  * `r` — rotation quaternion `[x, y, z, w]` (float array)
  * `vl` — linear velocity `[x, y, z]` (float array)
  * `vr` — angular velocity `[x, y, z]` (float array)
  * `tim` — sender's local sim time (float seconds), used for interpolation/prediction.
  * `ping` — sender's own ping (float seconds), used for time-offset estimation.
* **Design note:** There is no delta encoding on UDP; the client sends the absolute transform every tick. **Driver inputs are NOT carried here** — they are diff-encoded and must be delivered reliably, so they travel in `0x10` (key `i`). The server may choose to drop or cull the relay based on spatial relevance.

#### `0x02` — VehicleTransformBatch *(Reserved)*
* Reserved for a future batched binary format that packs multiple vehicles into a single datagram. Not used in v1.0.

#### `0x00`, `0x03–0x0F` — Reserved

---

### 4.2 `0x10 – 0x1F` — Vehicle Property Diffs

> **Channel:** TCP only  
> **Semantics:** State-diff. Clients and servers keep a *last-known* snapshot per vehicle. Only key/value pairs that differ from the last snapshot are transmitted. The receiver merges the diff into its local snapshot.

#### `0x10` — VehicleElectricsDiff
* **Direction:** Client → Server → Relevant clients
* **Channel:** TCP only
* **When:** Whenever any electrics value changes for an owned vehicle.
* **Payload:**
  ```json
  {"v":"42","d":{"lights_state":1,"signal_left_input":1},"i":{"s":-0.3,"t":0.75,"b":0.0,"c":0.0,"p":0.0,"g":"D1"}}
  ```
* **Schema:**
  * `v` — `VehicleID` (global id string)
  * `d` — object containing only changed **electrics** keys (lights, signals, fuel, etc.). Unstructured and vary per vehicle mod; unknown keys are forwarded verbatim.
  * `i` — object containing only changed **driver inputs** (sent here, not in `0x01`, because diffs must be reliable):
    * `s` — steering `[-1..1]`
    * `t` — throttle `[0..1]`
    * `b` — brake `[0..1]`
    * `c` — clutch `[0..1]`
    * `p` — parking brake `[0..1]`
    * `g` — gear (string or int; periodically re-sent so a car spawned in gear matches)
* **Design note:** `d` and `i` are independent and either may be present. The server forwards the diff verbatim and (since v1.1) merges it into a per-vehicle last-known snapshot so clients that join later can be re-sent the current state (see §5.1).

#### `0x11` — VehicleControllersDiff (deep vehicle state)
* **Direction:** Client → Server → Relevant clients
* **Channel:** TCP only
* **When:** Whenever deep vehicle state changes (controller call, powertrain mode, engine/ignition, node break, coupler attach/detach, fire).
* **Payload:** a multiplexed object keyed by subsystem; any subset of the keys may be present.
  ```json
  {"v":"42","c":{"controllerName":"...","functionName":"...","variables":[...]},
   "l":{...},"e":{...},"g":[...],"n":{...},"cp":[...],"f":{"on":1,"n":[12,34]}}
  ```
* **Schema:**
  * `v` — `VehicleID` (global id string)
  * `c` — a single controller call (controllerName/functionName/variables), see controller sync.
  * `l` — powertrain device modes that changed (diff/locker/transfer-case).
  * `e` — engine state (ignition level, combustion engine ignition/starter/stall).
  * `g` / `n` — broken break-groups / node snapshot.
  * `cp` — coupler attach/detach.
  * `f` — vehicle fire state: `{on:0|1, n:[cid,...]}` (burning node ids) or `{on:1, all:1}` (fully ablaze). Replayed to late joiners while burning; cleared on extinguish.

#### `0x12` — VehicleGearboxDiff *(Reserved)*
* Reserved for explicit gearbox/s drivetrain state if electrics/controller diff proves insufficient.

#### `0x13` — VehicleDamageDiff *(Reserved)*
* Reserved for node/beam damage deltas.

#### `0x14–0x1F` — Reserved

---

### 4.3 `0x20 – 0x2F` — Vehicle Occupancy

> **Channel:** TCP only

#### `0x20` — VehicleEnter
* **Direction:** Client → Server → All clients
* **Channel:** TCP only
* **When:** A player enters a vehicle seat.
* **Payload:**
  ```json
  {"v":"42","p":5,"s":"driver"}
  ```
* **Schema:**
  * `v` — `VehicleID` (global id string)
  * `p` — `PlayerID` entering
  * `s` — seat name
* **Design note:** Entering the **driver** seat makes that player the vehicle's sync owner; the server recomputes `pickSyncOwner` and, if it changed, broadcasts `0x35`. The lock state is checked against the **spawner** policy.

#### `0x21` — VehicleExit
* **Direction:** Client → Server → All clients
* **Channel:** TCP only
* **When:** A player exits a vehicle.
* **Payload:**
  ```json
  {"v":"42","p":5}
  ```
* **Design note:** When the **driver** exits, the server recomputes `pickSyncOwner` (spawner if online, else least-loaded) and broadcasts `0x35` if the sync owner changed.

#### `0x22` — VehicleSeatChange
* **Direction:** Client → Server → All clients
* **Channel:** TCP only
* **When:** A player switches seats inside the same vehicle.
* **Payload:**
  ```json
  {"v":"42","p":5,"s":"passenger"}
  ```

#### `0x23–0x2F` — Reserved

---

### 4.4 `0x30 – 0x3F` — Vehicle Lifecycle

> **Channel:** TCP only  
> **Reliability:** Critical — these packets MUST be delivered and acked.

#### `0x30` — VehicleSpawn
* **Direction:**
  * Client → Server: request
  * Server → All: broadcast
* **Channel:** TCP only
* **When:** Player spawns a new vehicle from the garage or Lua.
* **Client request payload:**
  ```json
  {"car":{"jbm":"etk800","config":"..."},"cid":7}
  ```
  * `car` — full vehicle configuration JSON (same shape as legacy spawn data).
  * `cid` — optional client correlation id (monotonic per session). The server echoes it back unchanged in the broadcast so the spawner matches its own echo by id, not by arrival order.
* **Server broadcast payload:**
  ```json
  {"v":"42","o":5,"so":5,"n":"PlayerName","r":"SCR","car":{"jbm":"etk800","config":"..."},"cid":7,"h":2463534242,"lm":0,"u":42}
  ```
  * `v` — global `VehicleID` string assigned by the server.
  * `o` — spawner `PlayerID` (attribution; may go stale after a reconnect)
  * `so` — current sync-owner `PlayerID` (at spawn time this is the spawner; `-1` only if the server is otherwise empty)
  * `n` — spawner display name
  * `r` — spawner role tag (empty if the spawner is offline, e.g. during join-sync)
  * `car` — full vehicle configuration JSON
  * `cid` — present only when the originating client supplied one; only the spawner uses it.
  * `h` — server-computed config hash (FNV-1a over the stored config). Present on confirmed spawns and in join-sync (§9). Clients store it and compare against the manifest (`0x36`) to detect config drift.
  * `lm` — lock mode (`0` open / `1` passenger-only / `2` closed). See `0x39`.
  * `u` — owner **static** account id (persistent; `-1` for guest/loopback owners). Distinct from `o`, which is the per-session id.
* **Design note:** The server MUST validate spawn limits and Lua hooks (`onVehicleSpawn`) before broadcasting. If rejected, the server sends `0x31` VehicleDelete to the requesting client only (the `cid` is still echoed so the client clears its pending entry). The same packet is replayed for every existing vehicle during a joining client's initial sync (§9), so a client may receive a spawn whose `o` equals its own id; with no matching pending `cid` it MUST treat that as a remote vehicle.

#### `0x31` — VehicleDelete
* **Direction:** Client → Server → All clients
* **Channel:** TCP only
* **When:** Player deletes their vehicle, or server rejects a spawn / forces deletion.
* **Payload:**
  ```json
  {"v":"42","o":5}
  ```
  * `o` is optional in client→server (server infers from the vehicle), but mandatory in server broadcasts (it carries the spawner id).
* **Design note:** Deletion is authoritative and explicit — only the vehicle's current **sync owner** or its **spawner** may delete it (`0x31`), or server-side Lua via `NodeMP.vehicles.remove(vehicleId)`. Vehicles are persistent: a player disconnecting does **NOT** delete their vehicles (see §7).

#### `0x32` — VehicleReset
* **Direction:** Client → Server → All clients
* **Channel:** TCP only
* **When:** Player resets a vehicle (repair / respawn at last road position).
* **Payload:**
  ```json
  {"v":"42","o":5,"d":{"pos":[0.0,0.0,0.0],"rot":[0.0,0.0,0.0,1.0]}}
  ```
  * `v` — `VehicleID` (global id string)
  * `d` — optional reset-state JSON (e.g. initial transform). Empty `d` means a default reset.

#### `0x33` — VehiclePaintChange
* **Direction:** Client → Server → All clients
* **Channel:** TCP only
* **When:** Player changes vehicle paint or material configuration.
* **Payload:**
  ```json
  {"v":"42","o":5,"p":[{"base":"#FF0000","roughness":0.5}]}
  ```
  * `v` — `VehicleID` (global id string)
  * `p` — paint array (same schema as legacy `Op` body).
  * In the **server broadcast**, an `h` field (updated config hash) is added after the paint is persisted, so receivers refresh their stored hash and the manifest stays consistent.

#### `0x34` — VehicleConfigChange
* **Direction:** Client → Server → All clients
* **Channel:** TCP only
* **When:** Player edits an existing vehicle (parts swap, tuning, etc.).
* **Payload:**
  ```json
  {"v":"42","o":5,"d":{"parts":{"etk800_body":"etk800_body_sedan"}}}
  ```
  * `v` — `VehicleID` (global id string)
  * `d` — diff or full config JSON, depending on client implementation. The server treats it as the new authoritative config and updates its registry.
  * In the **server broadcast**, an `h` field (updated config hash) is added after the config is applied, so receivers refresh their stored hash.

#### `0x35` — VehicleSyncOwnerChange
* **Direction:** Server → All clients
* **Channel:** TCP only
* **When:** The server (re)assigns the sync authority of a vehicle — at spawn, on driver enter/exit, when the current sync owner disconnects, or during load-balancing when a client connects/leaves.
* **Payload:**
  ```json
  {"v":"42","so":7}
  ```
  * `v` — `VehicleID` (global id string)
  * `so` — new sync-owner `PlayerID` (`-1` = none; only when the server has no eligible clients).
* **Design note:** The client that becomes the sync owner starts sending state for this vehicle (see §5.3 for sync profiles) and switches the local vehicle to the "local" role; the previous owner stops and switches it to "remote". This is the only packet that changes which client is authoritative for a vehicle.

#### `0x36` — VehicleManifest
* **Direction:** Server → All clients
* **Channel:** TCP only
* **When:** Periodically (env `NODEMP_MANIFEST_INTERVAL_S`, default 15s; `0` disables) to every synced client. It is the authoritative snapshot of the world's vehicle set used for client-side reconciliation.
* **Payload:**
  ```json
  {"veh":[{"v":"42","o":5,"so":7,"h":2463534242}]}
  ```
  * `veh` — array of all (non-unicycle) vehicles: `v` global id, `o` spawner, `so` sync owner, `h` config hash.
* **Design note:** On receipt (only while fully synced) the client reconciles: vehicles in the manifest but missing locally are pulled via `0x37`; local vehicles absent from the manifest are deleted (missed `0x31`); a differing `so` applies a sync-owner change; a differing `h` (only for vehicles the client does **not** own) triggers a delete-then-`0x37` to re-pull the config. The sync owner never self-resyncs its own vehicle (it never receives its own `0x33`/`0x34` echo, so its stored hash is intentionally stale).

#### `0x37` — VehicleResyncRequest
* **Direction:** Client → Server
* **Channel:** TCP only
* **When:** The client's manifest reconciliation needs the full state of one vehicle (it is missing locally, or its config drifted).
* **Payload:**
  ```json
  {"v":"42"}
  ```
* **Design note:** The server responds by re-streaming that single vehicle to the requester only — a `0x30` spawn followed by its accumulated dynamic-state replay (`0x10`/`0x11`), identical to the per-vehicle step of the join sync (§9). If the vehicle no longer exists, the server ignores the request (the client's reconcile deletes it locally instead). Clients rate-limit repeat requests per vehicle.

#### `0x38` — VehicleStateBlob
* **Direction:** Sync owner → Server → other clients (and Server → joiner during sync)
* **Channel:** TCP only
* **When:** The sync owner periodically captures the vehicle's **complete physical state** and uploads it; the server stores it and replays it on join/resync. This is what lets a damaged car keep its damage (and deformation, part condition, fuel, gearbox, hydros) after its owner disconnects.
* **Payload:**
  ```json
  {"v":"42","s":"<base64 state blob>"}
  ```
  * `v` — global vehicle id.
  * `s` — opaque, engine-specific base64 snapshot produced by the `statepack` vehicle module (broken/deformed beams, node positions, hydros, driver inputs, torsionbars, engine speed, gearbox, plus fuel + part-condition metadata).
* **Design note:** Only the current sync owner may set the blob; the server rejects others and caps the blob at 4 MiB (typical blobs are a few hundred KB; the wire is zlib-compressed). The owner sends at most every ~2 s and only when the blob actually changed (an intact, unchanged car costs nothing). On the receiving side the snapshot is applied **after** the coarse `0x10`/`0x11` replay so it wins. Node positions are only included when the car is actually damaged. During join sync the blob is buffered by the client until the vehicle's spawn (queued in the apply queue) has landed, then applied — see §9.

#### `0x39` — VehicleLockChange
* **Direction:** Owner → Server → all clients
* **Channel:** TCP only
* **When:** The owner changes a car's access policy (who may drive / enter it). The server stores the policy on the vehicle (it persists across the owner leaving) and rebroadcasts it.
* **Payload:**
  ```json
  {"v":"42","m":1}
  ```
  * `v` — global vehicle id.
  * `m` — lock mode: `0` = open (anyone may drive/ride), `1` = passenger-only (only the owner may drive; others may take passenger seats — no stealing), `2` = closed (only the owner may enter at all).
* **Design note:** The server only accepts the change from the vehicle's **owner** — its current spawner session, or a reconnected owner matched by static account id (see §5.3). It is enforced in the occupancy handlers (`0x20` enter and `0x22` seat-change): a non-owner is blocked from the driver seat in mode 1, and from any seat in mode 2. The owner bypasses the lock. The mode is also carried in the spawn packet (`lm`) so joiners learn it without waiting for a `0x39`.

#### `0x3A–0x3F` — Reserved

---

### 4.5 `0x40 – 0x4F` — Reserved (was Freeze / State)

> **Status: NOT IMPLEMENTED — reserved.** The server does not send these packets today
> (`PacketTypes.h` marks `0x40-0x4F` as reserved). The freeze / LOD design below is kept
> for reference for a possible future implementation; clients must not expect it now.
> **Channel:** TCP only · **Semantics:** Server-generated; clients do not send these.

#### `0x40` — VehicleFreeze
* **Direction:** Server → Client (viewer-specific)
* **Channel:** TCP only
* **When:** A vehicle transitions into the `Frozen` state for a specific viewer because distance > 500 m.
* **Payload:**
  ```json
  {"v":"42"}
  ```
  * `v` — `VehicleID` (global id string)

#### `0x41` — VehicleUnfreeze
* **Direction:** Server → Client (viewer-specific)
* **Channel:** TCP only
* **When:** A vehicle transitions out of `Frozen` for a specific viewer.
* **Payload:**
  ```json
  {"v":"42"}
  ```
  * `v` — `VehicleID` (global id string)
* **Design note:** After sending `0x41`, the server MUST immediately send `0x42` VehicleSaveState so the client can restore physics state.

#### `0x42` — VehicleSaveState
* **Direction:** Server → Client (viewer-specific)
* **Channel:** TCP only
* **When:** Immediately after `0x41` to provide the full frozen-state snapshot (~10–13 KB).
* **Payload:**
  ```json
  {"v":"42","s":{"type":"vehicle_save","data":{...},"position":{...},"last_velocity":[1.0,0.0,0.0],"last_angular_velocity":[0.0,0.0,0.0]}}
  ```
  * `v` — `VehicleID` (global id string)
  * `s` — opaque state blob. The exact keys inside `s` are server-defined; clients must pass the blob verbatim to the game engine.
* **Design note:** This packet is exempt from the 400-byte compression hint — the transport layer MUST compress it automatically because it is always > 10 KB.

#### `0x43–0x4F` — Reserved

---

### 4.6 `0x50 – 0x5F` — Player / Chat

> **Channel:** TCP only

#### `0x50` — PlayerJoin
* **Direction:** Server → All clients
* **When:** A new player finishes auth and sync.
* **Payload:**
  ```json
  {"p":5,"n":"PlayerName","r":"SCR","g":false,"u":42}
  ```
  * `p` — `PlayerID` (the **dynamic** per-session id; changes on every reconnect)
  * `n` — display name
  * `r` — role tag
  * `g` — guest flag (bool)
  * `u` — **static** account id (persistent, assigned at registration; `-1` for guests). Also sent in `PlayerIDAssign` (`0x83`) to the player itself and in `PlayerList` (`0x54`) entries.

#### `0x51` — PlayerLeave
* **Direction:** Server → All clients
* **When:** A player disconnects gracefully or times out.
* **Payload:**
  ```json
  {"p":5,"n":"PlayerName","m":"left the server"}
  ```

#### `0x52` — PlayerKick
* **Direction:** Server → Target client (and optionally broadcast to admins)
* **When:** Server or Lua script kicks a player.
* **Payload:**
  ```json
  {"p":5,"r":"You were kicked for inactivity"}
  ```

#### `0x53` — PlayerRoleChange
* **Direction:** Server → All clients
* **When:** A player's role tag is updated at runtime (e.g. promotion).
* **Payload:**
  ```json
  {"p":5,"r":"ADM"}
  ```

#### `0x54` — PlayerList
* **Direction:** Server → Client
* **When:** On initial sync and whenever the player roster changes.
* **Payload:**
  ```json
  {"c":5,"m":10,"l":[{"p":1,"n":"Alice","u":42},{"p":2,"n":"Bob","u":-1}]}
  ```
  * `c` — current count
  * `m` — max slots
  * `l` — array of `{p, n, u}` objects (`u` = static account id, `-1` for guests)

#### `0x55` — ChatMessage
* **Direction:** Client → Server → All clients
* **When:** Player sends a chat message.
* **Client payload:**
  ```json
  {"m":"Hello world!"}
  ```
* **Server broadcast payload:**
  ```json
  {"f":"PlayerName","m":"Hello world!"}
  ```
  * `f` — sender display name (server-injected; clients MUST ignore any `f` supplied by another client).
* **Design note:** Empty messages and messages > 500 UTF-8 code units are dropped. Rate-limiting applies.

#### `0x56` — PlayerNameSync
* **Direction:** Server → Client
* **When:** During initial sync, tells the client its own canonical name.
* **Payload:**
  ```json
  {"p":5,"n":"PlayerName"}
  ```

#### `0x57` — ServerMap
* **Direction:** Server → Client
* **When:** During initial handshake, before vehicle sync.
* **Payload:**
  ```json
  {"m":"/levels/GridMap/main"}
  ```

#### `0x58` — PlayerCountUpdate
* **Direction:** Server → All clients
* **When:** Lightweight update when only the count changed (no name list needed).
* **Payload:**
  ```json
  {"c":5,"m":10}
  ```

#### `0x59–0x5F` — Reserved

---

### 4.7 `0x60 – 0x6F` — System / Events

> **Channel:** TCP only

#### `0x60` — Ping
* **Direction:** Client → Server
* **When:** Heartbeat / latency measurement.
* **Payload:** empty (`{}`) or none (type ID alone is sufficient).

#### `0x61` — Pong
* **Direction:** Server → Client
* **When:** Response to `0x60`.
* **Payload:** empty (`{}`).

#### `0x62` — AuthSuccess
* **Direction:** Server → Client
* **When:** Immediately after version and key handshake succeed, before resource sync.
* **Payload:**
  ```json
  {"p":5}
  ```
  * `p` — the `PlayerID` assigned to this connection.

#### `0x63` — SyncRequest
* **Direction:** Client → Server
* **When:** Client is ready to receive the initial world state (vehicles of all existing players).
* **Payload:** empty (`{}`).
* **Design note:** Replaces legacy `H`.

#### `0x64` — SyncBegin
* **Direction:** Server → Client
* **When:** Server is about to start streaming the initial vehicle list.
* **Payload:** empty (`{}`).

#### `0x65` — SyncEnd
* **Direction:** Server → Client
* **When:** All initial vehicles have been sent; client may now treat itself as fully synced.
* **Payload:** empty (`{}`).

#### `0x66` — CustomEvent
* **Direction:** Bidirectional (Client ↔ Server) and Server → Client
* **When:** Arbitrary Lua or game-level events.
* **Payload:**
  ```json
  {"n":"myEvent","d":{"foo":42}}
  ```
  * `n` — event name
  * `d` — event data (any JSON value)
* **Design note:** The server blocks a hardcoded exclusion list of server-only events (`onInit`, `onPlayerAuth`, `onVehicleSpawn`, `postVehicleSpawn`, …). See legacy `HandleEvent` for the full list.

#### `0x67` — LuaEvent
* **Direction:** Server → Client (or Client → Server for script-defined events)
* **When:** Distinguishes engine Lua events from generic custom events.
* **Payload:**
  ```json
  {"n":"onSomething","d":"string_or_json"}
  ```

#### `0x68` — RelayBroadcast
* **Direction:** Client → Server → All other clients
* **When:** Client wants to send an opaque payload to every other player with minimal server parsing.
* **Payload:**
  ```json
  {"d":"base64_or_escaped_string"}
  ```
* **Design note:** Replaces legacy `N`. Because the payload is opaque, the server does not inspect `d`; it only validates rate limits and forwards.

#### `0x69` — ModListRequest
* **Direction:** Client → Server
* **When:** During resource sync.
* **Payload:** empty (`{}`).

#### `0x6A` — ModListResponse
* **Direction:** Server → Client
* **When:** Response to `0x69`.
* **Payload:**
  ```json
  {"mods":[{"n":"myMod","s":12345,"v":"1.2.3"}]}
  ```

#### `0x6B` — FileRequest
* **Direction:** Client → Server
* **When:** Client needs a mod or resource file.
* **Payload:**
  ```json
  {"f":"myMod.zip"}
  ```

#### `0x6C` — FileStreamBegin
* **Direction:** Server → Client
* **When:** Server agrees to send a file (replaces legacy `AG`).
* **Payload:**
  ```json
  {"f":"myMod.zip","s":5242880}
  ```
  * `s` — total file size in bytes.

#### `0x6D` — FileStreamChunk
* **Direction:** Server → Client
* **When:** Raw file data chunk. Because JSON base64 is inefficient, the production implementation MAY send raw binary after a minimal header; the JSON example below is illustrative.
* **Payload (illustrative JSON):**
  ```json
  {"i":0,"d":"<base64_chunk>"}
  ```
  * `i` — chunk index
  * `d` — base64-encoded bytes (production: switch to raw binary `type_id` + chunk index + raw bytes).

#### `0x6E` — FileNotFound
* **Direction:** Server → Client
* **When:** Requested file does not exist or access is denied.
* **Payload:** empty (`{}`).

#### `0x6F` — ResourceSyncDone
* **Direction:** Client → Server
* **When:** Client has finished requesting all resources.
* **Payload:** empty (`{}`).

---

### 4.8 `0x70 – 0x7F` — Server UI messages (core)

* `0x70` **Notification** — Server → Client: a transient toast/notification.
* `0x71` **Dialog** — Server → Client: a confirmation / markdown dialog.
* `0x72 – 0x7F` — reserved for future core use. Plugin authors MUST NOT use IDs in this range.

---

### 4.9 `0x80 – 0xFF` — Handshake (pre-auth) + Mod / Plugin Extensions

* **Handshake (core, `0x80 – 0x85`):** `0x80` ClientVersion (launcher → server),
  `0x82` AuthKey (launcher → server), `0x83` PlayerIDAssign (server → launcher),
  `0x84` ServerError, `0x85` ServerKick. Reserved by the core; plugins MUST NOT use these.
  (The UDP-binding magic `0x0E` is also part of the handshake — server → launcher, 64 raw
  bytes, sent over TCP.)
* **Mod / Plugin extensions (`0x86 – 0xFF`):** opaque to the server core; routed by
  subscription tables or relayed verbatim (`0x68`). Plugin authors MAY register handlers
  here; collisions are the plugin ecosystem's responsibility. **Channel:** TCP.

---

## 5. State-Diff Semantics (Normative)

### 5.1 Electrics & Controllers
1. Each client maintains a `lastSentElectrics[Vid]` map.
2. On every local vehicle update, the client computes the set difference against `lastSentElectrics[Vid]`.
3. Only changed keys are placed into the `d`/`i` object of `0x10` or the `c`/`l`/`e` keys of `0x11`.
4. The server validates ownership and forwards verbatim. **Since v1.1 it also merges the diff into a per-vehicle last-known snapshot** (electrics, inputs, powertrain modes, engine/ignition, controller calls, fire state). It still does not interpret the values.
5. The receiving client merges the incoming object into its local state.
6. **Late-join replay:** when a new client finishes the initial vehicle list (`0x65`), the server replays each vehicle's accumulated snapshot (`0x10`/`0x11`) right after its `0x30` spawn, so the joiner sees the vehicle's current lights, engine/gear, controller modes and whether it's on fire — not just its spawn config. Node deformation (`n`) and couplers (`cp`) are not replayed.

### 5.2 Freeze / Unfreeze Sequence

> **NOT IMPLEMENTED** — describes the reserved `0x40-0x4F` design (see §4.5). Kept for
> reference only; the current server does not freeze distant vehicles.

1. Server detects a viewer-vehicle pair crosses the `LOD_DISTANCE` (500 m) boundary.
2. Server sends `0x40` VehicleFreeze **to that viewer only** via TCP.
3. When the pair later re-enters `FULL_PHYSICS_DISTANCE` (300 m), server sends:
   a. `0x41` VehicleUnfreeze
   b. `0x42` VehicleSaveState (within the same TCP flush)
4. The client MUST apply the save state before unfreezing physics.
5. **Freeze transition values:**
   * `> 500 m` → `Frozen`
   * `300 m – 500 m` → `LOD` (client may reduce physics/update frequency locally)
   * `< 300 m` → `Active`

### 5.3 Sync-Owner Authority & Persistence (Normative)

Every vehicle has three roles:

* **spawner** (`o`) — the player who created it. Attribution only; survives in the registry even after the spawner disconnects (the display name is preserved from spawn time). Used for spawn-limit accounting and lock checks.
* **syncOwner** (`so`) — the single connected client currently responsible for transmitting the vehicle's state. The server is the sole authority over this assignment and announces every change with `0x35`.
* **driver** — the player currently in the driver seat (tracked via `0x20`/`0x21`), if any.

**Sync-owner selection** (`pickSyncOwner`, highest priority first):
1. The current **driver**, if connected (physical authority while driving).
2. The **spawner**, if connected (a player preferentially syncs their own vehicles).
3. Otherwise the **least-loaded** connected client (fewest assigned vehicles; ties broken by lowest `PlayerID`).
4. Otherwise `-1` (no clients connected — nobody can sync).

Selection is recomputed on: spawn, driver enter (`0x20`), driver exit (`0x21`), disconnect of the current sync owner, and on client connect (load-balancing). When the result changes, the server broadcasts `0x35 {v, so}`. A **balancer** redistributes only *orphaned* vehicles (no driver, spawner offline): it moves one vehicle at a time from the most- to least-loaded client while `max − min > 1`. Vehicles synced by their driver or spawner are never moved by the balancer.

**Sync profiles** (what the sync owner transmits):
* **driver profile** — the sync owner is also the local driver: full state — `0x01` (pos/rot/vel + inputs) plus diffs `0x10`/`0x11` and node updates.
* **keeper profile** — the sync owner has no local driver (vehicle assigned by balancing): transform only (`0x01` pos/rot/vel; inputs zeroed/omitted). Diff streams (`0x10`/`0x11`, nodes) are **not** sent — with no driver the state does not change and receivers keep their last-known snapshot. While velocity ≈ 0 the `0x01` rate is reduced (keep-alive), rising again on movement.

**Persistence:** a player disconnect (`0x51`) does **not** delete vehicles. For each vehicle whose `syncOwner` was the departing player, the server runs `pickSyncOwner` (spawner if online, else least-loaded) and broadcasts `0x35`; then a balancer pass evens the load. Vehicles are removed only by an explicit `0x31` (from sync owner or spawner) or by Lua (`NodeMP.vehicles.remove`), and `syncOwner` becomes `-1` only when the last client leaves.

**Owner identity & reconnect rebind:** each vehicle also stores its owner's **static** account id (`u`, persistent, separate from the per-session spawner `o`). When a player finishes joining, the server scans the world and re-binds every vehicle they own (matched by static id; or by spawner **name** for guest/loopback owners with no account) back to their new session id, then runs `pickSyncOwner`. The effect is that a returning owner immediately re-acquires their cars (spawn accounting, deletes, and — unless another player is actively driving — sync authority), and `0x39` lock changes are accepted from them again. The static/dynamic split is also surfaced to clients: `0x83`/`0x50`/`0x54` carry `u` (static) alongside `p` (dynamic).

---

## 6. Legacy Migration Map

| Legacy code | New ID | Packet name | Channel | Notes |
|-------------|--------|-------------|---------|-------|
| `Z` | `0x01` | VehicleTransform | UDP | `v` is now a single global id string (was `"OWNER-VID"`) |
| `V`–`Y` | `0x01` / TCP diffs | VehicleTransform / diffs | UDP / TCP | Generic vehicle relays absorbed into explicit type system |
| `Os` | `0x30` | VehicleSpawn | TCP | `req_id` + `car` replaces `Os:0:...` |
| `Oc` | `0x34` | VehicleConfigChange | TCP | `d` carries diff/full config |
| `Od` | `0x31` | VehicleDelete | TCP | `v` only |
| `Or` | `0x32` | VehicleReset | TCP | `d` optional reset state |
| `Op` | `0x33` | VehiclePaintChange | TCP | `p` array |
| `Ot` | — | — | — | Legacy telemetry; absorbed into `0x10`/`0x11` or reserved |
| `Om` | — | — | — | Legacy generic mod data; absorbed into `0x11` or plugin range |
| `C` | `0x55` | ChatMessage | TCP | Structured JSON |
| `E` | `0x66` | CustomEvent | TCP | Structured JSON |
| `N` | `0x68` | RelayBroadcast | TCP | Structured wrapper |
| `H` | `0x63` | SyncRequest | TCP | — |
| `p` (TCP) | `0x60` / `0x61` | Ping / Pong | TCP | — |
| `P` (TCP) | `0x62` | AuthSuccess | TCP | `p` field carries assigned ID |
| `A` | `0x62` | AuthSuccess | TCP | — |
| `U` | handshake | — | UDP | UDP magic token sent raw after auth; no logical packet type |
| `M` | `0x57` | ServerMap | TCP | — |
| `Sn` | `0x56` | PlayerNameSync | TCP | — |
| `Ss` | `0x54` | PlayerList | TCP | Structured JSON |
| `J` | `0x50` | PlayerJoin | TCP | — |
| `L` | `0x51` | PlayerLeave | TCP | — |
| `K` | `0x52` | PlayerKick | TCP | — |
| `Fs` | `0x40` | VehicleFreeze | TCP | `v` only |
| `Fu` | `0x41` | VehicleUnfreeze | TCP | `v` only |
| `f` | `0x6B` | FileRequest | TCP | — |
| `SR` | `0x69` | ModListRequest | TCP | — |
| `AG` | `0x6C` | FileStreamBegin | TCP | — |
| `CO` | `0x6E` | FileNotFound | TCP | — |
| `Done` | `0x6F` | ResourceSyncDone | TCP | — |

---

## 7. Security & Validation Rules

1. **Sync-authority enforcement** — State-bearing packets (`0x01`, `0x10`, `0x11`, `0x32`, `0x33`, `0x34`) are accepted **only from the vehicle's current sync owner** (`syncOwner`). `0x31` (delete) is accepted from the sync owner **or** the spawner. Occupancy packets (`0x20`–`0x22`) carry the acting player and are subject to server policy (lock is checked against the spawner). A packet from any other client is dropped.
2. **UDP ignored types** — If a TCP-only type ID arrives over UDP, the server MUST drop the datagram and optionally log a warning.
3. **Rate limits** — Per-player rate limits apply to chat (`0x55`), transforms (`0x01`), resync (`0x37`) and custom events / relays (`0x66`/`0x68`); over-limit packets are dropped. Spawns (`0x30`) are throttled, and PPS is monitored.
4. **Size limits** — Unauthenticated clients are limited to 4 KB per TCP packet; authenticated clients to 16 MB (enforced by the `int32` length header check). Diffs (`0x10`/`0x11`), custom events (`0x66`) and relays (`0x68`) are additionally capped at 64 KiB each; the state blob (`0x38`) at 4 MiB.
5. **Compression bombs** — The transport layer MUST enforce `MAX_DECOMPRESSION_BUFFER_SIZE` (30 MB) and disconnect clients that exceed it.

---

## 8. Appendix: C++ Enum Skeleton (Informative)

```cpp
enum class PacketType : uint8_t {
    // 0x00-0x0F : UDP State (high-frequency, unreliable)
    VehicleTransform      = 0x01,
    VehicleTransformBatch = 0x02, // reserved
    UDPMagic              = 0x0E, // server -> launcher: 64 raw bytes (UDP-binding magic, sent over TCP)

    // 0x10-0x1F : Vehicle Property Diffs
    VehicleElectricsDiff    = 0x10,
    VehicleControllersDiff  = 0x11,
    VehicleGearboxDiff      = 0x12, // reserved
    VehicleDamageDiff       = 0x13, // reserved

    // 0x20-0x2F : Vehicle Occupancy
    VehicleEnter      = 0x20,
    VehicleExit       = 0x21,
    VehicleSeatChange = 0x22,

    // 0x30-0x3F : Vehicle Lifecycle
    VehicleSpawn           = 0x30,
    VehicleDelete          = 0x31,
    VehicleReset           = 0x32,
    VehiclePaintChange     = 0x33,
    VehicleConfigChange    = 0x34,
    VehicleSyncOwnerChange = 0x35,
    VehicleManifest        = 0x36,
    VehicleResyncRequest   = 0x37,
    VehicleStateBlob       = 0x38,
    VehicleLockChange      = 0x39,

    // 0x40-0x4F : Reserved (was freeze / state — not implemented)

    // 0x50-0x5F : Player / Chat
    PlayerJoin         = 0x50,
    PlayerLeave        = 0x51,
    PlayerKick         = 0x52,
    PlayerRoleChange   = 0x53,
    PlayerList         = 0x54,
    ChatMessage        = 0x55,
    PlayerNameSync     = 0x56,
    ServerMap          = 0x57,
    PlayerCountUpdate  = 0x58,

    // 0x60-0x6F : System / Events
    Ping               = 0x60,
    Pong               = 0x61,
    AuthSuccess        = 0x62,
    SyncRequest        = 0x63,
    SyncBegin          = 0x64,
    SyncEnd            = 0x65,
    CustomEvent        = 0x66,
    LuaEvent           = 0x67,
    RelayBroadcast     = 0x68,
    ModListRequest     = 0x69,
    ModListResponse    = 0x6A,
    FileRequest        = 0x6B,
    FileStreamBegin    = 0x6C,
    FileStreamChunk    = 0x6D,
    FileNotFound       = 0x6E,
    ResourceSyncDone   = 0x6F,

    // 0x70-0x7F : Server UI messages (core)
    Notification       = 0x70,
    Dialog             = 0x71,

    // 0x80-0x85 : Handshake (pre-auth)
    ClientVersion      = 0x80, // launcher -> server
    AuthKey            = 0x82, // launcher -> server
    PlayerIDAssign     = 0x83, // server -> launcher
    ServerError        = 0x84, // server -> launcher
    ServerKick         = 0x85, // server -> launcher

    // 0x86-0xFF : Mod / Plugin extensions
};
```

---

## 9. Launcher Integration & Channel Routing

The protocol is designed to work with the existing **BeamMP Launcher** (or a compatible replacement) without modifying the launcher's network core.

### 9.1 Launcher Proxy Logic (recap)
The launcher listens on **TCP localhost:4445** for the game client and maintains two outbound sockets to the server:

| Direction | Protocol | Framing |
|-----------|----------|---------|
| Launcher → Server (TCP) | `[int32 length][payload]` | Same as §2.1 |
| Launcher → Server (UDP) | `[uint8 ClientID+1][':'][payload]` | No length prefix |
| Server → Launcher (TCP) | `[int32 length][payload]` | Same as §2.1 |
| Server → Launcher (UDP) | raw datagram | Launcher strips no prefix; server must prepend none |

The launcher decides **TCP vs UDP** for each outgoing packet using a hardcoded first-byte filter:

```cpp
// Forced TCP (reliable / ack-required)
if (C == 'O' || C == 'T')  Ack = true;   // ack-required
if (C == 'N' || C == 'W' || C == 'Y' || C == 'V' || C == 'E' || C == 'C')
    Rel = true;                              // reliable
if (compressBound(size) > 1024) Rel = true; // compression heuristic
if (Ack || Rel || size > 1000)  // → TCP (SendLarge or TCPSend)
else                             // → UDP (UDPSend)
```

Because NodeMP uses `uint8` type IDs, the launcher sees the new IDs as raw bytes and applies the same heuristic. The NodeMP type ID assignments are deliberately placed so that:

* **UDP-only types (`0x00–0x0F`)** fall through the forced-TCP filter and travel UDP.
* **All other types (`0x10–0xFF`)** do not start with `O`, `T`, `N`, `W`, `Y`, `V`, `E`, or `C` **in ASCII**, but the launcher uses the raw byte value. Since `0x10 = 16` (DC1 control char) etc., these bytes are NOT in the launcher's forced-TCP list. However, because they are **semantically critical** (spawn, delete, freeze, chat), the **NodeMP server MUST reject any non-`0x00–0x0F` packet arriving over UDP** and treat it as a protocol violation.

### 9.2 VehicleID Format
Everywhere a vehicle is referenced on the wire, `v` is a **single global id** serialized as a decimal string:

```
"42"
```

* The value is a server-wide unique integer, allocated monotonically from a single atomic counter (`mNextID`).
* It does **not** encode the owner; spawner and sync-owner are separate fields (`o`, `so`).
* It is **never reused** within a server session, so a vehicle's identity is stable even if a player disconnects and another player later reuses that `PlayerID`.

**Examples:**
* `"0"` — the first vehicle ever spawned this session.
* `"42"` — the 43rd allocated id.

**Parsing rules (server-side):**
1. Parse the string as an unsigned integer.
2. If parsing fails, drop the packet.
3. Look the id up in the global `VehicleRegistry`; if it is unknown, drop the packet.

**Packing rules (server-side):**
```cpp
std::string PackVehicleID(VehicleID id) {
    return std::to_string(id);
}
```

**Rationale:** A global id decouples vehicle identity from player ids, which is what makes vehicle **persistence** and **sync-owner hand-off** possible. The value is kept as a string (not a JSON number) so table keys stay stable and JSON parsers never apply IEEE-754 rounding.

### 9.3 Known Limitations
* `spawner` (`o`) is a session `PlayerID` and can go stale between disconnect and reconnect; the display name is preserved from spawn time. On rejoin the server re-binds it from the owner's stored static account id (`u`) — see §5.3 "Owner identity & reconnect rebind". Guest/loopback owners (no account id) re-bind by spawner name, which is best-effort.
* The static account id reaches the game server via the backend redeem (`nodemp:<id>` identifier) for real connections; on a loopback dev connection it is taken from the launcher's `uid` auth-key hint (trusted only because the peer is same-machine).
* The `MaxCars` limit is counted per `spawner` over the live registry. Orphaned vehicles (spawner gone) are bounded only by the global cap; an idle-cleanup/timeout policy is left for the future.
* The balancer is event-driven (connect/disconnect/exit) and only moves a vehicle when the imbalance exceeds 1, to avoid constant migration churn and excess `0x35` traffic. A client assigned many parked vehicles sends only their static transform (cheap), and load evens out across clients.
