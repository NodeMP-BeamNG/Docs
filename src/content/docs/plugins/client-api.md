---
title: Client mod API
description: The client-side NodeMP.* Lua API for BeamNG mods and scripts — session, players, vehicles, chat, events, keys, and the per-vehicle (VE) subset.
---

This is a quick reference for the **client** API — the `NodeMP.*` table available to BeamNG mods
and scripts running inside the game. For server-side scripting see
[Server Lua API](/plugins/server-api/); for the packets underneath, see the
[wire protocol](/plugins/protocol/).

NodeMP exposes a single, stable global table **`NodeMP`** for third-party mods and
scripts. Use it instead of the internal extension globals (`nodemp_sync_vehicles`,
`nodemp_network_core`, …) — those are implementation details and may be renamed.

Every `NodeMP.*` function resolves its target lazily, so calling one before NodeMP
has fully started (or after a Lua reload) returns `nil`/`false` instead of erroring.

The table exists in **both** Lua states:
- **Game engine (GE)** — full API (session, players, vehicles, chat, events, keys, network).
- **Vehicle engine (VE)** — per-vehicle subset (keys, this vehicle's role, server-event relay).

```lua
if NodeMP and NodeMP.isInSession() then
    NodeMP.chat.send("hello from my mod")
end
```

---

## GE API (game engine)

### Session / connection
| Call | Returns |
|------|---------|
| `NodeMP.isLauncherConnected()` | bool — launcher control link up |
| `NodeMP.isInSession()` | bool — currently in a multiplayer session |
| `NodeMP.getCurrentServer()` | `{ ip, port, name, map, ... }` or nil |
| `NodeMP.getLauncherVersion()` | string |
| `NodeMP.connectToServer(ip, port, name)` | — |
| `NodeMP.leaveServer(goBack)` | — |
| `NodeMP.VERSION` | mod version string |

### Account / auth
| Call | Returns |
|------|---------|
| `NodeMP.isLoggedIn()` | bool |
| `NodeMP.getAccount()` | `{ success, username, role, id, ... }` |
| `NodeMP.getLocalPlayerID()` | your server player id (number) or nil |

### Players — `NodeMP.players`
`get(id)`, `getByName(name)`, `getAll()`, `count()`, `getRoleInfo(role)`.

### Vehicles — `NodeMP.vehicles`
`gameId` = local BeamNG object id; `vehicleId` = single **global** network id
(an integer string like `"42"`, unique server-wide, not owner-encoded).

`getAll()`, `getOwn()` (vehicles this client **syncs**), `isOwn(gameId)` (we are the
sync owner), `getServerId(gameId)`, `getGameId(vehicleId)`, `getByServerId(vehicleId)`,
`getByGameId(gameId)`, `getOwner(vehicleId)`, `getDriver(vehicleId)`,
`getSyncOwner(vehicleId)`, `count()`, `forEach(fn)`, `isSynced()`.

A vehicle has a `spawnerID` (creator) and a `syncOwnerID` (the client currently
syncing it). Vehicles are **persistent**: they survive their spawner leaving — the
server reassigns `syncOwner` and fires `onNodeMPVehicleSyncOwnerChanged`.

### Chat — `NodeMP.chat`
`send(message)`, `add(message)` (local-only line).

### Events — `NodeMP.events`
Custom events ride packet `0x66`; server-side Lua sees the same names.
```lua
NodeMP.events.on("myEvent", function(data) dump(data) end)   -- subscribe
NodeMP.events.triggerServer("myEvent", { foo = 42 })          -- send to server
NodeMP.events.triggerLocal("myEvent", { foo = 42 })           -- fire locally
NodeMP.events.off("myEvent")                                   -- unsubscribe
```

### Keys — `NodeMP.keys`
`onPressed(key, fn)`, `onReleased(key, fn)`, `getState(key)`.

### Raw network (advanced) — `NodeMP.network`
`send(typeByte, payloadTable)`, `isConnected()`. See the
[wire protocol](/plugins/protocol/) for type ids.

### Utility
`NodeMP.translate(key, default)`.

---

## VE API (inside a vehicle's Lua)

```lua
NodeMP.vehicleType()         -- "L" local / "R" remote, or nil
NodeMP.isRemote()            -- bool
NodeMP.isLocal()             -- bool
NodeMP.keys.onPressed(k, fn) -- key bridge (same as GE)
NodeMP.keys.getState(k)
NodeMP.triggerServer(name, data) -- relay a server event from vehicle code
```

---

## Legacy / BeamMP-style globals

These remain available for compatibility with existing server scripts:
`TriggerServerEvent`, `TriggerClientEvent`, `AddEventHandler`, `RemoveEventHandler`,
`onKeyPressed`, `onKeyReleased`, `getKeyState`, `MPTranslate`. New code should prefer
the `NodeMP.*` equivalents.

---

## Internal: module registry (`NodeMP.modules`)

Plumbing, not needed by most mods. `NodeMP.modules` (a.k.a. the internal `NODEMP`
global) is the single source of truth for module/file names and cross-VM calls:

- `NodeMP.modules.GE.<key>` / `NodeMP.modules.VE.<key>` → the extension name string
  (e.g. `NodeMP.modules.GE.syncVehicles == "nodemp_sync_vehicles"`).
- `NodeMP.modules.callVehicle(veh, key, "fn(args)")` — call a VE module from GE.
- `NodeMP.modules.callGameEngine(obj, key, "fn(args)")` — call a GE module from VE.
- `NodeMP.modules.geDependencies` / `veDependencies` — the load lists.

When adding or renaming a module, edit `lua/ge/extensions/nodemp/modules.lua` and
`lua/vehicle/extensions/nodemp/modules.lua` (identical) — that one place updates the
dependency lists and every cross-VM call.

## See also

- [Server Lua API](/plugins/server-api/) — the matching server-side `NodeMP.*` API.
- [Wire protocol](/plugins/protocol/) — packet type ids for `NodeMP.network`.
- [Plugin overview](/plugins/overview/) — how server plugins are structured.
