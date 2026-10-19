---
title: Client scripts
description: How client files reach the game, engine files and extensions, talking to the server, files inside the car, session settings and strict sessions.
---

Everything in a plugin's `client/` folder goes to every player on joining and runs in their BeamNG.drive. The player installs nothing, and the mod unloads these scripts when the player leaves the server.

## How files reach the game

- The server packs the client files once, at startup: every `.lua` file in `client/`, or those listed in `[client] files`. It checks their syntax and obfuscates them ([Plugins on the server](/hosting/resources/#obfuscating-client-scripts)). A syntax error goes to the server log, but the file still ships.
- The server sends the files to a player right after the map name, and they run while the map is still loading.
- The server skips a file larger than 900 KB after packing, with a warning in the log. The mod takes at most 512 files and 8 MB from one plugin and drops a plugin over either limit whole.
- The mod accepts a plugin name of up to 128 characters: Latin letters, digits, dots, underscores and hyphens, starting with a letter or a digit. It rejects a plugin with any other name.
- A file path may have up to 256 characters, the same ones plus `/`, and no `..`; the mod skips a file with any other path.
- The mod compiles the files in memory and writes nothing to the player's disk.

Errors on the player's side go to their own `beamng.log`, not to the server. While developing, set `[client] obfuscation = "none"` to keep that log readable.

## Game-engine files

Every client file outside `lua/vehicle/` runs in the game engine, with the game's own Lua API. Such a file is a module: it runs once, and what it returns is what the plugin's other files get from `require`; `require("ui")` loads `client/ui.lua`.

A file that returns a table with `on…` functions becomes a game extension, and the game calls them as for any extension, `onUpdate(dt)` every frame included.

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

A file under `client/lua/ge/extensions/` becomes an extension named as the game names that path: `client/lua/ge/extensions/race/hud.lua` is `race_hud`. As after `extensions.load`, it becomes a global of that name, the extensions in its `M.dependencies` load first, and its `on…` functions get the game's events.

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

Without a mod script every file runs in arrival order: by path, with files directly in `lua/ge/extensions/` first, or in the order of `[client] files`. An extension's dependencies still run before it.

### The mod script

To choose what loads, put a mod script at `client/scripts/<name>/modScript.lua` or `client/modScript.lua`, as in an ordinary game mod. It runs first, and only what it loads runs:

<!-- doctest: client -->
```lua
-- client/scripts/race/modScript.lua
setExtensionUnloadMode("race_core", "manual")
setExtensionUnloadMode("race_hud", "manual")
loadManualUnloadExtensions()
```

`load`, `extensions.load`, `setExtensionUnloadMode` with `loadManualUnloadExtensions`, and `registerCoreModule` load the plugin's own extension of that name. Extensions marked `"manual"` load in the order marked (here `race_core`, then `race_hud`), even if the script forgets `loadManualUnloadExtensions()`. Several mod scripts run in path order.

### Mods from the content folder

A name the plugin doesn't have belongs to the game, such as an extension of a mod in the server's `content/` folder; that mod needs no `scripts/` folder of its own. The NodeMP mod loads the extension when the plugin arrives and, if it wasn't loaded before the plugin, unloads it when the player leaves.

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

On the client a plugin has one handler per event name: another `node.on` with that name replaces it, even from another file of the plugin.

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

`player:send` and `node.broadcast` turn a table into JSON; on the client the game's `jsonDecode` parses it, and `jsonEncode` encodes a table for `node.emitServer`. What a client sends reaches only the server; for other players to see it, the server half must pass it on.

The plugin's `node.on` handlers are removed when the player leaves the server. The client mod's `NodeMP.events.on` and `NodeMP.events.triggerServer` parse and encode JSON themselves; they are meant for ordinary game mods and stay subscribed after the session.

## Files that run inside the car

A file from `client/lua/vehicle/` doesn't run in the game engine. The client mod inserts it into the Lua of every car the player drives (when the plugin arrives and on every spawn) and runs it there once.

Inside a car, the client mod's car API takes the place of the `node` table:

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

A car can send but not receive: server events arrive in the game engine. Scripts inserted into a car can't be removed cleanly, and the client mod logs a warning about it when the plugin arrives. Keep them short and ship anything bigger as a mod in `content/`.

## Settings for the session

When a player joins, the client mod sends `modules:request`, and a plugin can answer with `modules:manifest`. With the `settings` module a plugin fixes some of the player's settings for the session: they show *Set by the server* and return to the player's values after the player leaves.

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

`settings` can fix `nodemp.nametags.keepVisible`, `nodemp.nametags.maxLength`, `nodemp.chat.visibleLines`, `nodemp.chat.fadeSeconds`, `nodemp.chat.timestamps`, `nodemp.hud.showPlayerIds` and four for scheduled changes: `nodemp.schedule.applyWhen`, `nodemp.schedule.interval`, `nodemp.schedule.stopSpeed` and `nodemp.schedule.stopTime`. The `nametags` module takes `style`, `maxDistance`, `fadeStart`, `fadeDistance`, `showDistance`, `hideOwn`, `showEmpty` and `hideBehindObjects`.

## Strict sessions

`player:send("session:config", { strict = true })` puts the player in a strict session: no free camera, no switching into cars the server didn't seat them in, no console or editor, local mods off. The mod undoes pause and slow motion, allows node grabbing only on foot and in first person, and reports to the server resets, recoveries, teleports and game files replaced in the user folder. `{ strict = false }` ends the session. A `session:config` without a `strict` key changes nothing, and one that arrives before the session starts applies when it starts.

Instead of `true` you can pass a table with details:

| Key | What it means | Default |
|---|---|---|
| `actions` | A list of input actions to turn off; an empty list turns off none. | The mod's set |
| `photoMode` | Who may use photo mode: `"admins"`, `"all"` or `"none"`. | `"admins"` |
| `canPhoto` | Whether this player may use photo mode when `photoMode` is `"admins"`. | `false` |
| `nodeGrab` | `"walking"` allows node grabbing only on foot, `"off"` allows it nowhere. | `"walking"` |
| `heartbeatMs` | How often the mod reports to the server, from 500 to 60000 ms. | `2000` |

In a strict session the mod sends the server wire events: `rp:strict.heartbeat` every `heartbeatMs`, with `seq`, `filtersHash`, `filtersCount`, `camera`, `vehicleId`, `walking`, `timeScale` and `checksum`, and `rp:strict.violation` with `kind` and `details` for each breach it notices. A plugin judges by these reports. On the server, `player:setStrict(true)` adds to the strict session: the server stops forwarding to others the player's camera frames aimed at a car the player isn't in.

## Binary data

For a stream too heavy for JSON there are numbered binary channels: a channel number is an integer from 0 to 4294967295, and the bytes go as they are. On the client these are `node.sendModule(channel, bytes)` and `node.onModule(channel, fn)`, on the server `node.modules.on(channel, fn)` and `node.modules.send(player, channel, bytes)`.
