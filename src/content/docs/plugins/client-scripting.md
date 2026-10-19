---
title: Client scripts
description: How client files reach the game, engine files and extensions, talking to the server, files inside the car, session settings and strict sessions.
---

Everything in a plugin's `client/` folder is sent to every player when they join and runs in their BeamNG.drive. The player doesn't have to install anything, and when they leave the server the mod unloads these scripts.

## How files reach the game

- The server packs the client files once, when it starts: every `.lua` file in `client/`, or the ones listed in `[client] files`. It checks their syntax and obfuscates them ([Plugins on the server](/hosting/resources/#obfuscating-client-scripts)). A syntax error goes to the server log, but the file still goes to the players.
- The server sends the files to a player right after the map name, and they run while the map is still loading.
- The server skips a file that is larger than 900 KB after packing and writes a warning to the log. The mod accepts at most 512 files and 8 MB from one plugin, and discards a plugin that exceeds them as a whole.
- The mod accepts a plugin name of up to 128 characters made only of Latin letters, digits, dots, underscores and hyphens, starting with a letter or a digit. It rejects a plugin with any other name.
- The mod accepts a file path of up to 256 characters made of the same characters and `/`, without `..`. It skips a file with any other path.
- The mod compiles the files in memory and writes nothing to the player's disk.

Errors on the player's side go to the player's own `beamng.log`, not to the server. While you develop, set `[client] obfuscation = "none"` so the lines in that log stay readable.

## Game-engine files

Every client file outside `lua/vehicle/` runs in the game engine, where the game's own Lua API is available. Such a file is a module: it runs once, and what it returns is what the other files of the plugin get from `require`. `require("ui")` loads `client/ui.lua`.

A file that returns a table with `on…` functions becomes a game extension: the game calls these functions like those of any extension, including `onUpdate(dt)` every frame.

<!-- doctest: client -->
```lua
local M = {}

local secondsLeft = 0

local function startCountdown(data)
    secondsLeft = jsonDecode(data).countdown
end

node.on("race:start", startCountdown)

function M.onUpdate(dt)
    if secondsLeft <= 0 then return end
    secondsLeft = secondsLeft - dt
    ui_message(string.format("Start in %d", math.ceil(secondsLeft)), 1, "race")
end

return M
```

## Extensions and the mod script

A file under `client/lua/ge/extensions/` becomes an extension under the name the game gives that path: `client/lua/ge/extensions/race/hud.lua` is called `race_hud`. As after `extensions.load`, it becomes a global variable of that name, the extensions in its `M.dependencies` load before it, and its `on…` functions get the game's events.

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

Without a mod script every file runs in the order the files arrive: sorted by path with the files directly in `lua/ge/extensions/` first, or in the order of `[client] files`. An extension's dependencies still run before it.

### The mod script

To decide yourself what loads, put a mod script at `client/scripts/<name>/modScript.lua` or `client/modScript.lua`, as in an ordinary game mod. It then runs first, and only what it loads runs:

<!-- doctest: client -->
```lua
-- client/scripts/race/modScript.lua
setExtensionUnloadMode("race_core", "manual")
setExtensionUnloadMode("race_hud", "manual")
loadManualUnloadExtensions()
```

`load`, `extensions.load`, `setExtensionUnloadMode` together with `loadManualUnloadExtensions`, and `registerCoreModule` load the plugin's own extension of that name. Extensions marked `"manual"` load in the order they were marked (here `race_core` first, then `race_hud`), and they load even if the script forgets to call `loadManualUnloadExtensions()`. If there are several mod scripts, they run in path order.

### Mods from the content folder

A name the plugin doesn't have belongs to the game: for example an extension from a mod in the server's `content/` folder. Such a mod doesn't need a `scripts/` folder of its own. The NodeMP mod loads this extension when the plugin arrives, and unloads it when the player leaves if it wasn't loaded before the plugin.

<!-- doctest: client -->
```lua
-- client/modScript.lua
load("race_core")      -- the plugin's: client/lua/ge/extensions/race/core.lua
load("bigmap_sounds")  -- the game's: an extension of a mod in content/
```

## Talking to the server

A client file has a `node` table of its own, smaller than the server's:

| Call | What it does |
|---|---|
| `node.on(name, fn)` | Calls `fn(data)` for a wire event from the server. `data` arrives as a string. |
| `node.off(name)` | Unsubscribes. |
| `node.emitServer(name, data)` | Sends a wire event to the server. `data` must be a string. |
| `node.log(text)` | Writes to the game's `beamng.log`. |

On the client a plugin has one handler per event name: the next `node.on` with the same name replaces the previous one, even from another file of the plugin.

The server side of the same conversation:

<!-- doctest: server+client {"emit": [["race:ready", "{\"car\": \"pickup\"}"]]} -->
```lua
local function startRace(player, data)
    local ready = node.json.decode(data)
    node.log("%s is ready in a %s", player.name, ready.car)
    player:send("race:start", { countdown = 5 })
end

node.on("race:ready", startRace)

-- expect: Alice is ready in a pickup
-- expect-client: Alice race:start .*"countdown":5
```

`player:send` and `node.broadcast` turn a table into JSON; on the client the game function `jsonDecode` parses it, and `jsonEncode` encodes a table before `node.emitServer`. What a client sends goes only to the server: for other players to see it, the server half has to pass the message on.

The `node.on` handlers from a plugin's files are removed when the player leaves the server. `NodeMP.events.on` and `NodeMP.events.triggerServer` from the client mod parse and encode JSON themselves. They are meant for ordinary game mods and stay subscribed after the session.

## Files that run inside the car

A file from `client/lua/vehicle/` doesn't run in the game engine. The client mod inserts it into the Lua of every car the player drives (when the plugin arrives, and again every time the player spawns a car) and runs it there once.

Inside a car there is no `node` table. Instead there is the client mod's API for cars:

| Call | What it does |
|---|---|
| `NodeMP.vehicle.isLocal()` | `true` if this player's game simulates the car. |
| `NodeMP.vehicle.id()` | The car's id in this game. |
| `NodeMP.electrics.get(name)` | An electrics value: `"rpm"`, `"lights"`, `"gear"` … |
| `NodeMP.keys.onPressed(key, fn)` | Calls `fn` when the key is pressed. |
| `NodeMP.events.triggerServer(name, data)` | Sends a wire event to the server; a table goes as JSON. |

<!-- doctest: client -->
```lua
-- client/lua/vehicle/ready.lua
if NodeMP.vehicle.isLocal() then
    NodeMP.events.triggerServer("race:car", { id = NodeMP.vehicle.id() })
end
```

A car can send but not receive: server events arrive in the game engine. Scripts inserted into a car can't be removed cleanly, and the client mod warns about this in the log when the plugin arrives. Keep them short, and ship anything bigger as a mod in `content/`.

## Settings for the session

When a player joins, their client mod asks `modules:request`, and a plugin can answer with `modules:manifest`. Through the `settings` module a plugin fixes some of the player's settings for the session: the settings are marked *Set by the server*, and after the player leaves they return to the player's own values.

<!-- doctest: server+client {"emit": [["modules:request", ""]]} -->
```lua
local function answerModulesRequest(player)
    player:send("modules:manifest", { modules = {
        nametags = { enabled = true, config = { maxDistance = 40 } },
        settings = { config = { ["nodemp.chat.visibleLines"] = 4 } },
    } })
end

node.on("modules:request", answerModulesRequest)

-- expect-client: Alice modules:manifest .*maxDistance
```

Through `settings` the server can fix `nodemp.nametags.keepVisible`, `nodemp.nametags.maxLength`, `nodemp.chat.visibleLines`, `nodemp.chat.fadeSeconds`, `nodemp.chat.timestamps`, `nodemp.hud.showPlayerIds` and four settings for scheduled changes: `nodemp.schedule.applyWhen`, `nodemp.schedule.interval`, `nodemp.schedule.stopSpeed` and `nodemp.schedule.stopTime`. The `nametags` module accepts `style`, `maxDistance`, `fadeStart`, `fadeDistance`, `showDistance`, `hideOwn`, `showEmpty` and `hideBehindObjects`.

## Strict sessions

`player:send("session:config", { strict = true })` puts the player into a strict session: no free camera, no switching into cars the server didn't seat them in, no console or editor, local mods off. The mod undoes pause and slow motion, allows node grabbing only on foot and in first person, and reports resets, recoveries, teleports and replaced game files in the user folder to the server. `{ strict = false }` lifts the session. A `session:config` message without a `strict` key changes nothing, and a table that arrives before the session starts is applied when it starts.

Instead of `true` you can pass a table with details:

| Key | What it means | Default |
|---|---|---|
| `actions` | Which input actions to turn off, as a list of names. An empty list turns off nothing. | The mod's set |
| `photoMode` | Who may use photo mode: `"admins"`, `"all"` or `"none"`. | `"admins"` |
| `canPhoto` | Whether this player may use photo mode; it counts when `photoMode` is `"admins"`. | `false` |
| `nodeGrab` | `"walking"` allows node grabbing only on foot, `"off"` allows it nowhere. | `"walking"` |
| `heartbeatMs` | How often the mod reports to the server, from 500 to 60000 ms. | `2000` |

In a strict session the mod sends the server wire events: `rp:strict.heartbeat` with the fields `seq`, `filtersHash`, `filtersCount`, `camera`, `vehicleId`, `walking`, `timeScale` and `checksum` every `heartbeatMs`, and `rp:strict.violation` with the fields `kind` and `details` for each breach it notices. A plugin judges by these reports. On the server `player:setStrict(true)` complements the strict session: the server stops forwarding to other players the player's camera frames aimed at a car the player isn't sitting in.

## Binary data

For a stream that would be too heavy as JSON there are numbered binary channels. A channel number is an integer from 0 to 4294967295, and the bytes go as they are, without encoding. On the client these are `node.sendModule(channel, bytes)` and `node.onModule(channel, fn)`, on the server `node.modules.on(channel, fn)` and `node.modules.send(player, channel, bytes)`.
