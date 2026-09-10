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

### Session — `NodeMP.session`
| Call | Returns |
|------|---------|
| `isLauncherConnected()` | bool — launcher control link up |
| `isConnected()` | bool — the gameplay socket is up |
| `isActive()` | bool — in a multiplayer session |
| `isJoining()` | bool — a join is in progress (mods/map loading) |
| `getServer()` | `{ ip, port, name, map, ... }` or nil |
| `getServerName()` / `getMap()` | string or nil |
| `getLauncherVersion()` | string (empty before handshake) |
| `connect(ip, port, name, skipModWarning?)` | join a server |
| `leave(goBack)` | leave; `goBack` returns to the menu |

`NodeMP.VERSION` holds the mod version string. Back-compat aliases:
`NodeMP.isLauncherConnected()`, `NodeMP.isInSession()`, `NodeMP.getCurrentServer()`,
`NodeMP.getLauncherVersion()`, `NodeMP.connectToServer()`, `NodeMP.leaveServer()`.

### Account — `NodeMP.account`
| Call | Returns |
|------|---------|
| `get()` | `{ success, username, role, avatar, ... }` |
| `isLoggedIn()` | bool |
| `getUsername()` / `getRole()` | string or nil |
| `login(identifiers)` / `logout()` | start/clear a login |

Aliases: `NodeMP.getAccount()`, `NodeMP.isLoggedIn()`.

### Players — `NodeMP.players`
A player table looks like `{ id, name, role, guest, ping }`.

| Call | Returns |
|------|---------|
| `get(id)` / `getByName(name)` | player table or nil |
| `getAll()` | `{ [id] = player }` |
| `ids()` | array of player ids |
| `count()` / `max()` | current players / server slots |
| `getLocalId()` / `getLocal()` | your own id / player table |
| `isLocal(id)` | is this the local player? |
| `getRoleInfo(role)` | `{ tag, backcolor, forecolor }` for styling |

### Vehicles — `NodeMP.vehicles`
`gameId` = local BeamNG object id; `vehicleId` = single **global** network id
(an integer string like `"42"`, unique server-wide, not owner-encoded).

`getAll()`, `getOwn()` (vehicles this client **syncs**), `isOwn(gameId)` (we are the
sync owner), `getServerId(gameId)`, `getGameId(vehicleId)`, `getByServerId(vehicleId)`,
`getByGameId(gameId)`, `getNicknameMap()`, `getOwner(vehicleId)`, `getDriver(vehicleId)`,
`getSyncOwner(vehicleId)`, `count()`, `forEach(fn)`, `isSynced()`.

A vehicle has a `spawnerID` (creator) and a `syncOwnerID` (the client currently
syncing it). Vehicles are **persistent**: they survive their spawner leaving — the
server reassigns `syncOwner` and fires `onNodeMPVehicleSyncOwnerChanged`.

### Chat — `NodeMP.chat`
| Call | Does |
|------|------|
| `send(message)` | send a chat message to the server |
| `add(message, username?, color?)` | add a local-only line |
| `system(message)` | local-only line attributed to "Server" |
| `clear()` | clear local chat history |
| `toggle()` | show/hide the chat overlay |
| `getHistory()` | array of rendered message tables |

### Events — `NodeMP.events`
Custom events ride packet `0x66`; server-side Lua sees the same names. NodeMP also
fires **local lifecycle events** you can subscribe to (see `NodeMP.events.NAMES`).

| Call | Does |
|------|------|
| `on(name, fn, id?)` | subscribe (optional `id` names the handler) |
| `once(name, fn, id?)` | subscribe once; auto-removes after first call |
| `off(name, id)` | unsubscribe |
| `triggerServer(name, data)` | send a named event to the server |
| `triggerLocal(name, data)` | fire a named event locally |

Built-in `NodeMP.events.NAMES` (local lifecycle events):

| Key | Event name | Handler args |
|-----|-----------|--------------|
| `PLAYER_JOINED` | `onNodeMPPlayerJoined` | `(player)` |
| `PLAYER_LEFT` | `onNodeMPPlayerLeft` | `({ id, name })` |
| `PLAYER_ROLE_CHANGED` | `onNodeMPPlayerRoleChanged` | `({ id, role })` |
| `VEHICLE_SPAWNED` | `onNodeMPVehicleSpawned` | `(vehicle)` |
| `VEHICLE_DELETED` | `onNodeMPVehicleDeleted` | `({ vehicleId })` |
| `VEHICLE_SYNC_OWNER` | `onNodeMPVehicleSyncOwnerChanged` | `({ vehicleId, syncOwnerId })` |
| `SYNCED` | `onNodeMPSynced` | `()` — world finished loading |
| `CHAT_SENT` | `ChatMessageSent` | `(message)` |
| `CHAT_RECEIVED` | `ChatMessageReceived` | `(message, username)` |

```lua
NodeMP.events.on(NodeMP.events.NAMES.SYNCED, function()
    NodeMP.chat.system("World synced — my mod is ready")
end)
NodeMP.events.triggerServer("myEvent", { foo = 42 })  -- send to server
```

### Keys — `NodeMP.keys`
`onPressed(key, fn)`, `onReleased(key, fn)`, `getState(key)`.

### UI — `NodeMP.ui`
`notify(text, opts)` (`opts = { icon, category }`), `dialog(opts)` (markdown/confirm
dialog), `bringToFront()`, `refreshPlayerList()`.

### Settings — `NodeMP.settings`
`get(key, default)` / `set(key, value)` — read/write a BeamNG-backed mod option (the
same keys used by NodeMP's own settings, e.g. `nameTagShowDistance`).

### Config — `NodeMP.config`
Local NodeMP profile: `getNickname()` / `setNickname(name)`, `getFavorites()`,
`get()` (config.json table), `set(key, value)`.

### Debug — `NodeMP.debug`
`getNetworkStats()` → `{ inBps, outBps, inPps, outPps, timer }`;
`focusOnPlayer(name)` (spectate the newest vehicle of a player).

### Dimensions — `NodeMP.dimensions`
Parallel worlds on one map (server-authoritative; gated by the "dimensions" framework
module). `isActive()`, `get()` (your dimension number, `0` = default), `refresh()`,
`set(n)` (switch — the car you sit in comes along), `onChanged(fn, id)`.

### Raw network (advanced) — `NodeMP.network`
`send(typeByte, payloadTable)`, `isConnected()`. Use type ids in the `0x80`–`0xFF`
mod range; see the [wire protocol](/plugins/protocol/).

### Utility — `NodeMP.util`
`translate(key, default)` (alias `NodeMP.translate`), `b64encode/b64decode`,
`hex2rgb(hex)`, `jsonEncode/jsonDecode`.

---

## VE API (inside a vehicle's Lua)

The per-vehicle state exposes a subset. Receiving events is GE-only — from a vehicle
you **send** with `NodeMP.events.triggerServer` and handle it in GE. Most write helpers
are only meaningful on a **local** ("L") vehicle (one this client syncs).

### `NodeMP.vehicle`
`type()` → `"L"`/`"R"`/nil, `isLocal()`, `isRemote()`, `id()` (local object id).

### `NodeMP.keys`
`onPressed(key, fn)`, `onReleased(key, fn)`, `getState(key)` — same bridge as GE.

### `NodeMP.events`
`triggerServer(name, data)` — relay a server event from vehicle code (VE → GE → server).

### `NodeMP.electrics`
`get(name)`, `set(name, value)` (local vehicle only), `exclude(name)` (keep a key out
of network sync, e.g. for locally-driven animations).

### `NodeMP.controllers` (advanced)
`register(types)` — register modded controller types for sync (call from a
`loadControllerSyncFunctions` hook; `types` mirrors the stock `controllers/general.lua`
shape). `send(data)` — manually forward a controller-state payload to remotes.

### `NodeMP.velocity` (advanced)
`add(x, y, z)` / `set(x, y, z)` — linear-velocity corrections (mostly for remotes).

### `NodeMP.callGE(moduleKey, call)`
Queue a call into a GE NodeMP module from vehicle code (advanced cross-VM), e.g.
`NodeMP.callGE("syncControllers", "sendControllerData(" .. serialize(x) .. ")")`.

---

## Legacy / BeamMP-style globals

These remain available for compatibility with existing server scripts:
`TriggerServerEvent`, `TriggerClientEvent`, `AddEventHandler`, `RemoveEventHandler`,
`onKeyPressed`, `onKeyReleased`, `getKeyState`, `MPTranslate`. New code should prefer
the `NodeMP.*` equivalents.

---

## Internal: `NodeMP.modules` and the `NODEMP` registry

Plumbing, not needed by most mods — and the two Lua states differ here:

- **In GE**, `NodeMP.modules` is the **module-framework SDK**: `register(descriptor)`,
  `list()`, `isEnabled(id)`, `getConfig(id, key, default)`, `setLocalPref(id, key, value)`,
  `onChanged(fn, id)`, `onPacket(typeByte, moduleId, fn)`, and `requestManifest()`. The server
  is authoritative over which modules are enabled and their config.
- **In VE**, `NodeMP.modules` is the raw cross-VM **registry** (it points at the `NODEMP` global).

The raw registry — the single source of truth for module/file names and cross-VM calls — is
always reachable as the `NODEMP` global (in **both** states). In GE it is *only* `NODEMP`, not
`NodeMP.modules`:

- `NODEMP.GE.<key>` / `NODEMP.VE.<key>` → the extension name string
  (e.g. `NODEMP.GE.syncVehicles == "MPVehicleGE"`).
- `NODEMP.callVehicle(veh, key, "fn(args)")` — call a VE module from GE.
- `NODEMP.callGameEngine(obj, key, "fn(args)")` — call a GE module from VE.
- `NODEMP.geDependencies` / `NODEMP.veDependencies` — the load lists.

The names are BeamMP's, flat and unprefixed, so that anything written against BeamMP's
client API resolves the same modules. The **files** are grouped by role
(`lua/ge/extensions/nodemp/sync/MPVehicleGE.lua`), which does not change the names: the mod
loads them at BeamNG's *empty root*, where the extension loader drops the directories and
uses the bare file name. Folder structure is therefore invisible to callers — do not build a
module name out of a path.

When adding or renaming a module, edit `lua/ge/extensions/MPModules.lua` and
`lua/vehicle/extensions/MPModules.lua` (identical) — that one place updates the
dependency lists and every cross-VM call.

## See also

- [Server Lua API](/plugins/server-api/) — the matching server-side `NodeMP.*` API.
- [Wire protocol](/plugins/protocol/) — packet type ids for `NodeMP.network`.
- [Plugin overview](/plugins/overview/) — how server plugins are structured.
