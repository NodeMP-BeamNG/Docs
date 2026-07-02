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
| `onInitFinal` | `()` | Fired **once**, after every plugin's `onInit` has finished — the safe place for cross-plugin setup (reading another plugin's exports/state). |
| `onShutdown` | `()` | Server stopping. |
| `onConsoleInput` | `(line)` | A line typed in the server console. Return a **string** to print it back (how BeamMP admin plugins reply). |
| `onPlayerAuth` | `(name, roles, isGuest, identifiersJson)` | `[veto]` see the return-value contract below. |
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

:::danger[`onPlayerAuth` return values]
`onPlayerAuth` is more than a simple veto — its return value decides the connection:

- Return **`1`** → reject the connection.
- Return **`2`** → allow the connection **even if the server is full** (bypass `MaxPlayers`).
- Return **any string** → reject the connection and show that string to the player as the kick
  reason. This wins over a `0`/no-return from other handlers.
- Return `0` / `nil` → allow (subject to other handlers and the player cap).

Be careful not to return a string by accident (e.g. a trailing expression in Lua) — doing so
silently locks out **every** player. If you only want to log, return nothing.
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
| `NodeMP.chat.sendAs(playerId, from, message)` | Message one player with a **custom sender name** (`-1` broadcasts). |
| `NodeMP.chat.broadcastAs(from, message)` | Message everyone with a custom sender name. |
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

Everything `NodeMP.*` is built on remains available for BeamMP plugins and direct use. On NodeMP
the vehicle-related calls accept the global vehicle id (and the two-argument BeamMP form for
compatibility). See [BeamMP compatibility](/introduction/beammp-compatibility/) for the exact
translation. This is the full surface:

### Players

| Call | Returns / does |
|---|---|
| `MP.GetPlayers()` | `{ [id] = name }` of everyone connected. |
| `MP.GetPlayerCount()` | Number of connected players. |
| `MP.GetPlayerName(id)` | Display name, or `nil`. |
| `MP.GetPlayerIDByName(name)` | Id for a name, or `-1`. |
| `MP.GetPlayerIdentifiers(id)` | Identifiers table (`ip`, `nodemp`, …). |
| `MP.GetPlayerRole(id)` | Role tag string, or `nil`. |
| `MP.SetPlayerRole(id, role)` | Set + broadcast a role; returns `ok, err`. |
| `MP.IsPlayerConnected(id)` / `MP.IsPlayerGuest(id)` | Booleans. |
| `MP.IsPlayerSynced(id)` / `MP.IsPlayerSyncing(id)` | Sync-state booleans. |
| `MP.DropPlayer(id, reason?)` | Kick a player (reason optional). |

### Chat, notifications & dialogs

| Call | Returns / does |
|---|---|
| `MP.SendChatMessage(id, msg [, logChat])` | Chat as "Server" to `id` (`-1` = everyone). `logChat` (default `true`) only controls the console echo. |
| `MP.SendChatMessageAs(id, from, msg [, logChat])` | Same, but with a custom sender name. |
| `MP.SendNotification(id, msg [, icon [, category]])` | Toast notification (`-1` broadcasts). |
| `MP.ConfirmationDialog(id, title, body, buttons, interactionId)` | Markdown/confirmation dialog. |

### Vehicles

| Call | Returns / does |
|---|---|
| `MP.RemoveVehicle(vehicleId)` | Delete a vehicle (broadcasts, fires `onVehicleDeleted`). |
| `MP.GetVehicleCount()` | Total vehicles server-wide. |
| `MP.GetPositionRaw(vehicleId)` / `MP.GetPositionRaw(playerId, vehicleId)` | Raw transform table. |
| `MP.SetVehicleDriver(vehicleId, playerId)` / `MP.GetVehicleDriver(vehicleId)` | Driver (setting hands over sync authority; `-1` clears). |
| `MP.GetVehicleSyncOwner(vehicleId)` | Client currently syncing it, or `-1`. |
| `MP.GetVehicleSpawner(vehicleId)` | Who created it, or `-1`. |
| `MP.SetVehicleLocked(vehicleId, bool)` / `MP.GetVehicleLocked(vehicleId)` | Lock state. |

### Events & timers

| Call | Returns / does |
|---|---|
| `MP.RegisterEvent(name, "globalFuncName")` | Bind a global function to an event. |
| `MP.TriggerGlobalEvent(name, ...)` | Fire a custom event across **all** Lua states (async; returns a handle). |
| `MP.TriggerLocalEvent(name, ...)` | Fire a custom event in **this** state (sync; returns results). |
| `MP.TriggerClientEvent(id, name, data)` | Send a custom event to a client (`-1` = broadcast). |
| `MP.TriggerClientEventJson(id, name, table)` | Same, JSON-encoding a table payload. |
| `MP.CreateEventTimer(name, intervalMs [, strategy])` | Fire `name` every `intervalMs` (`strategy` = `MP.CallStrategy.*`). |
| `MP.CancelEventTimer(name)` | Stop a timer created above. |

### Config, server info & misc

| Call | Returns / does |
|---|---|
| `MP.Set(MP.Settings.KEY, value)` / `MP.Get(MP.Settings.KEY)` | Read/write a live setting (see `MP.Settings` below). |
| `MP.GetServerVersion()` | `major, minor, patch`. |
| `MP.GetOSName()` | `"Windows"`, `"Linux"`, or `"Other"`. |
| `MP.GetPlayerCount()` / `MP.GetVehicleCount()` | Counts (also listed above). |
| `MP.GetStateMemoryUsage()` / `MP.GetLuaMemoryUsage()` | Bytes used by this state / all states. |
| `MP.Sleep(ms)` | Block this state (use sparingly; prefer `NodeMP.timers.after`). |
| `print(...)`, `printRaw(...)`, `exit()` | Console output / stop the server. |

`MP.Settings` enum: `Debug`, `Private`, `MaxCars`, `MaxPlayers`, `Map`, `Name`, `Description`,
`InformationPacket`. `MP.CallStrategy` enum: `BestEffort`, `Precise`.

### `Util.*`

| Call | Purpose |
|---|---|
| `Util.LogDebug/LogInfo/LogWarn/LogError(msg)` | Levelled logging. |
| `Util.JsonEncode(table)` / `Util.JsonDecode(str)` | Lua ⇄ JSON. A table is encoded as a JSON **array** only when its keys are exactly `1..N`; otherwise as an object. |
| `Util.JsonPrettify(str)` / `Util.JsonMinify(str)` | Reformat a JSON string. |
| `Util.JsonDiff(a, b)` / `Util.JsonDiffApply(doc, patch)` | JSON diff/patch. |
| `Util.JsonFlatten(str)` / `Util.JsonUnflatten(str)` | Flatten/unflatten nested JSON. |
| `Util.Random()` / `Util.RandomRange(lo, hi)` / `Util.RandomIntRange(lo, hi)` | Randomness. |
| `Util.Sha256(str)` / `Util.Base64Encode(str)` / `Util.Base64Decode(str)` | Hash / encoding. |
| `Util.SetTimeout(fn, ms)` | Run `fn` once after `ms` (non-blocking). |

### `Http.*` (raw)

`Http.CreateConnection(host, port)` returns an object with **capitalized** `:Get(path, headers)`
and `:Post(path, body, headers)` methods (BeamMP naming). The `NodeMP.http.connect()` wrapper
above exposes the same thing with lowercase methods.

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
