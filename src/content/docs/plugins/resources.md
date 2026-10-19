---
title: How a plugin is built
description: The files of a plugin, every key of resource.toml, the Lua environment, code in several files, reloading, load errors and the log.
---

A plugin is a folder inside `resources/`. The server loads every such folder when it starts.

## The files

| Path | What it is |
|---|---|
| `resource.toml` | The plugin's description. Optional: without it the folder name is the plugin's name and everything else takes the defaults in the table below. |
| `server/main.lua` | Entry point of the server half. |
| `server/*.lua` | The rest of the server code, loaded with `require` ([below](#several-files)). |
| `client/**/*.lua` | The client half ([Client scripts](/plugins/client-scripting/)). |
| `client/lua/vehicle/*.lua` | Client files that run inside the player's cars ([Client scripts](/plugins/client-scripting/#files-that-run-inside-the-car)). |
| anything else | Your data: read and write it with `node.fs`. |

The server skips a folder that has neither a server entry point nor client files.

## resource.toml

```toml
name = "race"
version = "1.2"

[server]
main = "server/main.lua"

[client]
files = ["main.lua", "ui.lua"]
obfuscation = "medium"

[config]
laps = 3
```

| Key | Default | What it does |
|---|---|---|
| `name` | the folder name | The plugin's name in the log, in the `reload` command and in bus messages. |
| `version` | none | Shown in the log next to the name. |
| `type` | `"lua"` | What runs the server half. `"js"` needs the `js-host` module ([JavaScript plugins](/plugins/js-host/)). |
| `[server] main` | `"server/main.lua"` | The entry point, a path from the plugin's folder. |
| `[client] files` | every `.lua` file in `client/` | Which client files to send, paths from `client/`. |
| `[client] obfuscation` | `"light"` | How much to scramble client files: `"none"`, `"light"`, `"medium"` or `"strong"` ([Plugins on the server](/hosting/resources/#obfuscating-client-scripts)). |
| `[config]` | empty | The plugin's own settings, available as `node.config`. `node.resources.manifest().config` re-reads the file. |

The server refuses a path in `[server] main` or `[client] files` that leads outside the plugin's folder. If `resource.toml` can't be parsed, the server logs that and loads the plugin with the defaults.

## The Lua environment

The server half runs on Lua 5.4 with the standard libraries. On top of them there is the global `node` with the whole API ([reference](/plugins/api/lua/)). Each plugin has a Lua state of its own and can't see another plugin's globals.

On disk a plugin reaches only its own folder. A plugin you downloaded from someone else then can't read `server.toml`, delete files or start programs on the host's machine:

| What | In a plugin |
|---|---|
| `io.open`, `io.lines`, `os.remove`, `os.rename`, `dofile`, `loadfile`, `require`, `package.searchpath` | Files inside the plugin's folder. A path counts from that folder; a path from the server's folder (`resources/race/data.json`) or an absolute path also works if it leads inside. Outside the folder, `io.open`, `os.remove`, `os.rename` and `loadfile` return `nil, "…: outside the resource folder"`, while `io.lines` and `dofile` raise an error with the same text. |
| `os.time`, `os.clock`, `os.date`, `os.difftime`, `io.write` | As usual. |
| `os.getenv` | `nil` for every variable: the environment holds the server's secrets. |
| `os.execute`, `io.popen`, `os.exit`, `os.setlocale`, `os.tmpname`, `io.tmpfile`, `io.read`, `io.input`, `io.output` | Raise an error that points to `[resources] trusted`. |
| `load` | Text only; precompiled chunks aren't loaded. |
| `debug` | Only `traceback` and `getinfo`. |

<!-- doctest: server -->
```lua
local _, err = pcall(os.execute, "echo hi")
node.log("%s", err)

-- expect: os\.execute is not available to resources
```

The same holds inside `node.job` and `node.await`. If a plugin needs more, the host lists it in `server.toml`. The plugin then gets the whole standard library, and paths count from the server's folder:

```toml
[resources]
trusted = ["backup"]
```

No plugin, not even a trusted one, can load a Lua module written in C. For what Lua can't do there are [native modules](/plugins/native-modules/).

## Several files

Relative paths in `package.path` count from the plugin's folder (for a trusted plugin, from the server's folder), and `package.path` has no entry for the `server/` folder. So `require("util")` finds `util.lua` in the plugin's root but not `server/util.lua`. Put the `server/` folder in front of `package.path` once, at the top of `main.lua`:

<!-- doctest: server {"files": {"server/util.lua": "local M = {}\nfunction M.add(a, b)\n    return a + b\nend\nreturn M\n"}} -->
```lua
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]")
package.path = here .. "/?.lua;" .. package.path

local util = require("util")
node.log("2 + 3 = %d", util.add(2, 3))

-- expect: 2 \+ 3 = 5
```

`server/util.lua` is an ordinary module: it returns a table.

<!-- doctest: server -->
```lua
local M = {}

function M.add(a, b)
    return a + b
end

return M
```

## Reloading

`reload <name>` in the server console, or `node.resources.reload(name)` from code, replaces a running plugin without restarting the server:

1. The plugin's `resourceUnload` handlers run with the reason `"reload"`.
2. Its handlers, timers and coroutines are removed, and its Lua state with them.
3. The folder loads again and `main.lua` runs from the top.

`node.resources.reload` queues the reload and returns `true` if it was accepted. A plugin can reload itself.

`node.storage`, the files in the folder and all other plugins stay. Everything held in Lua variables is lost, so keep what matters in storage. A `resourceUnload` handler is the place to save it:

<!-- doctest: server+client -->
```lua
local joins = node.storage.get("joins", 0)

local function countJoin()
    joins = joins + 1
end

node.on("playerJoined", countJoin)

local function saveJoins(reason)
    node.storage.set("joins", joins)
    node.log("joins so far: %d (%s)", joins, reason)
end

node.on("resourceUnload", saveJoins)

-- expect: joins so far: 1 \(shutdown\)
```

When the server stops, the same handler runs with the reason `"shutdown"`. Timers and coroutines started there never run, so save the data right away.

A reload doesn't send players new files from `client/`: the server packs them once, at start ([Client scripts](/plugins/client-scripting/#how-files-reach-the-game)).

## Errors and the log

An error at the top level of `main.lua` aborts the rest of that file, and the plugin stays loaded with whatever it subscribed to before the error. How these errors and errors in handlers look in the log: [API conventions](/plugins/conventions/#errors-in-handlers).

Write to the log with `node.log`, and mark problems with `node.log.warn` and `node.log.error`. All three take arguments as `string.format` does.
