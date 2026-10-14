---
title: Between resources
description: How resources talk to each other on the bus - publishing and subscribing, asking a question and waiting for the answer, and talking to native modules.
---

Every resource runs in a Lua state of its own. One resource can't read another's variables, call its
functions or open its `node.storage`. When two of them need to work together, say a race that pays
winners through a wallet resource, they talk over the **bus**: one publishes a named message, and
every resource subscribed to that name receives it.

## Publishing and subscribing

<!-- doctest: server -->
```lua
-- in the race resource: tell whoever cares that a race ended
node.after(500, function()
    node.bus.emit("race:finished", { winner = 42, time = 64.9 })
end)

-- in any resource that cares (the sender gets its own messages too)
node.bus.on("race:finished", function(source, data)
    local result = node.json.decode(data)
    node.log("%s says account %d won in %.1f s", source, result.winner, result.time)
end)

-- expect: \S+ says account 42 won in 64\.9 s
```

- `node.bus.emit(name, data)` publishes. A table is sent as JSON, a string as it is.
- `node.bus.on(name, fn)` subscribes. `fn(source, data)` gets the name of the resource that sent the
  message (`"native"` for a native module) and `data` as a string: decode JSON yourself.
- `node.bus.off(name, fn)` unsubscribes one handler, or all of them for that name without `fn`.

Delivery is asynchronous: `emit` returns at once, and the handlers run a moment later on the same
worker thread as everything else. The sender receives its own messages, which makes a resource easy
to test on its own.

Name messages `<resource>:<what happened>`, the same way as wire events: `race:finished`,
`wallet:paid`. One name belongs to the server: `chat:say` with `{ text, pid? }` puts a line in the
chat, and that's what `node.chat.say` and `player:tell` publish.

## Things to know

- **Messages aren't kept.** A resource that isn't subscribed when a message is delivered never sees
  it. Don't count on the other resource having loaded before yours; when you need something from it,
  ask (below), and have it announce changes as they happen.
- **A reload drops the subscriptions** of the reloaded resource, like its other handlers. Its
  `main.lua` subscribes again as it runs.
- **Keep messages small and plain.** They are JSON text. Send ids and numbers, not whole objects:
  a `Player` becomes a table with an `id`, and the receiver gets its own object with
  `node.players.get(id)`.

## Asking and waiting for the answer

The bus has no replies built in, but a question and an answer are just two messages. The asker puts a
random id in the question, the answering resource sends it back, and the asker matches them up.
With `node.suspend` the asking side reads like an ordinary function call:

<!-- doctest: server -->
```lua
-- in the wallet resource: answer questions about balances
local balances = { [42] = 1250 }

node.bus.on("wallet:ask", function(source, data)
    local question = node.json.decode(data)
    node.bus.emit("wallet:answer", { id = question.id, coins = balances[question.account] or 0 })
end)

-- in the asking resource
local waiting = {} -- [question id] = function that wakes the asker

node.bus.on("wallet:answer", function(source, data)
    local answer = node.json.decode(data)
    local wake = waiting[answer.id]
    if wake then
        waiting[answer.id] = nil
        wake(answer.coins)
    end
end)

local function balanceOf(account)
    local id = node.crypto.randomHex(8)
    return node.suspend(function(wake)
        waiting[id] = wake
        node.bus.emit("wallet:ask", { id = id, account = account })
        node.after(2000, function() -- nobody answered: the wallet isn't loaded
            if waiting[id] then
                waiting[id] = nil
                wake(nil, "no answer from the wallet")
            end
        end)
    end)
end

node.async(function()
    local coins, err = balanceOf(42)
    node.log("account 42 has %s coins", coins or err)
end)

-- expect: account 42 has 1250 coins
```

`balanceOf` can only be called inside `node.async`, because it waits
([Timers and coroutines](/plugins/concurrency/#waiting-without-blocking-nodeasync)). The random id
keeps answers apart when several resources ask at once, and the timeout keeps a coroutine from
waiting forever when the other resource isn't there.

## Native modules on the bus

Native modules publish and subscribe on the same bus (`emit_resource_event` and
`register_resource_event` in C), so a resource talks to a module exactly as to another resource.
The `dimensions` module from the examples is driven this way: a resource publishes
`dimensions:setPlayer` with `"<player id>;<dimension>"`, and the module announces every move as
`dimensions:changed`. A module's messages arrive with `source` set to `"native"`.

For raw bytes between a module and the players' game there is a separate channel, `node.modules.on`
and `node.modules.send` ([Native modules](/plugins/native-modules/)).

## Next

- [Events](/plugins/events/): everything a resource can react to.
- [Timers and coroutines](/plugins/concurrency/): waiting without holding up the server.
