---
title: Перенос плагинов BeamMP
description: Перенос серверного плагина BeamMP на NodeMP - папка и манифест, соответствие MP.* и node.*, чему нет эквивалента, чат-плагин по шагам.
---

Плагины BeamMP не работают на NodeMP без изменений. Глобальных таблиц `MP`, `Util`, `FS` и `Http`
нет, `Resources/Server/<plugin>/` не сканируется, `ServerConfig.toml` не читается, а модель событий
другая: обработчик получает объекты `Player` и `Vehicle`, запрос отклоняется через `false, reason`,
а не через `return 1`, и один файл точки входа заменяет папку нумерованных скриптов. Переносится
форма плагина - события, на которые он реагирует, и вызовы, которые делает, - и эта страница
сопоставляет каждый из них с формой NodeMP. Каждое целевое имя ниже есть в
[справочнике Lua API](/ru/plugins/api/lua/) и [справочнике событий](/ru/plugins/api/events/).

## Папка и манифест

| BeamMP | NodeMP |
|---|---|
| `Resources/Server/<plugin>/`, все `.lua` верхнего уровня загружаются в одно Lua-состояние | `resources/<name>/` с одной точкой входа, `server/main.lua`, и необязательным `resource.toml` |
| `Resources/Client/<mod>.zip`, отправляемый игрокам | `content/<mod>.zip`, скачиваемый лаунчером до подключения; передаваемый Lua лежит в `resources/<name>/client/` |
| `ServerConfig.toml`, `[General]` с `AuthKey` | `server.toml`, семь секций: `[General]`, `[Resources]`, `[Content]`, `[Network]`, `[Experimental]`, `[Directory]`, `[Http]` - см. [Конфигурацию](/ru/hosting/configuration/); ключ сервера - это `[Directory] HostId` и `HostSecret` |
| `plugin.lua` или `main.lua` плюс вспомогательные файлы, загружаемые по порядку имён | `server/main.lua`; остальные файлы через `require` после добавления папки в `package.path` ([Ресурсы](/ru/plugins/resources/#структура)) |

Самый маленький манифест называет ресурс и его точку входа; папка без него - Lua-ресурс с именем
папки и точкой входа `server/main.lua`:

```toml
name = "greeter"
version = "1.0"

[server]
main = "server/main.lua"
```

Имя ресурса - это тег лога, хранилище `node.storage` и имя, под которым клиентский мод регистрирует
переданные скрипты; используйте только буквы, цифры, `_`, `-` и `.`.

## API бок о бок

`MP.RegisterEvent(name, "handlerName")` становится `node.on(name, fn)`; обработчик - функция, а не
имя глобальной переменной, и имя события решает, что он получит.

### События

Имена NodeMP следуют двум правилам: уведомление - `<subject><Verb-ed>` (`playerJoined`), запрос,
который обработчик может отклонить, - `<subject><Action>Request` (`vehicleSpawnRequest`) - без
префикса `on`, его уже говорит `node.on(...)`. Последний столбец - написание, которое использовали
серверы до 1.2.0; оно продолжает работать как устаревший псевдоним (одно предупреждение на ресурс
на старое имя, удаляется в 2.0), так что ресурс, перенесённый под старый сервер, продолжает
работать - но пишите новое имя.

| BeamMP | NodeMP | До 1.2.0 |
|---|---|---|
| `onInit` | Код верхнего уровня `server/main.lua`; выполняется один раз при загрузке и снова при каждой перезагрузке. | |
| `onShutdown` | `node.on("serverShutdown", function() ... end)` | `onShutdown` |
| `onPlayerAuth(name, role, isGuest, identifiers)` - `return 1` или строка отклоняет | `node.on("playerConnectRequest", function(player, name) return false, "reason" end)`; читайте `player.guest`, `player.verified`, `player.accountRoles`, `player.identifiers`. Баны проверяются до его срабатывания. | `onPlayerConnectRequest` |
| `onPlayerConnecting(pid)` | `node.on("playerAuthenticated", function(player) ... end)` | `playerConnecting` |
| `onPlayerJoining(pid)` | Эквивалента нет - между `playerAuthenticated` и `playerJoined` ничего не срабатывает. | |
| `onPlayerJoin(pid)` | `node.on("playerJoined", function(player) ... end)` | `playerJoin` |
| `onPlayerDisconnect(pid)` | `node.on("playerLeft", function(player) ... end)`; `player.name` ещё известно. | |
| `onChatMessage(pid, name, message)` - `return 1` блокирует | `node.on("chat:send", function(player, data) ... end)`, где `data` - JSON-текст `{ scope, text }`. Доставкой владеет ресурс `chat`; см. [разбор](#разбор-перенос-чат-плагина). | |
| `onVehicleSpawn(pid, vid, data)` - `return 1` отклоняет | `node.on("vehicleSpawnRequest", function(player, requestedId, config) return false, "reason" end)`; `vehicleSpawned(vehicle)` срабатывает после. | `onVehicleSpawnRequest` |
| `onVehicleEdited(pid, vid, data)` - `return 1` отклоняет | `vehicleEditRequest(player, vehicle, config)`, возвращающий `false, reason`; `vehicleEdited(player, vehicle, config)` после. | `onVehicleEditRequest` |
| `onVehicleDeleted(pid, vid)` | `vehicleDeleted(vehicle)` - записи уже нет; значим только `vehicle.id`. | |
| `onVehicleReset(pid, vid, data)` | `vehicleReset(player, vehicle, posRot)` - только наблюдение, отклонить нельзя. | |
| `onVehiclePaintChanged(pid, vid, data)` | `vehiclePaintRequest(player, vehicle, paints)`, чтобы решить, `vehiclePainted`, чтобы наблюдать. | `onVehiclePaintRequest` |
| `onFileChanged(path)` | Эквивалента нет; опрашивайте по таймеру ([События → События о файлах нет](/ru/plugins/events/#события-о-файлах-нет)). | |
| `onConsoleInput(cmd)` | Эквивалента нет: у сервера нет консольного ввода. Используйте команды чата (`node.commands.add`). | |

Каждый отменяемый обработчик выполняется даже после того, как один уже отказал, а обработчик с
ошибкой никогда не отказывает. Остальные виды, которых у плагина BeamMP не было, - смена мест,
запросы сцепок и триггеров (`vehicleEnterRequest`, `vehicleExitRequest`, `vehicleCouplerRequest`,
`vehicleTriggerRequest`), потоки позиций и electrics, закрытый по умолчанию захват нод
(`vehicleNodeGrabRequest`), фильтр ретрансляции (`relayRequest`, прежде `canRelay`) - на странице
[События](/ru/plugins/events/), а [полный список переименованных событий](/ru/plugins/api/events/#renamed-events) -
в справочнике.

### Игроки

| BeamMP | NodeMP |
|---|---|
| `MP.GetPlayerName(pid)` | `player.name` или `node.players.get(id).name` |
| `MP.GetPlayerIDByName(name)` | `node.players.find(name)` возвращает `Player`; его `.id` - число |
| `MP.GetPlayers()` (таблица идентификатор → имя) | `node.players.all()` (массив `Player`), `node.players.ids()` |
| `MP.GetPlayerCount()` | `node.players.count()` |
| `MP.IsPlayerConnected(pid)` | `player:isConnected()` |
| `MP.IsPlayerGuest(pid)` | `player.guest` |
| `MP.GetPlayerIdentifiers(pid)` (`{ ip, beammp }`) | `player.identifiers` - массив `"nodemp:<id>"`, `"discord:<id>"`, `"ip:<addr>"`, как их перечисляет директория, пустой у непроверенного, - плюс `player.ip` и `player.accountId`. Идентификатора `beammp` нет. |
| аргумент `role` в `onPlayerAuth` | `player.accountRoles` (роль из директории, `"ADM"` у администратора директории); `player:setRole(role)` и `player.role` - собственная метка этого сервера на одну сессию |
| `MP.DropPlayer(pid, reason)` | `player:kick(reason)` |
| - | `player:ban(reason)`, `node.bans.add(who, reason)`, `node.bans.remove`, `node.bans.has`, `node.bans.all()` - хранятся в `bans.json` |

### Машины

| BeamMP | NodeMP |
|---|---|
| `MP.GetPlayerVehicles(pid)` (`{ [vid] = "pid-vid:{...}" }`) | `player:vehicles()` (массив `Vehicle`); `vehicle:config()` - конфигурация таблицей |
| `MP.GetPositionRaw(pid, vid)` (`{ pos, rot }`) | `vehicle:transform()` (`pos`, `rot`, `vel`, `angVel`, все `{x, y, z}` или `{x, y, z, w}`) или `player:position()` |
| `MP.RemoveVehicle(pid, vid)` | `vehicle:delete()` |
| пара `(pid, vid)` | один глобальный идентификатор, `vehicle.id`, уникальный на всё время жизни сервера; `vehicle.spawner`, `vehicle.driver` и `vehicle.authority` - игроки вокруг него |
| - | `vehicle:seat`, `vehicle:lock`, `vehicle:setTag`, `vehicle:setCoupler`, `vehicle:trigger`, `vehicle:resync`, `node.vehicles.spawn` - серверные действия, для которых у BeamMP API не было |

### Чат и события клиентам

| BeamMP | NodeMP |
|---|---|
| `MP.SendChatMessage(pid, message)`; `pid = -1` для всех | `player:tell(text, ...)` или `node.chat.tell(target, text, ...)`; `node.chat.say(text, ...)` для всех. Все три говорят через ресурс `chat` и молчат без него. |
| `MP.TriggerClientEvent(pid, name, data)`; `pid = -1` для всех | `player:send(name, data)` или `node.send(target, name, data)`; `node.broadcast(name, data)` для всех, `node.broadcast(name, data, except)` для всех, кроме одного |
| `MP.TriggerClientEventJson(pid, name, table)` | `player:send(name, table)` - таблица кодируется в JSON за вас |
| `MP.TriggerGlobalEvent(name, ...)` (обработчики всех плагинов, с future для результатов) | `node.bus.emit(name, data)` и `node.bus.on(name, function(source, data) ... end)` - асинхронно, строковая нагрузка, без возвращаемых значений |
| `MP.TriggerLocalEvent(name, ...)` | Вызовите функцию. Шина доставляет и отправителю, если нужен один путь для обоих случаев. |

### Таймеры

| BeamMP | NodeMP |
|---|---|
| `MP.CreateEventTimer(name, ms)` плюс `MP.RegisterEvent(name, handler)` | `node.every(ms, fn)` - возвращает идентификатор таймера |
| `MP.CancelEventTimer(name)` | `node.cancel(id)` |
| - | `node.after(ms, fn)` для одного раза, `node.defer(fn)` для «после текущих обработчиков» |
| `MP.Sleep(ms)` (блокирует всё Lua-состояние) | `node.sleep(ms)` внутри `node.async(fn)` - приостанавливает только эту корутину |
| `MP.GetTimeMS()`, `MP.GetTimeS()` | `node.server.time()` (unix, с дробной частью), `node.server.unixTime()`, `node.server.uptime()` |

### HTTP

| BeamMP | NodeMP |
|---|---|
| `Http.Get(host, port, target)` (синхронно, возвращает тело) | `node.http.get(url, headers?, cb)` с `cb(status, body, headers)` в рабочем потоке; или `node.http.fetch(url)` внутри `node.async`, возвращающий `status, body, headers` |
| `Http.Post(host, port, target, body, contentType)` | `node.http.post(url, body, headers?, cb)`; тип содержимого положите в `headers` (`{ ["Content-Type"] = "application/json" }`) |

Неудавшийся запрос вызывает колбэк со статусом `-1` и текстом ошибки в `body`. Ничто в NodeMP не
блокирует рабочий поток на сетевой обмен.

### Хранилище и файлы

| BeamMP | NodeMP |
|---|---|
| состояние в собственных файлах (`FS.*`, `io`) | `node.storage.get(key, default)`, `node.storage.set(key, value)`, `node.storage.delete(key)` - JSON-хранилище на ресурс в `storage/<name>.json` + `.log`, надёжно записано до возврата из `set` |
| `FS.Exists`, `FS.IsFile`, `FS.IsDirectory`, `FS.ListFiles`, `FS.ListDirectories` | `node.fs.list(path?)` (`name`, `dir`, `size` на запись) - `exists` это поиск в нём ([Ресурсы → Чего в node.fs нет](/ru/plugins/resources/#чего-в-nodefs-нет)); `node.fs.read(path)` - `nil`, когда файла нет |
| чтение и запись файлов где угодно | `node.fs.read`, `node.fs.write`, `node.fs.writeAsync` - только внутри папки ресурса |
| `FS.CreateDirectory`, `FS.Copy` | `node.fs.write` создаёт родительские папки и, получив `node.fs.read(from)`, копирует; пустую папку создать нельзя |
| `FS.Remove`, `FS.Rename` | Эквивалента в `node` нет; стандартные `os.remove` и `os.rename` открыты и работают с абсолютным путём, собранным от папки ресурса |
| `FS.ConcatPaths`, `FS.GetFilename`, `FS.GetExtension`, `FS.GetParentFolder` | Эквивалента нет; склеивайте через `/`, который сервер принимает на Windows и Linux, и разбирайте путь через `string.match` |

### Утилиты

| BeamMP | NodeMP |
|---|---|
| `Util.JsonEncode`, `Util.JsonDecode` | `node.json.encode`, `node.json.decode` (`nil` при ошибке разбора) |
| `Util.JsonPrettify`, `Util.JsonMinify`, `Util.JsonFlatten`, `Util.JsonUnflatten`, `Util.JsonDiff`, `Util.JsonDiffApply` | Эквивалента нет: `node.json.encode` пишет компактный JSON и не принимает опций ([Соглашения → Окружение Lua](/ru/plugins/conventions/#окружение-lua)) |
| `print`, `Util.LogInfo`, `Util.LogWarn`, `Util.LogError`, `Util.LogDebug` | `node.log(msg, ...)`, `node.log.warn`, `node.log.error` - аргументы `string.format`, тег - имя ресурса |
| `MP.GetServerVersion()` | `node.server.version()` |
| `MP.Settings.*`, `MP.Get`, `MP.Set` | `node.server.name()`, `map()`, `maxPlayers()`, `maxCars()`, `port()`; `node.server.setName`, `setMaxPlayers`, `setMaxCars` |
| `MP.GetStateMemoryUsage` | `collectgarbage("count") * 1024` - байты Lua-стейта этого ресурса |
| `MP.GetOSName`, `MP.GetLuaMemoryUsage` | Эквивалента нет: ни имя ОС, ни сумма по всем Lua-стейтам не раскрываются; `node.server.metrics()` - таблица живых метрик (счётчики, не байты) |
| `Util.Random`, `Util.RandomIntRange`, `Util.RandomRange` | `math.random()`, `math.random(a, b)`, `a + (b - a) * math.random()`; `node.crypto.randomHex(n)` для токена |
| `Util.DebugExecutionTime`, `MP.CreateTimer` | Эквивалента нет; `node.server.uptime()` до и после измеряет участок, а каждый обработчик дольше 250 мс сервер логирует сам |

## Чему нет эквивалента

- **Консольный ввод.** `onConsoleInput` и ответы в консоль: сервер ничего не читает из своей
  консоли. Администрирование - это команды чата (`node.commands.add`, закрытые `player.role`), шина
  или клиентская половина.
- **Блокирующие вызовы.** `MP.Sleep`, синхронный `Http.*`: каждая форма ожидания в NodeMP - колбэк
  или корутина, потому что все ресурсы делят один рабочий поток ([Конкурентность](/ru/plugins/concurrency/)).
- **Межплагинные вызовы с результатами.** Future из `MP.TriggerGlobalEvent`: шина односторонняя.
  Спрашивайте и отвечайте двумя сообщениями шины, как делают `chat` и `dimensions`.
- **Вето на поведение другого ресурса.** Плагин BeamMP блокировал чат через `return 1` в
  `onChatMessage`; в NodeMP ресурс `chat` сам решает, что рассылать, а другой ресурс может лишь
  наблюдать `chat:send`. Чтобы фильтровать чат, меняйте `chat` - это ресурс, а не часть сервера.
- **Файлы вне папки ресурса** через `node.fs`; `onFileChanged`; JSON-утилиты помимо encode и
  decode (`Util.JsonPrettify`, `JsonFlatten`, `JsonDiff`, `JsonDiffApply`); `MP.GetOSName`,
  `MP.GetLuaMemoryUsage`, `Util.DebugExecutionTime`.
- **Идентификатор `beammp`.** Аккаунты - это аккаунты NodeMP: `player.accountId` и
  `player.identifiers`, проверенные через директорию. У гостя Test Drive идентификатора аккаунта нет.
- **`MP.Settings` за пределами пяти значений**, которые открывает `node.server`; их аналоги `Public`,
  `Description`, `Tags` относятся к `[Directory]` в `server.toml`, и API времени выполнения у них нет.
- **Зеркалирование `ServerConfig.toml`.** Ничто не пишет секцию `[General]`, чтобы плагины её
  читали; настройки, нужные ресурсу, идут в его собственную таблицу `[config]` и приходят как
  `node.config`.

## Разбор: перенос чат-плагина

Плагин BeamMP, который отвечает на `!online` и объявляет о подключениях:

<!-- doctest: skip BeamMP's MP.* API, shown for comparison; a NodeMP server has no MP table -->
```lua
-- Resources/Server/Greeter/main.lua (BeamMP)
function onChatMessage(pid, name, message)
    if message == "!online" then
        MP.SendChatMessage(pid, "Online: " .. MP.GetPlayerCount())
        return 1 -- swallow the line
    end
end
MP.RegisterEvent("onChatMessage", "onChatMessage")

function onPlayerJoin(pid)
    MP.SendChatMessage(-1, MP.GetPlayerName(pid) .. " joined")
end
MP.RegisterEvent("onPlayerJoin", "onPlayerJoin")
```

Тот же плагин как ресурс NodeMP. Ему нужен пример ресурса `chat`, установленный рядом
(`examples/chat` в архиве релиза), потому что чат не является частью сервера:

```toml
# resources/greeter/resource.toml
name = "greeter"
version = "1.0"

[server]
main = "server/main.lua"
```

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/online"}]]} -->
```lua
-- resources/greeter/server/main.lua (NodeMP)
node.commands.add("online", function(player, args, raw)
    player:tell("Online: %d", node.players.count())
end)

node.on("playerJoined", function(player)
    node.chat.say("%s joined", player.name)
end)

-- expect-client: Alice chat:msg .*Alice joined
-- expect-client: Alice chat:msg .*Online: 1
```

Что изменилось, строка за строкой:

1. Префикс команды - `/`, а не `!`, и ресурс `chat` никогда не рассылает строку с `/` - он публикует
   её на шине как `chat:command`, и `node.commands.add` её получает. Проглатывать нечего, так что у
   `return 1` нет аналога.
2. Обработчик получает `Player`, так что `MP.GetPlayerName(pid)` - это `player.name`, а
   `MP.SendChatMessage(pid, ...)` - `player:tell(...)` со встроенными аргументами `string.format`.
3. `MP.SendChatMessage(-1, ...)` - это `node.chat.say(...)`. И `tell`, и `say` доходят до экрана через
   сообщение шины `chat:say` ресурса `chat`; без `chat` они молчат.
4. `MP.RegisterEvent` исчез: `node.on` принимает саму функцию.

Плагин, который следил за каждой строкой, - логгер, фильтр - подписывается на сетевое событие,
которое шлёт клиент, `chat:send`, чей `data` - JSON-текст `{ "scope": "global", "text": "..." }`:

<!-- doctest: server+client {"emit": [["chat:send", {"scope": "global", "text": "hello from BeamMP land"}]]} -->
```lua
node.on("chat:send", function(player, data)
    local msg = node.json.decode(data)
    if type(msg) == "table" and type(msg.text) == "string" then
        node.log("%s: %s", player.name, msg.text)
    end
end)

-- expect: Alice: hello from BeamMP land
```

Он видит строку; он не решает, ретранслирует ли её `chat`. Запустите сервер, и консоль напечатает
`greeter v1.0 loaded — lua · server 1 file · 0 client files` между строками загрузки остальных
ресурсов.

## Клиентские скрипты

Клиентский скрипт BeamMP - Lua-файл внутри клиентского zip - доходит до игры с теми же глобальными
именами, которыми пользовался раньше. Клиентский мод сохраняет `TriggerServerEvent`,
`TriggerClientEvent`, `AddEventHandler`, `RemoveEventHandler`, `onKeyPressed`, `onKeyReleased`,
`getKeyState` и `MPTranslate` ровно для этого: они существуют, чтобы облегчить перенос клиентских
скриптов, а новый код должен использовать их эквиваленты в `NodeMP.*` -
`NodeMP.events.triggerServer`, `NodeMP.events.triggerLocal`, `NodeMP.events.on`,
`NodeMP.events.off`, `NodeMP.keys.onPressed`, `NodeMP.keys.onReleased`, `NodeMP.keys.getState`,
`NodeMP.util.translate`. `TriggerServerEvent(name, data)` приходит на сервер сетевым событием,
`node.on(name, function(player, data) ... end)`, с таблицей, закодированной в JSON за вас.
Модульных глобальных имён BeamMP (`MPVehicleGE`, `positionVE` и подобных) не существует; скрипт,
который к ним тянулся, использует вместо них `NodeMP.*`. На сервере перенесённый клиентский скрипт
по-прежнему поставляется как zip в `content/`, а клиентская половина, написанная для NodeMP,
передаётся из `resources/<name>/client/` - [Клиентские скрипты](/ru/plugins/client-scripting/)
сравнивают оба пути.

## Дальше

- [Первые шаги](/ru/plugins/getting-started/) - первый ресурс NodeMP с пустой папки.
- [События](/ru/plugins/events/) - четыре вида и как отклоняется запрос.
- [Отличия от BeamMP](/ru/introduction/differences-from-beammp/) - более широкое сравнение, за пределами плагинов.
- [Конфигурация](/ru/hosting/configuration/) - `server.toml` для хоста.
