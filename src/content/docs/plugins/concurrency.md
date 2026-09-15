---
title: Concurrency
description: One worker thread for every handler; timers, node.defer, coroutines (node.async), background jobs (node.job, node.await), async HTTP and file writes.
---

The server is multithreaded; your Lua is not. Every handler of every resource runs on one plugin
worker thread, one call at a time, and everything else the API offers exists so that thread never
waits. This page is the model and the rules; the [Lua API reference](/plugins/api/lua/) has each
call's signature.

## One worker thread

The network threads receive packets and post events to a queue; a single worker thread drains the
queue and calls your handlers. Timers, `node.defer` callbacks, coroutine resumes, bus deliveries,
HTTP and job completions all land on the same thread. Two consequences:

- **You never need a lock.** No handler runs while another one runs, in your resource or in any
  other, so a plain Lua table is a safe place for shared state.
- **Blocking blocks everyone.** A handler that loops for a second stalls every other resource's
  handlers, every timer and `serverTick` for that second. The server watches for it: a job over
  250 ms is logged as `plugin worker job stalled the thread for 300 ms (move heavy work to
  node.await/node.job)`. When the queue is flooded past 100 000 pending jobs, new events are
  dropped with `plugin job queue full (100000 jobs) -- dropping events (flood?)`.

What runs elsewhere: the background pool (`node.job`, `node.await`, `node.http`), the file-writer
thread (`node.fs.writeAsync`), and the network threads themselves. None of them ever touch your
Lua state; results come back to the worker as plain data and a callback.

## Timers

- `node.after(ms, fn) -> id` runs `fn` once after `ms` milliseconds.
- `node.every(ms, fn) -> id` runs `fn` every `ms` milliseconds until cancelled. A slow `fn` delays
  the next run; runs do not stack.
- `node.cancel(id)` cancels either; safe for an id that already fired.

Timers are serviced after each batch of handlers, so a timer never interrupts a handler; the
worker wakes for the earliest deadline, and `serverTick` fires every 100 ms alongside them. A
timer belongs to the resource that set it and dies with a reload; at shutdown `serverShutdown` fires,
then each resource's own `resourceUnload("shutdown")`, and timers do not run again. The same hook
fires as `resourceUnload("reload")` right before a reload drops the state - the place to flush
what a timer was accumulating; a `node.storage` write or a plain `node.pg.exec` made there is
kept, a callback, timer or coroutine started there never runs ([Resources](/plugins/resources/#reload)).

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
```

## After the others: node.defer

`node.defer(fn)` runs `fn` on the worker after the current batch of handlers has finished. It is
the way to act once every other handler of the event you are in has seen it - the prelude uses it
to forget a leaving player's name only after every `playerLeft` handler ran. Anything you send or
change inside `fn` happens after the event, not during it.

```lua
node.on("vehicleSpawned", function(vehicle)
    node.defer(function()
        if vehicle:exists() then -- another handler may have deleted it meanwhile
            vehicle:setTag("spawnedAt", tostring(node.server.unixTime()))
        end
    end)
end)
```

## Waiting without blocking: node.async

`node.async(fn, ...)` runs `fn(...)` as a cooperative coroutine on the worker and returns its task
id. Inside it, four calls suspend the coroutine while everything else keeps running:

- `node.sleep(ms)` - for a duration.
- `node.wait(msOrPredicate, intervalMs?)` - a number sleeps; a function suspends until it returns
  truthy, polled every `intervalMs` (default 50).
- `node.yield()` - gives the worker back for one turn inside a long loop that must run on it.
  Fairness, not parallelism.
- `node.await(workFn, args?)` - runs a function on the background pool and resumes with its
  result; see below. `node.http.fetch` is built on the same idea.

Outside a coroutine these calls fail: `node.sleep called outside a node.async task` in the log,
and Lua's "attempt to yield" error in the handler. The task ends when `fn` returns or raises; an
error is logged as `error in async task`. Tasks are dropped by a reload and at shutdown.

```lua
node.on("race:start", function(player, data)
    node.async(function()
        for i = 3, 1, -1 do
            node.broadcast("race:countdown", tostring(i))
            node.sleep(1000)
        end
        node.broadcast("race:go")
    end)
end)
```

A coroutine that sleeps wakes into a changed world: the player may have left, the vehicle may be
gone. Re-check with `player:isConnected()` and `vehicle:exists()` after every `node.sleep`, and
remember that ids are reused.

## Real parallelism: node.job and node.await

Heavy computation does not belong on the worker. `node.job(workFn, args?, doneFn)` runs `workFn`
on a background pool thread in a fresh, scratch Lua state and calls `doneFn(result, err)` on the
worker when it finishes. `node.await(workFn, args?)` is the coroutine form, inside `node.async`
only: it suspends until the work is done and returns `result` or `nil, err`.

Because `workFn` runs in another Lua state, it must be **self-contained**: no upvalues, no `node`,
no globals of your resource - it is serialised as bytecode and loaded elsewhere, and a function
that cannot be dumped fails with `work function cannot be serialized (C function?)`. It receives
`args` and returns a result, both JSON-serialisable (tables, strings, numbers, booleans). Give it
copies of what it needs and get plain data back.

```lua
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
    end)
end)
```

The pool has one thread per hardware thread, clamped between 2 and 32; `NODE_PLUGIN_POOL` overrides
the count. Its queue holds 10 000 jobs; past that, `node.job` returns `false` and `node.await`
resumes with `nil, "background pool is full"`.

## HTTP

`node.http` runs requests on the background pool and calls you back on the worker.

- `node.http.request(method, url, opts?, cb)` is the general form (server 1.2.0): any method -
  `"GET"`, `"POST"`, `"PUT"`, `"PATCH"`, `"DELETE"`, `"HEAD"` or a custom token the service
  understands - with `opts.headers` (a table) and `opts.body` (a table is JSON-encoded, a string
  is sent as is, `nil` sends none). `cb(status, body, headers)` runs on the worker.
- `node.http.get(url, headers?, cb)`, `node.http.post(url, body, headers?, cb)`,
  `node.http.put(url, body?, headers?, cb)`, `node.http.patch(url, body?, headers?, cb)`,
  `node.http.delete(url, body?, headers?, cb)` and `node.http.head(url, headers?, cb)` are
  `request` with the method fixed; a `HEAD` answer carries the status and the headers and an
  empty body. A failed request calls back with status `-1` and the error text in `body`
  (`resolve failed`, `connect failed`, `TLS handshake failed`, …); every one of them returns
  `false` only when the request could not be queued, and then `cb` never runs.
- `node.http.fetch(url, opts?)` is the coroutine form, inside `node.async` only:
  `local status, body, headers = node.http.fetch(url, { method = "DELETE", body = t, headers = h })`.
  `opts.method` is any method `request` accepts (before 1.2.0 anything but `POST` was sent as
  `GET`); `status` is `0` with body `"request not queued"` when the request could not be queued.

About 15 s timeout, an 8 MB body cap, up to five redirects. TLS peer verification is **off** unless
the hoster sets `[Http] CaFile` in `server.toml` ([Configuration](/hosting/configuration/#http)):
then every `https://` request is verified against that CA bundle and the host name, and a
certificate that does not check out is a `-1` whose body starts with
`TLS handshake failed (peer verification against [Http] CaFile)`. Without it, do not send secrets
to hosts you do not control.

```lua
node.on("playerJoined", function(player)
    node.http.get("https://example.com/motd.txt", function(status, body)
        if status == 200 and player:isConnected() then
            player:tell(body)
        end
    end)
end)
```

## Files and storage off the worker

`node.fs.write` is synchronous: fine for a small file, a stall for a large one.
`node.fs.writeAsync(path, data, cb?)` hands the bytes to the file-writer thread and runs `cb(ok)`
on the worker when the write is done; several writes to one path before the thread gets to them
collapse into the last. `node.storage.set` appends one line to the store's change log before it
returns - the cost of the value, not of the store - so it is fine inside a handler; the log is
folded into the snapshot when it outgrows it. Storage is covered on
[Resources](/plugins/resources/#state-nodestorage).

## The rules

1. Keep handlers short. Anything over a few milliseconds belongs in `node.async` (waiting) or
   `node.await`/`node.job` (computing).
2. Never spin-wait. There is no synchronous sleep or HTTP; use `node.sleep`, `node.wait` and
   `node.http.fetch` inside `node.async`.
3. Share nothing with a background job except JSON: it runs in another Lua state and sees neither
   your tables nor `node`.
4. Prefer polling a getter on a timer over a 60 Hz stream event when you need many vehicles at
   once: `node.vehicles.transforms()` is one read.
5. After any suspension, re-check that the player and vehicle still exist; ids are reused.
6. Everything you register dies with a reload; a job or HTTP request already running does not,
   and its callback may find the world changed.
7. Native modules follow a different contract - `NodeApi` calls are thread-safe from any thread,
   and the relay filter and log sink run inline. See [Native modules](/plugins/native-modules/).

## Next

- [Lua API reference](/plugins/api/lua/#top-level-events-sending-timers-coroutines) - the timer
  and coroutine calls with their signatures.
- [Events](/plugins/events/) - what arrives on the worker in the first place.
