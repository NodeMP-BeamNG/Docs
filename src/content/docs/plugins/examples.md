---
title: The example plugins
description: The plugins in the examples folder of the server archive, what each one shows, how to try one and which plugins are built from source.
---

The server archive has an `examples/` folder next to the program, and each folder in it is a ready-made plugin. `examples/README.txt` lists them too.

## What's in the folder

| Example | What it shows | What to learn from it |
|---|---|---|
| `demo-numbers` | The smallest plugin with both halves: the client sends a number once a second and the server logs it. | Checking that client scripts reach players and answer. |
| `chat-commands` | `/help`, `/me` and `/pm`: a command router on `chatMessageRequest`. | Starting your own commands. |
| `freeroam-example` | Greetings, a client event with a server answer, timers. | A small plugin of the usual kind. |
| `vehicle-cleanup` | Deleting cars nobody uses: idle ones, ones whose owner has left, and any beyond a total limit. | Rules from `[config]`. |
| `gatekeeper-example` | Refusing a join, a spawn and coupler use with a reason; watching car edits, resets, paint changes and deletions. | Refusing requests and watching notifications. |
| `seat-demo` | Seating players on request from the game console: `SeatDemo.seat(gid)`, `SeatDemo.eject()`, `SeatDemo.swap()`. | `player:seat`, `player:unseat`, `player:swapWith`. |
| `nodegrab-allow` | Allowing the experimental node grabber, which is forbidden without a plugin. | A request that is closed by default. |
| `devapi-example` | A tour of the API, one feature per client event. | Seeing a call at work before reading the reference. |
| `session-report` | Who played, for how long and in what; a JSON report. Written in JavaScript. | A ready-made [JavaScript plugin](/plugins/js-host/). Needs `js-host`. |

## Installing an example

Copy the example's folder from the archive into `resources/` and restart the server ([Install a plugin](/hosting/resources/#install-a-plugin)). Comments at the top of each example's `resource.toml` and `server/main.lua` say what it does. Only `vehicle-cleanup` takes settings from `[config]`.

## vehicle-cleanup

`vehicle-cleanup` deletes the cars the server leaves in the world ([Players and vehicles](/plugins/players-and-vehicles/#whos-who-in-a-car)). Its rules are in `[config]`, and the shipped `resource.toml` has them all commented out, so off. Uncomment the ones you want:

```toml
[config]
deleteIdleAfterSeconds = 600
deleteOnSpawnerDisconnect = true
maxWorldVehicles = 20
```

`includeUnicycles` decides whether players on foot count, and `checkIntervalMs` sets how often the rules are checked.

## nodegrab-allow

The experimental node grabber needs `[experimental] node_grab = true` in `server.toml` and a plugin that answers yes to `vehicleNodeGrabRequest`; without a handler every grab is refused. `nodegrab-allow` is that handler: change its rules to allow grabbing only for some players or cars.

## Built from source, not in the archive

Some plugins are native modules, available only as source and built with CMake:

| Plugin | What it is |
|---|---|
| `js-host` | Runs JavaScript plugins ([JavaScript plugins](/plugins/js-host/)). |
| `beammp-compat` | Runs plugins written for BeamMP unchanged ([Moving from other platforms](/plugins/migrating/#beammp-plugins-without-changes)). |
| `dimensions` | Parallel worlds: players from different dimensions don't see each other. |
| `plugin-example` | The smallest working native module, a good start for your own. |

The `db` database module is built the same way but ships with the server in `modules/` ([The db module](/plugins/database/)).
