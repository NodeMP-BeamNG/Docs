---
title: Доступ к базе данных
description: PostgreSQL из ресурса через node.pg - настройка, query/exec/tx, типы параметров и результата, ошибки, миграции, производительность, пример кошелька.
---

`node.pg` даёт ресурсу асинхронный доступ к PostgreSQL хостера: параметризованные операторы,
транзакции на одном зарезервированном соединении, пул соединений и ошибки в виде таблиц с SQLSTATE
внутри. Рабочий поток ничего не ждёт - оператор выполняется в потоке базы данных, а его исход
возвращается колбэком или возобновляет вашу корутину. Хостер задаёт одну строку подключения в
`server.toml`; пул общий для всех ресурсов. Эта страница - руководство; в
[справочнике Lua API](/ru/plugins/api/lua/#nodepg--postgresql) есть сигнатура каждого вызова, а в
[справочнике C ABI](/ru/plugins/api/c/#database-postgresql) - записи `pg_*` для нативных модулей.

## node.storage или node.pg

Оба хранят данные; нужды у них разные.

| | `node.storage` | `node.pg` |
|---|---|---|
| Где | JSON-файл на ресурс в `storage/`, целиком в памяти | PostgreSQL хостера |
| Настройка | не нужна | хостер устанавливает PostgreSQL и задаёт `[Database] Url` |
| Чтение | синхронное, из памяти | асинхронное: колбэк или приостановленная корутина |
| Форма | ключ - значение | таблицы, индексы, `WHERE`, `ORDER BY`, `SUM` |
| Несколько записей как одна | нет | `node.pg.tx` |
| Общий доступ | один ресурс | все ресурсы сервера, другие серверы, ваши собственные инструменты |
| Размер | сколько помещается в память | сколько помещается на диск базы данных |

Используйте `node.storage` для настроек, счётчиков и отметок «последний раз видели». Используйте
`node.pg`, когда данные делят несколько ресурсов или несколько серверов, когда вы их запрашиваете
(десятка лучших, сумма, фильтр), когда деньгам или инвентарю нужна транзакция или когда данные
перерастают память. Ресурс, который работает и на серверах без базы данных, один раз при загрузке
проверяет `node.pg.enabled()` и работает в урезанном режиме: иначе каждый вызов `node.pg` отвечает
`pg_disabled`.

## Настройка базы данных

Эта часть - для хостера. Серверу нужны роль PostgreSQL, база данных, в которой он может создавать
таблицы, и строка подключения.

**Debian и Ubuntu**

```bash
sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE ROLE nodemp LOGIN PASSWORD 'change-me';" \
                      -c "CREATE DATABASE nodemp OWNER nodemp;"
```

**Docker**

```bash
docker run -d --name nodemp-postgres --restart unless-stopped \
  -e POSTGRES_USER=nodemp -e POSTGRES_PASSWORD=change-me -e POSTGRES_DB=nodemp \
  -v "$PWD/pgdata:/var/lib/postgresql/data" \
  -p 127.0.0.1:5432:5432 \
  postgres:16-alpine
```

Образ создаёт роль и базу данных из этих трёх переменных. Когда сервер тоже работает под Docker,
поместите оба контейнера в одну сеть compose и используйте имя сервиса как хост
(`postgres://nodemp:change-me@postgres:5432/nodemp`).

Роль владеет своей базой данных и ничем больше: она может создавать в ней таблицы и не имеет прав
на таблицы других баз данных. Никогда не отдавайте серверу
суперпользователя. Чтобы разделить существующую базу данных с другими приложениями, дайте серверу
собственную схему: `CREATE SCHEMA nodemp AUTHORIZATION nodemp;` и
`ALTER ROLE nodemp SET search_path = nodemp;`.

Затем укажите базу данных в `server.toml` - или в `NODE_DATABASE_URL`, где секрету и место в
контейнере, - и перезапустите сервер:

```toml
[Database]
Url = "postgres://nodemp:change-me@127.0.0.1:5432/nodemp"
```

Для базы данных на другой машине PostgreSQL должен слушать этот интерфейс (`listen_addresses` в
`postgresql.conf`) и разрешать адрес сервера в `pg_hba.conf`; добавьте к `Url` `?sslmode=require`,
чтобы пароль и данные не шли по сети открытым текстом. Остальные ключи `[Database]` - размер пула,
тайм-ауты, предел строк - описаны на странице [Конфигурация](/ru/hosting/configuration/#database).

Консоль подтверждает подключение строкой
`pg: database reachable (postgres://nodemp:***@127.0.0.1:5432/nodemp), server 160009`. Пароль
заменён на `***` в каждой строке лога, в написаниях `?password=` и `password=` тоже. База
данных, недоступная при запуске, не фатальна: сервер пишет
`pg: cannot connect to postgres://nodemp:***@127.0.0.1:5432/nodemp: … (retrying in the background, 0.5 s to 30 s)`
и продолжает попытки; `node.pg.ready()` становится `true`, когда подключение удаётся, а до этого
каждый оператор сразу завершается с `08001`.

## Запросы: query и exec

`node.pg.query(sql, params?, cb?)` выполняет один оператор и отдаёт его строки;
`node.pg.exec(sql, params?, cb?)` выполняет один оператор и отдаёт только счётчик - строки,
затронутые `INSERT`, `UPDATE` или `DELETE`, или строки, которые вернул бы `SELECT`, - не
материализуя ни одной. Значения передаются параметрами `$1..$n` и никогда не склеиваются с текстом.

С колбэком, из любого обработчика - таблица `wallets` здесь та, которую создаёт
[миграция ниже](#миграции):

<!-- doctest: pg+client -->
```lua
node.on("playerJoined", function(player)
    if not player.accountId then
        return -- a Test Drive guest has no account to key a wallet by
    end

    node.pg.query("SELECT name, balance FROM wallets WHERE account_id = $1", { player.accountId },
        function(result, err)
            if err then
                node.log.warn("wallet lookup failed: %s (%s)", err.message, err.code)
                return
            end
            for _, row in ipairs(result.rows) do
                node.log("%s has %d", row.name, row.balance)
            end
        end)

    node.pg.exec("UPDATE wallets SET balance = balance + $2 WHERE account_id = $1", { player.accountId, 500 },
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

`cb(result, err)` выполняется в рабочем потоке, когда оператор завершён, как и любой другой колбэк;
ошибка, выброшенная внутри него, пишется в лог как `wallet · error in pg callback: …`. Задан ровно
один из двух аргументов. `result` - это `{ rows, count, columns }`: `rows` - массив таблиц с ключами
по именам колонок, `count` - число возвращённых (или затронутых) строк, `columns` - имена колонок по
порядку.

Без колбэка, внутри `node.async`, те же вызовы приостанавливают корутину и возвращают те же два
значения:

<!-- doctest: pg+client -->
```lua
node.on("playerJoined", function(player)
    if not player.accountId then
        return -- a Test Drive guest has no account to key a wallet by
    end
    node.async(function()
        local result, err = node.pg.query(
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

Вне корутины приостанавливающая форма не ждёт: она выбрасывает
`node.pg.query: callback required outside node.async` (`node.pg.tx: …` для транзакции). `params`,
который не таблица, `sql`, который не строка, или `cb`, который не функция, тоже выбрасывают ошибку
на вашей строке - это ошибки программирования, а не значения `err`.

Правила, которые следуют из того, как пул выполняет операторы:

- **Один оператор на вызов.** Операторы идут через расширенный протокол (`PQexecParams`), который
  принимает ровно один; `"UPDATE …; DELETE …"` завершается с `42601`. Несколько операторов, которые
  должны пройти вместе, относятся в `node.pg.tx`.
- **Никакого `BEGIN` руками.** `node.pg.exec("BEGIN")` оставил бы общее соединение внутри
  транзакции тому, кому оно достанется следующим; пул сразу откатывает её и предупреждает
  `pg: connection 0 left in a transaction by 'BEGIN', rolling back`. Используйте `node.pg.tx`.
- **Никакого состояния сессии.** `SET` (`search_path`, `timezone`, …) через `node.pg.query`
  прилипает к соединению пула, которое его выполнило, и удивляет следующий оператор на нём - из
  любого ресурса. Вместо этого приводите тип или квалифицируйте имя прямо в операторе
  (`$1::timestamptz`, `now() AT TIME ZONE 'UTC'`, `nodemp.wallets`); внутри транзакции `SET LOCAL`
  допустим - он заканчивается вместе с ней.
- Каждый оператор вне `tx` - собственная транзакция: автокоммит.

## Транзакции: tx

`node.pg.tx(fn, cb?)` резервирует одно соединение, выполняет `BEGIN`, вызывает `fn(tx)` как
корутину и заканчивает `COMMIT`, когда `fn` возвращает управление нормально, или `ROLLBACK`, когда
она выбрасывает ошибку. Внутри `fn` используйте `tx:query(sql, params?)` и `tx:exec(sql, params?)` -
только приостанавливающие формы, тот же контракт, что у `node.pg.query` и `node.pg.exec` без
колбэка, - и `tx:rollback(reason?)`, который выбрасывает ошибку из `fn` и откатывает транзакцию. Без
`cb`, внутри `node.async`, `tx` приостанавливает вызывающего и возвращает то, что вернула `fn`, или
`nil, err`; с `cb` она выполняет `fn` как собственную задачу `node.async` и вызывает `cb(...)` с теми
же значениями.

<!-- doctest: pg+client -->
```lua
-- inside node.async: tx suspends the caller and returns what fn returned, or nil, err
local function withdraw(id, amount)
    return node.pg.tx(function(tx)
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

Что возвращается:

| `fn` | Соединение | Результат |
|---|---|---|
| вернулась нормально, `COMMIT` прошёл | `COMMIT`, освобождено | возвращаемые значения `fn` |
| вернулась нормально, `COMMIT` не прошёл | откачено Postgres, освобождено | `nil, err` с SQLSTATE (отложенное ограничение, сбой сериализации, потерянное соединение) |
| выбросила `error(x)` | `ROLLBACK`, освобождено | `nil, { code = "rollback", message = <x, или x.message для таблицы>, cause = x }` |
| вызвала `tx:rollback(reason)` | `ROLLBACK`, освобождено | `nil, { code = "rollback", message = reason }` |
| пережила `[Database] TxTimeoutMs` | откачено сервером, освобождено | следующий `tx:query`/`tx:exec` и `COMMIT` отвечают `{ code = "tx_timeout" }` |
| не началась: `BEGIN` не прошёл | нет | `nil, err` - `08001`, `pg_disabled`, `pg_queue_full` или `tx_timeout`, если соединение не освободилось вовремя |

Правила:

- **Проверяйте каждый `err` внутри `fn`.** После неудавшегося оператора Postgres отказывает
  остатку транзакции с `25P02`, пока её не откатят; `error(e)` или `tx:rollback()` при первой
  неудаче - правильный ответ. `assert(tx:exec(...))` делает это одним словом: `exec` при неудаче
  возвращает `nil, err`, а `assert` выбрасывает таблицу `err`, так что SQLSTATE приходит в
  `err.cause.code`.
- **В транзакции только вызовы `tx:`.** Обычный `node.pg.query` внутри `fn` уходит на другое
  соединение, вне транзакции, и не видит её незафиксированных строк. Его приостанавливающая форма к
  тому же *ждёт* второго свободного соединения: при `Pool = 1` его нет, пока `fn` держит
  единственное, и ожидание длится до `tx_timeout` транзакции.
- **Никакого `COMMIT` или `ROLLBACK` руками.** `tx:exec("COMMIT")` заканчивает транзакцию под
  пулом: пул предупреждает `pg: transaction 3 was ended by a statement run inside it ('COMMIT'); the handle is finished`,
  дескриптор мёртв, а следующий `tx:query`, как и `COMMIT`, отправленный за вас, отвечают `25P01`.
  Возвращайтесь из `fn`, чтобы зафиксировать, выбрасывайте ошибку, чтобы откатить.
- **Коротко.** Пока выполняется `fn`, соединение недоступно всем остальным; `node.sleep` или
  `node.http.fetch` внутри `fn` тоже его держат, а `TxTimeoutMs` (по умолчанию 30 с) - жёсткий
  предел. Прочитайте нужное, решите, запишите, вернитесь.
- **Дескриптор после тайм-аута продолжает отвечать.** После того как сервер откатил транзакцию,
  каждый вызов через `tx` получает `tx_timeout`, пока `fn` не закончится; `tx` сообщает его один раз
  как исход.
- **Перезагрузка откатывает.** Выгрузка ресурса откатывает его открытые транзакции и сбрасывает их
  завершения, включая уже поставленный в очередь `COMMIT`; `fn` не возобновляется. Лог отмечает
  `wallet: 1 open transaction rolled back at unload` на уровне отладки.

## Параметры и типы результата

Параметры (`$1..$n`, текстовый формат; тип выводит сервер):

| Lua | Postgres |
|---|---|
| `nil` / `node.pg.NULL` | `NULL` (сентинел нужен внутри массива параметров, где `nil` обрывает массив) |
| `boolean` | `true`/`false` |
| integer | целое (`int8` вмещает) |
| float | `%.17g` (число с плавающей точкой) |
| `string` | как есть (текст; `NUL` внутри не поддерживается - передавайте `bytea` через `decode($1,'hex')`) |
| `table` | JSON через существующий `LuaToJson` (для `json`/`jsonb`) |

Результат - по OID колонки:

| Postgres | Lua |
|---|---|
| `bool` | boolean |
| `int2`/`int4`/`int8` | integer (Lua 5.4, 64 бита) |
| `float4`/`float8` | number |
| `numeric` | string (без потери точности; деньги храните целыми в минимальных единицах) |
| `text`/`varchar`/`uuid`/`timestamp*`/`date`/`time*`/`interval` | string (ISO-текст Postgres) |
| `json`/`jsonb` | string (декодируйте `node.json.decode`) |
| `bytea` | string (сырые байты, `PQunescapeBytea`) |
| массивы, прочее | string в текстовом виде Postgres |
| `NULL` | ключ отсутствует (`nil`) |

Строка результата - таблица `имя колонки → значение`; одноимённые колонки перекрывают друг друга
(используйте алиасы); порядок и имена - в `result.columns`.

На практике:

- **NULL.** `{ 1, nil, "x" }` отправляет *один* параметр - `nil` обрывает массив. Пишите
  `{ 1, node.pg.NULL, "x" }`. В обратную сторону ячейка `NULL` просто отсутствует: `row.col == nil`.
- **Приведение типов.** Postgres выводит тип параметра из места, где тот используется; где не может
  или ошибается - приводите: `$1::int`, `$2::jsonb`, `$3::timestamptz`, `decode($4, 'hex')::bytea`.
- **jsonb.** Передайте таблицу Lua, и она придёт текстом JSON (массив, когда её ключи `1..n`, иначе
  объект; функции становятся `null`); строка, уже содержащая JSON, тоже подходит. Обратно приходит
  текст - `node.json.decode(row.data)`.
- **Целые** остаются точными до 64 бит: `int8` за пределами 2^53 - целое Lua, а не float.
- **numeric** приходит строкой (`"12.50"`), чтобы ничего не потерялось; арифметику делайте в SQL или
  храните деньги как `bigint` в минимальных единицах (копейках) и форматируйте при показе.
- **Время.** Метки времени - текст (`2026-09-14 19:24:00.123456+03`); сравнивайте и преобразуйте в
  SQL (`extract(epoch from created_at)`, `now() - interval '7 days'`), а не разбирайте в Lua.
- **Двоичные данные.** Строка с байтом `NUL` не может быть параметром; кодируйте в hex и
  `decode($1, 'hex')`. Колонка `bytea` возвращается сырыми байтами.
- **Один оператор на вызов**, до 1000 параметров. У оператора без параметров `params` можно
  опустить: `node.pg.query(sql, cb)`, `node.pg.exec(sql)`.

## Ошибки

`err` - это `{ code, message, detail?, hint?, constraint?, table? }`. `code` - SQLSTATE, о котором
сообщил Postgres, или один из собственных кодов пула; необязательные поля есть, когда Postgres их
заполнил (`constraint` при `23505`, например).

| `err.code` | Значение | Что делать |
|---|---|---|
| `pg_disabled` | `[Database] Url` пуст; драйвер выключен. | Проверьте `node.pg.enabled()` при загрузке и работайте без этой возможности или скажите хостеру. |
| `08001` | Нет живого соединения: база данных недоступна или ещё не достигнута. Оператор, отправленный в этот момент, завершается сразу; уже ожидавший, когда пропало последнее соединение, получает её через `QueryTimeoutMs`. | Пул переподключается сам; повторите позже или следите за `node.pg.ready()`. |
| `08006` | Соединение потеряно во время выполнения оператора, или сервер останавливается. | Неизвестно, сработал ли оператор - повторяйте только через ключ идемпотентности (ниже). |
| `57014` | Оператор выполнялся дольше `[Database] QueryTimeoutMs` (`statement_timeout` Postgres). | Индекс, более узкий запрос или больший тайм-аут. |
| `23505` | Нарушение уникальности; `err.constraint` называет индекс. | Ожидаемо в шаблоне идемпотентности; или `ON CONFLICT`, когда дубликат допустим. |
| `42601` | Синтаксическая ошибка - её же получает строка с двумя операторами. | Один оператор на вызов. |
| `25P02` | Оператор после того, как более ранний внутри транзакции не прошёл. | Проверяйте каждый `err` в `fn`; выбрасывайте ошибку при первом. |
| `25P01` | Транзакция закончена `COMMIT`/`ROLLBACK`, выполненным через дескриптор. | Возвращайтесь из `fn` или выбрасывайте ошибку; никогда не заканчивайте её руками. |
| `0A000` | `COPY` не поддерживается. | `INSERT` в транзакции. |
| `pg_queue_full` | Уже ждут 1000 операторов. | Вы выдаёте быстрее, чем база данных отвечает: сбавьте темп, посмотрите строки о медленных запросах, увеличьте `Pool`. |
| `pg_result_cap` | Больше `[Database] MaxRows` строк; результат отброшен. | `LIMIT` и постраничный вывод, или `exec`, когда нужен только счётчик. |
| `pg_params` | Значение, которое драйвер не может отправить, - функция, корутина, userdata кроме `node.pg.NULL`, строка с `NUL`, таблица, которую JSON не кодирует, - или больше 1000 параметров. | Исправьте таблицу параметров. |
| `rollback` | `fn` выбросила ошибку (`message`, а выброшенное значение в `cause`) или вызвала `tx:rollback(reason)`. | Ваше собственное решение; SQLSTATE, который к этому привёл, - в `err.cause.code`. |
| `tx_timeout` | Транзакция пережила `[Database] TxTimeoutMs` и откачена, или `BEGIN` столько ждал свободного соединения. | Более короткие транзакции, никаких других приостановок внутри `fn`, больший `Pool`. |
| `pg_reload` | Никогда не доставляется. Ресурс, выгруженный, пока оператор в полёте, никогда не видит свой колбэк, а его приостановленная корутина не возобновляется. | Проектируйте так, чтобы потерянное завершение было безвредно: правда в базе данных, перечитайте её при загрузке. |

Перезагрузка или остановка между отправкой оператора и его завершением молча сбрасывает завершение
(`async completion 42 dropped: its resource was unloaded and the callback went with it` на уровне
отладки) - сам оператор вполне мог выполниться. Поэтому записи, которые не должны случиться дважды,
несут ключ.

### Идемпотентность через уникальный ключ

`08006`, сброшенное завершение или игрок, нажавший дважды, оставляют вас в неведении, случилась ли
запись. Заставьте базу данных отказать повтору: дайте каждой записи ключ, уникальный для задуманного
действия, храните его в колонке `UNIQUE` и считайте `23505` на этом ограничении «уже сделано».

<!-- doctest: pg -->
```lua
-- the first statement of the transfer's fn; key: made once, before the first
-- attempt, and reused by every retry
local function recordTransfer(tx, key, fromId, toId, amount)
    local _, err = tx:exec(
        "INSERT INTO ledger (idem_key, from_id, to_id, amount) VALUES ($1, $2, $3, $4)",
        { key, fromId, toId, amount })
    if err then
        if err.code == "23505" and err.constraint == "ledger_idem_key_key" then
            tx:rollback("already applied") -- the retry of a transfer that went through
        end
        error(err)
    end
end
```

`ledger_idem_key_key` - имя, которое Postgres даёт ограничению `idem_key text UNIQUE`; назовите его
сами (`CONSTRAINT ledger_idem UNIQUE (idem_key)`), если не хотите от этого зависеть. Вставка идёт
первой в транзакции, так что дубликату отказывают до того, как сдвинется какой-либо баланс.

## Миграции

Сервер не управляет вашей схемой; ресурс создаёт и обновляет свои таблицы сам при загрузке. Две
вещи делают это безопасным, когда несколько экземпляров сервера делят одну базу данных или ресурс
перезагружается, пока другая копия ещё стартует: консультативная блокировка на время транзакции,
чтобы мигратор выполнялся только один, и таблица `schema_migrations`, которая записывает, до какой
версии дошёл каждый ресурс.

<!-- doctest: pg -->
```lua
local MIGRATIONS = {
    "CREATE TABLE wallets (account_id bigint PRIMARY KEY, name text NOT NULL, balance bigint NOT NULL DEFAULT 0)",
    "CREATE TABLE ledger (id bigserial PRIMARY KEY, idem_key text UNIQUE NOT NULL, from_id bigint, to_id bigint, " ..
        "amount bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now())",
}

local function migrate()
    return node.pg.tx(function(tx)
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

`pg_advisory_xact_lock`, а не `pg_advisory_lock`, потому что блокировка на время транзакции
снимается при `COMMIT`/`ROLLBACK`; блокировка уровня сессии осталась бы на соединении пула после
конца `tx` и держала бы следующий мигратор, пока это соединение не закроется. Всё выполняется в одной
транзакции, так что неудавшаяся миграция оставляет схему и версию как были, а вся пачка ограничена
`TxTimeoutMs` - длинное заполнение данных разбивайте на отдельные шаги. Дописывайте в `MIGRATIONS`,
никогда не правьте запись, которая где-то уже выполнилась.

Запускайте при загрузке, когда пул доступен, и ставьте остальной ресурс в зависимость от результата:

<!-- doctest: pg {"with": [5]} -->
```lua
local schemaReady = false

node.async(function()
    if not node.pg.enabled() then
        node.log.warn("no [Database] Url: the wallet is off")
        return
    end
    node.wait(node.pg.ready, 500) -- the database may still be connecting at start
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

- **Рабочий поток никогда не ждёт, но очередь может расти.** Каждый оператор ставится в очередь и
  выполняется первым свободным соединением; предел - 1000 ожидающих операторов (`pg_queue_full`).
  Запрос на каждый `serverTick` (10 Гц) или на каждое обновление позиции машины переполняет её -
  опрашивайте по таймеру, группируйте записи, кэшируйте редко меняющиеся чтения и никогда не
  приостанавливайте горячий обработчик на запросе.
- **Размер пула.** `[Database] Pool` (по умолчанию 4) - число операторов в полёте одновременно, и
  каждая `node.pg.tx` держит одно соединение всю свою жизнь. Увеличивайте его, когда растёт
  `queueDepth` или транзакции ждут `BEGIN`; соединение PostgreSQL - это процесс на стороне базы
  данных, так что до сотен его не поднимайте.
- **Тайм-ауты.** `QueryTimeoutMs` (по умолчанию 10 с) ограничивает оператор, `TxTimeoutMs` (по
  умолчанию 30 с) - транзакцию. Оба - защита, а не бюджет: оператор, близкий к любому из них, -
  оператор, который нужно починить.
- **Медленные запросы** пишутся в лог: `pg: slow query (312 ms): SELECT …` для всего, что дольше
  250 мс, SQL обрезан до 200 символов, параметры не пишутся никогда. Читайте их как список дел по
  индексам.
- **`MaxRows`** (по умолчанию 10 000) отбрасывает больший результат с `pg_result_cap` - `LIMIT` и
  постраничный вывод (по ключу: `WHERE id > $1 ORDER BY id LIMIT 100`) или `exec`, когда нужен
  только счётчик.
- **Никакого состояния сессии** через `node.pg.query` (`SET`, `pg_advisory_lock`, временные таблицы,
  подготовленные операторы): каждый оператор может попасть на другое соединение, а всё, что он
  оставит после себя, - проблема следующего оператора.
- **Метрики.** `node.server.metrics().plugin.pg` - это
  `{ enabled, ready, queries, errors, p50Ms, p95Ms, queueDepth, connections, transactions, deadTransactions }`:
  выполненные и неудавшиеся операторы, задержка по последним 512 операторам, ожидающие операторы,
  живые соединения, открытые транзакции и дескрипторы, которые пул закончил сам, а их владелец ещё не
  завершил. При выключенном драйвере блок - просто `{ enabled = false }`. Пишите в лог или
  экспортируйте по таймеру.
- **Чтения, которым можно быть устаревшими,** живут в памяти: загрузите при старте, обновляйте по
  таймеру, записывайте сквозь. Обращение к базе данных на каждое сообщение чата - нормально; на
  каждый кадр физики - нет.

## Полный пример: переводы в кошельке

Ресурс `wallet` с балансом на аккаунт, журналом, `/balance` и `/pay <player> <coins>`. Балансы -
`bigint` в копейках; перевод - одна транзакция, которая вставляет строку журнала под ключом
идемпотентности, блокирует оба кошелька в порядке идентификаторов, проверяет средства и переносит
их. Блок миграции сверху здесь - `migrate()`.

```toml
name = "wallet"
version = "1.0.0"

[server]
main = "server/main.lua"
```

<!-- doctest: pg+client {"players": ["Alice", "Bob"], "emit": [["chat:send", {"text": "/balance"}], ["chat:send", {"text": "/pay Bob 5"}]]} -->
```lua
-- resources/wallet/server/main.lua
local schemaReady = false

local MIGRATIONS = {
    "CREATE TABLE wallets (account_id bigint PRIMARY KEY, name text NOT NULL, balance bigint NOT NULL DEFAULT 0)",
    "CREATE TABLE ledger (id bigserial PRIMARY KEY, idem_key text UNIQUE NOT NULL, from_id bigint, to_id bigint, " ..
        "amount bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now())",
}

local function migrate()
    return node.pg.tx(function(tx)
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
    return node.pg.tx(function(tx)
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
    node.pg.exec("INSERT INTO wallets (account_id, name) VALUES ($1, $2) " ..
        "ON CONFLICT (account_id) DO UPDATE SET name = EXCLUDED.name",
        { player.accountId, player.name }, function(_, err)
            if err then
                node.log.warn("wallet for %s: %s", player.name, err.message)
            end
        end)
end)

node.commands.add("balance", function(player)
    if not player.accountId or not schemaReady then
        player:tell("No wallet: sign in with a NodeMP account")
        return
    end
    node.pg.query("SELECT balance FROM wallets WHERE account_id = $1", { player.accountId },
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
end)

node.commands.add("pay", function(player, args)
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
end)

node.async(function()
    if not node.pg.enabled() then
        node.log.warn("no [Database] Url: the wallet is off")
        return
    end
    node.wait(node.pg.ready, 500)
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

Что даёт такая форма: вставка в журнал идёт первой, так что повтор с тем же ключом останавливается
на `23505` до того, как что-то сдвинется, и игроку говорят «already applied», а не списывают дважды;
`FOR UPDATE` в фиксированном порядке выстраивает два перевода между одной парой без взаимной
блокировки; проверка баланса читает заблокированные строки, так что ни один параллельный перевод не
проскочит между чтением и записью; `assert` на каждом операторе превращает любую ошибку SQL в откат,
SQLSTATE которого вызывающий всё ещё может записать в лог из `err.cause.code`; а повтор при `08006` -
единственный повтор, потому что это единственный случай, когда исход неизвестен. Суммы - целые на
всём пути: база данных никогда не видит float, игрок никогда не видит ошибку округления.

## Дальше

- [Справочник Lua API: node.pg](/ru/plugins/api/lua/#nodepg--postgresql) - каждый вызов с
  сигнатурой и полный список ошибок.
- [Конфигурация: `[Database]`](/ru/hosting/configuration/#database) - пять ключей, которые задаёт
  хостер.
- [Конкурентность](/ru/plugins/concurrency/) - рабочий поток, `node.async` и почему колбэки
  выглядят именно так.
- [Ресурсы](/ru/plugins/resources/#состояние-nodestorage) - `node.storage`, для данных, которым база
  данных не нужна.
