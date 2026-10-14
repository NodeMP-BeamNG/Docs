---
title: События
description: Вход игрока по шагам, четыре вида событий, что получают обработчики, отказ с причиной, сетевые события от клиентов и фильтр ретрансляции.
---

Всё, что делает серверная часть, начинается с события. Один вызов подписывается на любое из них —
`node.on(name, fn)`, — а имя решает, что получит `fn`. На этой странице — виды событий и визит
игрока от начала до конца; в [справочнике событий](/ru/plugins/api/events/) — все имена с точными
аргументами.

## Вход по шагам

Вот что происходит между нажатием **Join** и тем, как игрок едет по карте, и где своё слово может
сказать ваш код. Шаги без события — дело самого сервера.

1. **Дверь.** Лаунчер подключается и предъявляет билет из списка серверов. Сервер проверяет его и
   список банов. Забаненного разворачивают здесь, раньше, чем о нём узнает любой плагин.
2. **Место и имя.** Игрок получает номер и отображаемое имя. Если на сервере уже есть игрок с таким
   именем, новичок получает `Имя#<номер>`.
3. **`playerConnectRequest(player, name)`.** Ваш шанс отказать — с причиной, которую игрок увидит.
   Имя, IP и поля аккаунта уже читаются; ничего ещё не скачано. На полном сервере его тоже
   спрашивают, с `player.overCapacity`, так что можно пустить человека на резервное место
   ([Игроки и машины → Резервные места](/ru/plugins/players-and-vehicles/#резервные-места)).
4. **`playerAuthenticated(player)`.** Игрока впустили. Хорошее место, чтобы загрузить то, что вы о
   нём храните.
5. **Проверка файлов игры.** Лаунчер проверяет файлы игры на том уровне, который просит сервер.
   **`playerVerifyReported(player, report)`** сообщает результат — уже после вердикта сервера.
6. **Моды.** Игрок скачивает то, чего у него нет. События нет; это может занять минуты.
7. **Карта и клиентские скрипты.** Имя карты и клиентские файлы всех ресурсов уходят вместе, чтобы
   игра подготовила их, пока грузится карта.
8. **`playerJoining(player)`.** Игра игрока сейчас грузит карту. Машин у него ещё нет. Удобный
   момент, чтобы сказать остальным «Alice загружается» или запустить таймер, сколько длится вход.
9. **`playerJoined(player)`.** Игрок в мире и получил все машины. Обычное место, чтобы
   поздороваться, выдать роль и вернуть его состояние.

Во время игры **`playerLagging(player, silentSec)`** срабатывает, когда от игрока несколько секунд
ничего не приходит (по умолчанию 8), а **`playerRecovered(player, silentSec)`** — когда он вернулся.
Лагающий игрок сохраняет место за рулём и свои машины.

В конце — **`playerLeft(player, reason)`**. Имя ещё читается. Пешеходный аватар игрока удаляется, а
его машины остаются в мире без владельца. `reason` — тот же текст, что в строке ухода в логе
сервера: `"Connection closed by the client"`, текст кика и так далее. С `"Replaced"` (тот же аккаунт
зашёл снова) сравнивайте точно, остальное считайте обычным текстом.

Две вещи, которые стоит помнить:

- `playerLeft` срабатывает для каждого, кто получил номер, — в том числе для игрока, которому вы
  отказали в `playerConnectRequest`, и для того, кто вышел во время скачивания. Не перед каждым
  `playerLeft` был `playerJoined`.
- После обрыва связи сервер держит место 30 секунд (по умолчанию) на случай, если лаунчер
  переподключится. Вернувшийся игрок вызывает `playerRecovered`, а не второй `playerJoined`; не
  вернувшийся — `playerLeft`, когда окно истечёт.

<!-- doctest: server+client -->
```lua
node.on("playerConnectRequest", function(player, name)
    if name:lower():find("admin", 1, true) then
        return false, "Names with 'admin' in them are reserved"
    end
    node.log("%s may join", name)
end)

node.on("playerJoining", function(player)
    node.log("%s is loading the map", player.name)
end)

node.on("playerJoined", function(player)
    player:tell("Welcome, %s. %d online.", player.name, node.players.count())
end)

node.on("playerLeft", function(player, reason)
    node.log("%s left: %s", tostring(player.name), reason)
end)

-- expect: Alice may join
-- expect: Alice is loading the map
-- expect-client: Alice chat:msg .*Welcome, Alice\. 1 online\.
-- expect: Alice left: .+
```

## Четыре вида, один node.on

| Вид | Имена | Обработчик получает | Возвращаемое значение |
|---|---|---|---|
| **События движка** | `<subject><Verb-ed>`, после того как что-то случилось: `playerJoined`, `vehicleSpawned`, `serverTick` | сам объект (`Player` или `Vehicle`) или ничего | игнорируется |
| **Уведомления** | после того как сервер обработал действие игрока: `vehicleEdited`, `playerSeatChanged`, `chatMessage` | `(player, vehicle, payload)` или `(player, payload)`, если машины нет | игнорируется |
| **Запросы** | `<subject><Action>Request`, до того как сервер выполнит просьбу игрока: `vehicleSpawnRequest`, `chatMessageRequest` | как уведомления | `false[, reason]` — отказ |
| **Сетевые события** | любое другое имя, обычно `<область>:<глагол>`: `race:finish` | `(player, data)`, `data` — как прислал клиент | игнорируется |

У двух каналов свои вызовы: сообщения между ресурсами ([Шина](/ru/plugins/bus/)) и сырые байты для
нативных модулей (`node.modules.on`). Фильтр ретрансляции ставится через `node.relay.filter`
([ниже](#фильтр-ретрансляции)). Все обработчики выполняются в одном рабочем потоке, по одному за
раз, в порядке подписки; на одно имя могут подписаться несколько ресурсов.

### Имена

События движка и уведомления называются `<subject><Verb-ed>`: что случилось, после того, с чем
случилось. Запросы — `<subject><Action>Request`. Приставки `on` нет, настоящего времени тоже. Имена,
переименованные в прошлом, больше не работают: `node.on` отклоняет их одной ошибкой с новым именем
(`event "playerJoin" was renamed to "playerJoined"; nothing is subscribed to the old name`). Полный
список — в [справочнике событий](/ru/plugins/api/events/#renamed-events).

## Что получает обработчик

Там, где сервер работает с номерами, `node.on` даёт вам объекты. `Player` — маленькая таблица с
`id`; чтение `player.name`, `player.ip`, `player.role` или `player.accountId` один раз получает
запись игрока и сохраняет её в объекте. Методы вроде `player:kick`, `player:send`, `player:tell` и
`player:vehicles` действуют по номеру. `Vehicle` устроен так же. Подробности — на странице
[Игроки и машины](/ru/plugins/players-and-vehicles/).

Данные в JSON приходят уже декодированными: конфигурация спавна — таблица с `config.jbm`, вызов
сцепки — с `call.controllerName`. Исключение — сетевые события: их `data` — ровно то, что прислал
клиент, декодируйте сами через `node.json.decode`.

Номера переиспользуются. `Player` из `playerLeft` ещё знает своё имя, но его `id` позже достанется
другому. Всё долгоживущее храните по `player.accountId` (для гостей — по `player.name`) и проверяйте
`player:isConnected()` после ожидания.

`node.raw.on(name, fn)` подписывается с сырыми аргументами (номера и текст JSON) — для горячих
путей, где объекты не нужны.

## События движка

Срабатывают после того, как что-то случилось; возвращаемое значение игнорируется.

- **Игроки.** `playerAuthenticated`, `playerJoining`, `playerJoined`, `playerLeft`,
  `playerPolicyChanged` (игрок изменил, кто может пользоваться его машинами), `playerCameraChanged`,
  `playerFrozenChanged` (ресурс заморозил или отпустил игрока; смотрите `player.frozen`).
- **Сервер и ресурс.** `serverTick` (каждые 100 мс, без аргумента; держите его лёгким),
  `serverShutdown` (сохраните нужное; таймеры больше не сработают), `resourceUnload(reason)`
  ([Ресурсы → Сохранить перед выгрузкой](/ru/plugins/resources/#сохранить-перед-выгрузкой)).
- **Машины.** `vehicleSpawned`, `vehicleTagsChanged`, `vehicleLockChanged`, `vehicleDamageChanged`,
  `vehicleTeleported`, `vehicleBreakGroupsChanged`.
- **Потоки.** `vehiclePositionChanged`, `vehicleInputsChanged`, `vehicleElectricsChanged`,
  `vehiclePowertrainChanged`, `vehicleEngineChanged`, `vehicleNodesChanged`,
  `playerInputsChanged`, `playerHeadPoseChanged`. Приходят до 60 раз в секунду на машину и
  сливаются, так что медленный обработчик видит меньше событий, а не растущую очередь. Обработчик
  получает только объект; последнее состояние читайте соответствующим методом
  (`vehicle:transform()`, `player:inputs()`). Для радара или мини-карты лучше читать все машины
  разом по таймеру ([Игроки и машины → Быстро читать мир](/ru/plugins/players-and-vehicles/#быстро-читать-мир)).

## Уведомления

Срабатывают после того, как сервер обработал действие игрока. Данные в JSON приходят декодированными.

| Событие | Аргументы | Когда |
|---|---|---|
| `vehicleDeleted` | `vehicle, cause` | Машина исчезла из мира. `cause` — `"player"`, `"server"`, `"leave"` (пешеходный аватар ушедшего), `"seat"` или `"replace"`. Записи к этому моменту уже нет; смысл имеет только `vehicle.id`. |
| `vehicleRespawned` | `player, vehicle, config` | Игрок заменил машину, за рулём которой сидит. |
| `vehicleEdited` | `player, vehicle, config` | Применены новые детали или настройка. |
| `vehicleReset` | `player, vehicle, posRot` | Машину сбросили. `posRot.cause` — `"player"` или `"server"`; при сбросе сервером `player` равен `nil`. |
| `vehiclePainted` | `player, vehicle, paints` | Новая покраска. |
| `playerSeatChanged` | `player, vehicle, role` | Сел, вышел или его пересадили. `vehicle` — `nil`, если пешком; `role` — `"driver"`, `"passenger"` или `"none"`. |
| `vehicleCouplerChanged`, `vehicleControllerChanged` | `player, vehicle, call` | Прошёл вызов двери, сцепки или контроллера. |
| `chatMessage` | `player, msg` | Судьба строки чата решена ([Чат](/ru/plugins/chat/#следить-за-чатом)). |
| `playerVerifyReported` | `player, report` | Закончилась проверка файлов игры ([Клиентские скрипты → Строгие сессии](/ru/plugins/client-scripting/#строгие-сессии-sessionconfigstrict)). |
| `playerLagging`, `playerRecovered` | `player, silentSec` | См. [вход](#вход-по-шагам). |
| `serverShutdownScheduled` | `info` | Ресурс назначил остановку через `node.server.shutdown(reason, delayMs)`: `info.reason`, `info.at` (секунды Unix) и `info.by` (ресурс). Когда остановку отменили, `info.cancelled` равно `true`. [Рецепт](/ru/plugins/recipes/#перезапуск-с-обратным-отсчётом) ведёт отсчёт в чате. |

<!-- doctest: server -->
```lua
node.on("vehicleEdited", function(player, vehicle, config)
    node.log("%s edited %s (%s)", tostring(player), tostring(vehicle), tostring(config.jbm))
end)

node.on("playerSeatChanged", function(player, vehicle, role)
    if vehicle then
        node.log("%s is now %s of %s", tostring(player), role, tostring(vehicle))
    end
end)

node.on("vehicleDeleted", function(vehicle, cause)
    node.log("vehicle %d gone (%s)", vehicle.id, cause)
end)

node.on("serverShutdownScheduled", function(info)
    if info.cancelled then
        node.chat.say("The restart is off")
    else
        node.chat.say("Restart in %d seconds: %s", info.at - os.time(), info.reason)
    end
end)
```

## Запросы: как сказать «нет»

Запрос срабатывает до того, как сервер выполнит просьбу игрока. Верните `false`, по желанию с
причиной, чтобы отказать; не возвращайте ничего, чтобы разрешить. Обработчик, который ничего не
возвращает, может просто наблюдать: он видит каждый запрос и ничего не меняет.

Выполняются все обработчики, даже после отказа одного из них, так что наблюдатели видят всё;
используется первая названная причина. Обработчик, упавший с ошибкой, не отказывает. Исключение —
чат: там первый `false` обрывает цепочку ([Чат](/ru/plugins/chat/#отказать-и-переписать)).

| Запрос | Аргументы | Отказ |
|---|---|---|
| `playerConnectRequest` | `player, name` | разворачивает игрока; он видит причину. |
| `vehicleSpawnRequest` | `player, requestedId, config` | убирает машину, которую игрок только что создал. `requestedId` — номер клиента, а не итоговый. |
| `vehicleEnterRequest`, `vehicleExitRequest` | `player, vehicle, role` | оставляет игрока где был; он видит причину. |
| `vehicleEditRequest`, `vehiclePaintRequest` | `player, vehicle, config` / `paints` | откатывает машину игрока к тому, что было на сервере; причину он видит, если вы её дали. |
| `vehicleCouplerRequest` | `player, vehicle, call` | дверь или сцепка остаётся как была. |
| `vehicleTriggerRequest` | `player, vehicle, call` | запрещает нажать что-то в чужой машине. Явный `true` разрешает, даже если владелец машины не пускает других к своим органам управления. |
| `vehicleNodeGrabRequest` | `player, vehicle, grab` | запрещает хватать машину экспериментальным захватом узлов. **Нет обработчика — тоже «нет»**: чтобы включить захват, нужен ресурс, который скажет «да» (см. `nodegrab-allow` в [примерах](/ru/plugins/examples/)). |
| `chatMessageRequest` | `player, msg` | строка не отправляется, отправителю объясняют почему. Строка или таблица в ответе переписывают её ([Чат](/ru/plugins/chat/#отказать-и-переписать)). |

Пример в духе `gatekeeper-example`: лимит машин с причиной и двери, которые открывает только
владелец машины.

<!-- doctest: server+client {"spawn": "coupe"} -->
```lua
local MAX_CARS_PER_PLAYER = 2

node.on("vehicleSpawnRequest", function(player, requestedId, config)
    if #player:vehicles() >= MAX_CARS_PER_PLAYER then
        return false, "Vehicle limit reached (" .. MAX_CARS_PER_PLAYER .. " per player)"
    end
    node.log("%s spawns a %s", tostring(player), tostring(config.jbm))
end)

node.on("vehicleCouplerRequest", function(player, vehicle, call)
    if vehicle.spawner and vehicle.spawner ~= player then
        return false -- only the spawner opens this car's doors
    end
end)

-- expect: Player#\d+ Alice spawns a coupe
```

`vehicleSpawnRequest` срабатывает до появления машины, поэтому `player:vehicles()` считает то, что у
игрока уже есть. Собственная настройка сервера `MaxCars` делает то же без ресурса; пример показывает
форму. То, что сервер делает сам (`vehicle:seat`, `vehicle:setCoupler`, `vehicle:trigger`,
`vehicle:lock`), эти хуки не спрашивает никогда.

## Сетевые события

Ресурс придумывает свои события между серверной и клиентской частью, просто используя имя. Тот же
`node.on` подписывается на них, а обработчик получает `(player, data)`, где `data` — строка, которую
клиент передал в `node.emitServer(name, data)`, обычно JSON.

Называйте их `<область>:<глагол>`, строчными, с одним двоеточием: `hello:count`, `race:finish`.
Имена, начинающиеся с `node:`, принадлежат NodeMP, как и `chat:send`, `chat:msg` и другие события
`chat:`. В обратную сторону: `player:send(event, data)` — одному игроку,
`node.broadcast(event, data)` — всем, `node.broadcast(event, data, except)` — всем, кроме одного.
Таблица кодируется в JSON за вас.

Сетевые события клиента доходят до сервера и дальше никуда. Чтобы передать что-то остальным
игрокам, перешлите сами:

<!-- doctest: server+client {"players": ["Alice", "Bob"], "emit": [["team:ping", "{\"at\": 1}"]]} -->
```lua
node.on("team:ping", function(sender, data)
    if type(data) ~= "string" or #data > 256 then return end -- untrusted input
    node.broadcast("team:ping", data, sender) -- everyone but the sender
end)

-- expect-client: Bob team:ping \{"at": 1\}
```

Не доверяйте `data`: любой может прислать что угодно из своей игры. Проверьте тип и длину,
декодируйте через `node.json.decode` и проверьте поля, прежде чем ими пользоваться.

## Фильтр ретрансляции

`relayRequest` — вопрос, который сервер задаёт про каждый пакет, который пересылает: должен ли этот
игрок увидеть этот пакет? Ставится через `node.relay.filter(fn)`.
`fn(fromPid, toPid, category, subtype, gid)` получает номера, а не объекты, потому что вызывается на
каждый пакет, и возвращает `false`, чтобы скрыть пакет от этого игрока. Ответы кешируются, поэтому
вызывайте `node.relay.invalidate()` каждый раз, когда меняются данные, которые читает фильтр.

<!-- doctest: server -->
```lua
local hidden = {} -- [gid] = { [pid] = true }

node.relay.filter(function(fromPid, toPid, cat, sub, gid)
    local peers = hidden[gid]
    if peers and peers[toPid] then return false end
end)

local function hide(vehicle, player)
    hidden[vehicle.id] = hidden[vehicle.id] or {}
    hidden[vehicle.id][player.id] = true
    node.relay.invalidate() -- the filter's data changed
end
```

Для правил «по комнатам» есть способ дешевле — группы видимости. `player:setGroup(n)` и
`vehicle:setGroup(n)` помещают игроков и машины в пронумерованные миры, и видят друг друга только
одинаковые номера — без фильтра и без кеша. Группа `0` — общий мир.

## Отписка

`node.off(name, fn?)` снимает обработчики этого ресурса для имени (все или только `fn`) и
возвращает, сколько снято. Перезагрузка в любом случае сбрасывает все подписки, так что тогда
убирать нечего.

## Дальше

- [Справочник событий](/ru/plugins/api/events/) — все имена и их точные аргументы.
- [Игроки и машины](/ru/plugins/players-and-vehicles/) — объекты, которые получают обработчики.
- [Таймеры и корутины](/ru/plugins/concurrency/) — как ждать, не задерживая всех.
