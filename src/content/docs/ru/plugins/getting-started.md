---
title: Первый плагин
description: Плагин с нуля по шагам, от приветствия и команды в чате до настроек в resource.toml, клиентской части, перезагрузки и чтения ошибок.
---

По шагам получится плагин `greeter`, который здоровается с игроками, отвечает на команду `/online`, берёт текст приветствия из настроек и показывает сообщение в игре у игрока. Ничего ставить не нужно, Lua встроена в сервер.

Понадобится сервер ([Запуск сервера](/ru/hosting/quick-start/)) и лаунчер, чтобы зайти на него.

## 1. Папка

Плагины лежат в `resources/` рядом с `server.toml`. Создайте такое дерево:

```text
resources/
└── greeter/
    ├── resource.toml
    └── server/
        └── main.lua
```

Имя папки становится именем плагина, если в `resource.toml` не сказано другое. Папка `client/` появится на шаге 7.

## 2. resource.toml

```toml
name = "greeter"
version = "1.0"
```

Пока этого хватит. Все ключи файла описаны на странице [Устройство плагина](/ru/plugins/resources/#resourcetoml).

## 3. Серверная часть

`server/main.lua` выполняется один раз, когда сервер загружает плагин. Код верхнего уровня подписывается на события, а обработчики сервер вызывает потом, когда что-то происходит.

<!-- doctest: server+client -->
```lua
node.log("greeter loaded")

local function greet(player)
    node.log("%s joined", player.name)
    player:tell("Welcome, %s!", player.name)
end

node.on("playerJoined", greet)

local function sayGoodbye(player, reason)
    node.log("%s left: %s", player.name, reason)
end

node.on("playerLeft", sayGoodbye)

-- expect: greeter loaded
-- expect: Alice joined
-- expect-client: Alice chat:msg .*Welcome, Alice!
-- expect: Alice left: \S
```

- `node.log` пишет в консоль сервера от имени плагина. Дополнительные аргументы работают как в `string.format`.
- `node.on(имя, обработчик)` подписывает функцию на событие. `playerJoined` передаёт объект `Player`: `name` и `id` — поля, `tell` и `kick` — методы.
- `player:tell` пишет системную строку в чат этому игроку. Чат встроен в сервер, так что это работает без других плагинов.
- `playerLeft` получает ещё и причину, по которой закончилась сессия.

## 4. Запуск

Запустите сервер. В консоли будет ваша строка, а за ней строка сервера о плагине:

```text
greeter · greeter loaded
greeter v1.0 loaded — lua · server 1 file · 0 client files
```

Зайдите на сервер, и в консоли появится `greeter · <ваш ник> joined`, а в чате приветствие.

## 5. Команда в чате

Команды — это обычные строки чата, которые начинаются с `/`. Каждая строка проходит через `chatMessageRequest`, прежде чем сервер её разошлёт. Обработчик, который узнал свою команду, возвращает `{ handled = true }`: строку никто не увидит, а ответ плагин присылает сам.

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/online"}]]} -->
```lua
local function answerOnline(player, msg)
    if msg.text ~= "/online" then return end
    local names = {}
    for _, p in ipairs(node.players.all()) do
        names[#names + 1] = p.name
    end
    player:tell("Online (%d): %s", #names, table.concat(names, ", "))
    return { handled = true }
end

node.on("chatMessageRequest", answerOnline)

-- expect-client: Alice chat:msg .*Online \(1\): Alice
```

На любую другую строку обработчик ничего не возвращает (`return` без значения), и она уходит в чат как обычно. Подробнее о командах: [Чат и команды](/ru/plugins/chat/).

## 6. Настройки

Настройки, которые может менять хост, кладут в таблицу `[config]` файла `resource.toml`:

```toml
[config]
greeting = "Hello from the docs"
```

Плагин читает их как `node.config`:

<!-- doctest: server+client {"config": {"greeting": "Hello from the docs"}} -->
```lua
local greeting = node.config.greeting or "Welcome"

local function greetFromConfig(player)
    player:tell("%s, %s!", greeting, player.name)
end

node.on("playerJoined", greetFromConfig)

-- expect-client: Alice chat:msg .*Hello from the docs, Alice!
```

`node.config` читается один раз, при загрузке плагина. После правки файла перезагрузите плагин ([ниже](#8-перезагрузка)).

## 7. Клиентская часть

Файлы из `client/` выполняются в игре у каждого игрока ([Клиентские скрипты](/ru/plugins/client-scripting/)). Пусть сервер отправит игроку событие, когда тот зайдёт:

<!-- doctest: server+client -->
```lua
local function sendHello(player)
    player:send("greeter:hello", { text = "Welcome, " .. player.name })
end

node.on("playerJoined", sendHello)

-- expect-client: Alice greeter:hello .*Welcome, Alice
```

`player:send(имя, данные)` отправляет игроку сетевое событие, таблица превращается в JSON. Создайте `client/main.lua`, который поймает событие, покажет текст на экране и ответит серверу.

<!-- doctest: client -->
```lua
local function showHello(data)
    local hello = jsonDecode(data)
    ui_message(hello.text, 8, "greeter")
    node.emitServer("greeter:seen", hello.text)
end

node.on("greeter:hello", showHello)
```

На клиенте обработчик получает данные строкой, как их прислал сервер, поэтому их разбирает игровая функция `jsonDecode`. `ui_message` — функция игры, которая выводит сообщение на экран. `node.emitServer` отправляет сетевое событие обратно, тоже строкой. Серверная часть его принимает:

<!-- doctest: server+client {"emit": [["greeter:seen", "Welcome, Alice"]]} -->
```lua
local function logSeen(player, text)
    node.log("%s saw: %s", player.name, text)
end

node.on("greeter:seen", logSeen)

-- expect: Alice saw: Welcome, Alice
```

Сетевые события называйте `<плагин>:<что>`, строчными буквами ([События](/ru/plugins/events/#виды-событий)).

## 8. Перезагрузка

После правки серверной части перезапускать сервер не нужно. Наберите в консоли сервера:

```text
reload greeter
```

Плагин загрузится заново из своей папки. Изменения в `client/` дойдут до игроков только после перезапуска сервера ([Устройство плагина](/ru/plugins/resources/#перезагрузка)).

## 9. Если что-то сломалось

Ошибка в обработчике не останавливает ни сервер, ни плагин. Сервер пишет её в лог с файлом, строкой и трассировкой, а обработчик снова вызовется на следующем событии.

```text
greeter · error in builtin 'playerJoined': …/server/main.lua:4: attempt to …
```

Как такая строка выглядит для таймеров, корутин и ошибок при загрузке, описано на странице [Общие правила API](/ru/plugins/conventions/#ошибки-в-обработчиках).
