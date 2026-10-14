---
title: Client scripts
description: The client half of a resource - how files reach the game, game-engine files and extensions, talking to the server, files that run inside the car, settings and strict sessions for the session.
---

Everything in a resource's `client/` folder is sent to every player who joins and runs inside their
BeamNG.drive. The player installs nothing; when they leave the server, the scripts go away.

## How files reach the game

- The server packs the client files once, when it starts: every `.lua` under `client/`, or the
  files `[client] files` names. It checks their syntax and obfuscates them
  ([Resources](/hosting/resources/#obfuscating-client-scripts)).
- They go to the player right after the map name, so they run while the map is still loading.
- One file may be up to 900 KB, a whole resource up to 8 MB and 512 files.
- In the game the files are compiled in memory. Nothing is written to the player's disk, and no file
  of the game or of the client mod can be replaced.

A player's errors end up in their own `beamng.log`, not on the server. While you develop, set
`[client] obfuscation = "none"` so the lines in that log stay readable.

## Game-engine files

Every client file outside `lua/vehicle/` runs in the game engine, where the game's own Lua API is
available. Each file is a module: it runs once, and what it returns is what `require` gives the
other files of the resource. `require("ui")` loads `client/ui.lua`.

A file that returns a table with `on…` functions becomes a game extension: the game calls those
functions like any extension's, `onUpdate(dt)` every frame included.

<!-- doctest: client -->
```lua
local M = {}

local shown = 0

node.on("race:start", function(data)
    local race = jsonDecode(data)
    ui_message("Race: " .. race.laps .. " laps", 5, "race")
    shown = 0
end)

function M.onUpdate(dt)
    shown = shown + dt
end

return M
```

## Extensions and the mod script

Since client mod 1.7.6 a resource's client files load the way a mod's would.

A file under `client/lua/ge/extensions/` is an extension under the name the game gives that path:
`client/lua/ge/extensions/race/hud.lua` is `race_hud`. As after `extensions.load`, it's a global of
that name, the extensions in its `M.dependencies` load before it, and its `on…` functions get the
game's events.

<!-- doctest: client -->
```lua
-- client/lua/ge/extensions/race/hud.lua
local M = {}

M.dependencies = { "race_core" }

function M.onExtensionLoaded()
    ui_message("Laps: " .. race_core.laps(), 5, "race")
end

return M
```

### Which files run

Without a mod script every file runs, in the order they arrive: sorted by path, with the files
directly in `lua/ge/extensions/` first, or in the order of `[client] files`. An extension's
dependencies still run before it.

### A mod script

To decide what loads, as a mod's `modScript.lua` does, put one at
`client/scripts/<name>/modScript.lua` or `client/modScript.lua`. The mod script then runs first, and
only what it loads runs:

<!-- doctest: client -->
```lua
-- client/scripts/race/modScript.lua
setExtensionUnloadMode("race_core", "manual")
setExtensionUnloadMode("race_hud", "manual")
loadManualUnloadExtensions()
```

`load`, `extensions.load`, `setExtensionUnloadMode` with `loadManualUnloadExtensions`, and
`registerCoreModule` load the resource's own extension of that name. Extensions marked `"manual"`
load in the order they were marked, here `race_core` and then `race_hud`, and they load even if the
script forgets `loadManualUnloadExtensions()`. Several mod scripts run in path order.

### Mods from the content folder

A name the resource doesn't have is the game's: for example an extension from a mod in the server's
`content/` folder. Such a mod needs no `scripts/` folder of its own. The resource loads its
extension when it arrives and, if the extension wasn't loaded before, unloads it when the player
leaves.

<!-- doctest: client -->
```lua
-- client/modScript.lua
load("race_core")      -- the resource's: client/lua/ge/extensions/race/core.lua
load("bigmap_sounds")  -- the game's: an extension of a mod in content/
```

## Talking to the server

A client file has a `node` table of its own, smaller than the server's:

| Call | What it does |
|---|---|
| `node.on(name, fn)` | Calls `fn(data)` for a wire event from the server. `data` is a string. |
| `node.off(name)` | Unsubscribes. |
| `node.emitServer(name, data)` | Sends a wire event to the server. `data` must be a string. |
| `node.log(text)` | Writes to the game's `beamng.log`. |

The server side of the same conversation:

<!-- doctest: server+client {"emit": [["race:ready", "{\"car\": \"pickup\"}"]]} -->
```lua
node.on("race:ready", function(player, data)
    local ready = node.json.decode(data)
    node.log("%s is ready in a %s", player.name, ready.car)
    player:send("race:start", { laps = 3 })
end)

-- expect: Alice is ready in a pickup
-- expect-client: Alice race:start .*"laps":3
```

`player:send` and `node.broadcast` turn a table into JSON; on the client, decode it with the game's
`jsonDecode`, and encode with `jsonEncode` before `node.emitServer`. What a client sends goes to the
server only: for other players to see it, the server half passes it on.

Handlers registered with `node.on` in a resource file are removed when the player leaves the server.
The client mod also has `NodeMP.events.on` and `NodeMP.events.triggerServer`, which encode and decode
JSON by themselves; they're meant for ordinary game mods and stay registered after the session.

## Files that run inside the car

A file under `client/lua/vehicle/` doesn't run in the game engine. The client mod puts it into the
Lua of every car the player drives, when the resource arrives and again whenever the player spawns a
car, and runs it there once.

Inside a car there is no `node` table. The client mod's vehicle API is there instead:

| Call | What it does |
|---|---|
| `NodeMP.isLocal()` | `true` when this player's game simulates the car. |
| `NodeMP.vehicle.id()` | The car's id in this game. |
| `NodeMP.electrics.get(name)` | An electrics value: `"rpm"`, `"lights"`, `"gear"` … |
| `NodeMP.keys.onPressed(key, fn)` | Calls `fn` when the key is pressed. |
| `NodeMP.triggerServer(name, data)` | Sends a wire event to the server; a table goes as JSON. |

<!-- doctest: client -->
```lua
-- client/lua/vehicle/ready.lua
if NodeMP.isLocal() then
    NodeMP.triggerServer("race:car", { id = NodeMP.vehicle.id() })
end
```

A car can send but not receive: server events arrive in the game engine. Scripts put into a car can't
be taken out cleanly, and the client mod warns about that when the resource arrives. Keep them short;
anything bigger is better shipped as a mod in `content/`.

## Settings for the session

When a player joins, their client mod asks `modules:request`, and a resource can answer with
`modules:manifest`. Through the `settings` module the server fixes some of the player's options for
the session: they show as **Set by the server** and go back to the player's own values afterwards.

<!-- doctest: server+client {"emit": [["modules:request", ""]]} -->
```lua
node.on("modules:request", function(player)
    player:send("modules:manifest", { modules = {
        nametags = { enabled = true, config = { maxDistance = 40 } },
        settings = { config = { ["nodemp.chat.visibleLines"] = 4 } },
    } })
end)

-- expect-client: Alice modules:manifest .*maxDistance
```

The `settings` keys a server may fix are `nodemp.nametags.keepVisible`, `nodemp.nametags.maxLength`,
`nodemp.chat.visibleLines`, `nodemp.chat.fadeSeconds`, `nodemp.chat.timestamps` and
`nodemp.hud.showPlayerIds`. The `nametags` module takes `style`, `maxDistance`, `fadeStart`,
`fadeDistance`, `showDistance`, `hideOwn`, `showEmpty` and `hideBehindObjects`.

## Strict sessions

`player:send("session:config", { strict = true })` puts the player into a strict session: no free
camera, no switching into cars the server didn't seat them in, no console or editor, local mods off.
`{ strict = false }` lifts it. A table instead of `true` sets details such as who may use photo mode.
While strict, the client mod reports to the server regularly and on every breach it sees; a resource
judges those reports. The server half pairs with `player:setStrict(true)`
([Players and vehicles](/plugins/players-and-vehicles/)).

## Binary data

For a stream that JSON would make too big, there are numbered binary channels:
`node.sendModule(channel, bytes)` and `node.onModule(channel, fn)` on the client,
`node.modules.on(channel, fn)` and `node.modules.send(player, channel, bytes)` on the server. Nothing
is encoded on the way.
