---
title: JavaScript plugins
description: What JavaScript plugins need, a first plugin, how the API looks from JavaScript, refusing requests, npm packages and what only Lua can do.
---

With the `js-host` native module installed, a plugin can be written in JavaScript and run on Node.js, with Node's own modules and npm packages. That suits bookkeeping, reports, links to other services and tasks npm already has a library for. Game rules are simpler in Lua.

## What it needs

`js-host` isn't in the server archive: it is built from source, on Windows only, with Node.js built as a library. Put `js-host.dll` in `modules/` and `libnode.dll` next to the server program, then start the server. The log shows:

```text
js-host: resources with type = "js" will run on Node
```

Without the module the server skips a JavaScript plugin and logs `resource type 'js' has no language host loaded, skipping`.

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

The file runs once, like `main.lua`. Besides Node's globals it gets `node`, the server, and `resource` with the plugin's `name` and folder `dir`. `module.exports.unload` runs before the plugin reloads or the server stops.

## The API from JavaScript

The calls mirror the server's API one to one, named as in Lua's [`node.raw`](/plugins/api/raw/): ids go in, and a record comes back as a parsed object. There are no `Player` or `Vehicle` objects.

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

The send calls take strings, so encode objects with `JSON.stringify`; a handler gets the string as sent and parses it with `JSON.parse`. `node.off(id)` removes a subscription by the id its `on…` call returned.

## Refusing a request

A request handler refuses by returning a string, the reason the player sees, or `false` for no reason. Anything else lets the request through.

```js
function refuseCityBus(playerId, vehicleId, data) {
    const config = JSON.parse(data);
    if (config.jbm === 'citybus') return 'No buses on this server';
}

node.onRequest('vehicleSpawnRequest', refuseCityBus);
```

`js-host` waits up to two seconds for the answer and lets the request through if it is late, so keep these handlers fast.

## What only Lua can do

- Take a chat line as a command (`{ handled = true }`). From JavaScript you can only refuse a line.
- Let a player in beyond the limit ([reserved slots](/plugins/events/#reserved-slots)).

Write these parts as a small Lua plugin that talks to the JavaScript one over the [bus](/plugins/bus/).

## npm packages

`require` works as in Node: Node's own modules (`node:fs`, `node:path`, …) and packages from `node_modules` inside the plugin. Run `npm install` in the plugin's folder.

Node's networking is its own: `fetch` and `node:https` bypass `node.http`, so the host's `[http]` settings (no private addresses, the certificate bundle) don't apply to them. Mind this if the plugin calls addresses that players gave it.

## Errors

An exception in a handler is logged as `js: uncaught in handler: …`, an uncaught promise rejection as `js: unhandled promise rejection: …` with a stack, and the plugin keeps running. A plugin that breaks while loading is logged as `js: hello-js failed to load: …` and skipped.

`session-report` in the server archive is a ready-made JavaScript plugin ([The example plugins](/plugins/examples/)).
