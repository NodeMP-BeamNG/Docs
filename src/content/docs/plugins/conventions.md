---
title: Errors, names and versions
description: How API calls report failure, what happens to errors in handlers, naming events and keys, which ids last, checking versions, and measuring a resource's memory and time.
---

A few rules hold across the whole API. Knowing them saves reading the reference for every call.

## How calls report failure

- A call that does something returns `true` or `false`: `player:kick` returns `false` for a player
  who isn't there.
- A call that can fail for several reasons returns `nil` and the reason as a short word:
  `player:spawnVehicle` gives `nil, "max_cars"`, `node.fs.stat` gives `nil, "not found"`.
- A call that reads something returns `nil` when there is nothing: `node.players.find` for an unknown
  name, `vehicle:transform()` before the first position.
- A call raises an error only when it's used wrongly, such as a handler that isn't a function. The
  error points at your line.

<!-- doctest: server -->
```lua
local ok, why = node.players.get(999):verify("size")
node.log("verify: %s (%s)", tostring(ok), tostring(why))

-- expect: verify: nil \(unknown player\)
```

## Errors in handlers

An error in a handler, a timer or a coroutine is logged with the resource's name, the file, the line
and a traceback. It ends only that one call: the resource keeps its other handlers, and the same
handler runs again on the next event. So a handler that fails on bad data doesn't need a `pcall`
around everything, but it should check what it relies on, such as `player.accountId` being set.

## Ids that last, and ids that don't

| Id | Lasts |
|---|---|
| `player.id` | The session. Freed when the player leaves and given to the next one. |
| `vehicle.id` | The server's run. Never reused until a restart. |
| `player.accountId` | For good. The same account on every server and every visit. |

Save anything about a player under `accountId`. A guest has none, and its name may belong to someone
else next time.

## Versions

| Call | Gives |
|---|---|
| `node.server.version()` | The server's version. |
| `node.server.protoVersion()` | The wire protocol version the server speaks. |

<!-- doctest: server -->
```lua
local version = node.server.version()
node.log("server %s, protocol %d", version, node.server.protoVersion())

-- expect: server \S+, protocol \d+
```

New releases add functions and events; they don't change what existing ones do without saying so in
the release notes. To use a function only where it exists, check for it:
`if node.server.shutdown then … end`. Compare protocol versions against `protoVersion()`, never
against a number written into the code.

## Memory and time

Two calls show what a resource costs:

- `node.server.memory()` gives `{ lua, luaAll, process }` in bytes: this resource's Lua state, all
  resources together, and the whole server.
- `node.server.handlerStats()` gives how long this resource's handlers run: `count`, `mean`, `max`
  in milliseconds, and `over`, the number of runs that crossed the 250 ms limit.

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

A `lua` number that keeps growing over an evening points at a table nothing ever empties. A `max`
that creeps towards 250 ms is a handler to split up or move into a coroutine.
