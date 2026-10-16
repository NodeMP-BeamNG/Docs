---
title: Таймеры и корутины
description: Таймеры, корутины, которые ждут, не задерживая сервер, тяжёлая работа в фоновых потоках, правило 250 мс и перезапуск с обратным отсчётом в чате.
---

Все обработчики, таймеры и корутины всех ресурсов выполняются по очереди.
Поэтому код должен быть простой — без блокировок. 

Обработчик, который с временем выполнения в секунду, на эту секунду задерживает все остальные ресурсы. Если одна задача держит поток дольше 250 мс, сервер предупреждает:

```
plugin worker job stalled the thread …
```

Для тяжёлых задач, используют таймеры, корутины или вообще отдают фоновым потокам.

## Таймеры

| Вызов | Что делает |
|---|---|
| `node.after(ms, fn)` | Выполняет `fn` один раз через `ms` миллисекунд. |
| `node.every(ms, fn)` | Выполняет `fn` каждые `ms` миллисекунд. Медленный запуск сдвигает следующий, запуски не копятся. |
| `node.every(ms, fn, { precise = true })` | Держит расписание: запуски, на которые поток был занят, идут подряд, а `fn(missed)` узнаёт, сколько их пропущено. |
| `node.cancel(id)` | Останавливает таймер. Безопасно и для уже сработавшего. |
| `node.defer(fn)` | Выполняет `fn`, как только текущее событие обработано. |

<!-- doctest: server -->
```lua
local ticks = 0
local id
id = node.every(500, function()
    ticks = ticks + 1
    if ticks == 3 then
        node.cancel(id)
        node.log("stopped after %d ticks", ticks)
    end
end)

-- expect: stopped after 3 ticks
```

`precise` нужен, когда важно число запусков: очко раз в секунду, обратный отсчёт. Десять секунд
`every(100, fn, { precise = true })` дают сто запусков, даже если другой обработчик занимал поток.
После долгой задержки догоняется не больше `maxBacklog` запусков (по умолчанию 10); дальше расписание
начинается заново от текущего момента, и лог один раз об этом пишет.

<!-- doctest: server -->
```lua
local seconds = 0
node.every(100, function(missed)
    seconds = seconds + 0.1
    if missed > 0 then node.log("caught up %d runs", missed) end
end, { precise = true })
node.after(1050, function() node.log("counted %.1f s", seconds) end)

-- expect: counted 1\.0 s
```

`serverTick` приходит на каждом такте сервера. Он делит поток со всем остальным, поэтому держите его
коротким; обычно таймер подходит лучше.

## Корутины

Корутина — это код, который умеет вставать на паузу, не занимая поток. `node.async(fn)` запускает
её, а внутри `node.sleep(ms)` ждёт нужное время, пока всё остальное продолжает работать. Обратный
отсчёт читается сверху вниз:

<!-- doctest: server -->
```lua
node.async(function()
    for i = 3, 1, -1 do
        node.log("%d", i)
        node.sleep(500)
    end
    node.log("go")
end)

-- expect: ^go$
```

`node.wait(fn)` ждёт, пока `fn` не вернёт истину, проверяя каждые 50 мс:

<!-- doctest: server+client -->
```lua
node.async(function()
    node.wait(function()
        return node.players.count() > 0
    end)
    node.log("someone is here")
end)

-- expect: someone is here
```

Внутри корутины так же ждёт ответа `node.http.fetch` ([HTTP-запросы](/ru/plugins/http/)), а вызовы
модуля базы данных ждут своих результатов ([Модуль db](/ru/plugins/database/)).

## Тяжёлая работа

Долгим вычислениям на рабочем потоке не место. `node.await(fn, args)` выполняет `fn` в фоновом потоке и держит корутину на паузе, пока она не закончит:

<!-- doctest: server -->
```lua
node.async(function()
    local sum, err = node.await(function(n)
        local total = 0
        for i = 1, n do
            total = total + i
        end
        return total
    end, 1000)
    node.log("sum = %s", tostring(sum or err))
end)

-- expect: sum = 500500
```

Фоновая функция копируется в другое состояние Lua, поэтому она должна быть самодостаточной: никаких внешних переменных, никакого `node`, только её аргумент и обычный Lua. Аргумент и результат передаются как JSON. `node.job(fn, args, done)` — то же самое, только с колбэком вместо корутины.

## Перезапуск с обратным отсчётом

`node.server.shutdown(reason, delayMs)` планирует остановку, а `serverShutdownScheduled` сообщает
всем ресурсам, когда она будет, — и кто-то из них может вести обратный отсчёт в чате. С
`Restart=always` в systemd или политикой перезапуска в Docker остановка превращается в перезапуск.

<!-- doctest: server+client {"config": {"moderators": [42]}, "emit": [["chat:send", {"text": "/restart"}]]} -->
```lua
local moderators = {}
for _, id in ipairs(node.config.moderators or {}) do
    moderators[id] = true
end

local current

node.on("serverShutdownScheduled", function(info)
    current = info
    if info.cancelled then
        node.chat.say("The restart is called off")
        return
    end
    node.async(function()
        while current == info do
            local left = math.floor(info.at - node.server.unixTime())
            if left <= 0 then break end
            node.chat.say("Restart in %d s: %s", left, info.reason)
            node.sleep(math.min(left, 60) * 1000)
        end
    end)
end)

node.on("chatMessageRequest", function(player, msg)
    if msg.text ~= "/restart" then return end
    if moderators[player.accountId] then
        node.server.shutdown("Scheduled restart", 5 * 60 * 1000)
    end
    return { handled = true }
end)

-- expect-client: Alice chat:msg .*Restart in \d+ s: Scheduled restart
```

Повторный вызов `shutdown` заменяет расписание, отрицательная задержка отменяет его. Когда время
приходит, игроков отключают с этой причиной, срабатывают `serverShutdown` и `resourceUnload`, и сервер
завершается с кодом 0.
