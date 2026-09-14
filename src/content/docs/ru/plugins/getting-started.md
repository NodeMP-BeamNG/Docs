---
title: Первые шаги
description: Первый ресурс - папка, resource.toml, серверный скрипт приветствует игроков, клиентский отвечает; запуск, перезагрузка и чтение ошибок.
---

На этой странице ресурс `hello` собирается с пустой папки до работающего сервера: серверная
половина приветствует каждого игрока и раз в минуту считает их, а клиентская половина каждые
десять секунд отчитывается обратно. Он повторяет `demo-numbers`, самый маленький сквозной пример,
и добавляет вызовы, которые понадобятся вам в первый же день. Кроме сервера ничего устанавливать
не нужно: Lua встроен.

Вам нужны работающий `Node-Server` 1.0.0 ([Быстрый старт](/ru/hosting/quick-start/)), лаунчер на
машине, которая может к нему подключиться, и открытый в соседней вкладке
[справочник Lua API](/ru/plugins/api/lua/). Два вызова ниже - `player:tell` и `node.chat.say` -
говорят через ресурс `chat` из примеров; скопируйте `chat` в `resources/` тоже или смотрите в
консоль сервера вместо чата.

## Папка

Ресурсы лежат в `resources/` внутри рабочего каталога сервера, рядом с `server.toml`. Создайте
такое дерево:

```
resources/
└── hello/
    ├── resource.toml
    ├── server/
    │   └── main.lua        # runs on the server
    └── client/
        └── main.lua        # streamed to every player
```

Имя папки - имя ресурса по умолчанию; манифест может его переопределить.

## resource.toml

```toml
name = "hello"
version = "1.0"

[server]
main = "server/main.lua"

[client]
files = ["main.lua"]
obfuscation = "none"
```

Всё здесь необязательно - папка без манифеста является Lua-ресурсом с именем папки, точкой входа
`server/main.lua` и всеми `.lua` из `client/`, передаваемыми игрокам. `obfuscation = "none"`
отдаёт клиентский файл открытым текстом, пока вы разрабатываете, чтобы `beamng.log` оставался
читаемым; уберите строку перед публикацией, и применится уровень `light` по умолчанию. Полная
схема - на странице [Ресурсы](/ru/plugins/resources/).

## Серверная половина

`server/main.lua` выполняется один раз при запуске сервера. Код верхнего уровня регистрирует
обработчики; сервер вызывает их по мере событий.

```lua
node.log("hello loaded, players online: %d", node.players.count())

-- an engine event: the handler receives a Player object
node.on("playerJoin", function(player)
    node.log("%s joined from %s", tostring(player), player.ip)
    player:tell("Welcome, %s", player.name)
    player:send("hello:greet", { name = player.name })
end)

node.on("playerLeft", function(player)
    node.log("%s left", tostring(player)) -- the name is still known here
end)

-- a wire event from the client half: (player, data), data as the client sent it
node.on("hello:count", function(player, data)
    node.log("%s -> %s", tostring(player), tostring(data))
end)

-- a repeating timer, on the same worker thread as every handler
node.every(60000, function()
    node.chat.say("%d player(s) online", node.players.count())
end)
```

На что опирается каждая строка:

- `node.log(msg, ...)` печатает под именем ресурса; дополнительные аргументы - это аргументы
  `string.format`.
- `node.on("playerJoin", fn)` подписывается на событие движка. Обработчик получает `Player`:
  `player.id`, `player.name`, `player.ip` - поля, `player:tell` и `player:send` - методы, а
  `tostring(player)` читается как `Player#0 Alice`. В [справочнике событий](/ru/plugins/api/events/)
  перечислено каждое имя с его аргументами.
- `player:send(event, data)` отправляет сетевое событие этому игроку; таблица кодируется в JSON за
  вас. Имя следует правилу `<domain>:<verb>` для сетевых событий: строчные буквы и одно двоеточие.
- `node.on("hello:count", fn)` - имя, которое не является событием движка, это сетевое событие от
  клиентской половины. Его обработчик получает `(player, data)`, где `data` - строка, которую
  прислал клиент.
- `node.every(ms, fn)` выполняет `fn` в рабочем потоке до `node.cancel(id)`; `node.after(ms, fn)` -
  одноразовая форма.

## Клиентская половина

`client/main.lua` передаётся каждому игроку после синхронизации контента и выполняется внутри
BeamNG с полным доступом к игре, используя клиентскую таблицу `node`.

```lua
local M = {}

local n = 0   -- the number we send
local acc = 0 -- seconds since the last send

node.log("hello client script loaded")

-- sent by server/main.lua on playerJoin; data is the JSON text of the table it sent
node.on("hello:greet", function(data)
    local greeting = jsonDecode(data)
    node.log("server greets " .. tostring(greeting.name))
end)

-- a returned table with on* functions is registered as a game extension,
-- so onUpdate(dt) ticks every frame
function M.onUpdate(dt)
    acc = acc + (dt or 0)
    if acc < 10 then return end
    acc = 0
    n = n + 1
    node.emitServer("hello:count", tostring(n))
end

return M
```

Три отличия от серверной стороны. Обработчики `node.on(name, fn)` получают только `data` - строку,
которую прислал сервер; JSON декодируйте игровой функцией `jsonDecode`. `node.emitServer(name, data)`
отправляет сетевое событие на сервер; `data` уходит строкой. `node.log(msg)` пишет в `beamng.log`
под тегом `node.events`. Остальная часть клиентской таблицы (`node.off`, `node.emitLocal`,
модульный канал, `node.requestVehicleTrigger`) описана на странице
[Клиентские скрипты](/ru/plugins/client-scripting/).

## Запуск

Запустите сервер. Две строки под тегом `Res` подтверждают ресурс, за ними идёт сводка:

```
hello · hello loaded, players online: 0
hello v1.0 loaded — lua · server 1 file · 1 client file
1 resource · 0 modules loaded
```

Первая строка - ваш вызов `node.log`: точка входа выполняется во время сканирования, до строки о
загрузке. Подключитесь через лаунчер. Консоль сервера показывает подключение и каждые десять
секунд - счётчик клиента:

```
hello · Player#0 Alice joined from 203.0.113.5
hello · Player#0 Alice -> 1
hello · Player#0 Alice -> 2
```

Если установлен `chat`, Alice видит `Welcome, Alice` как системную строку, а все видят
`1 player(s) online` раз в минуту. На машине Alice `beamng.log` (в
`%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\`) содержит клиентскую сторону под тегами `node.res` и
`node.events`:

```
Activated server resource "hello" (1 ge file(s), 0 vehicle file(s))
hello client script loaded
server greets Alice
```

## Перезагрузка без перезапуска

`node.resources.reload(name)` перезагружает ресурс: его обработчики, таймеры и корутины
сбрасываются, а серверная половина выполняется заново с `main.lua` - в рабочем потоке, после того
как текущий обработчик вернёт управление. Ресурс может перезагрузить сам себя. У сервера нет
консольного ввода, поэтому запускайте перезагрузку из Lua - обычно командой чата, для которой
нужен ресурс `chat`:

```lua
node.commands.add("reload", function(player, args)
    local name = args[1] or "hello"
    if node.resources.reload(name) then
        player:tell("reloading %s", name)
    else
        player:tell("no resource named %s", name)
    end
end, { role = "admin" })
```

`role` ограничивает команду игроками, чью роль на сессию другой обработчик назначил через
`player:setRole("admin")`; без этого `/reload` мог бы набрать кто угодно. Консоль подтверждает
строкой `hello reloaded — lua`. Два ограничения: состояние Lua теряется (то, что должно выжить,
держите в `node.storage`, которое сохраняется между перезагрузками и перезапусками), а клиентская
половина упаковывается один раз при запуске, поэтому изменение в `client/` требует перезапуска
сервера. Без `chat` перезапускайте сервер.

## Где видны ошибки

Серверные ошибки попадают в консоль и в `logs/server.log` под тегом `Error`, с именем ресурса и
местом, где произошла ошибка, и трассировкой стека:

```
hello · error in event 'hello:count': .../resources/hello/server/main.lua:16: attempt to concatenate a nil value
```

Ошибка во время выполнения `main.lua` при загрузке сообщается так же, с путём к файлу; ресурс
всё равно считается загруженным - с теми обработчиками, которые успели зарегистрироваться до
сбойной строки (при синтаксической ошибке - ни с одним). Ошибка внутри обработчика никогда не
выгружает ресурс и никогда не отклоняет отменяемый запрос. Обработчик, занимающий рабочий поток
дольше 250 мс, отмечается строкой
`plugin worker job stalled the thread for 300 ms (move heavy work to node.await/node.job)`; см.
[Конкурентность](/ru/plugins/concurrency/).

Клиентские ошибки - в `beamng.log` игрока: файл, который не компилируется, пропускается с
`Resource "hello" (main.lua): compile error: ... -- file skipped`, а ошибка внутри обработчика
выглядит как `Error in event handler for "hello:greet" from source "node.res/hello": ...`. Где
лежит лог и как открыть внутриигровую консоль диагностики - на странице
[Устранение неполадок](/ru/players/troubleshooting/).

## Дальше

- [Ресурсы](/ru/plugins/resources/) - манифест полностью, порядок загрузки, клиентские файлы и
  обфускация, `node.fs`, `node.storage`, `node.config`.
- [События](/ru/plugins/events/) - каждый вид событий и как отклонить запрос.
- [Конкурентность](/ru/plugins/concurrency/) - таймеры, корутины и фоновые задания.
- Примеры: `chat` - полный протокол сетевых событий, `gatekeeper-example` - отменяемые запросы,
  `vehicle-cleanup` - `node.config` и таймер политик.
