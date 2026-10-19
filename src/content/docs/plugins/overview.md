---
title: Overview
description: What NodeMP plugins can do, the kinds of plugin, how the server and client halves work, and what to read first.
---

A plugin changes how the server behaves: chat commands, rules, game modes, admin tools, a link to a website or Discord. The server passes data between players and keeps order; everything that makes one server differ from another is done by plugins.

## What you can do

- React to events: a player joined, spawned a car, got into it, wrote in chat.
- Refuse actions: keep a player out, forbid cars, edits and paint jobs, filter chat.
- Manage players and cars: kick and ban, seat a player in a car, teleport, freeze, put tags and locks on cars.
- Keep data across restarts, work with a database and call web services over HTTP.
- Send players Lua code of your own that runs in the game, and exchange messages with it.

## Kinds of plugin

| Kind | What it is | When to choose it |
|---|---|---|
| Lua plugin | A folder in `resources/` with Lua 5.4 code. Lua is built into the server. | Almost always: rules, commands, modes, anything about the game. |
| JavaScript plugin | The same folder with JavaScript code. Needs the `js-host` module ([JavaScript plugins](/plugins/js-host/)). | When you need an npm package or prefer JavaScript. |
| Native module | A C or C++ library in `modules/` ([Native modules](/plugins/native-modules/)). | When code runs for every packet or frame and Lua can't keep up. |

## The server half and the client half

A plugin can have two halves:

- The server half (`server/main.lua`) runs on the server. It has the `node` API: players, cars, events, timers, storage, HTTP.
- The client half (files in `client/`) runs in the game of every player. It has everything a game mod has, plus NodeMP functions for talking to the server ([Client scripts](/plugins/client-scripting/)).

The halves talk through wire events: the client sends `node.emitServer("name", data)`, the server receives it in `node.on("name", handler)` and answers with `player:send` or `node.broadcast`.

The handlers of all plugins run one after another on a single thread, so a slow handler holds up the rest ([Timers and coroutines](/plugins/concurrency/)). Plugins talk to each other over the [bus](/plugins/bus/).

## Where to start

1. [Your first plugin](/plugins/getting-started/): from an empty folder to a chat command and a client half.
2. [How a plugin is built](/plugins/resources/): files, `resource.toml`, reloading, load errors.
3. The topics, in order: [events](/plugins/events/), [players and vehicles](/plugins/players-and-vehicles/), [chat](/plugins/chat/), [timers](/plugins/concurrency/), [storage](/plugins/storage/), [the database](/plugins/database/), [HTTP](/plugins/http/), [the bus](/plugins/bus/), [client scripts](/plugins/client-scripting/), [API conventions](/plugins/conventions/).
4. [The example plugins](/plugins/examples/): ready-made plugins from the server archive.
5. [Moving from other platforms](/plugins/migrating/): if you have written plugins for another multiplayer mod.

Keep the [API reference](/plugins/api/lua/) at hand: it lists every function and every [event](/plugins/api/events/). It is generated from the API description.
