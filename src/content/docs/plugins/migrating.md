---
title: Migrating BeamMP plugins
description: Port a BeamMP server plugin to NodeMP - folder and manifest, the MP.* to node.* mapping, what has no equivalent, a chat plugin ported step by step.
---

BeamMP plugins do not run on NodeMP unmodified. The `MP`, `Util`, `FS` and `Http` globals do not
exist, `Resources/Server/<plugin>/` is not scanned, `ServerConfig.toml` is not read, and the
event model is different: a handler receives `Player` and `Vehicle` objects, a request is refused
with `false, reason` instead of `return 1`, and one entry file replaces a folder of numbered
scripts. What carries over is the shape of the plugin - the events it reacts to and the calls it
makes - and this page maps each of those to its NodeMP form. Every target name below is in the
[Lua API reference](/plugins/api/lua/) and the [events reference](/plugins/api/events/).

## Folder and manifest

| BeamMP | NodeMP |
|---|---|
| `Resources/Server/<plugin>/` with every top-level `.lua` loaded into one Lua state | `resources/<name>/` with one entry point, `server/main.lua`, and an optional `resource.toml` |
| `Resources/Client/<mod>.zip`, sent to players | `content/<mod>.zip`, downloaded by the launcher before the join; streamed Lua goes in `resources/<name>/client/` instead |
| `ServerConfig.toml`, `[General]` with `AuthKey` | `server.toml`, eight sections: `[General]`, `[Resources]`, `[Content]`, `[Network]`, `[Experimental]`, `[Directory]`, `[Database]`, `[Http]` - see [Configuration](/hosting/configuration/); the server key is `[Directory] HostId` and `HostSecret` |
| a `plugin.lua` or `main.lua` plus helper files loaded by name order | `server/main.lua`; further files with `require` after putting the folder on `package.path` ([Resources](/plugins/resources/#layout)) |

The smallest manifest names the resource and its entry point; a folder without one is a Lua
resource named after the folder with `server/main.lua` as its entry point:

```toml
name = "greeter"
version = "1.0"

[server]
main = "server/main.lua"
```

The resource name is the log tag, the `node.storage` store and the name the client mod files the
streamed scripts under; keep it to letters, digits, `_`, `-` and `.`.

## The API, side by side

`MP.RegisterEvent(name, "handlerName")` becomes `node.on(name, fn)`; the handler is a function,
not a global's name, and the event name decides what it receives.

### Events

NodeMP names follow two rules: a notification is `<subject><Verb-ed>` (`playerJoined`), a request
a handler can deny is `<subject><Action>Request` (`vehicleSpawnRequest`) - there is no `on` prefix,
`node.on(...)` already says it. The last column is the spelling servers before 1.2.0 used; it still
works as a deprecated alias (one warning per resource per old name, removed in 2.0), so a resource
ported against an older server keeps running - but write the new name.

| BeamMP | NodeMP | Before 1.2.0 |
|---|---|---|
| `onInit` | The top-level code of `server/main.lua`; it runs once at load and again on each reload. | |
| `onShutdown` | `node.on("serverShutdown", function() ... end)` | `onShutdown` |
| `onPlayerAuth(name, role, isGuest, identifiers)` - `return 1` or a string refuses | `node.on("playerConnectRequest", function(player, name) return false, "reason" end)`; read `player.guest`, `player.verified`, `player.accountRoles`, `player.identifiers`. Bans are checked before it fires. | `onPlayerConnectRequest` |
| `onPlayerConnecting(pid)` | `node.on("playerAuthenticated", function(player) ... end)` | `playerConnecting` |
| `onPlayerJoining(pid)` | No equivalent - nothing fires between `playerAuthenticated` and `playerJoined`. | |
| `onPlayerJoin(pid)` | `node.on("playerJoined", function(player) ... end)` | `playerJoin` |
| `onPlayerDisconnect(pid)` | `node.on("playerLeft", function(player) ... end)`; `player.name` is still known. | |
| `onChatMessage(pid, name, message)` - `return 1` blocks | `node.on("chat:send", function(player, data) ... end)` with `data` as JSON text `{ scope, text }`. The `chat` resource owns delivery; see the [walkthrough](#walkthrough-porting-a-chat-plugin). | |
| `onVehicleSpawn(pid, vid, data)` - `return 1` refuses | `node.on("vehicleSpawnRequest", function(player, requestedId, config) return false, "reason" end)`; `vehicleSpawned(vehicle)` fires after the fact. | `onVehicleSpawnRequest` |
| `onVehicleEdited(pid, vid, data)` - `return 1` refuses | `vehicleEditRequest(player, vehicle, config)` returning `false, reason`; `vehicleEdited(player, vehicle, config)` after. | `onVehicleEditRequest` |
| `onVehicleDeleted(pid, vid)` | `vehicleDeleted(vehicle)` - the record is gone; only `vehicle.id` is meaningful. | |
| `onVehicleReset(pid, vid, data)` | `vehicleReset(player, vehicle, posRot)` - observe only, it cannot be denied. | |
| `onVehiclePaintChanged(pid, vid, data)` | `vehiclePaintRequest(player, vehicle, paints)` to decide, `vehiclePainted` to observe. | `onVehiclePaintRequest` |
| `onFileChanged(path)` | No equivalent. | |
| `onConsoleInput(cmd)` | No equivalent: the server has no console input. Use chat commands (`node.commands.add`). | |

Every cancellable handler runs even after one has denied, and an erroring handler never denies.
The other kinds a BeamMP plugin never had - seat changes, coupler and trigger requests
(`vehicleEnterRequest`, `vehicleExitRequest`, `vehicleCouplerRequest`, `vehicleTriggerRequest`),
the position and electrics streams, the fail-closed node grabber (`vehicleNodeGrabRequest`), the
relay filter (`relayRequest`, formerly `canRelay`) - are on [Events](/plugins/events/), with the
[full list of renamed events](/plugins/api/events/#renamed-events) in the reference.

### Players

| BeamMP | NodeMP |
|---|---|
| `MP.GetPlayerName(pid)` | `player.name`, or `node.players.get(id).name` |
| `MP.GetPlayerIDByName(name)` | `node.players.find(name)` returns the `Player`; its `.id` is the number |
| `MP.GetPlayers()` (a table of id to name) | `node.players.all()` (an array of `Player`), `node.players.ids()` |
| `MP.GetPlayerCount()` | `node.players.count()` |
| `MP.IsPlayerConnected(pid)` | `player:isConnected()` |
| `MP.IsPlayerGuest(pid)` | `player.guest` |
| `MP.GetPlayerIdentifiers(pid)` (`{ ip, beammp }`) | `player.identifiers` - an array of `"nodemp:<id>"`, `"discord:<id>"`, `"ip:<addr>"` as the directory lists them, empty when unverified - plus `player.ip` and `player.accountId`. There is no `beammp` identifier. |
| the `role` argument of `onPlayerAuth` | `player.accountRoles` (the directory's role, `"ADM"` for a directory admin); `player:setRole(role)` and `player.role` are this server's own per-session label |
| `MP.DropPlayer(pid, reason)` | `player:kick(reason)` |
| - | `player:ban(reason)`, `node.bans.add(who, reason)`, `node.bans.remove`, `node.bans.has`, `node.bans.all()` - persisted in `bans.json` |

### Vehicles

| BeamMP | NodeMP |
|---|---|
| `MP.GetPlayerVehicles(pid)` (`{ [vid] = "pid-vid:{...}" }`) | `player:vehicles()` (an array of `Vehicle`); `vehicle:config()` is the config as a table |
| `MP.GetPositionRaw(pid, vid)` (`{ pos, rot }`) | `vehicle:transform()` (`pos`, `rot`, `vel`, `angVel`, all `{x, y, z}` or `{x, y, z, w}`), or `player:position()` |
| `MP.RemoveVehicle(pid, vid)` | `vehicle:delete()` |
| the `(pid, vid)` pair | one global id, `vehicle.id`, unique for the life of the server; `vehicle.spawner`, `vehicle.driver` and `vehicle.authority` are the players around it |
| - | `vehicle:seat`, `vehicle:lock`, `vehicle:setTag`, `vehicle:setCoupler`, `vehicle:trigger`, `vehicle:resync`, `node.vehicles.spawn` - server-driven actions BeamMP had no API for |

### Chat and events to clients

| BeamMP | NodeMP |
|---|---|
| `MP.SendChatMessage(pid, message)`; `pid = -1` for everyone | `player:tell(text, ...)` or `node.chat.tell(target, text, ...)`; `node.chat.say(text, ...)` for everyone. All three speak through the `chat` resource and are silent without it. |
| `MP.TriggerClientEvent(pid, name, data)`; `pid = -1` for everyone | `player:send(name, data)` or `node.send(target, name, data)`; `node.broadcast(name, data)` for everyone, `node.broadcast(name, data, except)` for everyone but one |
| `MP.TriggerClientEventJson(pid, name, table)` | `player:send(name, table)` - a table is JSON-encoded for you |
| `MP.TriggerGlobalEvent(name, ...)` (every plugin's handlers, with a future for the results) | `node.bus.emit(name, data)` and `node.bus.on(name, function(source, data) ... end)` - asynchronous, a string payload, no return values |
| `MP.TriggerLocalEvent(name, ...)` | Call the function. The bus also delivers to the sender when you want one path for both. |

### Timers

| BeamMP | NodeMP |
|---|---|
| `MP.CreateEventTimer(name, ms)` plus `MP.RegisterEvent(name, handler)` | `node.every(ms, fn)` - returns a timer id |
| `MP.CancelEventTimer(name)` | `node.cancel(id)` |
| - | `node.after(ms, fn)` for one shot, `node.defer(fn)` for after the current handlers |
| `MP.Sleep(ms)` (blocks the whole Lua state) | `node.sleep(ms)` inside `node.async(fn)` - suspends only that coroutine |
| `MP.GetTimeMS()`, `MP.GetTimeS()` | `node.server.time()` (unix, fractional), `node.server.unixTime()`, `node.server.uptime()` |

### HTTP

| BeamMP | NodeMP |
|---|---|
| `Http.Get(host, port, target)` (synchronous, returns the body) | `node.http.get(url, headers?, cb)` with `cb(status, body, headers)` on the worker; or `node.http.fetch(url)` inside `node.async`, which returns `status, body, headers` |
| `Http.Post(host, port, target, body, contentType)` | `node.http.post(url, body, headers?, cb)`; put the content type in `headers` (`{ ["Content-Type"] = "application/json" }`) |

A failed request calls back with status `-1` and the error text in `body`. Nothing in NodeMP
blocks the worker for a network round trip.

### Storage and files

| BeamMP | NodeMP |
|---|---|
| state in files of your own (`FS.*`, `io`) | `node.storage.get(key, default)`, `node.storage.set(key, value)`, `node.storage.delete(key)` - a JSON store per resource under `storage/<name>.json` + `.log`, durable before `set` returns |
| `FS.Exists`, `FS.IsFile`, `FS.ListFiles`, `FS.ListDirectories` | `node.fs.list(path?)` (`name`, `dir`, `size` per entry); `node.fs.read(path)` is `nil` when the file is missing |
| reading and writing files anywhere | `node.fs.read`, `node.fs.write`, `node.fs.writeAsync` - inside the resource folder only |
| `FS.CreateDirectory`, `FS.Remove`, `FS.Rename`, `FS.Copy` | `node.fs.write` creates parent folders; the rest has no equivalent |

### Utilities

| BeamMP | NodeMP |
|---|---|
| `Util.JsonEncode`, `Util.JsonDecode` | `node.json.encode`, `node.json.decode` (`nil` on a parse error) |
| `print`, `Util.LogInfo`, `Util.LogWarn`, `Util.LogError`, `Util.LogDebug` | `node.log(msg, ...)`, `node.log.warn`, `node.log.error` - `string.format` arguments, tagged with the resource name |
| `MP.GetServerVersion()` | `node.server.version()` |
| `MP.Settings.*`, `MP.Get`, `MP.Set` | `node.server.name()`, `map()`, `maxPlayers()`, `maxCars()`, `port()`; `node.server.setName`, `setMaxPlayers`, `setMaxCars` |
| `MP.GetOSName`, `MP.GetStateMemoryUsage`, `MP.GetLuaMemoryUsage` | No equivalent; `node.server.metrics()` is the live metrics table |
| `Util.Random`, `Util.RandomIntRange` | `math.random`; `node.crypto.randomHex(n)` for a token |

## What has no equivalent

- **Console input.** `onConsoleInput` and console replies: the server reads nothing from its
  console. Administration is chat commands (`node.commands.add`, gated by `player.role`), the
  bus, or a client half.
- **Blocking calls.** `MP.Sleep`, synchronous `Http.*`: every waiting form in NodeMP is a callback
  or a coroutine, because all resources share one worker thread ([Concurrency](/plugins/concurrency/)).
- **Cross-plugin calls with results.** `MP.TriggerGlobalEvent` futures: the bus is one-way. Ask
  and answer with two bus messages, as `chat` and `dimensions` do.
- **Vetoing another resource's behaviour.** A BeamMP plugin blocked chat with `return 1` in
  `onChatMessage`; in NodeMP the `chat` resource decides what it broadcasts, and another resource
  can only observe `chat:send`. To filter chat, change `chat` - it is a resource, not part of the
  server.
- **Files outside the resource folder**, `FS.Remove`, `FS.Rename`, `FS.Copy`, `onFileChanged`.
- **The `beammp` identifier.** Accounts are NodeMP accounts: `player.accountId` and
  `player.identifiers`, verified through the directory. A Test Drive guest has no account id.
- **`MP.Settings` beyond the five values** `node.server` exposes; their counterparts `Public`,
  `Description`, `Tags` belong to `[Directory]` in `server.toml` and have no runtime API.
- **`ServerConfig.toml` mirroring.** Nothing writes a `[General]` section for plugins to read;
  settings a resource needs go in its own `[config]` table and arrive as `node.config`.

## Walkthrough: porting a chat plugin

A BeamMP plugin that answers `!online` and announces joins:

<!-- doctest: skip BeamMP's MP.* API, shown for comparison; a NodeMP server has no MP table -->
```lua
-- Resources/Server/Greeter/main.lua (BeamMP)
function onChatMessage(pid, name, message)
    if message == "!online" then
        MP.SendChatMessage(pid, "Online: " .. MP.GetPlayerCount())
        return 1 -- swallow the line
    end
end
MP.RegisterEvent("onChatMessage", "onChatMessage")

function onPlayerJoin(pid)
    MP.SendChatMessage(-1, MP.GetPlayerName(pid) .. " joined")
end
MP.RegisterEvent("onPlayerJoin", "onPlayerJoin")
```

The same plugin as a NodeMP resource. It needs the `chat` example resource installed beside it
(from server 1.2.1 in the release archive under `examples/chat`), because chat is not part of the
server:

```toml
# resources/greeter/resource.toml
name = "greeter"
version = "1.0"

[server]
main = "server/main.lua"
```

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/online"}]]} -->
```lua
-- resources/greeter/server/main.lua (NodeMP)
node.commands.add("online", function(player, args, raw)
    player:tell("Online: %d", node.players.count())
end)

node.on("playerJoined", function(player)
    node.chat.say("%s joined", player.name)
end)

-- expect-client: Alice chat:msg .*Alice joined
-- expect-client: Alice chat:msg .*Online: 1
```

What changed, line by line:

1. The command prefix is `/`, not `!`, and the `chat` resource never broadcasts a `/` line - it
   publishes it on the bus as `chat:command` and `node.commands.add` receives it. There is nothing
   to swallow, so `return 1` has no counterpart.
2. The handler receives a `Player`, so `MP.GetPlayerName(pid)` is `player.name` and
   `MP.SendChatMessage(pid, ...)` is `player:tell(...)`, with `string.format` arguments built in.
3. `MP.SendChatMessage(-1, ...)` is `node.chat.say(...)`. Both `tell` and `say` reach the screen
   through the `chat` resource's `chat:say` bus message; without `chat` they are silent.
4. `MP.RegisterEvent` is gone: `node.on` takes the function itself.

A plugin that watched every line - a logger, a filter - subscribes to the wire event the client
sends, `chat:send`, whose `data` is JSON text `{ "scope": "global", "text": "..." }`:

<!-- doctest: server+client {"emit": [["chat:send", {"scope": "global", "text": "hello from BeamMP land"}]]} -->
```lua
node.on("chat:send", function(player, data)
    local msg = node.json.decode(data)
    if type(msg) == "table" and type(msg.text) == "string" then
        node.log("%s: %s", player.name, msg.text)
    end
end)

-- expect: Alice: hello from BeamMP land
```

It sees the line; it does not decide whether `chat` relays it. Start the server and the console
prints `greeter v1.0 loaded — lua · server 1 file · 0 client files` between the other resources'
load lines.

## Client scripts

A BeamMP client script - a Lua file inside a client zip - reaches the game with the same globals it
used before. The client mod keeps `TriggerServerEvent`, `TriggerClientEvent`, `AddEventHandler`,
`RemoveEventHandler`, `onKeyPressed`, `onKeyReleased`, `getKeyState` and `MPTranslate` for exactly
this purpose: they exist to ease porting client scripts, and new code should use their `NodeMP.*`
equivalents - `NodeMP.events.triggerServer`, `NodeMP.events.triggerLocal`, `NodeMP.events.on`,
`NodeMP.events.off`, `NodeMP.keys.onPressed`, `NodeMP.keys.onReleased`, `NodeMP.keys.getState`,
`NodeMP.util.translate`. A `TriggerServerEvent(name, data)` arrives at the server as a wire event,
`node.on(name, function(player, data) ... end)`, with a table JSON-encoded for you. The BeamMP
module globals (`MPVehicleGE`, `positionVE` and the like) do not exist; a script that reached for
them uses `NodeMP.*` instead. On the server, a ported client script still ships as a zip under
`content/`, while a client half written for NodeMP is streamed from `resources/<name>/client/` -
[Client scripting](/plugins/client-scripting/) compares the two.

## Next

- [Getting started](/plugins/getting-started/) - a first NodeMP resource from an empty folder.
- [Events](/plugins/events/) - the four kinds and how a request is denied.
- [Differences from BeamMP](/introduction/differences-from-beammp/) - the wider comparison, beyond plugins.
- [Configuration](/hosting/configuration/) - `server.toml` for the host.
