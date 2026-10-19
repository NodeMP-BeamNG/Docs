---
title: Players and vehicles
description: Player and Vehicle objects, finding players, roles, kicks and bans, freezing, teleporting, spawning cars, tags, locks and scheduled changes.
---

Handlers receive players and cars as `Player` and `Vehicle` objects. An object costs almost nothing: it is a table with an `id`, and the server supplies the other fields on first access. All fields and methods are listed in the [API reference](/plugins/api/lua/#player-objects).

## Players

### Finding players

| Call | What it returns |
|---|---|
| `node.players.all()` | Every connected player, in ascending id order. |
| `node.players.get(id)` | The player with this id. For an unknown id it returns a player whose `isConnected()` is `false`. |
| `node.players.find(name)` | The player with this name, ignoring case; `nil` if there is none. |
| `node.players.count()` | How many players are connected. |

`tostring(player)` looks like `Player#3 Alice`. Two objects for the same player are equal (`==`).

### Who a player is

| Field | What it means |
|---|---|
| `name` | The in-game name. Still available in `playerLeft`. |
| `accountId` | The NodeMP account number; `nil` for a guest. |
| `verified` | `true` if the server checked the player's ticket with NodeMP. Always `false` on a server that is not in the list. |
| `guest` | `true` if there is no account: Test Drive, or a join with nothing verified. |
| `accountRoles` | The account's role in NodeMP itself, for example `"ADM"`; an empty string for everyone else. |
| `locale` | The game language, for example `"ru_RU"`, so you can answer in it. |
| `role` | The role on this server, set by a plugin with `player:setRole`. |
| `ip` | The player's address as text. |
| `installId` | The launcher installation as NodeMP names it to the server: 64 hexadecimal digits, different on every server. `nil` if the launcher didn't report one or the player isn't verified. Other players can't see it. |
| `identifiers` | An array of strings like `nodemp:<id>`, `discord:<id>`, `ip:<address>`. Empty for an unverified player. |

Fields are read on first access and kept in the object. To see changes later, for example in a timer or a coroutine, call `player:refresh()` or get a new object with `node.players.get(id)`.

### Roles

A role is a word the server keeps for the session and the game shows next to the name. Here the accounts listed in `[config]` become admins:

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
- `player:ban(reason)` bans the account (if the player signed in), the launcher installation (if the launcher reported one) and the address, and kicks the player.
- `player:ban(reason, os.time() + 3600)` bans for an hour, and the server lifts the ban itself.
- `node.bans.add(who, reason, untilUnix)` bans an address, an account number or an `installId` of someone who isn't on the server; `node.bans.remove(who)` lifts a ban.

Bans are stored in `bans.json` and survive a restart ([Console, kicks and bans](/hosting/administration/#bans)). A moderator command that uses these calls is on [Chat and commands](/plugins/chat/#commands-for-moderators).

### Freezing and teleporting

`player:freeze(true)` holds the player in place: their cars stand still for everyone, and spawns, edits, resets and seat changes are refused with `You are frozen by the server`. `player:freeze(false)` lets go. The freeze lasts until the end of the session: a player who joins again isn't frozen.

`player:teleport({ pos = { x = 0, y = 0, z = 1 } })` moves the car the player drives, or the player if on foot, and repairs nothing. If nothing can be moved, the call returns `nil` and a reason: `"not_driver"` for a passenger (move the car instead), `"no_avatar"` when the player has neither a car nor an avatar yet, `"bad_transform"` or `"unknown player"`.

### Separate worlds

`player:setGroup(n)` and `vehicle:setGroup(n)` put players and cars into numbered groups. Group 0 is the shared world. Players in different groups don't see each other's cars, and `local` chat stays inside the group. Move a player's cars together with the player.

## Vehicles

`node.vehicles.all()` returns the cars without walking avatars, and `node.vehicles.all(true)` returns them too. `node.vehicles.get(id)` returns one car, and `node.vehicles.count()` counts all of them, avatars included.

### Who's who in a car

| Field | What it means |
|---|---|
| `name` | The owner's label: the name of the player who spawned the car, or the name the server created it with. |
| `spawner` | Who spawned the car; `nil` if the server created it or that player has left. |
| `driver` | Who is at the wheel; `nil` if nobody is. |
| `authority` | Whose game simulates the car; usually the driver. |
| `passengers` | The passengers, as a list of players. |
| `isUnicycle` | `true` for a walking player: the server counts a player on foot as a car too. |
| `idleSeconds` | How many seconds nobody has driven the car. |

When a player leaves, their cars stay in the world without an owner. A plugin has to delete them; `vehicle-cleanup` from the [examples](/plugins/examples/) does.

### Tags and locks

Tags are short `key = value` notes that the server keeps on a car and sends to every player. A key is at most 64 bytes, a value at most 256, and a car has at most 32 keys; anything over is refused. This handler tags every new car, including the one the `/car` command below spawns:

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

`vehicle:lock("locked", { player })` lets only the listed players into the car, `"driver-only"` locks only the driver's seat, and `vehicle:unlock()` opens the car. The list can also hold `{ account = id }`, which survives the player rejoining. A lock stops only new seatings: it doesn't throw out anyone already inside. Until the plugin calls `vehicle:releaseLock()`, the car owner's own setting doesn't change the lock.

### Spawning, moving, deleting

| Call | What it does |
|---|---|
| `player:spawnVehicle(config, transform)` | Spawns a car for the player and seats them in it. |
| `node.vehicles.spawn(config)` | Spawns a car without an owner. |
| `vehicle:teleport(transform)` | Moves the car without repairing it. |
| `vehicle:reset(transform)` | Repairs the car where it stands or at a new place. |
| `vehicle:delete()` | Deletes the car for everyone. |
| `player:seat(vehicle, "passenger")` | Seats the player in the car, past any lock. |
| `player:unseat()` | Takes the player out of the car. |

The config is the same table the game sends when a player spawns a car: `jbm` is the model and `vcf` the parts configuration. Give a position as `{ pos = { x, y, z }, rot = { x, y, z, w } }`; `rot` can be left out.

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

`cars_per_player` applies to `spawnVehicle` as it does to the player's own cars. The second return value says why no car appeared (`"max_cars"`, `"bad_config"`, `"not_joined"`). `vehicleSpawnRequest` isn't called: the server doesn't ask itself for permission.

### Scheduled changes

To show another player's new car, or a change to a car's parts, tuning or model, the game builds the car and freezes for that time. So the client mod holds such changes back until the player is ready to take them. What waits and when it is built: [Settings](/players/settings/#other-players-new-cars-and-changes). How a session starts is set by `[vehicles]` in `server.toml` ([settings reference](/hosting/configuration/#vehicles)), and a plugin can change it while the server runs:

| Call | What it does |
|---|---|
| `node.vehicles.setQueue("off")` | Every change is built at once, for everyone. `"allow"` gives the choice back to the players. |
| `node.vehicles.setQueueMaxDelay(10)` | Every player builds what is waiting no later than 10 seconds after the first change; `0` removes the limit. |
| `node.vehicles.applyScheduled()` | Every player builds everything that is waiting, right now. |
| `player:setVehicleQueue("off")` | The same for one player; `nil` hands the decision back to the server. |
| `player:applyScheduled()` | One player builds everything that is waiting, right now. |

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

The server itself forwards the edits of one car at most once per `[vehicles] edit_interval_sec`, as the latest configuration. `applyScheduled` first sends such held-back edits, so they get built too.

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

Each entry has the car's `id` and the fields you asked for: `pos`, `rot`, `vel` and others from the [reference](/plugins/api/lua/#nodevehiclestransformsselect---arrayrecordidposrotvelangveltimepingseqpausedtransitioningteleportvelocitystephascontrolscontrolselectricsageseconds).
