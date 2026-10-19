---
title: API conventions
description: How API calls report failure, what happens to errors in handlers, which ids last, how to check versions and measure a plugin's memory and time.
---

A few rules hold across the whole API; with them you won't need the reference for every call.

## How calls report failure

- An action returns `true` or `false`: `player:kick` returns `false` if there is no such player.
- A call that can fail in several ways returns `nil` and a short reason: `player:spawnVehicle` gives `nil, "max_cars"`, `node.fs.stat` gives `nil, "not found"`.
- A read returns `nil` when there is nothing to read: `node.players.find` for an unknown name, `vehicle:transform()` before the first position.
- A call raises an error only when misused, for example with a handler that is not a function. The error points at your line.

<!-- doctest: server -->
```lua
local ok, why = node.players.get(999):verify("size")
node.log("verify: %s (%s)", tostring(ok), tostring(why))

-- expect: verify: nil \(unknown player\)
```

## Errors in handlers

The server logs an error in a handler, timer or coroutine with the plugin's name, file, line and traceback. The first line says where it happened:

| Where | The line starts with |
|---|---|
| An event that passes only a player or a car, and a request | `error in builtin 'playerJoined'` |
| An event with data: a notification, `playerLeft` | `error in event 'vehicleEdited'` |
| A wire event | `error in event 'greeter:hello'` |
| A bus message | `error in resource event 'score:add'` |
| A timer | `error in timer callback` |
| A coroutine | `error in async task` |
| The top level of `main.lua` while loading | `error in '<path to main.lua>'` |

An error ends only that call: the plugin's other handlers keep working, and this one runs again on the next event. So skip the `pcall` around a whole handler, but check what it relies on, such as the player having an `accountId`.

## Which ids last

| Id | How long it lives |
|---|---|
| `player.id` | The session. Freed when the player leaves, then given to the next one. |
| `vehicle.id` | Until the server restarts; never reused before that. |
| `player.accountId` | For good: the same on every server and every visit. |

Store player data under `accountId`. A guest has none, and next time someone else may take the guest's name.

## Versions

| Call | What it returns |
|---|---|
| `node.server.version()` | The server's version. |
| `node.server.protoVersion()` | The wire protocol version the server speaks. |

<!-- doctest: server -->
```lua
local version = node.server.version()
node.log("server %s, protocol %d", version, node.server.protoVersion())

-- expect: server \S+, protocol \d+
```

To call a function only where it exists, test for it: `if node.server.shutdown then … end`. Compare the protocol version with `protoVersion()`, not a number in your code. The server itself disconnects a client mod that names another protocol version in `session:hello`.

## Memory and time

Two calls show what a plugin costs:

- `node.server.memory()` returns `{ lua, luaAll, process }` in bytes: this plugin's Lua state, all plugins' states together, and the whole server.
- `node.server.handlerStats()` shows how long this plugin's handlers run: `count` runs, `min`, `max`, `mean` and `stddev` in milliseconds, and `over`, the runs that took longer than 250 ms.

<!-- doctest: server -->
```lua
local function reportUsage()
    local mem = node.server.memory()
    local stats = node.server.handlerStats()
    node.log("lua %d KB, %d runs, slowest %s ms",
        mem.lua // 1024, stats.count, tostring(stats.max))
end

node.after(1000, reportUsage)

-- expect: lua \d+ KB, \d+ runs
```

A `lua` figure that grows all evening points at a table nobody empties. A `max` creeping toward 250 ms is a reason to split the handler or move it into a coroutine ([Timers and coroutines](/plugins/concurrency/)).
