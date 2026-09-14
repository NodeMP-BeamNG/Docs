---
title: Клиентские скрипты
description: Две клиентские поверхности - передаваемая таблица node в клиентских файлах ресурса и SDK NodeMP.* для модов, поставляемых вместе с клиентом.
---

На машине игрока для вас выполняются два вида Lua. **Клиентские файлы** ресурса передаются с
сервера при подключении игрока, выполняются внутри клиентского мода и общаются с вашей серверной
половиной через клиентскую таблицу `node`. **Мод, поставляемый вместе с клиентом**, - zip в
`content/` или мод, который игрок установил сам, - использует SDK `NodeMP.*`, который клиентский
мод открывает каждому скрипту в игре. Это две разные поверхности с разными таблицами. Эта страница
полностью описывает первую, сжато - вторую и заканчивается тем, [когда какую выбирать](#какую-поверхность-выбрать).

## Клиентские файлы ресурса

Каждый `.lua` в `client/` - или список `[client] files` из `resource.toml` - доходит до каждого
подключающегося игрока после повтора мира и до того, как на сервере сработает `playerJoin`.
Клиентский мод компилирует файлы, выполняет их и подтверждает в `beamng.log` строкой
`Activated server resource "race" (1 ge file(s), 0 vehicle file(s))` для каждого ресурса и
`Server resources ready: 2 resource(s), 3 ge file(s), 0 vehicle file(s)`, когда доставка
завершена. Когда игрок выходит, каждый обработчик и каждое расширение, которые зарегистрировали
файлы, сбрасываются: `Unloaded 2 server resource(s) (left server)`. Ресурс, доставленный повторно,
пока его копия работает, заменяет эту копию. Упаковка, предел 900 КБ на часть, клиентский лимит
8 МБ / 512 файлов и уровни обфускации - на странице [Ресурсы](/ru/plugins/resources/#клиентская-половина).

### Таблица node

Внутри клиентского файла `node` - клиентская таблица, а не серверный `node` из
[справочника Lua API](/ru/plugins/api/lua/). В ней десять функций. Источник на уровне ресурса
клиентский мод подставляет сам, так что вы вызываете именно эти сигнатуры:

| Вызов | Что делает |
|---|---|
| `node.on(name, fn)` | Подписывает `fn(data)` на сетевое событие `name` - то, что серверная половина шлёт через `player:send` или `node.broadcast`, - и на всё, что поднимается локально под этим именем. Один обработчик на имя на ресурс: второй `node.on` с тем же именем заменяет первый. |
| `node.off(name)` | Убирает обработчик этого ресурса для `name`. |
| `node.emitServer(name, data)` | Шлёт сетевое событие серверу. `data` проходит через `tostring`, поэтому таблицу кодируйте `jsonEncode` сами. Заканчивается на сервере: доходит до серверных ресурсов и больше ни до чего. |
| `node.emitLocal(name, data)` | Выполняет все обработчики, подписанные на `name` на этой машине - ваши, других ресурсов, клиентского мода, - не трогая сервер. |
| `node.log(msg)` | Пишет `msg` в `beamng.log` на уровне info под тегом `node.events`. |
| `node.onModule(channel, fn)` | Подписывает `fn(data)` на двоичные данные, которые сервер шлёт по каналу `u32`; `data` - строка байтов. Один обработчик на канал на ресурс. |
| `node.offModule(channel)` | Снимает подписку этого ресурса на канал. |
| `node.sendModule(channel, data)` | Шлёт байты серверу по каналу; они доходят до подписчиков `node.modules.on` и нативных модулей, но никогда до других игроков. |
| `node.requestVehicleTrigger(globalId, call)` | Просит сервер, чтобы авторитет синхронизации машины выполнил один вызов контроллера; `call` - таблица или JSON-текст с `controllerName`, `functionName` и переменными. На сервере проходит через `onVehicleTriggerRequest`. |
| `node.requestNodeGrab(globalId, action, nodeId, x, y, z, force)` | Экспериментальный захват нод: `action` - `"grab"`, `"move"` или `"release"`. Отбрасывается, если не включён `[Experimental] NodeGrab` и ни один ресурс не разрешил `onVehicleNodeGrabRequest`. |

Плохой аргумент - пустое имя, обработчик не функция, канал вне диапазона `u32` - пишет строку
`E` под `node.events`, например `node.on: given event name is not a valid string`, и вызов ничего
не делает.

### События и полезные нагрузки

Обработчик получает один аргумент: `data`, строку, которую прислал сервер. Серверная половина
кодирует в JSON таблицу, которую передаёт в `player:send`, так что раскодируйте её игровым
`jsonDecode`; строка приходит как есть. В обратную сторону `node.emitServer` шлёт то, что сделает
из `data` функция `tostring`, - таблица пришла бы как `table: 0x...`, - так что кодируйте через
`jsonEncode` и дайте серверной половине раскодировать через `node.json.decode`. Называйте сетевые
события `<domain>:<verb>`, в нижнем регистре, с одним двоеточием (`race:start`, `race:ready`);
`node:` зарезервировано за фреймворком. Серверная сторона того же правила - на странице
[События](/ru/plugins/events/).

```lua
-- resources/race/client/main.lua
local M = {}

-- the server half sent a table with player:send; it arrives as JSON text
node.on("race:start", function(data)
    local start = jsonDecode(data)
    NodeMP.ui.notify("Race starts in " .. tostring(start.seconds) .. " s")
    node.log("race:start on " .. tostring(start.track))
end)

-- a wire event the server half handles with node.on("race:ready", fn(player, data))
node.emitServer("race:ready", jsonEncode({ car = "etk800" }))

-- a returned table with on* functions is registered as a game extension
function M.onVehicleSpawned(gameVehicleID)
    node.emitServer("race:spawned", tostring(gameVehicleID))
end

return M
```

Обработчики выполняются внутри `pcall`: ошибка пишется как
`Error in event handler for "race:start" from source "node.res/race": ...`, а остальные обработчики
всё равно выполняются. Источник, `node.res/<name>`, общий для всех файлов ресурса - поэтому у
ресурса один обработчик на имя события, и поэтому клиентский мод может сбросить их все разом,
когда игрок выходит.

### Что клиентский файл может и чего не может

Клиентский файл не изолирован. Он выполняется в Lua-состоянии игрового движка, поверх которого
наложено собственное окружение ресурса, так что видит всё, что видит скрипт игры, - `be`,
`settings`, `extensions`, `log`, `jsonEncode` и `jsonDecode` - и SDK `NodeMP.*`, описанный ниже.
Только два имени принадлежат ресурсу: `node`, таблица выше, и `require`, который сначала ищет среди
переданных файлов ресурса. Чтение и запись всего остального идут в глобальную таблицу игры, так что
имя, которому вы присвоили значение без `local`, становится настоящей глобальной переменной игры,
общей со всеми остальными скриптами; держите состояние в локальных переменных или в таблице,
которую возвращаете.

- **`require`.** `require("lib/helpers")` находит переданный файл `lib/helpers.lua` по доставленному
  пути (прямые слэши; ведущий `./` и суффикс `.lua` игнорируются); каждый файл выполняется один раз,
  а его возвращаемое значение кэшируется. Имя, которого нет среди файлов ресурса, уходит в `require`
  игры. Цикл падает с `circular require of resource module "lib/helpers"`.
- **Расширения.** Файл `ge`, возвращающий таблицу с функциями `on…`, регистрируется как расширение
  игры с именем `node_<resource>_<path>` (не буквенно-цифровые символы становятся `_`):
  `onUpdate(dt)`, `onPreRender`, `onVehicleSpawned` и другие хуки игры доставляются ему.
  `onExtensionLoaded` и `onInit` выполняются один раз при регистрации, `onExtensionUnloaded` -
  при выгрузке.
- **Ошибки.** Файлы компилируются под именем чанка `node/<resource>/<path>`, так что трассировка
  читается как `node/race/main.lua:12:`. Файл, который не компилируется, пропускается со строкой
  `Resource "race" (main.lua): compile error: ... -- file skipped`; остальной ресурс загружается.
- **Другие игроки.** Ничто не доходит до другого игрока напрямую. `node.emitServer` заканчивается
  на сервере, а функция, которая должна дойти до всех, - это серверный ресурс, который её
  пересылает, как `nodemp-relay` делает для событий `vehicle:fire` клиентского мода.
- **Провод.** API пакетов нет. Типизированный трафик (позиции, места, спавны) - дело клиентского
  мода; у клиентского файла есть события, модульный канал и два запроса к машине.
- **Время жизни.** Ничто не переживает выход с сервера. Долговечное состояние держите на сервере в
  `node.storage` или в настройках самой игры через `NodeMP.settings`.

### Файлы автомобиля

Файл, путь которого начинается с `lua/vehicle/`, имеет вид `vehicle`. Он выполняется не в игровом
движке: клиентский мод внедряет его исходник в Lua-состояние каждой машины, которой управляет
игрок, - при активации и снова при каждом спавне собственной машины игрока - и один раз выполняет
его там как обычный скрипт. Внутри состояния машины нет таблицы `node`. Есть собственные глобальные
переменные движка автомобиля (`obj`, `v`, `electrics`) и таблица `NodeMP` стороны автомобиля
([ниже](#движок-автомобиля-ve)), чей `NodeMP.events.triggerServer(name, data)` пересылает сетевое
событие через игровой движок серверу, кодируя таблицу в JSON за вас:

```lua
-- resources/race/client/lua/vehicle/ready.lua: runs once inside each vehicle you drive
NodeMP.events.triggerServer("race:vehicle", { gameId = NodeMP.vehicle.id() })
```

Приём серверных событий есть только в игровом движке: обрабатывайте ответ в файле `ge` и, если
нужно, доставайте до машины через `queueLuaCommand`. Ошибки пишутся под `node.res` как
`VE compile race/lua/vehicle/ready.lua: ...` или `VE run race/lua/vehicle/ready.lua: ...`.
Внедрённые скрипты нельзя чисто выгрузить, о чём клиент говорит при активации:
`Resource "race": 1 vehicle-side script(s) are streamed into the vehicle VM at runtime -- they
cannot be cleanly unloaded and are best shipped as content mods`. Прислушайтесь к этому для всего,
что длиннее нескольких строк.

### Обфускация

Перед упаковкой сервер прогоняет каждый файл `ge` и `vehicle` через Prometheus на уровне, который
задаёт `[client] obfuscation`: `none`, `light` (по умолчанию), `medium` или `strong`. Глобальные
имена и ключи таблиц никогда не переименовываются, так что `M.onUpdate`, хуки игры и вызовы `node`
продолжают работать; локальные имена и строковые константы не сохраняются, поэтому разрабатывайте с
`none`, пока важны номера строк в `beamng.log`, и убирайте строку перед публикацией. Уровни и
правило сервера «при ошибке - без обфускации» - на странице [Ресурсы](/ru/plugins/resources/#обфускация).

## SDK мода: NodeMP.*

Мод, поставляемый вместе с клиентом, не может рассчитывать на то, что его передаст сервер, и не
должен лезть во внутренние модули клиентского мода, которые меняются от версии к версии. Для него
клиентский мод публикует одну стабильную глобальную таблицу, `NodeMP`, в обоих Lua-состояниях -
игрового движка и каждой машины. Каждая функция находит свою цель в момент вызова, так что мод,
который выполняется до старта клиентского мода или пока никто не в сессии, получает `nil`, `false`
или пустую таблицу вместо ошибки. `NodeMP.VERSION` - версия мода, `1.3.0`. Клиентские файлы могут
вызывать ту же таблицу; [пример выше](#события-и-полезные-нагрузки) использует `NodeMP.ui.notify`.

### Пространства имён

| Пространство имён | Вызовы |
|---|---|
| `NodeMP.session` | связь с лаунчером и сессия: `isLauncherConnected`, `isConnected`, `isActive`, `isJoining`, `getServer`, `getServerName`, `getMap`, `getLauncherVersion`, `connect`, `leave` |
| `NodeMP.account` | что сервер установил по билету на подключение: `get` (`verified`, `loggedIn`, `guest`, `username`, `accountId`, `roles`), `isLoggedIn`, `getUsername`, `getRole`, `getId`. `login` и `logout` существуют для старых модов и ничего не делают: вход - дело лаунчера. |
| `NodeMP.players` | список игроков: `get`, `getByName`, `getAll`, `ids`, `count`, `max`, `getLocalId`, `getLocal`, `isLocal`, `getRoleInfo` |
| `NodeMP.vehicles` | модель мира с ключами по глобальному `vehicleId` и локальному `gameId`: `getAll`, `getOwn`, `isOwn`, `getServerId`, `getGameId`, `getByServerId`, `getByGameId`, `getNicknameMap`, `getOwner`, `getDriver`, `getSyncOwner`, `count`, `forEach`, `isSynced` |
| `NodeMP.chat` | `send` (сетевое событие `chat:send` ресурсу `chat`), `add`, `system`, `clear`, `toggle`, `getHistory` |
| `NodeMP.events` | `on`, `once`, `off`, `triggerServer`, `triggerLocal` и имена событий жизненного цикла в `NAMES` |
| `NodeMP.keys` | `onPressed`, `onReleased`, `getState` - пробрасываются в Lua-состояние каждой машины |
| `NodeMP.ui` | `notify`, `dialog`, `bringToFront`, `refreshPlayerList` |
| `NodeMP.network` | `isConnected`. События шлите через `NodeMP.events.triggerServer`, а не через это пространство имён. |
| `NodeMP.settings` | `get`, `set` - хранилище настроек игры, где мод держит свои параметры |
| `NodeMP.config` | `getNickname`, `setNickname`, `getFavorites`, `get`, `set` - `config.json` мода |
| `NodeMP.debug` | `getNetworkStats`, `focusOnPlayer` |
| `NodeMP.util` | `translate`, `b64encode`, `b64decode`, `hex2rgb`, `jsonEncode`, `jsonDecode` |
| `NodeMP.modules` | клиентский фреймворк модулей: `register`, `list`, `isEnabled`, `getConfig`, `setLocalPref`, `onChanged`, `requestManifest` |
| `NodeMP.dimensions` | клиентский взгляд на параллельные миры: `isActive`, `get`, `refresh`, `set` (шлёт `/dim n` через чат, так что сервер остаётся главным), `onChanged` |

Исходные плоские помощники - `NodeMP.isInSession`, `NodeMP.getCurrentServer`, `NodeMP.getAccount`,
`NodeMP.isLoggedIn`, `NodeMP.getLocalPlayerID`, `NodeMP.translate` и остальные - остаются
псевдонимами вызовов из пространств имён. `NodeMP.internal` - собственное дерево модулей мода; его
имена могут меняться от версии к версии.

### События

`NodeMP.events` едет по тому же каналу событий, что и таблица `node`: сетевое событие, которое шлёт
сервер, доходит и до обработчика `node.on` ресурса, и до обработчика `NodeMP.events.on` мода, а
`triggerServer` мода приходит к серверной половине как обычное событие
`node.on(name, fn(player, data))`. Два отличия: `triggerServer` кодирует в JSON всё, что вы
передаёте, - строка приходит в кавычках, так что на сервере всегда вызывайте `node.json.decode`, -
а обработчик `on` получает нагрузку раскодированной - таблицу, когда текст разбирается как JSON,
иначе сырую строку.

```lua
NodeMP.events.on("race:start", function(start) print(start.track) end)   -- decoded for you
local id = NodeMP.events.once("race:finish", function(result) print(result.place) end)
NodeMP.events.triggerServer("race:ready", { car = "etk800" })              -- a table is JSON-encoded
NodeMP.events.triggerLocal("race:hud", { show = true })                    -- this machine only
NodeMP.events.off("race:start")                                             -- your handler for the name
```

`on(name, fn, id?)` держит один обработчик на `id` (по умолчанию - вызывающий файл) и заменяет его
при повторной регистрации; `once` возвращает сгенерированный id; `off(name, id?)` убирает этот
обработчик. `triggerLocal` доходит только до обработчиков `NodeMP.events.on`; `node.emitLocal`
ресурса доходит и до них, потому что мод подписывается на каждое имя через `node.on`.

Клиентский мод поднимает для модов собственные события жизненного цикла, перечисленные в
`NodeMP.events.NAMES`: `onNodeMPPlayerJoined` (таблица игрока), `onNodeMPPlayerLeft` (`{ id, name }`),
`onNodeMPPlayerRoleChanged` (`{ id, role }`), `onNodeMPVehicleSpawned` (таблица машины),
`onNodeMPVehicleDeleted` (`{ vehicleId }`), `onNodeMPVehicleSyncOwnerChanged`
(`{ vehicleId, syncOwnerId }`), `onNodeMPSynced` (без данных, после начальной синхронизации мира),
`ChatMessageSent` (текст) и `ChatMessageReceived` (текст, имя пользователя). Подписывайтесь на них
через `NodeMP.events.on`; они локальные и никогда не уходят в сеть.

### Движок автомобиля (VE)

`NodeMP` стороны автомобиля - подмножество на каждую машину, сделанное для кода, который выполняется
внутри Lua-состояния машины, - скрипта автомобиля из контент-мода или переданного файла `vehicle`:

| Вызов | Что делает |
|---|---|
| `NodeMP.vehicle.type()` | `"L"`, когда машину синхронизирует этот клиент, `"R"`, когда другой, `nil`, пока она не помечена; `isLocal()` и `isRemote()` - булевы формы, `id()` - идентификатор игрового объекта |
| `NodeMP.events.triggerServer(name, data)` | Пересылает сетевое событие серверу через игровой движок; нагрузка кодируется в JSON. Обработчики серверных событий живут только в игровом движке. |
| `NodeMP.keys.onPressed(key, fn)`, `onReleased`, `getState` | Мост клавиш, такой же, как в игровом движке |
| `NodeMP.electrics.get(name)`, `set(name, value)`, `exclude(name)` | Прочитать или записать значение electrics; `exclude` не пускает ключ в сетевую синхронизацию ради локальной анимации |
| `NodeMP.controllers.register(types)`, `send(data)` | Зарегистрировать модовые типы контроллеров для синхронизации из хука `loadControllerSyncFunctions`; переслать состояние контроллера вручную |
| `NodeMP.velocity.add(x, y, z)`, `set(x, y, z)` | Физические поправки, в основном для удалённых копий |
| `NodeMP.callGE(moduleKey, call)` | Поставить в очередь вызов в модуль мода в игровом движке |

`NodeMP.vehicleType`, `NodeMP.isRemote`, `NodeMP.isLocal` и `NodeMP.triggerServer` - плоские
псевдонимы. Большинство пишущих помощников имеют смысл только на локальной машине: сначала
проверяйте `NodeMP.vehicle.isLocal()`.

## Какую поверхность выбрать

| | Клиентские файлы ресурса | SDK мода `NodeMP.*` |
|---|---|---|
| Поставляется как | часть ресурса, передаётся при каждом подключении | zip в `content/` или мод, установленный игроком |
| Живёт | пока игрок на вашем сервере | пока мод установлен, на любом сервере |
| Связь с сервером | `node.emitServer` / `node.on(name, fn(data))` | `NodeMP.events.triggerServer` / `NodeMP.events.on` |
| Нагрузки | строки; JSON кодируете и раскодируете сами | всё кодируется в JSON при отправке (строка приходит в кавычках) и раскодируется при получении |
| Лучше всего для | правил, текста HUD и настроек машин, которые принадлежат одному серверу и меняются вместе с ним | интерфейса, привязок клавиш и логики машин, которые игрок носит между серверами; чтения списка игроков и сессии |

Пишите клиентскую половину ресурса, когда поведение принадлежит серверу: она не требует установки,
обновляется, когда хостер перезапускает сервер, и исчезает, когда игрок выходит. Пишите мод, когда
он должен быть у игроков везде, - и пусть он читает `NodeMP.session` и `NodeMP.players`, а не
гадает. Оба говорят с одной и той же серверной половиной, и серверный ресурс не может отличить, кто
из них прислал событие.

## Дальше

- [События](/ru/plugins/events/) - серверный конец сетевого события и как переслать его другим игрокам.
- [Ресурсы](/ru/plugins/resources/) - `resource.toml`, `[client] files`, уровни обфускации, лимиты доставки.
- [Рецепты](/ru/plugins/recipes/) - среди прочего телепорт с клиентской половиной.
- [Сетевой протокол](/ru/plugins/protocol/) - кадры `Event` и `Module` под всем этим.
