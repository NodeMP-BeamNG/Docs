---
title: События
description: Виды событий, порядок, в котором игрок заходит и выходит, отказ в запросе с причиной, резервные места, отписка и события, которые приходят много раз в секунду.
---

Ресурс использует обработчики событий. `node.on(имя, обработчик)` подписывается, а сервер вызывает обработчик, когда событие происходит. 

[Справочник событий](/ru/plugins/api/events/) перечисляет все события с их аргументами, здесь описано как они связаны между собой.

## Виды событий

| Вид | Примеры | Что получает обработчик | Что возвращать |
|---|---|---|---|
| События сервера | `playerJoined`, `vehicleSpawned`, `serverShutdown` | Объект: `Player` или `Vehicle` | Не важно. |
| Уведомления | `vehicleEdited`, `vehicleReset`, `chatMessage` | Игрока, машину и данные, уже разобранные | Не важно. |
| Запросы | `playerConnectRequest`, `vehicleSpawnRequest`, `chatMessageRequest` | Игрока, машину и данные | для отмены действия - `false, "причина"` |
| Сетевые события | `greeter:hello`, любое своё имя | Игрока и данные строкой | Не важно. |

Любые события, которые не входят в базовые (Уведомления, Запросы, События сервера), это - `сетевое событие`. 
Обычно `сетевое событие` - это всегда сообщение от клиентского скрипта ([Клиентские скрипты](/ru/plugins/client-scripting/)). 

Сообщения между ресурсами идут по [шине](/ru/plugins/bus/), а не через `node.on`.

<chek this>
На одно событие можно подписать несколько обработчиков, из одного ресурса или из разных. Они
выполняются по очереди.

## Порядок входа

При заходе на сервер игрок проходит через события:

1. `playerConnectRequest` — игрок вошёл в аккаунт и просится на сервер. Баны уже проверены. Здесь
   можно отказать.
2. `playerAuthenticated` — игрока пустили. Имя и адрес известны, машин ещё нет.
3. `playerJoining` — моды скачаны, карта отправлена, игра загружает уровень.
4. `playerJoined` — игрок в мире. Обычное место, чтобы поздороваться, выдать роль, восстановить
   сохранённые данные.

На выходе событие одно — `playerLeft`, с причиной, по которой закончилась сессия.

<!-- doctest: server+client -->
```lua
local steps = { "playerAuthenticated", "playerJoining", "playerJoined" }
for _, name in ipairs(steps) do
    node.on(name, function(player)
        node.log("%s: %s", name, player.name)
    end)
end

node.on("playerConnectRequest", function(player, name)
    node.log("playerConnectRequest: %s", name)
end)

node.on("playerLeft", function(player, reason)
    node.log("playerLeft: %s (%s)", player.name, reason)
end)

-- expect: playerConnectRequest: Alice
-- expect: playerAuthenticated: Alice
-- expect: playerJoining: Alice
-- expect: playerJoined: Alice
-- expect: playerLeft: Alice
```

Если соединение с игроком обрывается, сессия не исчезает, вызывает ивент `playerLagging`, и если игрок вернулся `playerRecovered`. `playerLeft` вызывается если:
- Игрок вышел сам
- Игрока кикнули
- Игрок после вылета не вернулся за `disconnect_sec`

Если игрок успевает за `disconnect_sec`, то он не проходит заново события входа.

Локальный серверный Id игроков переиспользуются: ушедший игрок освобождает id для следующего. Храните данные по
`player.accountId` (аккаунт) или по имени, но не по id.

## Отказ в запросе

Обработчик запроса, который вернул `false`, отказывает, а второе значение — причина, которую увидит
игрок. Побеждает первый отказ. Если ничего не вернуть, запрос проходит.

<!-- doctest: server+client -->
```lua
node.on("playerConnectRequest", function(player, name)
    if player.guest then
        return false, "This server is for players with an account"
    end
    node.log("%s may join", name)
end)

-- expect: Alice may join
```

С машинами то же самое. Здесь ресурс не пускает на сервер одну модель:

<!-- doctest: server+client {"spawn": "coupe"} -->
```lua
local banned = { pickup = true }

node.on("vehicleSpawnRequest", function(player, requestedId, config)
    node.log("%s wants a %s", player.name, config.jbm)
    if banned[config.jbm] then
        return false, "This car isn't allowed here"
    end
end)

-- expect: Alice wants a coupe
```

Изменения деталей и настроек машины проходят через `vehicleEditRequest`, и в `config` всегда вся
конфигурация, которая получится у машины. Сервер получает
правку пачкой — только то, что изменилось, — но обработчик по-прежнему получает весь конфиг. Отказ откатывает только эту пачку: машина игрока возвращается к конфигу, который сервер
принял последним, а в нём остаются все прошлые правки, которые прошли.

На любой запрос можно и просто смотреть, ничего не решая, — ничего не возвращайте. Какие запросы
бывают и что делает отказ в игре, сказано в
[справочнике событий](/ru/plugins/api/events/#cancellable-requests-decide).

## Резервные места

На полном сервере `playerConnectRequest` всё равно срабатывает, и у игрока стоит
`player.overCapacity`. Обработчик, который явно вернул `true`, пускает игрока сверх `max_players`.
Если промолчать, сервер откажет сам (`Server full!`).

<!-- doctest: server -->
```lua
local reserved = { [42] = true } -- account ids

node.on("playerConnectRequest", function(player)
    if player.overCapacity and reserved[player.accountId] then
        return true
    end
end)
```

## Уведомления

Уведомления говорят, что уже случилось. Отказать от них нельзя, зато у них есть подробности:

<!-- doctest: server+client {"spawn": "coupe"} -->
```lua
node.on("vehicleSpawned", function(vehicle)
    node.log("car %d spawned by %s", vehicle.id, vehicle.name)
end)

node.on("vehicleDeleted", function(vehicle, cause)
    node.log("car %d deleted (%s)", vehicle.id, cause)
end)

-- expect: car \d+ spawned by Alice
```

Чат удобно записывать по `chatMessage`: к этому моменту сервер уже решил, что стало с каждой строкой
([Чат и команды](/ru/plugins/chat/)).

## Отписка

`node.off(имя, обработчик)` снимает один обработчик, `node.off(имя)` — все обработчики этого ресурса
для события. Обработчик может снять сам себя:

<!-- doctest: server+client -->
```lua
local function firstJoin(player)
    node.log("first player: %s", player.name)
    node.off("playerJoined", firstJoin)
end

node.on("playerJoined", firstJoin)

-- expect: first player: Alice
```

`node.defer(fn)` выполняет `fn`, когда все обработчики текущего события уже отработали, — так можно
действовать после того, как событие увидели остальные.

## События, которые приходят много раз в секунду

`vehiclePositionChanged`, `vehicleElectricsChanged` и похожие приходят на каждый пакет машины, до 60
раз в секунду на машину. Они передают только машину, а текущее состояние читают через
`vehicle:transform()` и похожие методы. Если обработчик не успевает, он видит меньше событий, но
очередь не растёт. И всё же для карты или радара один вызов `node.vehicles.transforms()` по таймеру
читает все машины сразу и обходится гораздо дешевле
([Игроки и машины](/ru/plugins/players-and-vehicles/#много-машин-сразу)).