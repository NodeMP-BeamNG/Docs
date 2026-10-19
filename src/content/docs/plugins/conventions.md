---
title: API conventions
description: How API calls report failure, what happens to errors in handlers, which ids last, how to check versions and measure a plugin's memory and time.
---

A few rules hold across the whole API. Know them and you don't have to read the reference for every call.

## How calls report failure

- A call that does something returns `true` or `false`: `player:kick` returns `false` if there is no such player.
- A call that can fail for several reasons returns `nil` and the reason as a short word: `player:spawnVehicle` returns `nil, "max_cars"` and `node.fs.stat` returns `nil, "not found"`.
- A call that reads something returns `nil` when there is nothing to read: `node.players.find` for an unknown name, `vehicle:transform()` before the first position.
- A call raises an error only when you use it wrongly, for example by passing a handler that is not a function. The error points at your line.

<!-- doctest: server -->
```lua
local ok, why = node.players.get(999):verify("size")
node.log("verify: %s (%s)", tostring(ok), tostring(why))

-- expect: verify: nil \(unknown player\)
```

## Errors in handlers

The server logs an error in a handler, a timer or a coroutine with the plugin's name, the file, the line and a traceback. The first line says where the error happened:

| Where | The line starts with |
|---|---|
| An event that passes only a player or a car, and a request | `error in builtin 'playerJoined'` |
| An event with data: a notification, `playerLeft` | `error in event 'vehicleEdited'` |
| A wire event | `error in event 'greeter:hello'` |
| A bus message | `error in resource event 'score:add'` |
| A timer | `error in timer callback` |
| A coroutine | `error in async task` |
| The top level of `main.lua` while loading | `error in '<path to main.lua>'` |

An error ends only that call: the plugin's other handlers keep working, and the same handler runs again on the next event. So you don't need a `pcall` around a whole handler, but do check what it relies on, for example that the player has an `accountId`.

## Which ids last

| Id | How long it lives |
|---|---|
| `player.id` | The session. It is freed when the player leaves and goes to the next player. |
| `vehicle.id` | As long as the server runs. It is not reused until a restart. |
| `player.accountId` | For good. The same account has it on every server and every visit. |

Store anything about a player under `accountId`. A guest has none, and the next time someone else may take the guest's name.

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

To call a function only where it exists, check that it is there: `if node.server.shutdown then … end`. Compare the protocol version with `protoVersion()`, not with a number written into the code. The server itself kicks a player whose client mod names a different protocol version in `session:hello`.

## Memory and time

Two calls show what a plugin costs:

- `node.server.memory()` returns `{ lua, luaAll, process }` in bytes: this plugin's Lua state, the states of all plugins together, and the whole server.
- `node.server.handlerStats()` shows how long this plugin's handlers run: `count` runs, `min`, `max`, `mean` and `stddev` of the time in milliseconds, and `over`, the number of runs that crossed the 250 ms threshold.

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

A `lua` figure that keeps growing all evening points at a table nobody empties. A `max` creeping towards 250 ms is a reason to split the handler or move it into a coroutine ([Timers and coroutines](/plugins/concurrency/)).
