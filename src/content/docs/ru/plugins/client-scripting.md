---
title: Клиентские скрипты
description: Как файлы клиентской части плагина попадают в игру, файлы игрового движка и расширения, обмен с сервером, файлы внутри машины, настройки и строгие сессии на время игры.
---

Всё, что лежит в папке `client/` плагина, передаётся каждому игроку при входе и выполняется в его BeamNG.drive. Игроку ничего не нужно ставить, а когда он уходит с сервера, скрипты исчезают.

## Как файлы попадают в игру

- Сервер упаковывает клиентские файлы один раз, при запуске: все `.lua` из `client/` или те, что перечислены в `[client] files`. Он проверяет их синтаксис и обфусцирует ([Плагины](/ru/hosting/resources/#обфускация-клиентских-скриптов)). Ошибка синтаксиса попадает в лог сервера, но файл всё равно уходит игрокам.
- Игроку файлы отправляются сразу после названия карты, так что выполняются, пока карта ещё грузится.
- Файл, который после упаковки больше 900 КБ, сервер пропускает с предупреждением в лог. Мод принимает от одного плагина не больше 512 файлов и 8 МБ, а плагин, который не уложился, отбрасывает целиком.
- Имя плагина начинается с латинской буквы или цифры и состоит из латинских букв, цифр, точки, подчёркивания и дефиса, не длиннее 128 знаков. Плагин с другим именем мод отклоняет. В путях файлов можно то же самое и косую черту, файл с другим путём мод пропускает.
- В игре файлы компилируются в памяти, загрузчик ничего не пишет на диск игрока.

Ошибки на стороне игрока попадают в его собственный `beamng.log`, а не на сервер. Пока вы разрабатываете, ставьте `[client] obfuscation = "none"`, чтобы строки в этом логе оставались читаемыми.

## Файлы игрового движка

Каждый клиентский файл вне `lua/vehicle/` выполняется в игровом движке, где доступен Lua-API самой игры. Каждый файл — модуль: он выполняется один раз, а то, что он возвращает, получают другие файлы плагина через `require`. `require("ui")` загружает `client/ui.lua`.

Файл, который возвращает таблицу с функциями `on…`, становится расширением игры: игра вызывает эти функции, как у любого расширения, в том числе `onUpdate(dt)` каждый кадр.

<!-- doctest: client -->
```lua
local M = {}

local shown = 0

local function showRace(data)
    local race = jsonDecode(data)
    ui_message("Race: " .. race.laps .. " laps", 5, "race")
    shown = 0
end

node.on("race:start", showRace)

function M.onUpdate(dt)
    shown = shown + dt
end

return M
```

## Расширения и скрипт мода

Файл из `client/lua/ge/extensions/` становится расширением под тем именем, которое игра даёт этому пути: `client/lua/ge/extensions/race/hud.lua` называется `race_hud`. Как после `extensions.load`, оно становится глобальной переменной с этим именем, расширения из его `M.dependencies` загружаются раньше него, а его функции `on…` получают события игры.

<!-- doctest: client -->
```lua
-- client/lua/ge/extensions/race/hud.lua
local M = {}

M.dependencies = { "race_core" }

function M.onExtensionLoaded()
    ui_message("Laps: " .. race_core.laps(), 5, "race")
end

return M
```

### Какие файлы выполняются

Без скрипта мода выполняются все файлы в том порядке, в каком приходят: по алфавиту путей, причём файлы прямо в `lua/ge/extensions/` идут первыми, или в порядке `[client] files`. Зависимости расширения всё равно выполняются раньше него.

### Скрипт мода

Чтобы самому решать, что загружается, как это делает `modScript.lua` мода, положите его в `client/scripts/<имя>/modScript.lua` или в `client/modScript.lua`. Тогда скрипт мода выполняется первым, и выполняется только то, что он загрузит:

<!-- doctest: client -->
```lua
-- client/scripts/race/modScript.lua
setExtensionUnloadMode("race_core", "manual")
setExtensionUnloadMode("race_hud", "manual")
loadManualUnloadExtensions()
```

`load`, `extensions.load`, `setExtensionUnloadMode` вместе с `loadManualUnloadExtensions` и `registerCoreModule` загружают собственное расширение плагина с этим именем. Расширения, помеченные `"manual"`, загружаются в том порядке, в каком их пометили (здесь сначала `race_core`, потом `race_hud`), и загрузятся, даже если скрипт забыл вызвать `loadManualUnloadExtensions()`. Если скриптов мода несколько, они выполняются по порядку путей.

### Моды из папки content

Имя, которого в плагине нет, относится к игре: например, это расширение из мода в папке `content/` сервера. Такому моду не нужна своя папка `scripts/`. Плагин загружает его расширение, когда приходит, и, если до этого оно не было загружено, выгружает, когда игрок уходит.

<!-- doctest: client -->
```lua
-- client/modScript.lua
load("race_core")      -- the plugin's: client/lua/ge/extensions/race/core.lua
load("bigmap_sounds")  -- the game's: an extension of a mod in content/
```

## Обмен с сервером

У клиентского файла своя таблица `node`, меньше серверной:

| Вызов | Что делает |
|---|---|
| `node.on(name, fn)` | Вызывает `fn(data)` на сетевое событие от сервера. `data` приходит строкой. |
| `node.off(name)` | Отписывает. |
| `node.emitServer(name, data)` | Отправляет сетевое событие серверу. `data` должна быть строкой. |
| `node.log(text)` | Пишет в `beamng.log` игры. |

На клиенте у плагина один обработчик на имя события: следующий `node.on` с тем же именем заменяет предыдущий, даже из другого файла плагина.

Серверная сторона того же разговора:

<!-- doctest: server+client {"emit": [["race:ready", "{\"car\": \"pickup\"}"]]} -->
```lua
local function startRace(player, data)
    local ready = node.json.decode(data)
    node.log("%s is ready in a %s", player.name, ready.car)
    player:send("race:start", { laps = 3 })
end

node.on("race:ready", startRace)

-- expect: Alice is ready in a pickup
-- expect-client: Alice race:start .*"laps":3
```

`player:send` и `node.broadcast` превращают таблицу в JSON; на клиенте её разбирает игровая функция `jsonDecode`, а перед `node.emitServer` таблицу кодирует `jsonEncode`. То, что отправил клиент, получает только сервер: чтобы это увидели другие игроки, их передаёт серверная часть.

Обработчики `node.on` из файлов плагина снимаются, когда игрок уходит с сервера. `NodeMP.events.on` и `NodeMP.events.triggerServer` из клиентского мода сами разбирают и кодируют JSON. Они рассчитаны на обычные моды игры и остаются подписанными после сессии.

## Файлы, которые выполняются в машине

Файл из `client/lua/vehicle/` не выполняется в игровом движке. Клиентский мод вставляет его в Lua каждой машины, которой управляет игрок (когда плагин приходит и снова каждый раз, когда игрок спавнит машину), и выполняет там один раз.

Внутри машины таблицы `node` нет. Вместо неё есть API клиентского мода для машины:

| Вызов | Что делает |
|---|---|
| `NodeMP.isLocal()` | `true`, если машину считает игра этого игрока. |
| `NodeMP.vehicle.id()` | Id машины в этой игре. |
| `NodeMP.electrics.get(name)` | Значение электрики: `"rpm"`, `"lights"`, `"gear"` … |
| `NodeMP.keys.onPressed(key, fn)` | Вызывает `fn`, когда нажата клавиша. |
| `NodeMP.triggerServer(name, data)` | Отправляет сетевое событие серверу; таблица уходит как JSON. |

<!-- doctest: client -->
```lua
-- client/lua/vehicle/ready.lua
if NodeMP.isLocal() then
    NodeMP.triggerServer("race:car", { id = NodeMP.vehicle.id() })
end
```

Машина может отправлять, но не получать: события сервера приходят в игровой движок. Скрипты, вставленные в машину, нельзя аккуратно убрать, и клиентский мод предупреждает об этом в логе, когда плагин приходит. Держите их короткими, а всё, что больше, поставляйте модом в `content/`.

## Настройки на время сессии

Когда игрок заходит, его клиентский мод спрашивает `modules:request`, и плагин может ответить `modules:manifest`. Через модуль `settings` сервер фиксирует часть настроек игрока на время сессии: в настройках они помечены *Задано сервером*, а после выхода возвращаются к значениям игрока.

<!-- doctest: server+client {"emit": [["modules:request", ""]]} -->
```lua
local function answerModulesRequest(player)
    player:send("modules:manifest", { modules = {
        nametags = { enabled = true, config = { maxDistance = 40 } },
        settings = { config = { ["nodemp.chat.visibleLines"] = 4 } },
    } })
end

node.on("modules:request", answerModulesRequest)

-- expect-client: Alice modules:manifest .*maxDistance
```

Через `settings` сервер может зафиксировать `nodemp.nametags.keepVisible`, `nodemp.nametags.maxLength`, `nodemp.chat.visibleLines`, `nodemp.chat.fadeSeconds`, `nodemp.chat.timestamps`, `nodemp.hud.showPlayerIds` и четыре настройки запланированных изменений: `nodemp.schedule.applyWhen`, `nodemp.schedule.interval`, `nodemp.schedule.stopSpeed` и `nodemp.schedule.stopTime`. Модуль `nametags` принимает `style`, `maxDistance`, `fadeStart`, `fadeDistance`, `showDistance`, `hideOwn`, `showEmpty` и `hideBehindObjects`.

## Строгие сессии

`player:send("session:config", { strict = true })` переводит игрока в строгую сессию: без свободной камеры, без пересадки в машины, куда его не посадил сервер, без консоли и редактора, с выключенными локальными модами. Паузу и замедление времени мод отменяет, захват узлов разрешает только пешком и от первого лица, а ресеты, возвраты, телепорты и подмену файлов игры в папке пользователя сообщает серверу. `{ strict = false }` снимает сессию. Сообщение `session:config` без ключа `strict` ничего не меняет, а таблица, которая пришла до начала сессии, применяется в её начале.

Вместо `true` можно передать таблицу с подробностями:

| Ключ | Что значит | По умолчанию |
|---|---|---|
| `actions` | Какие действия ввода выключить, списком имён. Пустой список не выключает ничего. | Набор мода |
| `photoMode` | Кому можно режим фото: `"admins"`, `"all"` или `"none"`. | `"admins"` |
| `canPhoto` | Можно ли режим фото этому игроку; учитывается при `"admins"`. | `false` |
| `nodeGrab` | `"walking"` разрешает захват узлов только пешком, `"off"` не разрешает нигде. | `"walking"` |
| `heartbeatMs` | Как часто мод отчитывается серверу, от 500 до 60000 мс. | `2000` |

В строгой сессии мод шлёт серверу сетевые события: `rp:strict.heartbeat` с полями `seq`, `filtersHash`, `filtersCount`, `camera`, `vehicleId`, `walking`, `timeScale` и `checksum` каждые `heartbeatMs` и `rp:strict.violation` с полями `kind` и `details` на каждое замеченное нарушение. Судит по этим отчётам плагин. На серверной стороне строгой сессии в пару идёт `player:setStrict(true)`: сервер перестаёт пересылать кадры камеры игрока, нацеленные на чужую машину ([Игроки и машины](/ru/plugins/players-and-vehicles/)).

## Двоичные данные

Для потока, который в JSON стал бы слишком тяжёлым, есть нумерованные двоичные каналы. Номер канала — целое число от 0 до 4294967295, по дороге ничего не кодируется. На клиенте это `node.sendModule(channel, bytes)` и `node.onModule(channel, fn)`, на сервере `node.modules.on(channel, fn)` и `node.modules.send(player, channel, bytes)`.
