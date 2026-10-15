---
title: Переход с других платформ
description: Для авторов плагинов BeamMP и KissMP — как их понятия ложатся на NodeMP, что модуль beammp-compat запускает без изменений и чему нет замены.
---

Если вы писали плагины для BeamMP или KissMP, большая часть знаний пригодится: сервер выполняет Lua,
реагирует на игроков и машины и общается со скриптами в игре. Здесь — как одно ложится на другое, а
затем — как запустить плагин BeamMP как есть.

## Что устроено иначе

- **Всё выполняется в одном потоке.** Обработчики всех ресурсов работают по очереди на одном рабочем
  потоке. Обработчик, который спит или крутится в цикле, задерживает все остальные ресурсы. Ждут с
  помощью таймеров и корутин ([Таймеры и корутины](/ru/plugins/concurrency/)).
- **Обработчики получают объекты.** Обработчику приходит `Player` или `Vehicle` с полями и методами, а
  не голое число ([Игроки и машины](/ru/plugins/players-and-vehicles/)).
- **Id машин общие.** У каждой машины один id, уникальный на сервере, кто бы её ни заспавнил.
- **Машины переживают хозяина.** Когда игрок уходит, его машины остаются в мире без хозяина. Если ваш
  плагин рассчитывает, что они исчезнут, удалите их сами или поставьте `vehicle-cleanup`.
- **Чат встроен в сервер.** Он работает без плагинов. Команда — это строка чата, которую ресурс
  забирает, вернув `{ handled = true }` ([Чат и команды](/ru/plugins/chat/)).
- **У отказа есть причина.** Если запрос вернул `false, "причина"`, игрок увидит эту причину.
- **Личность проверяется.** На сервере из списка аккаунт каждого игрока проверяет NodeMP;
  `player.accountId` — надёжный ключ для данных.

## Что куда переезжает

| На старой платформе | В NodeMP |
|---|---|
| Серверные плагины в `Resources/Server/<плагин>/` | `resources/<имя>/`, точка входа — `server/main.lua` |
| Клиентские моды в `Resources/Client/` | Zip-моды в `content/`; Lua для игры — в `resources/<имя>/client/` |
| `ServerConfig.toml` | `server.toml` ([Настройки сервера](/ru/hosting/configuration/)) |
| Собственный файл настроек плагина | Таблица `[config]` в `resource.toml`, читается как `node.config` |

## Понятия BeamMP в NodeMP

| BeamMP | NodeMP |
|---|---|
| `onInit` | Верх `main.lua`, он выполняется при загрузке ресурса |
| `onPlayerAuth` | `playerConnectRequest`: `false, "причина"` — отказ, `true` — резервное место |
| `onPlayerConnecting` | `playerAuthenticated` |
| `onPlayerJoining` | `playerJoining` |
| `onPlayerJoin` | `playerJoined` |
| `onPlayerDisconnect` | `playerLeft`, с причиной |
| `onChatMessage` | `chatMessageRequest`: отклонить, переписать или принять строку как команду |
| `onVehicleSpawn` | `vehicleSpawnRequest` |
| `onVehicleEdited` | `vehicleEditRequest` |
| `onVehicleDeleted` | `vehicleDeleted` |
| `onVehicleReset` | `vehicleReset` |
| `onShutdown` | `serverShutdown`, а последнее слово самого ресурса — `resourceUnload` |
| `MP.SendChatMessage` | `player:tell`, а всем — `node.chat.say` |
| `MP.DropPlayer` | `player:kick(reason)` |
| `MP.GetPlayers`, `MP.GetPlayerName` | `node.players.all()`, `player.name` |
| `MP.IsPlayerGuest`, `MP.GetPlayerIdentifiers` | `player.guest`, `player.accountId`, `player.identifiers` |
| `MP.TriggerClientEvent` | `player:send(name, data)` или `node.broadcast` |
| `MP.TriggerGlobalEvent` | `node.bus.call` — он возвращает то, что вернули обработчики, или `node.bus.emit`, если отвечать никому не нужно ([Шина](/ru/plugins/bus/#вопрос-и-ответ)) |
| `MP.CreateEventTimer`, `MP.CancelEventTimer` | `node.every(ms, fn)`, `node.cancel(id)`; `CallStrategy.Precise` — это `node.every(ms, fn, { precise = true })` |
| `onConsoleInput` | `node.console.command(name, fn)` или событие `consoleInput` для целых строк |
| `MP.Sleep` | `node.sleep(ms)` внутри `node.async`, без блокировки |
| `MP.GetPlayerVehicles`, `MP.RemoveVehicle` | `player:vehicles()`, `vehicle:delete()` |
| `MP.GetPositionRaw` | `vehicle:transform()` или `node.vehicles.transforms()` для всех машин |
| `MP.Set(MP.Settings.MaxPlayers, n)` | `node.server.setMaxPlayers(n)` |
| `Util.JsonEncode`, `Util.JsonDecode` | `node.json.encode`, `node.json.decode` |
| `FS.*` | `node.fs.*`, в пределах папки ресурса |
| `TriggerServerEvent` в клиентском моде | `node.emitServer` или `NodeMP.events.triggerServer` |
| `AddEventHandler` в клиентском моде | `node.on` или `NodeMP.events.on` |

То же приветствие и команда в виде ресурса NodeMP:

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/hello"}]]} -->
```lua
node.on("playerJoined", function(player)
    node.chat.say("%s joined the server", player.name)
end)

node.on("chatMessageRequest", function(player, msg)
    if msg.text ~= "/hello" then return end
    player:tell("Hello, %s!", player.name)
    return { handled = true }
end)

-- expect-client: Alice chat:msg .*Alice joined the server
-- expect-client: Alice chat:msg .*Hello, Alice!
```

## Понятия KissMP в NodeMP

Слоя совместимости с KissMP в NodeMP нет, плагин KissMP переписывают. Понятия ложатся близко:

| KissMP | NodeMP |
|---|---|
| Хуки подключения и ухода игрока | `playerConnectRequest`, `playerJoined`, `playerLeft` |
| Хук чата | `chatMessageRequest` |
| Хуки спавна, сброса и удаления машин | `vehicleSpawnRequest`, `vehicleSpawned`, `vehicleReset`, `vehicleDeleted` |
| Хук на каждом такте сервера | `serverTick`, а лучше таймер: `node.every(ms, fn)` |
| Объект подключения: имя, сообщения, кик | `Player`: `player.name`, `player:tell`, `player:kick` |
| Список машин и их положения | `node.vehicles.all()`, `node.vehicles.transforms()` |
| Данные в файлах | `node.storage`, `node.fs` или [модуль db](/ru/plugins/database/) |
| Lua, который отправляют игрокам | Файлы `client/` ресурса ([Клиентские скрипты](/ru/plugins/client-scripting/)) |
| Моды, которые раздаёт сервер | Zip-архивы в `content/` ([Моды и карты](/ru/hosting/mods/)) |

## Плагины BeamMP без изменений

Нативный модуль `beammp-compat` запускает серверные плагины BeamMP как есть. Это языковой хост: он
занимает `type = "beammp"` и даёт каждому такому ресурсу таблицы `MP`, `Util` и `FS`, которых ждёт
плагин BeamMP.

`beammp-compat` в архив сервера не входит, его собирают из исходников через CMake, как и другие
[нативные модули](/ru/plugins/examples/#собираются-из-исходников-в-архив-не-входят). Положите
`beammp-compat.dll` в `modules/` рядом с сервером. Затем оформите плагин как ресурс:

```
resources/
└── my-plugin/
    ├── resource.toml
    ├── main.lua         ← файлы плагина, без изменений
    ├── commands.lua
    └── client/          ← файлы клиентского мода, распакованные (необязательно)
```

```toml
name = "my-plugin"
type = "beammp"

[server]
main = "main.lua"
```

Сначала выполняется файл из `[server] main`, затем все остальные `.lua` прямо в папке, по алфавиту, в
одном состоянии Lua, как в BeamMP; потом `onInit`. Назначьте один из файлов точкой входа: папку без
`server/main.lua` и без клиентских файлов сервер ресурсом не считает.

### Что работает как есть

- Все события игроков и машин из таблицы выше, с аргументами BeamMP, а также `postPlayerAuth`,
  `postChatMessage`, `postVehicleSpawn` и `postVehicleEdited`.
- Свои события от клиентов, `MP.TriggerLocalEvent` и `MP.TriggerGlobalEvent` между плагинами, таймеры,
  `MP.Get` и `MP.Set` для лимитов игроков и машин, карты и имени.
- `Util.Json*`, `Util.Random*`, `Util.Log*` и `FS.*` для файлов и папок.
- В игре — клиентские глобальные имена, которые вызывает клиентский мод BeamMP: `TriggerServerEvent`,
  `TriggerClientEvent`, `AddEventHandler`, `MPGameNetwork`, `MPCoreNetwork`, `MPConfig`,
  `MPVehicleGE`, `UI`.

### Что работает иначе

- В `onVehicleSpawn` id машины — тот, что предложил клиент, для новой машины `0`: настоящий id NodeMP
  выдаёт после решения. Его приносит `postVehicleSpawn`.
- `MP.SendChatMessage` показывает строку как системную.
- `MP.Sleep` блокирует рабочий поток, а с ним и все ресурсы. Модуль один раз предупреждает об этом.
- Идентификатор, который BeamMP называет `beammp`, — номер аккаунта игрока в NodeMP.
- Плагину, как и любому ресурсу, доступна только своя папка
  ([окружение Lua](/ru/plugins/resources/#окружение-lua)). Пути, которые он строит как
  `Resources/Server/<плагин>/…` в `FS.*`, `io.open` и подобных, ведут в папку ресурса. Плагину,
  который читает другие папки, запускает программы или читает переменные окружения, нужно, чтобы
  хост вписал его в `[resources] trusted`.

### Чему нет замены

- `onConsoleInput` и `onFileChanged` никогда не срабатывают.
- `MP.ConfirmationDialog`, `Util.JsonDiff` и `Util.JsonDiffApply` — заглушки.
- `Http.CreateConnection` нет: блокирующий HTTP-запрос остановил бы сервер. Используйте `node.http` из
  ресурса на Lua.
- `exit()` только пишет предупреждение: ресурс не может так остановить сервер.
- В игре нет модулей отдельных потоков данных: `MPInputsGE`, `MPElectricsGE`, `MPPowertrainGE`,
  `positionGE`, `MPHelpers`, `MPUpdatesGE` и `MPModManager`.

Чтобы уходить от слоя совместимости постепенно, в исходниках модуля есть ещё `mp.lua`: он даёт
обычному ресурсу на Lua те же таблицы `MP`, `Util` и `FS`. Тогда старый код и новый, на `node`, живут
в одном ресурсе, пока вы переписываете его по частям.
