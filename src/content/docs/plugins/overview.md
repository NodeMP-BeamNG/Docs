---
title: Overview
description: What NodeMP plugins can do, how a resource differs from a native module, how the server and client halves work, and what order to read this section in.
---

A plugin changes how the server behaves: chat commands, rules, game modes, admin tools, a link to a
website or Discord. The server itself only passes data between players and keeps order; everything
that makes a server special is written as plugins.

## What you can do

- React to events: a player joined, spawned a car, got into it, wrote in the chat.
- Refuse actions: keep a player out, forbid cars, edits and paint jobs, filter the chat. The player
  sees your reason.
- Manage players and cars: kick and ban, seat players, teleport, freeze, put tags and locks on cars.
- Keep data across restarts, talk to a database and to HTTP services.
- Send players Lua code of your own that runs in the game, and exchange messages with it.

## Three kinds of plugins

| Kind | What it is | When to choose it |
|---|---|---|
| **Lua resource** | A folder in `resources/` with Lua 5.4 code. Lua is built into the server. | Almost always: rules, commands, modes, anything about the game. |
| **JavaScript resource** | The same kind of folder, with JavaScript code. Needs the `js-host` module. | When you need an npm package, or simply prefer JavaScript. |
| **Native module** | A C or C++ library in `modules/`. | When code runs for every packet or frame and Lua can't keep up. |

The rest of this section is mostly about Lua resources. JavaScript and native modules have pages of
their own.

## The server half and the client half

A resource can have two halves.

- **The server half** (`server/main.lua`) runs on the server. It has the `node` API: players, cars,
  events, timers, storage, HTTP.
- **The client half** (files in `client/`) goes to every player on join and runs inside
  BeamNG.drive. It has everything a game mod has, plus NodeMP's functions for talking to the server.

The halves talk through **wire events**: the client sends `node.emitServer("name", data)`, the server
catches it with `node.on("name", ...)` and answers with `player:send` or `node.broadcast`. A
client's message goes no further than the server by itself: if other players should see it, the
resource passes it on.

## How code runs

Every handler of every resource runs on one worker thread of the server, one at a time. Two handlers
never run at once, so you need no locks. But a long handler delays everyone else: the server warns in
the log when a handler holds the thread longer than 250 ms. Long work goes into coroutines and
background jobs, see [Timers and coroutines](/plugins/concurrency/).

Each resource has its own Lua state. Resources don't see each other's variables; they talk through
the [bus](/plugins/bus/).

## Where to start

1. [Your first resource](/plugins/getting-started/): from an empty folder to a working resource with
   a chat command and a client half.
2. [How a resource is built](/plugins/resources/): files, `resource.toml`, reloading, errors.
3. The topics, in order: [events](/plugins/events/), [players and vehicles](/plugins/players-and-vehicles/),
   [chat](/plugins/chat/), [timers](/plugins/concurrency/), [storage](/plugins/storage/),
   [the database](/plugins/database/), [HTTP](/plugins/http/), [the bus](/plugins/bus/),
   [client scripts](/plugins/client-scripting/).
4. [The example plugins](/plugins/examples/): ready-made resources from the server archive.
5. [Moving from other platforms](/plugins/migrating/): if you wrote plugins for another multiplayer
   mod before.

Keep the [API reference](/plugins/api/lua/) at hand: it lists every function and every
[event](/plugins/api/events/). It's generated from the API's description.
