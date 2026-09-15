---
title: Events
description: Four kinds of event, what handlers receive, denying a request, wire events from clients, the bus between resources and the module channel.
---

Everything a server half does starts from an event. One call subscribes to all of them -
`node.on(name, fn)` - and the name decides what kind of event it is and what `fn` receives. This
page explains the kinds and the shapes; the [events reference](/plugins/api/events/) lists every
name with its exact arguments.

## Four kinds, one node.on

| Kind | Names | Handler receives | Return value |
|---|---|---|---|
| Engine events (observe) | `<subject><Verb-ed>`, fired by the server after something happened: `playerJoined`, `vehicleSpawned`, `serverTick` | the subject - a `Player` or a `Vehicle` - or nothing | ignored |
| Vehicle notifications (observe, with data) | fired after the server relayed and cached a player's action: `vehicleEdited`, `playerSeatChanged` | `(player, vehicle, payload)` | ignored |
| Cancellable requests (decide) | `<subject><Action>Request`, fired before the server performs what a client asked: `vehicleSpawnRequest` | `(player, vehicle, payload)` - or a name, or a proposed id, in the second slot | `false[, reason]` denies |
| Wire events from clients | any other name, by convention `<domain>:<verb>`: `chat:send` | `(player, data)` with `data` as the string the client sent | ignored |

Two more channels have their own subscribe calls: the bus between resources (`node.bus.on`) and
the binary module channel (`node.modules.on`). The relay filter, `relayRequest`, is installed with
`node.relay.filter`. All handlers run on the plugin worker thread, one at a time, in registration
order; several resources may subscribe to the same name.

## Naming

Two rules cover every server event name:

1. **A notification reads `<subject><Verb-ed>`** - what happened, in the past tense, after the
   subject it happened to: `playerJoined`, `playerLeft`, `vehicleSpawned`, `vehicleDeleted`,
   `vehicleEdited`, `playerSeatChanged`, `serverShutdown`. The handler observes; its return value
   is ignored.
2. **A request a handler can deny reads `<subject><Action>Request`** - what the client asks for,
   before the server does it: `playerConnectRequest`, `vehicleSpawnRequest`, `vehicleEnterRequest`.
   `false[, reason]` denies. The relay filter is a request too, `relayRequest`: `false` hides one
   packet from one recipient.

There is no `on` prefix - `node.on(...)` already says it - and no present tense. Wire events keep
their own rule, `<domain>:<verb>` (`chat:send`); module channels and bus events are unchanged.

Servers before 1.2.0 used other spellings, and every one of them still works as a **deprecated
alias**: `playerJoin` → `playerJoined`, `playerConnecting` → `playerAuthenticated`, `onShutdown` →
`serverShutdown`, `onPlayerConnectRequest` → `playerConnectRequest`, `onVehicle…Request` →
`vehicle…Request` (spawn, enter, exit, coupler, edit, paint, trigger, node grab), `canRelay` →
`relayRequest`. An old name subscribes to the same event as the new one and logs one warning per
resource per old name, the first time the resource uses it:

```text
[deprecated] event "onPlayerConnectRequest" is now "playerConnectRequest"
```

Both spellings are one event: `node.off` accepts either for a handler subscribed under either, two
different functions under the two spellings are two handlers (both run), and the same function
under both spellings is one subscription (`node.on` replaces, so it runs once). The C ABI accepts
the old names the same way. The aliases will be removed in 2.0 - rename when you next touch the
resource; the [events reference](/plugins/api/events/#renamed-events) lists every pair.

## What a handler receives

Where the raw API has ids, `node.on` hands you objects. A `Player` is a table with `id` and a
metatable: reading `player.name`, `player.ip`, `player.role`, `player.vehicle` or `player.accountId`
fetches the session record once and caches it on the object; `player:refresh()` drops the cache;
methods (`player:kick`, `player:send`, `player:tell`, `player:setRole`, `player:vehicles`) act by
id. A `Vehicle` works the same way: `vehicle.spawner`, `vehicle.driver` and `vehicle.passengers` are
Players, `vehicle.spawnerId` and `vehicle.driverId` the raw ids, `vehicle.tags` a table, and the
streaming state (`vehicle:transform()`, `vehicle:electrics()`) is a method because it is a fresh
read each time. Two objects are `==` when their ids match; `tostring(player)` reads
`Player#3 Alice`, `tostring(vehicle)` reads `Vehicle#12 Alice`.

Payloads that are JSON on the wire arrive decoded: a spawn config is a table with `config.jbm`, a
coupler call has `call.controllerName`. Where the payload is a role name it stays a string. Wire
events are the exception: their `data` is exactly what the client sent, so decode it yourself with
`node.json.decode`.

Ids are reused. A `Player` from a `playerLeft` handler still knows its name, but `player.id` will
belong to someone else later - key anything durable by `player.accountId` or `player.name`, and
check `player:isConnected()` after a `node.sleep`.

`node.raw.on(name, fn)` subscribes with the raw arguments - ids and JSON text - for the hot paths
where you do not want objects built.

## Engine events (observe)

Fired by the server after something happened; return values are ignored.

- **Lifecycle.** `playerAuthenticated` (authenticated, about to receive the world), `playerJoined`
  (the usual place to greet, assign a role, restore state), `playerLeft` (its vehicles go around
  the same time), `serverTick` (every 100 ms, no argument - keep it cheap), `serverShutdown` (flush
  what you must; timers will not run again), `resourceUnload(reason)` (this resource is about to
  be unloaded - `"reload"` before a reload replaces it, `"shutdown"` after `serverShutdown`; fired
  for the unloading resource only, with `serverShutdown`'s limitations - see
  [Resources → Reload](/plugins/resources/#reload)).
- **Registry.** `vehicleSpawned`, `vehicleDeleted` (the record is gone by then; only `vehicle.id`
  is meaningful), `vehicleTagsChanged`, `vehicleLockChanged`, `vehicleDamageChanged`.
- **Streams.** `vehiclePositionChanged`, `vehicleInputsChanged`, `vehicleElectricsChanged`,
  `vehiclePowertrainChanged`, `vehicleEngineChanged`, `vehicleNodesChanged`,
  `playerInputsChanged`, `playerHeadPoseChanged`: one event per accepted packet, coalesced so that
  at most one dispatch per vehicle is pending - a handler that lags sees fewer events, never a
  growing queue. The argument is the object only; read the latest state with the getter
  (`vehicle:transform()`, `player:inputs()`). Nothing is posted when nobody subscribed. For a
  radar, poll `node.vehicles.transforms()` on a timer instead: one read for every vehicle.
- **Transitions.** `vehicleTeleported`, `vehicleBreakGroupsChanged`, `playerCameraChanged`: one
  event per report, not coalesced.

```lua
local greeted = {}

node.on("playerJoined", function(player)
    player:tell("Welcome, %s. %d online.", player.name, node.players.count())
    greeted[player.id] = true
end)

node.on("playerLeft", function(player)
    greeted[player.id] = nil -- the id will be reused
end)
```

## Vehicle notifications (observe, with data)

Fired after the server relayed and cached a player's action on a vehicle. Handlers get
`(player, vehicle, payload)` - the payload decoded into a table where it is JSON, a string where
it is a role name; return values are ignored. The six names: `vehicleEdited` (the new config),
`vehicleReset` (the position it was reset to), `vehiclePainted` (the paints), `playerSeatChanged`
(`vehicle` is `nil` when the player is now on foot; `role` is `"driver"`, `"passenger"` or
`"none"`), `vehicleCouplerChanged` and `vehicleControllerChanged` (the call).

```lua
node.on("vehicleEdited", function(player, vehicle, config)
    node.log("%s edited %s (%s)", tostring(player), tostring(vehicle), tostring(config.jbm))
end)

node.on("playerSeatChanged", function(player, vehicle, role)
    if vehicle then
        node.log("%s is now %s of %s", tostring(player), role, tostring(vehicle))
    end
end)
```

A reset cannot be denied - there is no clean previous value to restore - which is why it is a
notification and not a request.

## Cancellable requests (decide)

Fired before the server performs an action a client asked for. Handlers get
`(player, vehicle, payload)` with the payload decoded where it is JSON; a handler that returns
`false` - optionally with a reason string as a second value - denies the action, and the first
denial wins. Every cancellable name can also be observed: a handler that returns nothing sees the
request and changes nothing. Names read `<subject><Action>Request`.

Every handler runs even after one has denied, so observers still see the request. A handler that
raises an error never denies. The reason travels where the wire can carry it - the connect refusal
is shown to the player as the kick text - and is logged otherwise.

The nine names: `playerConnectRequest` (second argument: the requested name; bans are checked
before it fires), `vehicleSpawnRequest` (second argument: the id the client proposed, not the
final one; third: the spawn config), `vehicleEnterRequest` and `vehicleExitRequest` (the
role), `vehicleCouplerRequest`, `vehicleEditRequest` and `vehiclePaintRequest` (the client
applied these optimistically, so a denial rolls the initiator back to the server's cached
config or paint), `vehicleTriggerRequest` (default allow), `vehicleNodeGrabRequest`
(fail-closed: with no handler at all the grab is denied, so the experimental node grabber needs a
resource that says yes - `nodemp-relay` does).

A worked example, from `gatekeeper-example`: cap the vehicles a player may spawn, with a reason.

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
```

`vehicleSpawnRequest` fires before the vehicle exists, so `player:vehicles()` counts what the
player already has; the denied client removes the car it created locally. The server's own
`[General] MaxCars` limit and `node.server.setMaxCars` do the same job without a resource; the
example shows the shape. What the server does itself - `vehicle:seat`, `vehicle:setCoupler`,
`vehicle:trigger`, `vehicle:lock` - never asks these hooks: the server does not veto itself.

## The relay filter

`relayRequest` is neither an event nor an action request: a question the relay asks per packet,
named like the requests because `false` from the handler decides something. Install it with
`node.relay.filter(fn)` (the same as `node.on("relayRequest", fn)`); `fn(fromPid, toPid, category,
subtype, globalId)` receives ids, not
objects, because it sits on the hot path, and returns `false` to hide that packet from that
recipient. Verdicts are cached until `node.relay.invalidate()`, so call it whenever the data your
hook reads has changed. `node.relay.unfilter(fn?)` removes it.

```lua
local hidden = {} -- [gid] = { [pid] = true }

node.relay.filter(function(fromPid, toPid, cat, sub, gid)
    local peers = hidden[gid]
    if peers and peers[toPid] then return false end
end)

local function hide(vehicle, player)
    hidden[vehicle.id] = hidden[vehicle.id] or {}
    hidden[vehicle.id][player.id] = true
    node.relay.invalidate() -- the hook's data changed
end
```

Visibility groups are the cheap alternative for room-style rules: `player:setGroup(n)` and
`vehicle:setGroup(n)` put players and vehicles in numbered worlds, and only matching numbers see
each other, with no hook and no cache. Group `0` is the shared world.

## Wire events from clients

Not a fixed list: a resource defines its own wire events by using a name. The same `node.on`
subscribes to them with `(player, data)`; the name not being a builtin is what makes it a wire
event. `data` is the string the client passed to `node.emitServer(name, data)`, by convention
JSON.

Name them `<domain>:<verb>`, lowercase, one colon: `chat:send`, `hello:count`, `race:finish`.
Names starting with `node:` are reserved for the framework. The other direction is
`player:send(event, data)` (or `node.send`), `node.broadcast(event, data)` for everyone and
`node.broadcast(event, data, except)` for everyone but one player - the shape of a relay, where
the excepted player counts as the sender for the relay filter. A table given to any of these is
JSON-encoded for you.

Client-emitted events are server-terminal: they reach server resources and nothing else. A
feature that must reach other players is a resource that forwards it, which is what `nodemp-relay`
does for the client mod's `vehicle:fire` and `vehicle:grab` events:

```lua
node.on("chat:send", function(player, data)
    local msg = node.json.decode(data)
    if type(msg) ~= "table" or type(msg.text) ~= "string" then return end
    node.broadcast("chat:msg", { fromPid = player.id, name = player.name, text = msg.text })
end)

node.on("vehicle:fire", function(sender, data)
    node.broadcast("vehicle:fire", data or "", sender) -- everyone but the author
end)
```

Treat `data` as untrusted input: check its type and length before you use it, as `chat` does.

## Between resources: node.bus

`node.bus.emit(name, data)` publishes to every resource and native module subscribed to `name`,
asynchronously on the worker and to the sender too. `node.bus.on(name, fn)` subscribes
`fn(sourceResourceName, data)`; a native module appears as `"native"`. `data` arrives as a string
(a table you emit is JSON-encoded), so decode it. `node.bus.off(name, fn?)` unsubscribes.

This is how the built-in chat helpers work: `node.chat.say`, `node.chat.tell` and `player:tell`
emit `chat:say` on the bus, and `node.commands.add` listens for `chat:command`; the `chat`
resource owns the screen side and answers both. Without `chat` installed those calls are silent.

```lua
-- in one resource
node.bus.on("race:finished", function(source, data)
    local result = node.json.decode(data)
    node.log("%s reports %s finished in %.1f s", source, result.name, result.seconds)
end)

-- in another: the client half reports its time as a wire event, the resource publishes it
node.on("race:finish", function(player, data)
    node.bus.emit("race:finished", { name = player.name, seconds = tonumber(data) or 0 })
end)
```

Prefer the bus over reading another resource's globals: each resource has its own Lua state, and
a peer that is not installed simply never answers.

## The module channel

Raw bytes on a numbered channel, for native modules and their client halves that speak their own
encoding. `node.modules.on(channel, fn)` subscribes `fn(player, data)` to what clients send on a
`u32` channel with `node.sendModule(channel, data)`; `node.modules.send(target, channel, data)`
sends to a `Player` or to everyone with `"all"`. Nothing is parsed or logged. The `dimensions`
module owns channel `0x44494D53`.

## Unsubscribing

`node.off(name, fn?)` removes this resource's handlers for a name - all of them, or only `fn` - and
returns how many; a deprecated spelling names the same event as its canonical name here too. A
reload drops every subscription the resource made, so there is nothing to clean up at that point.

## Next

- [Events reference](/plugins/api/events/) - every name, its kind, its exact arguments.
- [Concurrency](/plugins/concurrency/) - the thread handlers run on, and how to wait without
  blocking it.
- [Client scripting](/plugins/client-scripting/) - the other end of a wire event.
