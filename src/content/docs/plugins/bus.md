---
title: The bus between plugins
description: How plugins on one server send each other messages, how to name them, parse the data, ask and answer, and what else travels on the bus.
---

Plugins can't see each other's variables ([How a plugin is built](/plugins/resources/#the-lua-environment)), so they talk over the bus, a publish-subscribe channel inside the server. One plugin publishes a message under a name, and every plugin subscribed to that name receives it.

| Call | What it does |
|---|---|
| `node.bus.emit(name, data)` | Publishes `data` under `name`. A table becomes JSON. |
| `node.bus.call(name, data)` | Asks every plugin subscribed to `name` and returns their answers at once. |
| `node.bus.on(name, fn)` | Calls `fn(source, data)` for every message under `name`. |
| `node.bus.off(name, fn)` | Unsubscribes; without `fn` it removes all of this plugin's handlers for `name`. |

`source` is the name of the plugin that sent the message; a native module shows up as `"native"`. `data` arrives as a string: parse it with `node.json.decode`.

## Sending and receiving

The `scores` plugin keeps the tally:

<!-- doctest: server -->
```lua
local scores = {}

local function addScore(source, data)
    local add = node.json.decode(data)
    scores[add.name] = (scores[add.name] or 0) + add.points
    node.log("%s: %s +%d = %d", source, add.name, add.points, scores[add.name])
end

node.bus.on("score:add", addScore)

-- expect: \S+: Alice \+10 = 10
```

Any other plugin awards points:

<!-- doctest: server -->
```lua
local function awardPoints()
    node.bus.emit("score:add", { name = "Alice", points = 10 })
end

node.after(500, awardPoints)
```

The server delivers a message on the worker thread once the current handler has finished, not in the middle of it. The sender receives it too if it is subscribed to that name. Name messages `<plugin>:<what>`, like wire events, so two plugins don't collide ([Events](/plugins/events/#kinds-of-events)).

## Asking and answering

`node.bus.call` asks a question and gets the answers at once. A handler answers with what it returns:

<!-- doctest: server -->
```lua
local function answerPrice(source, data)
    return { item = data, cents = 250 }
end

node.bus.on("shop:price", answerPrice)
```

<!-- doctest: server -->
```lua
local function askPrice()
    for _, a in ipairs(node.bus.call("shop:price", "wrench")) do
        node.log("%s asks %d cents", a.source, a.value.cents)
    end
end

node.after(500, askPrice)

-- expect: \S+ asks 250 cents
```

- All handlers run immediately, before `call` returns, so the answer is what the other plugin knows at that moment.
- The answers arrive as a list of `{ source, value }`, in the order the handlers subscribed. A table arrives as a table. A handler that returns `nil` is left out of the list, so an empty list means nobody answered.
- The asking plugin's own handlers get the question too.
- A handler can call `call` itself, but no more than eight levels deep: beyond that `call` raises an error.
- A native module subscribed to the name sees the question but can't answer it.

A handler that has to wait for something, such as a database or an HTTP request, can't answer with `return`. Put the name to reply on into the question itself, and answer later with `emit`:

<!-- doctest: server -->
```lua
local function answerBalance(source, data)
    local ask = node.json.decode(data)
    node.bus.emit(ask.replyTo, { cents = 1500 })
end

node.bus.on("bank:ask", answerBalance)
```

<!-- doctest: server -->
```lua
local me = node.resources.manifest().name

local function logBalance(_, data)
    node.log("balance: %d cents", node.json.decode(data).cents)
end

node.bus.on("bank:balance:" .. me, logBalance)

local function askBalance()
    node.bus.emit("bank:ask", { replyTo = "bank:balance:" .. me })
end

node.after(500, askBalance)

-- expect: balance: 1500 cents
```

A reply name that includes the asking plugin's name keeps replies from getting mixed up. To wait for the reply in a coroutine, use `node.suspend`, which turns a callback into a pause ([Timers and coroutines](/plugins/concurrency/#coroutines)). The database module's `db.lua` is built this way.

## What else travels on the bus

- `player:tell` and `node.chat.say` publish `chat:say`, and the server shows it in chat.
- The [database module](/plugins/database/) answers plugins over the bus.
- Native modules also send and receive bus messages ([Native modules](/plugins/native-modules/)).
