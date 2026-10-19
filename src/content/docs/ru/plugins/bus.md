---
title: Шина между плагинами
description: Как плагины одного сервера отправляют друг другу сообщения, как их называть, как разбирать данные, как спросить и ответить и что ещё передаётся по шине.
---

Переменные одного плагина другому не видны ([Устройство плагина](/ru/plugins/resources/#окружение-lua)), поэтому плагины общаются по шине, каналу «публикация — подписка» внутри сервера. Один плагин публикует сообщение под именем, и его получает каждый плагин, подписанный на это имя.

| Вызов | Что делает |
|---|---|
| `node.bus.emit(name, data)` | Публикует `data` под именем `name`. Таблица превращается в JSON. |
| `node.bus.call(name, data)` | Спрашивает все плагины, подписанные на `name`, и сразу возвращает их ответы. |
| `node.bus.on(name, fn)` | Вызывает `fn(source, data)` на каждое сообщение под `name`. |
| `node.bus.off(name, fn)` | Отписывает; без `fn` снимает все обработчики этого плагина для `name`. |

`source` — имя плагина, который отправил сообщение; нативный модуль виден как `"native"`. `data` приходит строкой, разберите её через `node.json.decode`.

## Отправка и приём

Плагин `scores` ведёт счёт:

<!-- doctest: server -->
```lua
local scores = {}

local function addScore(source, data)
    local add = node.json.decode(data)
    scores[add.name] = (scores[add.name] or 0) + add.points
    node.log("%s: %s +%d = %d", source, add.name, add.points, scores[add.name])
end

node.bus.on("score:add", addScore)

-- expect: \S+: Alice \+10 = 10
```

Любой другой плагин начисляет очки:

<!-- doctest: server -->
```lua
local function awardPoints()
    node.bus.emit("score:add", { name = "Alice", points = 10 })
end

node.after(500, awardPoints)
```

Сервер доставляет сообщение на рабочем потоке, когда текущий обработчик закончит, а не посреди него. Получает его и сам отправитель, если он подписан на это имя. Называйте сообщения `<плагин>:<что>`, как сетевые события, чтобы два плагина не столкнулись ([События](/ru/plugins/events/#виды-событий)).

## Запрос и ответ

`node.bus.call` задаёт вопрос и сразу получает ответы. Обработчик отвечает тем, что возвращает:

<!-- doctest: server -->
```lua
local function answerPrice(source, data)
    return { item = data, cents = 250 }
end

node.bus.on("shop:price", answerPrice)
```

<!-- doctest: server -->
```lua
local function askPrice()
    for _, a in ipairs(node.bus.call("shop:price", "wrench")) do
        node.log("%s asks %d cents", a.source, a.value.cents)
    end
end

node.after(500, askPrice)

-- expect: \S+ asks 250 cents
```

- Все обработчики выполняются сразу, до возврата из `call`, поэтому в ответе то, что другой плагин знает в этот момент.
- Ответы приходят списком `{ source, value }` в том порядке, в каком обработчики подписывались. Таблица приходит таблицей. Обработчик, который вернул `nil`, в список не попадает, так что пустой список значит, что никто не ответил.
- Обработчики самого спрашивающего плагина тоже получают вопрос.
- Обработчик может сам вызвать `call`, но не глубже восьми уровней: дальше `call` бросает ошибку.
- Нативный модуль, подписанный на это имя, вопрос увидит, но ответить не сможет.

Обработчик, которому нужно чего-то дождаться, например базы данных или HTTP-запроса, не может ответить через `return`. Тогда имя для ответа кладут в сам вопрос, а отвечают позже через `emit`:

<!-- doctest: server -->
```lua
local function answerBalance(source, data)
    local ask = node.json.decode(data)
    node.bus.emit(ask.replyTo, { cents = 1500 })
end

node.bus.on("bank:ask", answerBalance)
```

<!-- doctest: server -->
```lua
local me = node.resources.manifest().name

local function logBalance(_, data)
    node.log("balance: %d cents", node.json.decode(data).cents)
end

node.bus.on("bank:balance:" .. me, logBalance)

local function askBalance()
    node.bus.emit("bank:ask", { replyTo = "bank:balance:" .. me })
end

node.after(500, askBalance)

-- expect: balance: 1500 cents
```

Имя ответа с именем спросившего плагина не даёт ответам перепутаться. Чтобы ждать ответа в корутине, используйте `node.suspend`, который превращает колбэк в паузу ([Таймеры и корутины](/ru/plugins/concurrency/#корутины)). Так устроен `db.lua` модуля базы данных.

## Что ещё передаётся по шине

- `player:tell` и `node.chat.say` публикуют `chat:say`, а сервер показывает это в чате.
- [Модуль базы данных](/ru/plugins/database/) отвечает плагинам по шине.
- Нативные модули тоже отправляют и получают сообщения шины ([Нативные модули](/ru/plugins/native-modules/)).
