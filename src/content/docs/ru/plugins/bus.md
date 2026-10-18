---
title: Шина между ресурсами
description: Как ресурсы одного сервера отправляют друг другу сообщения, как их называть, как разбирать данные, как спросить и ответить и что ещё ходит по шине.
---

Ресурсы не отправляют переменные: у отдельное состояние Lua. Они общаются по **шине** — в формате канала «публикация — подписка» внутри сервера. Один ресурс публикует сообщение под именем, и его получает каждый ресурс, подписанный на это имя.

| Вызов | Что делает |
|---|---|
| `node.bus.emit(name, data)` | Публикует `data` под именем `name`. Таблица превращается в JSON. |
| `node.bus.call(name, data)` | Спрашивает все ресурсы, подписанные на `name`, и сразу возвращает их ответы. |
| `node.bus.on(name, fn)` | Вызывает `fn(source, data)` на каждое сообщение под `name`. |
| `node.bus.off(name, fn)` | Отписывает; без `fn` — все обработчики этого ресурса для `name`. |

`source` — имя ресурса, который отправил сообщение; нативный модуль виден как `"native"`. `data`
приходит строкой — разберите её через `node.json.decode`.

## Отправка и приём

Ресурс `scores` ведёт счёт:

<!-- doctest: server -->
```lua
local scores = {}

node.bus.on("score:add", function(source, data)
    local add = node.json.decode(data)
    scores[add.name] = (scores[add.name] or 0) + add.points
    node.log("%s: %s +%d = %d", source, add.name, add.points, scores[add.name])
end)

-- expect: \S+: Alice \+10 = 10
```

Любой другой ресурс начисляет очки:

<!-- doctest: server -->
```lua
node.after(500, function()
    node.bus.emit("score:add", { name = "Alice", points = 10 })
end)
```

Сообщения доставляются на рабочем потоке после того, как текущий обработчик закончит, а не посреди него, и доходят и до отправителя, если тот подписан на это имя. Называйте их `<ресурс>:<что>`, как сетевые события, чтобы два ресурса не столкнулись.

## Запрос и ответ

`node.bus.call` задаёт вопрос и сразу получает ответы. Обработчик отвечает тем, что возвращает
значение:

<!-- doctest: server -->
```lua
node.bus.on("shop:price", function(source, data)
    return { item = data, cents = 250 }
end)
```

<!-- doctest: server -->
```lua
node.after(500, function()
    for _, a in ipairs(node.bus.call("shop:price", "wrench")) do
        node.log("%s asks %d cents", a.source, a.value.cents)
    end
end)

-- expect: \S+ asks 250 cents
```

- Все обработчики выполняются сразу, до возврата из `call`, поэтому ответ — то, что другой ресурс
  знает в этот момент.
- Ответы приходят списком `{ source, value }`, в том порядке, в каком обработчики подписывались.
  Таблица приходит таблицей. Обработчик, который вернул `nil`, в список не попадает, так что пустой
  список значит, что никто не ответил.
- Обработчики самого спрашивающего ресурса тоже получают вопрос.
- Если обработчик в ответ спрашивает того, кто спросил его, и так далее, вложенность ограничена
  восемью уровнями; глубже `call` выдаёт ошибку.
- Нативный модуль, подписанный на это имя, вопрос увидит, но ответить не сможет.

`call` появился в сервере 1.9.0. Обработчик, которому нужно чего-то дождаться — базы данных или
HTTP-запроса, — не может ответить через `return`. Тогда имя для ответа кладут в сам вопрос, а
отвечают позже через `emit`:

<!-- doctest: server -->
```lua
node.bus.on("bank:ask", function(source, data)
    local ask = node.json.decode(data)
    node.bus.emit(ask.replyTo, { cents = 1500 })
end)
```

<!-- doctest: server -->
```lua
local me = node.resources.manifest().name

node.bus.on("bank:balance:" .. me, function(_, data)
    node.log("balance: %d cents", node.json.decode(data).cents)
end)

node.after(500, function()
    node.bus.emit("bank:ask", { replyTo = "bank:balance:" .. me })
end)

-- expect: balance: 1500 cents
```

Имя ответа с именем спросившего ресурса не даёт ответам перепутаться. Чтобы ждать ответа в корутине, `node.suspend` превращает колбэк в паузу; так устроен `db.lua` модуля базы данных.

## Что ещё ходит по шине

- `player:tell` и `node.chat.say` публикуют `chat:say`, а сервер показывает это в чате.
- [Модуль базы данных](/ru/plugins/database/) отвечает ресурсам по шине.
- Нативные модули тоже отправляют и получают сообщения шины ([Нативные модули](/ru/plugins/native-modules/)).
