---
title: Moving from other platforms
description: How BeamMP and KissMP ideas map to NodeMP, what the beammp-compat module runs unchanged and what has no equivalent.
---

If you have written plugins for BeamMP or KissMP, most of what you know still applies: a server runs Lua, reacts to players and cars, and talks to scripts in the game.

## What works differently

| What | In NodeMP |
|---|---|
| Threads | The handlers of all plugins run one after another on a single worker thread. Wait with timers and coroutines ([Timers and coroutines](/plugins/concurrency/)). |
| Handlers | A handler receives a `Player` or `Vehicle` object with fields and methods, not a number ([Players and vehicles](/plugins/players-and-vehicles/)). |
| Car ids | Each car has one id, unique on the server, whoever spawned it. |
| Cars after a player leaves | They stay in the world without an owner. A plugin deletes them, for example `vehicle-cleanup` ([Players and vehicles](/plugins/players-and-vehicles/#whos-who-in-a-car)). |
| Chat | Built into the server and works without plugins. A command is a chat line that a plugin takes by returning `{ handled = true }` ([Chat and commands](/plugins/chat/)). |
| Refusal | A request handler that returns `false, "reason"` refuses, and the player sees the reason ([Events](/plugins/events/#refusing-a-request)). |
| Identity | On a server in the list NodeMP verifies each player's account, and `player.accountId` works as a key for data. |

## Where things go

| On the old platform | In NodeMP |
|---|---|
| Server plugins in `Resources/Server/<plugin>/` | `resources/<name>/`, the entry point is `server/main.lua` |
| Client mods in `Resources/Client/` | Zip mods in `content/`; Lua for the game in `resources/<name>/client/` |
| `ServerConfig.toml` | `server.toml` ([Settings reference](/hosting/configuration/)) |
| A plugin's own settings file | The `[config]` table in `resource.toml`, read as `node.config` |

## BeamMP concepts in NodeMP

| BeamMP | NodeMP |
|---|---|
| `onInit` | The top of `main.lua`, which runs when the plugin loads |
| `onPlayerAuth` | `playerConnectRequest`: `false, "reason"` refuses, `true` grants a reserved slot |
| `onPlayerConnecting` | `playerAuthenticated` |
| `onPlayerJoining` | `playerJoining` |
| `onPlayerJoin` | `playerJoined` |
| `onPlayerDisconnect` | `playerLeft`, with the reason |
| `onChatMessage` | `chatMessageRequest`: refuse, rewrite or take the line as a command |
| `onVehicleSpawn` | `vehicleSpawnRequest` |
| `onVehicleEdited` | `vehicleEditRequest` |
| `onVehicleDeleted` | `vehicleDeleted` |
| `onVehicleReset` | `vehicleReset` |
| `onShutdown` | `serverShutdown`; the plugin saves its data in `resourceUnload` |
| `MP.SendChatMessage` | `player:tell`, and `node.chat.say` for everyone |
| `MP.DropPlayer` | `player:kick(reason)` |
| `MP.GetPlayers`, `MP.GetPlayerName` | `node.players.all()`, `player.name` |
| `MP.IsPlayerGuest`, `MP.GetPlayerIdentifiers` | `player.guest`, `player.accountId`, `player.identifiers` |
| `MP.TriggerClientEvent` | `player:send(name, data)` or `node.broadcast` |
| `MP.TriggerGlobalEvent` | `node.bus.call`, which returns what the handlers returned, or `node.bus.emit` if nobody needs to answer ([The bus](/plugins/bus/#asking-and-answering)) |
| `MP.CreateEventTimer`, `MP.CancelEventTimer` | `node.every(ms, fn)`, `node.cancel(id)`; `CallStrategy.Precise` corresponds to `node.every(ms, fn, { precise = true })` |
| `onConsoleInput` | `node.console.command(name, fn)` or the `consoleInput` event for whole lines |
| `MP.Sleep` | `node.sleep(ms)` inside `node.async`, without blocking |
| `MP.GetPlayerVehicles`, `MP.RemoveVehicle` | `player:vehicles()`, `vehicle:delete()` |
| `MP.GetPositionRaw` | `vehicle:transform()` or `node.vehicles.transforms()` for all cars |
| `MP.Set(MP.Settings.MaxPlayers, n)` | `node.server.setMaxPlayers(n)` |
| `Util.JsonEncode`, `Util.JsonDecode` | `node.json.encode`, `node.json.decode` |
| `FS.*` | `node.fs.*`, within the plugin's folder |
| `TriggerServerEvent` in a client mod | `node.emitServer` or `NodeMP.events.triggerServer` |
| `AddEventHandler` in a client mod | `node.on` or `NodeMP.events.on` |

The same welcome and command as a NodeMP plugin:

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/hello"}]]} -->
```lua
local function announceJoin(player)
    node.chat.say("%s joined the server", player.name)
end

node.on("playerJoined", announceJoin)

local function answerHello(player, msg)
    if msg.text ~= "/hello" then return end
    player:tell("Hello, %s!", player.name)
    return { handled = true }
end

node.on("chatMessageRequest", answerHello)

-- expect-client: Alice chat:msg .*Alice joined the server
-- expect-client: Alice chat:msg .*Hello, Alice!
```

## KissMP concepts in NodeMP

There is no KissMP compatibility module: a KissMP plugin has to be rewritten. The equivalents:

| KissMP | NodeMP |
|---|---|
| Hooks for a player connecting and leaving | `playerConnectRequest`, `playerJoined`, `playerLeft` |
| The chat hook | `chatMessageRequest` |
| Hooks for spawning, resetting and deleting cars | `vehicleSpawnRequest`, `vehicleSpawned`, `vehicleReset`, `vehicleDeleted` |
| The hook that runs on every server tick | `serverTick`, or better a timer: `node.every(ms, fn)` |
| A connection object: name, messages, kick | `Player`: `player.name`, `player:tell`, `player:kick` |
| The list of cars and their positions | `node.vehicles.all()`, `node.vehicles.transforms()` |
| Data in files | `node.storage`, `node.fs` or the [db module](/plugins/database/) |
| Lua that is sent to players | The plugin's `client/` files ([Client scripts](/plugins/client-scripting/)) |
| Mods the server hands out | Zip archives in `content/` ([Mods and maps](/hosting/mods/)) |

## BeamMP plugins without changes

The `beammp-compat` native module runs BeamMP server plugins as they are. It is a language host: it claims `type = "beammp"` and gives each such plugin the `MP`, `Util` and `FS` tables that a BeamMP plugin expects.

`beammp-compat` isn't in the server archive: it is built from source with CMake, like the other [native modules](/plugins/examples/#built-from-source-not-in-the-archive). Put `beammp-compat.dll` in the `modules/` folder. Then lay the plugin out as a folder in `resources/`:

```text
resources/
└── my-plugin/
    ├── resource.toml
    ├── main.lua         ← the plugin's files, unchanged
    ├── commands.lua
    └── client/          ← the client mod's files, unpacked (optional)
```

```toml
name = "my-plugin"
type = "beammp"

[server]
main = "main.lua"
```

The file from `[server] main` runs first, then all the other `.lua` files directly in the folder, in alphabetical order, in one Lua state as in BeamMP, and then `onInit`. Name one of the files as the entry point: the server doesn't count a folder without `server/main.lua` and without client files as a plugin.

### What runs as it is

- Every player and vehicle event from the table above, with BeamMP's arguments, plus `postPlayerAuth`, `postChatMessage`, `postVehicleSpawn` and `postVehicleEdited`.
- Custom events from clients, `MP.TriggerLocalEvent` and `MP.TriggerGlobalEvent` between plugins, timers, `MP.Get` for the player and car limits, the map and the name, and `MP.Set` for the limits and the name.
- `Util.Json*`, `Util.Random*`, `Util.Log*` and `FS.*` for files and folders.
- In the game, the client global names that the BeamMP client mod calls: `TriggerServerEvent`, `TriggerClientEvent`, `AddEventHandler`, `MPGameNetwork`, `MPCoreNetwork`, `MPConfig`, `MPVehicleGE`, `UI`.

### What behaves differently

- In `onVehicleSpawn` the car id is the one the client proposed, `0` for a new car: NodeMP assigns the real id after the decision. `postVehicleSpawn` brings it.
- `MP.SendChatMessage` shows the line as a system line.
- `MP.Sleep` blocks the worker thread and with it all plugins. The module warns about this once.
- The identifier that BeamMP calls `beammp` is the player's NodeMP account number.
- A plugin, like any other, reaches only its own folder ([the Lua environment](/plugins/resources/#the-lua-environment)). Paths it builds as `Resources/Server/<plugin>/…` in `FS.*`, `io.open` and the like lead to the plugin's folder. A plugin that reads other folders, starts programs or reads environment variables needs the host to list it in `[resources] trusted`.

### What has no equivalent

- `onConsoleInput` and `onFileChanged` never fire.
- `MP.ConfirmationDialog`, `Util.JsonDiff` and `Util.JsonDiffApply` are stubs.
- There is no `Http.CreateConnection`: a blocking HTTP request would stop the server. Use `node.http` from a Lua plugin.
- `exit()` only writes a warning: a plugin can't stop the server this way.
- In the game there are no modules for separate data streams: `MPInputsGE`, `MPElectricsGE`, `MPPowertrainGE`, `positionGE`, `MPHelpers`, `MPUpdatesGE` and `MPModManager`.

To rewrite a plugin piece by piece, take `mp.lua` and `mp_backend_node.lua` from the module's sources. Put them next to `server/main.lua` of an ordinary Lua plugin and load them with `require("mp")` ([Several files](/plugins/resources/#several-files)): the plugin gets the same `MP`, `Util` and `FS` tables. Then old code and new code written against `node` run in one plugin.
