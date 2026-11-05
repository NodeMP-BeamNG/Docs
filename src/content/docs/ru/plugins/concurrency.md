---
title: Таймеры и корутины
description: Таймеры, корутины, которые ждут, не задерживая сервер, тяжёлая работа в фоновых потоках, правило 250 мс и перезапуск с обратным отсчётом в чате.
---

Обработчики, таймеры и корутины всех плагинов выполняются на одном рабочем потоке, по очереди. Гонок между ними нет и блокировки не нужны, но обработчик, который работает долго, задерживает все остальные плагины.

Если один запуск держит поток дольше 250 мс, сервер пишет в лог:

```text
plugin worker job stalled the thread …
```

Ждите таймерами и корутинами, а тяжёлую работу отдавайте фоновым потокам.

## Таймеры

| Вызов | Что делает |
|---|---|
| `node.after(ms, fn)` | Выполняет `fn` один раз через `ms` миллисекунд. |
| `node.every(ms, fn)` | Выполняет `fn` каждые `ms` миллисекунд. Медленный запуск сдвигает следующий, запуски не копятся. |
| `node.every(ms, fn, { precise = true })` | Держит расписание: запуски, которые поток пропустил, идут подряд, а `fn(missed)` узнаёт, сколько их пропущено. |
| `node.cancel(id)` | Останавливает таймер. Можно вызывать и для таймера, который уже сработал. |
| `node.defer(fn)` | Выполняет `fn`, как только текущее событие обработано. |

<!-- doctest: server -->
```lua
local ticks = 0
local id

local function countTick()
    ticks = ticks + 1
    if ticks == 3 then
        node.cancel(id)
        node.log("stopped after %d ticks", ticks)
    end
end

id = node.every(500, countTick)

-- expect: stopped after 3 ticks
```

`precise` нужен, когда важно число запусков: очко раз в секунду, обратный отсчёт. Десять секунд `every(100, fn, { precise = true })` дают сто запусков, даже если другой обработчик занимал поток. После долгой задержки таймер догоняет не больше `maxBacklog` запусков (ключ той же таблицы, по умолчанию 10, не больше 1000). Остальные пропускаются, расписание начинается заново от текущего момента, и лог один раз об этом пишет.

<!-- doctest: server -->
```lua
local seconds = 0

local function countTime(missed)
    seconds = seconds + 0.1
    if missed > 0 then node.log("caught up %d runs", missed) end
end

node.every(100, countTime, { precise = true })

local function reportTime()
    node.log("counted %.1f s", seconds)
end

node.after(1050, reportTime)

-- expect: counted 1\.0 s
```

`serverTick` приходит на каждом такте сервера. Он делит поток со всем остальным, поэтому держите его коротким; обычно таймер подходит лучше.

## Корутины

Корутина — код, который умеет вставать на паузу, не занимая поток. `node.async(fn, ...)` запускает её, а внутри `node.sleep(ms)` ждёт нужное время, пока всё остальное продолжает работать. Обратный отсчёт читается сверху вниз:

<!-- doctest: server -->
```lua
local function countdown()
    for i = 3, 1, -1 do
        node.log("%d", i)
        node.sleep(500)
    end
    node.log("go")
end

node.async(countdown)

-- expect: ^go$
```

`node.wait(fn)` ждёт, пока `fn` не вернёт истину. Сервер вызывает её каждые 50 мс, другой интервал задаёт второй аргумент:

<!-- doctest: server+client -->
```lua
local function somebodyIsHere()
    return node.players.count() > 0
end

local function announce()
    node.wait(somebodyIsHere)
    node.log("someone is here")
end

node.async(announce)

-- expect: someone is here
```

`node.sleep`, `node.wait`, `node.await`, `node.yield`, `node.suspend` и `node.http.fetch` работают только внутри `node.async`. Долгий цикл, которому нужен рабочий поток, отдаёт его другим на один оборот вызовом `node.yield()`.

`node.suspend(arm)` вызывает `arm(resume)` и ставит корутину на паузу, пока кто-нибудь не вызовет `resume(...)`. То, что передали в `resume`, вернёт сам `node.suspend`. Это общий вид `node.sleep` и `node.await`: так колбэк превращается в линейный код, как в `db.lua` ([Модуль db](/ru/plugins/database/)).

## Тяжёлая работа

Долгим вычислениям на рабочем потоке не место. `node.await(fn, args)` выполняет `fn` в фоновом потоке и держит корутину на паузе, пока `fn` не закончит:

<!-- doctest: server -->
```lua
local function sumTo(n)
    local total = 0
    for i = 1, n do
        total = total + i
    end
    return total
end

local function report()
    local sum, err = node.await(sumTo, 1000)
    node.log("sum = %s", tostring(sum or err))
end

node.async(report)

-- expect: sum = 500500
```

Фоновая функция копируется в другое состояние Lua, поэтому она должна быть самодостаточной: никаких внешних переменных, никакого `node`, только её аргумент и обычный Lua. Аргумент и результат передаются как JSON. `node.job(fn, args, done)` — то же самое, только с колбэком `done(result, err)` вместо корутины.

## Перезапуск с обратным отсчётом

`node.server.shutdown(reason, delayMs)` планирует остановку, причина по умолчанию `Server shutdown`. Событие `serverShutdownScheduled` сообщает всем плагинам, когда она случится, и кто-то из них может вести обратный отсчёт в чате. С `Restart=always` в systemd или политикой перезапуска в Docker остановка превращается в перезапуск.

<!-- doctest: server+client {"config": {"moderators": [42]}, "emit": [["chat:send", {"text": "/restart"}]]} -->
```lua
local moderators = {}
for _, id in ipairs(node.config.moderators or {}) do
    moderators[id] = true
end

local current

local function countDown(info)
    while current == info do
        local left = math.floor(info.at - node.server.unixTime())
        if left <= 0 then break end
        node.chat.say("Restart in %d s: %s", left, info.reason)
        node.sleep(math.min(left, 60) * 1000)
    end
end

local function trackShutdown(info)
    current = info
    if info.cancelled then
        node.chat.say("The restart is called off")
        return
    end
    node.async(countDown, info)
end

node.on("serverShutdownScheduled", trackShutdown)

local function handleRestart(player, msg)
    if msg.text ~= "/restart" then return end
    if moderators[player.accountId] then
        node.server.shutdown("Scheduled restart", 5 * 60 * 1000)
    end
    return { handled = true }
end

node.on("chatMessageRequest", handleRestart)

-- expect-client: Alice chat:msg .*Restart in \d+ s: Scheduled restart
```

Повторный вызов `shutdown` заменяет расписание, отрицательная задержка отменяет его. Остановка без задержки `serverShutdownScheduled` не вызывает. Когда время приходит, игроков отключают с этой причиной, срабатывают `serverShutdown` и `resourceUnload`, и сервер завершается с кодом 0.
