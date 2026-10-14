---
title: Your first resource
description: Build a resource from an empty folder - resource.toml, a server half that greets players, a client half that answers - then run it, reload it and read its errors.
---

This page builds a resource called `hello`: a server half that greets every player and says how
many are online once a minute, and a client half that reports back every ten seconds. Nothing
needs installing; Lua is built into the server.

You need a running `Node-Server` ([Run a server](/hosting/quick-start/)) and, for the client half, a
launcher that can join it. The server half can be tried without the game
([below](#testing-without-the-game)). Keep the [Lua API reference](/plugins/api/lua/) open in
another tab.

## The folder

Resources live in `resources/` in the server's working directory, next to `server.toml`. Make this
tree:

```
resources/
└── hello/
    ├── resource.toml
    ├── server/
    │   └── main.lua        # runs on the server
    └── client/
        └── main.lua        # sent to every player
```

The folder name is the resource's name unless the manifest says otherwise.

## resource.toml

```toml
name = "hello"
version = "1.0"

[client]
obfuscation = "none"
```

All of it is optional. Without a manifest, a folder is a Lua resource named after the folder, with
`server/main.lua` as its entry point and every `.lua` under `client/` sent to players.
`obfuscation = "none"` sends the client file as plain source while you develop, so errors in the
player's log stay readable; remove it before you publish. Every key is on
[Resources](/plugins/resources/#resourcetoml).

## The server half

`server/main.lua` runs once when the server starts. The code at the top level subscribes to events
and starts timers; the server calls them as things happen.

<!-- doctest: server+client {"emit": [["hello:count", "1"]]} -->
```lua
node.log("hello loaded, players online: %d", node.players.count())

-- an engine event: the handler receives a Player object
node.on("playerJoined", function(player)
    node.log("%s joined from %s", tostring(player), player.ip)
    player:tell("Welcome, %s", player.name)
    player:send("hello:greet", { name = player.name })
end)

node.on("playerLeft", function(player)
    node.log("%s left", tostring(player)) -- the name is still known here
end)

-- a wire event from the client half: (player, data), data as the client sent it
node.on("hello:count", function(player, data)
    node.log("%s -> %s", tostring(player), tostring(data))
end)

-- a repeating timer, on the same worker thread as every handler
node.every(60000, function()
    node.chat.say("%d player(s) online", node.players.count())
end)

-- expect: hello loaded, players online: 0
-- expect: Player#\d+ Alice joined from \S+
-- expect: Player#\d+ Alice -> 1
-- expect: Player#\d+ Alice left
```

What each line does:

- `node.log(msg, ...)` prints to the console under the resource's name; extra arguments are
  `string.format` arguments.
- `node.on("playerJoined", fn)` subscribes to an engine event. The handler gets a `Player`:
  `player.id`, `player.name` and `player.ip` are fields, `player:tell` and `player:send` are
  methods, and `tostring(player)` reads `Player#0 Alice`. The [events reference](/plugins/api/events/)
  lists every event with its arguments.
- `player:tell(text, ...)` is a system line in that player's chat; `node.chat.say` says one to
  everyone. Chat is part of the server, so both work with no other resource.
- `player:send(event, data)` sends a **wire event** to that player's client half; a table is
  JSON-encoded for you. Wire event names are `<domain>:<verb>`, lowercase, one colon.
- `node.on("hello:count", fn)`: a name that isn't an engine event is a wire event from the client
  half. Its handler gets `(player, data)`, with `data` as the string the client sent.
- `node.every(ms, fn)` runs `fn` until `node.cancel(id)`; `node.after(ms, fn)` runs it once.

## The client half

`client/main.lua` is sent to every player when they join and runs inside BeamNG, with full access
to the game and the client `node` table.

<!-- doctest: client -->
```lua
local M = {}

local n = 0   -- the number we send
local acc = 0 -- seconds since the last send

node.log("hello client script loaded")

-- sent by server/main.lua on playerJoined; data is the JSON text of the table it sent
node.on("hello:greet", function(data)
    local greeting = jsonDecode(data)
    node.log("server greets " .. tostring(greeting.name))
end)

-- a returned table with on* functions is registered as a game extension,
-- so onUpdate(dt) ticks every frame
function M.onUpdate(dt)
    acc = acc + (dt or 0)
    if acc < 10 then return end
    acc = 0
    n = n + 1
    node.emitServer("hello:count", tostring(n))
end

return M
```

Three things differ from the server side. A client `node.on(name, fn)` handler gets only `data`,
the string the server sent; decode JSON with the game's `jsonDecode`. `node.emitServer(name, data)`
sends a wire event to the server, as a string. `node.log(msg)` writes to the game's log,
`beamng.log`. The rest of the client API is on [Client scripts](/plugins/client-scripting/).

## Run it

Start the server. The console confirms the resource:

```
hello · hello loaded, players online: 0
hello v1.0 loaded — lua · server 1 file · 1 client file
1 resource · 1 module loaded
```

The first line is your `node.log`: the entry point runs while the server loads it, before the line
that says it's loaded. Join with the launcher. The console shows the join and, every ten seconds,
the client's count:

```
hello · Player#0 Alice joined from 203.0.113.5
hello · Player#0 Alice -> 1
hello · Player#0 Alice -> 2
```

Alice sees `Welcome, Alice` in her chat, and everyone sees `1 player(s) online` once a minute. On
Alice's PC, `beamng.log` (in `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\`) has the client side:

```
Activated server resource "hello" (1 ge file(s), 0 vehicle file(s))
hello client script loaded
server greets Alice
```

## Reload without restarting

Type `reload hello` in the server console. The resource's handlers, timers and coroutines are
dropped and `server/main.lua` runs again; the console says `hello reloaded — lua`. Two things to
know:

- Lua variables don't survive. Keep what must in `node.storage`, which survives reloads and
  restarts ([Storage and files](/plugins/storage/)).
- Client files are packed once, at start: a change under `client/` needs a server restart.

A resource can reload itself or another one with `node.resources.reload(name)`. Here it is as a
chat command, limited to players a plugin gave the `admin` role:

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/reload"}]]} -->
```lua
node.commands.add("reload", function(player, args)
    local name = args[1] or "hello"
    if node.resources.reload(name) then
        player:tell("reloading %s", name)
    else
        player:tell("no resource named %s", name)
    end
end, { role = "admin" })

-- expect-client: Alice chat:msg .*You are not allowed to use /reload
```

`role` lets only players whose role is `admin` use the command; a plugin gives that role with
`player:setRole("admin")` ([Chat → Commands](/plugins/chat/#commands)). Alice has no role, so she
is told she may not.

## Testing without the game

Nothing on the server side needs a player: every server call works with the server alone. A chat
command can be tested through the bus, the way the server itself delivers commands to plugins:
publish the line a player would have typed as `chat:command` and watch the reply as `chat:say`.

<!-- doctest: server -->
```lua
-- the command under test
node.commands.add("hello", function(player, args, raw)
    player:tell("Hello, %s! You typed: %s", tostring(player.name), raw)
end)

-- the test bench: watch what commands answer on the bus ...
node.bus.on("chat:say", function(source, data)
    local reply = node.json.decode(data)
    node.log("%s says to pid %s: %s", source, tostring(reply.pid), reply.text)
end)

-- ... and, half a second in, pretend that player 0 typed "/hello world"
node.after(500, function()
    node.bus.emit("chat:command", { pid = 0, name = "hello", args = { "world" }, raw = "/hello world" })
end)

-- expect: \S+ says to pid 0: Hello, nil! You typed: /hello world
```

`name` is lowercase: the server lowercases what the player typed before it publishes the command.
There is no player 0 here, so `player.name` is `nil` and the reply reaches nobody; the bus line is
what you check. Timers, storage, the database, HTTP, a reload, `serverShutdown` and
`resourceUnload` at Ctrl+C all work the same with or without players. Only wire events need a
client, because only the client mod sends them, and client files can't run outside the game at all.

## Where errors show

Server-side errors go to the console and `logs/server.log`, with the resource's name, what was
running and Lua's message, which has the file and line:

```
hello · error in event 'hello:count': .../resources/hello/server/main.lua:16: attempt to concatenate a nil value
```

An error while `main.lua` loads is reported the same way; the resource still counts as loaded, with
whatever it subscribed to before the failing line, so fix it and `reload hello`. An error inside a handler never unloads the
resource. A handler that holds the worker for more than 250 ms is reported as stalling it, with the
resource and the kind of handler named:
`plugin worker job stalled the thread for 300 ms (resource hello, event 'hello:count') — move heavy work to node.await/node.job`.
[Timers and coroutines](/plugins/concurrency/) shows how to avoid that.

Client-side errors are in the player's `beamng.log`. A file that doesn't compile is skipped
(`Resource "hello" (main.lua): compile error: ... -- file skipped`), and an error in a handler
reads `Error in event handler for "hello:greet" from source "node.res/hello": ...`. The server
checks client files for syntax when it packs them and reports a broken one at start:
`hello · client file 'main.lua' has a syntax error: main.lua:1: unexpected symbol near '=' (the file ships anyway; the game's Lua will very likely refuse it too)`.

## Next

- [Resources](/plugins/resources/): the manifest, settings, files, reloading.
- [Events](/plugins/events/): the join order and every kind of event.
- [The example plugins](/plugins/examples/): `gatekeeper-example` refuses requests,
  `vehicle-cleanup` reads its settings and runs a policy on a timer.
