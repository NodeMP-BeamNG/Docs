---
title: Первый ресурс
description: Ресурс с нуля — resource.toml, серверная часть, которая приветствует игроков, клиентская, которая отвечает, — запуск, перезагрузка и где искать ошибки.
---

На этой странице мы соберём ресурс `hello`: серверная часть приветствует каждого игрока и раз в
минуту говорит, сколько людей онлайн, а клиентская раз в десять секунд отчитывается серверу.
Ставить ничего не нужно: Lua встроен в сервер.

Понадобится запущенный `Node-Server` ([Запуск сервера](/ru/hosting/quick-start/)) и, для
клиентской части, лаунчер, которым можно на него зайти. Серверную часть можно проверить и без игры
([ниже](#проверка-без-игры)). Держите [справочник Lua API](/ru/plugins/api/lua/) открытым в
соседней вкладке.

## Папка

Ресурсы лежат в `resources/` в рабочей папке сервера, рядом с `server.toml`. Создайте такое дерево:

```
resources/
└── hello/
    ├── resource.toml
    ├── server/
    │   └── main.lua        # выполняется на сервере
    └── client/
        └── main.lua        # уходит каждому игроку
```

Имя папки — это имя ресурса, если манифест не говорит иначе.

## resource.toml

```toml
name = "hello"
version = "1.0"

[client]
obfuscation = "none"
```

Всё здесь необязательно. Без манифеста папка — Lua-ресурс с именем папки, точкой входа
`server/main.lua` и всеми `.lua` из `client/`, которые уходят игрокам. `obfuscation = "none"`
отправляет клиентский файл как есть, пока вы разрабатываете, чтобы ошибки в логе игрока оставались
читаемыми; уберите это перед публикацией. Все ключи — на странице
[Ресурсы](/ru/plugins/resources/#resourcetoml).

## Серверная часть

`server/main.lua` выполняется один раз при запуске сервера. Код на верхнем уровне подписывается на
события и запускает таймеры; сервер вызывает их, когда что-то происходит.

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

Что делает каждая строка:

- `node.log(msg, ...)` печатает в консоль под именем ресурса; лишние аргументы — аргументы
  `string.format`.
- `node.on("playerJoined", fn)` подписывается на событие движка. Обработчик получает `Player`:
  `player.id`, `player.name` и `player.ip` — поля, `player:tell` и `player:send` — методы, а
  `tostring(player)` даёт `Player#0 Alice`. В [справочнике событий](/ru/plugins/api/events/) —
  все события с аргументами.
- `player:tell(text, ...)` — системная строка в чате этого игрока; `node.chat.say` говорит её всем.
  Чат — часть сервера, так что оба работают без других ресурсов.
- `player:send(event, data)` отправляет **сетевое событие** клиентской части этого игрока; таблица
  кодируется в JSON за вас. Имена сетевых событий — `<область>:<глагол>`, строчными, с одним
  двоеточием.
- `node.on("hello:count", fn)`: имя, которое не является событием движка, — сетевое событие от
  клиентской части. Обработчик получает `(player, data)`, где `data` — строка, которую прислал
  клиент.
- `node.every(ms, fn)` вызывает `fn`, пока не сделать `node.cancel(id)`; `node.after(ms, fn)` —
  один раз.

## Клиентская часть

`client/main.lua` уходит каждому игроку при входе и выполняется внутри BeamNG, с полным доступом к
игре и клиентской таблице `node`.

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

Три отличия от серверной стороны. Клиентский обработчик `node.on(name, fn)` получает только `data` —
строку, которую прислал сервер; JSON декодируйте игровой функцией `jsonDecode`.
`node.emitServer(name, data)` отправляет сетевое событие серверу, строкой. `node.log(msg)` пишет в
лог игры, `beamng.log`. Остальной клиентский API — на странице
[Клиентские скрипты](/ru/plugins/client-scripting/).

## Запуск

Запустите сервер. Консоль подтвердит ресурс:

```
hello · hello loaded, players online: 0
hello v1.0 loaded — lua · server 1 file · 1 client file
1 resource · 1 module loaded
```

Первая строка — ваш `node.log`: точка входа выполняется, пока сервер загружает ресурс, раньше
строки о том, что он загружен. Зайдите лаунчером. Консоль покажет вход и каждые десять секунд —
счётчик клиента:

```
hello · Player#0 Alice joined from 203.0.113.5
hello · Player#0 Alice -> 1
hello · Player#0 Alice -> 2
```

Alice видит в чате `Welcome, Alice`, а раз в минуту все видят `1 player(s) online`. На ПК Alice в
`beamng.log` (в `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\`) — клиентская сторона:

```
Activated server resource "hello" (1 ge file(s), 0 vehicle file(s))
hello client script loaded
server greets Alice
```

## Перезагрузка без перезапуска

Наберите в консоли сервера `reload hello`. Обработчики, таймеры и корутины ресурса сбрасываются, и
`server/main.lua` выполняется заново; консоль пишет `hello reloaded — lua`. Две вещи, которые стоит
знать:

- Переменные Lua не сохраняются. То, что должно выжить, держите в `node.storage`: оно переживает и
  перезагрузку, и перезапуск ([Хранилище и файлы](/ru/plugins/storage/)).
- Клиентские файлы упаковываются один раз, при запуске: изменения в `client/` требуют перезапуска
  сервера.

Ресурс может перезагрузить себя или другой ресурс через `node.resources.reload(name)`. Вот это в
виде команды чата `/reload` для игроков, которым плагин выдал роль `admin`:

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/reload"}]]} -->
```lua
node.on("chatMessageRequest", function(player, msg)
    local name = msg.text:match("^/reload%s*(%S*)$")
    if not name then return end -- some other line: not ours
    if name == "" then name = "hello" end

    if player.role ~= "admin" then
        player:tell("Only admins can reload resources")
    elseif node.resources.reload(name) then
        player:tell("reloading %s", name)
    else
        player:tell("no resource named %s", name)
    end
    return { handled = true }
end)

-- expect-client: Alice chat:msg .*Only admins can reload resources
```

Своих команд у сервера нет, поэтому команда — это строка чата, которую ваш ресурс ловит в
`chatMessageRequest` и на которую отвечает `{ handled = true }`: дальше строка не идёт, а игрок
видит только ваш ответ. У Alice роли пока нет, поэтому ей отвечают, что нельзя (вся история — в
[Чате → Команды](/ru/plugins/chat/#команды)).

## Проверка без игры

Серверной стороне игрок не нужен: каждый серверный вызов работает и с одним сервером. Чтобы
проверить команду, напишите её тело обычной функцией и вызовите с подставным игроком — таблицей с
`name` и `tell`:

<!-- doctest: server -->
```lua
-- the command under test, as a plain function
local function hello(player, words)
    player:tell("Hello, %s! You said: %s", player.name, table.concat(words, " "))
end

node.on("chatMessageRequest", function(player, msg)
    local rest = msg.text:match("^/hello%s*(.*)$")
    if not rest then return end
    local words = {}
    for word in rest:gmatch("%S+") do words[#words + 1] = word end
    hello(player, words)
    return { handled = true }
end)

-- the test bench: a stand-in player whose tell writes to the console
local tester = { name = "Tester" }
function tester:tell(text, ...)
    node.log("to %s: %s", self.name, string.format(text, ...))
end

node.after(500, function() hello(tester, { "big", "world" }) end)

-- expect: to Tester: Hello, Tester! You said: big world
```

Таймеры, хранилище, база данных, HTTP, перезагрузка, `serverShutdown` и `resourceUnload` по Ctrl+C
работают одинаково с игроками и без. Клиент нужен только сетевым событиям — их отправляет только
клиентский мод, — а клиентские файлы вне игры не запускаются вовсе.

## Где видны ошибки

Ошибки серверной стороны попадают в консоль и в `logs/server.log` — с именем ресурса, тем, что
выполнялось, и сообщением Lua, в котором есть файл и строка:

```
hello · error in event 'hello:count': .../resources/hello/server/main.lua:16: attempt to concatenate a nil value
```

Ошибка во время загрузки `main.lua` выводится так же; ресурс всё равно считается загруженным — с
тем, на что успел подписаться до упавшей строки, — так что исправьте и сделайте `reload hello`.
Ошибка внутри обработчика никогда не выгружает ресурс. Обработчик, который держит рабочий поток
дольше 250 мс, попадает в лог с именем ресурса и видом обработчика:
`plugin worker job stalled the thread for 300 ms (resource hello, event 'hello:count') — move heavy work to node.await/node.job`.
Как этого избежать, рассказано в разделе [Таймеры и корутины](/ru/plugins/concurrency/).

Ошибки клиентской стороны — в `beamng.log` игрока. Файл, который не компилируется, пропускается
(`Resource "hello" (main.lua): compile error: ... -- file skipped`), а ошибка в обработчике выглядит
так: `Error in event handler for "hello:greet" from source "node.res/hello": ...`. Сервер проверяет
синтаксис клиентских файлов при упаковке и сообщает о сломанном при запуске:
`hello · client file 'main.lua' has a syntax error: main.lua:1: unexpected symbol near '=' (the file ships anyway; the game's Lua will very likely refuse it too)`.

## Дальше

- [Ресурсы](/ru/plugins/resources/) — манифест, настройки, файлы, перезагрузка.
- [События](/ru/plugins/events/) — порядок входа и все виды событий.
- [Примеры плагинов](/ru/plugins/examples/): `gatekeeper-example` отклоняет запросы,
  `vehicle-cleanup` читает настройки и применяет правило по таймеру.
