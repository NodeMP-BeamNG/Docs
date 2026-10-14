---
title: Между ресурсами
description: Как ресурсы разговаривают друг с другом по шине — публикация и подписка, вопрос с ожиданием ответа и разговор с нативными модулями.
---

Каждый ресурс работает в собственном состоянии Lua. Один ресурс не может прочитать переменные
другого, вызвать его функции или открыть его `node.storage`. Когда двум ресурсам нужно работать
вместе — скажем, гонке платить победителям через ресурс-кошелёк, — они разговаривают по **шине**:
один публикует сообщение с именем, и его получает каждый ресурс, подписанный на это имя.

## Публикация и подписка

<!-- doctest: server -->
```lua
-- in the race resource: tell whoever cares that a race ended
node.after(500, function()
    node.bus.emit("race:finished", { winner = 42, time = 64.9 })
end)

-- in any resource that cares (the sender gets its own messages too)
node.bus.on("race:finished", function(source, data)
    local result = node.json.decode(data)
    node.log("%s says account %d won in %.1f s", source, result.winner, result.time)
end)

-- expect: \S+ says account 42 won in 64\.9 s
```

- `node.bus.emit(name, data)` публикует. Таблица уходит как JSON, строка — как есть.
- `node.bus.on(name, fn)` подписывает. `fn(source, data)` получает имя ресурса-отправителя
  (`"native"` для нативного модуля) и `data` строкой: JSON раскодируйте сами.
- `node.bus.off(name, fn)` снимает один обработчик, а без `fn` — все обработчики этого имени.

Доставка асинхронная: `emit` возвращается сразу, а обработчики выполняются чуть позже, в том же
рабочем потоке, что и всё остальное. Отправитель получает и свои сообщения, так что ресурс легко
проверить в одиночку.

Называйте сообщения `<ресурс>:<что случилось>`, как и сетевые события: `race:finished`,
`wallet:paid`. Одно имя принадлежит серверу: `chat:say` с `{ text, pid? }` выводит строку в чат —
именно это публикуют `node.chat.say` и `player:tell`.

## Что нужно знать

- **Сообщения не хранятся.** Ресурс, который не подписан в момент доставки, сообщение не увидит.
  Не рассчитывайте, что другой ресурс загрузился раньше вашего: когда вам от него что-то нужно,
  спросите (ниже), а он пусть сообщает об изменениях по мере того, как они случаются.
- **Перезагрузка снимает подписки** перезагружаемого ресурса, как и остальные его обработчики. Его
  `main.lua` подпишется снова, пока выполняется.
- **Сообщения — маленькие и простые.** Это текст JSON. Отправляйте номера и числа, а не объекты
  целиком: `Player` превратится в таблицу с `id`, а получатель возьмёт свой объект через
  `node.players.get(id)`.

## Спросить и дождаться ответа

Ответов у шины нет, но вопрос и ответ — это просто два сообщения. Спрашивающий кладёт в вопрос
случайный номер, отвечающий ресурс возвращает его обратно, и спрашивающий сводит одно с другим. С
`node.suspend` спрашивающая сторона читается как обычный вызов функции:

<!-- doctest: server -->
```lua
-- in the wallet resource: answer questions about balances
local balances = { [42] = 1250 }

node.bus.on("wallet:ask", function(source, data)
    local question = node.json.decode(data)
    node.bus.emit("wallet:answer", { id = question.id, coins = balances[question.account] or 0 })
end)

-- in the asking resource
local waiting = {} -- [question id] = function that wakes the asker

node.bus.on("wallet:answer", function(source, data)
    local answer = node.json.decode(data)
    local wake = waiting[answer.id]
    if wake then
        waiting[answer.id] = nil
        wake(answer.coins)
    end
end)

local function balanceOf(account)
    local id = node.crypto.randomHex(8)
    return node.suspend(function(wake)
        waiting[id] = wake
        node.bus.emit("wallet:ask", { id = id, account = account })
        node.after(2000, function() -- nobody answered: the wallet isn't loaded
            if waiting[id] then
                waiting[id] = nil
                wake(nil, "no answer from the wallet")
            end
        end)
    end)
end

node.async(function()
    local coins, err = balanceOf(42)
    node.log("account 42 has %s coins", coins or err)
end)

-- expect: account 42 has 1250 coins
```

`balanceOf` можно вызывать только внутри `node.async`, потому что она ждёт
([Таймеры и корутины](/ru/plugins/concurrency/#ждать-не-блокируя-nodeasync)). Случайный номер не
даёт ответам перепутаться, когда спрашивают сразу несколько ресурсов, а тайм-аут не даёт корутине
ждать вечно, если другого ресурса нет.

## Нативные модули на шине

Нативные модули публикуют и подписываются на той же шине (`emit_resource_event` и
`register_resource_event` в C), так что с модулем ресурс говорит точно так же, как с другим
ресурсом. Так управляется модуль `dimensions` из примеров: ресурс публикует `dimensions:setPlayer`
со строкой `"<номер игрока>;<измерение>"`, а модуль сообщает о каждом переходе как
`dimensions:changed`. Сообщения модуля приходят с `source`, равным `"native"`.

Для сырых байтов между модулем и игрой игроков есть отдельный канал — `node.modules.on` и
`node.modules.send` ([Нативные модули](/ru/plugins/native-modules/)).

## Дальше

- [События](/ru/plugins/events/): всё, на что может реагировать ресурс.
- [Таймеры и корутины](/ru/plugins/concurrency/): как ждать, не задерживая сервер.
