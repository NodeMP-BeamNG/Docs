---
title: Timers and coroutines
description: Timers, coroutines that wait without blocking the server, heavy work on background threads, the 250 ms rule, and a restart with a countdown in chat.
---

Every handler, timer and coroutine of every resource runs on one worker thread, one at a time. That
makes code simple, with no locks and no races, and it sets one rule: **never block**. A handler that
loops for a second holds up every other resource for that second. The server warns when one job holds
the thread longer than 250 ms:

```text
plugin worker job stalled the thread …
```

Waiting is done with timers and coroutines, and heavy work goes to background threads.

## Timers

| Call | What it does |
|---|---|
| `node.after(ms, fn)` | Runs `fn` once, after `ms` milliseconds. |
| `node.every(ms, fn)` | Runs `fn` every `ms` milliseconds. A slow run delays the next one; runs never pile up. |
| `node.every(ms, fn, { precise = true })` | Keeps the schedule: runs the worker was too busy for follow back to back, and `fn(missed)` says how many. |
| `node.cancel(id)` | Stops a timer. Safe for one that already fired. |
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

Use `precise` when the count matters: a point every second, a countdown. Ten seconds of
`every(100, fn, { precise = true })` give a hundred runs even if another handler held the thread.
After a long stall at most `maxBacklog` runs are caught up (10 unless you say otherwise); then the
schedule starts again from now, and the log says so once.

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

`serverTick` fires on every tick of the server. It shares the thread with everything else, so keep
it short; a timer is usually the better choice.

## Coroutines

A coroutine is code that can pause without holding the thread. `node.async(fn)` starts one; inside
it, `node.sleep(ms)` pauses for a while and everything else keeps running meanwhile. Code that
counts down reads top to bottom:

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

`node.wait(fn)` pauses until `fn` returns true, checking every 50 ms:

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

Inside a coroutine, `node.http.fetch` waits for an HTTP answer the same way
([HTTP requests](/plugins/http/)), and the database module's calls wait for their results
([The db module](/plugins/database/)).

## Heavy work

A computation that takes long doesn't belong on the worker at all. `node.await(fn, args)` runs `fn`
on a background thread and pauses the coroutine until it's done:

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

The background function is copied to another Lua state, so it must stand alone: no variables from
outside, no `node`, only its argument and plain Lua. Its argument and result travel as JSON.
`node.job(fn, args, done)` is the same with a callback instead of a coroutine.

## A restart with a countdown

`node.server.shutdown(reason, delayMs)` schedules a stop, and `serverShutdownScheduled` tells every
resource when it's due, so one of them can count down in chat. With `Restart=always` under systemd
or a Docker restart policy, the stop becomes a restart.

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

Calling `shutdown` again replaces the schedule; a negative delay cancels it. When the moment comes,
players are sent away with the reason, `serverShutdown` and `resourceUnload` run, and the server
exits with code 0.
