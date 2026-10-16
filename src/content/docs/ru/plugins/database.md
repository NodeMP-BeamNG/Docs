---
title: Модуль db
description: PostgreSQL, SQLite или MySQL из ресурса — настройка модуля, db.lua, запросы с подстановками, создание таблиц при запуске, транзакции, NULL и ошибки.
---

Модуль базы данных поставляется вместе с сервером: `db.dll` или `db.so` в
`modules/`. Он одинаково работает с PostgreSQL, SQLite и MySQL/MariaDB: SQL пишете вы, подстановки — `$1`, `$2`… в любом движке.

## Настройка

Хост сообщает модулю, где база. Скопируйте `modules/db.example.toml` в `modules/db.toml` и заполните
подключение `default`:

```toml
[connections.default]
driver = "postgres"
url = "postgres://node:secret@127.0.0.1/node"
connections = 4
```

`driver` — `postgres`, `sqlite` или `mysql`; для SQLite `url` — путь к файлу, например
`"data/server.db"`. Пароль не обязан лежать в файле: переменная окружения `NODE_DB_DEFAULT_URL` важнее его, а без файла модуль берёт `NODE_DB_URL`. Пока подключение не настроено, модуль пишет при запуске `no database configured` и отвечает ошибкой на каждый запрос.

## db.lua в ресурсе
<rewrite this text eto ebuchi bred>
Ресурс говорит с модулем db через маленькую библиотеку `db.lua`, которая лежит в `modules/` рядом с модулем. Скопируйте её в папку `server/` ресурса и подключите:

<!-- doctest: skip the doctest runner puts these lines in front of every db block -->
```lua
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]")
package.path = here .. "/?.lua;" .. package.path
local db = require("db").open()
```
<rewrite this text eto ebuchi bred>
`open()` берёт подключение `default`, `open("stats")` — другое из `db.toml`. Все вызовы — методы, через двоеточие: `db:query(...)`. После обновления сервера скопируйте новый `db.lua` поверх старого.

## Запросы

| Вызов | Что даёт |
|---|---|
| `db:query(sql, params)` | `{ rows, count, columns }` или `nil, err`. Каждая строка — таблица «колонка = значение». |
| `db:exec(sql, params)` | Сколько строк изменилось, или `nil, err`. Для `insert`, `update`, `delete`. |
| `db:ready()` | `true`, когда подключение установлено. |

Внутри `node.async` вызовы ждут ответа и возвращают его. Если последним аргументом передать функцию, вызов вернётся сразу, а потом вызовет её с `(result, err)`.

Таблицы ресурс обычно создаёт при запуске. В первые мгновения после запуска сервера подключения может
ещё не быть, поэтому его стоит подождать:

<!-- doctest: db -->
```lua
node.async(function()
    while not db:ready() do
        node.sleep(500)
    end
    local _, err = db:exec([[
        create table if not exists visits (
            account bigint primary key,
            times integer not null
        )]])
    if err then
        return node.log.error("%s: %s", err.code, err.message)
    end
    node.log("visits table ready")
end)

-- expect: visits table ready
```

Счётчик визитов: один запрос добавляет первый визит или прибавляет единицу, второй читает число.

<!-- doctest: db+client -->
```lua
node.on("playerJoined", function(player)
    if not player.accountId then return end
    node.async(function()
        local _, err = db:exec([[
            insert into visits (account, times) values ($1, 1)
            on conflict (account) do update set times = visits.times + 1
        ]], { player.accountId })
        if err then
            return node.log.error("%s: %s", err.code, err.message)
        end
        local res = db:query("select times from visits where account = $1",
            { player.accountId })
        player:tell("Visit number %d", res.rows[1].times)
    end)
end)

-- expect-client: Alice chat:msg .*Visit number \d+
```

## Транзакции

`db:tx(fn)` занимает одно подключение на всё время `fn`. Внутри неё `tx:query` и `tx:exec` всегда ждут
ответа. Когда `fn` возвращается, изменения сохраняются; если она бросает ошибку или вызывает
`tx:rollback(reason)`, изменения отменяются. `db:tx` возвращает то, что вернула `fn`, или `nil, err`.

<!-- doctest: db -->
```lua
local function transfer(from, to, cents)
    return db:tx(function(tx)
        local res, err = tx:query(
            "select cents from wallets where account = $1", { from })
        if err then error(err) end
        local have = res.rows[1] and res.rows[1].cents or 0
        if have < cents then
            return tx:rollback("not enough money")
        end
        tx:exec("update wallets set cents = cents - $1 where account = $2",
            { cents, from })
        tx:exec("update wallets set cents = cents + $1 where account = $2",
            { cents, to })
        return true
    end)
end

node.async(function()
    while not db:ready() do
        node.sleep(500)
    end
    db:exec([[create table if not exists wallets (
        account bigint primary key, cents bigint not null)]])
    db:exec([[insert into wallets values (1, 1000), (2, 0)
        on conflict do nothing]])
    local ok, err = transfer(1, 2, 500)
    node.log("first transfer: %s", tostring(ok))
    ok, err = transfer(1, 2, 5000)
    node.log("second transfer: %s", err and err.message or "done")
end)

-- expect: first transfer: true
-- expect: second transfer: not enough money
```

Транзакцию, которая идёт дольше `tx_timeout_ms` из `db.toml`, модуль откатывает, так что забытая транзакция не держит подключение вечно. Если ресурс перезагрузили или остановили посреди транзакции, подключение освобождается сразу.

## NULL и другие значения

Список параметров — это массив Lua, и `nil` оборвал бы его раньше времени. Для SQL NULL пишите
`db.NULL`:

<!-- doctest: skip shows only the parameter list -->
```lua
db:exec("insert into notes (id, text) values ($1, $2)", { 7, db.NULL })
```

Таблица в параметрах отправляется как JSON — для колонок `json` или `jsonb`.

## Ошибки

Ошибка — это значение, её не бросают: `{ code, message, detail, constraint, … }`. Код — это SQLSTATE,
если он есть у движка, и все движки приведены к одним кодам:

| Код | Что значит |
|---|---|
| `23505` | Такой уникальный ключ уже есть; `constraint` его называет. |
| `23503`, `23502`, `23514` | Нарушен внешний ключ, NOT NULL или CHECK. |
| `42601`, `42P01` | Синтаксическая ошибка; нет такой таблицы. |
| `57014` | У запроса кончилось время. |
| `08001`, `08006` | Нет подключения; подключение потеряно. |
| `db_disabled` | Подключения с таким именем нет. |
| `db_tx_timeout` | Транзакция шла дольше `tx_timeout_ms`. |
| `db_params` | Список параметров или SQL нельзя использовать. |
