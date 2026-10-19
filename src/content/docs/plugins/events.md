---
title: Events
description: The kinds of events, join and leave order, refusing a request with a reason, reserved slots, unsubscribing, and events that fire many times a second.
---

A plugin works in event handlers: `node.on(name, handler)` subscribes a function, and the server calls it when the event happens. The [events reference](/plugins/api/events/) lists every event and its arguments; this page shows how they connect.

## Kinds of events

| Kind | Examples | What the handler gets | What to return |
|---|---|---|---|
| Server events | `playerJoined`, `vehicleSpawned`, `serverShutdown` | A `Player` or `Vehicle` object, if the event is about one | Doesn't matter. |
| Notifications | `vehicleEdited`, `vehicleReset`, `chatMessage` | The player, the car if any, and the data, JSON already parsed | Doesn't matter. |
| Requests | `playerConnectRequest`, `vehicleSpawnRequest`, `chatMessageRequest` | The player, the car if any, and the data, JSON already parsed | `false, "reason"` refuses. |
| Wire events | `greeter:hello`, any name of your own | The player and the data as a string | Doesn't matter. |

A name the server doesn't know is a wire event, a message from a client script ([Client scripts](/plugins/client-scripting/)). A client can't trigger a server event, and the server drops names that start with `node:`. Messages between plugins go over the [bus](/plugins/bus/), not through `node.on`.

Names follow these rules:

| What | Rule | Examples |
|---|---|---|
| Server events and notifications | `<subject><Verb-ed>` | `playerJoined`, `vehicleSpawned` |
| Requests | `<subject><Action>Request` | `vehicleSpawnRequest`, `chatMessageRequest` |
| Wire events and bus messages | `<plugin>:<what>`, lowercase | `race:start`, `score:add` |

Several handlers, from one plugin or several, can subscribe to one event; they run one after another ([Timers and coroutines](/plugins/concurrency/)). Subscribing the same function to the same event again replaces the first subscription.

## Join order

Joining a server, a player goes through these events:

1. `playerConnectRequest`: the player has connected and asks to join. Bans are already checked, and you can refuse here.
2. `playerAuthenticated`: the player is admitted. The name and address are known; there are no cars yet.
3. `playerJoining`: the mods are downloaded, the map is sent and the game is loading the level.
4. `playerJoined`: the player is in the world. The usual place to greet, give a role and restore saved data.

Leaving is one event, `playerLeft`, with the reason the session ended.

<!-- doctest: server+client -->
```lua
local function logConnectRequest(player, name)
    node.log("playerConnectRequest: %s", name)
end

node.on("playerConnectRequest", logConnectRequest)

local function logAuthenticated(player)
    node.log("playerAuthenticated: %s", player.name)
end

node.on("playerAuthenticated", logAuthenticated)

local function logJoining(player)
    node.log("playerJoining: %s", player.name)
end

node.on("playerJoining", logJoining)

local function logJoined(player)
    node.log("playerJoined: %s", player.name)
end

node.on("playerJoined", logJoined)

local function logLeft(player, reason)
    node.log("playerLeft: %s (%s)", player.name, reason)
end

node.on("playerLeft", logLeft)

-- expect: playerConnectRequest: Alice
-- expect: playerAuthenticated: Alice
-- expect: playerJoining: Alice
-- expect: playerJoined: Alice
-- expect: playerLeft: Alice
```

A dropped connection doesn't end the session at once. After `[network] lag_grace_sec` of silence the server fires `playerLagging`, and `playerRecovered` if the player comes back. `playerLeft` fires when:

- the player quits;
- the player is kicked;
- the player doesn't return within `[network] disconnect_sec`;
- the same account joins again while the old session waits on a dropped connection; the reason is then `Replaced`, and `playerLeft` comes before the new session's `playerAuthenticated`.

A player who reconnects in time doesn't go through the join events again.

Store a player's data under `player.accountId`, not `player.id` ([API conventions](/plugins/conventions/#which-ids-last)).

## Refusing a request

A request handler that returns `false` refuses, and the second value is the reason the player sees. The other handlers still run, and the player gets the first refusal's reason; only in chat does the first refusal end the chain. Returning nothing lets the request through.

<!-- doctest: server+client -->
```lua
local function admitAccountsOnly(player, name)
    if player.guest then
        return false, "This server is for players with an account"
    end
    node.log("%s may join", name)
end

node.on("playerConnectRequest", admitAccountsOnly)

-- expect: Alice may join
```

The same works for cars. Here a plugin keeps one model off the server:

<!-- doctest: server+client {"spawn": "coupe"} -->
```lua
local banned = { pickup = true }

local function refuseBannedModels(player, requestedId, config)
    node.log("%s wants a %s", player.name, config.jbm)
    if banned[config.jbm] then
        return false, "This car isn't allowed here"
    end
end

node.on("vehicleSpawnRequest", refuseBannedModels)

-- expect: Alice wants a coupe
```

Changes to a car's parts or settings come to `vehicleEditRequest` as a batch of what changed, but `config` always holds the car's whole configuration after the edit. A refusal rolls back only that batch, to the config the server accepted last. The player sees the reason on screen; without one the car rolls back silently.

To watch a request without interfering, return nothing. Which requests exist and what a refusal does in the game: [events reference](/plugins/api/events/#cancellable-requests-decide).

## Reserved slots

On a full server `playerConnectRequest` still fires, with `player.overCapacity` set to `true`. A handler that explicitly returns `true` lets the player in beyond `max_players`, and a single `false` refuses whatever the others answer. If nobody returns `true`, the server refuses with `Server full!`, or puts the player in the [join queue](/hosting/join-queue/) if the queue takes them; `playerLeft` then fires with the reason `Queued`.

<!-- doctest: server -->
```lua
local reserved = { [42] = true }

local function admitReserved(player)
    if player.overCapacity and reserved[player.accountId] then
        return true
    end
end

node.on("playerConnectRequest", admitReserved)
```

## Notifications

Notifications report what has already happened. You can't refuse them, but they carry details:

<!-- doctest: server+client {"spawn": "coupe"} -->
```lua
local function logSpawned(vehicle)
    node.log("car %d spawned by %s", vehicle.id, vehicle.name)
end

node.on("vehicleSpawned", logSpawned)

local function logDeleted(vehicle, cause)
    node.log("car %d deleted (%s)", vehicle.id, cause)
end

node.on("vehicleDeleted", logDeleted)

-- expect: car \d+ spawned by Alice
```

Log the chat in `chatMessage`: by then the server has decided what became of each line ([Chat and commands](/plugins/chat/)).

## Unsubscribing

`node.off(name, handler)` removes one handler, `node.off(name)` all of this plugin's handlers for the event. A handler can remove itself:

<!-- doctest: server+client -->
```lua
local function firstJoin(player)
    node.log("first player: %s", player.name)
    node.off("playerJoined", firstJoin)
end

node.on("playerJoined", firstJoin)

-- expect: first player: Alice
```

To run code after the other handlers have seen the event, use `node.defer(fn)` ([Timers and coroutines](/plugins/concurrency/#timers)).

## Events that fire many times a second

`vehiclePositionChanged`, `vehicleElectricsChanged` and similar events arrive with every packet of a car, up to 60 times a second per car. They pass only the car; read its current state with `vehicle:transform()` and similar methods. A handler that can't keep up sees fewer events, and no queue builds up. For a map or a radar, use a timer and one `node.vehicles.transforms()` call, which reads all cars at once ([Players and vehicles](/plugins/players-and-vehicles/#many-cars-at-once)).
