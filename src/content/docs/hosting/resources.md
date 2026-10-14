---
title: Resources
description: How to install a resource plugin, which examples come with the archive, and how to configure, reload and obfuscate a resource; native modules.
---

A resource is a plugin: a folder of Lua code that runs on the server and, when needed, scripts the
server sends to players. Chat commands, rules, game modes and admin tools are all resources. Writing
them is the [Plugin development](/plugins/overview/) section.

## Install a resource

1. Copy the resource's whole folder into `resources/` next to `server.toml`. If there is no
   `resources/` folder yet, create it. In Docker that's `data/resources/`.
2. Restart the server.

The server confirms every resource it loads:

```
demo-numbers v1.0 loaded — lua · server 1 file · 1 client file
1 resource · 1 module loaded
```

Chat works without any resource. Chat commands such as `/pm` appear only with a resource that adds
them.

## The examples in the archive

The server archive has an `examples/` folder next to the program, with ready-made resources. To try
one, copy its folder into `resources/`. The copy is yours: change it as you like, and updating the
server won't touch it.

| Example | What it does |
|---|---|
| `chat-commands` | Adds `/help`, `/me` and `/pm` to the chat. A good start for commands of your own. |
| `vehicle-cleanup` | Deletes abandoned cars by rules set in its `resource.toml`. |
| `gatekeeper-example` | Shows how to refuse a join, a spawn or a car edit and tell the player why. |
| `seat-demo` | Seats players in cars on the server's command, takes them out, swaps them. |
| `nodegrab-allow` | Allows the experimental node grabber, which is refused unless a plugin says yes. |
| `freeroam-example` | Greets players, answers a client event, runs timers. |
| `demo-numbers` | The smallest resource with a server half and a client half. Handy to test the connection. |
| `devapi-example` | A tour of the plugin API, one feature at a time. |
| `session-report` | A report of who played, how long and in what. Written in JavaScript, so it needs the `js-host` module, which the archive doesn't include. Without it the server skips this one. |

## A resource's settings

A resource may carry a `resource.toml`. The part for hosts is the `[config]` table: the resource's
own settings. Its author says which keys it takes. For `vehicle-cleanup`, for example:

```toml
[config]
deleteIdleAfterSeconds = 600
maxWorldVehicles = 20
```

After a change, restart the server or reload the resource.

## Reload a resource

`reload <name>` in the server console runs a resource's server half again without restarting the
whole server. The server packs client scripts once, at start: changes to those reach players only
after a restart.

## Obfuscating client scripts

The server scrambles the scripts a resource sends to players first (`[resources] obfuscate`, on by
default), so they're harder to copy. The tool is Prometheus, a Lua program in `tools/`; it has
nothing to do with the monitoring system of the same name. It needs Lua 5.1:

- on Windows it's in the archive;
- on Linux, install the `lua5.1` package and set `NODE_LUA=/usr/bin/lua5.1`;
- the Docker image has it.

When it works, the log says `client obfuscation ready · runner … · Prometheus (cache .obfcache)`.
When it doesn't, the server still runs and sends the scripts as they are, and the log says what's
missing. `Node-Server --obf-selftest` checks the setup and prints `[obf-selftest] available=1` when
it works.

A resource picks how hard to scramble with `[client] obfuscation`: `none`, `light` (the default),
`medium` or `strong`. Results are cached in `.obfcache/`, which you can delete at any time.

The server also checks client scripts for syntax errors while packing them. It still sends a script
with an error, but warns in the log: `… client file 'main.lua' has a syntax error: …`.

## Native modules

A native module is a compiled library (`.dll` or `.so`) in the `modules/` folder next to the
program. Modules load before resources. The archive already has one, the database module for
plugins ([The db module](/plugins/database/)). Until a database is configured, it logs one warning
at start and does nothing else.

At load the server checks which interface version a module was built for, and refuses an
incompatible one with a request to rebuild it. In Docker, `modules/` is inside the image: to add a
module, build your own image on top of it.
