---
title: Доступ к базе данных
description: Настоящая база данных из ресурса через модуль db - установка, query/exec/tx, типы параметров и результата, ошибки, миграции, производительность, пример кошелька.
---

База данных - это модуль, а не часть сервера. `modules/db.dll` (`db.so` на Linux) владеет
соединениями и раздаёт их ресурсам через шину ресурсов; небольшая библиотека `db.lua` путешествует
вместе с вашим ресурсом и прячет шину за `db:query`, `db:exec` и `db:tx`. PostgreSQL, SQLite и
MySQL/MariaDB стоят за этим единственным интерфейсом, подстановки - `$1..$n` на любом движке, а
значение никогда не попадает в текст оператора. Рабочий поток ничего не ждёт: оператор выполняется
в потоке базы данных, а его исход возвращается колбэком или возобновляет вашу корутину.

По релиз 1.2.1 включительно это был `node.pg` в ядре. Больше нет - движок, его клиентская
библиотека и его пул не то, ради чего существует игровой сервер, - так что сервер, который к базе
данных никогда не обращается, больше её с собой не носит. [Миграция с node.pg](#миграция-с-nodepg)
в конце этой страницы - и есть вся разница.

## node.storage или база данных

Оба хранят данные; нужды у них разные.

| | `node.storage` | модуль `db` |
|---|---|---|
| Где | JSON-файл на ресурс в `storage/`, целиком в памяти | PostgreSQL, SQLite или MySQL |
| Настройка | не нужна | хост устанавливает модуль и даёт соединению имя |
| Чтение | синхронное, из памяти | асинхронное: колбэк или приостановленная корутина |
| Форма | ключ - значение | таблицы, индексы, `WHERE`, `ORDER BY`, `SUM` |
| Несколько записей как одна | нет | `db:tx` |
| Общий доступ | один ресурс | все ресурсы сервера, другие серверы, ваши собственные инструменты |
| Размер | сколько помещается в память | сколько помещается на диск базы данных |

Используйте `node.storage` для настроек, счётчиков и отметок «последний раз видели». Используйте
модуль, когда данные делят несколько ресурсов или несколько серверов, когда вы их запрашиваете
(десятка лучших, сумма, фильтр), когда деньгам или инвентарю нужна транзакция или когда данные
перерастают память. Ресурс, который работает и на серверах без базы данных, один раз проверяет это
при загрузке и работает в урезанном режиме: когда соединения с таким именем нет, каждый вызов
отвечает `db_disabled`.

## Установка модуля

Эта часть - для хоста. Соберите модуль один раз, положите его рядом с сервером и дайте ему
`db.toml`:

```bash
cmake -S plugins/db -B build/db -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_TOOLCHAIN_FILE=<vcpkg>/scripts/buildsystems/vcpkg.cmake \
      -DVCPKG_TARGET_TRIPLET=x64-windows-static
cmake --build build/db
```

```
Node-Server.exe
modules/db.dll          <- the module
modules/db.toml         <- its configuration
```

Каждый движок - это опция (`-DNODE_DB_POSTGRES=OFF`, `-DNODE_DB_SQLITE=OFF`,
`-DNODE_DB_MYSQL=OFF`), и выключенный движок убирает свою зависимость целиком. Собирайте
статически: сервер загружает **каждую** библиотеку из `modules/` и сообщает о каждой, которую не
может использовать, так что оставленный рядом с модулем `libpq.dll` - строка ошибки при каждом
запуске.

`modules/db.toml` задаёт по одному пулу на секцию:

```toml
[connections.default]
driver = "postgres"                              # postgres | sqlite | mysql
url = "postgres://nodemp:change-me@127.0.0.1:5432/nodemp"
connections = 4                                  # 1..32, one thread each
query_timeout_ms = 10000
tx_timeout_ms = 30000
max_rows = 10000

[connections.stats]                              # a second pool, asked for by name
driver = "sqlite"
url = "data/stats.db"
connections = 1
```

Секрет не обязательно лежит в файле: `NODE_DB_<NAME>_URL` перекрывает `url` этого соединения
(`NODE_DB_DEFAULT_URL` для того, что выше, и имя заглавными для любого другого), а если в файле нет
ни одного годного соединения — или файла нет вовсе — модуль открывает одно соединение с
именем `default` из `NODE_DB_URL` - или из `NODE_DATABASE_URL`, переменной, которую сервер
использовал, пока база данных была его частью. `driver` можно не указывать: URL `postgres://` или
`mysql://` сам скажет, что он такое, а всё остальное считается путём к файлу SQLite.

Консоль подтверждает каждый пул при запуске:

```
Db     › connection 'default': postgres, 4 connection(s)
Db     › db[default]: connected to postgres://nodemp:***@127.0.0.1:5432/nodemp (PostgreSQL 16.9)
```

Пароль не попадает в лог никогда, в написаниях `?password=` и `password=` тоже. Соединения
устанавливаются в фоне с повторами (от 0,5 с до 30 с между попытками), так что сервер запускается и
работает, пока база данных недоступна; операторы до её ответа завершаются с `08001`.

### Движки

**PostgreSQL** - эталон: `$1..$n` и SQLSTATE у него свои, `statement_timeout` на соединение,
отдельный канал отмены, которым пользуется слив очереди при остановке. Ставится обычным способом -

```bash
sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE ROLE nodemp LOGIN PASSWORD 'change-me';" \
                      -c "CREATE DATABASE nodemp OWNER nodemp;"
```

или в Docker (`postgres:16-alpine`, три переменные `POSTGRES_*` создают роль и базу данных). Роль
владеет своей базой данных и ничем больше; никогда не отдавайте серверу суперпользователя. Для базы
данных на другой машине добавьте `?sslmode=require`, чтобы пароль и данные не шли по сети открытым
текстом.

**SQLite** не требует установки: `url = "data/server.db"` - вся настройка, а файл создаётся при
первом обращении. На каждом соединении включаются WAL и `foreign_keys = ON`, `$n` переписывается в
`?n`, а транзакция открывается через `BEGIN IMMEDIATE`, так что конфликт записи случается в её
начале, а не в середине. `:memory:` своя у каждого соединения, поэтому в таком пуле принудительно
остаётся одно соединение.

**MySQL / MariaDB** переписывает `$n` в позиционные `?` (параметр, использованный дважды,
отправляется дважды: MySQL не умеет переиспользовать один) и не умеет отменять по соединению,
поэтому слив очереди при остановке открывает второе соединение и выполняет `KILL QUERY`.

SQL в примерах ниже там, где иначе нельзя, - диалекта PostgreSQL (`bigserial`, `timestamptz`,
`pg_advisory_xact_lock`); модуль не переводит SQL, только подстановки.

## Использование из ресурса

Скопируйте `plugins/db/lua/db.lua` рядом со своим `main.lua`, добавьте собственную папку в путь Lua
так же, как это делает любой многофайловый ресурс, и откройте соединение по имени:

<!-- doctest: skip the opening lines every db block below runs with -->
```lua
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]")
package.path = here .. "/?.lua;" .. package.path

local db = require("db").open()          -- the "default" connection
local stats = require("db").open("stats")
```

Открытие ничего не стоит - соединение при нём не устанавливается, пул у модуля уже есть, - а
неизвестное имя не становится ошибкой до первого оператора, который отвечает `db_disabled` и
называет его.

## Запросы: query и exec

`db:query(sql, params?, cb?)` выполняет один оператор и отдаёт его строки;
`db:exec(sql, params?, cb?)` выполняет один оператор и отдаёт только счётчик - строки, затронутые
`INSERT`, `UPDATE` или `DELETE`, или строки, которые вернул бы `SELECT`, - не перенося обратно ни
одной строки. Значения передаются параметрами `$1..$n` и никогда не склеиваются с текстом.

С колбэком, из любого обработчика - таблица `wallets` здесь та, которую создаёт
[миграция ниже](#миграции):

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

`cb(result, err)` выполняется в рабочем потоке, когда оператор завершён, как и любой другой колбэк.
Задан ровно один из двух аргументов. `result` - это `{ rows, count, columns }`: `rows` - массив
таблиц с ключами по именам колонок, `count` - число возвращённых (или затронутых) строк, `columns` -
имена колонок по порядку.

Без колбэка, внутри `node.async`, те же вызовы приостанавливают корутину и вместо этого возвращают
эти два значения:

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

Под приостанавливающей формой лежит `node.suspend`: библиотека готовит приём ответа, и корутина
продолжается, когда он приходит. Вне корутины она не ждёт - пишет в лог `node.suspend called
outside a node.async task` и не возвращает ничего, - так что из обычного обработчика передавайте
колбэк.

Правила, которые следуют из того, как пул выполняет операторы:

- **Один оператор на вызов.** Каждый оператор подготавливается и выполняется со связанными
  параметрами; `"UPDATE …; DELETE …"` - синтаксическая ошибка (`42601`). Несколько операторов,
  которые должны пройти вместе, относятся в `db:tx`.
- **Никакого `BEGIN` руками.** Он оставил бы общее соединение внутри транзакции тому, кому оно
  достанется следующим; пул сразу откатывает её и предупреждает `db[default]: connection 0 left in
  a transaction by 'BEGIN', rolling back`. Используйте `db:tx`.
- **Никакого состояния сессии.** `SET` (`search_path`, `timezone`, …) через `db:query` прилипает к
  соединению пула, которое его выполнило, и удивляет следующий оператор на нём - из любого ресурса.
  Вместо этого приводите тип или квалифицируйте имя прямо в операторе (`$1::timestamptz`,
  `nodemp.wallets`); внутри транзакции `SET LOCAL` допустим - он заканчивается вместе с ней.
- Каждый оператор вне `tx` - собственная транзакция: автокоммит.

## Транзакции: tx

`db:tx(fn, cb?)` резервирует одно соединение, выполняет `BEGIN`, вызывает `fn(tx)` как корутину и
заканчивает `COMMIT`, когда `fn` возвращает управление нормально, или `ROLLBACK`, когда она
выбрасывает ошибку. Внутри `fn` используйте `tx:query(sql, params?)` и `tx:exec(sql, params?)` -
только приостанавливающие формы, тот же контракт, что у `db:query` и `db:exec` без колбэка, - и
`tx:rollback(reason?)`, который выбрасывает ошибку из `fn` и откатывает транзакцию. Без `cb`, внутри
`node.async`, `tx` приостанавливает вызывающего и возвращает то, что вернула `fn`, или `nil, err`; с
`cb` она выполняет `fn` как собственную задачу `node.async` и вызывает `cb(...)` с теми же
значениями.

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

Что возвращается:

| `fn` | Соединение | Результат |
|---|---|---|
| вернулась нормально, `COMMIT` прошёл | `COMMIT`, освобождено | возвращаемые значения `fn` |
| вернулась нормально, `COMMIT` не прошёл | откачено движком, освобождено | `nil, err` с SQLSTATE (отложенное ограничение, сбой сериализации, потерянное соединение) |
| выбросила `error(x)` | `ROLLBACK`, освобождено | `nil, { code = "rollback", message = <x, или x.message для таблицы>, cause = x }` |
| вызвала `tx:rollback(reason)` | `ROLLBACK`, освобождено | `nil, { code = "rollback", message = reason }` |
| пережила `tx_timeout_ms` | откачено модулем, освобождено | следующий `tx:query`/`tx:exec` и `COMMIT` отвечают `{ code = "db_tx_timeout" }` |
| не началась: `BEGIN` не прошёл | нет | `nil, err` - `08001`, `db_disabled`, `db_queue_full` или `db_tx_timeout`, если соединение не освободилось вовремя |

Правила:

- **Проверяйте каждый `err` внутри `fn`.** После неудавшегося оператора PostgreSQL отказывает
  остатку транзакции с `25P02`, пока её не откатят; `error(e)` или `tx:rollback()` при первой
  неудаче - правильный ответ на любом движке. `assert(tx:exec(...))` делает это одним словом:
  `exec` при неудаче возвращает `nil, err`, а `assert` выбрасывает таблицу `err`, так что SQLSTATE
  приходит в `err.cause.code`.
- **В транзакции только вызовы `tx:`.** Обычный `db:query` внутри `fn` уходит на другое соединение,
  вне транзакции, и не видит её незафиксированных строк. Его приостанавливающая форма к тому же
  *ждёт* второго свободного соединения: при `connections = 1` его нет, пока `fn` держит
  единственное, и ожидание длится до `db_tx_timeout` транзакции.
- **Никакого `COMMIT` или `ROLLBACK` руками.** `tx:exec("COMMIT")` заканчивает транзакцию под
  пулом: он предупреждает `db[default]: transaction 3 was ended by a statement run inside it
  ('COMMIT'); the handle is finished`, дескриптор мёртв, а следующий `tx:query`, как и `COMMIT`,
  отправленный за вас, отвечают `25P01`. Возвращайтесь из `fn`, чтобы зафиксировать, выбрасывайте
  ошибку, чтобы откатить.
- **Коротко.** Пока выполняется `fn`, соединение недоступно всем остальным; `node.sleep` или
  `node.http.fetch` внутри `fn` тоже его держат, а `tx_timeout_ms` (по умолчанию 30 с) - жёсткий
  предел. Прочитайте нужное, решите, запишите, вернитесь.
- **Законченный дескриптор продолжает отвечать.** После того как модуль сам откатил транзакцию - по
  сроку, из-за потерянного соединения, из-за выгрузки ниже, - каждый вызов через `tx` получает
  причину (`db_tx_timeout`, `08006`, `db_tx_aborted`), а не пожатие плечами, пока `fn` не кончится.
- **Перезагрузка откатывает.** `db.lua` сообщает об этом модулю на `resourceUnload`, так что
  ресурс, перезагруженный или остановленный с открытой транзакцией, освобождает соединение сразу, а
  не держит его до `tx_timeout_ms`. `fn` не возобновляется.

## Параметры и типы результата

Параметры (`$1..$n`, передаются значениями и никогда не вклеиваются в текст):

| Lua | Как отправляется |
|---|---|
| `require("db").NULL` (и, с текущим `db.lua` из репозитория examples, `db.NULL` на соединении) | `NULL` (сентинел нужен внутри массива параметров, где `nil` обрывает массив) |
| `boolean` | `true`/`false` |
| integer | целое (64 бита) |
| float | число с плавающей точкой (`%.17g`) |
| `string` | как есть (текст) |
| `table` | JSON (для колонки `json`/`jsonb`) |

Результат - по типу колонки:

| Колонка | Lua |
|---|---|
| boolean | boolean |
| целое (`int2`/`int4`/`int8`, `INTEGER` в SQLite) | integer, точное до 64 бит |
| с плавающей точкой (`float4`/`float8`, `REAL` в SQLite) | number |
| `numeric` | string (без потери точности; деньги храните целыми в минимальных единицах) |
| текст, `uuid`, метки времени, даты, интервалы | string (текстовая форма движка) |
| `json`/`jsonb` | string (декодируйте `node.json.decode`) |
| `bytea` / `BLOB` | string из сырых байтов |
| массивы, всё остальное | string в текстовом виде движка |
| `NULL` | ключ отсутствует (`nil`) |

Строка результата - таблица `имя колонки → значение`; одноимённые колонки перекрывают друг друга
(используйте алиасы); порядок и имена - в `result.columns`.

На практике:

- **NULL.** В `{ 1, nil, "x" }` на месте `$2` дыра - `nil` обрывает массив, - и `db.lua` такой список
  отвергает (`db: params has a hole at #2`). Сентинел живёт на **таблице модуля**:
  `local dbm = require("db")` ... `{ 1, dbm.NULL, "x" }`; текущий `db.lua` из репозитория examples
  выставляет его и на каждом соединении, так что `db.NULL` при `db`-соединении там тот же объект (в копии
  из архива 1.3.0 это `nil` - SQLite тогда случайно биндит NULL, PostgreSQL отвечает `08P01`). С явной
  длиной, `{ 1, nil, "x", n = 3 }`,
  `nil` уходит как NULL. В обратную сторону ячейка `NULL` просто
  отсутствует: `row.col == nil`.
- **Приведение типов.** PostgreSQL выводит тип параметра из места, где тот используется; где не
  может или ошибается - приводите: `$1::int`, `$2::jsonb`, `$3::timestamptz`.
- **jsonb.** Передайте таблицу Lua, и она придёт текстом JSON (массив, когда её ключи `1..n`, иначе
  объект); строка, уже содержащая JSON, тоже подходит. Обратно приходит текст -
  `node.json.decode(row.data)`.
- **Целые** остаются точными до 64 бит: `int8` за пределами 2^53 - целое Lua, а не float.
- **numeric** приходит строкой (`"12.50"`), чтобы ничего не потерялось; арифметику делайте в SQL или
  храните деньги как `bigint` в минимальных единицах (копейках) и форматируйте при показе.
- **Время.** Метки времени - текст (`2026-09-14 19:24:00.123456+03`); сравнивайте и преобразуйте в
  SQL (`extract(epoch from created_at)`, `now() - interval '7 days'`), а не разбирайте в Lua.
- **Один оператор на вызов**, до 1000 параметров. У оператора без параметров `params` можно
  опустить: `db:query(sql, cb)`, `db:exec(sql)`.

## Ошибки

`err` - это `{ code, message, detail?, hint?, constraint?, table? }`. `code` - это SQLSTATE, о
котором сообщил движок, - два других движка отображены на коды PostgreSQL, так что одна проверка
работает везде, - или один из собственных кодов модуля; необязательные поля есть, когда движок их
заполнил (`constraint` при `23505`, например).

| `err.code` | Значение | Что делать |
|---|---|---|
| `db_disabled` | Соединения с таким именем нет: записи в `db.toml` нет или её `url` пуст. | Проверьте при загрузке и работайте в урезанном режиме или скажите хосту. |
| `08001` | Нет живого соединения: база данных недоступна или ещё не достигнута. | Пул переподключается сам; повторите позже или дождитесь `db:ready()`. |
| `08006` | Соединение потеряно во время выполнения оператора, или сервер останавливается. | Неизвестно, сработал ли оператор, - повторяйте только через ключ идемпотентности (ниже). |
| `57014` | Оператор выполнялся дольше `query_timeout_ms` (а также тайм-аут занятости SQLite). | Индекс, более узкий запрос или больший тайм-аут. |
| `23505` | Нарушение уникальности; `err.constraint` называет индекс. | Ожидаемо в шаблоне идемпотентности; или `ON CONFLICT`, когда дубликат допустим. |
| `23503` / `23502` / `23514` | Внешний ключ, NOT NULL, CHECK. | Ошибка в записи или в схеме. |
| `42601` / `42P01` | Синтаксическая ошибка - её же получает строка с двумя операторами - и «нет такой таблицы». | Один оператор на вызов; сначала выполните свои миграции. |
| `40001` / `40P01` | Сбой сериализации, взаимная блокировка. | Повторите транзакцию целиком; блокируйте строки в фиксированном порядке (как делает пример кошелька). |
| `25P02` | Оператор после того, как более ранний внутри транзакции не прошёл. | Проверяйте каждый `err` в `fn`; выбрасывайте ошибку при первом. |
| `25P01` | Транзакция закончена `COMMIT`/`ROLLBACK`, выполненным через дескриптор. | Возвращайтесь из `fn` или выбрасывайте ошибку; никогда не заканчивайте её руками. |
| `db_queue_full` | Уже ждут 1000 операторов. | Вы выдаёте быстрее, чем база данных отвечает: сбавьте темп, посмотрите строки о медленных операторах, увеличьте `connections`. |
| `db_result_cap` | Строк больше, чем `max_rows`; результат отброшен. | `LIMIT` и постраничный вывод, или `exec`, когда нужен только счётчик. |
| `db_tx_timeout` | Транзакция пережила `tx_timeout_ms` и откачена, или `BEGIN` столько ждал свободного соединения. | Более короткие транзакции, никаких других приостановок внутри `fn`, больше соединений. |
| `db_tx_aborted` | Транзакция откачена, потому что её ресурс выгрузили. | Ничего: ресурс уходит. Перечитайте базу данных при загрузке. |
| `0A000` | Драйвер движка не поддерживает то, что просит оператор (например, `COPY`). | Скажите иначе — `INSERT` внутри транзакции вместо `COPY`. |
| `db_params` | Значение, которое модуль не может отправить, или больше 1000 параметров. | Исправьте таблицу параметров. |
| `rollback` | `fn` выбросила ошибку (`message`, а выброшенное значение в `cause`) или вызвала `tx:rollback(reason)`. | Ваше собственное решение; SQLSTATE, который к этому привёл, - в `err.cause.code`. |

Перезагрузка или остановка между отправкой оператора и его ответом сбрасывает ответ: колбэк не
выполняется, а приостановленная корутина не возобновляется - сам оператор вполне мог выполниться.
Поэтому записи, которые не должны случиться дважды, несут ключ.

### Идемпотентность через уникальный ключ

`08006`, сброшенный ответ или игрок, нажавший дважды, оставляют вас в неведении, случилась ли
запись. Заставьте базу данных отказать повтору: дайте каждой записи ключ, уникальный для задуманного
действия, храните его в колонке `UNIQUE` и считайте `23505` на этом ограничении «уже сделано».

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

Вставка идёт первой в транзакции, так что дубликату отказывают до того, как сдвинется какой-либо
баланс. На PostgreSQL `err.constraint` говорит, *какой* именно уникальный индекс отказал, - это
стоит проверять, когда у таблицы их несколько.

## Миграции

Сервер не управляет вашей схемой; ресурс создаёт и обновляет свои таблицы сам при загрузке. Две
вещи делают это безопасным, когда несколько экземпляров сервера делят одну базу данных или ресурс
перезагружается, пока другая копия ещё стартует: консультативная блокировка на время транзакции,
чтобы мигратор выполнялся только один, и таблица `schema_migrations`, которая записывает, до какой
версии дошёл каждый ресурс.

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

`pg_advisory_xact_lock`, а не `pg_advisory_lock`, потому что блокировка на время транзакции
снимается при `COMMIT`/`ROLLBACK`; блокировка уровня сессии осталась бы на соединении пула после
конца `tx` и держала бы следующий мигратор, пока это соединение не закроется. (В SQLite строка с
блокировкой не нужна и неизвестна: один пишущий за раз - собственное правило движка.) Всё
выполняется в одной транзакции, так что неудавшаяся миграция оставляет схему и версию как были, а
вся пачка ограничена `tx_timeout_ms` - длинное заполнение данных разбивайте на отдельные шаги.
Дописывайте в `MIGRATIONS`, никогда не правьте запись, которая где-то уже выполнилась.

Запускайте её при загрузке, как только соединение отвечает, и ставьте остальной ресурс в
зависимость от результата:

<!-- doctest: db {"with": [5]} -->
```lua
local schemaReady = false

node.async(function()
    if not db:ready() then
        node.wait(function() return db:ready() end, 500) -- it may still be connecting at start
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

- **Рабочий поток никогда не ждёт, но очередь может расти.** Каждый оператор ставится в очередь и
  выполняется первым свободным соединением; предел - 1000 ожидающих операторов (`db_queue_full`).
  Оператор на каждый `serverTick` (10 Гц) или на каждое обновление позиции машины переполняет её -
  опрашивайте по таймеру, группируйте записи, кэшируйте редко меняющиеся чтения и никогда не
  приостанавливайте горячий обработчик на запросе.
- **Размер пула.** `connections` (по умолчанию 4) - число операторов в полёте одновременно, и каждая
  `db:tx` держит одно соединение всю свою жизнь. Увеличивайте его, когда растёт `queueDepth` или
  транзакции ждут `BEGIN`; соединение PostgreSQL - это процесс на стороне базы данных, так что до
  сотен его не поднимайте. Пул SQLite пишет по одному за раз, что бы вы ни задали.
- **Тайм-ауты.** `query_timeout_ms` (по умолчанию 10 с) ограничивает оператор, `tx_timeout_ms` (по
  умолчанию 30 с) - транзакцию. Оба - защита, а не бюджет: оператор, близкий к любому из них, -
  оператор, который нужно починить.
- **Медленные операторы** пишутся в лог: `db[default]: slow statement (312 ms): SELECT …` для всего,
  что дольше 250 мс, SQL обрезан, параметры не пишутся никогда. Читайте их как список дел по
  индексам.
- **`max_rows`** (по умолчанию 10 000) отбрасывает больший результат с `db_result_cap` - `LIMIT` и
  постраничный вывод (по ключу: `WHERE id > $1 ORDER BY id LIMIT 100`) или `exec`, когда нужен
  только счётчик.
- **Никакого состояния сессии** через `db:query` (`SET`, консультативные блокировки, временные
  таблицы): каждый оператор может попасть на другое соединение, а всё, что он оставит после себя, -
  проблема следующего оператора.
- **Счётчики.** `db:status()` отвечает одной таблицей про ВСЕ соединения модуля, по именам и
  независимо от того, через какой дескриптор её спросили; каждая запись:
  `{ driver, enabled, ready, queries, errors, p50Ms, p95Ms, queueDepth, connections, transactions,
  deadTransactions }` - выполненные и неудавшиеся операторы, задержка по последним 512, ожидающие
  операторы, живые соединения, открытые транзакции и дескрипторы, которые пул закончил сам, а их
  владелец ещё не завершил. Пишите в лог или экспортируйте по таймеру.
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

`db.lua` лежит рядом с `main.lua` в `server/`.

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

node.commands.add("balance", function(player)
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
    node.wait(function() return db:ready() end, 500)
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

## Миграция с node.pg

Вызовы той же формы, так что большая часть работы механическая:

| Было | Стало |
|---|---|
| `node.pg.query/exec/tx` | `db:query/exec/tx` на соединении из `require("db").open()` |
| `node.pg.NULL` | `require("db").NULL` (или `db.NULL` на соединении с текущим `db.lua`) |
| `node.pg.enabled()` | ушло: отсутствующее соединение отвечает `db_disabled` на первом операторе |
| `node.pg.ready()` | `db:ready()` (приостанавливающий или с колбэком, как и всё остальное) |
| `node.server.metrics().plugin.pg` | `db:status()` |
| `[Database]` в `server.toml` | `[connections.default]` в `modules/db.toml` |
| `NODE_DATABASE_URL` | `NODE_DB_URL` (старое имя ещё работает) |
| `pg_disabled`, `pg_queue_full`, `pg_result_cap`, `tx_timeout`, `pg_params` | `db_disabled`, `db_queue_full`, `db_result_cap`, `db_tx_timeout`, `db_params` |
| `pg_*` в C ABI | ушли. ABI - мажор 2; пересоберите каждый нативный модуль |

Два отличия помимо переименований, о которых стоит знать: ответ оператора теперь идёт по шине
ресурсов в виде JSON, так что колонка `bytea` приходит текстом, а не сырыми байтами в строжайшем
смысле слова, и `db.lua` нужно скопировать в каждый ресурс, который им пользуется, - глобального
`db` нет.

## Дальше

- [Конфигурация](/ru/hosting/configuration/) - собственные ключи сервера; ключи базы данных живут в
  `modules/db.toml`.
- [Нативные модули](/ru/plugins/native-modules/) - что такое модуль и как он говорит с ресурсами.
- [Конкурентность](/ru/plugins/concurrency/) - рабочий поток, `node.async`, `node.suspend` и почему
  колбэки выглядят именно так.
- [Ресурсы](/ru/plugins/resources/#состояние-nodestorage) - `node.storage`, для данных, которым база
  данных не нужна.
