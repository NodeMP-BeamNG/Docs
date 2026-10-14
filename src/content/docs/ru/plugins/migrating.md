---
title: Перенос плагинов BeamMP
description: Запустить серверный плагин BeamMP через модуль совместимости или перенести его на API node — папка, соответствие MP.* и node.*, и перенесённый плагин чата.
---

Серверный плагин BeamMP может прийти на NodeMP двумя путями:

- **Запустить как есть** через модуль совместимости `beammp-compat`. Он даёт плагину его таблицы
  `MP`, `Util` и `FS`, так что папка плагина загружается без изменений. Подходит, чтобы попробовать
  плагин или если трогать его не хочется.
- **Перенести** на API `node`. Работы больше, зато получается обычный ресурс: он получает объекты
  вместо номеров, отказывает с причиной, которую видит игрок, ждёт, не блокируя сервер, и может
  пользоваться всем, что описано на этих страницах.

## Запуск плагина через модуль совместимости

`beammp-compat` — нативный модуль, который запускает ресурсы с `type = "beammp"`. В архиве релиза
его нет: он собирается из исходников, а файл кладётся в `modules/` рядом с исполняемым файлом
сервера. Модули сервер загружает раньше ресурсов, так что плагин застаёт его на месте.

Положите файлы плагина в папку ресурса и добавьте манифест в две строки:

```
resources/
└── my-plugin/
    ├── resource.toml      # name = "my-plugin", type = "beammp", [server] main = "main.lua"
    ├── main.lua           # the plugin's files, as they were in Resources/Server/my-plugin/
    ├── commands.lua
    └── client/            # optional: the client mod's files, unpacked from its zip
        └── lua/ge/extensions/...
```

```toml
name = "my-plugin"
type = "beammp"

[server]
main = "main.lua"
```

Сначала выполняется файл из `[server] main`, потом все остальные `.lua` в папке по алфавиту, потом
`onInit`. Все файлы одного плагина делят одно состояние Lua, как плагин и ожидает. **Указывайте
`main`**, если у плагина нет папки `client/`: без того и другого сервер не считает папку ресурсом и
пропускает её.

Чего от него ждать:

- **События** приходят с теми аргументами, которые плагин знает: `onPlayerAuth`,
  `onPlayerConnecting`, `onPlayerJoining`, `onPlayerJoin`, `onPlayerDisconnect`, `onChatMessage`,
  `onVehicleSpawn`, `onVehicleEdited`, `onVehicleDeleted`, `onVehicleReset`,
  `onVehiclePaintChanged`, `onShutdown`.
- **Отменённая строка чата тихо исчезает.** Когда `onChatMessage` отменяет строку, её никто не
  видит, а отправителю не говорят, что ему отказали, — так `/команда` плагина не попадает в чат.
- **Номера машин — глобальные номера сервера**, единые на весь сервер, а не свой счёт у каждого
  игрока. `onVehicleSpawn` получает `0` для новой машины, потому что номер выдаётся после решения;
  настоящий приходит в `postVehicleSpawn`.
- **`MP.SendChatMessage`** показывается строкой от **System**.
- **`MP.Sleep` блокирует все ресурсы**, а не только этот плагин, потому что у всех ресурсов один
  рабочий поток. По возможности замените его.
- **Нет:** `Http.CreateConnection` (берите [`node.http`](/ru/plugins/http/) из Lua-ресурса),
  `onConsoleInput` и `onFileChanged` (никогда не срабатывают), `Util.JsonDiff` и
  `Util.JsonDiffApply`, `MP.ConfirmationDialog` и остановка сервера через `exit()`.

О большинстве из них модуль пишет предупреждение, когда плагин впервые к ним обращается, так что
лог сервера подскажет, что исправить. Клиентский скрипт, написанный для BeamMP, тоже находит свои
привычные глобальные имена ([ниже](#клиентские-скрипты)).

## Перенос вручную

Переносится форма плагина: события, на которые он отвечает, и вызовы, которые делает. Таблицы ниже
сопоставляют каждому его вид в NodeMP; все имена справа есть в
[справочнике Lua API](/ru/plugins/api/lua/) и [справочнике событий](/ru/plugins/api/events/).

### Папка и манифест

| BeamMP | NodeMP |
|---|---|
| `Resources/Server/<плагин>/`, все `.lua` загружаются в одно состояние Lua | `resources/<имя>/` с одной точкой входа, `server/main.lua`, и необязательным `resource.toml` ([Ресурсы](/ru/plugins/resources/)) |
| вспомогательные файлы, загружаемые в порядке папки | `require` из `server/`, предварительно добавив папку в `package.path` ([Ресурсы → Несколько серверных файлов](/ru/plugins/resources/#несколько-серверных-файлов)) |
| `Resources/Client/<мод>.zip` | `content/<мод>.zip`, его скачивает лаунчер до входа; Lua для игры можно положить и в `resources/<имя>/client/`, оно отправляется при входе ([Клиентские скрипты](/ru/plugins/client-scripting/)) |
| `ServerConfig.toml` | `server.toml` ([Настройка](/ru/hosting/configuration/)); собственные настройки плагина — в таблице `[config]` его `resource.toml`, они приходят как `node.config` |

### События

`MP.RegisterEvent(name, "handlerName")` превращается в `node.on(name, fn)`: обработчик — сама
функция. У имён NodeMP нет приставки `on`; то, что случилось, читается как `playerJoined`, то, в чём
обработчик может отказать, — как `vehicleSpawnRequest`.

| BeamMP | NodeMP |
|---|---|
| `onInit` | код верхнего уровня `server/main.lua`, который выполняется при загрузке и при каждой перезагрузке |
| `onShutdown` | `serverShutdown` |
| `onPlayerAuth` (отказ — `1` или строка) | `playerConnectRequest(player, name)`, отказ — `return false, "reason"`; читайте `player.guest`, `player.accountId`, `player.accountRoles`, `player.identifiers` |
| `onPlayerConnecting` | `playerAuthenticated(player)` |
| `onPlayerJoining` | `playerJoining(player)` |
| `onPlayerJoin` | `playerJoined(player)` |
| `onPlayerDisconnect` | `playerLeft(player, reason)`; `player.name` ещё читается |
| `onChatMessage` (отмена — `1`) | `chatMessageRequest(player, msg)`: `return false, "reason"` отказывает, `{ handled = true }` забирает строку как команду ([Чат](/ru/plugins/chat/)) |
| `onVehicleSpawn` (отказ — `1`) | `vehicleSpawnRequest(player, requestedId, config)` — решить, `vehicleSpawned(vehicle)` — после |
| `onVehicleEdited` | `vehicleEditRequest(player, vehicle, config)` — решить, `vehicleEdited` — после |
| `onVehicleDeleted` | `vehicleDeleted(vehicle, cause)`; смысл сохраняет только `vehicle.id` |
| `onVehicleReset` | `vehicleReset(player, vehicle, posRot)`, только наблюдать |
| `onVehiclePaintChanged` | `vehiclePaintRequest(player, vehicle, paints)` — решить, `vehiclePainted` — после |
| `onFileChanged` | `node.fs.watch(path, fn)` для файла в папке ресурса ([Хранилище и файлы](/ru/plugins/storage/#слежение-за-файлом)) |
| `onConsoleInput` | нет: у консоли свои постоянные команды ([Администрирование](/ru/hosting/administration/#консоль)); дайте админам команды чата |

Обработчик запроса, который ничего не вернул, разрешает. События, которых в BeamMP не было, —
пересадки, запросы дверей и триггеров, потоки позиций, фильтр ретрансляции — на странице
[События](/ru/plugins/events/).

### Игроки

| BeamMP | NodeMP |
|---|---|
| `MP.GetPlayerName(pid)` | `player.name` |
| `MP.GetPlayerIDByName(name)` | `node.players.find(name)` возвращает `Player` |
| `MP.GetPlayers()` | `node.players.all()` (массив `Player`), `node.players.ids()` |
| `MP.GetPlayerCount()` | `node.players.count()` |
| `MP.IsPlayerConnected(pid)` | `player:isConnected()` |
| `MP.IsPlayerGuest(pid)` | `player.guest` |
| `MP.GetPlayerIdentifiers(pid)` | `player.identifiers` (`"nodemp:<id>"`, `"discord:<id>"`, `"ip:<addr>"`), `player.accountId`, `player.ip` |
| роль из `onPlayerAuth` | `player.accountRoles` (роли на сайте NodeMP); `player.role` — собственная роль этого сервера, её выдаёт `player:setRole` |
| `MP.DropPlayer(pid, reason)` | `player:kick(reason)` |
| баны, которые ведёт сам плагин | `player:ban(reason, untilUnix)`, `node.bans.add`, `node.bans.remove`; их хранит сервер в `bans.json` ([Игроки и машины](/ru/plugins/players-and-vehicles/#кики-и-баны)) |

### Машины

| BeamMP | NodeMP |
|---|---|
| пара `(pid, vid)` | у машины один номер, `vehicle.id`, единый на весь сервер; `vehicle.spawner`, `vehicle.driver` и `vehicle.authority` — игроки вокруг неё |
| `MP.GetPlayerVehicles(pid)` | `player:vehicles()`; `vehicle:config()` — конфигурация таблицей |
| `MP.GetPositionRaw(pid, vid)` | `vehicle:transform()` (`pos`, `rot`, `vel`, `angVel`) или `player:position()` |
| `MP.RemoveVehicle(pid, vid)` | `vehicle:delete()` |
| нет | `vehicle:teleport`, `vehicle:reset`, `vehicle:lock`, `vehicle:setTag`, `player:seat`, `player:spawnVehicle`, `player:freeze`: что сервер может сделать с машинами и игроками |

### Чат и события для клиентов

| BeamMP | NodeMP |
|---|---|
| `MP.SendChatMessage(pid, text)`, `-1` — всем | `player:tell(text, ...)`; всем — `node.chat.say(text, ...)` |
| `MP.TriggerClientEvent(pid, name, data)`, `-1` — всем | `player:send(name, data)`; всем — `node.broadcast(name, data)` |
| `MP.TriggerClientEventJson(pid, name, table)` | `player:send(name, table)`: таблица уходит как JSON |
| `MP.TriggerGlobalEvent(name, ...)` | `node.bus.emit(name, data)` и `node.bus.on(name, fn)`; ответ — второе сообщение ([Между ресурсами](/ru/plugins/bus/)) |
| `MP.TriggerLocalEvent(name, ...)` | вызовите функцию |

### Таймеры, HTTP, файлы и остальное

| BeamMP | NodeMP |
|---|---|
| `MP.CreateEventTimer(name, ms)` | `node.every(ms, fn)`, возвращает номер для `node.cancel(id)`; `node.after(ms, fn)` срабатывает один раз |
| `MP.Sleep(ms)` | `node.sleep(ms)` внутри `node.async(fn)`: ждёт только эта корутина ([Таймеры и корутины](/ru/plugins/concurrency/)) |
| `MP.GetTimeMS()` | `node.server.time()` (секунды с долями), `node.server.uptime()` |
| HTTP, который ждёт ответа | `node.http.get(url, headers, cb)` и родственники с обратным вызовом или `node.http.fetch(url)` внутри `node.async` ([HTTP](/ru/plugins/http/)) |
| состояние в собственных файлах | `node.storage.get(key, default)` и `node.storage.set(key, value)`, на диске раньше, чем `set` вернётся ([Хранилище и файлы](/ru/plugins/storage/)) |
| `FS.Exists`, `FS.CreateDirectory`, `FS.Copy`, `FS.Rename`, `FS.Remove`, `FS.ListFiles` | `node.fs.exists`, `node.fs.mkdir`, `node.fs.copy`, `node.fs.rename`, `node.fs.remove`, `node.fs.list` — внутри папки ресурса |
| `FS.ConcatPaths`, `FS.GetFilename`, `FS.GetExtension`, `FS.GetParentFolder` | `node.fs.join`, `node.fs.basename`, `node.fs.extension`, `node.fs.dirname` |
| `Util.JsonEncode`, `Util.JsonDecode`, `Util.JsonPrettify` | `node.json.encode(value)`, `node.json.decode(text)`, `node.json.encode(value, { pretty = true })` |
| `Util.JsonFlatten`, `Util.JsonDiff`, `Util.JsonDiffApply` | `node.json.flatten`, `node.json.diff`, `node.json.patch` |
| `print`, `Util.LogInfo`, `Util.LogWarn`, `Util.LogError` | `node.log(text, ...)`, `node.log.warn`, `node.log.error` |
| `MP.Get`, `MP.Set` с `MP.Settings` | `node.server.name()`, `map()`, `maxPlayers()`, `maxCars()`; `node.server.setName`, `setMaxPlayers`, `setMaxCars` |
| `Util.RandomIntRange(a, b)` | `math.random(a, b)`; для токена — `node.crypto.randomHex(n)` |

## Перенесённый плагин чата

Плагин BeamMP, который отвечает на `/online` и объявляет о входах:

<!-- doctest: skip BeamMP's MP.* API, shown for comparison; a NodeMP server has no MP table -->
```lua
-- Resources/Server/Greeter/main.lua (BeamMP)
function onChatMessage(pid, name, message)
    if message == "/online" then
        MP.SendChatMessage(pid, "Online: " .. MP.GetPlayerCount())
        return 1
    end
end
MP.RegisterEvent("onChatMessage", "onChatMessage")

function onPlayerJoin(pid)
    MP.SendChatMessage(-1, MP.GetPlayerName(pid) .. " joined")
end
MP.RegisterEvent("onPlayerJoin", "onPlayerJoin")
```

Тот же плагин как ресурс NodeMP, `resources/greeter/server/main.lua`:

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/online"}]]} -->
```lua
node.on("chatMessageRequest", function(player, msg)
    if msg.text ~= "/online" then return end
    player:tell("Online: %d", node.players.count())
    return { handled = true }
end)

node.on("playerJoined", function(player)
    node.chat.say("%s joined", player.name)
end)

-- expect-client: Alice chat:msg .*Alice joined
-- expect-client: Alice chat:msg .*Online: 1
```

Что изменилось:

1. `MP.RegisterEvent` больше нет: `node.on` принимает саму функцию.
2. Обработчик получает `Player`, так что `MP.GetPlayerName(pid)` — это `player.name`, а
   `MP.SendChatMessage(pid, ...)` — `player:tell(...)` со встроенным `string.format`.
3. `return 1` превращается в `return { handled = true }`: строка дальше не идёт, а игрок видит только
   ответ.
4. `MP.SendChatMessage(-1, ...)` — это `node.chat.say(...)`.

Манифест не нужен: папка с `server/main.lua` — уже ресурс с именем папки.

## Клиентские скрипты

Клиентский скрипт, написанный для BeamMP, находит привычные глобальные имена: `TriggerServerEvent`,
`TriggerClientEvent`, `AddEventHandler`, `RemoveEventHandler`, помощники для клавиш и таблицы
модулей `MPGameNetwork`, `MPCoreNetwork`, `MPConfig`, `MPVehicleGE` и `UI`. Клиентский мод держит
их, чтобы такие скрипты работали с минимумом правок. Модулей BeamMP для отдельных потоков
(`positionGE`, `MPInputsGE`, `MPElectricsGE` и подобных) нет; скрипт, которому они нужны,
переписывают на клиентский API NodeMP ([Клиентские скрипты](/ru/plugins/client-scripting/)).
`TriggerServerEvent(name, data)` приходит на сервер сетевым событием — `node.on(name, fn)` с
`(player, data)`.

## Дальше

- [Первый ресурс](/ru/plugins/getting-started/): ресурс NodeMP с пустой папки.
- [Отличия от BeamMP](/ru/introduction/differences-from-beammp/): сравнение шире, не только плагины.
