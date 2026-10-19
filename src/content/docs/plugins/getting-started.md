---
title: Your first plugin
description: Build a plugin from an empty folder, step by step. It greets players, answers a chat command, reads its settings, runs a client half and reloads.
---

These steps build a plugin called `greeter`. It greets players, answers the `/online` command, takes its greeting from the settings and shows a message in the player's game. There is nothing to install: Lua is built into the server.

You need a server ([Run a server](/hosting/quick-start/)) and the launcher to join it.

## 1. The folder

Plugins live in `resources/`, next to `server.toml`. Make this tree:

```text
resources/
└── greeter/
    ├── resource.toml
    └── server/
        └── main.lua
```

The folder name becomes the plugin's name unless `resource.toml` says otherwise. The `client/` folder comes in step 7.

## 2. resource.toml

```toml
name = "greeter"
version = "1.0"
```

That is enough for now. Every key of the file is on [How a plugin is built](/plugins/resources/#resourcetoml).

## 3. The server half

`server/main.lua` runs once, when the server loads the plugin. Top-level code subscribes to events; the server calls the handlers later, when something happens.

<!-- doctest: server+client -->
```lua
node.log("greeter loaded")

local function greet(player)
    node.log("%s joined", player.name)
    player:tell("Welcome, %s!", player.name)
end

node.on("playerJoined", greet)

local function sayGoodbye(player, reason)
    node.log("%s left: %s", player.name, reason)
end

node.on("playerLeft", sayGoodbye)

-- expect: greeter loaded
-- expect: Alice joined
-- expect-client: Alice chat:msg .*Welcome, Alice!
-- expect: Alice left: \S
```

- `node.log` writes to the server console under the plugin's name. Extra arguments work as in `string.format`.
- `node.on(name, handler)` subscribes a function to an event. `playerJoined` passes a `Player` object: `name` and `id` are fields, `tell` and `kick` are methods.
- `player:tell` writes a system line into that player's chat. Chat is built into the server, so this works without any other plugin.
- `playerLeft` also gets the reason the session ended.

## 4. Start the server

Start the server. The console shows your line, then the server's line about the plugin:

```text
greeter · greeter loaded
greeter v1.0 loaded — lua · server 1 file · 0 client files
```

Join the server. The console shows `greeter · <your name> joined` and the chat shows the greeting.

## 5. A chat command

Commands are ordinary chat lines that start with `/`. Every line passes through `chatMessageRequest` before the server sends it on. A handler that knows its command returns `{ handled = true }`: nobody sees the line, and the plugin sends its own reply.

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/online"}]]} -->
```lua
local function answerOnline(player, msg)
    if msg.text ~= "/online" then return end
    local names = {}
    for _, p in ipairs(node.players.all()) do
        names[#names + 1] = p.name
    end
    player:tell("Online (%d): %s", #names, table.concat(names, ", "))
    return { handled = true }
end

node.on("chatMessageRequest", answerOnline)

-- expect-client: Alice chat:msg .*Online \(1\): Alice
```

For any other line the handler returns nothing (a bare `return`), so the line goes to chat as usual. More on commands: [Chat and commands](/plugins/chat/).

## 6. Settings

Settings the host can change go in the `[config]` table of `resource.toml`:

```toml
[config]
greeting = "Hello from the docs"
```

The plugin reads them as `node.config`:

<!-- doctest: server+client {"config": {"greeting": "Hello from the docs"}} -->
```lua
local greeting = node.config.greeting or "Welcome"

local function greetFromConfig(player)
    player:tell("%s, %s!", greeting, player.name)
end

node.on("playerJoined", greetFromConfig)

-- expect-client: Alice chat:msg .*Hello from the docs, Alice!
```

`node.config` is read once, when the plugin loads. After you edit the file, reload the plugin ([below](#8-reload-the-plugin)).

## 7. The client half

Files in `client/` run in the game of every player ([Client scripts](/plugins/client-scripting/)). Let the server send the player an event when they join:

<!-- doctest: server+client -->
```lua
local function sendHello(player)
    player:send("greeter:hello", { text = "Welcome, " .. player.name })
end

node.on("playerJoined", sendHello)

-- expect-client: Alice greeter:hello .*Welcome, Alice
```

`player:send(name, data)` sends a wire event to that player, and a table becomes JSON. Create `client/main.lua`: it catches the event, shows the text on screen and answers the server.

<!-- doctest: client -->
```lua
local function showHello(data)
    local hello = jsonDecode(data)
    ui_message(hello.text, 8, "greeter")
    node.emitServer("greeter:seen", hello.text)
end

node.on("greeter:hello", showHello)
```

On the client a handler gets the data as a string, exactly as the server sent it, so the game function `jsonDecode` parses it. `ui_message` is a game function that shows a message on screen. `node.emitServer` sends a wire event back, also as a string. The server half receives it:

<!-- doctest: server+client {"emit": [["greeter:seen", "Welcome, Alice"]]} -->
```lua
local function logSeen(player, text)
    node.log("%s saw: %s", player.name, text)
end

node.on("greeter:seen", logSeen)

-- expect: Alice saw: Welcome, Alice
```

Name wire events `<plugin>:<what>`, in lower case ([Events](/plugins/events/#kinds-of-events)).

## 8. Reload the plugin

After changing the server half you don't need to restart the server. Type in the server console:

```text
reload greeter
```

The plugin loads again from its folder. Changes in `client/` reach players only after a server restart ([How a plugin is built](/plugins/resources/#reloading)).

## 9. When something breaks

An error in a handler stops neither the server nor the plugin. The server logs it with the file, line and traceback, and calls the handler again on the next event.

```text
greeter · error in builtin 'playerJoined': …/server/main.lua:4: attempt to …
```

How this line looks for timers, coroutines and load errors: [API conventions](/plugins/conventions/#errors-in-handlers).
