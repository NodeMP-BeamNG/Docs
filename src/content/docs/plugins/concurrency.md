---
title: Timers and coroutines
description: Timers, coroutines that wait without blocking the server, heavy work on background threads, the 250 ms rule and a restart with a countdown in chat.
---

The handlers, timers and coroutines of every plugin run on a single worker thread, one at a time. There are no races between them and no need for locks, but a handler that runs for a long time holds up all the other plugins.

If one run holds the thread for more than 250 ms, the server writes this to the log:

```text
plugin worker job stalled the thread …
```

Wait with timers and coroutines, and hand heavy work to background threads.

## Timers

| Call | What it does |
|---|---|
| `node.after(ms, fn)` | Runs `fn` once, after `ms` milliseconds. |
| `node.every(ms, fn)` | Runs `fn` every `ms` milliseconds. A slow run pushes the next one back, and runs don't pile up. |
| `node.every(ms, fn, { precise = true })` | Keeps the schedule: runs the thread missed follow one after another, and `fn(missed)` tells how many were missed. |
| `node.cancel(id)` | Stops a timer. You can call it for a timer that has already fired. |
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

Use `precise` when the number of runs matters: a point per second, a countdown. Ten seconds of `every(100, fn, { precise = true })` give a hundred runs, even if another handler occupied the thread. After a long delay the timer catches up at most `maxBacklog` runs (a key of the same table, 10 by default, at most 1000). The rest are skipped, the schedule restarts from the current moment, and the log says so once.

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

A coroutine is code that can pause without occupying the thread. `node.async(fn, ...)` starts one, and inside it `node.sleep(ms)` waits for the given time while everything else keeps working. A countdown reads top to bottom:

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

`node.sleep`, `node.wait`, `node.await`, `node.yield`, `node.suspend` and `node.http.fetch` work only inside `node.async`. A long loop that needs the worker thread gives it to others for one turn by calling `node.yield()`.

`node.suspend(arm)` calls `arm(resume)` and pauses the coroutine until someone calls `resume(...)`. Whatever you pass to `resume` is what `node.suspend` returns. It is the general form of `node.sleep` and `node.await`: this is how a callback becomes linear code, as in `db.lua` ([The db module](/plugins/database/)).

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

`node.server.shutdown(reason, delayMs)` schedules a stop; the default reason is `Server shutdown`. The `serverShutdownScheduled` event tells every plugin when it will happen, and one of them can count down in chat. With `Restart=always` in systemd or a restart policy in Docker, the stop becomes a restart.

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

Calling `shutdown` again replaces the schedule, and a negative delay cancels it. A stop without a delay doesn't trigger `serverShutdownScheduled`. When the time comes, the players are disconnected with that reason, `serverShutdown` and `resourceUnload` run, and the server exits with code 0.
