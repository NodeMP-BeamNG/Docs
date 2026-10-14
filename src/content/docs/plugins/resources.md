---
title: Resources
description: The resource folder from a developer's side - layout, every resource.toml key, load order, the client half and its obfuscation, settings, and reloading.
---

A resource is one folder in `resources/`, next to `server.toml`. This page is what the server does
with that folder: what goes where, what each manifest key changes, when files are read, and what a
reload keeps. Installing resources on a server is on [Resources and mods](/hosting/resources/).

## Layout

```
resources/
└── race/
    ├── resource.toml               # optional manifest
    ├── server/
    │   ├── main.lua                # the server entry point
    │   └── util.lua                # more server files, loaded with require
    ├── client/
    │   ├── main.lua                # a game script, sent to players
    │   └── lua/
    │       ├── ge/extensions/      # sent first
    │       └── vehicle/            # runs inside the players' vehicles
    └── data/
        └── tracks.json             # yours, read with node.fs
```

Only the manifest, the server entry point and `client/` mean something to the server. Everything
else in the folder is yours to read and write with `node.fs`. State that must survive goes in
`node.storage`, which lives outside the folder ([Storage and files](/plugins/storage/)).

### Several server files

The server half starts from one file. Lua's `require` looks relative to the server's working
directory, not to your folder, so put your folder on the path first:

<!-- doctest: server {"files": {"server/util.lua": "return { greet = function() return \"hello from util.lua\" end }"}} -->
```lua
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]") -- .../resources/race/server
package.path = here .. "/?.lua;" .. package.path
local util = require("util") -- server/util.lua
node.log(util.greet())

-- expect: hello from util.lua
```

`require` loads Lua files only: loading C libraries is switched off inside resources. Native code
belongs in a [native module](/plugins/native-modules/). Client files don't need the trick above:
inside the client half, `require("lib/helpers")` finds the resource's own files first.

## resource.toml

Every key is optional. A folder without a manifest is a Lua resource named after the folder, with
`server/main.lua` as its entry point and every `.lua` under `client/` sent to players.

```toml
name = "race"
version = "1.0"
type = "lua"

[server]
main = "server/main.lua"

[client]
files = ["main.lua", "lua/vehicle/horn.lua"]
obfuscation = "light"

[config]
laps = 3
startDelaySec = 10
```

| Key | Default | What it changes |
|---|---|---|
| `name` | the folder name | The tag on your log lines, the name of your `node.storage` store and the name players' games file your scripts under. Use letters, digits, `_`, `-` and `.`, starting with a letter or digit: storage refuses other characters, and the game refuses a delivery whose name has them. |
| `version` | empty | Shown in the load line: `race v1.0 loaded — lua · server 1 file · 1 client file`. |
| `type` | `"lua"` | Which language runs the server half. Any other value needs a native module that teaches the server that language; without one the folder is skipped with `race · resource type 'js' has no language host loaded, skipping (a native module in modules/ must register one)`. |
| `[server] main` | `"server/main.lua"` | The entry point, relative to the folder. It must stay inside the folder. When the file doesn't exist, the resource is client-only, which is fine. |
| `[client] files` | every `.lua` under `client/` | The files to send, relative to `client/`, in this order. Without the key, files directly in `client/lua/ge/extensions/` go first and the rest follow alphabetically. A path that leaves the folder is ignored with a warning. |
| `[client] obfuscation` | `"light"` | `none`, `light`, `medium` or `strong` ([below](#obfuscation)). `off` and `false` mean `none`; `high` and `full` mean `strong`; anything else is `light`. |
| `[config]` | none | Your settings. The server doesn't read them; you get them as `node.config` ([Settings](#settings)). |

A manifest that doesn't parse is reported (`race · failed to parse resource.toml (...), using defaults`)
and the folder loads with the defaults above.

## Load order

At start the server loads native modules from `modules/`, then the folders in `resources/` one by
one, **in no guaranteed order**. Never count on another resource being loaded before yours: talk to
it over [the bus](/plugins/bus/) and cope with no answer. For each folder:

1. The manifest is read.
2. The client files are read, obfuscated and packed for sending.
3. A folder with neither a server entry point nor client files is skipped.
4. The entry point runs once, top to bottom. `node` and `node.config` are ready by then. This is
   where you subscribe to events, start timers and load your data.
5. The load line is printed.

Then `1 resource · 1 module loaded` sums it up, and the worker thread starts: timers fire,
`serverTick` runs every 100 ms, and players can join. Each joining player receives every
resource's client files with the map, before they enter the world
([Events → The join, step by step](/plugins/events/#the-join-step-by-step)).

## The client half

Files under `client/` run in the players' games. A file whose path starts with `lua/vehicle/` runs
inside the player's vehicles; every other file runs in the game itself. The full client API is on
[Client scripts](/plugins/client-scripting/); what matters here is how the files travel:

- They are packed **once, at server start**. Changing `client/` needs a restart, and players
  already in the session keep what they received.
- A single file over 900 KB is skipped, with a line in the console that names it. The game accepts
  up to 8 MB and 512 files per resource.
- They are compiled in memory under your resource's name and never written to the player's disk,
  so a resource can't replace a file of the game or of the client mod; it adds code beside them.
- The server doesn't run client files, but it does parse them, and reports one that won't compile:
  `race · client file 'main.lua' has a syntax error: main.lua:1: unexpected symbol near '=' (the file ships anyway; the game's Lua will very likely refuse it too)`.

### Obfuscation

Unless the server turns it off (`[Resources] Obfuscate = false`), each client file is obfuscated
before it's packed, at the level `[client] obfuscation` names:

- `light` renames local variables and hides string constants. Safe for code that runs every frame.
- `medium` adds indirection on locals and rewrites numbers.
- `strong` also wraps the whole file. For menus and one-time setup.

Globals and table keys are never renamed, so `M.onUpdate` and the game's hooks keep working. Use
`none` while you develop, so line numbers in the player's `beamng.log` match your source. A file the
obfuscator can't handle ships as plain source with a warning; a join never fails because of
obfuscation.

Obfuscation makes your client code harder to read and copy. It doesn't make it secret: anything
that runs on a player's PC can be read by that player. Keep rules and anything worth protecting on
the server.

## Settings

The `[config]` table of your manifest is yours. `node.config` holds it as written (strings,
numbers, booleans, arrays and nested tables), or an empty table when there is none. Put your
defaults underneath, so a host only writes what they change:

<!-- doctest: server {"config": {"laps": 5}} -->
```lua
local defaults = { laps = 3, startDelaySec = 10, announce = true }
local config = setmetatable(node.config, { __index = defaults })

node.log("%d laps, start in %d s", config.laps, config.startDelaySec)

-- expect: 5 laps, start in 10 s
```

`node.config` is read once, when the resource loads; a reload reads it again.
`node.resources.manifest()` re-reads `resource.toml` from disk and returns all of it (`name`,
`version`, `type`, `server`, `client`, `config`), or `nil` when it doesn't parse, for when you
want new settings without a reload.

## Reloading

`reload race` in the server console, or `node.resources.reload("race")` from code, reloads one
resource without restarting the server. The reload drops everything the server half set up (event
handlers, bus subscriptions, relay filters, timers, coroutines and the whole Lua state), then runs
the entry point again. The console says `race reloaded — lua`.

| Survives a reload | Doesn't |
|---|---|
| `node.storage`, files in your folder, the other resources, players and their cars | Lua variables, handlers, timers, coroutines |

`node.config` is read again, so a settings change takes effect. Client files are not packed again
(that needs a restart). An HTTP request or background job already running finishes, but its
callback goes nowhere.

`node.resources.reload` returns `true` when the request was accepted. The reload itself runs right
after the current handler returns, so a resource can safely reload itself from a chat command. It
returns `false` when no resource of that name is loaded.

### Saving before the unload

`resourceUnload` runs in the old instance just before its state is dropped, and only in the resource
being unloaded. Its argument is `"reload"` for a reload and `"shutdown"` when the server stops
(after `serverShutdown`):

<!-- doctest: server+client -->
```lua
local session = { started = node.server.uptime(), joins = 0 }

node.on("playerJoined", function() session.joins = session.joins + 1 end)

node.on("resourceUnload", function(reason)
    node.storage.set("lastSession", { reason = reason, joins = session.joins })
    node.log("%s after %d join(s)", reason, session.joins)
end)

-- expect: shutdown after 1 join\(s\)
```

Write what you must and return. A `node.storage` write made here is kept, and the new instance reads
it. Callbacks, timers and coroutines started here never run, so put nothing after an `await`. Don't
reload yourself from this handler: on a reload that queues another one, forever.

## Next

- [Events](/plugins/events/): what the server half can react to.
- [Storage and files](/plugins/storage/): `node.storage` and `node.fs`.
- [Client scripts](/plugins/client-scripting/): the client half in full.
