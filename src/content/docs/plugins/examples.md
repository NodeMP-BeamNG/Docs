---
title: The example plugins
description: The resources in the server archive's examples folder - what each one shows, how to try one, and which plugins are built from source instead.
---

Every server download has an `examples/` folder next to the program. Each folder in it is a complete
resource: copy it into `resources/`, restart, and it runs. The copy is yours to change; an update of
the server doesn't touch it. `examples/README.txt` lists them too.

## What's in the folder

| Example | What it shows | Read it for |
|---|---|---|
| `demo-numbers` | The smallest resource with both halves: the client sends a number every second, the server logs it. | Checking that client scripts reach players and talk back. |
| `chat-commands` | `/help`, `/me` and `/pm`: a command router on `chatMessageRequest`. | Starting your own commands. |
| `freeroam-example` | Greetings, a client event answered by the server, timers. | A small resource of the usual shape. |
| `vehicle-cleanup` | Deleting cars nobody uses: idle ones, ones whose owner left, a cap on the total. | Rules driven by `[config]`. |
| `gatekeeper-example` | Refusing a join, a spawn, a seat and an edit, each with a reason. | Every kind of request in one file. |
| `seat-demo` | Seating players from the server: seat, take out, swap. | `player:seat`, `player:unseat`, `player:swapWith`. |
| `nodegrab-allow` | Allowing the experimental node grabber, which is refused unless a plugin says yes. | A request that's closed by default. |
| `devapi-example` | A tour of the API, one feature per client event. | Seeing a call in use before reading its reference. |
| `session-report` | Who played, for how long, in what; a JSON report. Written in JavaScript. | A complete [JavaScript resource](/plugins/js-host/). Needs `js-host`. |

## Trying one

```
examples/demo-numbers  →  resources/demo-numbers
```

Copy the folder, restart the server, and look for its load line:

```
demo-numbers v1.0 loaded — lua · server 1 file · 1 client file
```

Most of the examples read settings from the `[config]` table of their `resource.toml`; the comments
at the top of `resource.toml` and `server/main.lua` say which.

## vehicle-cleanup in a few lines

The server never deletes a player's cars by itself: when a player leaves, their cars stay in the world.
`vehicle-cleanup` adds the rules you choose. All of them are off until you set them:

```toml
[config]
deleteIdleAfterSeconds = 600
deleteOnSpawnerDisconnect = true
maxWorldVehicles = 20
```

`includeUnicycles` decides whether walking players count, `checkIntervalMs` how often the rules are
checked.

## nodegrab-allow and the node grabber

The experimental node grabber needs two things: `[experimental] node_grab = true` in `server.toml`, and
a resource that answers `vehicleNodeGrabRequest` with a yes. Without a handler, every grab is refused.
`nodegrab-allow` is that handler; change its rules to allow grabs only for some players or cars.

## Built from source, not in the archive

Some plugins are native modules and come as source code, built with CMake:

| Plugin | What it is |
|---|---|
| `js-host` | Runs resources written in JavaScript ([JavaScript resources](/plugins/js-host/)). |
| `beammp-compat` | Runs plugins written for BeamMP unchanged ([Moving from other platforms](/plugins/migrating/#beammp-plugins-without-changes)). |
| `dimensions` | Parallel worlds: players in different dimensions don't see each other. |
| `plugin-example` | The smallest complete native module, a starting point for your own. |

The database module, `db`, is built the same way but ships with the server in `modules/`
([The db module](/plugins/database/)).
