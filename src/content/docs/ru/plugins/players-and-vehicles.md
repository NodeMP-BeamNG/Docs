---
title: Игроки и машины
description: Объекты Player и Vehicle, поиск игрока, роли, кики и баны, заморозка и телепорт, спавн машин, теги и замки, места, запланированные изменения и чтение многих машин сразу.
---

Обработчики получают игроков и машины объектами `Player` и `Vehicle`. Оба лёгкие: это таблица с `id`, а остальные поля сервер отдаёт при первом обращении. Все поля и методы перечислены в [справочнике API](/ru/plugins/api/lua/#player-objects).

## Игроки

### Как найти игрока

| Вызов | Что даёт |
|---|---|
| `node.players.all()` | Всех подключённых игроков по возрастанию id. |
| `node.players.get(id)` | Игрока с этим id. Для неизвестного id вернёт игрока, у которого `isConnected()` равно `false`. |
| `node.players.find(name)` | Игрока с этим именем, без учёта регистра; `nil`, если такого нет. |
| `node.players.count()` | Сколько игроков подключено. |

`tostring(player)` выглядит как `Player#3 Alice`. Два объекта одного игрока равны (`==`).

### Кто такой игрок

| Поле | Что значит |
|---|---|
| `name` | Имя в игре. Доступно и в `playerLeft`. |
| `accountId` | Номер аккаунта NodeMP; у гостя `nil`. По нему и стоит сохранять данные. |
| `verified` | `true`, если сервер проверил билет игрока в NodeMP. На сервере, которого нет в списке, всегда `false`. |
| `guest` | `true`, если аккаунта нет: Test Drive или вообще без проверки. |
| `accountRoles` | Роль аккаунта в самом NodeMP, например `"ADM"`; у остальных пустая строка. |
| `locale` | Язык игры, например `"ru_RU"`, чтобы отвечать на нём. |
| `role` | Роль на этом сервере, её ставит плагин через `player:setRole`. |
| `ip` | Адрес игрока текстом. |
| `installId` | Установка лаунчера, как её называет серверу NodeMP: 64 шестнадцатеричные цифры. `nil`, если лаунчер её не сообщил. Другим игрокам она недоступна. |
| `identifiers` | Массив строк вида `nodemp:<id>`, `discord:<id>`, `ip:<адрес>`. У непроверенного игрока пуст. |

Поля читаются один раз и запоминаются в объекте. В пределах одного обработчика это то, что нужно; чтобы увидеть изменения позже, вызовите `player:refresh()` или возьмите свежий объект через `node.players.get(id)`.

### Роли

Роль — слово, которое сервер хранит на время сессии, а игра показывает рядом с ником. Здесь аккаунты из `[config]` становятся админами:

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

### Кики и баны

- `player:kick(reason)` отключает игрока, он увидит причину.
- `player:ban(reason)` банит аккаунт (если игрок вошёл в него), установку лаунчера (если лаунчер её сообщил) и адрес, и кикает.
- `player:ban(reason, os.time() + 3600)` банит на час, бан сервер снимет сам.
- `node.bans.add(who, reason, untilUnix)` банит адрес, номер аккаунта или `installId` того, кого нет на сервере; `node.bans.remove(who)` снимает бан.

Баны хранятся в `bans.json` и переживают перезапуск ([Консоль, кики и баны](/ru/hosting/administration/#баны)). Команда для модераторов с этими вызовами описана на странице [Чат и команды](/ru/plugins/chat/#команды-для-модераторов).

### Заморозка и телепорт

`player:freeze(true)` держит игрока на месте: его машины стоят для всех, а спавн, правка, ресет и пересадка отклоняются с `You are frozen by the server`. `player:freeze(false)` отпускает. Заморозка действует до конца сессии: кто зашёл снова, тот не заморожен.

`player:teleport({ pos = { x = 0, y = 0, z = 1 } })` переносит машину, которой игрок управляет, или самого игрока, если он пешком, и ничего не чинит. Если перенести нельзя, вызов возвращает `nil` и причину: `"not_driver"` для пассажира (переносите машину), `"no_avatar"`, когда у игрока ещё нет ни машины, ни пешехода, `"bad_transform"` или `"unknown player"`.

### Отдельные миры

`player:setGroup(n)` и `vehicle:setGroup(n)` разводят игроков и машины по группам с номерами. Группа 0 — общий мир. Игроки из разных групп не видят машин друг друга, а `local`-чат остаётся внутри группы. Машины игрока переводите вместе с ним.

## Машины

`node.vehicles.all()` отдаёт машины без пешеходов, `node.vehicles.all(true)` вместе с ними. Остальные вызовы: `node.vehicles.get(id)`, `node.vehicles.count()`.

### Кто есть кто в машине

| Поле | Что значит |
|---|---|
| `name` | Подпись владельца: имя игрока, который заспавнил машину, или имя, с которым её создал сервер. |
| `spawner` | Кто заспавнил машину; `nil`, если её создал сервер. |
| `driver` | Кто за рулём; `nil`, если пусто. |
| `authority` | Чья игра считает машину; обычно это водитель. |
| `passengers` | Пассажиры, списком игроков. |
| `isUnicycle` | `true` у пешехода: идущего игрока сервер тоже считает машиной. |
| `idleSeconds` | Сколько секунд машиной никто не управлял. |

Когда игрок уходит, его машины остаются в мире без хозяина. Удалять их должен плагин; это умеет `vehicle-cleanup` из [примеров](/ru/plugins/examples/).

### Теги и замки

Теги — короткие заметки `ключ = значение`, которые сервер хранит у машины и рассылает всем игрокам. Ключ не длиннее 64 байт, значение не длиннее 256, на машину не больше 32 ключей; лишнее отклоняется. Этот обработчик ставит тег каждой новой машине, в том числе той, что создаст команда `/car` ниже:

<!-- doctest: server+client -->
```lua
local function tagTeam(vehicle)
    vehicle:setTag("team", "red")
    node.log("car %d: team %s", vehicle.id, vehicle:tag("team"))
end

node.on("vehicleSpawned", tagTeam)

-- expect: car \d+: team red
```

`node.vehicles.byTag("team", "red")` находит все машины с этим тегом.

`vehicle:lock("locked", { player })` пускает в машину только перечисленных игроков, `"driver-only"` закрывает только место водителя, `vehicle:unlock()` открывает машину. В список можно положить и `{ account = id }`: такая запись переживёт перезаход игрока. Замок останавливает только новые посадки: тех, кто уже внутри, он не выбрасывает. Пока плагин не вызвал `vehicle:releaseLock()`, настройка владельца машины замок не меняет.

### Спавн, перенос, удаление

| Вызов | Что делает |
|---|---|
| `player:spawnVehicle(config, transform)` | Спавнит игроку машину и сажает его в неё. |
| `node.vehicles.spawn(config)` | Спавнит машину без хозяина. |
| `vehicle:teleport(transform)` | Переносит машину, не чиня её. |
| `vehicle:reset(transform)` | Чинит машину на месте или на новом. |
| `vehicle:delete()` | Удаляет машину у всех. |
| `player:seat(vehicle, "passenger")` | Сажает игрока на место, в обход замка. |
| `player:unseat()` | Высаживает игрока. |

Конфигурация — та же таблица, которую игра присылает, когда игрок спавнит машину: `jbm` — модель, `vcf` — комплектация. Положение — `{ pos = { x, y, z }, rot = { x, y, z, w } }`, `rot` можно не указывать.

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

На `spawnVehicle` действует `cars_per_player`, как и на собственные машины игрока. Второе значение говорит, почему машина не появилась (`"max_cars"`, `"bad_config"`, `"not_joined"`). Запрос `vehicleSpawnRequest` при этом не вызывается: сервер не спрашивает разрешения у самого себя.

### Запланированные изменения

Новую машину или смену её деталей, тюнинга или модели игра каждого другого игрока должна построить, и на это время игра замирает. Поэтому мод каждого игрока держит новые машины и изменения других игроков, пока игрок не остановится, не пройдёт заданное время или он не нажмёт на число в панели сессии ([что видят игроки](/ru/players/settings/#новые-машины-и-правки-других-игроков)). Удаления, ресеты, смена цвета и машина, в которой сидит игрок, не ждут никогда. С чего начинается сессия, задаёт `[vehicles]` в `server.toml` ([настройки](/ru/hosting/configuration/#vehicles)), а плагин может менять это, пока сервер работает:

| Вызов | Что делает |
|---|---|
| `node.vehicles.setQueue("off")` | Каждое изменение строится сразу, у всех. `"allow"` возвращает выбор игрокам. |
| `node.vehicles.setQueueMaxDelay(10)` | Каждый игрок строит ожидающее не позже чем через 10 секунд после первого изменения; `0` снимает ограничение. |
| `node.vehicles.applyScheduled()` | Каждый игрок строит всё ожидающее сейчас. |
| `player:setVehicleQueue("off")` | То же для одного игрока; `nil` возвращает решение серверу. |
| `player:applyScheduled()` | Один игрок строит всё ожидающее сейчас. |

Перед стартом гонки каждая машина должна выглядеть одинаково во всех играх:

<!-- doctest: skip needs a server newer than the published release -->
```lua
local function startRace(player, msg)
    if msg.text ~= "/start" then return end
    node.vehicles.setQueue("off")
    node.vehicles.applyScheduled()
    node.chat.say("The race starts in 10 seconds")
    return { handled = true }
end

node.on("chatMessageRequest", startRace)
```

Сам сервер пересылает правки одной машины не чаще раза в `edit_interval_sec`, последней конфигурацией. `applyScheduled` сначала отправляет то, что сервер ещё держит, так что строится и это.

### Много машин сразу

`node.vehicles.transforms` читает все машины за один вызов и только те поля, которые вы попросили:

<!-- doctest: server+client -->
```lua
local function countCars()
    local cars = node.vehicles.transforms({ "pos" })
    node.log("%d car(s) reported", #cars)
end

node.every(1000, countCars)

-- expect: \d+ car\(s\) reported
```

В каждой записи есть `id` машины и запрошенные поля: `pos`, `rot`, `vel` и другие из [справочника](/ru/plugins/api/lua/#nodevehiclestransformsselect---arrayrecordidposrotvelangveltimepingseqpausedtransitioningteleportvelocitystephascontrolscontrolselectricsageseconds).
