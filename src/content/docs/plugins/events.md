---
title: Events
description: The join step by step, the four kinds of event, what handlers receive, refusing a request with a reason, wire events from clients, and the relay filter.
---

Everything a server half does starts from an event. One call subscribes to all of them,
`node.on(name, fn)`, and the name decides what `fn` receives. This page explains the kinds and
walks through a player's visit; the [events reference](/plugins/api/events/) lists every name with
its exact arguments.

## The join, step by step

This is what happens between a player pressing **Join** and driving around, and where your code
gets a say. Steps without an event are the server's own business.

1. **The door.** The launcher connects and shows its ticket from the server list. The server checks
   it and the ban list. A banned player is turned away here, before any plugin hears of them.
2. **A seat and a name.** The player gets an id and their display name. If someone on the server
   already has that name, the newcomer gets `Name#<id>`.
3. **`playerConnectRequest(player, name)`.** Your chance to refuse, with a reason the player sees.
   The player's name, IP and account fields are readable; nothing has been downloaded yet. On a full
   server it's asked too, with `player.overCapacity` set, so you can let someone in on a reserved
   slot ([Players and vehicles → Reserved slots](/plugins/players-and-vehicles/#reserved-slots)).
4. **`playerAuthenticated(player)`.** Let in. Good for loading what you keep about this player.
5. **The game-file check.** The launcher checks the player's game files at the level the server asks
   for. **`playerVerifyReported(player, report)`** reports the result, after the server applied its
   own verdict.
6. **Mods.** The player downloads what they're missing. No event; this can take minutes.
7. **Map and client scripts.** The map name and every resource's client files go out together, so
   the game can set them up while the map loads.
8. **`playerJoining(player)`.** The player's game is loading the map now. They have no cars yet. A
   good moment to tell the others "Alice is loading in" or to start a timer for how long joins take.
9. **`playerJoined(player)`.** The player is in the world and has received every car. The usual
   place to greet them, give a role and restore their state.

While they play, **`playerLagging(player, silentSec)`** fires when nothing has arrived from them for
a few seconds (8 by default), and **`playerRecovered(player, silentSec)`** when they're back. A lagging
player keeps their seat and cars.

At the end, **`playerLeft(player, reason)`**. The name is still readable. The player's walking
avatar is deleted; their cars stay in the world, ownerless. `reason` is the same text as the
server's leave line: `"Connection closed by the client"`, a kick's own text, and so on. Match
`"Replaced"` exactly (the same account logged in again) and treat the rest as prose.

Two things to keep in mind:

- `playerLeft` fires for everyone who got an id, including a player you refused in
  `playerConnectRequest` or who quit during the download. Not every `playerLeft` has a
  `playerJoined` before it.
- After a broken connection the server holds the slot for 30 seconds (the default) in case the
  launcher reconnects. A player who comes back fires `playerRecovered`, not a second
  `playerJoined`; one who doesn't fires `playerLeft` when the window runs out.

<!-- doctest: server+client -->
```lua
node.on("playerConnectRequest", function(player, name)
    if name:lower():find("admin", 1, true) then
        return false, "Names with 'admin' in them are reserved"
    end
    node.log("%s may join", name)
end)

node.on("playerJoining", function(player)
    node.log("%s is loading the map", player.name)
end)

node.on("playerJoined", function(player)
    player:tell("Welcome, %s. %d online.", player.name, node.players.count())
end)

node.on("playerLeft", function(player, reason)
    node.log("%s left: %s", tostring(player.name), reason)
end)

-- expect: Alice may join
-- expect: Alice is loading the map
-- expect-client: Alice chat:msg .*Welcome, Alice\. 1 online\.
-- expect: Alice left: .+
```

## Four kinds, one node.on

| Kind | Names | Handler receives | Return value |
|---|---|---|---|
| **Engine events** | `<subject><Verb-ed>`, after something happened: `playerJoined`, `vehicleSpawned`, `serverTick` | the subject (a `Player` or a `Vehicle`) or nothing | ignored |
| **Notifications** | after the server acted on something a player did: `vehicleEdited`, `playerSeatChanged`, `chatMessage` | `(player, vehicle, payload)`, or `(player, payload)` where no vehicle is involved | ignored |
| **Requests** | `<subject><Action>Request`, before the server does what a player asked: `vehicleSpawnRequest`, `chatMessageRequest` | like notifications | `false[, reason]` refuses |
| **Wire events** | any other name, by convention `<domain>:<verb>`: `race:finish` | `(player, data)`, `data` as the client sent it | ignored |

Two more channels have their own calls: messages between resources ([The bus](/plugins/bus/)) and
raw bytes for native modules (`node.modules.on`). The relay filter is installed with
`node.relay.filter` ([below](#the-relay-filter)). All handlers run on one worker thread, one at a
time, in the order they subscribed; several resources may subscribe to the same name.

### Naming

Engine events and notifications read `<subject><Verb-ed>`: what happened, after the thing it
happened to. Requests read `<subject><Action>Request`. There is no `on` prefix and no present
tense. Names that were renamed in the past don't work any more: `node.on` refuses them with one
error that gives the new name (`event "playerJoin" was renamed to "playerJoined"; nothing is subscribed to the old name`).
The [events reference](/plugins/api/events/#renamed-events) has the whole list.

## What a handler receives

Where the server works with ids, `node.on` hands you objects. A `Player` is a small table with
`id`; reading `player.name`, `player.ip`, `player.role` or `player.accountId` fetches the player's
record once and keeps it on the object. Methods such as `player:kick`, `player:send`, `player:tell`
and `player:vehicles` act by id. A `Vehicle` works the same way. The details are on
[Players and vehicles](/plugins/players-and-vehicles/).

Payloads that are JSON arrive decoded: a spawn config is a table with `config.jbm`, a coupler call
has `call.controllerName`. Wire events are the exception: their `data` is exactly what the client
sent, so decode it yourself with `node.json.decode`.

Ids are reused. A `Player` from `playerLeft` still knows its name, but its `id` will belong to
someone else later. Keep anything long-lived under `player.accountId` (or `player.name` for guests),
and check `player:isConnected()` after waiting.

`node.raw.on(name, fn)` subscribes with the raw arguments (ids and JSON text) for hot paths where
you don't want objects built.

## Engine events

Fired after something happened; return values are ignored.

- **Players.** `playerAuthenticated`, `playerJoining`, `playerJoined`, `playerLeft`,
  `playerPolicyChanged` (the player changed who may use their cars), `playerCameraChanged`,
  `playerFrozenChanged` (a resource froze or thawed the player; read `player.frozen`).
- **Server and resource.** `serverTick` (every 100 ms, no argument; keep it cheap),
  `serverShutdown` (save what you must; timers won't run again), `resourceUnload(reason)`
  ([Resources → Saving before the unload](/plugins/resources/#saving-before-the-unload)).
- **Vehicles.** `vehicleSpawned`, `vehicleTagsChanged`, `vehicleLockChanged`,
  `vehicleDamageChanged`, `vehicleTeleported`, `vehicleBreakGroupsChanged`.
- **Streams.** `vehiclePositionChanged`, `vehicleInputsChanged`, `vehicleElectricsChanged`,
  `vehiclePowertrainChanged`, `vehicleEngineChanged`, `vehicleNodesChanged`,
  `playerInputsChanged`, `playerHeadPoseChanged`. These arrive up to 60 times a second per car,
  merged so a slow handler sees fewer events instead of a growing queue. The handler gets only the
  object; read the latest state with the matching method (`vehicle:transform()`,
  `player:inputs()`). For a radar or a minimap, read every car at once on a timer instead
  ([Players and vehicles → Reading the world fast](/plugins/players-and-vehicles/#reading-the-world-fast)).

## Notifications

Fired after the server acted on something a player did. The payload is decoded when it's JSON.

| Event | Arguments | When |
|---|---|---|
| `vehicleDeleted` | `vehicle, cause` | A car left the world. `cause` is `"player"`, `"server"`, `"leave"` (the leaver's walking avatar), `"seat"` or `"replace"`. The record is gone by then; only `vehicle.id` means anything. |
| `vehicleRespawned` | `player, vehicle, config` | The player replaced the car they drive. |
| `vehicleEdited` | `player, vehicle, config` | New parts or tuning were applied. |
| `vehicleReset` | `player, vehicle, posRot` | The car was reset. `posRot.cause` is `"player"` or `"server"`; for a server reset `player` is `nil`. |
| `vehiclePainted` | `player, vehicle, paints` | New paint. |
| `playerSeatChanged` | `player, vehicle, role` | Got in, got out or was moved. `vehicle` is `nil` on foot; `role` is `"driver"`, `"passenger"` or `"none"`. |
| `vehicleCouplerChanged`, `vehicleControllerChanged` | `player, vehicle, call` | A door, coupler or controller call went through. |
| `chatMessage` | `player, msg` | A chat line was decided ([Chat](/plugins/chat/#watching-the-chat)). |
| `playerVerifyReported` | `player, report` | A game-file check finished ([Client scripts → Strict sessions](/plugins/client-scripting/#strict-sessions)). |
| `playerLagging`, `playerRecovered` | `player, silentSec` | See [the join](#the-join-step-by-step). |
| `serverShutdownScheduled` | `info` | A resource scheduled a stop with `node.server.shutdown(reason, delayMs)`: `info.reason`, `info.at` (Unix seconds) and `info.by` (the resource). When the stop is called off, `info.cancelled` is `true`. A [recipe](/plugins/recipes/#a-restart-with-a-countdown) counts down in chat. |

<!-- doctest: server -->
```lua
node.on("vehicleEdited", function(player, vehicle, config)
    node.log("%s edited %s (%s)", tostring(player), tostring(vehicle), tostring(config.jbm))
end)

node.on("playerSeatChanged", function(player, vehicle, role)
    if vehicle then
        node.log("%s is now %s of %s", tostring(player), role, tostring(vehicle))
    end
end)

node.on("vehicleDeleted", function(vehicle, cause)
    node.log("vehicle %d gone (%s)", vehicle.id, cause)
end)

node.on("serverShutdownScheduled", function(info)
    if info.cancelled then
        node.chat.say("The restart is off")
    else
        node.chat.say("Restart in %d seconds: %s", info.at - os.time(), info.reason)
    end
end)
```

## Requests: saying no

A request fires before the server does what a player asked. Return `false`, optionally with a
reason, to refuse; return nothing to let it happen. A handler that returns nothing can still watch:
it sees every request and changes nothing.

Every handler runs, even after one has refused, so watchers see everything; the first reason given
is the one used. A handler that raises an error doesn't refuse. Chat is the exception: there, the
first `false` ends the chain ([Chat](/plugins/chat/#refusing-and-rewriting)).

| Request | Arguments | A refusal |
|---|---|---|
| `playerConnectRequest` | `player, name` | turns the player away; they see the reason. |
| `vehicleSpawnRequest` | `player, requestedId, config` | removes the car the player just made. `requestedId` is the client's number, not the final id. |
| `vehicleEnterRequest`, `vehicleExitRequest` | `player, vehicle, role` | keeps the player where they were; they see the reason. |
| `vehicleEditRequest`, `vehiclePaintRequest` | `player, vehicle, config` / `paints` | rolls the player's car back to what the server had; they see the reason if you gave one. |
| `vehicleCouplerRequest` | `player, vehicle, call` | the door or coupler stays as it was. |
| `vehicleTriggerRequest` | `player, vehicle, call` | blocks pressing a control on someone else's car. An explicit `true` allows it even when the car's owner doesn't let others use their controls. |
| `vehicleNodeGrabRequest` | `player, vehicle, grab` | blocks grabbing a car with the experimental node grabber. **No handler also means no**: enabling it needs a resource that says yes (see `nodegrab-allow` in [the examples](/plugins/examples/)). |
| `chatMessageRequest` | `player, msg` | the line isn't sent; the sender is told why. A string or table return rewrites it ([Chat](/plugins/chat/#refusing-and-rewriting)). |

An example in the spirit of `gatekeeper-example`: a car limit with a reason, and doors only the
car's owner may open.

<!-- doctest: server+client {"spawn": "coupe"} -->
```lua
local MAX_CARS_PER_PLAYER = 2

node.on("vehicleSpawnRequest", function(player, requestedId, config)
    if #player:vehicles() >= MAX_CARS_PER_PLAYER then
        return false, "Vehicle limit reached (" .. MAX_CARS_PER_PLAYER .. " per player)"
    end
    node.log("%s spawns a %s", tostring(player), tostring(config.jbm))
end)

node.on("vehicleCouplerRequest", function(player, vehicle, call)
    if vehicle.spawner and vehicle.spawner ~= player then
        return false -- only the spawner opens this car's doors
    end
end)

-- expect: Player#\d+ Alice spawns a coupe
```

`vehicleSpawnRequest` fires before the car exists, so `player:vehicles()` counts what the player
already has. The server's own `MaxCars` setting does the same job without a resource; the example
shows the shape. What the server does itself (`vehicle:seat`, `vehicle:setCoupler`,
`vehicle:trigger`, `vehicle:lock`) never asks these hooks.

## Wire events

A resource makes up its own events between its server and client halves just by using a name. The
same `node.on` subscribes to them, and the handler gets `(player, data)`, with `data` the string the
client passed to `node.emitServer(name, data)`, by convention JSON.

Name them `<domain>:<verb>`, lowercase, one colon: `hello:count`, `race:finish`. Names starting
with `node:` belong to NodeMP, and so do `chat:send`, `chat:msg` and the other `chat:` events. To
send the other way: `player:send(event, data)` to one player, `node.broadcast(event, data)` to
everyone, `node.broadcast(event, data, except)` to everyone but one. A table is JSON-encoded for
you.

Wire events from a client reach the server and nothing else. To pass something on to the other
players, forward it:

<!-- doctest: server+client {"players": ["Alice", "Bob"], "emit": [["team:ping", "{\"at\": 1}"]]} -->
```lua
node.on("team:ping", function(sender, data)
    if type(data) ~= "string" or #data > 256 then return end -- untrusted input
    node.broadcast("team:ping", data, sender) -- everyone but the sender
end)

-- expect-client: Bob team:ping \{"at": 1\}
```

Treat `data` as untrusted: anyone can send anything from their own game. Check its type and length,
decode it with `node.json.decode` and check the fields before you use them.

## The relay filter

`relayRequest` is a question the server asks for every packet it passes on: should this player see
this packet? Install it with `node.relay.filter(fn)`. `fn(fromPid, toPid, category, subtype, gid)`
gets ids, not objects, because it runs for every packet, and returns `false` to hide that packet
from that player. Answers are cached, so call `node.relay.invalidate()` whenever the data your
filter reads changes.

<!-- doctest: server -->
```lua
local hidden = {} -- [gid] = { [pid] = true }

node.relay.filter(function(fromPid, toPid, cat, sub, gid)
    local peers = hidden[gid]
    if peers and peers[toPid] then return false end
end)

local function hide(vehicle, player)
    hidden[vehicle.id] = hidden[vehicle.id] or {}
    hidden[vehicle.id][player.id] = true
    node.relay.invalidate() -- the filter's data changed
end
```

For room-style rules there's something cheaper: visibility groups. `player:setGroup(n)` and
`vehicle:setGroup(n)` put players and cars in numbered worlds, and only the same numbers see each
other, with no filter and no cache. Group `0` is the shared world.

## Unsubscribing

`node.off(name, fn?)` removes this resource's handlers for a name (all of them, or only `fn`) and
returns how many it removed. A reload drops every subscription anyway, so there's nothing to clean
up then.

## Next

- [Events reference](/plugins/api/events/): every name and its exact arguments.
- [Players and vehicles](/plugins/players-and-vehicles/): the objects your handlers receive.
- [Timers and coroutines](/plugins/concurrency/): waiting without blocking everyone.
