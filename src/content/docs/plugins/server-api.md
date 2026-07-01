---
title: Server Lua API
description: The server-side scripting API — the BeamMP-compatible MP/Util/FS/Http globals and the namespaced NodeMP.* prelude (events, players, vehicles, chat, ui, timers, util, http, fs, bans).
---

A NodeMP server plugin has two APIs available in its Lua state, both at once:

1. **The BeamMP-compatible global API** — `MP`, `Util`, `FS`, `Http` — so BeamMP plugins run
   unchanged.
2. **The namespaced `NodeMP.*` API** — a cleaner surface auto-injected into every plugin state,
   built on top of the same primitives.

New code should prefer `NodeMP.*`. For the plugin model (folders, load order, Lua states) start
with the [overview](/plugins/overview/).

## Events

Register a handler with `NodeMP.events.on(name, fn)` (or BeamMP's
`MP.RegisterEvent(name, "globalFuncName")`). Handlers run when the server fires the event.

### Built-in server events

These are the event names and the arguments each handler receives. `[veto]` marks events you can
cancel by **returning a non-zero integer**.

| Event | Arguments | Notes |
|---|---|---|
| `onInit` | `()` | Lua state started. |
| `onShutdown` | `()` | Server stopping. |
| `onPlayerAuth` | `(name, roles, isGuest, identifiersJson)` | `[veto]` reject the connection. |
| `postPlayerAuth` | `(rejected, reason, name, roles, isGuest, identifiersJson)` | After auth resolved. |
| `onPlayerConnecting` | `(playerId)` | |
| `onPlayerJoining` | `(playerId)` | |
| `onPlayerJoin` | `(playerId)` | Finished auth + sync. |
| `onPlayerDisconnect` | `(playerId)` | |
| `onChatMessage` | `(playerId, name, message)` | `[veto]` swallow the message. |
| `postChatMessage` | `(accepted, playerId, name, message)` | |
| `onVehicleSpawn` | `(spawnerId, vehicleId, carJson)` | `[veto]` block the spawn. |
| `postVehicleSpawn` | `(confirmed, spawnerId, vehicleId, carJson)` | |
| `onVehicleDeleted` | `(spawnerId, vehicleId)` | |
| `onVehicleReset` | `(spawnerId, vehicleId, packetJson)` | |
| `onVehiclePaintChanged` | `(spawnerId, vehicleId, packetJson)` | |
| `onVehicleEdited` | `(spawnerId, vehicleId, packetJson)` | `[veto]` |
| `postVehicleEdited` | `(allowed, spawnerId, vehicleId, packetJson)` | |
| `onVehicleEnter` | `(vehicleId, playerId, seat)` | |
| `onVehicleExit` | `(vehicleId, playerId)` | |
| `onVehicleSeatChange` | `(vehicleId, playerId, seat)` | |
| `onVehicleSyncOwnerChanged` | `(vehicleId, syncOwnerId)` | `-1` = no sync owner. |
| `onVehicleLockChanged` | `(vehicleId, mode)` | Not vetoable. `mode`: `0` open / `1` passenger-only / `2` closed. |

:::caution
`vehicleId` is a single **global** id (a decimal string on the wire), and `spawnerId` is the
player who created the vehicle — these are **not** the BeamMP `(playerId, vehicleId)` pair. See
[Migrating BeamMP plugins](/plugins/migrating/) and the [wire protocol](/plugins/protocol/).
:::

### `NodeMP.events`

| Call | Purpose |
|---|---|
| `on(name, fn)` | Subscribe; returns a token. |
| `off(token)` | Unsubscribe. |
| `onClient(name, fn)` | Subscribe to a **client** custom event (`0x66`); `fn(playerId, data)` with `data` auto-decoded from JSON when it looks like JSON. |
| `emit(name, ...)` | Fire an event across **all** Lua states (async). |
| `emitLocal(name, ...)` | Fire an event in **this** state only (sync). |
| `sendTo(playerId, name, data)` | Send a custom event to a client (`-1` = broadcast). Tables are JSON-encoded. |
| `broadcast(name, data)` | Send a custom event to every client. |

```lua
NodeMP.events.on("onChatMessage", function(playerId, name, message)
    if message == "ping" then
        NodeMP.chat.send(playerId, "pong")
        return 1 -- veto: don't broadcast "ping" to chat
    end
end)
```

## Players — `NodeMP.players`

| Call | Returns / does |
|---|---|
| `names()` | `{ [id] = name }` of everyone connected. |
| `ids()` | Array of connected player ids. |
| `count()` | Number of connected players. |
| `exists(id)` | Is this id connected? |
| `name(id)` | Display name. |
| `idByName(name)` | Id for a name, or `-1`. |
| `role(id)` | Role tag (e.g. `"ADM"`). |
| `setRole(id, role)` | Set + broadcast a role (`USER`, `ADM`, `MOD`, `SCR`, `VIP`); returns `ok, err`. |
| `identifiers(id)` | Identifiers table (`ip`, `nodemp`, …). |
| `isGuest(id)` / `isConnected(id)` | Booleans. |
| `isSynced(id)` / `isSyncing(id)` | Sync state (or `nil` if unsupported). |
| `get(id)` | Composite record `{ id, name, role, guest, connected, synced, identifiers }`. |
| `all()` | Array of composite records. |
| `vehicles(id)` | Vehicles a player owns, keyed by global `vehicleId`: `{ [vehicleId] = spawnJson }` — each value a spawn-packet **JSON string** (decode with `NodeMP.util.json.decode`); `nil` if the player owns none. |
| `kick(id, reason)` | Kick; returns `ok, err`. |
| `kickAll(reason)` | Kick everyone. |
| `message(id, msg)` | Private chat message. |
| `notify(id, msg, opts)` | Notification toast; `opts = { icon, category }`. |
| `position(id)` | Player's current vehicle position `{ x, y, z, raw }`, or `nil, err`. |
| `teleport(id, pos, rot?)` | Teleport the player's current vehicle; `pos = {x,y,z}`, `rot` optional quaternion. |

```lua
for _, p in ipairs(NodeMP.players.all()) do
    NodeMP.util.log.info(string.format("[%d] %s (%s)", p.id, p.name, p.role or "USER"))
end
```

## Vehicles — `NodeMP.vehicles`

Vehicle ids are **global** (server-wide, unique, persistent — a vehicle survives its spawner
leaving). A vehicle has a **spawner** (creator) and a **sync owner** (the client currently
syncing it); the server reassigns the sync owner automatically.

| Call | Returns / does |
|---|---|
| `ofPlayer(playerId)` | Vehicles a player spawned, keyed by global `vehicleId`: `{ [vehicleId] = spawnJson }` — each value a spawn-packet **JSON string** (decode with `NodeMP.util.json.decode`); `nil` if the player owns none. |
| `countOf(playerId)` | How many a player spawned. |
| `count()` | Total vehicles on the server (incl. orphaned). |
| `remove(vehicleId)` | Delete a vehicle (broadcasts, fires `onVehicleDeleted`). |
| `position(vehicleId)` | `{ x, y, z, rot?, raw }`, or `nil, err`. |
| `getDriver(vehicleId)` / `setDriver(vehicleId, id)` | Current driver; setting one hands over sync authority (`-1` clears). |
| `getSyncOwner(vehicleId)` | Client currently syncing it, or `-1`. |
| `getSpawner(vehicleId)` | Who created it, or `-1`. |
| `isLocked(vehicleId)` / `setLocked(vehicleId, b)` | Lock state. |
| `activeOf(playerId)` | The vehicle a player is driving/owns: `{ vehicleId, spawner, syncOwner, driver }`, or `nil`. |
| `spawn(playerId, opts)` | Ask a client to spawn a car it will own. `opts = { jbeam, config?, pos?, rot?, enter? }`. |
| `teleport(vehicleId, pos, rot?)` | Move a vehicle by id (routed through its sync owner). |

```lua
-- Remove every vehicle a player spawned
local function clear(playerId)
    for vid in pairs(NodeMP.vehicles.ofPlayer(playerId) or {}) do
        NodeMP.vehicles.remove(vid)
    end
end
```

## Chat & UI — `NodeMP.chat`, `NodeMP.ui`

| Call | Purpose |
|---|---|
| `NodeMP.chat.send(playerId, message)` | Message one player (as "Server"). |
| `NodeMP.chat.broadcast(message)` | Message everyone. |
| `NodeMP.ui.notify(playerId, message, opts)` | Toast notification (`-1` broadcasts); `opts = { icon, category }`. |
| `NodeMP.ui.dialog(playerId, opts)` | Confirmation/markdown dialog; `opts = { title, body, buttons, interactionId, warning, reportToServer, reportToExtensions }`. |

## Server info & settings — `NodeMP.server`

| Call | Purpose |
|---|---|
| `version()` | `{ major, minor, patch, string }`. |
| `os()` | `"Windows"`, `"Linux"`, or `"Other"`. |
| `memory()` | Total Lua memory used. |
| `shutdown()` | Stop the server gracefully. |
| `get(key)` / `set(key, value)` | Read/write a setting by friendly name (`"Name"`, `"MaxPlayers"`, `"Map"`, …). |
| `name()` / `setName(v)`, `map()` / `setMap(v)`, `description()` / `setDescription(v)` | Convenience accessors. |
| `maxPlayers()` / `setMaxPlayers(v)`, `maxCars()` / `setMaxCars(v)` | |
| `isPrivate()` / `setPrivate(v)`, `isDebug()` / `setDebug(v)` | |

## Timers — `NodeMP.timers`

| Call | Purpose |
|---|---|
| `every(name, intervalMs, fn, strategy?)` | Run `fn` every `intervalMs`; `name` identifies it for cancellation. |
| `cancel(name)` | Cancel a recurring timer. |
| `after(ms, fn)` | Run `fn` once after `ms` (non-blocking). |

```lua
NodeMP.timers.every("announce", 60000, function()
    NodeMP.chat.broadcast("Have fun and drive safe!")
end)
```

## Utilities — `NodeMP.util`

- **JSON** — `NodeMP.util.json.{encode, decode, diff, diffApply, prettify, minify, flatten, unflatten}`.
- **Logging** — `NodeMP.util.log.{debug, info, warn, error}`.
- **Randomness** — `NodeMP.util.random`, `randomInt`, `randomFloat`.
- **Crypto / encoding** — `NodeMP.util.sha256`, `NodeMP.util.base64.{encode, decode}`.
- **Timing** — `NodeMP.util.after(ms, fn)`, `NodeMP.util.sleep(ms)` (blocks — use sparingly).

## HTTP client — `NodeMP.http`

```lua
local conn = NodeMP.http.connect("api.example.com", 443)
local res = conn:get("/status", { ["Accept"] = "application/json" })
-- res = { status_code, body }
local post = conn:post("/log", '{"event":"join"}', { ["Content-Type"] = "application/json" })
```

`connect(host, port)` returns a connection exposing `:get(path, headers)` and
`:post(path, body, headers)`, each returning `{ status_code, body }`.

## Filesystem — `NodeMP.fs`

Paths are **sandboxed to the plugin's own folder**, so a plugin can keep its own data files.

| Call | Purpose |
|---|---|
| `exists`, `isFile`, `isDir` | Existence/type checks. |
| `mkdir`, `remove`, `rename`, `copy` | Mutations. |
| `list`, `listDirs` | Directory listing. |
| `filename`, `extension`, `parent`, `join` | Path helpers. |
| `read(path)` / `write(path, contents)` | File IO (requires server support; guard for `nil`). |

```lua
if NodeMP.fs.write then
    NodeMP.fs.write("state.json", NodeMP.util.json.encode({ saved = os.time() }))
end
```

## Bans — `NodeMP.bans`

Bans are enforced automatically: once at least one ban exists, an `onPlayerAuth` gate rejects
banned players. Bans persist to the plugin folder when file IO is available, else in memory for
the session.

| Call | Purpose |
|---|---|
| `ban(playerId, reason)` | Ban by all identifiers + name, then kick. |
| `banIdentifier(idValue, reason)` | Ban a raw identifier (IP, account key). |
| `unban(value)` | Remove a ban by identifier or name. |
| `isBanned(identifiers)` / `isBannedName(name)` | Checks. |
| `list()` | Ban records `{ name?, id?, ids?, reason, time }`. |
| `enforce()` | Turn on the auth gate proactively (normally automatic). |

## The BeamMP global API (`MP.*`)

Everything `NodeMP.*` is built on remains available for BeamMP plugins and direct use. Commonly
used calls include `MP.GetPlayers()`, `MP.GetPlayerName(id)`, `MP.GetPlayerIdentifiers(id)`,
`MP.GetPlayerRole(id)`, `MP.GetPlayerVehicles(id)`, `MP.RemoveVehicle(vehicleId)`,
`MP.GetPositionRaw(vehicleId)`, `MP.SendChatMessage(id, msg)`, `MP.DropPlayer(id, reason)`,
`MP.RegisterEvent(name, fn)`, `MP.CreateEventTimer(name, ms)`, plus `Util.*` (JSON, logging) and
`FS.*` / `Http.*`. On NodeMP, the vehicle-related calls accept the global vehicle id (and the
two-argument BeamMP form for compatibility). See
[BeamMP compatibility](/introduction/beammp-compatibility/) for the exact translation.

:::note
`NodeMP.commands`, `NodeMP.modules`, `NodeMP.dimensions`, and `NodeMP.persistence` are **not**
part of the core prelude — they are provided by the example framework plugins
(`00_framework.lua`, `10_admin.lua`, …). Copy those in (or build your own) to use them. The
namespaces documented above are the always-available core API.
:::

## Next steps

- [Wire protocol](/plugins/protocol/) — the packets beneath the API.
- [Migrating BeamMP plugins](/plugins/migrating/) — adapt an existing plugin.
- [Client mod API](/plugins/client-api/) — scripting inside the BeamNG mod.
