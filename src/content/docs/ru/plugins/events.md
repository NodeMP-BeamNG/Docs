---
title: События
description: Четыре вида событий, что получают обработчики, отказ в запросе, сетевые события от клиентов, шина между ресурсами и модульный канал.
---

Всё, что делает серверная половина, начинается с события. Один вызов подписывает на все из них -
`node.on(name, fn)` - и имя решает, какого вида это событие и что получит `fn`. Эта страница
объясняет виды и формы; в [справочнике событий](/ru/plugins/api/events/) перечислено каждое имя с
его точными аргументами.

## Четыре вида, один node.on

| Вид | Имена | Обработчик получает | Возвращаемое значение |
|---|---|---|---|
| События движка (наблюдать) | `<subject><Verb-ed>`, сервер вызывает их после того, как что-то произошло: `playerJoined`, `vehicleSpawned`, `serverTick` | субъект - `Player` или `Vehicle` - или ничего | игнорируется |
| Уведомления о машинах (наблюдать, с данными) | после того, как сервер ретранслировал и закэшировал действие игрока: `vehicleEdited`, `playerSeatChanged` | `(player, vehicle, payload)` | игнорируется |
| Отменяемые запросы (решать) | `<subject><Action>Request`, до того как сервер выполнит то, что попросил клиент: `vehicleSpawnRequest` | `(player, vehicle, payload)` - или имя, или предложенный идентификатор во втором слоте | `false[, reason]` отклоняет |
| Сетевые события от клиентов | любое другое имя, по соглашению `<domain>:<verb>`: `chat:send` | `(player, data)`, где `data` - строка, которую прислал клиент | игнорируется |

Ещё у двух каналов свои вызовы подписки: шина между ресурсами (`node.bus.on`) и двоичный модульный
канал (`node.modules.on`). Фильтр ретрансляции, `relayRequest`, устанавливается через
`node.relay.filter`. Все обработчики выполняются в рабочем потоке плагинов, по одному за раз, в
порядке регистрации; на одно имя могут подписаться несколько ресурсов.

## Именование

Два правила покрывают каждое имя серверного события:

1. **Уведомление читается как `<subject><Verb-ed>`** - что произошло, в прошедшем времени, после
   субъекта, с которым это произошло: `playerJoined`, `playerLeft`, `vehicleSpawned`,
   `vehicleDeleted`, `vehicleEdited`, `playerSeatChanged`, `serverShutdown`. Обработчик наблюдает;
   его возвращаемое значение игнорируется.
2. **Запрос, который обработчик может отклонить, читается как `<subject><Action>Request`** - что
   просит клиент, до того как сервер это сделает: `playerConnectRequest`, `vehicleSpawnRequest`,
   `vehicleEnterRequest`. `false[, reason]` отклоняет. Фильтр ретрансляции - тоже запрос,
   `relayRequest`: `false` скрывает один пакет от одного получателя.

Префикса `on` нет - его уже говорит `node.on(...)` - и настоящего времени нет. У сетевых событий
своё правило, `<domain>:<verb>` (`chat:send`); модульные каналы и события шины не изменились.

Серверы до 1.2.0 использовали другие написания, и каждое из них продолжает работать как
**устаревший псевдоним**: `playerJoin` → `playerJoined`, `playerConnecting` →
`playerAuthenticated`, `onShutdown` → `serverShutdown`, `onPlayerConnectRequest` →
`playerConnectRequest`, `onVehicle…Request` → `vehicle…Request` (spawn, enter, exit, coupler, edit,
paint, trigger, node grab), `canRelay` → `relayRequest`. Старое имя подписывает на то же событие,
что и новое, и пишет одно предупреждение на ресурс на старое имя - когда ресурс использует его в
первый раз:

```text
[deprecated] event "onPlayerConnectRequest" is now "playerConnectRequest"
```

Оба написания - одно событие: `node.off` принимает любое из них для обработчика, подписанного под
любым из них; две разные функции под двумя написаниями - два обработчика (выполняются оба), а одна
и та же функция под обоими написаниями - одна подписка (`node.on` заменяет, так что она выполняется
один раз). C ABI принимает старые имена так же. Псевдонимы будут удалены в 2.0 - переименуйте, когда
в следующий раз будете править ресурс; в [справочнике событий](/ru/plugins/api/events/#renamed-events)
перечислена каждая пара.

## Что получает обработчик

Где у raw API идентификаторы, `node.on` даёт вам объекты. `Player` - таблица с `id` и метатаблицей:
чтение `player.name`, `player.ip`, `player.role`, `player.vehicle` или `player.accountId` один раз
получает запись сессии и кэширует её на объекте; `player:refresh()` сбрасывает кэш; методы
(`player:kick`, `player:send`, `player:tell`, `player:setRole`, `player:vehicles`) действуют по
идентификатору. `Vehicle` устроен так же: `vehicle.spawner`, `vehicle.driver` и
`vehicle.passengers` - это Player, `vehicle.spawnerId` и `vehicle.driverId` - сырые
идентификаторы, `vehicle.tags` - таблица, а потоковое состояние (`vehicle:transform()`,
`vehicle:electrics()`) - метод, потому что каждый раз это свежее чтение. Два объекта равны по `==`,
когда совпадают их идентификаторы; `tostring(player)` читается как `Player#3 Alice`,
`tostring(vehicle)` - как `Vehicle#12 Alice`.

Полезные нагрузки, которые на проводе являются JSON, приходят декодированными: конфигурация
спавна - таблица с `config.jbm`, вызов сцепки имеет `call.controllerName`. Где нагрузка - имя роли,
она остаётся строкой. Исключение - сетевые события: их `data` - ровно то, что прислал клиент,
поэтому декодируйте его сами через `node.json.decode`.

Идентификаторы переиспользуются. `Player` из обработчика `playerLeft` ещё знает своё имя, но
`player.id` позже достанется кому-то другому - ключом для всего долговременного делайте
`player.accountId` или `player.name`, а после `node.sleep` проверяйте `player:isConnected()`.

`node.raw.on(name, fn)` подписывает с сырыми аргументами - идентификаторами и текстом JSON - для
горячих путей, где вы не хотите строить объекты.

## События движка (наблюдать)

Сервер вызывает их после того, как что-то произошло; возвращаемые значения игнорируются.

- **Жизненный цикл.** `playerAuthenticated` (аутентифицирован, вот-вот получит мир), `playerJoined`
  (обычное место, чтобы поприветствовать, назначить роль, восстановить состояние), `playerLeft`
  (его машины уходят примерно в то же время), `serverTick` (каждые 100 мс, без аргумента - держите
  его дешёвым), `serverShutdown` (сбросьте на диск, что должны; таймеры больше не сработают).
- **Реестр.** `vehicleSpawned`, `vehicleDeleted` (запись к этому моменту уже удалена; значим только
  `vehicle.id`), `vehicleTagsChanged`, `vehicleLockChanged`, `vehicleDamageChanged`.
- **Потоки.** `vehiclePositionChanged`, `vehicleInputsChanged`, `vehicleElectricsChanged`,
  `vehiclePowertrainChanged`, `vehicleEngineChanged`, `vehicleNodesChanged`,
  `playerInputsChanged`, `playerHeadPoseChanged`: одно событие на принятый пакет, с объединением,
  так что на машину ожидает не больше одной доставки - отстающий обработчик видит меньше событий,
  но никогда не растущую очередь. Аргумент - только объект; последнее состояние читайте геттером
  (`vehicle:transform()`, `player:inputs()`). Когда никто не подписан, ничего не ставится в
  очередь. Для радара вместо этого опрашивайте `node.vehicles.transforms()` по таймеру: одно
  чтение для всех машин.
- **Переходы.** `vehicleTeleported`, `vehicleBreakGroupsChanged`, `playerCameraChanged`: одно
  событие на отчёт, без объединения.

```lua
local greeted = {}

node.on("playerJoined", function(player)
    player:tell("Welcome, %s. %d online.", player.name, node.players.count())
    greeted[player.id] = true
end)

node.on("playerLeft", function(player)
    greeted[player.id] = nil -- the id will be reused
end)
```

## Уведомления о машинах (наблюдать, с данными)

Срабатывают после того, как сервер ретранслировал и закэшировал действие игрока над машиной.
Обработчики получают `(player, vehicle, payload)` - нагрузка декодирована в таблицу, где это JSON,
и остаётся строкой, где это имя роли; возвращаемые значения игнорируются. Шесть имён:
`vehicleEdited` (новая конфигурация), `vehicleReset` (позиция, в которую машина сброшена),
`vehiclePainted` (окраска), `playerSeatChanged` (`vehicle` равен `nil`, когда игрок теперь пешком;
`role` - `"driver"`, `"passenger"` или `"none"`), `vehicleCouplerChanged` и
`vehicleControllerChanged` (вызов).

```lua
node.on("vehicleEdited", function(player, vehicle, config)
    node.log("%s edited %s (%s)", tostring(player), tostring(vehicle), tostring(config.jbm))
end)

node.on("playerSeatChanged", function(player, vehicle, role)
    if vehicle then
        node.log("%s is now %s of %s", tostring(player), role, tostring(vehicle))
    end
end)
```

Сброс отклонить нельзя - нет чистого предыдущего значения, которое можно восстановить, - поэтому
это уведомление, а не запрос.

## Отменяемые запросы (решать)

Срабатывают до того, как сервер выполнит действие, которое попросил клиент. Обработчики получают
`(player, vehicle, payload)`, нагрузка декодирована, где это JSON; обработчик, вернувший `false` -
при желании со строкой причины вторым значением, - отклоняет действие, и побеждает первый отказ.
Каждое отменяемое имя можно и просто наблюдать: обработчик, который ничего не возвращает, видит
запрос и ничего не меняет. Имена читаются как `<subject><Action>Request`.

Каждый обработчик выполняется даже после того, как один уже отказал, поэтому наблюдатели всё
равно видят запрос. Обработчик, выбросивший ошибку, никогда не отклоняет. Причина едет туда, куда
её может донести провод - отказ в подключении показывается игроку как текст кика, - а иначе
пишется в лог.

Девять имён: `playerConnectRequest` (второй аргумент: запрошенное имя; баны проверяются до его
срабатывания), `vehicleSpawnRequest` (второй аргумент: идентификатор, предложенный клиентом, а не
окончательный; третий: конфигурация спавна), `vehicleEnterRequest` и `vehicleExitRequest`
(роль), `vehicleCouplerRequest`, `vehicleEditRequest` и `vehiclePaintRequest` (клиент
применил их оптимистично, поэтому отказ откатывает инициатора к закэшированной сервером
конфигурации или окраске), `vehicleTriggerRequest` (по умолчанию разрешено),
`vehicleNodeGrabRequest` (закрыт по умолчанию: без единого обработчика захват отклоняется,
поэтому экспериментальному захвату узлов нужен ресурс, который скажет «да», - `nodemp-relay` так и
делает).

Разобранный пример из `gatekeeper-example`: ограничить число машин, которые игрок может
заспавнить, с причиной.

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
```

`vehicleSpawnRequest` срабатывает до того, как машина существует, поэтому `player:vehicles()`
считает то, что у игрока уже есть; клиент, получивший отказ, убирает машину, которую создал
локально. Собственный лимит сервера `[General] MaxCars` и `node.server.setMaxCars` делают ту же
работу без ресурса; пример показывает форму. То, что сервер делает сам - `vehicle:seat`,
`vehicle:setCoupler`, `vehicle:trigger`, `vehicle:lock`, - эти хуки никогда не спрашивает: сервер
не накладывает вето на себя.

## Фильтр ретрансляции

`relayRequest` - ни событие, ни запрос действия: вопрос, который ретранслятор задаёт на каждый
пакет, названный как запросы, потому что `false` из обработчика что-то решает. Устанавливается через
`node.relay.filter(fn)` (то же, что `node.on("relayRequest", fn)`); `fn(fromPid, toPid, category,
subtype, globalId)` получает идентификаторы, а не объекты, потому что стоит на горячем пути, и возвращает `false`,
чтобы скрыть этот пакет от этого получателя. Вердикты кэшируются до `node.relay.invalidate()`,
поэтому вызывайте его всякий раз, когда данные, которые читает ваш хук, изменились.
`node.relay.unfilter(fn?)` снимает его.

```lua
local hidden = {} -- [gid] = { [pid] = true }

node.relay.filter(function(fromPid, toPid, cat, sub, gid)
    local peers = hidden[gid]
    if peers and peers[toPid] then return false end
end)

local function hide(vehicle, player)
    hidden[vehicle.id] = hidden[vehicle.id] or {}
    hidden[vehicle.id][player.id] = true
    node.relay.invalidate() -- the hook's data changed
end
```

Группы видимости - дешёвая альтернатива для правил «по комнатам»: `player:setGroup(n)` и
`vehicle:setGroup(n)` помещают игроков и машины в пронумерованные миры, и друг друга видят только
совпадающие номера - без хука и без кэша. Группа `0` - общий мир.

## Сетевые события от клиентов

Это не фиксированный список: ресурс определяет свои сетевые события просто тем, что использует
имя. Тот же `node.on` подписывает на них с `(player, data)`; то, что имя не является встроенным, и
делает его сетевым событием. `data` - строка, которую клиент передал в
`node.emitServer(name, data)`, по соглашению JSON.

Называйте их `<domain>:<verb>`, строчными буквами, с одним двоеточием: `chat:send`,
`hello:count`, `race:finish`. Имена, начинающиеся с `node:`, зарезервированы за фреймворком. В
обратную сторону - `player:send(event, data)` (или `node.send`), `node.broadcast(event, data)`
всем и `node.broadcast(event, data, except)` всем, кроме одного игрока, - форма ретрансляции, при
которой исключённый игрок считается отправителем для фильтра ретрансляции. Таблица, переданная
любому из них, кодируется в JSON за вас.

События, отправленные клиентом, заканчиваются на сервере: они доходят до серверных ресурсов и
больше ни до кого. Функция, которая должна дойти до других игроков, - это ресурс, который её
пересылает; именно это `nodemp-relay` делает для событий `vehicle:fire` и `vehicle:grab`
клиентского мода:

```lua
node.on("chat:send", function(player, data)
    local msg = node.json.decode(data)
    if type(msg) ~= "table" or type(msg.text) ~= "string" then return end
    node.broadcast("chat:msg", { fromPid = player.id, name = player.name, text = msg.text })
end)

node.on("vehicle:fire", function(sender, data)
    node.broadcast("vehicle:fire", data or "", sender) -- everyone but the author
end)
```

Относитесь к `data` как к недоверенному вводу: проверяйте тип и длину перед использованием, как
это делает `chat`.

## Между ресурсами: node.bus

`node.bus.emit(name, data)` публикует сообщение каждому ресурсу и нативному модулю, подписанному на
`name`, асинхронно в рабочем потоке и отправителю тоже. `node.bus.on(name, fn)` подписывает
`fn(sourceResourceName, data)`; нативный модуль виден как `"native"`. `data` приходит строкой
(таблица, которую вы отправили, кодируется в JSON), поэтому декодируйте её. `node.bus.off(name, fn?)`
отписывает.

Так работают встроенные помощники чата: `node.chat.say`, `node.chat.tell` и `player:tell`
отправляют `chat:say` на шину, а `node.commands.add` слушает `chat:command`; ресурс `chat` владеет
экранной стороной и отвечает на оба. Без установленного `chat` эти вызовы молчат.

```lua
-- in one resource
node.bus.on("race:finished", function(source, data)
    local result = node.json.decode(data)
    node.log("%s reports %s finished in %.1f s", source, result.name, result.seconds)
end)

-- in another: the client half reports its time as a wire event, the resource publishes it
node.on("race:finish", function(player, data)
    node.bus.emit("race:finished", { name = player.name, seconds = tonumber(data) or 0 })
end)
```

Предпочитайте шину чтению глобальных переменных другого ресурса: у каждого ресурса своё состояние
Lua, а неустановленный сосед просто никогда не отвечает.

## Модульный канал

Сырые байты на нумерованном канале - для нативных модулей и их клиентских половин, говорящих на
своём кодировании. `node.modules.on(channel, fn)` подписывает `fn(player, data)` на то, что клиенты
отправляют по каналу `u32` через `node.sendModule(channel, data)`;
`node.modules.send(target, channel, data)` отправляет `Player` или всем через `"all"`. Ничего не
разбирается и не логируется. Модуль `dimensions` владеет каналом `0x44494D53`.

## Отписка

`node.off(name, fn?)` снимает обработчики этого ресурса для имени - все или только `fn` - и
возвращает, сколько снято; устаревшее написание и здесь называет то же событие, что и каноническое
имя. Перезагрузка сбрасывает каждую подписку, которую сделал ресурс, так что в этот момент чистить
нечего.

## Дальше

- [Справочник событий](/ru/plugins/api/events/) - каждое имя, его вид, его точные аргументы.
- [Конкурентность](/ru/plugins/concurrency/) - поток, в котором выполняются обработчики, и как
  ждать, не блокируя его.
- [Клиентские скрипты](/ru/plugins/client-scripting/) - другой конец сетевого события.
