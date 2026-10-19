---
title: How a resource is built
description: The files of a resource, every key of resource.toml, the Lua environment, splitting code into several files, reloading, and how errors are reported.
---

A resource is a folder in `resources/`. The server loads every such folder when it starts.

## The files

| Path | What it is |
|---|---|
| `resource.toml` | The manifest. Optional: without it the folder name is the name and the defaults below apply. |
| `server/main.lua` | The server half's entry point. |
| `server/*.lua` | More server code, loaded with `require` ([below](#several-files)). |
| `client/**/*.lua` | The client half: sent to every player on join and run in the game. |
| `client/lua/vehicle/*.lua` | Client files that run inside the player's car ([Client scripts](/plugins/client-scripting/#files-that-run-inside-the-car)). |
| anything else | Your data: read and write it with `node.fs`. |

A folder with neither a server entry point nor client files is skipped.

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
| `name` | the folder name | The resource's name in the log, in `reload` and on the bus. |
| `version` | none | Shown in the log next to the name. |
| `type` | `"lua"` | Which runtime runs the server half. `"js"` needs the `js-host` module ([JavaScript resources](/plugins/js-host/)). |
| `[server] main` | `"server/main.lua"` | The entry point, relative to the resource folder. |
| `[client] files` | every `.lua` under `client/` | Which client files to send, relative to `client/`. |
| `[client] obfuscation` | `"light"` | How hard to scramble client files: `"none"`, `"light"`, `"medium"` or `"strong"`. |
| `[config]` | empty | The resource's own settings, readable as `node.config`. |

Paths that lead outside the resource folder are refused. A `resource.toml` that doesn't parse is
reported in the log, and the resource loads with the defaults.

## The Lua environment

The server half runs on Lua 5.4 with the standard libraries. On top of them there is one global,
`node`: the whole API ([reference](/plugins/api/lua/)). Each resource has a Lua state of its own; one
resource can't see another's globals.

A resource reaches its own folder and nothing else on the disk. That way a resource someone shared
can't read `server.toml`, delete files or run programs on the host's machine:

| What | In a resource |
|---|---|
| `io.open`, `io.lines`, `os.remove`, `os.rename`, `dofile`, `loadfile`, `require`, `package.searchpath` | Files inside the resource folder. A path is relative to that folder; a path from the server's folder (`resources/race/data.json`) or an absolute one works when it leads inside. Elsewhere: `nil, "…: outside the resource folder"`. |
| `os.time`, `os.clock`, `os.date`, `os.difftime`, `io.write` | As usual. |
| `os.getenv` | `nil` for every variable: the environment holds the server's secrets. |
| `os.execute`, `io.popen`, `os.exit`, `os.setlocale`, `os.tmpname`, `io.read`, `io.input`, `io.output` | Raise an error that names `[resources] trusted`. |
| `load` | Text only; precompiled chunks are refused. |
| `debug` | `traceback` and `getinfo` only. |

The same applies inside `node.job` and `node.await`. If a resource really needs more, the host lists
it in `server.toml`, and it gets the whole standard library with paths from the server's folder:

```toml
[resources]
trusted = ["backup"]
```

<!-- doctest: server -->
```lua
local _, err = pcall(os.execute, "echo hi")
node.log("%s", err)

-- expect: os\.execute is not available to resources
```

Lua modules written in C can't be loaded: the server doesn't load native libraries into a resource.
For work Lua can't do, there are [native modules](/plugins/native-modules/).

## Several files

`require` searches `package.path`, which starts in the server's folder, not the resource's. Put your
own folder in front, once, at the top of `main.lua`:

<!-- doctest: server {"files": {"server/util.lua": "local M = {}\nfunction M.add(a, b)\n    return a + b\nend\nreturn M\n"}} -->
```lua
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]")
package.path = here .. "/?.lua;" .. package.path

local util = require("util")
node.log("2 + 3 = %d", util.add(2, 3))

-- expect: 2 \+ 3 = 5
```

`server/util.lua` is a module like any other: it returns a table.

<!-- doctest: server -->
```lua
local M = {}

function M.add(a, b)
    return a + b
end

return M
```

## Reloading

`reload <name>` in the server console, or `node.resources.reload(name)` from code, replaces a
running resource without restarting the server:

1. The resource's `resourceUnload` handlers run with the reason `"reload"`.
2. Its handlers, timers and coroutines are dropped, and its Lua state with them.
3. The folder is loaded again, and `main.lua` runs from the top.

What survives: `node.storage`, the files in the folder, and every other resource. Everything in Lua
variables is gone, so keep what matters in storage. `resourceUnload` is the last chance to write it:

<!-- doctest: server+client -->
```lua
local joins = node.storage.get("joins", 0)

local function countJoin()
    joins = joins + 1
end

local function saveJoins(reason)
    node.storage.set("joins", joins)
    node.log("joins so far: %d (%s)", joins, reason)
end

node.on("playerJoined", countJoin)
node.on("resourceUnload", saveJoins)

-- expect: joins so far: 1 \(shutdown\)
```

The same handler runs with `"shutdown"` when the server stops. Don't start anything there that has to
finish later: timers and coroutines won't run again.

The server packs client files once, at start. A reload doesn't send new client files; a restart does.

## Errors

An error in a handler is logged with the resource's name, the file, the line and a traceback; the
handler runs again on the next event and the rest of the resource keeps working. An error at the top
level of `main.lua` stops the rest of that file, and the resource stays loaded with whatever it
managed to subscribe before the error.

Write to the log with `node.log`, and mark problems with `node.log.warn` and `node.log.error`. Each
takes `string.format` arguments.
