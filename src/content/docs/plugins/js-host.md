---
title: JavaScript resources
description: Resources in JavaScript with the js-host module - getting it, a first resource, how the API looks from JavaScript, npm packages, and what differs from Lua.
---

Lua is built into the server, and it's the right choice for most resources. When a job is mostly
bookkeeping, text or talking to other services, and npm already has the library for it, a resource
can be written in JavaScript instead. The `js-host` native module runs such resources on an embedded
Node.js, with Node's own modules and your npm packages available.

## Getting js-host

`js-host` isn't in the release archive. It's built from source together with Node.js built as a
library, and today it builds on Windows only. Put `js-host.dll` into `modules/` next to the server,
with Node's `libnode.dll` beside the executable, and start the server. It confirms:

```
js-host: resources with type = "js" will run on Node
```

Without it, a JavaScript resource is skipped, and the log says why:

```
hello-js · resource type 'js' has no language host loaded, skipping (a native module in modules/ must register one)
```

## A first resource

```
resources/
└── hello-js/
    ├── resource.toml
    └── server/
        └── main.js
```

```toml
name = "hello-js"
type = "js"

[server]
main = "server/main.js"
```

```js
'use strict';

node.log(`${resource.name} loaded, ${node.getPlayerCount()} online`);

node.onBuiltin('playerJoined', (playerId) => {
    const name = node.getPlayerName(playerId);
    node.emitResource('chat:say', JSON.stringify({ pid: playerId, text: `Welcome, ${name}!` }));
});

node.onRequest('vehicleSpawnRequest', (playerId, vehicleId, data) => {
    const config = JSON.parse(data);
    if (config.jbm === 'citybus') return 'No buses on this server';
});

const timer = node.setInterval(() => {
    node.log(`${node.getPlayerCount()} player(s) online`);
}, 60_000);

module.exports.unload = () => node.clearTimer(timer);
```

The file runs once, like a Lua `main.lua`. Besides Node's usual globals it gets two of its own:
`node`, the server, and `resource`, with the resource's `name` and folder `dir`. A function on
`module.exports.unload` runs before the resource is reloaded or the server stops.

## How the API looks from JavaScript

The calls are the server's API one to one, with the same names as
[`node.raw`](/plugins/api/raw/) in Lua: ids go in, and a call that returns a record gives you a
parsed object. There are no `Player` or `Vehicle` objects; you work with ids.

| Lua | JavaScript |
|---|---|
| `node.on("playerJoined", fn)` | `node.onBuiltin('playerJoined', (playerId) => ...)` |
| `node.on("vehicleEdited", fn)` | `node.onVehicle('vehicleEdited', (playerId, vehicleId, data) => ...)` |
| `node.on("vehicleSpawnRequest", fn)` | `node.onRequest('vehicleSpawnRequest', (playerId, vehicleId, data) => ...)` |
| `node.on("race:finish", fn)` (a wire event) | `node.on('race:finish', (playerId, data) => ...)` |
| `node.bus.on(name, fn)`, `node.bus.emit(name, data)` | `node.onResource(name, (source, data) => ...)`, `node.emitResource(name, string)` |
| `player.name`, `player:kick(reason)` | `node.getPlayerName(id)`, `node.kickPlayer(id, reason)` |
| `player:send(name, data)` | `node.emitClient(id, name, string)` |
| `node.after(ms, fn)`, `node.every(ms, fn)` | `node.setTimeout(fn, ms)`, `node.setInterval(fn, ms)`, `node.clearTimer(id)` |
| `node.log(text)`, `node.log.warn(text)` | `node.log(text)`, `node.log(text, 'warn')` |
| `node.storage.get(key)` | `node.storageGet(key)` |

Data you send is a string: encode objects with `JSON.stringify`. Data you receive in a handler is the
string as it was sent: decode it with `JSON.parse`. `node.off(id)` takes back what an `on…` call
returned.

## Saying no

A request handler refuses by returning a string, which is the reason the player sees, or `false` to
refuse without one. Anything else lets the request through. The server waits up to two seconds for
the answer and lets the request through when it comes later, so keep these handlers quick.

Two things only Lua can do: take a chat line as a command (`{ handled = true }`; from JavaScript you
can only refuse the line, and the player is told so), and let a player in past the player limit
([reserved slots](/plugins/players-and-vehicles/#reserved-slots)). Write those parts as a small Lua
resource; the two can talk over the [bus](/plugins/bus/).

## npm packages and Node's modules

`require` works as in Node: Node's own modules (`node:fs`, `node:path`, ...) and packages in a
`node_modules` folder inside the resource. Run `npm install` in the resource folder and require the
package by name.

Node's networking is Node's, not the server's: `fetch` and `node:https` don't go through
`node.http`, so the host's `[Http]` settings (the private-address block, the certificate bundle)
don't apply to them. Keep that in mind when a resource calls URLs it was given by players.

## Errors

An exception in a handler, or a promise nobody caught, is logged with its stack and doesn't stop the
resource or the server. A resource that fails while loading is logged as
`js: hello-js failed to load: …` and skipped.

## Next

- [The example plugins](/plugins/examples/#session-report): `session-report`, a complete resource in
  JavaScript.
- [Raw Lua reference](/plugins/api/raw/): the names the JavaScript calls share.
