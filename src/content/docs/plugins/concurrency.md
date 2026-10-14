---
title: Timers and coroutines
description: Timers, coroutines that wait without blocking the server, heavy work on background threads, the 250 ms rule, and a restart with a countdown in chat.
---

Every handler, timer and coroutine of every resource runs on one worker thread, one at a time. That
makes code simple, with no locks and no races, and it sets one rule: **never block**. A handler that
loops for a second holds up every other resource for that second. The server warns when one job holds
the thread longer than 250 ms:

```
plugin worker job stalled the thread …
```

Waiting is done with timers and coroutines, and heavy work goes to background threads.

## Timers

| Call | What it does |
|---|---|
| `node.after(ms, fn)` | Runs `fn` once, after `ms` milliseconds. |
| `node.every(ms, fn)` | Runs `fn` every `ms` milliseconds. A slow run delays the next one; runs never pile up. |
| `node.cancel(id)` | Stops a timer. Safe for one that already fired. |
| `node.defer(fn)` | Runs `fn` as soon as the current event has been handled. |

<!-- doctest: server -->
```lua
local ticks = 0
local id
id = node.every(500, function()
    ticks = ticks + 1
    if ticks == 3 then
        node.cancel(id)
        node.log("stopped after %d ticks", ticks)
    end
end)

-- expect: stopped after 3 ticks
```

`serverTick` fires on every tick of the server. It shares the thread with everything else, so keep
it short; a timer is usually the better choice.

## Coroutines

A coroutine is code that can pause without holding the thread. `node.async(fn)` starts one; inside
it, `node.sleep(ms)` pauses for a while and everything else keeps running meanwhile. Code that
counts down reads top to bottom:

<!-- doctest: server -->
```lua
node.async(function()
    for i = 3, 1, -1 do
        node.log("%d", i)
        node.sleep(500)
    end
    node.log("go")
end)

-- expect: ^go$
```

`node.wait(fn)` pauses until `fn` returns true, checking every 50 ms:

<!-- doctest: server+client -->
```lua
node.async(function()
    node.wait(function()
        return node.players.count() > 0
    end)
    node.log("someone is here")
end)

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
node.async(function()
    local sum, err = node.await(function(n)
        local total = 0
        for i = 1, n do
            total = total + i
        end
        return total
    end, 1000)
    node.log("sum = %s", tostring(sum or err))
end)

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

node.on("serverShutdownScheduled", function(info)
    current = info
    if info.cancelled then
        node.chat.say("The restart is called off")
        return
    end
    node.async(function()
        while current == info do
            local left = math.floor(info.at - node.server.unixTime())
            if left <= 0 then break end
            node.chat.say("Restart in %d s: %s", left, info.reason)
            node.sleep(math.min(left, 60) * 1000)
        end
    end)
end)

node.on("chatMessageRequest", function(player, msg)
    if msg.text ~= "/restart" then return end
    if moderators[player.accountId] then
        node.server.shutdown("Scheduled restart", 5 * 60 * 1000)
    end
    return { handled = true }
end)

-- expect-client: Alice chat:msg .*Restart in \d+ s: Scheduled restart
```

Calling `shutdown` again replaces the schedule; a negative delay cancels it. When the moment comes,
players are sent away with the reason, `serverShutdown` and `resourceUnload` run, and the server
exits with code 0.
