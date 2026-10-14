---
title: Your first resource
description: A resource from an empty folder, step by step - a greeting, a chat command, settings in resource.toml, a client half - then reloading it and reading its errors.
---

This page builds a resource called `greeter`, one step at a time: it greets players, answers the
`/online` command, takes its greeting from the settings, and shows a message in the player's game.
Nothing needs installing: Lua is built into the server.

You need a server you can start ([Run a server](/hosting/quick-start/)) and, for the client half, a
launcher to join it with.

## 1. The folder

Resources live in `resources/`, next to `server.toml`. Make this tree:

```
resources/
└── greeter/
    ├── resource.toml
    └── server/
        └── main.lua
```

The folder name is the resource's name unless `resource.toml` says otherwise. A `client/` folder
comes in step 7.

## 2. resource.toml

```toml
name = "greeter"
version = "1.0"
```

That's enough for now. Every key the file takes is on
[How a resource is built](/plugins/resources/#resourcetoml).

## 3. The server half

`server/main.lua` runs once, when the server loads the resource. The code at the top level
subscribes to events; the server calls the handlers later, as things happen.

<!-- doctest: server+client -->
```lua
node.log("greeter loaded")

node.on("playerJoined", function(player)
    node.log("%s joined", player.name)
    player:tell("Welcome, %s!", player.name)
end)

node.on("playerLeft", function(player, reason)
    node.log("%s left: %s", player.name, reason)
end)

-- expect: greeter loaded
-- expect: Alice joined
-- expect-client: Alice chat:msg .*Welcome, Alice!
-- expect: Alice left: \S
```

- `node.log` writes to the server's console under the resource's name. Extra arguments work like
  `string.format`.
- `node.on(name, handler)` subscribes to an event. `playerJoined` passes a `Player` object: `name`
  and `id` are fields, `tell` and `kick` are methods.
- `player:tell` puts a system line into that player's chat. Chat is part of the server, so this works
  with no other resource installed.
- `playerLeft` also gets the reason the session ended.

## 4. Start it

Start the server. The console shows your log line and then the server's line about the resource:

```
greeter · greeter loaded
greeter v1.0 loaded — lua · server 1 file · 0 client files
```

Join from the launcher, and the console says `greeter · Alice joined` while your chat shows the
greeting.

## 5. A chat command

Chat commands are ordinary chat lines that start with `/`. Every line passes through
`chatMessageRequest` before the server sends it on. A handler that recognises its command answers
`{ handled = true }`: the line isn't shown to anyone, and the resource replies itself.

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/online"}]]} -->
```lua
node.on("chatMessageRequest", function(player, msg)
    if msg.text ~= "/online" then return end
    local names = {}
    for _, p in ipairs(node.players.all()) do
        names[#names + 1] = p.name
    end
    player:tell("Online (%d): %s", #names, table.concat(names, ", "))
    return { handled = true }
end)

-- expect-client: Alice chat:msg .*Online \(1\): Alice
```

A line that isn't `/online` gets no answer from the handler (`return` with nothing), so it goes to
the chat as usual. More about commands is on [Chat and commands](/plugins/chat/).

## 6. Settings

Settings the host may change go into the `[config]` table of `resource.toml`:

```toml
[config]
greeting = "Hello from the docs"
```

The resource reads them as `node.config`:

<!-- doctest: server+client {"config": {"greeting": "Hello from the docs"}} -->
```lua
local greeting = node.config.greeting or "Welcome"

node.on("playerJoined", function(player)
    player:tell("%s, %s!", greeting, player.name)
end)

-- expect-client: Alice chat:msg .*Hello from the docs, Alice!
```

`node.config` is read once, when the resource loads. After changing the file, reload the resource
([below](#8-reload-it)).

## 7. The client half

Everything in `client/` goes to every player on join and runs inside the game. Let the server send
the player an event on join:

<!-- doctest: server+client -->
```lua
node.on("playerJoined", function(player)
    player:send("greeter:hello", { text = "Welcome, " .. player.name })
end)

-- expect-client: Alice greeter:hello .*Welcome, Alice
```

`player:send(name, data)` sends a **wire event** to that player; a table is turned into JSON. Create
`client/main.lua`: it catches the event, shows the text on screen and reports back.

<!-- doctest: client -->
```lua
node.on("greeter:hello", function(data)
    local hello = jsonDecode(data)
    ui_message(hello.text, 8, "greeter")
    node.emitServer("greeter:seen", hello.text)
end)
```

On the client, a handler gets the data as the string the server sent, so it's decoded with the
game's `jsonDecode`. `ui_message` is the game's own on-screen message. `node.emitServer` sends a
wire event back, again as a string. The server half picks it up:

<!-- doctest: server+client {"emit": [["greeter:seen", "Welcome, Alice"]]} -->
```lua
node.on("greeter:seen", function(player, text)
    node.log("%s saw: %s", player.name, text)
end)

-- expect: Alice saw: Welcome, Alice
```

Any event name that isn't one of the server's own is a wire event. Name them `<resource>:<what>`,
in lower case, so two resources don't collide. [Client scripts](/plugins/client-scripting/) has
the rest of the client side.

## 8. Reload it

You don't need to restart the server after changing the server half. Type in the server console:

```
reload greeter
```

The resource stops (its handlers and timers are dropped) and loads again from its folder. Client
files are packed when the server starts, so changes to `client/` reach players after a restart.

## 9. When something breaks

An error in a handler doesn't stop the server or the resource: the server logs it with the file, the
line and a traceback, and goes on.

```
greeter · error in event 'playerJoined': …/server/main.lua:4: attempt to …
```

The other handlers keep working, and the same handler runs again on the next event. A syntax error
in `main.lua` shows up the same way when the resource loads.

## Next

- [How a resource is built](/plugins/resources/): every file and key, several Lua files, reloading.
- [Events](/plugins/events/): every kind of event, and the order a player joins in.
- [The example plugins](/plugins/examples/): bigger resources to learn from.
