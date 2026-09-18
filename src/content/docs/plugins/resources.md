---
title: Resources
description: A resource for developers - layout, resource.toml, load order, client file streaming and obfuscation, reload, node.fs, node.storage, node.config.
---

A resource is one folder under `resources/` in the server's working directory. This page is the
developer's view of that folder: what goes where, what the manifest controls, when the server
reads what, and the three places a resource keeps data. The host's view - installing, the
obfuscation runner, Docker paths - is on [Resources and content](/hosting/resources/).

## Layout

```
resources/
└── hello/
    ├── resource.toml               # optional manifest
    ├── server/
    │   ├── main.lua                # the server entry point
    │   └── util.lua                # more server files, loaded with require
    ├── client/
    │   ├── main.lua                # game-engine script, streamed to players
    │   └── lua/
    │       ├── ge/extensions/      # entry points, delivered first
    │       └── vehicle/            # vehicle-side scripts
    └── data/
        └── words.json              # read with node.fs
```

Only the manifest, the server entry point and `client/` mean something to the server. Everything
else is yours: `node.fs` reads and writes any path inside the folder. Persistent state does not
live here - `node.storage` keeps it in `storage/<name>.json` beside `resources/`.

The server half is one entry file. Lua's `require` searches the default path, which is relative
to the server's working directory, not to your folder; to split the server half into files, put
the folder on the path first:

<!-- doctest: server {"files": {"server/util.lua": "return { greet = function() return \"hello from util.lua\" end }"}} -->
```lua
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]") -- .../resources/hello/server
package.path = here .. "/?.lua;" .. package.path
local util = require("util") -- server/util.lua
node.log(util.greet())

-- expect: hello from util.lua
```

Client files do not need this: inside the client half, `require("lib/helpers")` resolves against
the resource's own streamed files first.

## resource.toml

Every key is optional. A folder without a manifest is a Lua resource named after the folder, with
`server/main.lua` as its entry point and every `.lua` under `client/` streamed to players.

```toml
name = "hello"
version = "1.0"
type = "lua"

[server]
main = "server/main.lua"

[client]
files = ["main.lua", "lua/vehicle/horn.lua"]
obfuscation = "light"

[config]
greeting = "Welcome"
maxCars = 2
```

| Key | Default | What it does for you |
|---|---|---|
| `name` | the folder name | The tag on every log line you print, the store name behind `node.storage` (`storage/<name>.json`) and the name the client mod files your scripts under. Keep it to letters, digits, `_`, `-` and `.`, starting with a letter or digit: the store refuses other characters and the client rejects a delivery whose name has them. |
| `version` | empty | Shown after the name in the load line: `hello v1.0 loaded — lua · server 1 file · 1 client file`. |
| `type` | `"lua"` | Which language host runs the server half; lower-cased. `"js"` needs the `js-host` module. A type nobody registered logs `hello · resource type 'js' has no language host loaded, skipping (a native module in modules/ must register one)` and the folder is skipped. |
| `[server] main` | `"server/main.lua"` | The entry point, relative to the folder, run once at load. It must stay inside the folder; a path that escapes it is refused. When the file does not exist the resource is client-only, which is fine. |
| `[client] files` | every `.lua` under `client/`, recursively | The streamed files, relative to `client/` (a leading `client/` is tolerated). Without the key, files directly in `client/lua/ge/extensions/` come first and the rest follow alphabetically; with it, your order is the delivery order. A listed path that escapes the folder is ignored with a warning. |
| `[client] obfuscation` | `"light"` | `none`, `light`, `medium` or `strong`. `off`/`false` mean `none`, `high`/`full` mean `strong`, anything else is `light`. Ignored when the server runs with `[Resources] Obfuscate = false`. |
| `[config]` | none | Not read by the server. The prelude hands it to you as `node.config`, as written. |

A manifest that does not parse logs `hello · failed to parse resource.toml (...), using defaults`
and the folder loads with the defaults above.

## Load order

At start the server loads `modules/` first, then walks `resources/`, one folder at a time, in no
guaranteed order - never rely on another resource having loaded before yours; talk to it over
[the bus](/plugins/events/#between-resources-nodebus) and cope with silence. For each folder:

1. The manifest is parsed and the language host for `type` is looked up.
2. `[server] main` is resolved and checked against the folder boundary.
3. The client files are read, obfuscated and packaged into `Content::ResourceChunk` payloads -
   whatever the resource's type, because the client half is always the game's Lua.
4. A folder with neither a server entry point nor client files is skipped (a debug-level line).
5. The host runs the entry point once. The prelude has already built `node` and read
   `node.config`. Top-level code runs before any event; it is where you subscribe and initialise.
6. The load line is printed: `hello v1.0 loaded — lua · server 1 file · 1 client file`.

When the scan ends, `2 resources · 0 modules loaded` sums it up and the worker thread starts:
from here on timers fire, `serverTick` runs every 100 ms and players can join. A player's join
streams every resource's client files after the content sync, then `playerJoined` fires.

## The client half

Files under `client/` are the part of your resource that runs in the game. The server sends them
to each joining player as one or more `Content::ResourceChunk` packets (each under 900 KB, split
as needed) and one `Content::ResourceDone` after all resources. A single file above the cap is
skipped with `hello · client file 'main.lua' is 912 KB (over the 900 KB cap), skipped`. The client mod
refuses a delivery above 8 MB or 512 files.

Each file carries a kind: `vehicle` when its path starts with `lua/vehicle/`, `ge` otherwise.

- **`ge` files** are compiled in an environment private to the resource, where `node` is the
  client table and `require` finds the resource's other files by path. Each file runs once. A file
  that returns a table with `on…` functions (`onUpdate`, `onExtensionLoaded`, `onPreRender`) is
  registered as a game extension and receives those callbacks; `demo-numbers` uses `onUpdate(dt)`
  as its timer. `beamng.log` confirms with
  `Activated server resource "hello" (1 ge file(s), 0 vehicle file(s))`.
- **`vehicle` files** are injected into the player's own vehicles, at activation and at every
  spawn. They cannot be unloaded cleanly, so the client warns; ship vehicle-side Lua as content
  where you can.

The client mod unloads a resource's handlers and extensions when the player leaves. A resource
delivered again while a copy is running replaces that copy. Client files are packaged
once, at server start: editing `client/` needs a restart, and players already in the session keep
what they received.

Streamed files are compiled in memory under the resource's own name and never written to the
player's disk, so a resource cannot overwrite or shadow a file of the game or of the client mod -
it adds modules and hooks beside them. What can be changed at run time, and how a built-in client
module is switched off, is on
[Client scripting](/plugins/client-scripting/#what-a-client-file-can-and-cannot-do).

### Obfuscation

Unless the server disables it, each `ge` and `vehicle` file is run through Prometheus before it is
packaged, at the tier `[client] obfuscation` names: `light` renames locals and hides string
constants and is safe for code that runs every frame; `medium` adds indirection on locals and
rewrites numbers; `strong` also wraps the file, for menus and one-shot setup. Globals and table
keys are never renamed, so `M.onUpdate` and game hooks keep working. Use `none` while you develop:
line numbers in `beamng.log` then match your source. A file Prometheus cannot transform ships as
plain source with a warning; a join never fails on obfuscation. Output is cached in `.obfcache/`.

The server does not run your client files - they are packaged, not executed - but it parses each
one when it packages it, and a file that does not parse is reported as an `Error` naming the
resource, the file and the Lua message,
`race · client file 'main.lua' has a syntax error: main.lua:1: unexpected symbol near '=' (the file ships anyway; the game's Lua will very likely refuse it too)`,
whatever the obfuscation setting; the file still ships. (Before 1.2.1 a syntax error showed only as
the Prometheus warning `race · Prometheus failed on 'main.lua' (…), shipping it unobfuscated`,
and with `none` not at all until a player's `beamng.log` reported `compile error`.)

## Reload

`node.resources.reload(name)` returns `true` when the request was accepted, not when it finished:
the reload runs on the worker after the current handler returns, so a resource may reload itself
from a chat command. It drops everything the server half registered - event handlers, bus and
module-channel subscriptions, relay filters, timers, log sinks - along with running coroutines and
the whole Lua state, then runs the entry point again and prints `hello reloaded — lua`. `false`
means no resource of that name is loaded.

What survives a reload: the files in your folder, `node.storage`, and the other resources. What
does not: Lua variables and everything the resource registered. `node.config` is read again from
the manifest, so a settings change takes effect. A background job or HTTP request already in
flight is not cancelled, and client files are not re-packaged.

**A hook before the unload** (added in server 1.2.0): `node.on("resourceUnload", function(reason) ... end)`
runs in the old instance right before its state is dropped, synchronously and only for the
resource being unloaded - another resource's reload never fires yours. `reason` is `"reload"`
here; at a server stop it is `"shutdown"`, after `serverShutdown` ran for everyone. It has the
limitations of `serverShutdown`: a `node.storage` write made in it is kept (the new instance
reads it at load; at a stop it is flushed to disk), a plain `node.pg.exec` or `node.pg.query` in
the callback form is delivered (a handler is not a coroutine, so the suspending form raises), but
no callback, timer or coroutine started there runs again - so write what you must and return, and
put nothing after an `await`. Do not call `node.resources.reload` on yourself from it: on a reload
that queues another reload of the fresh instance, an endless loop; at a stop the request is dropped
(`false`), because nothing is loaded again while the server shuts down.

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

## Files: node.fs

`node.fs` reads and writes inside your folder and nowhere else. A path is relative to the folder,
at most 512 characters, with no `..` step, no drive or root and no NUL byte; anything else gets
`nil` or `false`.

- `node.fs.read(path) -> string?` - the file's bytes, `nil` when missing or outside.
- `node.fs.write(path, data) -> boolean` - synchronous; parent folders are created.
- `node.fs.writeAsync(path, data, cb?) -> boolean` - the write happens on the file-writer thread
  and `cb(ok)` runs on the worker; `true` means accepted. Several writes to one path before the
  thread gets to it collapse into the last one.
- `node.fs.list(path?) -> array<record{name,dir,size}>?` - one folder, the resource root when
  omitted.

<!-- doctest: server {"files": {"data/words.json": "[\"hello\", \"welcome\"]"}} -->
```lua
local words = node.json.decode(node.fs.read("data/words.json") or "[]") or {}
node.log("%d word(s) shipped with the resource", #words)

local lines = {}
for _, p in ipairs(node.players.all()) do
    lines[#lines + 1] = string.format("%s\t%s", p.name, p.ip or "?")
end
node.fs.writeAsync("reports/" .. os.date("%Y-%m-%d") .. ".txt", table.concat(lines, "\n"), function(ok)
    node.log("report written: %s", tostring(ok))
end)

-- expect: 2 word\(s\) shipped with the resource
-- expect: report written: true
```

Use the folder for data you ship and for reports; use storage for state.

### What node.fs does not have

Those four calls are the whole API: there is no `exists`, `mkdir`, `remove`, `rename` or `copy`,
and no path helper. What to do instead today:

- **Paths.** Write them with `/` on Windows and Linux alike - the server accepts `/` on both, while
  `\` is a separator on Windows only (on Linux it is an ordinary character in a file name).
  `node.fs.list` returns names, not paths, so join them yourself: `dir .. "/" .. entry.name`.
- **Does a file exist?** `node.fs.list(folder)` and look for the name - the entry also tells you
  `dir` and `size` - or `node.fs.read(path) ~= nil`, which reads the whole file. Both answer `nil`
  for a missing folder and for a path outside yours alike.
- **Create a folder.** `node.fs.write` creates the parent folders of the path it writes; an empty
  folder cannot be created.
- **Copy.** `node.fs.write(to, node.fs.read(from))`.
- **Delete and rename.** Not in `node.fs`. The standard `os` and `io` libraries are open in the
  resource's Lua state (Lua 5.4: `os.remove`, `os.rename`, `io.open`), and they work - but they
  know nothing of the folder boundary and resolve a relative path against the server's working
  directory, not your folder. Build an absolute path first: the `here` line from
  [Layout](#layout) gives `.../resources/<name>/server`, its parent is your folder.
- **Watching for changes.** Nothing fires when a file changes; poll with a timer
  ([Events → No file-watch event](/plugins/events/#no-file-watch-event)).

<!-- doctest: server {"files": {"data/config.json": "{\"level\": 1}"}} -->
```lua
local function exists(path) -- a name inside a folder, from node.fs.list
    local dir, name = path:match("^(.-)/?([^/]+)$")
    for _, entry in ipairs(node.fs.list(dir ~= "" and dir or nil) or {}) do
        if entry.name == name then return true, entry.dir end
    end
    return false
end

node.log("data/config.json exists: %s", tostring(exists("data/config.json")))
node.log("data/missing.json exists: %s", tostring(exists("data/missing.json")))

-- copy with node.fs (backup/ is created on the way); rename and delete with the standard library
node.fs.write("backup/config.json", node.fs.read("data/config.json"))
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]") -- .../resources/<name>/server
local folder = here:match("^(.*)[/\\]")                                -- .../resources/<name>
assert(os.rename(folder .. "/backup/config.json", folder .. "/backup/config.old"))
assert(os.remove(folder .. "/backup/config.old"))
node.log("backup/ holds %d file(s)", #(node.fs.list("backup") or {}))

-- expect: data/config.json exists: true
-- expect: data/missing.json exists: false
-- expect: backup/ holds 0 file\(s\)
```

`exists`, `mkdir`, `remove`, `rename`, `copy`, a `stat` with the modification time and a path
helper are not in the API yet; until they are, the lines above are the way.

## State: node.storage

`node.storage` is a key/value store per resource, kept in memory and written to
`storage/<name>.json` in the server's working directory. Values are any JSON-serialisable Lua
value: strings, numbers, booleans, tables (an array when its keys are `1..n`, an object otherwise;
functions become `null`; nesting stops at 32 levels). Keys are strings of up to 256 characters.

<!-- doctest: server+client -->
```lua
local visits = node.storage.get("visits", 0) + 1
node.storage.set("visits", visits)
node.log("server start number %d", visits)

node.on("playerJoined", function(player)
    if player.accountId then
        node.storage.set("lastSeen:" .. player.accountId, node.server.unixTime())
        node.log("last seen of account %d is %d", player.accountId, node.storage.get("lastSeen:" .. player.accountId))
    end
end)

-- expect: server start number 1
-- expect: last seen of account 42 is \d+
```

Each `set` or `delete` is on disk before the call returns, so a crash of the server process loses
nothing that was acknowledged. Between saves the store is a snapshot plus a change log
(`storage/<name>.log`); the log is folded into the snapshot when it outgrows it and at every
clean stop, so after a normal shutdown you find one readable JSON file. A `.log` left by a crash
is replayed at the next start: `storage 'hello' replayed 3 changes from its log`. Edit the JSON
by hand only while the server is stopped. Key durable data by `player.accountId` or `player.name`,
never by `player.id`, which is reused.

## Settings: node.config and node.resources.manifest

The `[config]` table of your manifest is yours. `node.config` holds it as written - strings,
numbers, booleans, arrays and nested tables - or an empty table when there is none. It is read once,
when the resource loads. Layer your defaults under it the way `vehicle-cleanup` does:

<!-- doctest: server {"config": {"maxCars": 2}} -->
```lua
local defaults = { greeting = "Welcome", maxCars = 1, checkIntervalMs = 5000 }
local config = setmetatable(node.config, { __index = defaults })

node.log("greeting is %q, limit %d", config.greeting, config.maxCars)

-- expect: greeting is "Welcome", limit 2
```

`node.resources.manifest()` re-reads `resource.toml` from disk and returns the whole file as a
table - `name`, `version`, `type`, `server = { main }`, `client = { files, obfuscation }` and
`config` - or `nil` when it does not parse. Call it when you want a settings change without a
reload; `node.config` itself does not change until the resource reloads.

## Next

- [Events](/plugins/events/) - what the server half can react to.
- [Concurrency](/plugins/concurrency/) - the thread your code runs on and how to leave it.
- [Client scripting](/plugins/client-scripting/) - the client `node` table in full.
- [Lua API reference](/plugins/api/lua/) - `node.fs`, `node.storage`, `node.resources` and
  `node.config` entry by entry.
