---
title: Timers and coroutines
description: Timers, coroutines that wait without blocking the server, heavy work on background threads, the 250 ms rule and a restart with a countdown in chat.
---

The handlers, timers and coroutines of every plugin run on one worker thread, one at a time. There are no races and no locks to take, but a long handler holds up every other plugin.

If one run holds the thread longer than 250 ms, the server logs:

```text
plugin worker job stalled the thread …
```

Wait with timers and coroutines, and hand heavy work to background threads.

## Timers

| Call | What it does |
|---|---|
| `node.after(ms, fn)` | Runs `fn` once, after `ms` milliseconds. |
| `node.every(ms, fn)` | Runs `fn` every `ms` milliseconds. A slow run delays the next; runs don't pile up. |
| `node.every(ms, fn, { precise = true })` | Keeps the schedule: missed runs follow back to back, and `fn(missed)` says how many were missed. |
| `node.cancel(id)` | Stops a timer; safe to call for one that has already fired. |
| `node.defer(fn)` | Runs `fn` as soon as the current event has been handled. |

<!-- doctest: server -->
```lua
local ticks = 0
local id

local function countTick()
    ticks = ticks + 1
    if ticks == 3 then
        node.cancel(id)
        node.log("stopped after %d ticks", ticks)
    end
end

id = node.every(500, countTick)

-- expect: stopped after 3 ticks
```

Use `precise` when the count of runs matters: a point per second, a countdown. Ten seconds of `every(100, fn, { precise = true })` give a hundred runs even if another handler held the thread. After a long delay the timer catches up at most `maxBacklog` runs (a key of the same table, 10 by default, at most 1000); the rest are skipped, the schedule restarts from now, and the log says so once.

<!-- doctest: server -->
```lua
local seconds = 0

local function countTime(missed)
    seconds = seconds + 0.1
    if missed > 0 then node.log("caught up %d runs", missed) end
end

node.every(100, countTime, { precise = true })

local function reportTime()
    node.log("counted %.1f s", seconds)
end

node.after(1050, reportTime)

-- expect: counted 1\.0 s
```

`serverTick` arrives on every server tick. It shares the thread with everything else, so keep it short; a timer is usually the better fit.

## Coroutines

A coroutine is code that can pause without holding the thread. `node.async(fn, ...)` starts one, and inside it `node.sleep(ms)` waits while everything else keeps running. A countdown reads top to bottom:

<!-- doctest: server -->
```lua
local function countdown()
    for i = 3, 1, -1 do
        node.log("%d", i)
        node.sleep(500)
    end
    node.log("go")
end

node.async(countdown)

-- expect: ^go$
```

`node.wait(fn)` waits until `fn` returns a true value. The server calls `fn` every 50 ms; a second argument sets another interval:

<!-- doctest: server+client -->
```lua
local function somebodyIsHere()
    return node.players.count() > 0
end

local function announce()
    node.wait(somebodyIsHere)
    node.log("someone is here")
end

node.async(announce)

-- expect: someone is here
```

`node.sleep`, `node.wait`, `node.await`, `node.yield`, `node.suspend` and `node.http.fetch` work only inside `node.async`. A long loop on the worker thread gives others one turn with `node.yield()`.

`node.suspend(arm)` calls `arm(resume)` and pauses the coroutine until someone calls `resume(...)`, then returns what was passed to `resume`. It is the general form of `node.sleep` and `node.await` and turns a callback into linear code, as in `db.lua` ([The db module](/plugins/database/)).

## Heavy work

Long computations don't belong on the worker thread. `node.await(fn, args)` runs `fn` on a background thread and keeps the coroutine paused until `fn` finishes:

<!-- doctest: server -->
```lua
local function sumTo(n)
    local total = 0
    for i = 1, n do
        total = total + i
    end
    return total
end

local function report()
    local sum, err = node.await(sumTo, 1000)
    node.log("sum = %s", tostring(sum or err))
end

node.async(report)

-- expect: sum = 500500
```

The background function is copied into another Lua state, so it must stand alone: no outside variables, no `node`, only its argument and plain Lua. The argument and the result travel as JSON. `node.job(fn, args, done)` does the same with a `done(result, err)` callback instead of a coroutine.

## A restart with a countdown

`node.server.shutdown(reason, delayMs)` schedules a stop, by default with the reason `Server shutdown`. `serverShutdownScheduled` tells every plugin when, so one of them can count down in chat. With `Restart=always` in systemd or a Docker restart policy, the stop becomes a restart.

<!-- doctest: server+client {"config": {"moderators": [42]}, "emit": [["chat:send", {"text": "/restart"}]]} -->
```lua
local moderators = {}
for _, id in ipairs(node.config.moderators or {}) do
    moderators[id] = true
end

local current

local function countDown(info)
    while current == info do
        local left = math.floor(info.at - node.server.unixTime())
        if left <= 0 then break end
        node.chat.say("Restart in %d s: %s", left, info.reason)
        node.sleep(math.min(left, 60) * 1000)
    end
end

local function trackShutdown(info)
    current = info
    if info.cancelled then
        node.chat.say("The restart is called off")
        return
    end
    node.async(countDown, info)
end

node.on("serverShutdownScheduled", trackShutdown)

local function handleRestart(player, msg)
    if msg.text ~= "/restart" then return end
    if moderators[player.accountId] then
        node.server.shutdown("Scheduled restart", 5 * 60 * 1000)
    end
    return { handled = true }
end

node.on("chatMessageRequest", handleRestart)

-- expect-client: Alice chat:msg .*Restart in \d+ s: Scheduled restart
```

Calling `shutdown` again replaces the schedule; a negative delay cancels it. A stop without a delay doesn't fire `serverShutdownScheduled`. When the time comes, players are disconnected with the reason, `serverShutdown` and `resourceUnload` run, and the server exits with code 0.
