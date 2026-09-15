---
title: Plugin development overview
description: What a NodeMP plugin is - resources in Lua or JavaScript, native modules in C - the three faces of one API, what runs where, and the lifecycle.
---

A NodeMP server does the plumbing: it accepts players, owns the vehicle registry, relays state and
streams client scripts. Everything with a rule in it - chat, permissions, game modes, economy,
parallel worlds - is a **plugin**. A plugin is either a **resource** (a folder of Lua or JavaScript
under `resources/`) or a **native module** (a shared library under `modules/`). This page is the
map of the section; the architecture around the server is in the
[framework overview](/framework/overview/).

## Three faces of one API

The server has one capability API, described once in `sdk/api.toml` and generated into three
shapes. You pick the shape by picking the language.

| Face | You write | Reference |
|---|---|---|
| `node` | A resource in Lua. Namespaces by noun (`node.players`, `node.vehicles`, `node.storage`), `Player` and `Vehicle` objects with methods, handlers that receive objects, JSON decoded for you. | [Lua API reference](/plugins/api/lua/) |
| `node.raw` | The same calls one-to-one with the C ABI: ids in, tables out. Always present under `node`; reach for it when you need exactly the C behaviour. | [Raw Lua reference](/plugins/api/raw/) |
| `NodeApi` | A native module in C or C++ against `node.h`. Every Lua capability plus what only native code can do. | [C ABI reference](/plugins/api/c/) |

JavaScript is a second spelling of the first face: with the `js-host` module installed, a
resource with `type = "js"` gets the same names and capabilities in JavaScript. The
`session-report` example is written that way.

## Resources and native modules

A **resource** is a folder in `resources/` (the server's working directory). It may carry a
`resource.toml`, a server half (`server/main.lua`) and a client half (`client/`). The server half
runs on the server; the client half is streamed to every player and runs inside the game. Chat,
vehicle policies, cleanup rules and admin commands are resources.

A **native module** is a `.dll` or `.so` in `modules/` next to the executable. It exports three
symbols (`node_plugin_abi`, `node_plugin_init`, `node_plugin_shutdown`) and receives the `NodeApi`
table. Write one when a Lua resource cannot do the job: to register a language host for a new
resource type (`js-host`), or to run a relay filter inline on the network threads (`dimensions`).
Modules load before resources, so a language host is in place before the first resource is
scanned.

Plugins written for other multiplayer servers do not run here as they are; see
[Migrating plugins](/plugins/migrating/) for how to port one.

## What runs where

- **The server half** runs on the plugin worker thread. Every handler of every resource, every
  timer and every callback runs there, one at a time, so resources never race each other - and a
  handler that blocks stalls them all. [Concurrency](/plugins/concurrency/) covers the model.
- **The client half** runs in BeamNG on each player's machine, with full game access. It talks to
  the server half with wire events: `node.emitServer(name, data)` on the client,
  `node.on(name, fn)` on the server; `player:send` and `node.broadcast` in the other direction. A
  client-emitted event reaches server resources only; anything that must reach other players goes
  through a resource that forwards it. [Client scripting](/plugins/client-scripting/) covers the
  client `node` table.
- **Native modules** run in the server process. `NodeApi` calls are thread-safe from any thread;
  callbacks arrive on the same worker thread as Lua handlers, with the log sink and the relay
  filter as the inline exceptions. [Native modules](/plugins/native-modules/) has the details.

## Lifecycle

1. **Start.** The server loads `modules/`, then scans `resources/`: for each folder it reads
   `resource.toml`, packages the client files and runs the server entry point once. Top-level code
   is where you subscribe to events and set up state. The console confirms each resource with
   `demo-numbers v1.0 loaded — lua · server 1 file · 1 client file`.
2. **Run.** The worker thread starts; events, timers and coroutines run on it. A joining player
   receives every resource's client files after the content sync, then `playerJoined` fires.
3. **Reload.** `node.resources.reload(name)` drops a resource's handlers, timers and coroutines and
   runs its server half again without a restart. `node.storage` survives; client files do not
   change until a restart.
4. **Stop.** `serverShutdown` fires once, pending asynchronous file writes are flushed, each storage
   store is folded into one JSON file, and the client mod unloads the streamed scripts when the
   player leaves.

## Where to go next

- [Getting started](/plugins/getting-started/) - your first resource, with both halves, in ten
  minutes.
- [Resources](/plugins/resources/) - folder layout, `resource.toml`, load order, client files and
  obfuscation, reload, `node.fs`, `node.storage`, `node.config`.
- [Events](/plugins/events/) - the four kinds of event, objects in handlers, denying a request,
  wire events, the bus and the module channel.
- [Concurrency](/plugins/concurrency/) - the worker thread, timers, coroutines, background jobs,
  asynchronous HTTP and file writes.
- [Client scripting](/plugins/client-scripting/), [Native modules](/plugins/native-modules/),
  [Recipes](/plugins/recipes/) and [Conventions](/plugins/conventions/) - the rest of the guides.
- [API reference](/plugins/api/) - every `node.*` function, `node.raw`, the C ABI and every event,
  generated from `sdk/api.toml`.
- [Wire protocol](/plugins/protocol/) - the frames underneath, for module authors.

Every example named in these pages - `demo-numbers`, `chat`, `vehicle-cleanup`,
`gatekeeper-example`, `devapi-example`, `nodemp-relay` - is a folder under `examples/` in the
NodeMP sources; copy one into `resources/` to run it.
