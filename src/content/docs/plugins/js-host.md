---
title: JavaScript plugins
description: What JavaScript plugins need, a first plugin, how the API looks from JavaScript, refusing requests, npm packages and what only Lua can do.
---

With the `js-host` native module installed, you can write a plugin in JavaScript. It runs on Node.js, with Node's own modules and npm packages. It is a good choice for bookkeeping, reports, links to other services and tasks where npm already has a library. Game rules are simpler to write in Lua.

## What it needs

`js-host` isn't in the server archive: it is built from source, on Windows only, together with Node.js built as a library. Put `js-host.dll` in the `modules/` folder and `libnode.dll` next to the server program, then start the server. The log shows:

```text
js-host: resources with type = "js" will run on Node
```

Without the module the server skips a JavaScript plugin and writes `resource type 'js' has no language host loaded, skipping` to the log.

## First plugin

```toml
name = "hello-js"
type = "js"

[server]
main = "server/main.js"
```

```js
'use strict';

node.log(`${resource.name} loaded`);

function greet(playerId) {
    const name = node.getPlayerName(playerId);
    node.log(`${name} joined`);
}

node.onBuiltin('playerJoined', greet);

function countPlayers() {
    node.log(`${node.getPlayerCount()} online`);
}

const timer = node.setInterval(countPlayers, 60_000);

function stopTimer() {
    node.clearTimer(timer);
}

module.exports.unload = stopTimer;
```

The file runs once, like `main.lua` in Lua. Besides Node's globals it gets `node`, which is the server, and `resource` with the plugin's `name` and its folder `dir`. The function in `module.exports.unload` runs before the plugin reloads or the server stops.

## The API from JavaScript

The calls mirror the server's API one to one, with the names of [`node.raw`](/plugins/api/raw/) in Lua: ids go in, and a call that returns a record returns a parsed object. There are no `Player` or `Vehicle` objects.

| Lua | JavaScript | Handler arguments |
|---|---|---|
| `node.on("playerJoined", fn)` | `node.onBuiltin('playerJoined', fn)` | `(playerId)` |
| `node.on("vehicleEdited", fn)` | `node.onVehicle('vehicleEdited', fn)` | `(playerId, vehicleId, data)` |
| `node.on("vehicleSpawnRequest", fn)` | `node.onRequest('vehicleSpawnRequest', fn)` | `(playerId, vehicleId, data)` |
| `node.on("race:finish", fn)`, a wire event | `node.on('race:finish', fn)` | `(playerId, data)` |
| `node.bus.on(name, fn)` | `node.onResource(name, fn)` | `(source, data)` |
| `node.bus.emit(name, data)` | `node.emitResource(name, string)` | |
| `player.name`, `player:kick(reason)` | `node.getPlayerName(id)`, `node.kickPlayer(id, reason)` | |
| `player:send(name, data)` | `node.emitClient(id, name, string)` | |
| `node.after`, `node.every` | `node.setTimeout(fn, ms)`, `node.setInterval(fn, ms)`, `node.clearTimer(id)` | |

The send calls take strings: encode objects with `JSON.stringify`. A handler receives the string as it was sent and parses it with `JSON.parse`. `node.off(id)` removes a subscription by the id that the `on…` call returned.

## Refusing a request

A request handler refuses by returning a string, which is the reason the player sees, or `false` to refuse without a reason. Anything else lets the request through.

```js
function refuseCityBus(playerId, vehicleId, data) {
    const config = JSON.parse(data);
    if (config.jbm === 'citybus') return 'No buses on this server';
}

node.onRequest('vehicleSpawnRequest', refuseCityBus);
```

`js-host` waits up to two seconds for the answer, and if the answer is late it lets the request through. So these handlers must be fast.

## What only Lua can do

- Take a chat line as a command (`{ handled = true }`). From JavaScript you can only refuse a line.
- Let a player in beyond the limit ([reserved slots](/plugins/events/#reserved-slots)).

Write these parts as a small Lua plugin, and let it talk to the JavaScript one over the [bus](/plugins/bus/).

## npm packages

`require` works as in Node: Node's own modules (`node:fs`, `node:path`, …) and packages from the `node_modules` folder inside the plugin. Run `npm install` in the plugin's folder.

Node has its own networking, not the server's: `fetch` and `node:https` bypass `node.http`, so the host's `[http]` settings (the ban on private addresses, the certificate bundle) don't apply to them. Keep that in mind if the plugin calls addresses that players gave it.

## Errors

An exception in a handler is written to the log as `js: uncaught in handler: …`, and a promise nobody caught as `js: unhandled promise rejection: …` with a stack. The plugin keeps running after either. A plugin that breaks while loading is logged as `js: hello-js failed to load: …` and skipped.

`session-report` from the server archive is a ready-made JavaScript plugin ([The example plugins](/plugins/examples/)).
