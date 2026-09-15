---
title: Рецепты
description: Шесть ресурсов для копирования - команда чата, роли и группы, телепорт, сохранение состояния, HTTP-вебхук, кик и бан - с ожидаемыми строками лога.
---

Каждый рецепт - один ресурс: папка в `resources/`, названная по рецепту, с `server/main.lua` и,
где нужна клиентская половина, `client/main.lua`. Каждый вызов есть в
[справочнике Lua API](/ru/plugins/api/lua/); нативный модуль здесь не нужен ни разу. Четыре из
шести используют команды чата или `player:tell`, которые говорят через ресурс `chat`, - скопируйте
в `resources/` ещё и `examples/chat`, иначе команды молча пропадают, а ответы уходят в никуда.
Консоль сервера помечает каждую строку именем ресурса, так что строки лога ниже - ровно то, что вы
увидите.

## Команда чата

**Цель:** `/online` отвечает игроку, кто подключён.

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

`node.commands.add(name, fn, opts?)` регистрирует обработчик строки чата `/name ...`: `fn` получает
отправителя как `Player`, слова после имени как массив и всю строку. Имена не зависят от регистра,
один обработчик на имя на ресурс, `node.commands.remove(name)` снимает его. Ресурс `chat`
публикует каждую строку с `/` на шине как `chat:command`, так что команда, которую никто не
зарегистрировал, просто отбрасывается - и никогда не показывается в чате.

Алиса набирает `/online` и видит `2 online: Alice, Bob` системной строкой. Консоль печатает:

```
online · Player#0 Alice asked who is online
```

## Права по роли и группе

**Цель:** повысить известные аккаунты до `admin`, закрыть команду ролью и позволить админам
открывать группы видимости.

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

В игре три идентичности. `player.accountId` - идентификатор аккаунта в директории: стабилен между
сессиями и адресами, `nil` у гостя Test Drive, и единственное, что стоит использовать в качестве
ключа списка админов. `player.accountRoles` - строка роли из директории, `"ADM"` для администратора директории.
`player.role` - собственная метка этого сервера на одну сессию, задаётся `player:setRole` и
сбрасывается при отключении, поэтому `promote` выполняется при каждом подключении.
`{ role = "admin" }` заставляет прелюдию ответить `You are not allowed to use /say` всем остальным
ещё до вашего обработчика.

`player:setGroup(n)` помещает игрока в группу видимости `n`: игроки и машины видят друг друга,
только когда их числа совпадают, а `0` - мир, общий для всех. У машины своё число, так что
переводите машины игрока вместе с ним. Консоль показывает каждое повышение:

```
perms · Player#0 Alice is admin (account 42)
```

## Телепорт и трансформация

**Цель:** `/where` читает позицию, которую сервер держит для вашей машины; `/tp <player>`
переносит вашу машину к машине другого игрока.

Сервер сам никогда не двигает машину - позиции приходят от клиента, который её симулирует, -
поэтому телепорт - это сетевое событие в собственную клиентскую половину игрока, которая и
задаёт позицию в игре.

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

`vehicle:transform()` - последний снимок позиции, который прислал авторитет синхронизации машины:
`pos`, `vel` и `angVel` как `{x, y, z}`, `rot` как `{x, y, z, w}`, на несколько тиков устаревший
по самой своей природе, `nil` до первого снимка. `player:position()` - та же точка для игрока, из
машины, в которой он сидит, или из его пешего аватара. Клиентская половина получает цель как
JSON-текст, сохраняет текущий поворот машины и вызывает игровой `setPositionRotation`; новая позиция
затем возвращается серверу и всем остальным через обычный поток позиций. На сервере:

```
tp · Player#1 Bob -> Player#0 Alice (12.3, -45.6, 7.8)
```

а в `beamng.log` Боба, под `node.events`: `teleported to 15.3 -45.6 8.3`.

## Сохранение состояния

**Цель:** считать визиты и время игры на аккаунт между перезапусками.

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

`node.storage` - хранилище ключ/значение на ресурс: `get(key, default)`, `set(key, value)` с любым
значением, сериализуемым в JSON, `delete(key)`. Каждый `set` дописывается в `storage/playtime.log`
(рядом с `resources/`) до возврата, так что сбой не теряет ничего подтверждённого; снимок
`storage/playtime.json` переписывается, когда лог перерастает его, и при чистой остановке, а
`.log`, оставшийся после сбоя, проигрывается при следующем запуске. После чистой остановки вслед за
вторым визитом Алисы файл содержит:

```json
{"playtime:42":3720,"visits:42":2}
```

Рецепт держится на двух деталях. Долговечные ключи используют `player.accountId`, а не
`player.id` - маленькое число, которое достанется следующему игроку. А аккаунт запоминается при
подключении, потому что внутри `playerLeft` запись сессии уже исчезла - известно только
`player.name`. Строка консоли при выходе:

```
playtime · Player#0 Alice played 1800 s, 3720 s in total
```

## HTTP-вебхук

**Цель:** отправлять подключения и выходы в вебхук чата.

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

`node.http.post(url, body, headers?, cb)` выполняет запрос в фоновом потоке пула и вызывает
`cb(status, body, headers)` в рабочем потоке; тело-таблица кодируется в JSON за вас. `Content-Type`
задавайте сами - без него тело уходит как `application/octet-stream`. Клиент следует не более чем
пяти перенаправлениям, сдаётся примерно через 15 секунд, ограничивает ответ 8 МБ и не проверяет
TLS-сертификат собеседника. Запрос, так и не получивший ответа, вызывает колбэк со статусом `-1` и
текстом ошибки в `body`; сам `node.http.post` возвращает `false` только тогда, когда запрос не
удалось поставить в очередь. Большинство вебхуков отвечают `200` или `204` с пустым телом, так что
здоровый прогон ничего не логирует; недоступный хост логирует транспортную ошибку с префиксом
отказавшего шага (`resolve failed`, `connect failed`, `TLS handshake failed`) и сообщением самой
операционной системы:

```
webhook · webhook failed (-1): connect failed: Connection refused
```

Внутри `node.async` тот же запрос - `node.http.fetch(url, { method = "POST", body = t, headers = h })`,
корутина, возвращающая `status, body, headers` ([Конкурентность](/ru/plugins/concurrency/#http)).

## Кик и бан с причиной

**Цель:** `/kick`, `/ban`, `/unban` и `/bans` для игроков с ролью `admin` из рецепта о правах.

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

`player:kick(reason)` отключает игрока и показывает причину в лаунчере. `node.bans.add(who, reason)`
принимает три формы: `Player` банит его IP и, когда билет на подключение был погашен для аккаунта,
этот аккаунт тоже - а затем кикает; строка с IP или число с идентификатором аккаунта банят будущие
подключения и не трогают текущую сессию. `node.bans.remove` и `node.bans.has` принимают ту же
строку или число; `node.bans.all()` перечисляет каждый бан с `ip`, `account`, `reason`, `at` и
`name`. Баны хранятся в `bans.json` рядом с `server.toml`. Два объекта `Player` равны, когда
совпадают их идентификаторы, - на это и опирается `who == player`.

`/kick Bob Spamming` и `/ban Bob Spamming` печатают под тегом `Kick`:

```
Bob kicked — Spamming
Bob banned by a server plugin (203.0.113.5, account 108) — Spamming
Bob kicked — Spamming
```

Следующее подключение с этого адреса отклоняется на пороге:
`connection from 203.0.113.5 refused (banned: Spamming)`; забаненный аккаунт отклоняется с любого
адреса, сразу после погашения его билета. `node.bans.add` и `player:ban` подставляют причину
`Banned`; `You are banned from this server` видит вернувшийся забаненный игрок, когда сохранённая
причина пуста.

## Дальше

- [События](/ru/plugins/events/) - каждый вид событий, на которые подписываются эти рецепты.
- [Конкурентность](/ru/plugins/concurrency/) - что где выполняется, когда рецепт ждёт HTTP или задание.
- [Клиентские скрипты](/ru/plugins/client-scripting/) - клиентская половина, на которую опирается телепорт.
- [Соглашения](/ru/plugins/conventions/) - именование, идентификаторы против объектов, формы возвращаемых значений.
