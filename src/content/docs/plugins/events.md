---
title: Events
description: The kinds of events, the order a player joins and leaves in, refusing a request with a reason, reserved slots, unsubscribing, and events that fire many times a second.
---

A resource does its work in event handlers. `node.on(name, handler)` subscribes; the server calls
the handler when the event happens. The [events reference](/plugins/api/events/) lists every event
with its arguments; this page explains how they fit together.

## Kinds of events

| Kind | Examples | What the handler gets | Return value |
|---|---|---|---|
| Server events | `playerJoined`, `vehicleSpawned`, `serverShutdown` | The subject: a `Player` or a `Vehicle` | Ignored. |
| Notifications | `vehicleEdited`, `vehicleReset`, `chatMessage` | The player, the car and the data, decoded | Ignored. |
| Requests | `playerConnectRequest`, `vehicleSpawnRequest`, `chatMessageRequest` | The player, the car and the data | `false, "reason"` refuses. |
| Wire events | `greeter:hello`, any name of your own | The player and the data as a string | Ignored. |

A name the server doesn't know is a wire event: a message from a client script
([Client scripts](/plugins/client-scripting/)). Messages between resources go over the
[bus](/plugins/bus/), not through `node.on`.

Several handlers per event are fine, from one resource or many. They run one after another, on the
server's single worker thread.

## The order of a join

A player passes four events on the way in:

1. `playerConnectRequest`: the player has signed in and asks to join. Bans are already checked.
   You can refuse here.
2. `playerAuthenticated`: admitted. The name and address are known; there are no cars yet.
3. `playerJoining`: the mods are downloaded and the map is sent; the game is loading the level.
4. `playerJoined`: the player is in the world. The usual place to greet, give a role, restore saved
   data.

On the way out there is one: `playerLeft`, with the reason the session ended.

<!-- doctest: server+client -->
```lua
local steps = { "playerAuthenticated", "playerJoining", "playerJoined" }
for _, name in ipairs(steps) do
    node.on(name, function(player)
        node.log("%s: %s", name, player.name)
    end)
end

node.on("playerConnectRequest", function(player, name)
    node.log("playerConnectRequest: %s", name)
end)

node.on("playerLeft", function(player, reason)
    node.log("playerLeft: %s (%s)", player.name, reason)
end)

-- expect: playerConnectRequest: Alice
-- expect: playerAuthenticated: Alice
-- expect: playerJoining: Alice
-- expect: playerJoined: Alice
-- expect: playerLeft: Alice
```

A broken connection doesn't end the session at once. After `[network] lag_grace_sec` of silence the
server fires `playerLagging`; if the player comes back, `playerRecovered`. `playerLeft` fires only
when the player quits, is kicked, or doesn't return within `disconnect_sec`. A player who reconnects in
time doesn't pass the join events again.

Player ids are reused: a player who leaves frees the id for the next one. Keep saved data under
`player.accountId` (a signed-in account) or the name, never under the id.

## Refusing a request

A request handler that returns `false` refuses, and a second value is the reason the player sees.
The first refusal wins; returning nothing lets the request through.

<!-- doctest: server+client -->
```lua
node.on("playerConnectRequest", function(player, name)
    if player.guest then
        return false, "This server is for players with an account"
    end
    node.log("%s may join", name)
end)

-- expect: Alice may join
```

The same works for cars. Here a resource keeps one model off the server:

<!-- doctest: server+client {"spawn": "coupe"} -->
```lua
local banned = { pickup = true }

node.on("vehicleSpawnRequest", function(player, requestedId, config)
    node.log("%s wants a %s", player.name, config.jbm)
    if banned[config.jbm] then
        return false, "This car isn't allowed here"
    end
end)

-- expect: Alice wants a coupe
```

Every request can also be watched without deciding anything: return nothing. Which requests exist,
and what each refusal does in the game, is in the [events reference](/plugins/api/events/#cancellable-requests-decide).

## Reserved slots

On a full server `playerConnectRequest` still fires, with `player.overCapacity` set. A handler that
returns an explicit `true` lets the player in past `max_players`; silence leaves the refusal
(`Server full!`) to the server.

<!-- doctest: server -->
```lua
local reserved = { [42] = true } -- account ids

node.on("playerConnectRequest", function(player)
    if player.overCapacity and reserved[player.accountId] then
        return true
    end
end)
```

## Notifications

After something happened, notifications tell you what. They can't be refused, but they carry the
details:

<!-- doctest: server+client {"spawn": "coupe"} -->
```lua
node.on("vehicleSpawned", function(vehicle)
    node.log("car %d spawned by %s", vehicle.id, vehicle.name)
end)

node.on("vehicleDeleted", function(vehicle, cause)
    node.log("car %d deleted (%s)", vehicle.id, cause)
end)

-- expect: car \d+ spawned by Alice
```

`chatMessage` is the one to log the chat with, after the server decided what happened to each line
([Chat and commands](/plugins/chat/)).

## Unsubscribing

`node.off(name, handler)` removes one handler; `node.off(name)` removes all of this resource's
handlers for the event. A handler can remove itself:

<!-- doctest: server+client -->
```lua
local function firstJoin(player)
    node.log("first player: %s", player.name)
    node.off("playerJoined", firstJoin)
end

node.on("playerJoined", firstJoin)

-- expect: first player: Alice
```

`node.defer(fn)` runs `fn` after every handler of the current event has finished: the way to act
once the others have seen it too.

## Events that fire many times a second

`vehiclePositionChanged`, `vehicleElectricsChanged` and their kind fire for every packet a car
sends, up to 60 times a second per car. They pass only the car; read the current state with
`vehicle:transform()` and friends. If a handler falls behind, it sees fewer events, never a growing
queue. Still, for a map or a radar, one `node.vehicles.transforms()` on a timer reads every car at
once and costs far less ([Players and vehicles](/plugins/players-and-vehicles/#many-cars-at-once)).

## Old event names

Events renamed in an earlier release don't answer to their old names. `node.on("playerJoin", f)`,
with the renamed `playerJoin`, subscribes to nothing and logs one error that names the new spelling,
`playerJoined`. The [events reference](/plugins/api/events/#renamed-events) has the full list.
