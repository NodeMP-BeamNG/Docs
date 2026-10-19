---
title: События
description: Виды событий и как их называть, порядок, в котором игрок заходит и выходит, отказ в запросе с причиной, резервные места, отписка и события, которые приходят много раз в секунду.
---

Плагин работает в обработчиках событий. `node.on(имя, обработчик)` подписывает функцию, а сервер вызывает её, когда событие происходит. [Справочник событий](/ru/plugins/api/events/) перечисляет все события с их аргументами, а здесь описано, как они связаны между собой.

## Виды событий

| Вид | Примеры | Что получает обработчик | Что возвращать |
|---|---|---|---|
| События сервера | `playerJoined`, `vehicleSpawned`, `serverShutdown` | Объект `Player` или `Vehicle`, если событие о нём | Не важно. |
| Уведомления | `vehicleEdited`, `vehicleReset`, `chatMessage` | Игрока, машину, если она есть, и данные; JSON уже разобран | Не важно. |
| Запросы | `playerConnectRequest`, `vehicleSpawnRequest`, `chatMessageRequest` | Игрока, машину, если она есть, и данные; JSON уже разобран | `false, "причина"` отказывает. |
| Сетевые события | `greeter:hello`, любое своё имя | Игрока и данные строкой | Не важно. |

Имя, которого сервер не знает, считается сетевым событием, сообщением от клиентского скрипта ([Клиентские скрипты](/ru/plugins/client-scripting/)). Клиент не может вызвать событие сервера, а имена с `node:` в начале сервер отбрасывает. Сообщения между плагинами идут по [шине](/ru/plugins/bus/), а не через `node.on`.

Названия строятся по правилам:

| Что | Правило | Примеры |
|---|---|---|
| События сервера и уведомления | `<кто><что сделал>` | `playerJoined`, `vehicleSpawned` |
| Запросы | `<кто><действие>Request` | `vehicleSpawnRequest`, `chatMessageRequest` |
| Сетевые события и сообщения шины | `<плагин>:<что>`, строчными | `race:start`, `score:add` |

На одно событие можно подписать несколько обработчиков, из одного плагина или из разных. Они выполняются по очереди ([Таймеры и корутины](/ru/plugins/concurrency/)). Одну и ту же функцию на одно и то же событие подписать дважды нельзя: вторая подписка заменяет первую.

## Порядок входа

При заходе на сервер игрок проходит через события:

1. `playerConnectRequest`: игрок подключился и просится на сервер. Баны уже проверены, и здесь можно отказать.
2. `playerAuthenticated`: игрока пустили. Имя и адрес известны, машин ещё нет.
3. `playerJoining`: моды скачаны, карта отправлена, игра загружает уровень.
4. `playerJoined`: игрок в мире. Обычное место, чтобы поздороваться, выдать роль и восстановить сохранённые данные.

На выходе событие одно, `playerLeft`, с причиной, по которой закончилась сессия.

<!-- doctest: server+client -->
```lua
local function logConnectRequest(player, name)
    node.log("playerConnectRequest: %s", name)
end

node.on("playerConnectRequest", logConnectRequest)

local function logAuthenticated(player)
    node.log("playerAuthenticated: %s", player.name)
end

node.on("playerAuthenticated", logAuthenticated)

local function logJoining(player)
    node.log("playerJoining: %s", player.name)
end

node.on("playerJoining", logJoining)

local function logJoined(player)
    node.log("playerJoined: %s", player.name)
end

node.on("playerJoined", logJoined)

local function logLeft(player, reason)
    node.log("playerLeft: %s (%s)", player.name, reason)
end

node.on("playerLeft", logLeft)

-- expect: playerConnectRequest: Alice
-- expect: playerAuthenticated: Alice
-- expect: playerJoining: Alice
-- expect: playerJoined: Alice
-- expect: playerLeft: Alice
```

Оборванное соединение не заканчивает сессию сразу. После `[network] lag_grace_sec` тишины сервер вызывает `playerLagging`, а если игрок вернулся, вызывает `playerRecovered`. `playerLeft` срабатывает, когда:

- игрок вышел сам;
- игрока кикнули;
- игрок не вернулся за `[network] disconnect_sec`;
- тот же аккаунт вошёл заново, пока старая сессия висела на обрыве. Причина тогда `Replaced`, и `playerLeft` приходит раньше `playerAuthenticated` новой сессии.

Игрок, который успел переподключиться, события входа заново не проходит.

Данные игрока храните по `player.accountId`, а не по `player.id` ([Общие правила API](/ru/plugins/conventions/#какие-id-живут-долго)).

## Отказ в запросе

Обработчик запроса, который вернул `false`, отказывает, а второе значение становится причиной, которую увидит игрок. Остальные обработчики всё равно выполняются, и игрок видит причину первого отказа; только в чате первый отказ обрывает цепочку. Если ничего не вернуть, запрос проходит.

<!-- doctest: server+client -->
```lua
local function admitAccountsOnly(player, name)
    if player.guest then
        return false, "This server is for players with an account"
    end
    node.log("%s may join", name)
end

node.on("playerConnectRequest", admitAccountsOnly)

-- expect: Alice may join
```

С машинами то же самое. Здесь плагин запрещает на сервере одну модель:

<!-- doctest: server+client {"spawn": "coupe"} -->
```lua
local banned = { pickup = true }

local function refuseBannedModels(player, requestedId, config)
    node.log("%s wants a %s", player.name, config.jbm)
    if banned[config.jbm] then
        return false, "This car isn't allowed here"
    end
end

node.on("vehicleSpawnRequest", refuseBannedModels)

-- expect: Alice wants a coupe
```

Правку деталей или настроек машины плагин проверяет в `vehicleEditRequest`. Правка приходит пачкой с тем, что изменилось, но в `config` обработчик всегда получает всю конфигурацию, какой машина станет после правки. Отказ откатывает только эту пачку: машина возвращается к конфигу, который сервер принял последним. Причину отказа игрок увидит на экране, а без причины машина откатится молча.

За запросом можно следить, не вмешиваясь: тогда ничего не возвращайте. Какие запросы бывают и что делает отказ в игре, описано в [справочнике событий](/ru/plugins/api/events/#cancellable-requests-decide).

## Резервные места

На полном сервере `playerConnectRequest` всё равно срабатывает, и `player.overCapacity` равно `true`. Обработчик, который явно вернул `true`, пускает игрока сверх `max_players`, а один `false` отказывает, что бы ни ответили другие. Если `true` не вернул никто, сервер откажет сам (`Server full!`).

<!-- doctest: server -->
```lua
local reserved = { [42] = true }

local function admitReserved(player)
    if player.overCapacity and reserved[player.accountId] then
        return true
    end
end

node.on("playerConnectRequest", admitReserved)
```

## Уведомления

Уведомления сообщают о том, что уже случилось. В них нельзя отказать, зато в них есть подробности:

<!-- doctest: server+client {"spawn": "coupe"} -->
```lua
local function logSpawned(vehicle)
    node.log("car %d spawned by %s", vehicle.id, vehicle.name)
end

node.on("vehicleSpawned", logSpawned)

local function logDeleted(vehicle, cause)
    node.log("car %d deleted (%s)", vehicle.id, cause)
end

node.on("vehicleDeleted", logDeleted)

-- expect: car \d+ spawned by Alice
```

Чат удобно записывать по `chatMessage`: к этому моменту сервер уже решил, что стало с каждой строкой ([Чат и команды](/ru/plugins/chat/)).

## Отписка

`node.off(имя, обработчик)` снимает один обработчик, `node.off(имя)` снимает все обработчики этого плагина для события. Обработчик может снять сам себя:

<!-- doctest: server+client -->
```lua
local function firstJoin(player)
    node.log("first player: %s", player.name)
    node.off("playerJoined", firstJoin)
end

node.on("playerJoined", firstJoin)

-- expect: first player: Alice
```

Чтобы выполнить код после того, как событие увидели остальные обработчики, используйте `node.defer(fn)` ([Таймеры и корутины](/ru/plugins/concurrency/#таймеры)).

## События, которые приходят много раз в секунду

`vehiclePositionChanged`, `vehicleElectricsChanged` и похожие приходят на каждый пакет машины, до 60 раз в секунду на машину. Они передают только машину, а её текущее состояние обработчик читает через `vehicle:transform()` и похожие методы. Если обработчик не успевает, он видит меньше событий, а очередь не растёт. Для карты или радара лучше таймер и один вызов `node.vehicles.transforms()`, который читает все машины сразу ([Игроки и машины](/ru/plugins/players-and-vehicles/#много-машин-сразу)).
