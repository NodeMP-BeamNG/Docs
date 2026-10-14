---
title: Plugin development
description: What a NodeMP plugin is - resources in Lua, native modules in C - what runs where, what you can build, and a map of this section.
---

The NodeMP server takes care of the multiplayer basics: it lets players in, keeps track of every
car, passes their state around, runs the chat and sends players the server's mods. Everything with
a rule in it, such as commands, permissions, game modes, an economy or a race, is a **plugin**.

A plugin is one of two things:

- a **resource**: a folder of Lua in `resources/`. This is what almost everyone writes;
- a **native module**: a library written in C or C++ in `modules/`, for work on a hot path or to
  teach the server another language.

## What you can build

A few examples of what resources do, each with a page that shows how:

- greet players, give roles, keep scores and playtime → [Players and vehicles](/plugins/players-and-vehicles/), [Storage and files](/plugins/storage/);
- chat commands, a mute, a word filter, a Discord bridge → [Chat](/plugins/chat/), [HTTP](/plugins/http/);
- refuse a car, an edit or a join, with a reason the player sees → [Events](/plugins/events/);
- races and checkpoints, a speed radar, a minimap → [Players and vehicles → Reading the world fast](/plugins/players-and-vehicles/#reading-the-world-fast);
- a UI or an effect inside the players' game → [Client scripts](/plugins/client-scripting/);
- data in PostgreSQL or SQLite → [Database](/plugins/database/).

[Recipes](/plugins/recipes/) has complete, short resources for the usual jobs, and
[The example plugins](/plugins/examples/) walks through the ones that come with the server.

## Three faces of one API

The server has one API, described once and generated in three forms. You pick the form by picking
the language.

| Surface | What you write | Reference |
|---|---|---|
| `node` | Namespaces in the Lua context (`node.players`, `node.vehicles`, `node.storage`), `Player` and `Vehicle` objects with methods; handlers receive objects, and JSON is decoded for you. | [Lua API reference](/plugins/api/lua/) |
| `node.raw` | The same calls one to one with the C ABI: ids in, tables out. Always there inside `node`; reach for it when you want C's behaviour without the extra handling. | [Raw Lua reference](/plugins/api/raw/) |
| `NodeApi` | A native module in C or C++. Everything Lua can do, plus what only native code can. | [C ABI reference](/plugins/api/c/) |

## What runs where

| Code | Runs | Good for |
|---|---|---|
| A resource's `server/main.lua` | On the server, in the resource's own Lua 5.4 state. All resources share one worker thread and run one handler at a time. | Game logic, rules, chat, data. |
| A resource's `client/` files | In every player's game (BeamNG's LuaJIT), sent when they join. | UI, effects, reading the player's car. |
| A native module | On the server, in the server process. Calls are thread-safe; its callbacks run on the same worker as Lua. | The relay filter, heavy maths, other languages. |

Because every handler runs on one thread, a resource never has to lock anything, and one slow
handler holds up all of them. [Timers and coroutines](/plugins/concurrency/) shows how to wait
without blocking.

## The life of a resource

1. **Start.** The server loads native modules, then every folder in `resources/`. A resource's
   `server/main.lua` runs once, top to bottom; that's where it subscribes to events and starts
   timers.
2. **Running.** The server calls your handlers as things happen: a player joins, a car spawns, a
   chat line arrives, a timer fires.
3. **Reload.** `reload <name>` in the console, or `node.resources.reload(name)`, drops the
   resource's handlers, timers and Lua state and runs `main.lua` again. `resourceUnload("reload")`
   runs first, so you can save what must survive.
4. **Stop.** At shutdown, `serverShutdown` and then `resourceUnload("shutdown")` run, and nothing
   after them.

## Where to start

1. [Your first resource](/plugins/getting-started/): a folder, a server half, a client half,
   running in ten minutes.
2. [Resources](/plugins/resources/): the folder, `resource.toml`, settings, reloading.
3. [Events](/plugins/events/): the join order and every kind of event.
4. Then whatever your plugin needs, from the list above.

Coming from BeamMP? [Migrating BeamMP plugins](/plugins/migrating/) maps its API to this one.

## What the API promises

- **The API version** is the C ABI version, 2.5 on server 1.8.0. Within a major version nothing
  moves: new calls are added at the end, so a module written for 2.0 runs on 2.5. The Lua side
  keeps the same rule, with one exception so far: `node.commands` was removed in server 1.8.0, when
  chat commands became the resources' own ([Chat → Commands](/plugins/chat/#commands)).
- **Events renamed in the past** answer only to their new names; subscribing to an old one is
  refused with an error that names the new spelling.
- Everything on these pages describes server 1.8.0. The [API reference](/plugins/api/lua/) is
  generated from the same description the server is built from.
