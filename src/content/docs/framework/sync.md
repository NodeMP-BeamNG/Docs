---
title: How synchronization works
description: Transport layers, packet categories, control modes, the 72-byte position snapshot, seats, damage, events and the node grabber - the full data flow of the NodeMP stack.
---

This page documents the actual data flow of the NodeMP stack (wire **v13**):
what travels where, at which rate, and who is allowed to send what.

## Transport: three hops

```
BeamNG mod (GE Lua)  <-- TCP 4444 (commands) + TCP 4445 (game) -->  Launcher
Launcher             <-- TCP + TLS 1.3 (TOFU pin) + UDP        -->  Server
```

* The mod talks to the launcher over two loopback TCP channels: **4444**
  (command: connect/quit/status/map/mod list) and **4445** (relay: all game
  traffic). The first frame on both channels is a per-run auth token.
* The launcher owns the TLS 1.3 session with the server (certificate pinned
  trust-on-first-use) and decides what rides UDP: only `State::Pos` and
  `State::HeadPose`, each with an HMAC anti-spoof trailer. The mod never sees
  UDP or compression.
* Every packet is `[u32 LE length][category][subtype][flags][body]`.
  Categories: Handshake, Session, Content, Vehicle, State, Event, Command,
  Module. The full normative contract lives in `server/include/net/Protocol.h`
  (byte-identical copy in the launcher; Lua and Python mirrors are asserted by
  `wire_parity_test.py` against golden fixtures).

## Who streams a vehicle: control modes L/S/R

| Mode | Meaning | What this client sends for it |
|------|---------|-------------------------------|
| `L`  | local driver | everything, controls folded into the snapshot |
| `S`  | sync authority (keeper of an empty/foreign car) | everything except controls |
| `R`  | remote ghost | nothing; inbound state overwrites it, local inputs are ghost-suppressed |

The server assigns driver/authority (`Driver`/`Authority`/`AuthRevoke`
broadcasts, each stamped with a per-vehicle **seat epoch** so stale packets are
dropped and gaps trigger a resync).

The outbound scheduler polls sync-map vehicles at fixed rates: **position
60 Hz**, inputs 30, electrics 30, controllers 30, nodes/breakgroups 15,
powertrain 10 (+ NodeMP extras: fire 4 Hz, optional full-state 0.5 Hz). All
channels are diff-gated - an idle car sends almost nothing.

## Position: the only binary state channel

`State::Pos` is a fixed **72-byte snapshot**: position, quaternion, linear and
angular velocity (f32), the five driving controls quantized to single bytes
(steering/throttle/brake/clutch/parking brake) + gear, sender timer, ping,
sequence counter and flags. It rides UDP with a per-datagram HMAC.

The receiver applies it through a prediction/correction pipeline in the
vehicle VM: dead-reckoned target, PD-style velocity corrections (force-capped),
a velocity-scaled teleport ladder for large errors, and NodeMP's low-speed
shaping - as the sender's car approaches standstill the correction stiffness
falls toward a floor and the target switches from extrapolation to
interpolation between the two latest packets (this kills the "car rocking on a
flatbed at mid ping" feedback loop). Correction strength, teleport threshold,
view distance and the statics shaping are user-tunable from the settings panel.

The server also runs distance-based interest management for Pos relays
(default radius 2000 m: full rate up close, half rate in the outer ring,
culled beyond).

## Everything else per vehicle

* Secondary channels (`u32 gid + JSON` over TCP): electrics, nodes/breakgroups,
  controllers, powertrain/engine. The server caches the last body per
  (vehicle, subtype) and replays them to joiners, so late joiners see correct
  lights and damage.
* Lifecycle: `SpawnReq -> Spawn` (server assigns the global id and caches the
  config), `Edit/Reset/Paint/Delete` accepted only from the driver/authority,
  `ConfigHash` reconciliation with silent targeted resyncs.
* Damage (v4): the authority reports a damage counter; when it grows and
  settles it uploads a deformation blob. Joiners spawn damaged cars in ONE
  spawn.
* Seats (v8/v9): transactional `SeatClaim -> SeatVerdict` + epoch-stamped
  broadcasts; occupied cars grant passenger seats; a silent authority can be
  taken over after a grace period; since v13 a driver claim while the registry
  still thinks you drive another car performs an automatic seat change instead
  of dead-ending (`DeniedOccupied`).
* Vehicle locks (v12): `unlocked` / `driver-only` / `locked`, set server-side
  (NodeMP exposes them as the per-player policy in the settings panel).

## Events, chat and the relay resource

Client-emitted `Event` packets are **server-terminal**: they reach server Lua
resources only. NodeMP's chat, fire sync, remote trigger use and policy ride
`nodemp:*` events, forwarded between clients by the `nodemp-relay` server
resource (which also logs chat to the console, applies per-player vehicle
policy and answers the module manifest handshake).

## Node grabber (experimental, v12)

Ctrl+drag sends `NodeGrab {gid, action, node, target, force}` at up to 30 Hz.
The server forwards it as `NodeGrabSet` to the vehicle's **sync authority**
only when `[Experimental] NodeGrab = true` AND a resource explicitly allows it
via the fail-closed `onVehicleNodeGrabRequest` hook - so the pull is simulated
by the client that owns the car's physics and deforms identically for everyone.

## Head poses / freecam markers (v12)

Every client streams its camera pose (33 bytes: position, quaternion, freecam
flag) at 30 Hz over UDP. NodeMP renders a marker + nickname for players in
free camera, interpolated receiver-side for frame-smooth motion. Poses are
ephemeral: never cached, expired after 3 s.

## Nicknames (v13)

The launcher sends an optional player name in the handshake (`Launcher.cfg`
`"Name"` or `--name`). The server sanitizes it (control characters stripped,
UTF-8-safe 24-byte cap), de-duplicates against connected players with a
`#<id>` suffix, and falls back to the legacy `Player<id>` guest name when
empty.
