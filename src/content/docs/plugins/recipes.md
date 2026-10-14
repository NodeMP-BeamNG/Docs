---
title: Recipes
description: Complete small resources for the usual jobs - who's online, kick and ban, teleports, a race start, a restart with a countdown, playtime, a Discord bridge.
---

Each recipe is a whole resource: make the folder, paste the code into `server/main.lua`, put the
settings into `resource.toml`, and start the server. They're short on purpose, so you can read them
in a minute and change them to fit.

Every command here follows the pattern from [Chat → Commands](/plugins/chat/#commands): a
`chatMessageRequest` handler catches its own lines and answers `{ handled = true }`. Admins come
from a list of account numbers in the resource's settings:

```toml
[config]
admins = [42, 108] # NodeMP account numbers
```

## Who's online

**Goal:** `/online` tells the player who is on the server.

<!-- doctest: server+client {"players": ["Alice", "Bob"], "emit": [["chat:send", {"text": "/online"}]]} -->
```lua
-- resources/online/server/main.lua
node.on("chatMessageRequest", function(player, msg)
    if msg.text:lower() ~= "/online" then return end
    local names = {}
    for _, p in ipairs(node.players.all()) do
        names[#names + 1] = p.name
    end
    player:tell("%d online: %s", #names, table.concat(names, ", "))
    return { handled = true }
end)

-- expect-client: Alice chat:msg .*2 online: (Alice, Bob|Bob, Alice)
```

## Teleports

**Goal:** `/warp <place>` moves you to a named spot, `/tp <player>` next to another player. Nothing
is repaired on the way.

<!-- doctest: server+client {"spawn": "coupe", "config": {"places": {"garage": [-24.5, 610.0, 75.2]}}, "emit": [["chat:send", {"text": "/warp garage"}], ["chat:send", {"text": "/warp moon"}], ["chat:send", {"text": "/tp Nobody"}]]} -->
```lua
-- resources/warp/server/main.lua
local places = node.config.places or {} -- name = { x, y, z }

local function placeNames()
    local names = {}
    for name in pairs(places) do names[#names + 1] = name end
    table.sort(names)
    return table.concat(names, ", ")
end

local commands = {}

function commands.warp(player, args)
    local spot = places[args[1] or ""]
    if not spot then return player:tell("Places: %s", placeNames()) end
    local ok, err = player:teleport({ pos = { x = spot[1], y = spot[2], z = spot[3] } })
    if ok then player:tell("Warped to %s", args[1]) else player:tell("Can't warp: %s", err) end
end

function commands.tp(player, args)
    local target = node.players.find(args[1] or "")
    local pos = target and target:position()
    if not pos then return player:tell("%s isn't in the world yet", args[1] or "Nobody") end
    local ok, err = player:teleport({ pos = { x = pos.x + 3, y = pos.y, z = pos.z + 0.5 } })
    if ok then player:tell("Moved next to %s", target.name) else player:tell("Can't move: %s", err) end
end

node.on("chatMessageRequest", function(player, msg)
    local name, rest = msg.text:match("^/(%S+)%s*(.*)$")
    local command = name and commands[name:lower()]
    if not command then return end
    local args = {}
    for word in rest:gmatch("%S+") do args[#args + 1] = word end
    command(player, args)
    return { handled = true }
end)

-- expect-client: Alice chat:msg .*Warped to garage
-- expect-client: Alice chat:msg .*Places: garage
-- expect-client: Alice chat:msg .*Nobody isn't in the world yet
```

```toml
[config.places]
garage = [-24.5, 610.0, 75.2]
```

`player:teleport` moves the car the player drives, or the player on foot, and keeps damage and
cargo. `player:position()` is where the server last saw someone. To find coordinates for your
places, stand there in the game and have a resource log `player:position()`.
[Players and vehicles → Teleporting](/plugins/players-and-vehicles/#teleporting) has the details.

## Kick and ban from chat

**Goal:** `/kick`, `/ban`, a timed `/tempban`, `/unban` and `/bans`, for admins only.

<!-- doctest: server+client {"players": ["Alice", "Bob"], "config": {"admins": [42]}, "emit": [["chat:send", {"text": "/kick Bob"}, "Bob"], ["chat:send", {"text": "/tempban Bob 30 Ramming"}], ["chat:send", {"text": "/bans"}], ["chat:send", {"text": "/unban 108"}], ["chat:send", {"text": "/unban 127.0.0.1"}]]} -->
```lua
-- resources/moderation/server/main.lua
local admins = {}
for _, id in ipairs(node.config.admins or {}) do admins[id] = true end

local function isAdmin(player)
    return player.accountId ~= nil and admins[player.accountId] == true
end

local function reason(args, from) -- the words from `from` on, or nil
    local text = table.concat(args, " ", from)
    return text ~= "" and text or nil
end

local commands = {}

function commands.kick(player, args)
    local who = node.players.find(args[1] or "")
    if not who then return player:tell("Usage: /kick <player> [reason]") end
    node.chat.say("%s was kicked", who.name)
    who:kick(reason(args, 2) or "Kicked by an admin")
end

function commands.ban(player, args)
    local who = node.players.find(args[1] or "")
    if not who then return player:tell("Usage: /ban <player> [reason]") end
    node.chat.say("%s was banned", who.name)
    who:ban(reason(args, 2) or "Banned by an admin")
end

function commands.tempban(player, args)
    local who = node.players.find(args[1] or "")
    local minutes = tonumber(args[2] or "")
    if not who or not minutes or minutes <= 0 then
        return player:tell("Usage: /tempban <player> <minutes> [reason]")
    end
    node.chat.say("%s was banned for %d minute(s)", who.name, minutes)
    who:ban(reason(args, 3) or "Banned for a while", os.time() + math.floor(minutes * 60))
end

function commands.unban(player, args)
    local who = tonumber(args[1] or "") or args[1] -- an account number or an address
    if not who then return player:tell("Usage: /unban <account number or IP>") end
    if node.bans.remove(who) then
        player:tell("Unbanned %s", tostring(who))
    else
        player:tell("%s was not banned", tostring(who))
    end
end

function commands.bans(player)
    local list = node.bans.all()
    if #list == 0 then return player:tell("No bans") end
    for _, ban in ipairs(list) do
        local who = ban.account and ("account " .. ban.account) or ban.ip
        local ends = ban["until"] and os.date("!until %Y-%m-%d %H:%M UTC", ban["until"]) or "for good"
        player:tell("%s (%s), %s: %s", who, ban.name or "?", ends, ban.reason or "")
    end
end

node.on("chatMessageRequest", function(player, msg)
    local name, rest = msg.text:match("^/(%S+)%s*(.*)$")
    local command = name and commands[name:lower()]
    if not command then return end
    if not isAdmin(player) then
        player:tell("Only admins can use /%s", name)
    else
        local args = {}
        for word in rest:gmatch("%S+") do args[#args + 1] = word end
        command(player, args)
    end
    return { handled = true }
end)

-- expect-client: Bob chat:msg .*Only admins can use /kick
-- expect-client: Alice chat:msg .*Bob was banned for 30 minute\(s\)
-- expect-client: Alice chat:msg .*account 108 \(Bob\), until \d{4}-\d\d-\d\d \d\d:\d\d UTC: Ramming
-- expect-client: Alice chat:msg .*Unbanned 108
```

- A ban covers the player's account when they're signed in, and their IP always, so `/bans` shows
  two lines for one ban. `/unban` takes either.
- A timed ban ends by itself, even if the server restarts in between: the end is stored in
  `bans.json`.
- The announcement goes out before the kick, so the player still sees why they're leaving.

## A race start

**Goal:** `/start` freezes everyone, counts down in chat, and lets go on "Go!".

<!-- doctest: server+client {"config": {"admins": [42]}, "emit": [["chat:send", {"text": "/start"}]]} -->
```lua
-- resources/start/server/main.lua
local admins = {}
for _, id in ipairs(node.config.admins or {}) do admins[id] = true end

local running = false

node.on("chatMessageRequest", function(player, msg)
    if msg.text:lower() ~= "/start" then return end
    if not (player.accountId and admins[player.accountId]) then
        player:tell("Only admins can start a race")
    elseif not running then
        running = true
        node.async(function()
            for _, p in ipairs(node.players.all()) do p:freeze(true) end
            for i = 3, 1, -1 do
                node.chat.say("%d...", i)
                node.sleep(1000)
            end
            for _, p in ipairs(node.players.all()) do p:freeze(false) end
            node.chat.say("Go!")
            running = false
        end)
    end
    return { handled = true }
end)

-- expect-client: Alice chat:msg .*3\.\.\.
-- expect-client: Alice chat:msg .*Go!
```

While frozen, a player's car stands still for everyone, and the server refuses their spawns, resets
and seat changes. Someone who joins during the countdown isn't frozen; freeze them in `playerJoined`
if that matters. The details are on
[Players and vehicles → Freezing a player](/plugins/players-and-vehicles/#freezing-a-player).

## A restart with a countdown

**Goal:** `/restart [minutes]` restarts the server after a warning in chat; `/restart cancel` calls
it off.

<!-- doctest: server+client {"config": {"admins": [42]}, "emit": [["chat:send", {"text": "/restart 5"}], ["chat:send", {"text": "/restart cancel"}]]} -->
```lua
-- resources/restart/server/main.lua
local admins = {}
for _, id in ipairs(node.config.admins or {}) do admins[id] = true end

local reminders = {} -- timer ids of the warnings still to come

local function dropReminders()
    for _, id in ipairs(reminders) do node.cancel(id) end
    reminders = {}
end

-- every scheduled stop is announced, whichever resource asked for it
node.on("serverShutdownScheduled", function(info)
    dropReminders()
    if info.cancelled then
        node.chat.say("The restart is off")
        return
    end
    local left = info.at - os.time()
    node.chat.say("Restart in %d minute(s): %s", math.ceil(left / 60), info.reason)
    for _, before in ipairs({ 60, 10 }) do
        if left > before then
            reminders[#reminders + 1] = node.after((left - before) * 1000, function()
                node.chat.say("Restart in %d seconds", before)
            end)
        end
    end
end)

node.on("chatMessageRequest", function(player, msg)
    local arg = msg.text:match("^/restart%s*(%S*)$")
    if not arg then return end
    if not (player.accountId and admins[player.accountId]) then
        player:tell("Only admins can restart the server")
    elseif arg == "cancel" then
        if not node.server.shutdown(nil, -1) then player:tell("No restart is scheduled") end
    else
        local minutes = tonumber(arg) or 5
        node.server.shutdown("Restarting, back in a minute", math.floor(minutes * 60 * 1000))
    end
    return { handled = true }
end)

-- expect-client: Alice chat:msg .*Restart in 5 minute\(s\): Restarting, back in a minute
-- expect-client: Alice chat:msg .*The restart is off
```

When the time is up, players are sent away with the reason, and the server stops exactly as after
Ctrl+C: plugins save, and the process exits with code 0. It comes back by itself only if something
starts it again: systemd with `Restart=always` or Docker with `restart: unless-stopped`
([Keeping it running](/hosting/running/)). For a nightly restart, call `node.server.shutdown` from a
timer instead of a command.

## Playtime and visits

**Goal:** count visits and minutes played per account, across restarts.

<!-- doctest: server+client -->
```lua
-- resources/playtime/server/main.lua
local sessions = {} -- [player.id] = { since, account }, for this session only

node.on("playerJoined", function(player)
    sessions[player.id] = { since = os.time(), account = player.accountId }
    if not player.accountId then return end -- a guest has nothing to keep it under
    local visits = node.storage.get("visits:" .. player.accountId, 0) + 1
    node.storage.set("visits:" .. player.accountId, visits)
    local played = node.storage.get("playtime:" .. player.accountId, 0)
    player:tell("Welcome back, %s - visit %d, %d min played", player.name, visits, played // 60)
end)

node.on("playerLeft", function(player)
    local s = sessions[player.id]
    sessions[player.id] = nil
    if not s or not s.account then return end
    local seconds = os.time() - s.since
    local total = node.storage.get("playtime:" .. s.account, 0) + seconds
    node.storage.set("playtime:" .. s.account, total)
    node.log("%s played %d s, %d s in total", player.name, seconds, total)
end)

-- expect-client: Alice chat:msg .*Welcome back, Alice - visit 1, 0 min played
-- expect: Alice played \d+ s, \d+ s in total
```

Two details carry this recipe. The data is kept under `player.accountId`, never `player.id`, which
the next player will get. And the account is remembered at the join, because by `playerLeft` the
player's record is gone and only the name is still readable. After a clean stop,
`storage/playtime.json` reads like `{"playtime:42":3720,"visits:42":2}`
([Storage and files](/plugins/storage/)).

## Post chat to Discord

**Goal:** the server's chat, joins and leaves appear in a Discord channel.

In Discord, open the channel's settings, **Integrations → Webhooks → New Webhook**, and copy its
URL into the resource's settings. The URL is a password to your channel: keep it out of the code.

```toml
[config]
webhook = "https://discord.com/api/webhooks/…"
```

<!-- doctest: server+client {"config": {"webhook": "http://127.0.0.1:9/api/webhooks/test"}, "emit": [["chat:send", {"text": "hello from the game"}]]} -->
```lua
-- resources/discord/server/main.lua
local url = node.config.webhook

local function post(text)
    if not url or url == "" then return end
    text = text:gsub("@", "@\u{200B}") -- so "@everyone" in a chat line pings nobody
    node.http.post(url, { content = text }, { ["Content-Type"] = "application/json" },
        function(status, body)
            if status < 200 or status >= 300 then
                node.log.warn("Discord answered %d: %s", status, body)
            end
        end)
end

node.on("chatMessage", function(player, msg)
    if msg.sent and msg.scope == "global" then
        post(string.format("**%s**: %s", player.name, msg.text))
    end
end)

node.on("playerJoined", function(player) post(player.name .. " joined") end)
node.on("playerLeft", function(player) post(player.name .. " left") end)

-- expect: Discord answered -1: refusing to connect to a non-public address
```

`chatMessage` fires once a line's fate is decided, so refused lines and commands (`msg.sent` is
`false` for both) stay out of Discord, and so do local lines. A healthy webhook answers `204` and the
resource logs nothing. In the test above the URL points at this machine, which the server refuses by
default; that's the warning you see ([HTTP → What the host controls](/plugins/http/#what-the-host-controls)).

## Next

- [The example plugins](/plugins/examples/): bigger, complete resources that come with the server.
- [Chat](/plugins/chat/), [Players and vehicles](/plugins/players-and-vehicles/),
  [HTTP](/plugins/http/): the calls these recipes use, in depth.
