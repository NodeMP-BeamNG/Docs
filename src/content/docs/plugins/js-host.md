---
title: JavaScript resources
description: Resources in JavaScript with the js-host module - what it needs, a first resource, how the API looks from JavaScript, refusing requests, npm packages, and what only Lua can do.
---

With the `js-host` native module installed, a resource can be written in JavaScript. It runs on
Node.js, with Node's own modules and npm packages. Choose it for bookkeeping, reports, talking to
other services: work where npm already has the library. Game rules are simpler in Lua.

## What it needs

`js-host` isn't in the server archive. It's built from source together with Node.js built as a
library, and it builds on Windows. Put `js-host.dll` into `modules/` next to the server and Node's
`libnode.dll` next to the executable, then start the server. The log confirms:

```
js-host: resources with type = "js" will run on Node
```

Without it a JavaScript resource is skipped, and the log says why:
`resource type 'js' has no language host loaded, skipping`.

## A first resource

```toml
name = "hello-js"
type = "js"

[server]
main = "server/main.js"
```

```js
'use strict';

node.log(`${resource.name} loaded`);

node.onBuiltin('playerJoined', (playerId) => {
    const name = node.getPlayerName(playerId);
    node.log(`${name} joined`);
});

const timer = node.setInterval(() => {
    node.log(`${node.getPlayerCount()} online`);
}, 60_000);

module.exports.unload = () => node.clearTimer(timer);
```

The file runs once, like a Lua `main.lua`. Besides Node's globals it gets `node`, the server, and
`resource`, with the resource's `name` and folder `dir`. A function in `module.exports.unload` runs
before the resource is reloaded or the server stops.

## The API from JavaScript

The calls are the server's API one to one, with the names of [`node.raw`](/plugins/api/raw/) in
Lua: ids go in, and a call that returns a record gives a parsed object. There are no `Player` or
`Vehicle` objects.

| Lua | JavaScript |
|---|---|
| `node.on("playerJoined", fn)` | `node.onBuiltin('playerJoined', (playerId) => …)` |
| `node.on("vehicleEdited", fn)` | `node.onVehicle('vehicleEdited', (playerId, vehicleId, data) => …)` |
| `node.on("vehicleSpawnRequest", fn)` | `node.onRequest('vehicleSpawnRequest', (playerId, vehicleId, data) => …)` |
| `node.on("race:finish", fn)`, a wire event | `node.on('race:finish', (playerId, data) => …)` |
| `node.bus.on(name, fn)` | `node.onResource(name, (source, data) => …)` |
| `node.bus.emit(name, data)` | `node.emitResource(name, string)` |
| `player.name`, `player:kick(reason)` | `node.getPlayerName(id)`, `node.kickPlayer(id, reason)` |
| `player:send(name, data)` | `node.emitClient(id, name, string)` |
| `node.after`, `node.every` | `node.setTimeout(fn, ms)`, `node.setInterval(fn, ms)`, `node.clearTimer(id)` |

Data you send is a string: encode objects with `JSON.stringify`. Data a handler receives is the
string as it was sent: decode it with `JSON.parse`. `node.off(id)` removes what an `on…` call
returned.

## Refusing a request

A request handler refuses by returning a string, which is the reason the player sees, or `false` to
refuse without one. Anything else lets the request through.

```js
node.onRequest('vehicleSpawnRequest', (playerId, vehicleId, data) => {
    const config = JSON.parse(data);
    if (config.jbm === 'citybus') return 'No buses on this server';
});
```

The server waits up to two seconds for the answer and lets the request through when it comes later,
so keep these handlers quick.

## What only Lua can do

- Take a chat line as a command (`{ handled = true }`). From JavaScript you can only refuse the line.
- Let a player in past the player limit ([reserved slots](/plugins/events/#reserved-slots)).

Write those parts as a small Lua resource; the two talk over the [bus](/plugins/bus/).

## npm packages

`require` works as in Node: Node's own modules (`node:fs`, `node:path`, …) and packages from a
`node_modules` folder inside the resource. Run `npm install` in the resource folder.

Node's networking is Node's, not the server's: `fetch` and `node:https` don't go through
`node.http`, so the host's `[http]` settings (the block on private addresses, the certificate
bundle) don't apply to them. Keep that in mind when a resource calls addresses players gave it.

## Errors

An exception in a handler, or a promise nobody caught, is logged with its stack, and the resource
keeps running. A resource that fails while loading is logged as `js: hello-js failed to load: …` and
skipped.

`session-report` in the server archive is a complete resource in JavaScript
([The example plugins](/plugins/examples/)).
