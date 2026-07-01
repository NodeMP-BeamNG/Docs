---
title: Lua API сервера
description: API серверных скриптов — совместимые с BeamMP глобальные объекты MP/Util/FS/Http и пространственно именованный прелюд NodeMP.* (events, players, vehicles, chat, ui, timers, util, http, fs, bans).
---

Серверному плагину NodeMP в его Lua-состоянии доступны сразу два API:

1. **Совместимый с BeamMP глобальный API** — `MP`, `Util`, `FS`, `Http` — благодаря чему плагины
   BeamMP работают без изменений.
2. **Пространственно именованный API `NodeMP.*`** — более чистый интерфейс, автоматически
   внедряемый в каждое состояние плагина и построенный поверх тех же примитивов.

Для нового кода предпочтителен `NodeMP.*`. С моделью плагинов (папки, порядок загрузки,
Lua-состояния) удобнее начать с [обзора](/ru/plugins/overview/).

## События

Зарегистрируйте обработчик через `NodeMP.events.on(name, fn)` (или через
`MP.RegisterEvent(name, "globalFuncName")` из BeamMP). Обработчики выполняются, когда сервер
инициирует событие.

### Встроенные серверные события

Ниже приведены имена событий и аргументы, которые получает каждый обработчик. `[veto]` отмечает
события, которые можно отменить, **вернув ненулевое целое число**.

| Событие | Аргументы | Примечания |
|---|---|---|
| `onInit` | `()` | Lua-состояние запущено. |
| `onShutdown` | `()` | Сервер останавливается. |
| `onPlayerAuth` | `(name, roles, isGuest, identifiersJson)` | `[veto]` отклонить подключение. |
| `postPlayerAuth` | `(rejected, reason, name, roles, isGuest, identifiersJson)` | После завершения авторизации. |
| `onPlayerConnecting` | `(playerId)` | |
| `onPlayerJoining` | `(playerId)` | |
| `onPlayerJoin` | `(playerId)` | Завершены авторизация и синхронизация. |
| `onPlayerDisconnect` | `(playerId)` | |
| `onChatMessage` | `(playerId, name, message)` | `[veto]` поглотить сообщение. |
| `postChatMessage` | `(accepted, playerId, name, message)` | |
| `onVehicleSpawn` | `(spawnerId, vehicleId, carJson)` | `[veto]` заблокировать спавн. |
| `postVehicleSpawn` | `(confirmed, spawnerId, vehicleId, carJson)` | |
| `onVehicleDeleted` | `(spawnerId, vehicleId)` | |
| `onVehicleReset` | `(spawnerId, vehicleId, packetJson)` | |
| `onVehiclePaintChanged` | `(spawnerId, vehicleId, packetJson)` | |
| `onVehicleEdited` | `(spawnerId, vehicleId, packetJson)` | `[veto]` |
| `postVehicleEdited` | `(allowed, spawnerId, vehicleId, packetJson)` | |
| `onVehicleEnter` | `(vehicleId, playerId, seat)` | |
| `onVehicleExit` | `(vehicleId, playerId)` | |
| `onVehicleSeatChange` | `(vehicleId, playerId, seat)` | |
| `onVehicleSyncOwnerChanged` | `(vehicleId, syncOwnerId)` | `-1` = нет владельца синхронизации. |
| `onVehicleLockChanged` | `(vehicleId, mode)` | Вето невозможно. `mode`: `0` открыт / `1` только пассажиры / `2` закрыт. |

:::caution
`vehicleId` — это единый **глобальный** идентификатор (в сети — десятичная строка), а
`spawnerId` — игрок, создавший автомобиль. Это **не** пара BeamMP `(playerId, vehicleId)`. См.
[Перенос плагинов BeamMP](/ru/plugins/migrating/) и [сетевой протокол](/ru/plugins/protocol/).
:::

### `NodeMP.events`

| Вызов | Назначение |
|---|---|
| `on(name, fn)` | Подписаться; возвращает токен. |
| `off(token)` | Отписаться. |
| `onClient(name, fn)` | Подписаться на пользовательское событие **клиента** (`0x66`); `fn(playerId, data)`, где `data` автоматически декодируется из JSON, если похоже на JSON. |
| `emit(name, ...)` | Инициировать событие во **всех** Lua-состояниях (асинхронно). |
| `emitLocal(name, ...)` | Инициировать событие только в **этом** состоянии (синхронно). |
| `sendTo(playerId, name, data)` | Отправить пользовательское событие клиенту (`-1` = широковещательно). Таблицы кодируются в JSON. |
| `broadcast(name, data)` | Отправить пользовательское событие всем клиентам. |

```lua
NodeMP.events.on("onChatMessage", function(playerId, name, message)
    if message == "ping" then
        NodeMP.chat.send(playerId, "pong")
        return 1 -- veto: don't broadcast "ping" to chat
    end
end)
```

## Игроки — `NodeMP.players`

| Вызов | Возвращает / делает |
|---|---|
| `names()` | `{ [id] = name }` всех подключённых. |
| `ids()` | Массив идентификаторов подключённых игроков. |
| `count()` | Число подключённых игроков. |
| `exists(id)` | Подключён ли этот идентификатор? |
| `name(id)` | Отображаемое имя. |
| `idByName(name)` | Идентификатор по имени или `-1`. |
| `role(id)` | Тег роли (например, `"ADM"`). |
| `setRole(id, role)` | Установить и разослать роль (`USER`, `ADM`, `MOD`, `SCR`, `VIP`); возвращает `ok, err`. |
| `identifiers(id)` | Таблица идентификаторов (`ip`, `nodemp`, …). |
| `isGuest(id)` / `isConnected(id)` | Булевы значения. |
| `isSynced(id)` / `isSyncing(id)` | Состояние синхронизации (или `nil`, если не поддерживается). |
| `get(id)` | Составная запись `{ id, name, role, guest, connected, synced, identifiers }`. |
| `all()` | Массив составных записей. |
| `vehicles(id)` | Автомобили игрока, ключ — глобальный `vehicleId`: `{ [vehicleId] = spawnJson }` — каждое значение это **JSON-строка** пакета спавна (декодируйте через `NodeMP.util.json.decode`); `nil`, если у игрока их нет. |
| `kick(id, reason)` | Кикнуть; возвращает `ok, err`. |
| `kickAll(reason)` | Кикнуть всех. |
| `message(id, msg)` | Личное сообщение в чат. |
| `notify(id, msg, opts)` | Всплывающее уведомление; `opts = { icon, category }`. |
| `position(id)` | Позиция текущего автомобиля игрока `{ x, y, z, raw }` или `nil, err`. |
| `teleport(id, pos, rot?)` | Телепортировать текущий автомобиль игрока; `pos = {x,y,z}`, `rot` — необязательный кватернион. |

```lua
for _, p in ipairs(NodeMP.players.all()) do
    NodeMP.util.log.info(string.format("[%d] %s (%s)", p.id, p.name, p.role or "USER"))
end
```

## Автомобили — `NodeMP.vehicles`

Идентификаторы автомобилей **глобальны** (в пределах сервера, уникальны, постоянны —
автомобиль сохраняется после ухода его спавнера). У автомобиля есть **спавнер** (создатель) и
**владелец синхронизации** (клиент, синхронизирующий его в данный момент); сервер переназначает
владельца синхронизации автоматически.

| Вызов | Возвращает / делает |
|---|---|
| `ofPlayer(playerId)` | Автомобили, которые заспавнил игрок, ключ — глобальный `vehicleId`: `{ [vehicleId] = spawnJson }` — каждое значение это **JSON-строка** пакета спавна (декодируйте через `NodeMP.util.json.decode`); `nil`, если у игрока их нет. |
| `countOf(playerId)` | Сколько автомобилей заспавнил игрок. |
| `count()` | Всего автомобилей на сервере (включая осиротевшие). |
| `remove(vehicleId)` | Удалить автомобиль (рассылает, инициирует `onVehicleDeleted`). |
| `position(vehicleId)` | `{ x, y, z, rot?, raw }` или `nil, err`. |
| `getDriver(vehicleId)` / `setDriver(vehicleId, id)` | Текущий водитель; назначение передаёт полномочия синхронизации (`-1` сбрасывает). |
| `getSyncOwner(vehicleId)` | Клиент, синхронизирующий его сейчас, или `-1`. |
| `getSpawner(vehicleId)` | Кто его создал, или `-1`. |
| `isLocked(vehicleId)` / `setLocked(vehicleId, b)` | Состояние блокировки. |
| `activeOf(playerId)` | Автомобиль, которым игрок управляет/владеет: `{ vehicleId, spawner, syncOwner, driver }`, или `nil`. |
| `spawn(playerId, opts)` | Попросить клиент заспавнить автомобиль, которым он будет владеть. `opts = { jbeam, config?, pos?, rot?, enter? }`. |
| `teleport(vehicleId, pos, rot?)` | Переместить автомобиль по идентификатору (через его владельца синхронизации). |

```lua
-- Remove every vehicle a player spawned
local function clear(playerId)
    for vid in pairs(NodeMP.vehicles.ofPlayer(playerId) or {}) do
        NodeMP.vehicles.remove(vid)
    end
end
```

## Чат и интерфейс — `NodeMP.chat`, `NodeMP.ui`

| Вызов | Назначение |
|---|---|
| `NodeMP.chat.send(playerId, message)` | Сообщение одному игроку (от имени «Server»). |
| `NodeMP.chat.broadcast(message)` | Сообщение всем. |
| `NodeMP.ui.notify(playerId, message, opts)` | Всплывающее уведомление (`-1` — широковещательно); `opts = { icon, category }`. |
| `NodeMP.ui.dialog(playerId, opts)` | Диалог подтверждения/markdown; `opts = { title, body, buttons, interactionId, warning, reportToServer, reportToExtensions }`. |

## Информация о сервере и настройки — `NodeMP.server`

| Вызов | Назначение |
|---|---|
| `version()` | `{ major, minor, patch, string }`. |
| `os()` | `"Windows"`, `"Linux"` или `"Other"`. |
| `memory()` | Всего использовано памяти Lua. |
| `shutdown()` | Корректно остановить сервер. |
| `get(key)` / `set(key, value)` | Прочитать/записать настройку по понятному имени (`"Name"`, `"MaxPlayers"`, `"Map"`, …). |
| `name()` / `setName(v)`, `map()` / `setMap(v)`, `description()` / `setDescription(v)` | Удобные аксессоры. |
| `maxPlayers()` / `setMaxPlayers(v)`, `maxCars()` / `setMaxCars(v)` | |
| `isPrivate()` / `setPrivate(v)`, `isDebug()` / `setDebug(v)` | |

## Таймеры — `NodeMP.timers`

| Вызов | Назначение |
|---|---|
| `every(name, intervalMs, fn, strategy?)` | Выполнять `fn` каждые `intervalMs`; `name` идентифицирует его для отмены. |
| `cancel(name)` | Отменить повторяющийся таймер. |
| `after(ms, fn)` | Выполнить `fn` один раз через `ms` (без блокировки). |

```lua
NodeMP.timers.every("announce", 60000, function()
    NodeMP.chat.broadcast("Have fun and drive safe!")
end)
```

## Утилиты — `NodeMP.util`

- **JSON** — `NodeMP.util.json.{encode, decode, diff, diffApply, prettify, minify, flatten, unflatten}`.
- **Логирование** — `NodeMP.util.log.{debug, info, warn, error}`.
- **Случайность** — `NodeMP.util.random`, `randomInt`, `randomFloat`.
- **Криптография / кодирование** — `NodeMP.util.sha256`, `NodeMP.util.base64.{encode, decode}`.
- **Тайминг** — `NodeMP.util.after(ms, fn)`, `NodeMP.util.sleep(ms)` (блокирует — используйте с осторожностью).

## HTTP-клиент — `NodeMP.http`

```lua
local conn = NodeMP.http.connect("api.example.com", 443)
local res = conn:get("/status", { ["Accept"] = "application/json" })
-- res = { status_code, body }
local post = conn:post("/log", '{"event":"join"}', { ["Content-Type"] = "application/json" })
```

`connect(host, port)` возвращает соединение с методами `:get(path, headers)` и
`:post(path, body, headers)`, каждый из которых возвращает `{ status_code, body }`.

## Файловая система — `NodeMP.fs`

Пути **изолированы в собственной папке плагина**, поэтому плагин может хранить собственные файлы
данных.

| Вызов | Назначение |
|---|---|
| `exists`, `isFile`, `isDir` | Проверки существования/типа. |
| `mkdir`, `remove`, `rename`, `copy` | Изменения. |
| `list`, `listDirs` | Перечисление каталога. |
| `filename`, `extension`, `parent`, `join` | Помощники для путей. |
| `read(path)` / `write(path, contents)` | Файловый ввод-вывод (требует поддержки сервера; проверяйте на `nil`). |

```lua
if NodeMP.fs.write then
    NodeMP.fs.write("state.json", NodeMP.util.json.encode({ saved = os.time() }))
end
```

## Баны — `NodeMP.bans`

Баны применяются автоматически: как только существует хотя бы один бан, барьер `onPlayerAuth`
отклоняет забаненных игроков. Баны сохраняются в папку плагина, если доступен файловый
ввод-вывод, иначе — в память на время сессии.

| Вызов | Назначение |
|---|---|
| `ban(playerId, reason)` | Забанить по всем идентификаторам и имени, затем кикнуть. |
| `banIdentifier(idValue, reason)` | Забанить по сырому идентификатору (IP, ключ аккаунта). |
| `unban(value)` | Снять бан по идентификатору или имени. |
| `isBanned(identifiers)` / `isBannedName(name)` | Проверки. |
| `list()` | Записи банов `{ name?, id?, ids?, reason, time }`. |
| `enforce()` | Проактивно включить барьер авторизации (обычно автоматически). |

## Глобальный API BeamMP (`MP.*`)

Всё, на чём построен `NodeMP.*`, остаётся доступным для плагинов BeamMP и прямого использования.
К часто используемым вызовам относятся `MP.GetPlayers()`, `MP.GetPlayerName(id)`,
`MP.GetPlayerIdentifiers(id)`, `MP.GetPlayerRole(id)`, `MP.GetPlayerVehicles(id)`,
`MP.RemoveVehicle(vehicleId)`, `MP.GetPositionRaw(vehicleId)`, `MP.SendChatMessage(id, msg)`,
`MP.DropPlayer(id, reason)`, `MP.RegisterEvent(name, fn)`, `MP.CreateEventTimer(name, ms)`, а
также `Util.*` (JSON, логирование) и `FS.*` / `Http.*`. В NodeMP вызовы, связанные с
автомобилями, принимают глобальный идентификатор автомобиля (и двухаргументную форму BeamMP для
совместимости). Точное соответствие см. в
[Совместимости с BeamMP](/ru/introduction/beammp-compatibility/).

:::note
`NodeMP.commands`, `NodeMP.modules`, `NodeMP.dimensions` и `NodeMP.persistence` **не** входят в
базовый прелюд — их предоставляют примеры плагинов фреймворка (`00_framework.lua`,
`10_admin.lua`, …). Скопируйте их (или напишите свои), чтобы использовать. Задокументированные
выше пространства имён — это всегда доступный базовый API.
:::

## Дальнейшие шаги

- [Сетевой протокол](/ru/plugins/protocol/) — пакеты под API.
- [Перенос плагинов BeamMP](/ru/plugins/migrating/) — адаптация существующего плагина.
- [API клиентского мода](/ru/plugins/client-api/) — скрипты внутри мода BeamNG.
