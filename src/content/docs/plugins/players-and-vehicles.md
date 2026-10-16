---
title: Players and vehicles
description: Player and Vehicle objects - who a player is, finding players, roles, kicks and bans, freezing and teleporting, spawning cars, tags and locks, seats, reading many cars at once.
---

Handlers receive players and cars as objects: a `Player` and a `Vehicle`. Both are light: a table
with an `id`, whose other fields are fetched from the server on first read. The full list of fields
and methods is in the [API reference](/plugins/api/lua/#player-objects).

## Players

### Finding players

| Call | Gives |
|---|---|
| `node.players.all()` | Every connected player, by id. |
| `node.players.get(id)` | The player with this id. |
| `node.players.find(name)` | The player with this name, any case; `nil` when nobody. |
| `node.players.count()` | How many are connected. |

`tostring(player)` reads `Player#3 Alice`. Two objects for the same player are equal (`==`).

### Who a player is

| Field | What it says |
|---|---|
| `name` | The name in the game. Still readable in `playerLeft`. |
| `accountId` | The NodeMP account's number; `nil` for a guest. The key to save anything by. |
| `verified` | `true` when the server checked the player's ticket with NodeMP. |
| `guest` | `true` without an account: Test Drive, or nothing verified. |
| `accountRoles` | NodeMP's own role for the account, such as `"ADM"`; empty for everyone else. |
| `locale` | The game's language, such as `"ru_RU"`, for answering in it. |
| `role` | This server's role, set by a resource with `player:setRole`. |

Fields are read once and kept on the object. Within one handler that's what you want; to see changes
later, call `player:refresh()` or get a fresh object with `node.players.get(id)`.

### Roles

A role is a word the server keeps for the session and the game shows next to the name. Here
accounts listed in `[config]` become admins:

<!-- doctest: server+client {"config": {"admins": [42]}} -->
```lua
local admins = {}
for _, id in ipairs(node.config.admins or {}) do
    admins[id] = true
end

node.on("playerJoined", function(player)
    if admins[player.accountId] then
        player:setRole("admin")
        node.log("%s is an admin", player.name)
    end
end)

-- expect: Alice is an admin
```

### Kicks and bans

- `player:kick(reason)` disconnects the player, who sees the reason.
- `player:ban(reason)` bans the account (if signed in) and the address, and kicks.
- `player:ban(reason, os.time() + 3600)` bans for an hour; the server lifts it by itself.
- `node.bans.add(who, reason, untilUnix)` bans an address or an account number of someone who isn't
  on the server; `node.bans.remove(who)` lifts a ban.

Bans are kept in `bans.json` and survive restarts ([Console, kicks and bans](/hosting/administration/#bans)).
A moderation command with these calls is on [Chat and commands](/plugins/chat/#commands-for-moderators).

### Freezing and teleporting

`player:freeze(true)` holds the player in place: their cars stop for everyone, and spawns, resets
and seat changes are refused with `You are frozen by the server`. `player:freeze(false)` lets go.

`player:teleport({ pos = { x = 0, y = 0, z = 1 } })` moves the car the player drives, or the player
on foot, without repairing anything. Both look right in the player's game since client mod 1.7.4;
with an older mod a teleport repairs the car.

### Separate worlds

`player:setGroup(n)` and `vehicle:setGroup(n)` put players and cars into numbered groups. Group 0 is
the shared world; players in different groups don't see each other's cars, and `local` chat stays
within a group. Move a player's cars together with the player.

## Vehicles

### Who's who in a car

| Field | What it says |
|---|---|
| `spawner` | The player who spawned it; `nil` for a car the server spawned. |
| `driver` | The player at the wheel; `nil` when empty. |
| `authority` | The player whose game simulates the car; usually the driver. |
| `passengers` | The passengers, as a list of players. |
| `isUnicycle` | `true` for a player walking on foot: the server sees walkers as vehicles too. |
| `idleSeconds` | How long nobody has driven it. |

When a player leaves, their cars stay in the world without an owner. Deleting them is up to a
resource; `vehicle-cleanup` in the [examples](/plugins/examples/) does it.

### Tags and locks

Tags are short `key = value` notes the server keeps on a car and sends to every player. This
handler tags every new car, including the one the `/car` command below spawns:

<!-- doctest: server+client -->
```lua
node.on("vehicleSpawned", function(vehicle)
    vehicle:setTag("team", "red")
    node.log("car %d: team %s", vehicle.id, vehicle:tag("team"))
end)

-- expect: car \d+: team red
```

`node.vehicles.byTag("team", "red")` finds every car with that tag.

`vehicle:lock("locked", { player })` lets only the listed players take a seat; `"driver-only"`
keeps the driver's seat for them; `vehicle:unlock()` opens it. A lock only stops new seats: nobody
already inside is thrown out.

### Spawning, moving, deleting

| Call | What it does |
|---|---|
| `player:spawnVehicle(config, transform)` | Spawns a car for the player and seats them in it. |
| `node.vehicles.spawn(config)` | Spawns a car without an owner. |
| `vehicle:teleport(transform)` | Moves the car without repairing it. |
| `vehicle:reset(transform)` | Repairs the car, where it stands or at a new place. |
| `vehicle:delete()` | Deletes the car for everyone. |
| `player:seat(vehicle, "passenger")` | Puts a player into a seat, past any lock. |
| `player:unseat()` | Puts the player on foot. |

A config is the same table the game sends when a player spawns: `jbm` is the model, `vcf` the
configuration. A transform is `{ pos = { x, y, z }, rot = { x, y, z, w } }`, and `rot` may be left
out.

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/car"}]]} -->
```lua
node.on("chatMessageRequest", function(player, msg)
    if msg.text ~= "/car" then return end
    local where = { pos = { x = 0, y = 0, z = 0.5 } }
    local car, err = player:spawnVehicle({ jbm = "pickup" }, where)
    if car then
        player:tell("Your car is number %d", car.id)
    else
        player:tell("No car: %s", err)
    end
    return { handled = true }
end)

-- expect-client: Alice chat:msg .*Your car is number \d+
```

`cars_per_player` applies to `spawnVehicle` as it does to the player's own spawns: the second value says why
a spawn didn't happen (`"max_cars"`, `"bad_config"`, `"not_joined"`).

### Scheduled changes

A new car, or a change of a car's parts, tuning or model, has to be built in every other player's
game, and building stops the game for a moment. So each player's mod holds other players' new cars
and changes until the player stops, a set time passes, or they click the count in the session
panel ([what players see](/players/settings/#other-players-new-cars-and-changes)). Deletions,
resets, colour changes and the car a player sits in never wait. `[vehicles]` in `server.toml` sets
how a session starts ([settings](/hosting/configuration/#vehicles)); a resource can change it while
the server runs:

| Call | What it does |
|---|---|
| `node.vehicles.setQueue("off")` | Every change is built the moment it arrives, for everyone. `"allow"` gives the choice back to the players. |
| `node.vehicles.setQueueMaxDelay(10)` | Every player builds what waits within 10 seconds of the first change; `0` lifts the limit. |
| `node.vehicles.applyScheduled()` | Every player builds everything waiting, now. |
| `player:setVehicleQueue("off")` | The same for one player; `nil` follows the server's mode again. |
| `player:applyScheduled()` | One player builds everything waiting, now. |

Before a race start every car should look the same in every game:

<!-- doctest: skip needs a server newer than the published release -->
```lua
node.on("chatMessageRequest", function(player, msg)
    if msg.text ~= "/start" then return end
    node.vehicles.setQueue("off")
    node.vehicles.applyScheduled()
    node.chat.say("The race starts in 10 seconds")
    return { handled = true }
end)
```

The server itself relays the edits of one car at most once per `edit_interval_sec`, as the latest
config; `applyScheduled` sends what it still holds first, so those are built too.

### Many cars at once

Reading every car one by one in a fast loop is slow. `node.vehicles.transforms` reads all of them in
one call, and only the fields you ask for:

<!-- doctest: server+client -->
```lua
node.every(1000, function()
    local cars = node.vehicles.transforms({ "pos" })
    node.log("%d car(s) reported", #cars)
end)

-- expect: \d+ car\(s\) reported
```

Each entry has the car's `id` and the fields asked for: `pos`, `rot`, `vel` and more, as listed in
the [reference](/plugins/api/lua/#nodevehiclestransformsselect---arrayrecordidposrotvelangveltimepingseqpausedtransitioningteleportvelocitystephascontrolscontrolselectricsageseconds).
