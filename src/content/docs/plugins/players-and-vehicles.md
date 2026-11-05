---
title: Players and vehicles
description: Player and Vehicle objects, finding players, roles, kicks and bans, freezing, teleporting, spawning cars, tags, locks and scheduled changes.
---

Handlers get players and cars as `Player` and `Vehicle` objects. One costs almost nothing: a table with an `id`, whose other fields the server fills in on first access. Every field and method is in the [API reference](/plugins/api/lua/#player-objects).

## Players

### Finding players

| Call | What it returns |
|---|---|
| `node.players.all()` | Every connected player, by ascending id. |
| `node.players.get(id)` | The player with this id; for an unknown id, a player whose `isConnected()` is `false`. |
| `node.players.find(name)` | The player with this name, ignoring case; `nil` if there is none. |
| `node.players.count()` | How many players are connected. |

`tostring(player)` looks like `Player#3 Alice`. Two objects for the same player are equal (`==`).

### Who a player is

| Field | What it means |
|---|---|
| `name` | The in-game name. Still available in `playerLeft`. |
| `accountId` | The NodeMP account number; `nil` for a guest. |
| `verified` | `true` if the server checked the player's ticket with NodeMP. Always `false` on a server not in the list. |
| `guest` | `true` if there is no account: Test Drive, or a join with nothing verified. |
| `accountRoles` | The account's role in NodeMP itself, such as `"ADM"`; empty for everyone else. |
| `locale` | The game language, such as `"ru_RU"`, to answer in. |
| `role` | The role on this server, set by a plugin with `player:setRole`. |
| `ip` | The player's address as text. |
| `installId` | The launcher installation as NodeMP names it to this server: 64 hex digits, different on every server. `nil` if the launcher didn't report one or the player isn't verified. Hidden from other players. |
| `identifiers` | An array of strings like `nodemp:<id>`, `discord:<id>`, `ip:<address>`. Empty for an unverified player. |

Fields are read on first access and kept in the object. To see later changes, say in a timer or a coroutine, call `player:refresh()` or take a new object from `node.players.get(id)`.

### Roles

A role is a word the server keeps for the session and the game shows next to the name. Here accounts listed in `[config]` become admins:

<!-- doctest: server+client {"config": {"admins": [42]}} -->
```lua
local admins = {}
for _, id in ipairs(node.config.admins or {}) do
    admins[id] = true
end

local function assignRole(player)
    if admins[player.accountId] then
        player:setRole("admin")
        node.log("%s is an admin", player.name)
    end
end

node.on("playerJoined", assignRole)

-- expect: Alice is an admin
```

### Kicks and bans

- `player:kick(reason)` disconnects the player, who sees the reason.
- `player:ban(reason)` bans the account (if the player signed in), the launcher installation (if the launcher reported one) and the address, then kicks.
- `player:ban(reason, os.time() + 3600)` bans for an hour; the server lifts the ban itself.
- `node.bans.add(who, reason, untilUnix)` bans the address, account number or `installId` of someone not on the server; `node.bans.remove(who)` lifts a ban.

Bans are stored in `bans.json` and survive a restart ([Console, kicks and bans](/hosting/administration/#bans)). A moderator command built on these calls: [Chat and commands](/plugins/chat/#commands-for-moderators).

### Freezing and teleporting

`player:freeze(true)` holds the player in place: their cars stand still for everyone, and spawns, edits, resets and seat changes are refused with `You are frozen by the server`. `player:freeze(false)` releases them. A freeze lasts for the session; a player who rejoins isn't frozen.

`player:teleport({ pos = { x = 0, y = 0, z = 1 } })` moves the car the player drives, or the player on foot, and repairs nothing. If it can't, it returns `nil` and a reason: `"not_driver"` for a passenger (move the car instead), `"no_avatar"` when the player has neither a car nor a character on foot yet, `"bad_transform"` or `"unknown player"`.

### Separate worlds

`player:setGroup(n)` and `vehicle:setGroup(n)` put players and cars into numbered groups; group 0 is the shared world. Players in different groups don't see each other's cars, and `local` chat stays inside the group. Move a player's cars along with the player.

## Vehicles

`node.vehicles.all()` returns the cars without players on foot, `node.vehicles.all(true)` with them. `node.vehicles.get(id)` returns one car; `node.vehicles.count()` counts all, players on foot included.

### Who's who in a car

| Field | What it means |
|---|---|
| `name` | The owner's label: the spawning player's name, or the name the server created the car with. |
| `spawner` | Who spawned the car; `nil` if the server created it or that player has left. |
| `driver` | Who is at the wheel, or `nil`. |
| `authority` | Whose game simulates the car; usually the driver. |
| `passengers` | The passengers, as a list of players. |
| `isUnicycle` | `true` for a player on foot, whom the server also counts as a car. |
| `idleSeconds` | How many seconds nobody has driven the car. |

A leaving player's cars stay in the world without an owner until a plugin deletes them, as `vehicle-cleanup` from the [examples](/plugins/examples/) does.

### Tags and locks

Tags are short `key = value` notes the server keeps on a car and sends to every player: a key of up to 64 bytes, a value of up to 256, at most 32 keys per car; anything over is refused. This handler tags every new car, including the one the `/car` command below spawns:

<!-- doctest: server+client -->
```lua
local function tagTeam(vehicle)
    vehicle:setTag("team", "red")
    node.log("car %d: team %s", vehicle.id, vehicle:tag("team"))
end

node.on("vehicleSpawned", tagTeam)

-- expect: car \d+: team red
```

`node.vehicles.byTag("team", "red")` finds every car with that tag.

`vehicle:lock("locked", { player })` lets only the listed players in, `"driver-only"` locks only the driver's seat, and `vehicle:unlock()` opens the car. The list can also hold `{ account = id }`, which survives a rejoin. A lock stops only new seatings and throws out nobody already inside. Until the plugin calls `vehicle:releaseLock()`, the owner's own setting doesn't change the lock.

### Spawning, moving, deleting

| Call | What it does |
|---|---|
| `player:spawnVehicle(config, transform)` | Spawns a car for the player and seats them in it. |
| `node.vehicles.spawn(config)` | Spawns a car without an owner. |
| `vehicle:teleport(transform)` | Moves the car without repairing it. |
| `vehicle:reset(transform)` | Repairs the car in place or at a new position. |
| `vehicle:delete()` | Deletes the car for everyone. |
| `player:seat(vehicle, "passenger")` | Seats the player in the car, past any lock. |
| `player:unseat()` | Takes the player out of the car. |

The config is the table the game sends when a player spawns a car: `jbm` is the model, `vcf` the parts configuration. A position is `{ pos = { x, y, z }, rot = { x, y, z, w } }`, with `rot` optional.

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/car"}]]} -->
```lua
local function spawnCar(player, msg)
    if msg.text ~= "/car" then return end
    local where = { pos = { x = 0, y = 0, z = 0.5 } }
    local car, err = player:spawnVehicle({ jbm = "pickup" }, where)
    if car then
        player:tell("Your car is number %d", car.id)
    else
        player:tell("No car: %s", err)
    end
    return { handled = true }
end

node.on("chatMessageRequest", spawnCar)

-- expect-client: Alice chat:msg .*Your car is number \d+
```

`cars_per_player` applies to `spawnVehicle` as to the player's own cars. The second value says why no car appeared (`"max_cars"`, `"bad_config"`, `"not_joined"`). `vehicleSpawnRequest` isn't called: the server doesn't ask itself for permission.

### Scheduled changes

To show another player's new car, or a change to its parts, tuning or model, the game builds the car and freezes meanwhile. So the client mod holds such changes back until the player is ready for them; what waits and when it is built is on [Settings](/players/settings/#other-players-new-cars-and-changes). `[vehicles]` in `server.toml` sets how a session starts ([Settings reference](/hosting/configuration/#vehicles)), and a plugin can change it while the server runs:

| Call | What it does |
|---|---|
| `node.vehicles.setQueue("off")` | Every change is built at once, for everyone; `"allow"` gives the choice back to players. |
| `node.vehicles.setQueueMaxDelay(10)` | Every player builds what is waiting no later than 10 seconds after the first change; `0` removes the limit. |
| `node.vehicles.applyScheduled()` | Every player builds everything waiting, now. |
| `player:setVehicleQueue("off")` | The same for one player; `nil` hands the decision back to the server. |
| `player:applyScheduled()` | One player builds everything waiting, now. |

Before a race starts, every car must look the same in every game:

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/start"}]]} -->
```lua
local function startRace(player, msg)
    if msg.text ~= "/start" then return end
    node.vehicles.setQueue("off")
    node.vehicles.applyScheduled()
    node.chat.say("The race starts in 10 seconds")
    return { handled = true }
end

node.on("chatMessageRequest", startRace)

-- expect-client: Alice chat:msg .*The race starts in 10 seconds
```

The server itself forwards one car's edits at most once per `[vehicles] edit_interval_sec`, as the latest configuration. `applyScheduled` sends such held-back edits first, so they are built too.

### Many cars at once

`node.vehicles.transforms` reads all cars in one call, and only the fields you ask for:

<!-- doctest: server+client -->
```lua
local function countCars()
    local cars = node.vehicles.transforms({ "pos" })
    node.log("%d car(s) reported", #cars)
end

node.every(1000, countCars)

-- expect: \d+ car\(s\) reported
```

Each entry holds the car's `id` and the requested fields: `pos`, `rot`, `vel` and others from the [reference](/plugins/api/lua/#nodevehiclestransformsselect---arrayrecordidposrotvelangveltimepingseqpausedtransitioningteleportvelocitystephascontrolscontrolselectricsageseconds).
