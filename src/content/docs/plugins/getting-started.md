---
title: Getting started
description: Your first resource - a folder, resource.toml, a server script that greets players, a client script that answers - then run, reload and read errors.
---

This page builds a resource called `hello` from an empty folder to a running server: a server half
that greets each player and counts them once a minute, and a client half that reports back every
ten seconds. It mirrors `demo-numbers`, the smallest end-to-end example, and adds the calls you
will use on day one. Nothing needs installing beyond the server: Lua is built in.

You need a running `Node-Server` 1.4.1 ([Quick start](/hosting/quick-start/)), the
[Lua API reference](/plugins/api/lua/) open in another tab and, for the client half, the launcher
on a machine that can join the server - the server half can be exercised without the game
([below](#testing-without-the-game)). Two of the calls below - `player:tell` and `node.chat.say` -
speak through the `chat` example resource, which draws the chat and owns the `/` commands: install
`chat` beside `hello` (copy `examples/chat` from the release archive into `resources/`;
`examples/README.txt` lists the others), or know that without it those two calls do nothing at
all - no chat line, and no console line either. `node.log` is what shows on the console.

## The folder

Resources live in `resources/` inside the server's working directory, next to `server.toml`.
Create this tree:

```
resources/
└── hello/
    ├── resource.toml
    ├── server/
    │   └── main.lua        # runs on the server
    └── client/
        └── main.lua        # streamed to every player
```

The folder name is the resource's default name; the manifest can override it.

## resource.toml

```toml
name = "hello"
version = "1.0"

[server]
main = "server/main.lua"

[client]
files = ["main.lua"]
obfuscation = "none"
```

Everything here is optional - a folder without a manifest is a Lua resource named after the folder
with `server/main.lua` as its entry point and every `.lua` under `client/` streamed to players.
`obfuscation = "none"` ships the client file as plain source while you develop, so `beamng.log`
stays readable; drop the line before you publish and the default `light` tier applies. The full
schema is on [Resources](/plugins/resources/).

## The server half

`server/main.lua` runs once when the server starts. Top-level code registers handlers; the server
calls them as things happen.

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

What each line relies on:

- `node.log(msg, ...)` prints under the resource's name; extra arguments are `string.format`
  arguments.
- `node.on("playerJoined", fn)` subscribes to an engine event. The handler gets a `Player`: `player.id`,
  `player.name`, `player.ip` are fields, `player:tell` and `player:send` are methods, and
  `tostring(player)` reads `Player#0 Alice`. The [events reference](/plugins/api/events/) lists
  every name with its arguments.
- `player:send(event, data)` sends a wire event to that player; a table is JSON-encoded for you.
  The name follows the `<domain>:<verb>` rule for wire events, lowercase with one colon.
- `node.on("hello:count", fn)` - a name that is not an engine event is a wire event from the client
  half. Its handler receives `(player, data)`, with `data` as the string the client sent.
- `node.every(ms, fn)` runs `fn` on the worker thread until `node.cancel(id)`; `node.after(ms, fn)`
  is the one-shot form.

## The client half

`client/main.lua` is streamed to every player after the content sync and runs inside BeamNG with
full game access, using the client `node` table.

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

Three things differ from the server side. `node.on(name, fn)` handlers receive only `data`, the
string the server sent - decode JSON with the game's `jsonDecode`. `node.emitServer(name, data)`
sends a wire event to the server; `data` is sent as a string. `node.log(msg)` writes to
`beamng.log` under the `node.events` tag. The rest of the client table (`node.off`,
`node.emitLocal`, the module channel, `node.requestVehicleTrigger`) is on
[Client scripting](/plugins/client-scripting/).

## Run it

Start the server. Two lines under the `Res` tag confirm the resource, followed by the summary:

```
hello · hello loaded, players online: 0
hello v1.0 loaded — lua · server 1 file · 1 client file
1 resource · 0 modules loaded
```

The first line is your `node.log` call: the entry point runs during the scan, before the load line.
Join with the launcher. The server console shows the join and, every ten seconds, the client's
count:

```
hello · Player#0 Alice joined from 203.0.113.5
hello · Player#0 Alice -> 1
hello · Player#0 Alice -> 2
```

If `chat` is installed, Alice sees `Welcome, Alice` as a system line, and everyone sees
`1 player(s) online` once a minute. On Alice's machine, `beamng.log` (in
`%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\`) carries the client side under the `node.res` and
`node.events` tags:

```
Activated server resource "hello" (1 ge file(s), 0 vehicle file(s))
hello client script loaded
server greets Alice
```

## Reload without restarting

`node.resources.reload(name)` reloads a resource: its handlers, timers and coroutines are dropped
and the server half runs again from `main.lua`, on the worker thread after the current handler
returns. A resource may reload itself. The server has no console input, so trigger it from Lua -
the usual way is a chat command, which needs the `chat` resource:

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

`role` restricts the command to players whose per-session role another handler assigned with
`player:setRole("admin")`; without it anyone could type `/reload`. The console confirms with
`hello reloaded — lua`. Two limits: Lua state is lost (keep what must survive in `node.storage`,
which persists across reloads and restarts), and the client half is packaged once at start, so a
change under `client/` needs a server restart. Without `chat`, restart the server - or let the
resource reload itself once from a timer, with a `node.storage` flag so the new instance does not
do it again; that also exercises `resourceUnload("reload")`
([Resources → Reload](/plugins/resources/#reload)).

## Testing without the game

The server has no console input and nothing on it needs a player: every server-side call works
with the server alone, and a chat command can be exercised through the bus contract `chat` speaks
([Events → node.bus](/plugins/events/#between-resources-nodebus)). A second resource - or a few
lines at the end of your own - publishes the line a player would have typed as `chat:command`
and watches the reply as `chat:say`:

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

`name` must be lowercase - `chat` lowercases what the player typed before it publishes, and the
prelude looks the handler up by the exact string. No player 0 exists here, so `player.name` is
`nil` and the reply cannot be delivered to anyone; the bus line is what you check. Everything
else - timers, `node.storage`, the `db` module, `node.http`, a reload, `serverShutdown` and
`resourceUnload` at Ctrl+C - runs the same with or without players; a wire event handler is the
one thing that needs a client, because only the client mod can send one. The client half cannot
be run outside the game at all: the server packages the files and syntax-checks them but does
not execute them, and the first place a runtime error shows is a player's `beamng.log`.

## Where errors show

Server-side errors go to the console and to `logs/server.log` under the `Error` tag, prefixed with
the resource's name and where the error happened, with a stack trace:

```
hello · error in event 'hello:count': .../resources/hello/server/main.lua:16: attempt to concatenate a nil value
```

An error while `main.lua` runs at load is reported the same way against the file path; the
resource still counts as loaded, with whatever handlers were registered before the failing line
(none, for a syntax error). An error inside a handler never unloads the resource and never denies a cancellable request. A
handler that keeps the worker busy for more than 250 ms is reported as
`plugin worker job stalled the thread for 300 ms (resource hello, event 'hello:count') — move heavy work to node.await/node.job`:
every handler, timer callback, coroutine slice and completion callback is timed on its own, and the
line names the resource and what stalled (before 1.2.1 only whole worker jobs were timed - a slow
timer callback or `node.async` slice went unreported - and no resource was named); see
[Concurrency](/plugins/concurrency/).

Client-side errors are in the player's `beamng.log`: a file that does not compile is skipped with
`Resource "hello" (main.lua): compile error: ... -- file skipped`, and an error inside a handler
reads `Error in event handler for "hello:greet" from source "node.res/hello": ...`. The server
does not run client files, but it parses them when it packages them: a file that does not parse
is reported at load as
`hello · client file 'main.lua' has a syntax error: main.lua:1: unexpected symbol near '=' (the file ships anyway; the game's Lua will very likely refuse it too)`,
whatever the obfuscation setting (before 1.2.1 the only sign was Prometheus's warning, and none
with obfuscation off). Where the log is and how to open the in-game diagnostics console is on
[Troubleshooting](/players/troubleshooting/).

## Next

- [Resources](/plugins/resources/) - the manifest in full, load order, client files and
  obfuscation, `node.fs`, `node.storage`, `node.config`.
- [Events](/plugins/events/) - every kind of event and how to deny a request.
- [Concurrency](/plugins/concurrency/) - timers, coroutines and background jobs.
- The examples: `chat` for a complete wire-event protocol, `gatekeeper-example` for cancellable
  requests, `vehicle-cleanup` for `node.config` and a policy timer.
