---
title: Игроки и машины
description: Объекты Player и Vehicle — кто такой игрок, роли, резервные места, баны, телепорт и заморозка, теги, замки и чтение всех машин разом.
---

Ваши обработчики получают объекты `Player` и `Vehicle`. На этой странице — что из них можно
прочитать и что с ними можно сделать. Все поля и методы есть в
[справочнике Lua API](/ru/plugins/api/lua/#player-objects); здесь — те, которыми вы будете
пользоваться, и зачем.

## Как устроены объекты

`Player` — маленькая таблица с `id`. Когда вы впервые читаете другое поле, объект получает запись
игрока с сервера и сохраняет её у себя; `player:refresh()` сбрасывает эту копию. Методы действуют по
номеру, так что всегда достают до живого игрока. С `Vehicle` — то же самое.

- `node.players.get(id)` и `node.vehicles.get(id)` дешёвые (ничего не запрашивается, пока вы не
  прочтёте поле), их можно звать даже в обработчике, который срабатывает 60 раз в секунду.
- Два объекта равны (`==`), если у них одинаковый номер. `tostring(player)` даёт `Player#3 Alice`,
  `tostring(vehicle)` — `Vehicle#12 Alice`.
- Номера переиспользуются после ухода. `player:isConnected()` и `vehicle:exists()` говорят, указывает
  ли номер ещё на что-то, но не на того ли самого игрока, что раньше.

## Кто такой игрок

| Поле | Что это |
|---|---|
| `player.name` | Отображаемое имя. Читается и в `playerLeft`. |
| `player.accountId` | Номер аккаунта NodeMP или `nil` у гостя. Не меняется между сессиями, именами и сетями: **храните долгоживущие данные по нему**. |
| `player.verified` | `true`, если личность игрока подтвердил список серверов. `false` на сервере без ключа списка серверов или при входе без билета. |
| `player.guest` | `true`, если за именем нет аккаунта, как в Test Drive. `verified and not guest` — вошедший аккаунт. |
| `player.ip` | Адрес текстом. Меняется вместе с сетью игрока; лучше `accountId`. |
| `player.role` | Роль, которую плагин выдал на эту сессию, `""` — если нет. |
| `player.accountRoles` | Роль аккаунта на сайте NodeMP (`"ADM"` у его администраторов, `""` у всех остальных). Не то же самое, что `role`. |
| `player.vehicle`, `player.seatRole` | Машина, в которой сидит игрок (`nil`, если пешком), и `"driver"`, `"passenger"` или `"none"`. |
| `player.locale` | Язык, на котором работает игра игрока, например `"ru_RU"`. Пусто, если клиентский мод старше 1.7.4 ([Чат → На языке игрока](/ru/plugins/chat/#на-языке-игрока)). |
| `player.overCapacity` | `true`, если игрок зашёл сверх лимита игроков ([ниже](#резервные-места)). |
| `player.frozen` | `true`, пока ресурс держит игрока замороженным ([ниже](#заморозить-игрока)). |

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

Найти игроков: `node.players.all()` (все, по номеру), `node.players.count()`,
`node.players.find(name)` (без учёта регистра), `node.players.get(id)`.

## Роли

Роль — слово, которое ваш ресурс даёт игроку на эту сессию: `"admin"`, `"mod"`, `"vip"`, что
угодно. Игроки видят её меткой рядом с именем, а ваши команды могут её проверять
([Чат → Много команд, часть — для админов](/ru/plugins/chat/#много-команд-часть--для-админов)).
Роли живут одну сессию: выдавайте их заново в `playerJoined`, обычно по списку из настроек.

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

Номера аккаунтов владелец сервера пишет в ваш `resource.toml`:

```toml
[config]
admins = [42, 108]
```

## Резервные места

Когда сервер полон, он всё равно спрашивает ваш обработчик `playerConnectRequest` — с
`player.overCapacity`, равным `true`, и уже известным аккаунтом. Верните `true`, и игрок зайдёт
сверх лимита; ничего не верните — сервер, как обычно, откажет ему с "Server full!". Так держат
место для админов, участников клуба или тех, кто платит за сервер:

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

Пустить сверх лимита может только явный `true`, а `false` от любого обработчика по-прежнему
отказывает. Молчание оставляет всё как было, так что ресурс, который о резервных местах не знает,
ничего не меняет. `player.overCapacity` остаётся `true` до конца сессии — если таких игроков потом
нужно отличать.

## Кики и баны

- `player:kick(reason)` отключает игрока и показывает ему причину (`"Kicked"`, если причины нет).
- `player:ban(reason)` банит и кикает. Бан накрывает аккаунт игрока, если он вошёл (тогда бан
  следует за ним в любую сеть), и всегда его IP.
- `node.bans.add(who, reason)` банит на будущее, не кикая: `who` — строка с IP или номер аккаунта.
  Остальное делают `node.bans.remove(who)`, `node.bans.has(who)` и `node.bans.all()`.

Оба вызова бана принимают третьим аргументом время окончания в секундах Unix. Такой бан сервер
снимает сам, когда время выйдет, даже через перезапуски, — свой таймер не нужен:

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

С игроком это `player:ban("Spamming", os.time() + 2 * HOUR)`. `until` в Lua — ключевое слово,
поэтому поле читается как `ban["until"]`; у бана навсегда его нет.

Баны хранятся в `bans.json` рядом с `server.toml` — это тот же список, которым управляет владелец
сервера ([Администрирование → Баны](/ru/hosting/administration/#баны)). Готовые `/kick` и `/ban` для
чата — в [Рецептах](/ru/plugins/recipes/#кик-и-бан-из-чата).

## Пересадить игрока

`player:seat(vehicle, role)` сажает игрока в машину как `"driver"` (по умолчанию) или
`"passenger"`, не глядя на замки; `player:unseat()` высаживает; `player:swapWith(other)` меняет двух
игроков местами. `player:spawnVehicle(config, transform)` создаёт машину для игрока и сажает его в
неё:

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

Конфигурация — та же, с которой спавнит игра: `jbm` — модель, `vcf` — детали, переменные и
покраска. При неудаче — `nil` и `"not_joined"`, `"max_cars"` или `"bad_config"`. Лимит машин
сервера действует, а `vehicleSpawnRequest` не спрашивается: сервер себе не отказывает.

### Телепорт

`player:teleport(transform)` переносит то, в чём игрок находится, — его машину или его самого
пешком — в другое место. Ничего не чинится: повреждения, топливо и груз остаются как были. В этом
отличие от `vehicle:reset(transform)`, который машину при переносе чинит.

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

`transform` — это `{ pos = { x, y, z }, rot = { x, y, z, w } }`; без `rot` машина смотрит туда
же, куда смотрела. Если перенести нельзя, придут `nil` и причина: `"not_driver"` для пассажира
(тогда переносите машину через `vehicle:teleport`), `"no_avatar"`, если у игрока в мире ещё ничего
нет, `"bad_transform"`. Следом срабатывает событие `vehicleTeleported`. Игроки с клиентским модом
старше 1.7.4 увидят машину починенной, как после сброса.

### Заморозить игрока

`player:freeze(true)` держит игрока на месте — на брифинге, на старте гонки или пока админ
разбирается. Сервер перестаёт передавать движение его машины, так что для всех остальных она стоит,
и отказывает ему в спавне, правке, сбросе и пересадке с "You are frozen by the server". Игра
игрока (клиентский мод 1.7.4 и новее) тоже держит машину. `player:freeze(false)` отпускает.

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

Заморозка живёт одну сессию: игрок, который вышел и вернулся, свободен. Если вы ведёте список
замороженных, замораживайте их снова в `playerJoined`.

## Машины

| Поле | Что это |
|---|---|
| `vehicle.spawner`, `vehicle.driver`, `vehicle.authority` | Игроки: кто заспавнил, кто за рулём, чья игра её симулирует. `nil`, если никого. |
| `vehicle.passengers` | Массив игроков. |
| `vehicle.isUnicycle` | `true` у пешехода. Пешеходы для сервера — тоже машины; `node.vehicles.all()` их не показывает, если не передать `true`. |
| `vehicle.idleSeconds` | Сколько времени за рулём никого. |
| `vehicle.tags` | Ваши теги: ключ → значение. |
| `vehicle.partsHash` | Число, одинаковое у двух машин с той же моделью, деталями и настройкой, где бы они ни стояли. |

То, что меняется каждый кадр (`transform`, `controls`, `electrics`, `damage`, `config`), — методы,
потому что каждый вызов читает заново: `vehicle:transform().pos`, `vehicle:electrics().rpm`.

`vehicle:delete()` убирает машину у всех. `vehicle:reset(transform)` чинит её на месте или в
указанной точке, а `vehicle:teleport(transform)` переносит, ничего не чиня. `vehicle:trigger(call)`
нажимает что-то в ней. `vehicle:setCoupler(name, open)` открывает или закрывает дверь или сцепку.

### Теги

Теги — ваши заметки на машине: до 32 ключей на машину, значения до 256 символов. Их получает игра
каждого игрока, а `node.vehicles.byTag(key, value)` находит машины по ним.

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

### Замки

Замок решает, кто может сесть в машину: `"unlocked"`, `"locked"` (только те, кого вы перечислили)
или `"driver-only"` (водить может любой, пассажиров нет). Игроки ставят замок на свои машины в
настройках игры; ресурс может взять это на себя через `vehicle:lock(mode, whitelist)`. После этого
настройка игрока эту машину не трогает, пока вы не вызовете `vehicle:releaseLock()`. Тех, кто уже
сидит, не выкидывает, а `player:seat` замки не замечает.

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

Белый список принимает игроков и записи `{ account = <номер> }`; запись аккаунта пускает его и
после переподключения.

## Быстро читать мир

Для радара, мини-карты, камеры скорости или гонки не подписывайтесь на поток каждой машины. Читайте
все машины разом по таймеру через `node.vehicles.transforms(select)`. `select` называет, что вам
нужно, и сервер присылает только это:

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

В каждой записи — `id` и то, что вы просили. Формы `select`:

| `select` | Что придёт |
|---|---|
| ничего | все поля: `pos`, `rot`, `vel`, `angVel`, `ageSeconds`, `controls`, `electrics` и другие |
| `{ "pos", "vel" }` | только эти поля |
| `{ "pos", electrics = { "rpm", "wheelspeed" } }` | позиции и два значения electrics |
| `{ "pos", controls = true }` | позиции и управление водителя |
| `{ "pos", ids = { 3, 7 } }` | только машины 3 и 7 |

В списке только машины, которые прислали хотя бы одну позицию. `pos` и `vel` — таблицы с `x`, `y` и
`z`. `node.server.snapshot()` — другое массовое чтение: игроки с позициями и местами и машины, одним
вызовом.

## Группы видимости

Группа видимости — пронумерованный мир. Игроки и машины в одной группе видят друг друга; группа `0` —
общий мир, с которого все начинают. Перенос игрока не переносит его машины, так что переносите и то,
и другое:

<!-- doctest: server -->
```lua
local function moveToRoom(player, room)
    player:setGroup(room)
    for _, vehicle in ipairs(player:vehicles()) do
        vehicle:setGroup(room)
    end
end
```

Группы ничего не стоят на каждый пакет и не нуждаются в кеше, поэтому это правильный инструмент для
комнат, гонок и закрытых сессий. Для чего-то тоньше есть
[фильтр ретрансляции](/ru/plugins/events/#фильтр-ретрансляции).

## Дальше

- [Чат](/ru/plugins/chat/) — говорить с игроками и принимать команды.
- [Справочник Lua API](/ru/plugins/api/lua/#player-objects) — все поля и методы.
