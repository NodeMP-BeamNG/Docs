---
title: Таймеры и корутины
description: Один поток для всех обработчиков, таймеры, node.defer, ожидание в корутинах и тяжёлая работа в фоновом пуле через node.await и node.job.
---

Сервер использует много потоков, ваш Lua — один. Все обработчики всех ресурсов выполняются в одном
рабочем потоке, по одному вызову за раз. Всё на этой странице существует для того, чтобы этому
потоку никогда не приходилось ждать.

## Один поток на всех

Сетевые потоки принимают пакеты и ставят события в очередь; рабочий поток забирает их и вызывает
ваши обработчики. Таймеры, корутины, сообщения шины, ответы HTTP и завершённые фоновые задачи —
всё возвращается в этот же поток. Отсюда два следствия:

- **Блокировки не нужны никогда.** Два обработчика не выполняются одновременно — ни в вашем
  ресурсе, ни в чужом, — так что обычная таблица Lua — надёжное место для общего состояния.
- **Медленный обработчик задерживает всех.** Обработчик, который крутится секунду, на эту секунду
  останавливает обработчики и таймеры всех ресурсов. Сервер это замечает: любой обработчик, таймер
  или шаг корутины дольше 250 мс попадает в лог с именем ресурса и видом кода:
  `plugin worker job stalled the thread for 699 ms (resource race, timer) — move heavy work to node.await/node.job`.

`node.server.handlerStats()` показывает, сколько выполняются обработчики вашего ресурса (сколько
раз, в среднем, максимум и сколько раз дольше 250 мс), — так видно, что обработчик подбирается к
порогу, ещё до предупреждения.

## Таймеры

- `node.after(ms, fn)` вызывает `fn` один раз через `ms` миллисекунд и возвращает номер таймера.
- `node.every(ms, fn)` вызывает `fn` каждые `ms` миллисекунд, пока его не отменят. Медленная `fn`
  откладывает следующий запуск; запуски не накапливаются.
- `node.cancel(id)` останавливает любой из них. Можно звать и для таймера, который уже сработал.

<!-- doctest: server -->
```lua
local ticks = 0
local intervalId
intervalId = node.every(60000, function()
    ticks = ticks + 1
    node.log("minute %d, players: %d", ticks, node.players.count())
    if ticks >= 60 then
        node.cancel(intervalId)
    end
end)

node.after(500, function()
    node.log("half a second in, timer %d is ticking", intervalId)
end)

-- expect: half a second in, timer \d+ is ticking
```

Таймер никогда не прерывает обработчик — он выполняется между ними. Таймеры принадлежат ресурсу,
который их поставил: перезагрузка их сбрасывает, а при выключении они останавливаются после
`serverShutdown`. `serverTick` — свой встроенный таймер, каждые 100 мс.

## После остальных: node.defer

`node.defer(fn)` вызывает `fn`, когда все обработчики текущего события закончили. Так вы действуете
после того, как событие увидели все; всё, что вы меняете внутри `fn`, происходит после события, а не
во время него.

<!-- doctest: server+client {"spawn": "coupe"} -->
```lua
node.on("vehicleSpawned", function(vehicle)
    node.defer(function()
        if vehicle:exists() then -- another handler may have deleted it meanwhile
            vehicle:setTag("spawnedAt", tostring(node.server.unixTime()))
            node.log("%s tagged spawnedAt=%s", tostring(vehicle), vehicle:tag("spawnedAt"))
        end
    end)
end)

-- expect: Vehicle#\d+ Alice tagged spawnedAt=\d+
```

## Ждать, не блокируя: node.async

`node.async(fn, ...)` запускает `fn(...)` как корутину в рабочем потоке. Внутри неё эти вызовы
ставят ваш код на паузу, пока всё остальное продолжает работать:

- `node.sleep(ms)` ждёт заданное время.
- `node.wait(fn, intervalMs)` ждёт, пока `fn()` не вернёт что-то истинное, проверяя каждые
  `intervalMs` (по умолчанию 50). `node.wait(ms)` — то же, что `node.sleep(ms)`.
- `node.yield()` даёт другим обработчикам поработать один ход — внутри длинного цикла, который
  должен оставаться в рабочем потоке.
- `node.await(work, args)` выполняет функцию в другом потоке и отдаёт вам результат
  ([ниже](#тяжёлая-работа-nodeawait-и-nodejob)). `node.http.fetch` работает так же для HTTP.

<!-- doctest: server+client {"emit": [["race:start", ""]]} -->
```lua
node.on("race:start", function(player, data)
    node.async(function()
        for i = 3, 1, -1 do
            node.broadcast("race:countdown", tostring(i))
            node.sleep(1000)
        end
        node.broadcast("race:go")
        node.log("race started by %s", tostring(player))
    end)
end)

-- expect-client: Alice race:countdown 3
-- expect-client: Alice race:go
-- expect: race started by Player#\d+ Alice
```

Вне `node.async` эти вызовы не работают: в логе будет `node.sleep called outside a node.async task`.
Ошибка внутри корутины пишется в лог как `error in async task` и завершает её. Перезагрузка
сбрасывает работающие корутины.

Корутина, которая спала, просыпается в изменившемся мире: игрок мог уйти, машина — исчезнуть.
Проверяйте `player:isConnected()` и `vehicle:exists()` после каждой паузы и помните, что номера
переиспользуются.

`node.suspend(arm)` — общая форма всех этих вызовов: выполняется `arm(resume)`, и тот, кто позже
вызовет `resume(...)` (обработчик, таймер, сообщение шины), разбудит корутину с этими значениями. Так
свой API на колбэках превращается в код без вложенности.

## Тяжёлая работа: node.await и node.job

Долгим вычислениям не место в рабочем потоке. `node.await(work, args)` выполняет `work(args)` в
фоновом потоке и ставит корутину на паузу, пока он не закончит; возвращает результат или `nil` и
ошибку. `node.job(work, args, done)` — форма с колбэком: `done(result, err)` выполнится в рабочем
потоке потом, и корутина не нужна.

`work` выполняется в отдельном пустом состоянии Lua, поэтому должна быть **самодостаточной**: никаких
переменных снаружи функции, никакого `node`, ничего из вашего ресурса. Она получает `args` и
возвращает результат, и то и другое — простые данные (таблицы, строки, числа, логические значения).
Функция, которую нельзя перенести, падает с `work function cannot be serialized (C function?)`.

<!-- doctest: server+client {"emit": [["stats:request", ""]]} -->
```lua
node.storage.set("scores", { { name = "Bob", time = 71.2 }, { name = "Alice", time = 64.9 } })

node.on("stats:request", function(player, data)
    node.async(function()
        local scores = node.storage.get("scores", {})
        local top, err = node.await(function(args)
            table.sort(args.scores, function(a, b) return a.time < b.time end)
            local out = {}
            for i = 1, math.min(10, #args.scores) do out[i] = args.scores[i] end
            return out
        end, { scores = scores })
        if not top then
            node.log.warn("ranking failed: %s", err)
            return
        end
        player:send("stats:top", top)
        node.log("%s leads with %.1f s", top[1].name, top[1].time)
    end)
end)

-- expect: Alice leads with 64\.9 s
-- expect-client: Alice stats:top \[\{
```

В фоновом пуле по одному потоку на ядро процессора, от 2 до 32; переменная окружения
`NODE_PLUGIN_POOL` задаёт число. Когда его очередь полна, `node.job` возвращает `false`, а
`node.await` — `nil, "background pool is full"`.

## Что ещё работает вне рабочего потока

- HTTP-запросы выполняются в фоне и вызывают вас обратно в рабочем потоке ([HTTP](/ru/plugins/http/)).
- `node.fs.writeAsync` пишет в отдельном потоке; `node.storage.set` стоит только размера значения,
  так что его можно звать в обработчике ([Хранилище и файлы](/ru/plugins/storage/)).
- Запросы к базе выполняются в собственных потоках модуля базы данных ([База данных](/ru/plugins/database/)).

## Правила

1. Обработчики должны быть короткими. Ожидание — в `node.async`, вычисления — в `node.await` или
   `node.job`.
2. Никогда не крутитесь в цикле, дожидаясь чего-то. Внутри `node.async` есть `node.sleep`,
   `node.wait` и `node.http.fetch`.
3. С фоновой задачей не делите ничего, кроме простых данных.
4. Чтобы следить за многими машинами, читайте их все по таймеру (`node.vehicles.transforms`), а не
   подписывайтесь на поток каждой.
5. После любой паузы проверяйте, что игрок и машина ещё существуют.
6. Перезагрузка сбрасывает всё, что вы зарегистрировали; задача или запрос, которые уже идут,
   доработают, но их колбэк уйдёт в никуда.

## Дальше

- [События](/ru/plugins/events/) — что вообще приходит в рабочий поток.
- [Справочник Lua API](/ru/plugins/api/lua/#top-level-events-sending-timers-coroutines) — все
  вызовы таймеров и корутин.
