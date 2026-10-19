---
title: Модуль db
description: Настройка модуля db, db.lua, запросы с подстановками, создание таблиц при запуске, транзакции, NULL и ошибки в PostgreSQL, SQLite и MySQL.
---

Модуль базы данных поставляется вместе с сервером: `db.dll` или `db.so` в `modules/`. Он одинаково работает с PostgreSQL, SQLite и MySQL/MariaDB. SQL пишете вы, подстановки `$1`, `$2`… работают в любом движке, а значения передаются отдельно от текста запроса.

## Настройка

Хост сообщает модулю, где база. Скопируйте `db.example.toml` из папки `modules/` рядом с программой в `modules/db.toml` рабочей папки сервера и заполните подключение `default`. Подойдёт и `db.toml` прямо в рабочей папке.

```toml
[connections.default]
driver = "postgres"
url = "postgres://node:secret@127.0.0.1/node"
connections = 4
```

| Ключ | По умолчанию | Что значит |
|---|---|---|
| `driver` | по адресу | `postgres`, `sqlite` или `mysql`. Если ключа нет, движок берётся из `url`: `postgres://` значит PostgreSQL, `mysql://` значит MySQL, всё остальное SQLite. |
| `url` | нет | Адрес базы. Для SQLite это путь к файлу от папки сервера, например `"data/server.db"`; `":memory:"` даёт базу в памяти, которая пропадает при остановке сервера. |
| `connections` | `4` | Сколько соединений держит пул, от 1 до 32. Столько запросов может идти одновременно. |
| `query_timeout_ms` | `10000` | Сколько может идти один запрос. |
| `tx_timeout_ms` | `30000` | Сколько может быть открыта транзакция вместе с ожиданием свободного соединения. |
| `max_rows` | `10000` | Результат больше этого числа строк заканчивается ошибкой `db_result_cap`. |

Модуль читает файл один раз, при запуске. Пароль не обязан лежать в файле: переменная окружения `NODE_DB_DEFAULT_URL` заменяет адрес из файла (для подключения с другим именем это `NODE_DB_<ИМЯ>_URL`), а без файла модуль берёт `NODE_DB_URL`. Пока подключение не настроено, модуль пишет при запуске `no database configured` и на каждый запрос отвечает ошибкой `db_disabled`.

## db.lua в плагине

Плагин обращается к модулю через маленькую библиотеку `db.lua`, которая лежит в `modules/` рядом с модулем. Скопируйте её в папку `server/` плагина и подключите:

<!-- doctest: skip the doctest runner puts these lines in front of every db block -->
```lua
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]")
package.path = here .. "/?.lua;" .. package.path
local db = require("db").open()
```

`open()` берёт подключение `default`, `open("stats")` берёт другое из `db.toml`. Все вызовы пишутся через двоеточие: `db:query(...)`. Вызов через точку библиотека отклоняет с подсказкой. После обновления сервера скопируйте новый `db.lua` поверх старого.

## Запросы

| Вызов | Что даёт |
|---|---|
| `db:query(sql, params)` | `{ rows, count, columns }` или `nil, err`. Каждая строка в `rows` — таблица «колонка = значение». |
| `db:exec(sql, params)` | Сколько строк изменилось, или `nil, err`. Для `insert`, `update`, `delete`. |
| `db:ready()` | `true`, когда подключение установлено. |
| `db:status()` | Драйвер, состояние и счётчики всех подключений одной таблицей. |

Внутри `node.async` вызовы ждут ответа и возвращают его. Если последним аргументом передать функцию, вызов вернётся сразу, а потом вызовет её с `(result, err)`.

Таблицы плагин обычно создаёт при запуске. В первые мгновения после запуска сервера подключения может ещё не быть, поэтому его стоит подождать:

<!-- doctest: db -->
```lua
local function createTable()
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
end

node.async(createTable)

-- expect: visits table ready
```

Счётчик визитов: один запрос добавляет первый визит или прибавляет единицу, второй читает число.

<!-- doctest: db+client -->
```lua
local function recordVisit(player)
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
end

local function onJoined(player)
    if not player.accountId then return end
    node.async(recordVisit, player)
end

node.on("playerJoined", onJoined)

-- expect-client: Alice chat:msg .*Visit number \d+
```

## Транзакции

`db:tx(fn)` занимает одно подключение на всё время `fn`. Внутри неё `tx:query` и `tx:exec` всегда ждут ответа. Когда `fn` возвращается, изменения сохраняются; если она бросает ошибку или вызывает `tx:rollback(reason)`, изменения отменяются. `db:tx` возвращает то, что вернула `fn`, или `nil, err`. У ошибки отката `code` равен `"rollback"`, а то, что бросила `fn`, лежит в `err.cause`.

<!-- doctest: db -->
```lua
local function transfer(from, to, cents)
    local function move(tx)
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
    end
    return db:tx(move)
end

local function runTransfers()
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
end

node.async(runTransfers)

-- expect: first transfer: true
-- expect: second transfer: not enough money
```

Транзакцию, которая идёт дольше `tx_timeout_ms` из `db.toml`, модуль откатывает, так что забытая транзакция не держит подключение вечно. Если плагин перезагрузили или остановили посреди транзакции, подключение освобождается сразу.

## NULL и другие значения

Список параметров — массив Lua, и `nil` оборвал бы его раньше времени. Для SQL NULL пишите `db.NULL`. Список с дырой библиотека отклоняет ошибкой; если дыра нужна, задайте длину явно: `{ a, nil, b, n = 3 }` отправит `nil` как NULL.

<!-- doctest: skip shows only the parameter list -->
```lua
db:exec("insert into notes (id, text) values ($1, $2)", { 7, db.NULL })
```

Таблица в параметрах отправляется как JSON, для колонок `json` или `jsonb`.

## Ошибки

Ошибка не бросается, а возвращается значением `{ code, message, detail, constraint, … }`. Код — SQLSTATE, у всех движков одинаковый для одной и той же ошибки, или код самого модуля, который начинается с `db_`:

| Код | Что значит |
|---|---|
| `23505` | Такой уникальный ключ уже есть; `constraint` его называет, если движок сообщает имя. |
| `23503`, `23502`, `23514` | Нарушен внешний ключ, NOT NULL или CHECK. |
| `42601`, `42P01` | Синтаксическая ошибка; нет такой таблицы. |
| `57014` | Запрос шёл дольше `query_timeout_ms`. |
| `08001`, `08006` | Нет подключения; подключение потеряно. |
| `db_disabled` | Подключения с таким именем нет, или модуль не настроен. |
| `db_tx_timeout` | Транзакция шла дольше `tx_timeout_ms`. |
| `db_result_cap` | В результате больше строк, чем `max_rows`. |
| `db_params` | Список параметров или SQL нельзя использовать. |
