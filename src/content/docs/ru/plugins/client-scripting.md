---
title: Клиентские скрипты
description: Клиентская часть ресурса — как файлы попадают в игру, файлы игрового движка и расширения, обмен с сервером, файлы внутри машины, настройки и строгие сессии на время игры.
---

Всё, что лежит в папке `client/` ресурса, уходит каждому игроку при входе и выполняется в его
BeamNG.drive. Игроку ничего не нужно ставить, а когда он уходит с сервера, скрипты исчезают.

## Как файлы попадают в игру

- Сервер упаковывает клиентские файлы один раз, при запуске: все `.lua` из `client/` или те, что
  перечислены в `[client] files`. Он проверяет их синтаксис и обфусцирует
  ([Ресурсы](/ru/hosting/resources/#обфускация-клиентских-скриптов)).
- Игроку они уходят сразу после названия карты, так что выполняются, пока карта ещё грузится.
- Один файл — до 900 КБ, весь ресурс — до 8 МБ и 512 файлов.
- В игре файлы компилируются в памяти. На диск игрока ничего не пишется, и заменить файл игры или
  клиентского мода нельзя.

Ошибки игрока попадают в его собственный `beamng.log`, а не на сервер. Пока вы разрабатываете,
ставьте `[client] obfuscation = "none"`, чтобы строки в этом логе оставались читаемыми.

## Файлы игрового движка

Каждый клиентский файл вне `lua/vehicle/` выполняется в игровом движке, где доступен Lua-API самой
игры. Каждый файл — модуль: он выполняется один раз, а то, что он возвращает, получают другие файлы
ресурса через `require`. `require("ui")` загружает `client/ui.lua`.

Файл, который возвращает таблицу с функциями `on…`, становится расширением игры: игра вызывает эти
функции, как у любого расширения, в том числе `onUpdate(dt)` каждый кадр.

<!-- doctest: client -->
```lua
local M = {}

local shown = 0

node.on("race:start", function(data)
    local race = jsonDecode(data)
    ui_message("Race: " .. race.laps .. " laps", 5, "race")
    shown = 0
end)

function M.onUpdate(dt)
    shown = shown + dt
end

return M
```

## Расширения и скрипт мода

Начиная с клиентского мода 1.7.6 клиентские файлы ресурса загружаются так же, как файлы мода.

Файл из `client/lua/ge/extensions/` — это расширение под тем именем, которое игра даёт этому пути:
`client/lua/ge/extensions/race/hud.lua` — это `race_hud`. Как после `extensions.load`, оно становится
глобальной переменной с этим именем, расширения из его `M.dependencies` загружаются раньше него, а
его функции `on…` получают события игры.

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

Без скрипта мода выполняются все файлы в том порядке, в каком приходят: по алфавиту путей, причём
файлы прямо в `lua/ge/extensions/` идут первыми, или в порядке `[client] files`. Зависимости расширения всё
равно выполняются раньше него.

### Скрипт мода

Чтобы самому решать, что загружается, как это делает `modScript.lua` мода, положите его в
`client/scripts/<имя>/modScript.lua` или в `client/modScript.lua`. Тогда скрипт мода выполняется
первым, и выполняется только то, что он загрузит:

<!-- doctest: client -->
```lua
-- client/scripts/race/modScript.lua
setExtensionUnloadMode("race_core", "manual")
setExtensionUnloadMode("race_hud", "manual")
loadManualUnloadExtensions()
```

`load`, `extensions.load`, `setExtensionUnloadMode` вместе с `loadManualUnloadExtensions` и
`registerCoreModule` загружают собственное расширение ресурса с этим именем. Расширения, помеченные
`"manual"`, загружаются в том порядке, в каком их пометили, — здесь сначала `race_core`, потом
`race_hud`, — и загрузятся, даже если скрипт забыл вызвать `loadManualUnloadExtensions()`. Если
скриптов мода несколько, они выполняются по порядку путей.

### Моды из папки content

Имя, которого в ресурсе нет, относится к игре: например, это расширение из мода в папке `content/`
сервера. Такому моду не нужна своя папка `scripts/`. Ресурс загружает его расширение, когда
приходит, и, если до этого оно не было загружено, выгружает, когда игрок уходит.

<!-- doctest: client -->
```lua
-- client/modScript.lua
load("race_core")       -- in the resource: client/lua/ge/extensions/race/core.lua
load("bigmap_sounds")   -- not in the resource: the game's, from a zip in content/
```

## Обмен с сервером

У клиентского файла своя таблица `node`, меньше серверной:

| Вызов | Что делает |
|---|---|
| `node.on(name, fn)` | Вызывает `fn(data)` на сетевое событие от сервера. `data` — строка. |
| `node.off(name)` | Отписывает. |
| `node.emitServer(name, data)` | Отправляет сетевое событие серверу. `data` должна быть строкой. |
| `node.log(text)` | Пишет в `beamng.log` игры. |

Серверная сторона того же разговора:

<!-- doctest: server+client {"emit": [["race:ready", "{\"car\": \"pickup\"}"]]} -->
```lua
node.on("race:ready", function(player, data)
    local ready = node.json.decode(data)
    node.log("%s is ready in a %s", player.name, ready.car)
    player:send("race:start", { laps = 3 })
end)

-- expect: Alice is ready in a pickup
-- expect-client: Alice race:start .*"laps":3
```

`player:send` и `node.broadcast` превращают таблицу в JSON; на клиенте её разбирает игровая функция
`jsonDecode`, а перед `node.emitServer` кодирует `jsonEncode`. То, что отправил клиент, получает
только сервер: чтобы это увидели другие игроки, их передаёт серверная часть.

Обработчики, подписанные через `node.on` в файле ресурса, снимаются, когда игрок уходит с сервера. В
клиентском моде есть ещё `NodeMP.events.on` и `NodeMP.events.triggerServer`, которые сами кодируют и
разбирают JSON; они рассчитаны на обычные моды игры и остаются подписанными после сессии.

## Файлы, которые выполняются в машине

Файл из `client/lua/vehicle/` не выполняется в игровом движке. Клиентский мод вставляет его в Lua
каждой машины, которой управляет игрок, — когда ресурс приходит и снова каждый раз, когда игрок
спавнит машину, — и выполняет там один раз.

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

Машина может отправлять, но не получать: события сервера приходят в игровой движок. Скрипты,
вставленные в машину, нельзя аккуратно убрать, и клиентский мод предупреждает об этом, когда ресурс
приходит. Держите их короткими; всё, что больше, лучше поставлять модом в `content/`.

## Настройки на время сессии

Когда игрок заходит, его клиентский мод спрашивает `modules:request`, и ресурс может ответить
`modules:manifest`. Через модуль `settings` сервер фиксирует часть настроек игрока на время сессии:
они видны как **Задано сервером**, а после выхода возвращаются к значениям игрока.

<!-- doctest: server+client {"emit": [["modules:request", ""]]} -->
```lua
node.on("modules:request", function(player)
    player:send("modules:manifest", { modules = {
        nametags = { enabled = true, config = { maxDistance = 40 } },
        settings = { config = { ["nodemp.chat.visibleLines"] = 4 } },
    } })
end)

-- expect-client: Alice modules:manifest .*maxDistance
```

Через `settings` сервер может зафиксировать `nodemp.nametags.keepVisible`, `nodemp.nametags.maxLength`,
`nodemp.chat.visibleLines`, `nodemp.chat.fadeSeconds`, `nodemp.chat.timestamps` и
`nodemp.hud.showPlayerIds`. Модуль `nametags` принимает `style`, `maxDistance`, `fadeStart`,
`fadeDistance`, `showDistance`, `hideOwn`, `showEmpty` и `hideBehindObjects`.

## Строгие сессии

`player:send("session:config", { strict = true })` переводит игрока в строгую сессию: без свободной
камеры, без пересадки в машины, куда его не посадил сервер, без консоли и редактора, с выключенными
локальными модами. `{ strict = false }` снимает её. Таблица вместо `true` задаёт подробности,
например кому можно режим фото. В строгой сессии клиентский мод регулярно отчитывается серверу и
сообщает о каждом замеченном нарушении, а судит по этим отчётам ресурс. На серверной стороне ей в
пару идёт `player:setStrict(true)` ([Игроки и машины](/ru/plugins/players-and-vehicles/)).

## Двоичные данные

Для потока, который в JSON стал бы слишком тяжёлым, есть нумерованные двоичные каналы:
`node.sendModule(channel, bytes)` и `node.onModule(channel, fn)` на клиенте, `node.modules.on(channel,
fn)` и `node.modules.send(player, channel, bytes)` на сервере. По дороге ничего не кодируется.
