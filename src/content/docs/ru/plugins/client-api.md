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

### Сессия / соединение
| Вызов | Возвращает |
|------|---------|
| `NodeMP.isLauncherConnected()` | bool — управляющее соединение с лаунчером активно |
| `NodeMP.isInSession()` | bool — сейчас в мультиплеерной сессии |
| `NodeMP.getCurrentServer()` | `{ ip, port, name, map, ... }` или nil |
| `NodeMP.getLauncherVersion()` | строка |
| `NodeMP.connectToServer(ip, port, name)` | — |
| `NodeMP.leaveServer(goBack)` | — |
| `NodeMP.VERSION` | строка версии мода |

### Аккаунт / авторизация
| Вызов | Возвращает |
|------|---------|
| `NodeMP.isLoggedIn()` | bool |
| `NodeMP.getAccount()` | `{ success, username, role, id, ... }` |
| `NodeMP.getLocalPlayerID()` | ваш серверный идентификатор игрока (число) или nil |

### Игроки — `NodeMP.players`
`get(id)`, `getByName(name)`, `getAll()`, `count()`, `getRoleInfo(role)`.

### Автомобили — `NodeMP.vehicles`
`gameId` = локальный идентификатор объекта BeamNG; `vehicleId` = единый **глобальный** сетевой
идентификатор (строка с целым числом, например `"42"`, уникальна в пределах сервера, не кодирует
владельца).

`getAll()`, `getOwn()` (автомобили, которые этот клиент **синхронизирует**), `isOwn(gameId)`
(мы — владелец синхронизации), `getServerId(gameId)`, `getGameId(vehicleId)`,
`getByServerId(vehicleId)`, `getByGameId(gameId)`, `getOwner(vehicleId)`, `getDriver(vehicleId)`,
`getSyncOwner(vehicleId)`, `count()`, `forEach(fn)`, `isSynced()`.

У автомобиля есть `spawnerID` (создатель) и `syncOwnerID` (клиент, синхронизирующий его в данный
момент). Автомобили **постоянны**: они сохраняются после ухода спавнера — сервер переназначает
`syncOwner` и инициирует `onNodeMPVehicleSyncOwnerChanged`.

### Чат — `NodeMP.chat`
`send(message)`, `add(message)` (только локальная строка).

### События — `NodeMP.events`
Пользовательские события передаются пакетом `0x66`; серверный Lua видит те же имена.
```lua
NodeMP.events.on("myEvent", function(data) dump(data) end)   -- subscribe
NodeMP.events.triggerServer("myEvent", { foo = 42 })          -- send to server
NodeMP.events.triggerLocal("myEvent", { foo = 42 })           -- fire locally
NodeMP.events.off("myEvent")                                   -- unsubscribe
```

### Клавиши — `NodeMP.keys`
`onPressed(key, fn)`, `onReleased(key, fn)`, `getState(key)`.

### Сырая сеть (продвинутое) — `NodeMP.network`
`send(typeByte, payloadTable)`, `isConnected()`. Идентификаторы типов см. в
[сетевом протоколе](/ru/plugins/protocol/).

### Утилита
`NodeMP.translate(key, default)`.

---

## VE API (внутри Lua автомобиля)

```lua
NodeMP.vehicleType()         -- "L" local / "R" remote, or nil
NodeMP.isRemote()            -- bool
NodeMP.isLocal()             -- bool
NodeMP.keys.onPressed(k, fn) -- key bridge (same as GE)
NodeMP.keys.getState(k)
NodeMP.triggerServer(name, data) -- relay a server event from vehicle code
```

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
  (например, `NODEMP.GE.syncVehicles == "nodemp_sync_vehicles"`).
- `NODEMP.callVehicle(veh, key, "fn(args)")` — вызвать модуль VE из GE.
- `NODEMP.callGameEngine(obj, key, "fn(args)")` — вызвать модуль GE из VE.
- `NODEMP.geDependencies` / `NODEMP.veDependencies` — списки загрузки.

При добавлении или переименовании модуля правьте `lua/ge/extensions/nodemp/modules.lua` и
`lua/vehicle/extensions/nodemp/modules.lua` (они идентичны) — это единственное место обновляет
списки зависимостей и все кросс-VM вызовы.

## См. также

- [Lua API сервера](/ru/plugins/server-api/) — соответствующий серверный API `NodeMP.*`.
- [Сетевой протокол](/ru/plugins/protocol/) — идентификаторы типов пакетов для `NodeMP.network`.
- [Обзор плагинов](/ru/plugins/overview/) — как устроены серверные плагины.
