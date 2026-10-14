---
title: Игроки и машины
description: Объекты Player и Vehicle — кто такой игрок, как его найти, роли, кики и баны, заморозка и телепорт, спавн машин, теги и замки, места, чтение многих машин сразу.
---

Обработчики получают игроков и машины объектами: `Player` и `Vehicle`. Оба лёгкие: это таблица с
`id`, а остальные поля сервер отдаёт при первом обращении. Все поля и методы перечислены в
[справочнике API](/ru/plugins/api/lua/#player-objects).

## Игроки

### Как найти игрока

| Вызов | Что даёт |
|---|---|
| `node.players.all()` | Всех подключённых игроков, по id. |
| `node.players.get(id)` | Игрока с этим id. |
| `node.players.find(name)` | Игрока с этим именем, без учёта регистра; `nil`, если такого нет. |
| `node.players.count()` | Сколько игроков подключено. |

`tostring(player)` выглядит как `Player#3 Alice`. Два объекта одного игрока равны (`==`).

### Кто такой игрок

| Поле | Что значит |
|---|---|
| `name` | Имя в игре. Доступно и в `playerLeft`. |
| `accountId` | Номер аккаунта NodeMP; у гостя — `nil`. По нему и стоит сохранять данные. |
| `verified` | `true`, если сервер проверил билет игрока в NodeMP. |
| `guest` | `true`, если аккаунта нет: Test Drive или вообще без проверки. |
| `accountRoles` | Роль аккаунта в самом NodeMP, например `"ADM"`; у остальных пусто. |
| `locale` | Язык игры, например `"ru_RU"`, чтобы отвечать на нём. |
| `role` | Роль на этом сервере, её ставит ресурс через `player:setRole`. |

Поля читаются один раз и запоминаются в объекте. В пределах одного обработчика это то, что нужно;
чтобы увидеть изменения позже, вызовите `player:refresh()` или возьмите свежий объект через
`node.players.get(id)`.

### Роли

Роль — это слово, которое сервер хранит на время сессии, а игра показывает рядом с ником. Здесь
аккаунты из `[config]` становятся админами:

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

### Кики и баны

- `player:kick(reason)` отключает игрока, он увидит причину.
- `player:ban(reason)` банит аккаунт (если игрок вошёл в него) и адрес, и кикает.
- `player:ban(reason, os.time() + 3600)` банит на час, бан сервер снимет сам.
- `node.bans.add(who, reason, untilUnix)` банит адрес или номер аккаунта того, кого нет на сервере;
  `node.bans.remove(who)` снимает бан.

Баны хранятся в `bans.json` и переживают перезапуск ([Консоль, кики и баны](/ru/hosting/administration/#баны)).
Команда для модераторов с этими вызовами — на странице
[Чат и команды](/ru/plugins/chat/#команды-для-модераторов).

### Заморозка и телепорт

`player:freeze(true)` держит игрока на месте: его машины останавливаются для всех, а спавн, ресет и
пересадка отклоняются с `You are frozen by the server`. `player:freeze(false)` отпускает.

`player:teleport({ pos = { x = 0, y = 0, z = 1 } })` переносит машину, которой игрок управляет, или
самого игрока, если он пешком, и ничего не чинит. Чтобы у игрока в игре это выглядело правильно,
нужен клиентский мод начиная с 1.7.4; со старым модом телепорт ещё и чинит машину.

### Отдельные миры

`player:setGroup(n)` и `vehicle:setGroup(n)` разводят игроков и машины по группам с номерами. Группа
0 — общий мир. Игроки из разных групп не видят машин друг друга, а `local`-чат остаётся внутри
группы. Машины игрока переводите вместе с ним.

## Машины

### Кто есть кто в машине

| Поле | Что значит |
|---|---|
| `spawner` | Кто заспавнил машину; `nil`, если её создал сервер. |
| `driver` | Кто за рулём; `nil`, если пусто. |
| `authority` | Чья игра считает машину; обычно это водитель. |
| `passengers` | Пассажиры, списком игроков. |
| `isUnicycle` | `true` у пешехода: идущего игрока сервер тоже считает машиной. |
| `idleSeconds` | Сколько секунд машиной никто не управлял. |

Когда игрок уходит, его машины остаются в мире без хозяина. Удалять их — дело ресурса; это умеет
`vehicle-cleanup` из [примеров](/ru/plugins/examples/).

### Теги и замки

Теги — короткие заметки `ключ = значение`, которые сервер хранит у машины и рассылает всем игрокам.
Этот обработчик ставит тег каждой новой машине, в том числе той, что создаст команда `/car` ниже:

<!-- doctest: server+client -->
```lua
node.on("vehicleSpawned", function(vehicle)
    vehicle:setTag("team", "red")
    node.log("car %d: team %s", vehicle.id, vehicle:tag("team"))
end)

-- expect: car \d+: team red
```

`node.vehicles.byTag("team", "red")` находит все машины с этим тегом.

`vehicle:lock("locked", { player })` пускает в машину только перечисленных игроков, `"driver-only"`
оставляет им место водителя, `vehicle:unlock()` открывает машину. Замок останавливает только новые
посадки: тех, кто уже внутри, он не выбрасывает.

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

Конфигурация — та же таблица, которую игра присылает, когда игрок спавнит машину: `jbm` — модель,
`vcf` — комплектация. Положение — `{ pos = { x, y, z }, rot = { x, y, z, w } }`, `rot` можно не
указывать.

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

На `spawnVehicle` действует `MaxCars`, как и на собственные машины игрока. Второе значение говорит,
почему машина не появилась (`"max_cars"`, `"bad_config"`, `"not_joined"`).

### Много машин сразу

Читать машины по одной в быстром цикле медленно. `node.vehicles.transforms` читает все за один вызов,
и только те поля, которые вы попросили:

<!-- doctest: server+client -->
```lua
node.every(1000, function()
    local cars = node.vehicles.transforms({ "pos" })
    node.log("%d car(s) reported", #cars)
end)

-- expect: \d+ car\(s\) reported
```

В каждой записи есть `id` машины и запрошенные поля: `pos`, `rot`, `vel` и другие из
[справочника](/ru/plugins/api/lua/#nodevehiclestransformsselect---arrayrecordidposrotvelangveltimepingseqpausedtransitioningteleportvelocitystephascontrolscontrolselectricsageseconds).
