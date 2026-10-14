---
title: Migrating BeamMP plugins
description: Run a BeamMP server plugin with the compatibility module, or port it to the node API - the folder, the MP.* to node.* mapping, and a chat plugin ported.
---

A BeamMP server plugin can come to NodeMP in two ways:

- **Run it as it is** with the compatibility module `beammp-compat`. It gives the plugin its `MP`,
  `Util` and `FS` tables, so an unmodified plugin folder loads. Good for trying a plugin out or for
  one you don't want to touch.
- **Port it** to the `node` API. More work, but the result is an ordinary resource: it gets objects
  instead of ids, refuses with a reason the player sees, waits without blocking, and can use
  everything on these pages.

## Running a plugin with the compatibility module

`beammp-compat` is a native module that runs resources marked `type = "beammp"`. It isn't in the
release archive: it's built from source and the file goes into `modules/` next to the server
executable. The server loads modules before resources, so the plugin finds it in place.

Put the plugin's files into a resource folder and add a two-line manifest:

```
resources/
└── my-plugin/
    ├── resource.toml      # name = "my-plugin", type = "beammp", [server] main = "main.lua"
    ├── main.lua           # the plugin's files, as they were in Resources/Server/my-plugin/
    ├── commands.lua
    └── client/            # optional: the client mod's files, unpacked from its zip
        └── lua/ge/extensions/...
```

```toml
name = "my-plugin"
type = "beammp"

[server]
main = "main.lua"
```

The file named in `[server] main` runs first, then every other `.lua` in the folder, in alphabetical
order, then `onInit`. All files of one plugin share one Lua state, as the plugin expects. **Name a
`main` file** whenever the plugin has no `client/` folder: without either, the server doesn't count
the folder as a resource and skips it.

What to expect from it:

- **Events** fire with the arguments the plugin knows: `onPlayerAuth`, `onPlayerConnecting`,
  `onPlayerJoining`, `onPlayerJoin`, `onPlayerDisconnect`, `onChatMessage`, `onVehicleSpawn`,
  `onVehicleEdited`, `onVehicleDeleted`, `onVehicleReset`, `onVehiclePaintChanged`, `onShutdown`.
- **A cancelled chat line disappears quietly.** When `onChatMessage` cancels a line, nobody sees it
  and the sender isn't told it was refused, which is how a plugin's own `/command` stays out of the
  chat.
- **Vehicle ids are the server's global ids**, unique on the server, rather than a number per
  player. `onVehicleSpawn` gets `0` for a new car, because the id is given after the decision;
  `postVehicleSpawn` has the real one.
- **`MP.SendChatMessage`** shows as a line from **System**.
- **`MP.Sleep` blocks every resource**, not only this plugin, because all resources share one
  worker thread. Replace it when you can.
- **Not available:** `Http.CreateConnection` (use [`node.http`](/plugins/http/) from a Lua resource),
  `onConsoleInput` and `onFileChanged` (they never fire), `Util.JsonDiff` and `Util.JsonDiffApply`,
  `MP.ConfirmationDialog`, and stopping the server with `exit()`.

Most of these log a warning the first time a plugin uses them, so the server log tells you what to
fix. A client script written for BeamMP finds its usual globals too
([below](#client-scripts)).

## Porting by hand

What carries over is the shape of the plugin: the events it reacts to and the calls it makes. The
tables below map each one to its NodeMP form; every name on the right is in the
[Lua API reference](/plugins/api/lua/) and the [events reference](/plugins/api/events/).

### Folder and manifest

| BeamMP | NodeMP |
|---|---|
| `Resources/Server/<plugin>/`, every `.lua` loaded into one Lua state | `resources/<name>/` with one entry point, `server/main.lua`, and an optional `resource.toml` ([Resources](/plugins/resources/)) |
| helper files loaded in folder order | `require` from `server/`, after putting the folder on `package.path` ([Resources → Several server files](/plugins/resources/#several-server-files)) |
| `Resources/Client/<mod>.zip` | `content/<mod>.zip`, downloaded by the launcher before the join; Lua for the game can also go in `resources/<name>/client/`, sent with the join ([Client scripts](/plugins/client-scripting/)) |
| `ServerConfig.toml` | `server.toml` ([Configuration](/hosting/configuration/)); your plugin's own settings go in the `[config]` table of its `resource.toml` and arrive as `node.config` |

### Events

`MP.RegisterEvent(name, "handlerName")` becomes `node.on(name, fn)`: the handler is the function
itself. NodeMP names have no `on` prefix; something that happened reads `playerJoined`, something a
handler can refuse reads `vehicleSpawnRequest`.

| BeamMP | NodeMP |
|---|---|
| `onInit` | the top-level code of `server/main.lua`, which runs at load and on each reload |
| `onShutdown` | `serverShutdown` |
| `onPlayerAuth` (refuses with `1` or a string) | `playerConnectRequest(player, name)`, refusing with `return false, "reason"`; read `player.guest`, `player.accountId`, `player.accountRoles`, `player.identifiers` |
| `onPlayerConnecting` | `playerAuthenticated(player)` |
| `onPlayerJoining` | `playerJoining(player)` |
| `onPlayerJoin` | `playerJoined(player)` |
| `onPlayerDisconnect` | `playerLeft(player, reason)`; `player.name` is still readable |
| `onChatMessage` (cancels with `1`) | `chatMessageRequest(player, msg)`: `return false, "reason"` refuses, `{ handled = true }` takes the line as a command ([Chat](/plugins/chat/)) |
| `onVehicleSpawn` (refuses with `1`) | `vehicleSpawnRequest(player, requestedId, config)` to decide, `vehicleSpawned(vehicle)` after |
| `onVehicleEdited` | `vehicleEditRequest(player, vehicle, config)` to decide, `vehicleEdited` after |
| `onVehicleDeleted` | `vehicleDeleted(vehicle, cause)`; only `vehicle.id` still means anything |
| `onVehicleReset` | `vehicleReset(player, vehicle, posRot)`, observe only |
| `onVehiclePaintChanged` | `vehiclePaintRequest(player, vehicle, paints)` to decide, `vehiclePainted` after |
| `onFileChanged` | `node.fs.watch(path, fn)` for a file in the resource folder ([Storage and files](/plugins/storage/#watching-a-file)) |
| `onConsoleInput` | none: the console has its own fixed commands ([Administration](/hosting/administration/#the-console)); give admins chat commands instead |

A request handler that returns nothing allows. Events BeamMP never had, such as seat changes, door
and trigger requests, position streams and the relay filter, are on [Events](/plugins/events/).

### Players

| BeamMP | NodeMP |
|---|---|
| `MP.GetPlayerName(pid)` | `player.name` |
| `MP.GetPlayerIDByName(name)` | `node.players.find(name)` returns the `Player` |
| `MP.GetPlayers()` | `node.players.all()` (an array of `Player`), `node.players.ids()` |
| `MP.GetPlayerCount()` | `node.players.count()` |
| `MP.IsPlayerConnected(pid)` | `player:isConnected()` |
| `MP.IsPlayerGuest(pid)` | `player.guest` |
| `MP.GetPlayerIdentifiers(pid)` | `player.identifiers` (`"nodemp:<id>"`, `"discord:<id>"`, `"ip:<addr>"`), `player.accountId`, `player.ip` |
| the role from `onPlayerAuth` | `player.accountRoles` (the NodeMP website's roles); `player.role` is this server's own, given with `player:setRole` |
| `MP.DropPlayer(pid, reason)` | `player:kick(reason)` |
| bans kept by the plugin | `player:ban(reason, untilUnix)`, `node.bans.add`, `node.bans.remove`, kept by the server in `bans.json` ([Players and vehicles](/plugins/players-and-vehicles/#kicking-and-banning)) |

### Vehicles

| BeamMP | NodeMP |
|---|---|
| the `(pid, vid)` pair | one id per car, `vehicle.id`, unique on the server; `vehicle.spawner`, `vehicle.driver` and `vehicle.authority` are the players around it |
| `MP.GetPlayerVehicles(pid)` | `player:vehicles()`; `vehicle:config()` is the configuration as a table |
| `MP.GetPositionRaw(pid, vid)` | `vehicle:transform()` (`pos`, `rot`, `vel`, `angVel`), or `player:position()` |
| `MP.RemoveVehicle(pid, vid)` | `vehicle:delete()` |
| none | `vehicle:teleport`, `vehicle:reset`, `vehicle:lock`, `vehicle:setTag`, `player:seat`, `player:spawnVehicle`, `player:freeze`: things the server can do to cars and players |

### Chat and events to clients

| BeamMP | NodeMP |
|---|---|
| `MP.SendChatMessage(pid, text)`, `-1` for everyone | `player:tell(text, ...)`; `node.chat.say(text, ...)` for everyone |
| `MP.TriggerClientEvent(pid, name, data)`, `-1` for everyone | `player:send(name, data)`; `node.broadcast(name, data)` for everyone |
| `MP.TriggerClientEventJson(pid, name, table)` | `player:send(name, table)`: a table is sent as JSON |
| `MP.TriggerGlobalEvent(name, ...)` | `node.bus.emit(name, data)` and `node.bus.on(name, fn)`; answers are a second message ([Between resources](/plugins/bus/)) |
| `MP.TriggerLocalEvent(name, ...)` | call the function |

### Timers, HTTP, files and the rest

| BeamMP | NodeMP |
|---|---|
| `MP.CreateEventTimer(name, ms)` | `node.every(ms, fn)`, which returns an id for `node.cancel(id)`; `node.after(ms, fn)` runs once |
| `MP.Sleep(ms)` | `node.sleep(ms)` inside `node.async(fn)`: only that coroutine waits ([Timers and coroutines](/plugins/concurrency/)) |
| `MP.GetTimeMS()` | `node.server.time()` (seconds with a fraction), `node.server.uptime()` |
| HTTP that waits for the answer | `node.http.get(url, headers, cb)` and friends with a callback, or `node.http.fetch(url)` inside `node.async` ([HTTP](/plugins/http/)) |
| state in files of your own | `node.storage.get(key, default)` and `node.storage.set(key, value)`, safe on disk before `set` returns ([Storage and files](/plugins/storage/)) |
| `FS.Exists`, `FS.CreateDirectory`, `FS.Copy`, `FS.Rename`, `FS.Remove`, `FS.ListFiles` | `node.fs.exists`, `node.fs.mkdir`, `node.fs.copy`, `node.fs.rename`, `node.fs.remove`, `node.fs.list`, inside the resource folder |
| `FS.ConcatPaths`, `FS.GetFilename`, `FS.GetExtension`, `FS.GetParentFolder` | `node.fs.join`, `node.fs.basename`, `node.fs.extension`, `node.fs.dirname` |
| `Util.JsonEncode`, `Util.JsonDecode`, `Util.JsonPrettify` | `node.json.encode(value)`, `node.json.decode(text)`, `node.json.encode(value, { pretty = true })` |
| `Util.JsonFlatten`, `Util.JsonDiff`, `Util.JsonDiffApply` | `node.json.flatten`, `node.json.diff`, `node.json.patch` |
| `print`, `Util.LogInfo`, `Util.LogWarn`, `Util.LogError` | `node.log(text, ...)`, `node.log.warn`, `node.log.error` |
| `MP.Get`, `MP.Set` with `MP.Settings` | `node.server.name()`, `map()`, `maxPlayers()`, `maxCars()`; `node.server.setName`, `setMaxPlayers`, `setMaxCars` |
| `Util.RandomIntRange(a, b)` | `math.random(a, b)`; `node.crypto.randomHex(n)` for a token |

## A chat plugin, ported

A BeamMP plugin that answers `/online` and announces joins:

<!-- doctest: skip BeamMP's MP.* API, shown for comparison; a NodeMP server has no MP table -->
```lua
-- Resources/Server/Greeter/main.lua (BeamMP)
function onChatMessage(pid, name, message)
    if message == "/online" then
        MP.SendChatMessage(pid, "Online: " .. MP.GetPlayerCount())
        return 1
    end
end
MP.RegisterEvent("onChatMessage", "onChatMessage")

function onPlayerJoin(pid)
    MP.SendChatMessage(-1, MP.GetPlayerName(pid) .. " joined")
end
MP.RegisterEvent("onPlayerJoin", "onPlayerJoin")
```

The same plugin as a NodeMP resource, `resources/greeter/server/main.lua`:

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/online"}]]} -->
```lua
node.on("chatMessageRequest", function(player, msg)
    if msg.text ~= "/online" then return end
    player:tell("Online: %d", node.players.count())
    return { handled = true }
end)

node.on("playerJoined", function(player)
    node.chat.say("%s joined", player.name)
end)

-- expect-client: Alice chat:msg .*Alice joined
-- expect-client: Alice chat:msg .*Online: 1
```

What changed:

1. `MP.RegisterEvent` is gone: `node.on` takes the function itself.
2. The handler gets a `Player`, so `MP.GetPlayerName(pid)` is `player.name` and
   `MP.SendChatMessage(pid, ...)` is `player:tell(...)`, with `string.format` built in.
3. `return 1` becomes `return { handled = true }`: the line goes no further, and the player sees
   only the answer.
4. `MP.SendChatMessage(-1, ...)` is `node.chat.say(...)`.

No manifest is needed: a folder with `server/main.lua` is a resource named after the folder.

## Client scripts

A client script written for BeamMP finds the globals it used: `TriggerServerEvent`,
`TriggerClientEvent`, `AddEventHandler`, `RemoveEventHandler`, the key helpers, and the module
tables `MPGameNetwork`, `MPCoreNetwork`, `MPConfig`, `MPVehicleGE` and `UI`. The client mod keeps
them so such scripts run with few changes. BeamMP's per-stream modules (`positionGE`,
`MPInputsGE`, `MPElectricsGE` and the like) aren't there; a script that needs them is rewritten
against the NodeMP client API ([Client scripts](/plugins/client-scripting/)). A
`TriggerServerEvent(name, data)` arrives on the server as a wire event, `node.on(name, fn)` with
`(player, data)`.

## Next

- [Your first resource](/plugins/getting-started/): a NodeMP resource from an empty folder.
- [Differences from BeamMP](/introduction/differences-from-beammp/): the wider comparison, beyond
  plugins.
