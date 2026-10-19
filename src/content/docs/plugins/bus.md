---
title: The bus between resources
description: How resources on one server send each other messages, naming them, decoding the data, asking and answering, and what else travels on the bus.
---

Resources don't share variables: each has its own Lua state. They talk over the **bus**, a
publish-subscribe channel inside the server. One resource publishes a message under a name, and every
resource subscribed to that name receives it.

| Call | What it does |
|---|---|
| `node.bus.emit(name, data)` | Publishes `data` under `name`. A table is turned into JSON. |
| `node.bus.call(name, data)` | Asks every resource subscribed to `name` and returns their answers at once. |
| `node.bus.on(name, fn)` | Calls `fn(source, data)` for every message under `name`. |
| `node.bus.off(name, fn)` | Unsubscribes; without `fn`, every handler of this resource for `name`. |

`source` is the name of the resource that sent the message; a native module shows as `"native"`.
`data` arrives as a string: decode it with `node.json.decode`.

## Sending and receiving

A `scores` resource keeps the totals:

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

Any other resource adds points:

<!-- doctest: server -->
```lua
local function awardPoints()
    node.bus.emit("score:add", { name = "Alice", points = 10 })
end

node.after(500, awardPoints)
```

Messages are delivered on the worker after the current handler finishes, never in the middle of it,
and they reach the sender too if it subscribed to the name. Name them `<resource>:<what>`, like wire
events, so two resources don't collide.

## Asking and answering

`node.bus.call` asks a question and gets the answers right away. A handler answers by returning a
value:

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

- Every handler runs now, before `call` returns, so an answer is what the other resource knows at
  that moment.
- The answers come as a list of `{ source, value }`, in the order the handlers subscribed. A table
  arrives as a table. A handler that returns `nil` is left out, so an empty list means nobody
  answered.
- The caller's own handlers are asked too.
- A handler that calls back into the resource that asked, and so on, can nest calls only 8 deep;
  past that `call` raises an error.
- A native module subscribed to the name sees the question but can't answer it.

`call` was added in server 1.9.0. A handler that has to wait for something, a database or an HTTP
request, can't answer by returning. Then put the name to answer under into the question and answer
later with `emit`:

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

local function askBalance()
    node.bus.emit("bank:ask", { replyTo = "bank:balance:" .. me })
end

node.bus.on("bank:balance:" .. me, logBalance)
node.after(500, askBalance)

-- expect: balance: 1500 cents
```

A name that includes the asking resource keeps answers apart. To wait for an answer in a coroutine,
`node.suspend` turns a callback into a pause; the database module's `db.lua` is built that way.

## What else travels on the bus

- `player:tell` and `node.chat.say` publish `chat:say`, and the server shows it in the chat.
- The [database module](/plugins/database/) answers resources over the bus.
- Native modules send and receive bus messages too ([Native modules](/plugins/native-modules/)).
