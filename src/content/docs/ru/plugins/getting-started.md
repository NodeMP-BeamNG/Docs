---
title: Первый ресурс
description: Ресурс с нуля, по шагам — приветствие, команда в чате, настройки в resource.toml, клиентская часть, затем перезагрузка и чтение ошибок.
---

На этой странице мы по шагам соберём ресурс `greeter`: он здоровается с игроками, отвечает на команду `/online`, берёт текст приветствия из настроек и показывает сообщение в игре у игрока. Ничего ставить не нужно: Lua встроена в сервер.

Понадобится сервер ([Запуск сервера](/ru/hosting/quick-start/)), и лаунчер.

## 1. Папка

Ресурсы лежат в `resources/` рядом с `server.toml`. Создайте такое дерево:

```
resources/
└── greeter/
    ├── resource.toml
    └── server/
        └── main.lua
```

Имя папки - это имя ресурса, если в `resource.toml` не сказано другое. Папка `client/` появится на шаге 7.

## 2. resource.toml

```toml
name = "greeter"
version = "1.0"
```

Пока этого хватит. (Все ключи файла описаны на странице
[Устройство ресурса](/ru/plugins/resources/#resourcetoml))

## 3. Серверная часть

`server/main.lua` выполняется один раз, когда сервер загружает ресурс. Код верхнего уровня
подписывается на события, а обработчики сервер вызывает потом, когда что-то происходит.

<!-- doctest: server+client -->
```lua
node.log("greeter loaded")

node.on("playerJoined", function(player)
    node.log("%s joined", player.name)
    player:tell("Welcome, %s!", player.name)
end)

node.on("playerLeft", function(player, reason)
    node.log("%s left: %s", player.name, reason)
end)

-- expect: greeter loaded
-- expect: Alice joined
-- expect-client: Alice chat:msg .*Welcome, Alice!
-- expect: Alice left: \S
```

- `node.log` пишет в консоль сервера от имени ресурса. Дополнительные аргументы работают как в
  `string.format`.
- `node.on(имя, обработчик)` подписывает на событие. `playerJoined` передаёт объект `Player`: `name`
  и `id` — поля, `tell` и `kick` — методы.
- `player:tell` пишет в чат этому игроку. Чат встроен в сервер, так что это работает
  без других ресурсов.
- `playerLeft` получает ещё и причину, по которой сессия закончилась.

## 4. Запуск

Запустите сервер. В консоли будет ваша строка, а за ней — строка сервера о ресурсе:

```
greeter · greeter loaded
greeter v1.0 loaded — lua · server 1 file · 0 client files
```

Зайдите на сервер: в консоли появится `greeter · YourName joined`, а в чате — приветствие.

## 5. Команда в чате

Команды — это обычные строки чата, которые начинаются с `/` или иного знака. Каждая строка из чата проходит через `chatMessageRequest`, прежде чем сервер её разошлёт. Обработчик, который узнал свою команду, возвращает `{ handled = true }` что бы, строку никто не увидел. Ресурс должен будет сам разослать ответ нужным игрокам.

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/online"}]]} -->
```lua
node.on("chatMessageRequest", function(player, msg)
    if msg.text[0] ~= "/" then return end -- Это не команда, выходим из функции и сообщение рассылается сервером
    if msg.text == "/online" then 
        local names = {}
        for _, p in ipairs(node.players.all()) do
            names[#names + 1] = p.name
        end
        player:tell("Online (%d): %s", #names, table.concat(names, ", "))
        return { handled = true }
    end
    return -- Выводим в чат команду, тк нет нужных обработчиков
end)

-- expect-client: Alice chat:msg .*Online \(1\): Alice
```

На любую другую строку обработчик ничего не возвращает (`return` без значения), и она уходит в чат как обычно. Подробнее о командах — на странице [Чат и команды](/ru/plugins/chat/).

## 6. Настройки

Настройки, которые может менять хост, кладут в таблицу `[config]` файла `resource.toml`:

```toml
[config]
greeting = "Hello from the docs"
```

Ресурс читает их как `node.config`:

<!-- doctest: server+client {"config": {"greeting": "Hello from the docs"}} -->
```lua
local greeting = node.config.greeting or "Welcome"

node.on("playerJoined", function(player)
    player:tell("%s, %s!", greeting, player.name)
end)

-- expect-client: Alice chat:msg .*Hello from the docs, Alice!
```

`node.config` читается один раз, при загрузке ресурса. После правки файла перезагрузите ресурс
([ниже](#8-перезагрузка)).

## 7. Клиентская часть

Всё, что лежит в `client/`, передаётся каждому игроку при входе и выполняется в игре. Пусть сервер отправит игроку событие, когда тот зайдёт:

<!-- doctest: server+client -->
```lua
-- Server
node.on("playerJoined", function(player)
    player:send("greeter:hello", { text = "Welcome, " .. player.name })
end)

-- expect-client: Alice greeter:hello .*Welcome, Alice
```

`player:send(имя, данные)` отправляет игроку **сетевое событие**, таблица превращается в JSON.

Создайте `client/main.lua`: он поймает событие, покажет текст на экране и ответит серверу.

<!-- doctest: client -->
```lua
node.on("greeter:hello", function(data)
    local hello = jsonDecode(data)
    ui_message(hello.text, 8, "greeter")
    node.emitServer("greeter:seen", hello.text)
end)
```

На клиенте обработчик получает данные строкой, как их прислал сервер, поэтому их разбирает игровая функция `jsonDecode`. `ui_message` - функция игры для вывода сообщения на экран. 
`node.emitServer` отправляет сетевое событие обратно, тоже строкой. 

Серверная часть его ловит:

<!-- doctest: server+client {"emit": [["greeter:seen", "Welcome, Alice"]]} -->
```lua
node.on("greeter:seen", function(player, text)
    node.log("%s saw: %s", player.name, text)
end)

-- expect: Alice saw: Welcome, Alice
```

Любые события, которые не входят в базовые (Уведомления, Запросы, События сервера), это - `сетевое событие`. ([События](/ru/plugins/events/#виды-событий))

Рекомендуется называть их в формате `<ресурс>:<что>`, строчными буквами, чтобы два ресурса не столкнулись. Остальное о клиентской
стороне — на странице [Клиентские скрипты](/ru/plugins/client-scripting/).

## 8. Перезагрузка

После правки серверной части перезапускать сервер не нужно. Наберите в консоли сервера:

```
reload greeter
```

Ресурс остановится (его обработчики и таймеры снимаются) и загрузится заново из своей папки.
Клиентские файлы упаковываются при запуске сервера, так что изменения в `client/` дойдут до игроков только после перезапуска сервера.

## 9. Если что-то сломалось

Ошибка в обработчике не останавливает ни сервер, ни ресурс. Сервер пишет её в лог с файлом, строкой и трассировкой и работает дальше.

```
greeter · error in event 'playerJoined': …/server/main.lua:4: attempt to …
```

Остальные обработчики продолжают работать, а этот снова вызовется на следующем событии. Синтаксическая
ошибка в `main.lua` выглядит так же, только появляется при загрузке ресурса.

## Что дальше

- [Устройство ресурса](/ru/plugins/resources/) — все файлы и ключи, несколько Lua-файлов,
  перезагрузка.
- [События](/ru/plugins/events/) — все виды событий и порядок, в котором заходит игрок.
- [Примеры плагинов](/ru/plugins/examples/) — ресурсы побольше, на которых можно учиться.
