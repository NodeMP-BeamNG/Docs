---
title: The example plugins
description: The resources in the release archive's examples folder - what each one shows, how to install it, and a walk through the ones worth copying.
---

Every server download has an `examples/` folder next to the executable. Each folder in it is a
complete resource: small enough to read in a few minutes, and meant to be copied and changed. Its
`README.txt` lists them, and `EXAMPLES_COMMIT` says which version they are.

## Installing one

Copy the **whole folder** into `resources/` next to `server.toml` and start the server again. The
log confirms it:

```
demo-numbers v1.0 loaded — lua · server 1 file · 1 client file
```

Each example's `resource.toml` and `server/main.lua` say what it does and which `[config]` keys it
takes. None of them changes anything until you install it, and the ones with policies (like
`vehicle-cleanup`) do nothing until you switch them on.

## What's in the folder

| Example | What it shows | Read with |
|---|---|---|
| `chat-commands` | `/help`, `/me` and `/pm`: how a resource adds chat commands | [Chat](/plugins/chat/#commands) |
| `demo-numbers` | The smallest resource with a server half and a client half | [Your first resource](/plugins/getting-started/) |
| `freeroam-example` | Greetings, wire events both ways, timers, a resource without a manifest | [Events](/plugins/events/) |
| `gatekeeper-example` | Refusing requests with a reason: a join, a spawn over a limit, someone else's door | [Events → Requests](/plugins/events/#requests-saying-no) |
| `vehicle-cleanup` | Deleting idle and abandoned cars, settings with defaults, a policy on a timer | [Resources](/plugins/resources/) |
| `seat-demo` | Seating players from the server: seat, unseat, swap | [Players and vehicles](/plugins/players-and-vehicles/#moving-players) |
| `nodegrab-allow` | The permission the experimental node grabber needs | below |
| `devapi-example` | A tour of the API, one capability per event | [Lua API reference](/plugins/api/lua/) |
| `session-report` | Who played, how long, what they drove, written in JavaScript | [JavaScript resources](/plugins/js-host/) |

## chat-commands

The reference for chat commands since server 1.8.0, when the server stopped having commands of its
own. One `chatMessageRequest` handler looks up the first word of a `/` line in a table of commands,
runs the one it finds and answers `{ handled = true }`; every other line passes untouched. Add a
command by adding a function to the table:

<!-- doctest: skip an excerpt of examples/chat-commands/server/main.lua -->
```lua
-- /time: the server's clock
function commands.time(player)
    player:tell("Server time: %s", os.date("%H:%M"))
end
```

`/help` lists the table's names, so a new command shows up there by itself.
[Chat → Commands](/plugins/chat/#commands) explains the pattern.

## vehicle-cleanup

The server never deletes a player's car on its own: when someone leaves, their cars stay in the
world without an owner. This resource is how you add the usual cleanup rules, and it ships with
every rule off. Turn on the ones you want in its `resource.toml`:

```toml
[config]
deleteIdleAfterSeconds = 600     # nobody drove it for 10 minutes
deleteOnSpawnerDisconnect = true # its owner left and nobody drives it
maxWorldVehicles = 20            # over 20 cars, the longest idle go first
includeUnicycles = false         # walking players are never touched
checkIntervalMs = 5000           # how often the rules are checked
```

Two things in it are worth copying into your own resources. Settings get their defaults in one
line, so a host only writes what they change:

<!-- doctest: server {"config": {"deleteIdleAfterSeconds": 600}} -->
```lua
local defaults = { deleteIdleAfterSeconds = 0, checkIntervalMs = 5000 }
local config = setmetatable(node.config, { __index = defaults })

node.log("idle limit %d s, checked every %d ms", config.deleteIdleAfterSeconds, config.checkIntervalMs)

-- expect: idle limit 600 s, checked every 5000 ms
```

And the rules run on a timer over `node.vehicles.all()` rather than on events, because "idle for
ten minutes" needs checking again and again anyway. A car someone is driving is never chosen.

## gatekeeper-example

Requests are the events where your resource gets a say before something happens. This one shows
three kinds of "no":

- **At the door.** `playerConnectRequest` refuses a name on a block list, with a reason the player
  sees in the launcher.
- **A limit.** `vehicleSpawnRequest` refuses a third car with `"Vehicle limit reached (2 per player)"`.
- **Someone else's car.** `vehicleCouplerRequest` keeps players out of the doors of cars they didn't
  spawn.

It also watches `vehicleEdited`, `vehicleReset` and `vehiclePainted`, which can only be observed:
the player's game has already done them by the time the server hears of it.
[Events → Requests](/plugins/events/#requests-saying-no) has every request and what a refusal does.

## demo-numbers

The quickest way to check that a player can reach your server's plugins at all. Its client half
sends a number every second, and the server half prints each one:

```
demo-numbers · Player#0 Alice joined - expecting a number every second
demo-numbers · Player#0 Alice -> 1
demo-numbers · Player#0 Alice -> 2
```

Numbers in the console mean the whole chain works: the game, the client mod, the launcher, the
connection and your resource. Remove it once you've seen them.

## seat-demo

Moves players between seats from the server. Its client half adds a `SeatDemo` table to the game's
Lua console: `SeatDemo.swap()` swaps seats with another driver,
`SeatDemo.eject()` puts you on foot, `SeatDemo.seat(id)` makes you the driver of car `id`. Each call
becomes `player:seat`, `player:unseat` or `player:swapWith` on the server.

## nodegrab-allow

The node grabber, which lets players grab and drag parts of cars, is experimental and closed twice:
the host has to set `[Experimental] NodeGrab = true`, and a resource has to allow each grab in
`vehicleNodeGrabRequest`. With no handler, every grab is refused. This resource allows all of them;
its comments show how to allow only some, for example not the car the player drives.

## devapi-example and freeroam-example

`devapi-example` is a tour: it registers handlers for `dev_*` wire events, one per part of the API
(server info, players, bans, spawning, storage, coroutines, HTTP, files, the bus, the relay filter),
and does nothing until a client sends one. Read it next to the
[Lua API reference](/plugins/api/lua/).

`freeroam-example` is a first resource much like the one on
[Your first resource](/plugins/getting-started/): greetings, a ping that's answered with a pong,
timers. It has no `resource.toml`, which shows that a folder with `server/main.lua` is enough.

## session-report

Keeps a record of every session (when a player joined, how long they drove, how many cars they
spawned, how far they went) and writes it to `session-report.json` every minute. It's written in
JavaScript and needs the `js-host` module in `modules/`; without it, the server logs that no
language host claims type `"js"` and skips the folder ([JavaScript resources](/plugins/js-host/)).

## Built from source

A few plugins aren't in the archive because they are native modules built from source: `dimensions`
(parallel worlds, driven over the [bus](/plugins/bus/#native-modules-on-the-bus)), `js-host`
(JavaScript resources), `beammp-compat` ([BeamMP plugins as they are](/plugins/migrating/)) and
`plugin-example`, the smallest native module to start one of your own from
([Native modules](/plugins/native-modules/)). The database module is the exception: it ships in
`modules/` ([Database](/plugins/database/)).

## Next

- [Recipes](/plugins/recipes/): short resources for the usual jobs.
- [Resources](/plugins/resources/): the folder, the manifest and settings in full.
