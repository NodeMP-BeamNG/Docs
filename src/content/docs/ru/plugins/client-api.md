---
title: API клиентского мода
description: Клиентский Lua API NodeMP.* для модов и скриптов BeamNG — сессия, игроки, автомобили, чат, события, клавиши и подмножество для отдельного автомобиля (VE).
---

Это краткий справочник по **клиентскому** API — таблице `NodeMP.*`, доступной модам и скриптам
BeamNG, работающим внутри игры. О серверных скриптах см. [Lua API сервера](/ru/plugins/server-api/);
о пакетах под ним — [сетевой протокол](/ru/plugins/protocol/).

NodeMP предоставляет единую стабильную глобальную таблицу **`NodeMP`** для сторонних модов и
скриптов. Используйте её вместо внутренних глобальных объектов расширений (`nodemp_sync_vehicles`,
`nodemp_network_core`, …) — это детали реализации, и они могут быть переименованы.

Каждая функция `NodeMP.*` разрешает свою цель лениво, поэтому вызов до полного запуска NodeMP
(или после перезагрузки Lua) возвращает `nil`/`false`, а не вызывает ошибку.

Таблица существует в **обоих** Lua-состояниях:
- **Движок игры (GE)** — полный API (сессия, игроки, автомобили, чат, события, клавиши, сеть).
- **Движок автомобиля (VE)** — подмножество для отдельного автомобиля (клавиши, роль данного автомобиля, ретрансляция серверных событий).

```lua
if NodeMP and NodeMP.isInSession() then
    NodeMP.chat.send("hello from my mod")
end
```

---

## GE API (движок игры)

### Сессия — `NodeMP.session`
| Вызов | Возвращает |
|------|---------|
| `isLauncherConnected()` | bool — управляющее соединение с лаунчером активно |
| `isConnected()` | bool — игровой сокет активен |
| `isActive()` | bool — в мультиплеерной сессии |
| `isJoining()` | bool — идёт подключение (грузятся моды/карта) |
| `getServer()` | `{ ip, port, name, map, ... }` или nil |
| `getServerName()` / `getMap()` | строка или nil |
| `getLauncherVersion()` | строка (пусто до рукопожатия) |
| `connect(ip, port, name, skipModWarning?)` | подключиться к серверу |
| `leave(goBack)` | выйти; `goBack` возвращает в меню |

`NodeMP.VERSION` — строка версии мода. Псевдонимы для обратной совместимости:
`NodeMP.isLauncherConnected()`, `NodeMP.isInSession()`, `NodeMP.getCurrentServer()`,
`NodeMP.getLauncherVersion()`, `NodeMP.connectToServer()`, `NodeMP.leaveServer()`.

### Аккаунт — `NodeMP.account`
| Вызов | Возвращает |
|------|---------|
| `get()` | `{ success, username, role, avatar, ... }` |
| `isLoggedIn()` | bool |
| `getUsername()` / `getRole()` | строка или nil |
| `login(identifiers)` / `logout()` | начать/сбросить вход |

Псевдонимы: `NodeMP.getAccount()`, `NodeMP.isLoggedIn()`.

### Игроки — `NodeMP.players`
Таблица игрока: `{ id, name, role, guest, ping }`.

| Вызов | Возвращает |
|------|---------|
| `get(id)` / `getByName(name)` | таблица игрока или nil |
| `getAll()` | `{ [id] = player }` |
| `ids()` | массив id игроков |
| `count()` / `max()` | текущие игроки / слоты сервера |
| `getLocalId()` / `getLocal()` | ваш id / таблица игрока |
| `isLocal(id)` | это локальный игрок? |
| `getRoleInfo(role)` | `{ tag, backcolor, forecolor }` для оформления |

### Автомобили — `NodeMP.vehicles`
`gameId` = локальный идентификатор объекта BeamNG; `vehicleId` = единый **глобальный** сетевой
идентификатор (строка с целым числом, например `"42"`, уникальна в пределах сервера, не кодирует
владельца).

`getAll()`, `getOwn()` (автомобили, которые этот клиент **синхронизирует**), `isOwn(gameId)`
(мы — владелец синхронизации), `getServerId(gameId)`, `getGameId(vehicleId)`,
`getByServerId(vehicleId)`, `getByGameId(gameId)`, `getNicknameMap()`, `getOwner(vehicleId)`,
`getDriver(vehicleId)`, `getSyncOwner(vehicleId)`, `count()`, `forEach(fn)`, `isSynced()`.

У автомобиля есть `spawnerID` (создатель) и `syncOwnerID` (клиент, синхронизирующий его в данный
момент). Автомобили **постоянны**: они сохраняются после ухода спавнера — сервер переназначает
`syncOwner` и инициирует `onNodeMPVehicleSyncOwnerChanged`.

### Чат — `NodeMP.chat`
| Вызов | Действие |
|------|------|
| `send(message)` | отправить сообщение в чат на сервер |
| `add(message, username?, color?)` | добавить только локальную строку |
| `system(message)` | локальная строка от имени «Server» |
| `clear()` | очистить локальную историю чата |
| `toggle()` | показать/скрыть оверлей чата |
| `getHistory()` | массив отрисованных сообщений |

### События — `NodeMP.events`
Пользовательские события передаются пакетом `0x66`; серверный Lua видит те же имена. NodeMP также
инициирует **локальные события жизненного цикла**, на которые можно подписаться (см. `NodeMP.events.NAMES`).

| Вызов | Действие |
|------|------|
| `on(name, fn, id?)` | подписаться (необязательный `id` именует обработчик) |
| `once(name, fn, id?)` | подписаться один раз; снимается после первого вызова |
| `off(name, id)` | отписаться |
| `triggerServer(name, data)` | отправить именованное событие на сервер |
| `triggerLocal(name, data)` | вызвать именованное событие локально |

Встроенные `NodeMP.events.NAMES` (локальные события жизненного цикла):

| Ключ | Имя события | Аргументы |
|-----|-----------|--------------|
| `PLAYER_JOINED` | `onNodeMPPlayerJoined` | `(player)` |
| `PLAYER_LEFT` | `onNodeMPPlayerLeft` | `({ id, name })` |
| `PLAYER_ROLE_CHANGED` | `onNodeMPPlayerRoleChanged` | `({ id, role })` |
| `VEHICLE_SPAWNED` | `onNodeMPVehicleSpawned` | `(vehicle)` |
| `VEHICLE_DELETED` | `onNodeMPVehicleDeleted` | `({ vehicleId })` |
| `VEHICLE_SYNC_OWNER` | `onNodeMPVehicleSyncOwnerChanged` | `({ vehicleId, syncOwnerId })` |
| `SYNCED` | `onNodeMPSynced` | `()` — мир загрузился |
| `CHAT_SENT` | `ChatMessageSent` | `(message)` |
| `CHAT_RECEIVED` | `ChatMessageReceived` | `(message, username)` |

```lua
NodeMP.events.on(NodeMP.events.NAMES.SYNCED, function()
    NodeMP.chat.system("Мир синхронизирован — мой мод готов")
end)
NodeMP.events.triggerServer("myEvent", { foo = 42 })  -- на сервер
```

### Клавиши — `NodeMP.keys`
`onPressed(key, fn)`, `onReleased(key, fn)`, `getState(key)`.

### Интерфейс — `NodeMP.ui`
`notify(text, opts)` (`opts = { icon, category }`), `dialog(opts)` (markdown/диалог
подтверждения), `bringToFront()`, `refreshPlayerList()`.

### Настройки — `NodeMP.settings`
`get(key, default)` / `set(key, value)` — читать/писать опцию мода на базе BeamNG (те же
ключи, что использует сам NodeMP, например `nameTagShowDistance`).

### Конфиг — `NodeMP.config`
Локальный профиль NodeMP: `getNickname()` / `setNickname(name)`, `getFavorites()`,
`get()` (таблица config.json), `set(key, value)`.

### Отладка — `NodeMP.debug`
`getNetworkStats()` → `{ inBps, outBps, inPps, outPps, timer }`;
`focusOnPlayer(name)` (перейти к последнему автомобилю игрока).

### Измерения — `NodeMP.dimensions`
Параллельные миры на одной карте (авторитет у сервера; управляется framework-модулем
«dimensions»). `isActive()`, `get()` (номер вашего измерения, `0` = основной), `refresh()`,
`set(n)` (переключиться — машина, в которой вы сидите, переедет с вами), `onChanged(fn, id)`.

### Сырая сеть (продвинутое) — `NodeMP.network`
`send(typeByte, payloadTable)`, `isConnected()`. Используйте id типов в диапазоне `0x80`–`0xFF`;
см. [сетевой протокол](/ru/plugins/protocol/).

### Утилиты — `NodeMP.util`
`translate(key, default)` (псевдоним `NodeMP.translate`), `b64encode/b64decode`,
`hex2rgb(hex)`, `jsonEncode/jsonDecode`.

---

## VE API (внутри Lua автомобиля)

Состояние отдельного автомобиля предоставляет подмножество. Приём событий — только в GE: из
автомобиля вы **отправляете** через `NodeMP.events.triggerServer`, а обрабатываете в GE.
Большинство пишущих помощников имеют смысл только на **локальном** («L») автомобиле (который
синхронизирует этот клиент).

### `NodeMP.vehicle`
`type()` → `"L"`/`"R"`/nil, `isLocal()`, `isRemote()`, `id()` (локальный id объекта).

### `NodeMP.keys`
`onPressed(key, fn)`, `onReleased(key, fn)`, `getState(key)` — тот же мост, что и в GE.

### `NodeMP.events`
`triggerServer(name, data)` — отправить серверное событие из кода автомобиля (VE → GE → сервер).

### `NodeMP.electrics`
`get(name)`, `set(name, value)` (только локальный автомобиль), `exclude(name)` (исключить ключ
из сетевой синхронизации, например для локальных анимаций).

### `NodeMP.controllers` (продвинутое)
`register(types)` — зарегистрировать типы модифицированных контроллеров для синхронизации
(вызывайте из хука `loadControllerSyncFunctions`; `types` повторяет форму стокового
`controllers/general.lua`). `send(data)` — вручную переслать состояние контроллера на удалённые.

### `NodeMP.velocity` (продвинутое)
`add(x, y, z)` / `set(x, y, z)` — коррекции линейной скорости (в основном для удалённых).

### `NodeMP.callGE(moduleKey, call)`
Поставить в очередь вызов GE-модуля NodeMP из кода автомобиля (продвинутый cross-VM), например
`NodeMP.callGE("syncControllers", "sendControllerData(" .. serialize(x) .. ")")`.

---

## Устаревшие глобальные объекты в стиле BeamMP

Они остаются доступными для совместимости с существующими серверными скриптами:
`TriggerServerEvent`, `TriggerClientEvent`, `AddEventHandler`, `RemoveEventHandler`,
`onKeyPressed`, `onKeyReleased`, `getKeyState`, `MPTranslate`. Для нового кода предпочтительнее
эквиваленты `NodeMP.*`.

---

## Внутреннее: `NodeMP.modules` и реестр `NODEMP`

Служебная механика, не нужная большинству модов — и здесь два Lua-состояния различаются:

- **В GE** `NodeMP.modules` — это **SDK фреймворка модулей**: `register(descriptor)`,
  `list()`, `isEnabled(id)`, `getConfig(id, key, default)`, `setLocalPref(id, key, value)`,
  `onChanged(fn, id)`, `onPacket(typeByte, moduleId, fn)` и `requestManifest()`. Сервер
  авторитетно определяет, какие модули включены, и их конфигурацию.
- **В VE** `NodeMP.modules` — это сырой кросс-VM **реестр** (он указывает на глобальный объект `NODEMP`).

Сырой реестр — единственный источник истины для имён модулей/файлов и кросс-VM вызовов — всегда
доступен как глобальный объект `NODEMP` (в **обоих** состояниях). В GE это *только* `NODEMP`, а
не `NodeMP.modules`:

- `NODEMP.GE.<key>` / `NODEMP.VE.<key>` → строка с именем расширения
  (например, `NODEMP.GE.syncVehicles == "MPVehicleGE"`).
- `NODEMP.callVehicle(veh, key, "fn(args)")` — вызвать модуль VE из GE.
- `NODEMP.callGameEngine(obj, key, "fn(args)")` — вызвать модуль GE из VE.
- `NODEMP.geDependencies` / `NODEMP.veDependencies` — списки загрузки.

Имена — это имена BeamMP: плоские, без префиксов, чтобы всё, написанное под клиентский API
BeamMP, находило те же модули. **Файлы** при этом сгруппированы по роли
(`lua/ge/extensions/nodemp/sync/MPVehicleGE.lua`), и на имена это не влияет: мод загружает их
в *пустом корне* BeamNG, где загрузчик расширений отбрасывает каталоги и берёт голое имя
файла. Структура папок для вызывающей стороны невидима — не собирайте имя модуля из пути.

При добавлении или переименовании модуля правьте `lua/ge/extensions/MPModules.lua` и
`lua/vehicle/extensions/MPModules.lua` (они идентичны) — это единственное место обновляет
списки зависимостей и все кросс-VM вызовы.

## См. также

- [Lua API сервера](/ru/plugins/server-api/) — соответствующий серверный API `NodeMP.*`.
- [Сетевой протокол](/ru/plugins/protocol/) — идентификаторы типов пакетов для `NodeMP.network`.
- [Обзор плагинов](/ru/plugins/overview/) — как устроены серверные плагины.
