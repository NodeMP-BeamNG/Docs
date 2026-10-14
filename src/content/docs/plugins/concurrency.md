---
title: Timers and coroutines
description: The one thread every handler runs on, timers, node.defer, waiting with coroutines, and heavy work on the background pool with node.await and node.job.
---

The server uses many threads; your Lua uses one. Every handler of every resource runs on the same
worker thread, one call at a time. Everything on this page exists so that thread never has to wait.

## One thread for everyone

Network threads receive packets and queue events; the worker takes them off the queue and calls your
handlers. Timers, coroutines, bus messages, HTTP answers and finished background jobs all come back
to that same thread. That has two consequences:

- **You never need a lock.** No two handlers run at once, in your resource or any other, so a plain
  Lua table is a safe place for shared state.
- **A slow handler holds up everyone.** A handler that loops for a second stalls every resource's
  handlers and timers for that second. The server notices: any handler, timer or coroutine step that
  runs longer than 250 ms is logged with the resource and what kind of code it was:
  `plugin worker job stalled the thread for 699 ms (resource race, timer) — move heavy work to node.await/node.job`.

`node.server.handlerStats()` shows how long your resource's handlers take (count, mean, max, and how
many went over 250 ms), so you can see one creeping up before it trips the warning.

## Timers

- `node.after(ms, fn)` runs `fn` once after `ms` milliseconds and returns a timer id.
- `node.every(ms, fn)` runs `fn` every `ms` milliseconds until cancelled. A slow `fn` delays the next
  run; runs don't pile up.
- `node.cancel(id)` stops either. Safe to call for a timer that already fired.

<!-- doctest: server -->
```lua
local ticks = 0
local intervalId
intervalId = node.every(60000, function()
    ticks = ticks + 1
    node.log("minute %d, players: %d", ticks, node.players.count())
    if ticks >= 60 then
        node.cancel(intervalId)
    end
end)

node.after(500, function()
    node.log("half a second in, timer %d is ticking", intervalId)
end)

-- expect: half a second in, timer \d+ is ticking
```

A timer never interrupts a handler; it runs between them. Timers belong to the resource that set
them: a reload drops them, and at shutdown they stop after `serverShutdown`. `serverTick` is a
built-in timer of its own, every 100 ms.

## After the others: node.defer

`node.defer(fn)` runs `fn` once every handler of the event you're in has finished. Use it to act
after everyone else has seen the event; anything you change inside `fn` happens after the event, not
during it.

<!-- doctest: server+client {"spawn": "coupe"} -->
```lua
node.on("vehicleSpawned", function(vehicle)
    node.defer(function()
        if vehicle:exists() then -- another handler may have deleted it meanwhile
            vehicle:setTag("spawnedAt", tostring(node.server.unixTime()))
            node.log("%s tagged spawnedAt=%s", tostring(vehicle), vehicle:tag("spawnedAt"))
        end
    end)
end)

-- expect: Vehicle#\d+ Alice tagged spawnedAt=\d+
```

## Waiting without blocking: node.async

`node.async(fn, ...)` runs `fn(...)` as a coroutine on the worker. Inside it, these calls pause your
code while everything else keeps running:

- `node.sleep(ms)` waits for a time.
- `node.wait(fn, intervalMs)` waits until `fn()` returns something truthy, checking every
  `intervalMs` (50 by default). `node.wait(ms)` is the same as `node.sleep(ms)`.
- `node.yield()` lets other handlers run for one turn, inside a long loop that has to stay on the
  worker.
- `node.await(work, args)` runs a function on another thread and gives you its result
  ([below](#heavy-work-nodeawait-and-nodejob)). `node.http.fetch` works the same way for HTTP.

<!-- doctest: server+client {"emit": [["race:start", ""]]} -->
```lua
node.on("race:start", function(player, data)
    node.async(function()
        for i = 3, 1, -1 do
            node.broadcast("race:countdown", tostring(i))
            node.sleep(1000)
        end
        node.broadcast("race:go")
        node.log("race started by %s", tostring(player))
    end)
end)

-- expect-client: Alice race:countdown 3
-- expect-client: Alice race:go
-- expect: race started by Player#\d+ Alice
```

Called outside `node.async`, these fail: the log says `node.sleep called outside a node.async task`.
An error inside the coroutine is logged as `error in async task` and ends it. A reload drops running
coroutines.

A coroutine that slept wakes up in a changed world: the player may have left, the car may be gone.
Check `player:isConnected()` and `vehicle:exists()` after every pause, and remember that ids are
reused.

`node.suspend(arm)` is the general form behind all of these: `arm(resume)` runs, and whoever calls
`resume(...)` later (a handler, a timer, a bus message) wakes the coroutine with those values. Use it
to turn a callback API of your own into straight-line code.

## Heavy work: node.await and node.job

Long computations don't belong on the worker. `node.await(work, args)` runs `work(args)` on a
background thread and pauses your coroutine until it's done; it returns the result, or `nil` and an
error. `node.job(work, args, done)` is the callback form: `done(result, err)` runs on the worker
afterwards, and you don't need a coroutine.

`work` runs in a separate, empty Lua state, so it must be **self-contained**: no variables from
outside the function, no `node`, nothing of your resource. It gets `args` and returns a result, and
both must be plain data (tables, strings, numbers, booleans). A function that can't be moved fails
with `work function cannot be serialized (C function?)`.

<!-- doctest: server+client {"emit": [["stats:request", ""]]} -->
```lua
node.storage.set("scores", { { name = "Bob", time = 71.2 }, { name = "Alice", time = 64.9 } })

node.on("stats:request", function(player, data)
    node.async(function()
        local scores = node.storage.get("scores", {})
        local top, err = node.await(function(args)
            table.sort(args.scores, function(a, b) return a.time < b.time end)
            local out = {}
            for i = 1, math.min(10, #args.scores) do out[i] = args.scores[i] end
            return out
        end, { scores = scores })
        if not top then
            node.log.warn("ranking failed: %s", err)
            return
        end
        player:send("stats:top", top)
        node.log("%s leads with %.1f s", top[1].name, top[1].time)
    end)
end)

-- expect: Alice leads with 64\.9 s
-- expect-client: Alice stats:top \[\{
```

The background pool has one thread per CPU core, between 2 and 32; the `NODE_PLUGIN_POOL`
environment variable sets the number. When its queue is full, `node.job` returns `false` and
`node.await` returns `nil, "background pool is full"`.

## What else runs off the worker

- HTTP requests run in the background and call you back on the worker ([HTTP](/plugins/http/)).
- `node.fs.writeAsync` writes on a file thread; `node.storage.set` costs only the size of the value,
  so it's fine in a handler ([Storage and files](/plugins/storage/)).
- Database queries run on the database module's own threads ([Database](/plugins/database/)).

## The rules

1. Keep handlers short. Waiting goes in `node.async`; computing goes in `node.await` or `node.job`.
2. Never spin in a loop waiting for something. Use `node.sleep`, `node.wait` and `node.http.fetch`
   inside `node.async`.
3. Share nothing with a background job except plain data.
4. For many cars at once, read them all on a timer (`node.vehicles.transforms`) instead of
   subscribing to a stream per car.
5. After any pause, check that the player and the car still exist.
6. A reload drops everything you registered; a job or request already running still finishes, and
   its callback goes nowhere.

## Next

- [Events](/plugins/events/): what arrives on the worker in the first place.
- [Lua API reference](/plugins/api/lua/#top-level-events-sending-timers-coroutines): every timer and
  coroutine call.
