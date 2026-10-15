---
title: Moving from other platforms
description: For authors of BeamMP and KissMP plugins - how their ideas map to NodeMP, what the beammp-compat module runs unchanged, and what has no equivalent.
---

If you have written plugins for BeamMP or KissMP, most of what you know carries over: a server runs
Lua, reacts to players and cars, and talks to scripts in the game. This page maps the ideas, then
shows how to run a BeamMP plugin as it is.

## What works differently

- **Everything runs on one thread.** Handlers of all resources take turns on one worker. A handler
  that sleeps or loops holds up every other resource. Waiting is done with timers and coroutines
  ([Timers and coroutines](/plugins/concurrency/)).
- **Handlers get objects.** A handler receives a `Player` or a `Vehicle` with fields and methods, not
  a bare number ([Players and vehicles](/plugins/players-and-vehicles/)).
- **Car ids are global.** Every car has one id, unique on the server, whoever spawned it.
- **Cars outlive their owner.** When a player leaves, their cars stay in the world without an owner.
  If your plugin expects them gone, delete them, or install `vehicle-cleanup`.
- **Chat is part of the server.** It works with no plugin. A command is a chat line a resource takes
  by returning `{ handled = true }` ([Chat and commands](/plugins/chat/)).
- **Refusals carry a reason.** Returning `false, "reason"` from a request shows the reason to the
  player.
- **Identity is checked.** On a listed server every player's account is verified by NodeMP;
  `player.accountId` is the stable key to keep data by.

## Where things go

| On the old platform | In NodeMP |
|---|---|
| Server plugins in `Resources/Server/<plugin>/` | `resources/<name>/`, with `server/main.lua` as the entry point |
| Client mods in `Resources/Client/` | Mod zips in `content/`; Lua for the game in `resources/<name>/client/` |
| `ServerConfig.toml` | `server.toml` ([Server settings](/hosting/configuration/)) |
| A plugin's own settings file | The `[config]` table of `resource.toml`, read as `node.config` |

## BeamMP concepts in NodeMP

| BeamMP | NodeMP |
|---|---|
| `onInit` | The top of `main.lua`, which runs when the resource loads |
| `onPlayerAuth` | `playerConnectRequest`: return `false, "reason"` to refuse, `true` for a reserved slot |
| `onPlayerConnecting` | `playerAuthenticated` |
| `onPlayerJoining` | `playerJoining` |
| `onPlayerJoin` | `playerJoined` |
| `onPlayerDisconnect` | `playerLeft`, with the reason |
| `onChatMessage` | `chatMessageRequest`: refuse, rewrite, or take the line as a command |
| `onVehicleSpawn` | `vehicleSpawnRequest` |
| `onVehicleEdited` | `vehicleEditRequest` |
| `onVehicleDeleted` | `vehicleDeleted` |
| `onVehicleReset` | `vehicleReset` |
| `onShutdown` | `serverShutdown`, and `resourceUnload` for the resource's own last word |
| `MP.SendChatMessage` | `player:tell`, or `node.chat.say` for everyone |
| `MP.DropPlayer` | `player:kick(reason)` |
| `MP.GetPlayers`, `MP.GetPlayerName` | `node.players.all()`, `player.name` |
| `MP.IsPlayerGuest`, `MP.GetPlayerIdentifiers` | `player.guest`, `player.accountId`, `player.identifiers` |
| `MP.TriggerClientEvent` | `player:send(name, data)`, or `node.broadcast` |
| `MP.TriggerGlobalEvent` | `node.bus.call`, which returns what the handlers return, or `node.bus.emit` when nobody needs to answer ([The bus](/plugins/bus/#asking-and-answering)) |
| `MP.CreateEventTimer`, `MP.CancelEventTimer` | `node.every(ms, fn)`, `node.cancel(id)`; `CallStrategy.Precise` is `node.every(ms, fn, { precise = true })` |
| `onConsoleInput` | `node.console.command(name, fn)`, or the `consoleInput` event for whole lines |
| `MP.Sleep` | `node.sleep(ms)` inside `node.async`, which doesn't block |
| `MP.GetPlayerVehicles`, `MP.RemoveVehicle` | `player:vehicles()`, `vehicle:delete()` |
| `MP.GetPositionRaw` | `vehicle:transform()`, or `node.vehicles.transforms()` for every car |
| `MP.Set(MP.Settings.MaxPlayers, n)` | `node.server.setMaxPlayers(n)` |
| `Util.JsonEncode`, `Util.JsonDecode` | `node.json.encode`, `node.json.decode` |
| `FS.*` | `node.fs.*`, inside the resource folder |
| `TriggerServerEvent` in a client mod | `node.emitServer`, or `NodeMP.events.triggerServer` |
| `AddEventHandler` in a client mod | `node.on`, or `NodeMP.events.on` |

The same welcome and command, as a NodeMP resource:

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/hello"}]]} -->
```lua
node.on("playerJoined", function(player)
    node.chat.say("%s joined the server", player.name)
end)

node.on("chatMessageRequest", function(player, msg)
    if msg.text ~= "/hello" then return end
    player:tell("Hello, %s!", player.name)
    return { handled = true }
end)

-- expect-client: Alice chat:msg .*Alice joined the server
-- expect-client: Alice chat:msg .*Hello, Alice!
```

## KissMP concepts in NodeMP

KissMP has no compatibility layer in NodeMP; a KissMP plugin is rewritten. The ideas map closely:

| KissMP | NodeMP |
|---|---|
| Hooks for a player connecting and leaving | `playerConnectRequest`, `playerJoined`, `playerLeft` |
| The chat hook | `chatMessageRequest` |
| Hooks for cars being spawned, reset and removed | `vehicleSpawnRequest`, `vehicleSpawned`, `vehicleReset`, `vehicleDeleted` |
| The hook that runs every server tick | `serverTick`, or better a timer: `node.every(ms, fn)` |
| A connection object: name, messages, kick | A `Player`: `player.name`, `player:tell`, `player:kick` |
| The list of cars and their positions | `node.vehicles.all()`, `node.vehicles.transforms()` |
| Keeping data in files | `node.storage`, `node.fs`, or the [db module](/plugins/database/) |
| Lua sent to players | A resource's `client/` files ([Client scripts](/plugins/client-scripting/)) |
| Mods the server hands out | Zips in `content/` ([Mods and maps](/hosting/mods/)) |

## BeamMP plugins without changes

The `beammp-compat` native module runs BeamMP server plugins as they are. It's a language host: it
claims `type = "beammp"` and gives each such resource the `MP`, `Util` and `FS` tables a BeamMP
plugin expects.

`beammp-compat` isn't in the server archive; it's built from source with CMake, like the other
[native modules](/plugins/examples/#built-from-source-not-in-the-archive). Put
`beammp-compat.dll` into `modules/` next to the server. Then make the plugin a resource:

```
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

The entry named in `[server] main` runs first, then every other `.lua` directly in the folder in
alphabetical order, all in one Lua state as in BeamMP; then `onInit`. Name one of the files as the
entry: a folder without `server/main.lua` and without client files isn't counted as a resource at
all.

### What runs as it is

- Every player and vehicle event in the table above, with BeamMP's arguments, plus
  `postPlayerAuth`, `postChatMessage`, `postVehicleSpawn` and `postVehicleEdited`.
- Custom events from clients, `MP.TriggerLocalEvent` and `MP.TriggerGlobalEvent` between hosted
  plugins, timers, `MP.Get` and `MP.Set` for the player and car limits, the map and the name.
- `Util.Json*`, `Util.Random*`, `Util.Log*`, and `FS.*` for files and folders.
- In the game, the client globals a BeamMP client mod calls: `TriggerServerEvent`,
  `TriggerClientEvent`, `AddEventHandler`, `MPGameNetwork`, `MPCoreNetwork`, `MPConfig`,
  `MPVehicleGE`, `UI`.

### What behaves differently

- In `onVehicleSpawn` the vehicle id is the one the client proposed, `0` for a new car: NodeMP
  assigns the real id after the decision. `postVehicleSpawn` brings the real one.
- `MP.SendChatMessage` shows the line as a system line.
- `MP.Sleep` blocks the worker, and with it every resource. The module warns once.
- The identifier BeamMP calls `beammp` is the player's NodeMP account number.
- A plugin reaches its own folder only, as every resource does
  ([the Lua environment](/plugins/resources/#the-lua-environment)). Paths it builds as
  `Resources/Server/<plugin>/…`, in `FS.*`, `io.open` and the like, lead to the resource folder.
  A plugin that reads other folders, runs programs or reads environment variables needs the host
  to list it in `[resources] trusted`.

### What has no equivalent

- `onConsoleInput` and `onFileChanged` never fire.
- `MP.ConfirmationDialog`, `Util.JsonDiff` and `Util.JsonDiffApply` are stubs.
- `Http.CreateConnection` isn't provided: a blocking HTTP call would stop the server. Use
  `node.http` from a Lua resource.
- `exit()` only logs a warning: a resource can't stop the server this way.
- In the game, the per-stream modules `MPInputsGE`, `MPElectricsGE`, `MPPowertrainGE`, `positionGE`,
  `MPHelpers`, `MPUpdatesGE` and `MPModManager` aren't there.

To move away from the compatibility layer step by step, the module's sources also carry `mp.lua`,
which gives an ordinary Lua resource the same `MP`, `Util` and `FS` tables. Old code and new code
written against `node` can then live in one resource while you rewrite it piece by piece.
