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
| `node.bus.on(name, fn)` | Calls `fn(source, data)` for every message under `name`. |
| `node.bus.off(name, fn)` | Unsubscribes; without `fn`, every handler of this resource for `name`. |

`source` is the name of the resource that sent the message; a native module shows as `"native"`.
`data` arrives as a string: decode it with `node.json.decode`.

## Sending and receiving

A `scores` resource keeps the totals:

<!-- doctest: server -->
```lua
local scores = {}

node.bus.on("score:add", function(source, data)
    local add = node.json.decode(data)
    scores[add.name] = (scores[add.name] or 0) + add.points
    node.log("%s: %s +%d = %d", source, add.name, add.points, scores[add.name])
end)

-- expect: \S+: Alice \+10 = 10
```

Any other resource adds points:

<!-- doctest: server -->
```lua
node.after(500, function()
    node.bus.emit("score:add", { name = "Alice", points = 10 })
end)
```

Messages are delivered on the worker after the current handler finishes, never in the middle of it,
and they reach the sender too if it subscribed to the name. Name them `<resource>:<what>`, like wire
events, so two resources don't collide.

## Asking and answering

The bus has no replies of its own. The usual way is to put the name to answer under into the
question:

<!-- doctest: server -->
```lua
node.bus.on("bank:ask", function(source, data)
    local ask = node.json.decode(data)
    node.bus.emit(ask.replyTo, { cents = 1500 })
end)
```

<!-- doctest: server -->
```lua
local me = node.resources.manifest().name

node.bus.on("bank:balance:" .. me, function(_, data)
    node.log("balance: %d cents", node.json.decode(data).cents)
end)

node.after(500, function()
    node.bus.emit("bank:ask", { replyTo = "bank:balance:" .. me })
end)

-- expect: balance: 1500 cents
```

A name that includes the asking resource keeps answers apart. To wait for an answer in a coroutine,
`node.suspend` turns a callback into a pause; the database module's `db.lua` is built that way.

## What else travels on the bus

- `player:tell` and `node.chat.say` publish `chat:say`, and the server shows it in the chat.
- The [database module](/plugins/database/) answers resources over the bus.
- Native modules send and receive bus messages too ([Native modules](/plugins/native-modules/)).
