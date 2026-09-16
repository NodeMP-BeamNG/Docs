---
title: Database access
description: PostgreSQL from a resource with node.pg - host setup, query/exec/tx, parameter and result types, errors, migrations, performance, wallet example.
---

`node.pg` gives a resource asynchronous access to the host's PostgreSQL: parameterised
statements, transactions on one reserved connection, a pool of connections, and errors as tables
with the SQLSTATE in them. Nothing blocks the worker thread - a statement runs on a database thread
and its outcome comes back as a callback, or resumes your coroutine. The host names one connection
string in `server.toml`; every resource shares the pool. This page is the guide; the
[Lua API reference](/plugins/api/lua/#nodepg--postgresql) has each call's signature, and the
[C ABI reference](/plugins/api/c/#database-postgresql) has the `pg_*` entries for native modules.

## node.storage or node.pg

Both persist data; they answer different needs.

| | `node.storage` | `node.pg` |
|---|---|---|
| Where | a JSON file per resource in `storage/`, kept in memory | the host's PostgreSQL |
| Setup | none | the host installs PostgreSQL and sets `[Database] Url` |
| Reads | synchronous, from memory | asynchronous: a callback or a suspended coroutine |
| Shape | key to value | tables, indexes, `WHERE`, `ORDER BY`, `SUM` |
| Several writes as one | no | `node.pg.tx` |
| Shared | one resource | every resource on the server, other servers, your own tools |
| Size | what fits in memory | what fits on the database's disk |

Use `node.storage` for settings, counters and last-seen marks. Use `node.pg` when several
resources or several servers share the data, when you query it (a top-ten, a sum, a filter), when
money or an inventory needs a transaction, or when the data outgrows memory. A resource that runs
on servers without a database checks `node.pg.enabled()` once at load and degrades: every `node.pg`
call answers `pg_disabled` otherwise.

## Setting up the database

This part is the host's. The server needs a PostgreSQL role, a database it may create tables in,
and the connection string.

**Debian and Ubuntu**

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

The image creates the role and the database from the three variables. When the server runs under
Docker too, put both containers on one compose network and use the service name as the host
(`postgres://nodemp:change-me@postgres:5432/nodemp`).

The role owns its database and nothing else: it can create tables there and has no grant on any
other database's tables. Never hand the server a superuser. To share an
existing database with other applications, give the server a schema of its own instead:
`CREATE SCHEMA nodemp AUTHORIZATION nodemp;` and `ALTER ROLE nodemp SET search_path = nodemp;`.

Then name the database in `server.toml` - or in `NODE_DATABASE_URL`, which is where a secret
belongs in a container - and restart:

```toml
[Database]
Url = "postgres://nodemp:change-me@127.0.0.1:5432/nodemp"
```

For a database on another machine, PostgreSQL must listen on that interface (`listen_addresses` in
`postgresql.conf`) and allow the server's address in `pg_hba.conf`; add `?sslmode=require` to the
`Url` so the password and the data do not cross the network in clear. The other `[Database]` keys -
pool size, timeouts, the row cap - are on [Configuration](/hosting/configuration/#database).

The console confirms the connection with
`pg: database reachable (postgres://nodemp:***@127.0.0.1:5432/nodemp), server 160009`. The password
is replaced by `***` in every log line, in the `?password=` and `password=` spellings too. A
database that is down at start is not fatal: the server logs
`pg: cannot connect to postgres://nodemp:***@127.0.0.1:5432/nodemp: … (retrying in the background, 0.5 s to 30 s)`
and keeps trying; `node.pg.ready()` turns `true` when it gets through, and until then every
statement fails at once with `08001`.

## Queries: query and exec

`node.pg.query(sql, params?, cb?)` runs one statement and hands back its rows;
`node.pg.exec(sql, params?, cb?)` runs one statement and hands back a count only - rows affected by
an `INSERT`, `UPDATE` or `DELETE`, or the rows a `SELECT` would have returned - without
materialising a row. Values go in as `$1..$n` parameters, never concatenated into the text.

With a callback, from any handler - here the `wallets` table is the one the
[migration below](#migrations) creates:

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

`cb(result, err)` runs on the worker when the statement completes, like every other callback; an
error raised inside it is logged as `wallet · error in pg callback: …`. Exactly one of the two
arguments is set. `result` is `{ rows, count, columns }`: `rows` an array of tables keyed by column
name, `count` the number of rows returned (or affected), `columns` the column names in order.

Without a callback, inside `node.async`, the same calls suspend the coroutine and return the two
values instead:

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

Outside a coroutine the suspending form does not wait; it raises
`node.pg.query: callback required outside node.async` (`node.pg.tx: …` for a transaction). A
`params` that is not a table, a `sql` that is not a string or a `cb` that is not a function raise
at your line too - they are programming errors, not `err` values.

Rules that follow from how the pool runs statements:

- **One statement per call.** Statements go through the extended protocol (`PQexecParams`), which
  takes exactly one; `"UPDATE …; DELETE …"` fails with `42601`. Several statements that must
  succeed together belong in `node.pg.tx`.
- **No `BEGIN` by hand.** A `node.pg.exec("BEGIN")` would leave the shared connection inside a
  transaction for whoever gets it next; the pool rolls it back at once and warns
  `pg: connection 0 left in a transaction by 'BEGIN', rolling back`. Use `node.pg.tx`.
- **No session state.** A `SET` (`search_path`, `timezone`, …) through `node.pg.query` sticks to
  the pooled connection that ran it and surprises the next statement there, from any resource. Cast
  or qualify in the statement instead (`$1::timestamptz`, `now() AT TIME ZONE 'UTC'`,
  `nodemp.wallets`); inside a transaction `SET LOCAL` is fine, it ends with the transaction.
- Every statement outside `tx` is its own transaction: autocommit.

## Transactions: tx

`node.pg.tx(fn, cb?)` reserves one connection, runs `BEGIN`, calls `fn(tx)` as a coroutine, and
ends with `COMMIT` when `fn` returns normally or `ROLLBACK` when it raises. Inside `fn` use
`tx:query(sql, params?)` and `tx:exec(sql, params?)` - suspending forms only, same contract as
`node.pg.query` and `node.pg.exec` without a callback - and `tx:rollback(reason?)`, which raises out
of `fn` and rolls back. Without `cb`, inside `node.async`, `tx` suspends the caller and returns what
`fn` returned, or `nil, err`; with `cb`, it runs `fn` as its own `node.async` task and calls
`cb(...)` with the same values.

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

What comes back:

| `fn` | Connection | Return |
|---|---|---|
| returned normally, `COMMIT` succeeded | `COMMIT`, released | the return values of `fn` |
| returned normally, `COMMIT` failed | rolled back by Postgres, released | `nil, err` with the SQLSTATE (a deferred constraint, a serialization failure, a lost connection) |
| raised with `error(x)` | `ROLLBACK`, released | `nil, { code = "rollback", message = <x, or x.message for a table>, cause = x }` |
| called `tx:rollback(reason)` | `ROLLBACK`, released | `nil, { code = "rollback", message = reason }` |
| outlived `[Database] TxTimeoutMs` | rolled back by the server, released | the next `tx:query`/`tx:exec`, and the `COMMIT`, answer `{ code = "tx_timeout" }` |
| never started: `BEGIN` failed | none | `nil, err` - `08001`, `pg_disabled`, `pg_queue_full`, or `tx_timeout` when no connection came free in time |

Rules:

- **Check every `err` inside `fn`.** After a failed statement Postgres refuses the rest of the
  transaction with `25P02` until it is rolled back; `error(e)` or `tx:rollback()` at the first
  failure is the right answer. `assert(tx:exec(...))` does it in one word: `exec` returns
  `nil, err` on failure, and `assert` raises the `err` table, so the SQLSTATE arrives in
  `err.cause.code`.
- **Only `tx:` calls are in the transaction.** A plain `node.pg.query` inside `fn` goes to another
  connection, outside the transaction and unable to see its uncommitted rows. Its suspending form
  also *waits* for a second free connection: with `Pool = 1` there is none while `fn` holds the only
  one, so it waits until the transaction hits `tx_timeout`.
- **No `COMMIT` or `ROLLBACK` by hand.** A `tx:exec("COMMIT")` ends the transaction underneath the
  pool: the pool warns `pg: transaction 3 was ended by a statement run inside it ('COMMIT'); the handle is finished`,
  the handle is dead, and the next `tx:query` as well as the `COMMIT` sent for you answer `25P01`.
  Return from `fn` to commit, raise to roll back.
- **Keep it short.** The connection is unavailable to everyone else while `fn` runs; a
  `node.sleep` or `node.http.fetch` inside `fn` holds it too, and `TxTimeoutMs` (default 30 s) is
  the hard stop. Read what you need, decide, write, return.
- **A timed-out handle stays answerable.** After the server rolled back, every call through `tx`
  gets `tx_timeout` until `fn` ends; `tx` reports it once as the outcome.
- **A reload rolls back.** Unloading the resource rolls back its open transactions and drops their
  completions, a `COMMIT` already queued included; `fn` is not resumed. The log notes
  `wallet: 1 open transaction rolled back at unload` at debug level.

## Parameters and result types

Parameters (`$1..$n`, text format; the server infers the type):

| Lua | Postgres |
|---|---|
| `nil` / `node.pg.NULL` | `NULL` (the sentinel is needed inside a parameter array, where `nil` ends the array) |
| `boolean` | `true`/`false` |
| integer | integer (`int8` holds it) |
| float | `%.17g` (floating point) |
| `string` | as is (text; a `NUL` inside is not supported - send `bytea` through `decode($1,'hex')`) |
| `table` | JSON through the existing `LuaToJson` (for `json`/`jsonb`) |

Results, by the column's OID:

| Postgres | Lua |
|---|---|
| `bool` | boolean |
| `int2`/`int4`/`int8` | integer (Lua 5.4, 64-bit) |
| `float4`/`float8` | number |
| `numeric` | string (no loss of precision; keep money as integers in minor units) |
| `text`/`varchar`/`uuid`/`timestamp*`/`date`/`time*`/`interval` | string (Postgres ISO text) |
| `json`/`jsonb` | string (decode with `node.json.decode`) |
| `bytea` | string (raw bytes, `PQunescapeBytea`) |
| arrays, everything else | string in Postgres text form |
| `NULL` | key absent (`nil`) |

A result row is a table `column name → value`; columns with the same name overwrite each other (use
aliases); the order and the names are in `result.columns`.

In practice:

- **NULL.** `{ 1, nil, "x" }` sends *one* parameter - the `nil` ends the array - and a statement
  with `$2` in it then fails with SQLSTATE `08P01` (Postgres: `bind message supplies 1
  parameters, but …`). Write `{ 1, node.pg.NULL, "x" }`. Coming back, a `NULL`
  cell is simply missing: `row.col == nil`.
- **Casts.** Postgres infers a parameter's type from where it is used; where it cannot, or gets it
  wrong, cast: `$1::int`, `$2::jsonb`, `$3::timestamptz`, `decode($4, 'hex')::bytea`.
- **jsonb.** Pass a Lua table and it arrives as JSON text (an array when its keys are `1..n`, an
  object otherwise; functions become `null`); a string that already holds JSON works too. Reading
  back gives the text - `node.json.decode(row.data)`.
- **Integers** stay exact up to 64 bits: an `int8` beyond 2^53 is a Lua integer, not a float.
- **numeric** arrives as a string (`"12.50"`) so nothing is lost; do arithmetic in SQL, or store
  money as `bigint` minor units (cents) and format when you show it.
- **Time.** Timestamps are text (`2026-09-14 19:24:00.123456+03`); compare and convert in SQL
  (`extract(epoch from created_at)`, `now() - interval '7 days'`) rather than parsing in Lua.
- **Binary.** A string with a `NUL` byte cannot be a parameter; hex-encode and `decode($1, 'hex')`.
  A `bytea` column comes back as the raw bytes.
- **One statement per call**, with up to 1000 parameters. A statement without parameters may
  leave `params` out: `node.pg.query(sql, cb)`, `node.pg.exec(sql)`.

## Errors

`err` is `{ code, message, detail?, hint?, constraint?, table? }`. `code` is the SQLSTATE Postgres
reported, or one of the pool's own codes; the optional fields are present when Postgres filled them
(`constraint` on a `23505`, for example).

| `err.code` | Meaning | What to do |
|---|---|---|
| `pg_disabled` | `[Database] Url` is empty; the driver is off. | Check `node.pg.enabled()` at load and run without the feature, or tell the host. |
| `08001` | No live connection: the database is down or not reached yet. A statement submitted then fails at once; one already waiting when the last connection dropped gets it after `QueryTimeoutMs`. | The pool reconnects on its own; retry later or watch `node.pg.ready()`. |
| `08006` | The connection was lost while the statement ran, or the server is shutting down. | Whether the statement took effect is unknown - retry only through an idempotency key (below). |
| `57014` | The statement ran past `[Database] QueryTimeoutMs` (Postgres `statement_timeout`). | An index, a narrower query, or a larger timeout. |
| `23505` | Unique violation; `err.constraint` names the index. | Expected in the idempotency pattern; or `ON CONFLICT` when the duplicate is fine. |
| `42601` | Syntax error - also what a string with two statements gets. | One statement per call. |
| `25P02` | A statement after an earlier one failed inside the transaction. | Check every `err` in `fn`; raise at the first. |
| `25P01` | The transaction was ended by a `COMMIT`/`ROLLBACK` run through the handle. | Return from `fn` or raise; never end it by hand. |
| `0A000` | `COPY` is not supported. | `INSERT` in a transaction. |
| `pg_queue_full` | 1000 statements are already waiting. | You issue faster than the database answers: back off, look for the slow-query lines, raise `Pool`. |
| `pg_result_cap` | More than `[Database] MaxRows` rows; the result was dropped. | `LIMIT` and paginate, or `exec` when the count is all you need. |
| `08P01` | A protocol violation, in practice a parameter count that does not match the statement: `{ 1, nil, 2 }` sends one parameter because the `nil` ends the array. | `node.pg.NULL` for the empty slot. |
| `pg_params` | A value the driver cannot send - a function, a coroutine, a userdata other than `node.pg.NULL`, a string with a `NUL`, a table JSON cannot encode - or more than 1000 parameters. The message is the terse `query not queued`; the parameter table is the place to look. | Fix the parameter table. |
| `rollback` | `fn` raised (`message`, and the raised value in `cause`) or called `tx:rollback(reason)`. | Your own decision; a SQLSTATE that caused it is in `err.cause.code`. |
| `tx_timeout` | The transaction outlived `[Database] TxTimeoutMs` and was rolled back, or `BEGIN` waited that long for a free connection. | Shorter transactions, never suspend for anything else inside `fn`, a larger `Pool`. |
| `pg_reload` | Never delivered. A resource unloaded while a statement is in flight never sees its callback, and its suspended coroutine is not resumed. | Design so that a lost completion is harmless: the database has the truth, re-read it at load. |

A reload or shutdown between submitting a statement and its completion drops the completion
silently (`async completion 42 dropped: its resource was unloaded and the callback went with it` at
debug level) - the statement itself may well have run. That is why writes that must not happen twice
carry a key.

### Idempotency with a unique key

An `08006`, a dropped completion or a player who clicks twice leave you not knowing whether a write
happened. Make the database refuse the repeat: give each write a key that is unique per intended
action, store it in a `UNIQUE` column, and treat `23505` on that constraint as "already done".

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

`ledger_idem_key_key` is the name Postgres gives the constraint of `idem_key text UNIQUE`; name it
yourself (`CONSTRAINT ledger_idem UNIQUE (idem_key)`) when you would rather not depend on that. The
insert goes first in the transaction, so a duplicate is refused before any balance moves.

## Migrations

The server does not manage your schema; a resource creates and upgrades its own tables at load.
Two things make that safe when several server instances share one database, or a resource is
reloaded while another copy is still starting: a transaction-scoped advisory lock, so only one
migrator runs at a time, and a `schema_migrations` table that records how far each resource got.

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

`pg_advisory_xact_lock` - not `pg_advisory_lock` - because the transaction-scoped lock is released
at `COMMIT`/`ROLLBACK`; the session-scoped one would stay on the pooled connection after `tx` ends
and block the next migrator until that connection closes. Everything runs in one transaction, so a
failing migration leaves the schema and the version as they were, and the whole batch is bounded by
`TxTimeoutMs` - split a long data backfill into its own steps. Append to `MIGRATIONS`, never edit an
entry that has run somewhere.

Run it at load, after the pool is reachable, and gate the rest of the resource on the result:

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

## Performance

- **The worker never waits, but the queue can grow.** Each statement is queued and run by the
  first free connection; 1000 waiting statements is the cap (`pg_queue_full`). A query per
  `serverTick` (10 Hz) or per vehicle position update floods it - poll on a timer, batch writes,
  cache reads that change rarely, and never suspend a hot handler on a query.
- **Pool size.** `[Database] Pool` (default 4) is the number of statements in flight at once, and
  each `node.pg.tx` holds one connection for its whole life. Raise it when `queueDepth` climbs or
  transactions wait for `BEGIN`; a PostgreSQL connection is a process on the database side, so do
  not raise it into the hundreds.
- **Timeouts.** `QueryTimeoutMs` (default 10 s) bounds a statement, `TxTimeoutMs` (default 30 s)
  bounds a transaction. Both are protection, not a budget: a statement near either is a statement
  to fix.
- **Slow queries** are logged: `pg: slow query (312 ms): SELECT …` for anything over 250 ms,
  with the SQL cut at 200 characters and parameters never logged. Read them as a to-do list for
  indexes.
- **`MaxRows`** (default 10 000) drops a larger result with `pg_result_cap` - `LIMIT` and paginate
  (keyset: `WHERE id > $1 ORDER BY id LIMIT 100`), or `exec` when you only need the count.
- **No session state** through `node.pg.query` (`SET`, `pg_advisory_lock`, temporary tables,
  prepared statements): every statement may land on a different connection, and whatever it leaves
  behind is the next statement's problem.
- **Metrics.** `node.server.metrics().plugin.pg` is
  `{ enabled, ready, queries, errors, p50Ms, p95Ms, queueDepth, connections, transactions, deadTransactions }`:
  statements run and failed, latency over the last 512 statements, statements waiting, live
  connections, open transactions, and handles the pool finished on its own that their owner has not
  ended yet. With the driver off the block is just `{ enabled = false }`. Log or export it from a
  timer.
- **Reads that can be stale** belong in memory: load at start, refresh on a timer, write through.
  A database round trip per chat message is fine; one per physics frame is not.

## A complete example: wallet transfers

A resource `wallet` with a balance per account, a ledger, `/balance` and `/pay <player> <coins>`.
Balances are `bigint` cents; a transfer is one transaction that inserts the ledger row under an
idempotency key, locks both wallets in id order, checks the funds and moves them. The migration
block from above is `migrate()` here.

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

What the shape buys you: the ledger insert comes first, so a retry with the same key stops at
`23505` before anything moves and the player is told "already applied" rather than paying twice;
`FOR UPDATE` in a fixed order serialises two transfers between the same pair without a deadlock;
the balance check reads the locked rows, so no concurrent transfer can slip between the read and
the write; `assert` on every statement turns any SQL failure into a rollback whose SQLSTATE the
caller can still log from `err.cause.code`; and the `08006` retry is the only retry, because it is
the only case where the outcome is unknown. Amounts are integers all the way - the database never
sees a float, the player never sees a rounding error.

## Next

- [Lua API reference: node.pg](/plugins/api/lua/#nodepg--postgresql) - every call with its
  signature and the full error list.
- [Configuration: `[Database]`](/hosting/configuration/#database) - the five keys the host
  sets.
- [Concurrency](/plugins/concurrency/) - the worker thread, `node.async` and why callbacks look
  the way they do.
- [Resources](/plugins/resources/#state-nodestorage) - `node.storage`, for the data that does
  not need a database.
