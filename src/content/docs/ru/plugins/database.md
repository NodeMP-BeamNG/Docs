---
title: База данных
description: PostgreSQL, MySQL/MariaDB или SQLite из ресурса через модуль db — настройка, запросы, транзакции, типы, ошибки, миграции и готовый пример кошелька.
---

С сервером идёт модуль базы данных, `modules/db.dll` (`db.so` на Linux), и маленькая библиотека
на Lua, `db.lua`, которую ваш ресурс носит с собой. Вместе они дают `db:query`, `db:exec` и `db:tx`
для PostgreSQL, MySQL/MariaDB или SQLite. Подстановки — `$1..$n` на любом движке, значение никогда
не попадает в текст SQL, и рабочий поток ничто не блокирует: запрос выполняется в потоке базы, а
ответ возвращается обратным вызовом или будит вашу корутину.

## Хранилище или база?

| | `node.storage` | модуль `db` |
|---|---|---|
| Настройка | не нужна | владелец сервера указывает модулю базу |
| Чтение | мгновенно, из памяти | асинхронно: обратный вызов или пауза корутины |
| Форма | ключ → значение | таблицы, индексы, `WHERE`, `ORDER BY`, `SUM` |
| Несколько записей как одна | нет | `db:tx` |
| Общее с | одним ресурсом | всеми ресурсами, другими серверами, вашим сайтом и инструментами |

`node.storage` — для настроек, счётчиков и отметок «последний раз был». База — когда данные делят
несколько ресурсов или серверов, когда по ним делают выборки (десятка лучших, сумма, фильтр), когда
деньгам или инвентарю нужна транзакция или когда данные не помещаются в память.

## Настройка

Эта часть — владельца сервера. Модуль уже лежит в `modules/`. Без настройки он остаётся загруженным
и говорит об этом при запуске:

```
Warn   › no database configured: create modules/db.toml (see db.example.toml) or set NODE_DB_URL. The module stays loaded and every request answers db_disabled.
```

Скопируйте `modules/db.example.toml` в `modules/db.toml` и назовите подключение:

```toml
[connections.default]
driver = "postgres"                              # postgres | mysql | sqlite
url = "postgres://nodemp:change-me@127.0.0.1:5432/nodemp"
connections = 4                                  # 1..32 statements at once
query_timeout_ms = 10000
tx_timeout_ms = 30000
max_rows = 10000

[connections.stats]                              # a second one, opened by name
driver = "sqlite"
url = "data/stats.db"
connections = 1
```

- **SQLite** ничего не требует: путь к файлу — вся настройка, а файл создаётся при первом обращении.
- **PostgreSQL**: заведите серверу собственную роль, которой принадлежит его база и больше ничего, и
  никогда не давайте суперпользователя. Для базы на другой машине добавьте `?sslmode=require`.
- **MySQL / MariaDB**: `mysql://user:password@host:3306/dbname`.

Пароль не обязательно держать в файле: `NODE_DB_DEFAULT_URL` заменяет `url` подключения `default`
(`NODE_DB_<ИМЯ>_URL` — для остальных), а без файла вообще `NODE_DB_URL` открывает подключение с
именем `default`. Консоль подтверждает каждое, пряча пароль:

```
Db     › connection 'default': postgres, 4 connection(s)
Db     › db[default]: connected to postgres://nodemp:***@127.0.0.1:5432/nodemp (PostgreSQL 16.9)
```

Сервер запускается и работает, даже когда база лежит. Модуль переподключается в фоне, а запросы
падают с `08001`, пока база не ответит.

## Открыть подключение

Скопируйте `modules/db.lua` в папку `server/` своего ресурса, добавьте эту папку в путь Lua и
откройте подключение по имени:

<!-- doctest: skip the opening lines every db block below runs with -->
```lua
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]")
package.path = here .. "/?.lua;" .. package.path

local db = require("db").open()          -- the "default" connection
local stats = require("db").open("stats")
```

Открытие ничего не стоит: подключения уже держит модуль. Имя, которого владелец не настроил, — не
ошибка до первого запроса, который ответит `db_disabled`. Ресурс, который должен работать и на
серверах без базы, проверяет это один раз при загрузке и обходится без этой возможности.

## query и exec

`db:query(sql, params, cb)` выполняет один запрос и отдаёт его строки. `db:exec(sql, params, cb)`
выполняет один и отдаёт только число — сколько строк изменили `INSERT`, `UPDATE` или `DELETE`.
Значения идут как `$1..$n` и никогда не вклеиваются в SQL.

С обратным вызовом, из любого обработчика (таблица `wallets` берётся из
[миграции ниже](#миграции)):

<!-- doctest: db+client -->
```lua
node.on("playerJoined", function(player)
    if not player.accountId then
        return -- a Test Drive guest has no account to key a wallet by
    end

    db:query("SELECT name, balance FROM wallets WHERE account_id = $1", { player.accountId },
        function(result, err)
            if err then
                node.log.warn("wallet lookup failed: %s (%s)", err.message, err.code)
                return
            end
            for _, row in ipairs(result.rows) do
                node.log("%s has %d", row.name, row.balance)
            end
        end)

    db:exec("UPDATE wallets SET balance = balance + $2 WHERE account_id = $1", { player.accountId, 500 },
        function(count, err)
            if err then
                node.log.warn("credit failed: %s", err.message)
            elseif count == 0 then
                node.log.warn("no wallet for account %d", player.accountId)
            end
        end)
end)

-- expect-not: wallet lookup failed
-- expect-not: credit failed
```

Задано ровно одно из `result` и `err`. `result` — это `{ rows, count, columns }`: `rows` — массив
таблиц с ключами по именам столбцов, `count` — число строк, `columns` — имена по порядку.

Внутри `node.async` обратный вызов можно не передавать: тот же вызов поставит корутину на паузу и
вернёт два значения:

<!-- doctest: db+client -->
```lua
node.on("playerJoined", function(player)
    if not player.accountId then
        return -- a Test Drive guest has no account to key a wallet by
    end
    node.async(function()
        local result, err = db:query(
            "INSERT INTO wallets (account_id, name) VALUES ($1, $2) " ..
            "ON CONFLICT (account_id) DO UPDATE SET name = EXCLUDED.name RETURNING balance",
            { player.accountId, player.name })
        if not result then
            node.log.warn("wallet: %s", err.message)
            return
        end
        if player:isConnected() then -- the coroutine woke into a changed world
            player:tell("Balance: %d", result.rows[1].balance)
        end
    end)
end)

-- expect-client: Alice chat:msg .*Balance: \d+
-- expect-not: wallet:
```

Вне корутины форма без обратного вызова не ждёт: она пишет в лог
`node.suspend called outside a node.async task` и ничего не возвращает. Из обычного обработчика
передавайте обратный вызов.

Три правила — потому что подключения общие для всех ресурсов:

- **Один запрос на вызов.** `"UPDATE ...; DELETE ..."` — синтаксическая ошибка (`42601`). Запросы,
  которые должны пройти вместе, кладите в `db:tx`.
- **Никаких `BEGIN` вручную.** Это оставило бы общее подключение внутри транзакции; модуль сразу её
  откатывает и предупреждает. Пользуйтесь `db:tx`.
- **Никаких настроек сессии.** `SET` прилипает к тому подключению, на котором выполнился, и удивит
  следующий запрос на нём. Приводите типы или указывайте схему прямо в запросе (`$1::timestamptz`,
  `myschema.wallets`).

## Транзакции

`db:tx(fn, cb)` берёт одно подключение, начинает транзакцию и выполняет `fn(tx)` как корутину. Когда
`fn` возвращается, транзакция фиксируется; когда бросает ошибку — откатывается. Внутри `fn`
пользуйтесь `tx:query(sql, params)` и `tx:exec(sql, params)` (без обратных вызовов — они ставят на
паузу) и `tx:rollback(reason)`, который выходит из `fn` и откатывает.

Вызванный внутри `node.async` без `cb`, `db:tx` ставит на паузу и возвращает то, что вернула `fn`,
или `nil, err`. С `cb` он работает сам по себе и вызывает `cb(...)` с теми же значениями.

<!-- doctest: db+client -->
```lua
-- inside node.async: tx suspends the caller and returns what fn returned, or nil, err
local function withdraw(id, amount)
    return db:tx(function(tx)
        local r, e = tx:query("SELECT balance FROM wallets WHERE account_id = $1 FOR UPDATE", { id })
        if not r then
            error(e) -- rollback; e.code (a SQLSTATE) survives in err.cause.code
        end
        if not r.rows[1] then
            tx:rollback("no such wallet")
        end
        if r.rows[1].balance < amount then
            tx:rollback("insufficient funds")
        end
        local _, e2 = tx:exec("UPDATE wallets SET balance = balance - $2 WHERE account_id = $1", { id, amount })
        if e2 then
            error(e2)
        end
        return r.rows[1].balance - amount
    end)
end

node.on("playerJoined", function(player)
    if not player.accountId then
        return
    end
    node.async(function()
        local newBalance, err = withdraw(player.accountId, 100000)
        if newBalance then
            node.log("%s withdrew 1000.00, %d left", player.name, newBalance)
        else
            node.log("%s could not withdraw: %s (%s)", player.name, err.message, err.code)
        end
    end)
end)

-- expect: Alice could not withdraw: (no such wallet|insufficient funds) \(rollback\)
```

| `fn` | Результат |
|---|---|
| вернулась, фиксация прошла | то, что вернула `fn` |
| вернулась, фиксация не прошла | `nil, err` с кодом движка (ограничение, сбой сериализации, потерянное подключение) |
| бросила `error(x)` | `nil, { code = "rollback", message = ..., cause = x }` |
| вызвала `tx:rollback(reason)` | `nil, { code = "rollback", message = reason }` |
| работала дольше `tx_timeout_ms` | откат; следующий вызов `tx:` ответит `db_tx_timeout` |

Правила для транзакций:

- **Проверяйте каждый `err` внутри `fn`.** После неудачного запроса PostgreSQL отказывает всем
  остальным с `25P02`. `assert(tx:exec(...))` бросает ошибку на первой же неудаче, и это откат; код
  тогда лежит в `err.cause.code`.
- **В транзакции только вызовы `tx:`.** `db:query` внутри `fn` выполняется на другом подключении и
  строк транзакции не видит. При `connections = 1` он прождёт, пока транзакция не истечёт по времени.
- **Никаких `COMMIT` и `ROLLBACK` вручную.** Вернитесь из `fn`, чтобы зафиксировать, бросьте
  ошибку, чтобы откатить.
- **Покороче.** Подключение занято всё время, пока работает `fn`, включая любой `node.sleep` или
  HTTP-запрос внутри. Прочитали, решили, записали, вернулись.
- **Перезагрузка откатывает.** Если ресурс перезагрузили или остановили посреди транзакции,
  подключение сразу освобождается, а `fn` не продолжается.

## Значения туда и обратно

| Параметр Lua | Уходит как |
|---|---|
| `db.NULL` | `NULL` (`nil` оборвал бы массив параметров) |
| `true` / `false` | логическое значение |
| целое | 64-битное целое |
| дробное | число с плавающей точкой |
| строка | текст |
| таблица | JSON, для столбца `json`/`jsonb` |

| Столбец | Значение в Lua |
|---|---|
| логический | логическое значение |
| целые типы | целое, точное до 64 бит |
| с плавающей точкой | число |
| `numeric` | строка, чтобы ничего не потерять; деньги держите в целых копейках |
| текст, `uuid`, даты и время | строка в текстовом виде движка |
| `json` / `jsonb` | строка; раскодируйте через `node.json.decode` |
| `bytea` / `BLOB` | строка байтов |
| `NULL` | ключа нет (`row.col == nil`) |

Столбцы с одинаковым именем в строке затирают друг друга, так что давайте им псевдонимы. PostgreSQL
угадывает тип параметра по месту, где тот используется; где не может — приводите: `$1::int`,
`$2::jsonb`. Арифметику с датами делайте в SQL (`now() - interval '7 days'`), а не разбирайте
метки времени в Lua. До 1000 параметров на запрос; у запроса без параметров `params` можно
опустить: `db:query(sql, cb)`.

## Ошибки

`err` — это `{ code, message, detail?, hint?, constraint?, table? }`. `code` — SQLSTATE; ошибки
MySQL и SQLite переводятся в коды PostgreSQL, так что одна проверка работает везде. Несколько кодов
модуль добавляет от себя.

| `err.code` | Что значит | Что делать |
|---|---|---|
| `db_disabled` | Подключения с таким именем нет. | Работайте без этой возможности или скажите владельцу. |
| `08001` | База лежит или ещё не достигнута. | Модуль переподключится сам; повторите позже. |
| `08006` | Подключение потеряно посреди запроса. | Выполнился ли он — неизвестно: повторяйте только с ключом идемпотентности ([ниже](#записи-которые-не-должны-случиться-дважды)). |
| `57014` | Запрос не уложился в `query_timeout_ms`. | Индекс или более узкий запрос. |
| `23505` | Нарушена уникальность; `err.constraint` называет индекс. | Ожидаемо с ключами идемпотентности, иначе — `ON CONFLICT`. |
| `23503`, `23502`, `23514` | Внешний ключ, not null, check. | Ошибка в записи или в схеме. |
| `42601`, `42P01` | Синтаксическая ошибка (в том числе два запроса в одном вызове), нет такой таблицы. | Один запрос на вызов; сначала миграции. |
| `40001`, `40P01` | Сбой сериализации, взаимная блокировка. | Повторите транзакцию целиком; блокируйте строки в постоянном порядке. |
| `25P02` | Запрос после неудачного в транзакции. | Проверяйте каждый `err` в `fn`. |
| `db_queue_full` | Уже ждут 1000 запросов. | Вы отправляете быстрее, чем база отвечает. |
| `db_result_cap` | Строк больше, чем `max_rows`. | `LIMIT` и постраничная выборка. |
| `db_tx_timeout` | Транзакция шла слишком долго или слишком долго ждала подключения. | Транзакции покороче. |
| `db_tx_aborted` | Откат, потому что ресурс выгрузили. | Ничего не нужно. |
| `db_params` | Значение, которое модуль не может отправить. | Исправьте параметры. |
| `rollback` | `fn` бросила ошибку или вызвала `tx:rollback`. | Ваше собственное решение; код причины — в `err.cause.code`. |

Перезагрузка или остановка между отправкой запроса и ответом теряет ответ: обратный вызов не
сработает, хотя сам запрос вполне мог выполниться.

### Записи, которые не должны случиться дважды

Потерянное подключение, потерянный ответ или игрок, который нажал дважды, оставляют вас в
неведении, случилась ли запись. Пусть повтор отклоняет сама база: дайте каждому задуманному
действию ключ, храните его в столбце `UNIQUE` и считайте `23505` на нём ответом «уже сделано».

<!-- doctest: db -->
```lua
-- the first statement of the transfer's fn; key: made once, before the first
-- attempt, and reused by every retry
local function recordTransfer(tx, key, fromId, toId, amount)
    local _, err = tx:exec(
        "INSERT INTO ledger (idem_key, from_id, to_id, amount) VALUES ($1, $2, $3, $4)",
        { key, fromId, toId, amount })
    if err then
        if err.code == "23505" then
            tx:rollback("already applied") -- the retry of a transfer that went through
        end
        error(err)
    end
end
```

Вставка идёт первой, так что повтор отклоняется раньше, чем сдвинется хоть один баланс.

## Миграции

Сервер вашими таблицами не управляет: ресурс сам создаёт и обновляет их при загрузке. Делайте это
одной транзакцией, берите блокировку, чтобы два сервера на одной базе не мигрировали разом, и
записывайте, докуда дошли:

<!-- doctest: db -->
```lua
local MIGRATIONS = {
    "CREATE TABLE wallets (account_id bigint PRIMARY KEY, name text NOT NULL, balance bigint NOT NULL DEFAULT 0)",
    "CREATE TABLE ledger (id bigserial PRIMARY KEY, idem_key text UNIQUE NOT NULL, from_id bigint, to_id bigint, " ..
        "amount bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now())",
}

local function migrate()
    return db:tx(function(tx)
        assert(tx:exec("SELECT pg_advisory_xact_lock(hashtext('wallet'))"))
        assert(tx:exec("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, version int NOT NULL)"))
        local r = assert(tx:query("SELECT version FROM schema_migrations WHERE name = $1", { "wallet" }))
        local have = r.rows[1] and r.rows[1].version or 0
        for v = have + 1, #MIGRATIONS do
            assert(tx:exec(MIGRATIONS[v]))
        end
        assert(tx:exec("INSERT INTO schema_migrations (name, version) VALUES ($1, $2) " ..
            "ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version", { "wallet", #MIGRATIONS }))
        return #MIGRATIONS
    end)
end
```

`pg_advisory_xact_lock` заканчивается вместе с транзакцией; сессионный `pg_advisory_lock` остался бы
висеть на общем подключении. SQLite строка с блокировкой не нужна (и он её не знает): он и так
пускает только одного писателя за раз. В `MIGRATIONS` только дописывайте; никогда не правьте шаг,
который уже где-то выполнился.

Запускайте её при загрузке, когда база ответит, и придержите остальной ресурс, пока она не
закончит:

<!-- doctest: db {"with": [6]} -->
```lua
local schemaReady = false

node.async(function()
    while not db:ready() do
        node.sleep(500) -- it may still be connecting at start
    end
    local version, err = migrate()
    if not version then
        node.log.error("migration failed: %s (%s)", err.message, err.code)
        return
    end
    schemaReady = true
    node.log("schema at version %d", version)
end)

-- expect: schema at version 2
```

## Производительность

- **Не заваливайте очередь.** Запрос на каждый `serverTick` или на каждое обновление позиции
  заполнит очередь в 1000 запросов. Опрашивайте по таймеру, собирайте записи в пачки, а редко
  меняющиеся данные держите в памяти.
- **`connections`** — сколько запросов выполняется одновременно, и каждая транзакция держит одно
  подключение всю свою жизнь. Поднимайте, когда запросы ждут; подключение к PostgreSQL — это процесс
  на стороне базы, так что держитесь десятков.
- **Медленные запросы попадают в лог**: `db[default]: slow statement (312 ms): SELECT ...` — для
  всего дольше 250 мс, параметры не показываются никогда. Считайте их списком дел по индексам.
- **`db:status()`** даёт счётчики по каждому подключению: сколько запросов выполнено и упало,
  задержку, глубину очереди, открытые транзакции. Если хотите следить, пишите его в лог по таймеру.

## Готовый пример: переводы между кошельками

Ресурс `wallet` с балансом на каждый аккаунт, журналом операций, `/balance` и
`/pay <игрок> <монеты>`. Балансы — целые копейки; перевод — одна транзакция, которая записывает
строку журнала под ключом идемпотентности, блокирует оба кошелька в порядке номеров, проверяет
средства и переводит их. `db.lua` лежит рядом с `main.lua` в `server/`.

<!-- doctest: db+client {"players": ["Alice", "Bob"], "emit": [["chat:send", {"text": "/balance"}], ["chat:send", {"text": "/pay Bob 5"}]]} -->
```lua
-- resources/wallet/server/main.lua
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]")
package.path = here .. "/?.lua;" .. package.path
local db = require("db").open()

local schemaReady = false

local MIGRATIONS = {
    "CREATE TABLE wallets (account_id bigint PRIMARY KEY, name text NOT NULL, balance bigint NOT NULL DEFAULT 0)",
    "CREATE TABLE ledger (id bigserial PRIMARY KEY, idem_key text UNIQUE NOT NULL, from_id bigint, to_id bigint, " ..
        "amount bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now())",
}

local function migrate()
    return db:tx(function(tx)
        assert(tx:exec("SELECT pg_advisory_xact_lock(hashtext('wallet'))"))
        assert(tx:exec("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, version int NOT NULL)"))
        local r = assert(tx:query("SELECT version FROM schema_migrations WHERE name = $1", { "wallet" }))
        local have = r.rows[1] and r.rows[1].version or 0
        for v = have + 1, #MIGRATIONS do
            assert(tx:exec(MIGRATIONS[v]))
        end
        assert(tx:exec("INSERT INTO schema_migrations (name, version) VALUES ($1, $2) " ..
            "ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version", { "wallet", #MIGRATIONS }))
        return #MIGRATIONS
    end)
end

local function money(cents)
    return string.format("%d.%02d", cents // 100, cents % 100)
end

-- One transfer, one transaction. Returns the sender's new balance, or nil, err.
local function transfer(key, fromId, toId, amount)
    return db:tx(function(tx)
        -- 1. The ledger row first: a repeated key is refused here, before any balance moves.
        local _, err = tx:exec(
            "INSERT INTO ledger (idem_key, from_id, to_id, amount) VALUES ($1, $2, $3, $4)",
            { key, fromId, toId, amount })
        if err then
            if err.code == "23505" then
                tx:rollback("already applied")
            end
            error(err)
        end
        -- 2. Lock both wallets, in id order, so two opposite transfers cannot deadlock.
        local r = assert(tx:query(
            "SELECT account_id, balance FROM wallets WHERE account_id IN ($1, $2) ORDER BY account_id FOR UPDATE",
            { fromId, toId }))
        if #r.rows ~= 2 then
            tx:rollback("no such wallet")
        end
        local balance = {}
        for _, row in ipairs(r.rows) do
            balance[row.account_id] = row.balance
        end
        if balance[fromId] < amount then
            tx:rollback("insufficient funds")
        end
        -- 3. Move the money.
        assert(tx:exec("UPDATE wallets SET balance = balance - $2 WHERE account_id = $1", { fromId, amount }))
        assert(tx:exec("UPDATE wallets SET balance = balance + $2 WHERE account_id = $1", { toId, amount }))
        return balance[fromId] - amount
    end)
end

node.on("playerJoined", function(player)
    if not player.accountId or not schemaReady then
        return
    end
    db:exec("INSERT INTO wallets (account_id, name) VALUES ($1, $2) " ..
        "ON CONFLICT (account_id) DO UPDATE SET name = EXCLUDED.name",
        { player.accountId, player.name }, function(_, err)
            if err then
                node.log.warn("wallet for %s: %s", player.name, err.message)
            end
        end)
end)

local commands = {}

function commands.balance(player)
    if not player.accountId or not schemaReady then
        player:tell("No wallet: sign in with a NodeMP account")
        return
    end
    db:query("SELECT balance FROM wallets WHERE account_id = $1", { player.accountId },
        function(result, err)
            if not player:isConnected() then
                return
            end
            if err then
                player:tell("The wallet is unavailable right now")
                return
            end
            local row = result.rows[1]
            player:tell("Balance: %s", money(row and row.balance or 0))
        end)
end

function commands.pay(player, args)
    local target = node.players.find(args[1] or "")
    local coins = math.tointeger(tonumber(args[2] or ""))
    if not (player.accountId and schemaReady and target and target.accountId and coins and coins > 0)
        or target.accountId == player.accountId then
        player:tell("Usage: /pay <player> <coins>")
        return
    end
    local key = node.crypto.randomHex(8) -- one key per command, reused by the retry
    node.async(function()
        local left, err = transfer(key, player.accountId, target.accountId, coins * 100)
        if not left and err.code == "08006" then
            left, err = transfer(key, player.accountId, target.accountId, coins * 100) -- same key: safe
        end
        if not player:isConnected() then
            return
        end
        if left then
            player:tell("Sent %d coins to %s, %s left", coins, target.name, money(left))
            if target:isConnected() then
                target:tell("%s sent you %d coins", player.name, coins)
            end
        elseif err.code == "rollback" then
            player:tell("Transfer refused: %s", err.message)
        else
            node.log.warn("transfer %s failed: %s (%s)", key, err.message, err.code)
            player:tell("Transfer failed, nothing was moved")
        end
    end)
end

node.on("chatMessageRequest", function(player, msg)
    local name, rest = msg.text:match("^/(%S+)%s*(.*)$")
    local command = name and commands[name:lower()]
    if not command then return end
    local args = {}
    for word in rest:gmatch("%S+") do args[#args + 1] = word end
    command(player, args)
    return { handled = true }
end)

node.async(function()
    while not db:ready() do
        node.sleep(500)
    end
    local version, err = migrate()
    if not version then
        node.log.error("migration failed: %s (%s)", err.message, err.code)
        return
    end
    schemaReady = true
    node.log("schema at version %d", version)
end)

-- expect: schema at version 2
-- expect-client: Alice chat:msg .*Balance: \d+\.\d\d
-- expect-client: Alice chat:msg .*(Sent 5 coins to Bob, \d+\.\d\d left|Transfer refused: insufficient funds)
```

Почему он устроен именно так: вставка в журнал идёт первой, поэтому повтор с тем же ключом
останавливается на `23505`, прежде чем что-то сдвинется, и игрок слышит «already applied», а не
платит дважды. Блокировка обеих строк в постоянном порядке выстраивает два перевода между одной
парой в очередь вместо взаимной блокировки. Проверка баланса читает уже заблокированные строки,
поэтому между проверкой и записью ничто не вклинится. Повтор есть только на `08006` — единственный
случай, когда исход неизвестен. А суммы целые на всём пути, так что ошибки округления не увидит
никто.

## Если вы пришли с node.pg

До 1.3.0 база была частью сервера под именем `node.pg`. Вызовы сохранили форму:

| Было | Стало |
|---|---|
| `node.pg.query/exec/tx` | `db:query/exec/tx` у `require("db").open()` |
| `node.pg.NULL` | `db.NULL` |
| `node.pg.enabled()` | убран: отсутствующее подключение отвечает `db_disabled` |
| `node.pg.ready()` | `db:ready()` |
| `[Database]` в `server.toml` | `[connections.default]` в `modules/db.toml` |
| `NODE_DATABASE_URL` | `NODE_DB_URL` (старое имя тоже работает) |
| `pg_disabled`, `pg_queue_full`, `pg_result_cap`, `tx_timeout`, `pg_params` | `db_disabled`, `db_queue_full`, `db_result_cap`, `db_tx_timeout`, `db_params` |

## Дальше

- [Таймеры и корутины](/ru/plugins/concurrency/): `node.async` и `node.suspend`, на которых построена
  форма без обратного вызова.
- [Хранилище и файлы](/ru/plugins/storage/): для данных, которым база не нужна.
