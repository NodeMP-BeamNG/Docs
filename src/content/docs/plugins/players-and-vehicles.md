---
title: Players and vehicles
description: Player and Vehicle objects - who a player is, roles, reserved slots, bans, teleporting and freezing, tags and locks, and reading every car at once.
---

Your handlers receive `Player` and `Vehicle` objects. This page is what you can read from them and
do with them. Every field and method is in the [Lua API reference](/plugins/api/lua/#player-objects);
here are the ones you'll use, with the reasons behind them.

## How the objects work

A `Player` is a small table holding `id`. The first time you read another field, it fetches the
player's record from the server and keeps it on the object; `player:refresh()` drops that copy.
Methods act by id, so they always reach the live player. The same goes for a `Vehicle`.

- `node.players.get(id)` and `node.vehicles.get(id)` are cheap (nothing is fetched until you read a
  field), so they're fine inside a handler that runs 60 times a second.
- Two objects are `==` when their ids match. `tostring(player)` reads `Player#3 Alice`,
  `tostring(vehicle)` reads `Vehicle#12 Alice`.
- Ids are reused after someone leaves. `player:isConnected()` and `vehicle:exists()` tell you
  whether the id still points at something, not whether it's the same player as before.

## Who a player is

| Field | What it is |
|---|---|
| `player.name` | The display name. Still readable in `playerLeft`. |
| `player.accountId` | The player's NodeMP account number, or `nil` for a guest. It stays the same across sessions, names and networks: **keep long-lived data under this**. |
| `player.verified` | `true` when the server list vouched for the player's identity. `false` on a server without a server list key, or a join without a ticket. |
| `player.guest` | `true` when there's no account behind the name, as in a Test Drive. `verified and not guest` means a signed-in account. |
| `player.ip` | The address as text. Changes with the player's network; prefer `accountId`. |
| `player.role` | The role a plugin gave this session, `""` when none. |
| `player.accountRoles` | The account's role on the NodeMP website (`"ADM"` for its admins, `""` for everyone else). Not the same as `role`. |
| `player.vehicle`, `player.seatRole` | The car the player sits in (`nil` on foot) and `"driver"`, `"passenger"` or `"none"`. |
| `player.locale` | The language the player's game runs in, such as `"ru_RU"`. Empty from a client mod older than 1.7.4 ([Chat → In the player's language](/plugins/chat/#in-the-players-language)). |
| `player.overCapacity` | `true` when the player came in over the server's player limit ([below](#reserved-slots)). |
| `player.frozen` | `true` while a resource holds the player frozen ([below](#freezing-a-player)). |

<!-- doctest: server+client -->
```lua
node.on("playerJoined", function(player)
    if player.guest then
        node.log("%s is a guest", player.name)
    elseif player.verified then
        node.log("%s is account %d", player.name, player.accountId)
    else
        node.log("%s is not verified (no server list on this server)", player.name)
    end
end)

-- expect: Alice is account 42
```

To find players: `node.players.all()` (everyone, by id), `node.players.count()`,
`node.players.find(name)` (case-insensitive), `node.players.get(id)`.

## Roles

A role is a word your resource gives a player for this session: `"admin"`, `"mod"`, `"vip"`,
anything. Players see it as a tag beside the name, and your commands can check it
([Chat → Many commands, some for admins](/plugins/chat/#many-commands-some-for-admins)). Roles are
per session: give them again in `playerJoined`, usually from a list in your settings.

<!-- doctest: server+client {"config": {"admins": [42]}} -->
```lua
local admins = {}
for _, id in ipairs(node.config.admins or {}) do admins[id] = true end

node.on("playerJoined", function(player)
    if player.accountId and admins[player.accountId] then
        player:setRole("admin")
        node.log("%s is an admin", player.name)
    end
end)

-- expect: Alice is an admin
```

The host writes the account numbers in your `resource.toml`:

```toml
[config]
admins = [42, 108]
```

## Reserved slots

When the server is full, it still asks your `playerConnectRequest` handler, with
`player.overCapacity` set to `true` and the account already known. Return `true` and the player gets
in past the limit; return nothing and the server refuses them with "Server full!" as usual. This is
how you keep a place for admins, members or the people who pay for the server:

<!-- doctest: server+client {"config": {"reserved": [42]}} -->
```lua
local reserved = {}
for _, id in ipairs(node.config.reserved or {}) do reserved[id] = true end

node.on("playerConnectRequest", function(player)
    if not player.overCapacity then return end -- there is room: nothing to decide
    if player.accountId and reserved[player.accountId] then
        node.log("%s takes a reserved slot", player.name)
        return true
    end
end)

node.on("playerJoined", function(player)
    node.log("%s joined, over the limit: %s", player.name, tostring(player.overCapacity))
end)

-- expect: Alice joined, over the limit: false
```

Only an explicit `true` lets someone in over the limit, and a `false` from any handler still
refuses. Silence keeps the old behaviour, so a resource that doesn't know about reserved slots
changes nothing. `player.overCapacity` stays `true` for the whole session, should you want to treat
such players differently later.

## Kicking and banning

- `player:kick(reason)` disconnects the player and shows them the reason (`"Kicked"` if you give
  none).
- `player:ban(reason)` bans and kicks. The ban covers the player's account when they're signed in
  (so it follows them to any network) and their IP always.
- `node.bans.add(who, reason)` bans for the future without kicking: `who` is an IP string or an
  account number. `node.bans.remove(who)`, `node.bans.has(who)` and `node.bans.all()` do the rest.

Both ban calls take an end time as a third argument, in Unix seconds. The server lifts such a ban by
itself when the time comes, even across restarts, so you need no timer of your own:

<!-- doctest: server -->
```lua
local HOUR = 60 * 60

-- a two-hour ban for an address, without kicking anybody
node.bans.add("203.0.113.9", "Spamming", os.time() + 2 * HOUR)

for _, ban in ipairs(node.bans.all()) do
    if ban.ip == "203.0.113.9" then
        node.log("banned until %s", os.date("!%Y-%m-%d %H:%M UTC", ban["until"]))
    end
end
node.bans.remove("203.0.113.9")

-- expect: banned until \d{4}-\d\d-\d\d \d\d:\d\d UTC
```

With a player it's `player:ban("Spamming", os.time() + 2 * HOUR)`. `until` is a Lua keyword, which
is why the field is read as `ban["until"]`; a ban for good has none.

Bans are kept in `bans.json` next to `server.toml`, the same list the host manages
([Administration → Bans](/hosting/administration/#bans)). A complete `/kick` and
`/ban` for chat is in [Recipes](/plugins/recipes/#kick-and-ban-from-chat).

## Moving players

`player:seat(vehicle, role)` puts a player in a car as `"driver"` (the default) or `"passenger"`,
ignoring locks; `player:unseat()` puts them on foot; `player:swapWith(other)` swaps two players'
seats. `player:spawnVehicle(config, transform)` makes a car for the player and seats them in it:

<!-- doctest: server+client -->
```lua
node.on("playerJoined", function(player)
    local car, err = player:spawnVehicle(
        { jbm = "pickup", vcf = { parts = {} } },
        { pos = { x = 0, y = 0, z = 1 } }
    )
    if car then
        node.log("%s got vehicle %d", player.name, car.id)
    else
        node.log("no car for %s: %s", player.name, err)
    end
end)

-- expect: Alice got vehicle \d+
```

The config is the same shape the game spawns with: `jbm` is the model, `vcf` the parts, variables
and paint. On failure you get `nil` and `"not_joined"`, `"max_cars"` or `"bad_config"`. The
server's car limit applies, and `vehicleSpawnRequest` isn't asked: the server doesn't refuse itself.

### Teleporting

`player:teleport(transform)` moves whatever the player is in, their car or their walking self, to
another place. Nothing is repaired: damage, fuel and cargo stay as they were. That's the difference
from `vehicle:reset(transform)`, which repairs the car as it moves it.

<!-- doctest: server+client {"spawn": "coupe"} -->
```lua
local GARAGE = { pos = { x = -24.5, y = 610.0, z = 75.2 } }

node.on("vehicleSpawned", function(vehicle)
    local player = vehicle.spawner
    if not player or vehicle.isUnicycle then return end
    local ok, err = player:teleport(GARAGE)
    node.log("%s to the garage: %s", player.name, ok and "done" or err)
end)

-- expect: Alice to the garage: done
```

`transform` is `{ pos = { x, y, z }, rot = { x, y, z, w } }`; without `rot` the car keeps facing
the way it did. When it can't, you get `nil` and a reason: `"not_driver"` for a passenger (move the
car instead, with `vehicle:teleport`), `"no_avatar"` when the player has nothing in the world yet,
`"bad_transform"`. The `vehicleTeleported` event follows. Players on a client mod older than 1.7.4
see the car repaired, as on a reset.

### Freezing a player

`player:freeze(true)` holds a player where they are, for a briefing, a race start or while an admin
looks into something. The server stops passing on their car's movement, so to everyone else it
stands still, and refuses their spawns, edits, resets and seat changes with
"You are frozen by the server". The player's game (client mod 1.7.4 and later) holds the car too.
`player:freeze(false)` lets go.

<!-- doctest: server+client -->
```lua
node.on("playerFrozenChanged", function(player)
    player:tell(player.frozen and "Hold on, you're frozen for the start" or "Go!")
end)

node.on("playerJoined", function(player)
    player:freeze(true)
    node.after(3000, function()
        if player:isConnected() then player:freeze(false) end
    end)
end)

-- expect-client: Alice chat:msg .*you're frozen for the start
-- expect-client: Alice chat:msg .*Go!
```

Freezing is per session: a player who leaves and comes back is free. If you keep a list of frozen
players, freeze them again in `playerJoined`.

## Vehicles

| Field | What it is |
|---|---|
| `vehicle.spawner`, `vehicle.driver`, `vehicle.authority` | Players: who spawned it, who's at the wheel, whose game simulates it. `nil` when nobody. |
| `vehicle.passengers` | An array of Players. |
| `vehicle.isUnicycle` | `true` for a walking player. Walkers are vehicles to the server; `node.vehicles.all()` leaves them out unless you pass `true`. |
| `vehicle.idleSeconds` | How long nobody has driven it. |
| `vehicle.tags` | Your tags as key to value. |
| `vehicle.partsHash` | A number that is the same for two cars with the same model, parts and tuning, wherever they stand. |

What changes every frame (`transform`, `controls`, `electrics`, `damage`, `config`) is a method,
because each call is a fresh read: `vehicle:transform().pos`, `vehicle:electrics().rpm`.

`vehicle:delete()` removes it for everyone. `vehicle:reset(transform)` repairs it where it stands,
or at the place you give; `vehicle:teleport(transform)` moves it without repairing anything.
`vehicle:trigger(call)` presses a control on it. `vehicle:setCoupler(name, open)` opens or closes a
door or coupler.

### Tags

Tags are your notes on a car: up to 32 keys per car, values up to 256 characters. Every player's game
receives them, and `node.vehicles.byTag(key, value)` finds cars by them.

<!-- doctest: server+client {"spawn": "coupe"} -->
```lua
node.on("vehicleSpawned", function(vehicle)
    if vehicle.isUnicycle then return end
    local owner = vehicle.spawner
    if owner and owner.accountId then
        vehicle:setTag("owner", owner.accountId)
    end
    node.log("%s, owner tag %s", tostring(vehicle), tostring(vehicle:tag("owner")))
end)

-- expect: Vehicle#\d+ Alice, owner tag 42
```

### Locks

A lock decides who may get into a car: `"unlocked"`, `"locked"` (only the people you list) or
`"driver-only"` (anyone may drive, nobody rides along). Players set one for their own cars in the
game's settings; a resource can take over with `vehicle:lock(mode, whitelist)`. From then on the
player's setting doesn't touch that car until you call `vehicle:releaseLock()`. Nobody already
seated is thrown out, and `player:seat` ignores locks.

<!-- doctest: server+client {"spawn": "coupe"} -->
```lua
node.on("vehicleSpawned", function(vehicle)
    if vehicle.isUnicycle or not vehicle.spawner then return end
    vehicle:lock("locked", { vehicle.spawner })
    local state = vehicle:lockState()
    node.log("%s is %s, set by %s", tostring(vehicle), state.mode, state.owner)
end)

-- expect: Vehicle#\d+ Alice is locked, set by plugin
```

The whitelist takes Players and `{ account = <number> }` entries; an account entry lets that account
in after a reconnect too.

## Reading the world fast

For a radar, a minimap, a speed trap or a race, don't subscribe to a stream per car. Read every car
at once on a timer with `node.vehicles.transforms(select)`. `select` names what you need, and the
server sends only that:

<!-- doctest: server -->
```lua
local LIMIT_KMH = 150

node.every(1000, function()
    local cars = node.vehicles.transforms({ "pos", "vel" })
    for _, car in ipairs(cars) do
        local v = car.vel
        local kmh = math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) * 3.6
        if kmh > LIMIT_KMH then
            local driver = node.vehicles.get(car.id).driver
            if driver then driver:tell("Slow down: %d km/h", math.floor(kmh)) end
        end
    end
    node.log("radar sees %d car(s)", #cars)
end)

-- expect: radar sees \d+ car\(s\)
```

Each entry has `id` and what you asked for. The forms of `select`:

| `select` | You get |
|---|---|
| nothing | every field: `pos`, `rot`, `vel`, `angVel`, `ageSeconds`, `controls`, `electrics` and more |
| `{ "pos", "vel" }` | only those fields |
| `{ "pos", electrics = { "rpm", "wheelspeed" } }` | positions and two electrics values |
| `{ "pos", controls = true }` | positions and the driver's inputs |
| `{ "pos", ids = { 3, 7 } }` | only cars 3 and 7 |

Only cars that have sent at least one position are listed. `pos` and `vel` are tables with `x`, `y`
and `z`. `node.server.snapshot()` is the other bulk read: players with their positions and seats,
and vehicles, in one call.

## Visibility groups

A visibility group is a numbered world. Players and cars in the same group see each other; group
`0` is the shared world everyone starts in. Moving a player doesn't move their cars, so move both:

<!-- doctest: server -->
```lua
local function moveToRoom(player, room)
    player:setGroup(room)
    for _, vehicle in ipairs(player:vehicles()) do
        vehicle:setGroup(room)
    end
end
```

Groups cost nothing per packet and need no cache, so they're the right tool for rooms, races and
private sessions. For anything finer, use the [relay filter](/plugins/events/#the-relay-filter).

## Next

- [Chat](/plugins/chat/): talking to players and taking commands.
- [Lua API reference](/plugins/api/lua/#player-objects): every field and method.
