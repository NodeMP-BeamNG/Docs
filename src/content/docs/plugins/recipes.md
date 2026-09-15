---
title: Recipes
description: Six resources to copy - a chat command, roles and groups, teleport, persistence, an HTTP webhook, kick and ban - with the log lines to expect.
---

Each recipe is one resource: a folder under `resources/` named after the recipe, with
`server/main.lua` and, where a client half is needed, `client/main.lua`. Every call is in the
[Lua API reference](/plugins/api/lua/); nothing here needs a native module. Four of the six use
chat commands or `player:tell`, which speak through the `chat` resource - copy `examples/chat`
into `resources/` as well, or the commands vanish silently and the replies go nowhere. The server
console tags each line with the resource's name, so the log lines below are what you will see.

## A chat command

**Goal:** `/online` answers the player with who is connected.

```lua
-- resources/online/server/main.lua
node.commands.add("online", function(player, args, raw)
    local names = {}
    for _, p in ipairs(node.players.all()) do
        names[#names + 1] = p.name
    end
    player:tell("%d online: %s", #names, table.concat(names, ", "))
    node.log("%s asked who is online", tostring(player))
end)
```

`node.commands.add(name, fn, opts?)` registers a handler for the chat line `/name ...`: `fn`
receives the sender as a `Player`, the words after the name as an array and the whole line. Names
are case-insensitive, one handler per name per resource, `node.commands.remove(name)` takes it
back. The `chat` resource publishes every `/` line on the bus as `chat:command`, so a command
nobody registered is simply dropped - never shown in chat.

Alice types `/online` and sees `2 online: Alice, Bob` as a system line. The console prints:

```
online · Player#0 Alice asked who is online
```

## Permissions by role and group

**Goal:** promote known accounts to `admin`, gate a command on the role, and let admins open
visibility groups.

```toml
# resources/perms/resource.toml
name = "perms"

[config]
admins = [42, 108]   # directory account ids
```

```lua
-- resources/perms/server/main.lua
local admins = {}
for _, id in ipairs(node.config.admins or {}) do admins[id] = true end

local function promote(player)
    if player.accountRoles == "ADM" or (player.accountId and admins[player.accountId]) then
        player:setRole("admin")
        node.log("%s is admin (account %s)", tostring(player), tostring(player.accountId))
    end
end

node.on("playerJoined", promote)
for _, p in ipairs(node.players.all()) do promote(p) end -- players already here after a reload

-- opts.role: the prelude refuses the command for everyone else
node.commands.add("say", function(player, args)
    node.chat.say("[%s] %s", player.name, table.concat(args, " "))
end, { role = "admin" })

-- an explicit check, for a rule opts.role cannot express
node.commands.add("lobby", function(player, args)
    local n = tonumber(args[1]) or 0
    if n ~= 0 and player.role ~= "admin" then
        player:tell("Only admins open lobbies; /lobby 0 takes you back")
        return
    end
    player:setGroup(n)
    for _, v in ipairs(player:vehicles()) do v:setGroup(n) end
    player:tell("You are now in world %d", n)
end)
```

Three identities are in play. `player.accountId` is the directory's account id - stable across
sessions and addresses, `nil` for a Test Drive guest - and the only thing worth keying an admin
list by. `player.accountRoles` is the directory's role string, `"ADM"` for a directory admin.
`player.role` is this server's own per-session label, set with `player:setRole` and cleared at
disconnect, which is why `promote` runs at every join. `{ role = "admin" }` makes the prelude
answer `You are not allowed to use /say` to anyone else before your handler runs.

`player:setGroup(n)` puts the player in visibility group `n`: players and vehicles see each other
only when their numbers match, and `0` is the world everyone shares. A vehicle keeps its own
number, so move the player's cars along. The console shows each promotion:

```
perms · Player#0 Alice is admin (account 42)
```

## Teleport and transform

**Goal:** `/where` reads the position the server holds for your car; `/tp <player>` moves your
car next to another player's.

The server never moves a vehicle itself - positions come from the client that simulates it - so
the teleport is a wire event to the player's own client half, which sets the position in the game.

```lua
-- resources/tp/server/main.lua
node.commands.add("where", function(player)
    local veh = player.vehicle
    local t = veh and veh:transform()
    if not t then
        player:tell("No position yet - sit in a car and move")
        return
    end
    local speed = math.sqrt(t.vel.x ^ 2 + t.vel.y ^ 2 + t.vel.z ^ 2)
    player:tell("%s at %.1f %.1f %.1f, %.1f m/s", tostring(veh), t.pos.x, t.pos.y, t.pos.z, speed)
end)

node.commands.add("tp", function(player, args)
    local target = node.players.find(args[1] or "")
    if not target then
        player:tell("Usage: /tp <player>")
        return
    end
    local pos = target:position()
    if not pos or not player.vehicle then
        player:tell("%s has no position yet, or you are on foot", target.name)
        return
    end
    player:send("tp:to", { x = pos.x + 3, y = pos.y, z = pos.z + 0.5 })
    node.log("%s -> %s (%.1f, %.1f, %.1f)", tostring(player), tostring(target), pos.x, pos.y, pos.z)
end)
```

```lua
-- resources/tp/client/main.lua
node.on("tp:to", function(data)
    local to = jsonDecode(data)
    local veh = be:getPlayerVehicle(0)
    if not veh then return end
    local rot = quat(veh:getRotation())
    veh:setPositionRotation(to.x, to.y, to.z, rot.x, rot.y, rot.z, rot.w)
    node.log(string.format("teleported to %.1f %.1f %.1f", to.x, to.y, to.z))
end)
```

`vehicle:transform()` is the last position snapshot the vehicle's sync authority sent - `pos`,
`vel` and `angVel` as `{x, y, z}`, `rot` as `{x, y, z, w}`, a few ticks old by construction,
`nil` before the first snapshot. `player:position()` is the same point for a player, from the
vehicle it occupies or its walking avatar. The client half receives the target as JSON text,
keeps the car's current rotation and calls the game's `setPositionRotation`; the new position then
travels back to the server and everyone else through the normal position stream. On the server:

```
tp · Player#1 Bob -> Player#0 Alice (12.3, -45.6, 7.8)
```

and in Bob's `beamng.log`, under `node.events`: `teleported to 15.3 -45.6 8.3`.

## Persistence

**Goal:** count visits and play time per account across restarts.

```lua
-- resources/playtime/server/main.lua
local sessions = {} -- [player.id] = { since, account }; ids are reused, so this table is per session

node.on("playerJoined", function(player)
    sessions[player.id] = { since = node.server.unixTime(), account = player.accountId }
    if not player.accountId then return end -- a guest has no durable identity
    local visits = node.storage.get("visits:" .. player.accountId, 0) + 1
    node.storage.set("visits:" .. player.accountId, visits)
    local played = node.storage.get("playtime:" .. player.accountId, 0)
    player:tell("Welcome back, %s - visit %d, %d min played", player.name, visits, math.floor(played / 60))
end)

node.on("playerLeft", function(player)
    local s = sessions[player.id]
    sessions[player.id] = nil
    if not s or not s.account then return end
    local seconds = node.server.unixTime() - s.since
    local total = node.storage.get("playtime:" .. s.account, 0) + seconds
    node.storage.set("playtime:" .. s.account, total)
    node.log("%s played %d s, %d s in total", tostring(player), seconds, total)
end)
```

`node.storage` is a key/value store per resource: `get(key, default)`, `set(key, value)` with any
JSON-serialisable value, `delete(key)`. Each `set` is appended to `storage/playtime.log` (next to
`resources/`) before it returns, so a crash loses nothing that was acknowledged; the snapshot
`storage/playtime.json` is rewritten when the log outgrows it and at a clean stop, and a `.log`
left by a crash is replayed at the next start. After a clean stop following Alice's second visit
the file reads:

```json
{"playtime:42":3720,"visits:42":2}
```

Two details carry the recipe. Durable keys use `player.accountId`, never `player.id`, which is a
small number reused by the next player. And the account is remembered at join, because inside
`playerLeft` the session record is already gone - only `player.name` is still known. The console
line on leave:

```
playtime · Player#0 Alice played 1800 s, 3720 s in total
```

## An HTTP webhook

**Goal:** post joins and leaves to a chat webhook.

```toml
# resources/webhook/resource.toml
name = "webhook"

[config]
url = "…"   # the webhook URL is a secret; keep it out of the code
```

```lua
-- resources/webhook/server/main.lua
local url = node.config.url

local function post(text)
    if not url or url == "" then
        node.log.warn("no [config] url in resource.toml, webhook disabled")
        return
    end
    node.http.post(url, { content = text }, { ["Content-Type"] = "application/json" },
        function(status, body, headers)
            if status < 200 or status >= 300 then
                node.log.warn("webhook failed (%d): %s", status, body)
            end
        end)
end

node.on("playerJoined", function(player)
    post(string.format("%s joined (%d online)", player.name, node.players.count()))
end)

node.on("playerLeft", function(player)
    post(string.format("%s left", player.name))
end)
```

`node.http.post(url, body, headers?, cb)` runs the request on a background pool thread and calls
`cb(status, body, headers)` on the worker; a table body is JSON-encoded for you. Set the
`Content-Type` yourself - without it the body is sent as `application/octet-stream`. The client
follows up to five redirects, gives up after about 15 seconds, caps the response at 8 MB and does
not verify the peer's TLS certificate. A request that never got an answer calls back with status
`-1` and the error text in `body`; `node.http.post` itself returns `false` only when the request
could not be queued. Most webhook endpoints answer `200` or `204` with an empty body, so a healthy
run logs nothing; an unreachable host logs the transport error, prefixed by the step that failed
(`resolve failed`, `connect failed`, `TLS handshake failed`) and followed by the operating
system's own message:

```
webhook · webhook failed (-1): connect failed: Connection refused
```

Inside `node.async`, `node.http.fetch(url, { method = "POST", body = t, headers = h })` is the same
request as a coroutine that returns `status, body, headers` ([Concurrency](/plugins/concurrency/#http)).

## Kick and ban with a reason

**Goal:** `/kick`, `/ban`, `/unban` and `/bans` for players with the `admin` role from the
permissions recipe.

```lua
-- resources/moderation/server/main.lua
local function target(player, args)
    local who = node.players.find(args[1] or "")
    if not who then
        player:tell("No player named %s", tostring(args[1]))
        return nil
    end
    if who == player then
        player:tell("Not on yourself")
        return nil
    end
    return who, table.concat(args, " ", 2)
end

node.commands.add("kick", function(player, args)
    local who, reason = target(player, args)
    if not who then return end
    who:kick(reason ~= "" and reason or "Kicked by " .. player.name)
end, { role = "admin" })

node.commands.add("ban", function(player, args)
    local who, reason = target(player, args)
    if not who then return end
    node.bans.add(who, reason ~= "" and reason or "Banned by " .. player.name) -- kicks as well
end, { role = "admin" })

node.commands.add("unban", function(player, args)
    if not args[1] then player:tell("Usage: /unban <account id or IP>") return end
    local who = tonumber(args[1]) or args[1] -- an account id, or an IP
    if node.bans.remove(who) then
        player:tell("Unbanned %s", tostring(who))
    else
        player:tell("%s was not banned", tostring(who))
    end
end, { role = "admin" })

node.commands.add("bans", function(player)
    for _, b in ipairs(node.bans.all()) do
        player:tell("%s: %s - %s", b.name or "?", b.account and ("account " .. b.account) or b.ip, b.reason or "")
    end
end, { role = "admin" })
```

`player:kick(reason)` disconnects the player and shows the reason in the launcher.
`node.bans.add(who, reason)` takes three shapes: a `Player` bans its IP and, when the join ticket
was redeemed for an account, that account too - then kicks; an IP string or an account id number
bans for future connects and leaves a running session alone. `node.bans.remove` and
`node.bans.has` take the same string or number; `node.bans.all()` lists every ban with `ip`,
`account`, `reason`, `at` and `name`. Bans persist in `bans.json` next to `server.toml`. Two
`Player` objects compare equal when their ids match, which is what `who == player` relies on.

`/kick Bob Spamming` and `/ban Bob Spamming` print, under the `Kick` tag:

```
Bob kicked — Spamming
Bob banned by a server plugin (203.0.113.5, account 108) — Spamming
Bob kicked — Spamming
```

The next connection from that address is refused at the door:
`connection from 203.0.113.5 refused (banned: Spamming)`; a banned account is refused whatever the
address, right after its ticket is redeemed. `node.bans.add` and `player:ban` fall back to the
reason `Banned`; `You are banned from this server` is what a returning banned player sees when the
stored reason is empty.

## Next

- [Events](/plugins/events/) - every kind of event these recipes subscribe to.
- [Concurrency](/plugins/concurrency/) - what runs where when a recipe waits on HTTP or a job.
- [Client scripting](/plugins/client-scripting/) - the client half the teleport relies on.
- [Conventions](/plugins/conventions/) - naming, ids versus objects, return shapes.
