---
title: Первые шаги
description: Первый ресурс - папка, resource.toml, серверный скрипт приветствует игроков, клиентский отвечает; запуск, перезагрузка и чтение ошибок.
---

На этой странице ресурс `hello` собирается с пустой папки до работающего сервера: серверная
половина приветствует каждого игрока и раз в минуту считает их, а клиентская половина каждые
десять секунд отчитывается обратно. Он повторяет `demo-numbers`, самый маленький сквозной пример,
и добавляет вызовы, которые понадобятся вам в первый же день. Кроме сервера ничего устанавливать
не нужно: Lua встроен.

Вам нужны работающий `Node-Server` 1.2.0 ([Быстрый старт](/ru/hosting/quick-start/)), открытый в
соседней вкладке [справочник Lua API](/ru/plugins/api/lua/) и, для клиентской половины, лаунчер на
машине, которая может подключиться к серверу - серверную половину можно проверить без игры
([ниже](#тестирование-без-игры)). Два вызова ниже - `player:tell` и `node.chat.say` - говорят через
пример ресурса `chat`, который рисует чат и владеет командами `/`: установите `chat` рядом с
`hello` (начиная с сервера 1.2.1 он лежит в архиве релиза в папке `examples/`; в архиве 1.2.0 его
нет) или знайте, что без него эти два вызова не делают вообще ничего - ни строки в чате, ни
строки в консоли. В консоли видно `node.log`.

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

<!-- doctest: server+client {"emit": [["hello:count", "1"]]} -->
```lua
node.log("hello loaded, players online: %d", node.players.count())

-- an engine event: the handler receives a Player object
node.on("playerJoined", function(player)
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

-- expect: hello loaded, players online: 0
-- expect: Player#\d+ Alice joined from \S+
-- expect: Player#\d+ Alice -> 1
-- expect: Player#\d+ Alice left
```

На что опирается каждая строка:

- `node.log(msg, ...)` печатает под именем ресурса; дополнительные аргументы - это аргументы
  `string.format`.
- `node.on("playerJoined", fn)` подписывается на событие движка. Обработчик получает `Player`:
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

<!-- doctest: client -->
```lua
local M = {}

local n = 0   -- the number we send
local acc = 0 -- seconds since the last send

node.log("hello client script loaded")

-- sent by server/main.lua on playerJoined; data is the JSON text of the table it sent
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

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/reload"}]]} -->
```lua
node.commands.add("reload", function(player, args)
    local name = args[1] or "hello"
    if node.resources.reload(name) then
        player:tell("reloading %s", name)
    else
        player:tell("no resource named %s", name)
    end
end, { role = "admin" })

-- expect-client: Alice chat:msg .*You are not allowed to use /reload
```

`role` ограничивает команду игроками, чью роль на сессию другой обработчик назначил через
`player:setRole("admin")`; без этого `/reload` мог бы набрать кто угодно. Консоль подтверждает
строкой `hello reloaded — lua`. Два ограничения: состояние Lua теряется (то, что должно выжить,
держите в `node.storage`, которое сохраняется между перезагрузками и перезапусками), а клиентская
половина упаковывается один раз при запуске, поэтому изменение в `client/` требует перезапуска
сервера. Без `chat` перезапускайте сервер - или дайте ресурсу один раз перезагрузить себя из
таймера, с флагом в `node.storage`, чтобы новый экземпляр этого не повторял; заодно это прогоняет
`resourceUnload("reload")` ([Ресурсы → Перезагрузка](/ru/plugins/resources/#перезагрузка)).

## Тестирование без игры

У сервера нет консольного ввода, и ничему на нём не нужен игрок: каждый серверный вызов работает
на одном сервере, а команду чата можно прогнать через контракт шины, на котором говорит `chat`
([События → node.bus](/ru/plugins/events/#между-ресурсами-nodebus)). Второй ресурс - или несколько
строк в конце вашего собственного - публикует строку, которую набрал бы игрок, как `chat:command`
и смотрит ответ как `chat:say`:

<!-- doctest: server -->
```lua
-- the command under test
node.commands.add("hello", function(player, args, raw)
    player:tell("Hello, %s! You typed: %s", tostring(player.name), raw)
end)

-- the test bench: watch what commands answer on the bus ...
node.bus.on("chat:say", function(source, data)
    local reply = node.json.decode(data)
    node.log("%s says to pid %s: %s", source, tostring(reply.pid), reply.text)
end)

-- ... and, half a second in, pretend that player 0 typed "/hello world"
node.after(500, function()
    node.bus.emit("chat:command", { pid = 0, name = "hello", args = { "world" }, raw = "/hello world" })
end)

-- expect: \S+ says to pid 0: Hello, nil! You typed: /hello world
```

`name` должно быть в нижнем регистре - `chat` приводит набранное игроком к нижнему регистру
перед публикацией, а прелюдия ищет обработчик по точной строке. Игрока 0 здесь нет, поэтому
`player.name` равно `nil`, а ответ никому не доставить; проверяется строка на шине. Всё остальное -
таймеры, `node.storage`, `node.pg`, `node.http`, перезагрузка, `serverShutdown` и `resourceUnload`
по Ctrl+C - работает одинаково с игроками и без; единственное, чему нужен клиент, - обработчик
сетевого события, потому что отправить его может только клиентский мод. Клиентскую половину вне
игры не запустить вовсе: сервер упаковывает файлы и не выполняет их (начиная с сервера 1.2.1 он
проверяет их синтаксис), и первое место, где видна ошибка времени выполнения, - `beamng.log`
игрока.

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
`plugin worker job stalled the thread for 300 ms (move heavy work to node.await/node.job)`. На
сервере 1.2.0 этот сторожевой таймер измеряет задания, которые выполняет рабочий поток -
обработчики событий, шины и запросов, колбэки HTTP, задач и `node.pg`, - но не колбэки таймеров и
не отрезки корутины `node.async`, которые обслуживаются между заданиями, и строка не называет
ресурс. Начиная с сервера 1.2.1 каждый обработчик, колбэк таймера, отрезок корутины и колбэк
завершения измеряется отдельно, а строка называет ресурс и то, что зависло
(`… (resource hello, timer) …`); см. [Конкурентность](/ru/plugins/concurrency/).

Клиентские ошибки - в `beamng.log` игрока: файл, который не компилируется, пропускается с
`Resource "hello" (main.lua): compile error: ... -- file skipped`, а ошибка внутри обработчика
выглядит как `Error in event handler for "hello:greet" from source "node.res/hello": ...`. Сервер
не выполняет клиентские файлы, поэтому синтаксическая ошибка в одном из них - не ошибка сервера:
сервер 1.2.0 упоминает её только при включённой обфускации, как `Warn` о том, что Prometheus не
справился с файлом и отправил его открытым; начиная с сервера 1.2.1 этап упаковки проверяет
синтаксис каждого клиентского файла и печатает строку `Error` с ресурсом, файлом и сообщением
парсера независимо от настройки обфускации (файл всё равно отправляется). Где лежит лог и как
открыть внутриигровую консоль диагностики - на странице
[Устранение неполадок](/ru/players/troubleshooting/).

## Дальше

- [Ресурсы](/ru/plugins/resources/) - манифест полностью, порядок загрузки, клиентские файлы и
  обфускация, `node.fs`, `node.storage`, `node.config`.
- [События](/ru/plugins/events/) - каждый вид событий и как отклонить запрос.
- [Конкурентность](/ru/plugins/concurrency/) - таймеры, корутины и фоновые задания.
- Примеры: `chat` - полный протокол сетевых событий, `gatekeeper-example` - отменяемые запросы,
  `vehicle-cleanup` - `node.config` и таймер политик.
