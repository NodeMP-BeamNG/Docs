---
title: Database access
description: A real database from a resource with the db module - installing it, query/exec/tx, parameter and result types, errors, migrations, performance, wallet example.
---

A database is a module, not part of the server. `modules/db.dll` (`db.so` on Linux) owns the
connections and hands them to resources over the resource bus; a small library, `db.lua`, travels
with your resource and hides the bus behind `db:query`, `db:exec` and `db:tx`. PostgreSQL, SQLite
and MySQL/MariaDB sit behind that one interface, the placeholders are `$1..$n` on every engine, and
a value never goes into the statement text. Nothing blocks the worker thread: a statement runs on a
database thread and its outcome comes back as a callback, or resumes your coroutine.

Up to and including release 1.2.1 this was `node.pg` in the core. It is not any more - an engine,
its client library and its pool are not what a game server is for - so a server that never touches
a database no longer carries one. [Migrating from node.pg](#migrating-from-nodepg) at the end of
this page is the whole diff.

## node.storage or a database

Both persist data; they answer different needs.

| | `node.storage` | the `db` module |
|---|---|---|
| Where | a JSON file per resource in `storage/`, kept in memory | PostgreSQL, SQLite or MySQL |
| Setup | none | the host installs the module and names a connection |
| Reads | synchronous, from memory | asynchronous: a callback or a suspended coroutine |
| Shape | key to value | tables, indexes, `WHERE`, `ORDER BY`, `SUM` |
| Several writes as one | no | `db:tx` |
| Shared | one resource | every resource on the server, other servers, your own tools |
| Size | what fits in memory | what fits on the database's disk |

Use `node.storage` for settings, counters and last-seen marks. Use the module when several
resources or several servers share the data, when you query it (a top-ten, a sum, a filter), when
money or an inventory needs a transaction, or when the data outgrows memory. A resource that runs
on servers without a database checks once at load and degrades: every call answers `db_disabled`
when there is no connection by that name.

## Installing the module

This part is the host's. Build the module once, drop it next to the server, and give it a
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

Each engine is an option (`-DNODE_DB_POSTGRES=OFF`, `-DNODE_DB_SQLITE=OFF`, `-DNODE_DB_MYSQL=OFF`)
and turning one off drops its dependency entirely. Build it statically: the server loads **every**
library in `modules/` and reports each one it cannot use, so a `libpq.dll` left beside the module
is an error line on every start.

`modules/db.toml` names one pool per section:

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

A secret does not have to be in the file: `NODE_DB_<NAME>_URL` overrides the `url` of that
connection (`NODE_DB_DEFAULT_URL` for the one above, and the name uppercased for any other),
and with no usable connection in the file -- or no file at all -- the module opens
one connection called `default` from `NODE_DB_URL` - or from `NODE_DATABASE_URL`, the variable the
server used while the database was still part of it. `driver` may be left out; a `postgres://` or
`mysql://` URL says what it is and anything else is taken as a SQLite path.

The console confirms each pool at start:

```
Db     › connection 'default': postgres, 4 connection(s)
Db     › db[default]: connected to postgres://nodemp:***@127.0.0.1:5432/nodemp (PostgreSQL 16.9)
```

The password is never logged, in the `?password=` and `password=` spellings either. Connections
are made in the background with retries (0.5 s to 30 s apart), so the server starts and runs while
the database is down; statements then fail with `08001` until it answers.

### The engines

**PostgreSQL** is the reference: `$1..$n` and SQLSTATE natively, `statement_timeout` per
connection, a cancel channel used by the shutdown drain. Install it the usual way -

```bash
sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE ROLE nodemp LOGIN PASSWORD 'change-me';" \
                      -c "CREATE DATABASE nodemp OWNER nodemp;"
```

or in Docker (`postgres:16-alpine`, the three `POSTGRES_*` variables create the role and the
database). The role owns its database and nothing else; never hand the server a superuser. For a
database on another machine add `?sslmode=require` so the password and the data do not cross the
network in clear.

**SQLite** needs nothing installed: `url = "data/server.db"` is the whole setup, and the file is
created on first use. WAL and `foreign_keys = ON` are set on every connection, `$n` is rewritten to
`?n`, and a transaction opens with `BEGIN IMMEDIATE` so a write conflict happens at its start
rather than in its middle. `:memory:` is per connection, so such a pool is forced to one.

**MySQL / MariaDB** rewrites `$n` to positional `?` (a parameter used twice is sent twice, as
MySQL cannot reuse one) and has no per-connection cancel, so the shutdown drain opens a second
connection and issues `KILL QUERY`.

The SQL in the examples below is PostgreSQL's where it has to be (`bigserial`, `timestamptz`,
`pg_advisory_xact_lock`); the module does not translate SQL, only placeholders.

## Using it from a resource

Copy `plugins/db/lua/db.lua` next to your `main.lua`, put your own folder on the Lua path the way
every multi-file resource does, and open a connection by name:

<!-- doctest: skip the opening lines every db block below runs with -->
```lua
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]")
package.path = here .. "/?.lua;" .. package.path

local db = require("db").open()          -- the "default" connection
local stats = require("db").open("stats")
```

Opening is free - nothing is dialled, the module already holds the pool - and an unknown name is
not an error until the first statement, which answers `db_disabled` and names it.

## Queries: query and exec

`db:query(sql, params?, cb?)` runs one statement and hands back its rows; `db:exec(sql, params?,
cb?)` runs one statement and hands back a count only - rows affected by an `INSERT`, `UPDATE` or
`DELETE`, or the rows a `SELECT` would have returned - without carrying a row back. Values go in as
`$1..$n` parameters, never concatenated into the text.

With a callback, from any handler - here the `wallets` table is the one the
[migration below](#migrations) creates:

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

`cb(result, err)` runs on the worker when the statement completes, like every other callback.
Exactly one of the two arguments is set. `result` is `{ rows, count, columns }`: `rows` an array of
tables keyed by column name, `count` the number of rows returned (or affected), `columns` the
column names in order.

Without a callback, inside `node.async`, the same calls suspend the coroutine and return the two
values instead:

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

The suspending form is `node.suspend` underneath: the library arms the reply and the coroutine
continues when it lands. Outside a coroutine it does not wait - it logs `node.suspend called
outside a node.async task` and returns nothing - so from a plain handler pass a callback.

Rules that follow from how the pool runs statements:

- **One statement per call.** Every statement is prepared and run with its parameters bound;
  `"UPDATE …; DELETE …"` is a syntax error (`42601`). Several statements that must succeed together
  belong in `db:tx`.
- **No `BEGIN` by hand.** It would leave the shared connection inside a transaction for whoever
  gets it next; the pool rolls it back at once and warns `db[default]: connection 0 left in a
  transaction by 'BEGIN', rolling back`. Use `db:tx`.
- **No session state.** A `SET` (`search_path`, `timezone`, …) through `db:query` sticks to the
  pooled connection that ran it and surprises the next statement there, from any resource. Cast or
  qualify in the statement instead (`$1::timestamptz`, `nodemp.wallets`); inside a transaction
  `SET LOCAL` is fine, it ends with the transaction.
- Every statement outside `tx` is its own transaction: autocommit.

## Transactions: tx

`db:tx(fn, cb?)` reserves one connection, runs `BEGIN`, calls `fn(tx)` as a coroutine, and ends
with `COMMIT` when `fn` returns normally or `ROLLBACK` when it raises. Inside `fn` use
`tx:query(sql, params?)` and `tx:exec(sql, params?)` - suspending forms only, same contract as
`db:query` and `db:exec` without a callback - and `tx:rollback(reason?)`, which raises out of `fn`
and rolls back. Without `cb`, inside `node.async`, `tx` suspends the caller and returns what `fn`
returned, or `nil, err`; with `cb`, it runs `fn` as its own `node.async` task and calls `cb(...)`
with the same values.

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

What comes back:

| `fn` | Connection | Return |
|---|---|---|
| returned normally, `COMMIT` succeeded | `COMMIT`, released | the return values of `fn` |
| returned normally, `COMMIT` failed | rolled back by the engine, released | `nil, err` with the SQLSTATE (a deferred constraint, a serialization failure, a lost connection) |
| raised with `error(x)` | `ROLLBACK`, released | `nil, { code = "rollback", message = <x, or x.message for a table>, cause = x }` |
| called `tx:rollback(reason)` | `ROLLBACK`, released | `nil, { code = "rollback", message = reason }` |
| outlived `tx_timeout_ms` | rolled back by the module, released | the next `tx:query`/`tx:exec`, and the `COMMIT`, answer `{ code = "db_tx_timeout" }` |
| never started: `BEGIN` failed | none | `nil, err` - `08001`, `db_disabled`, `db_queue_full`, or `db_tx_timeout` when no connection came free in time |

Rules:

- **Check every `err` inside `fn`.** After a failed statement PostgreSQL refuses the rest of the
  transaction with `25P02` until it is rolled back; `error(e)` or `tx:rollback()` at the first
  failure is the right answer on every engine. `assert(tx:exec(...))` does it in one word: `exec`
  returns `nil, err` on failure, and `assert` raises the `err` table, so the SQLSTATE arrives in
  `err.cause.code`.
- **Only `tx:` calls are in the transaction.** A plain `db:query` inside `fn` goes to another
  connection, outside the transaction and unable to see its uncommitted rows. Its suspending form
  also *waits* for a second free connection: with `connections = 1` there is none while `fn` holds
  the only one, so it waits until the transaction hits `db_tx_timeout`.
- **No `COMMIT` or `ROLLBACK` by hand.** A `tx:exec("COMMIT")` ends the transaction underneath the
  pool: it warns `db[default]: transaction 3 was ended by a statement run inside it ('COMMIT'); the
  handle is finished`, the handle is dead, and the next `tx:query` as well as the `COMMIT` sent for
  you answer `25P01`. Return from `fn` to commit, raise to roll back.
- **Keep it short.** The connection is unavailable to everyone else while `fn` runs; a `node.sleep`
  or `node.http.fetch` inside `fn` holds it too, and `tx_timeout_ms` (default 30 s) is the hard
  stop. Read what you need, decide, write, return.
- **A finished handle still answers.** After the module rolled a transaction back on its own - the
  deadline, a lost connection, the unload below - every call through `tx` gets the reason
  (`db_tx_timeout`, `08006`, `db_tx_aborted`) rather than a shrug, until `fn` ends.
- **A reload rolls back.** `db.lua` tells the module on `resourceUnload`, so a resource that is
  reloaded or stopped while holding a transaction releases the connection at once instead of
  holding it until `tx_timeout_ms`. `fn` is not resumed.

## Parameters and result types

Parameters (`$1..$n`, sent as values, never spliced into the text):

| Lua | Sent as |
|---|---|
| `require("db").NULL` (and, with the current `db.lua` of the examples repository, `db.NULL` on a connection too) | `NULL` (the sentinel is needed inside a parameter array, where `nil` ends the array) |
| `boolean` | `true`/`false` |
| integer | integer (64-bit) |
| float | floating point (`%.17g`) |
| `string` | as is (text) |
| `table` | JSON (for a `json`/`jsonb` column) |

Results, by the column's type:

| Column | Lua |
|---|---|
| boolean | boolean |
| integer (`int2`/`int4`/`int8`, SQLite `INTEGER`) | integer, exact to 64 bits |
| floating point (`float4`/`float8`, SQLite `REAL`) | number |
| `numeric` | string (no loss of precision; keep money as integers in minor units) |
| text, `uuid`, timestamps, dates, intervals | string (the engine's text form) |
| `json`/`jsonb` | string (decode with `node.json.decode`) |
| `bytea` / `BLOB` | string of raw bytes |
| arrays, everything else | string in the engine's text form |
| `NULL` | key absent (`nil`) |

A result row is a table `column name → value`; columns with the same name overwrite each other (use
aliases); the order and the names are in `result.columns`.

In practice:

- **NULL.** `{ 1, nil, "x" }` has a hole where `$2` should be - the `nil` ends the array - and
  `db.lua` refuses it (`db: params has a hole at #2`). The sentinel lives on the **module table**:
  `local dbm = require("db")` ... `{ 1, dbm.NULL, "x" }`; the current `db.lua` of the examples
  repository also exposes it on every connection, so `db.NULL` with `db` a connection is the same
  object there (with the copy shipped in the 1.3.0 archive it is `nil` - SQLite then binds NULL by
  accident, PostgreSQL answers `08P01`). With
  an explicit length, `{ 1, nil, "x", n = 3 }`, a `nil` is sent as NULL. Coming back, a `NULL` cell is simply
  missing: `row.col == nil`.
- **Casts.** PostgreSQL infers a parameter's type from where it is used; where it cannot, or gets
  it wrong, cast: `$1::int`, `$2::jsonb`, `$3::timestamptz`.
- **jsonb.** Pass a Lua table and it arrives as JSON text (an array when its keys are `1..n`, an
  object otherwise); a string that already holds JSON works too. Reading back gives the text -
  `node.json.decode(row.data)`.
- **Integers** stay exact up to 64 bits: an `int8` beyond 2^53 is a Lua integer, not a float.
- **numeric** arrives as a string (`"12.50"`) so nothing is lost; do arithmetic in SQL, or store
  money as `bigint` minor units (cents) and format when you show it.
- **Time.** Timestamps are text (`2026-09-14 19:24:00.123456+03`); compare and convert in SQL
  (`extract(epoch from created_at)`, `now() - interval '7 days'`) rather than parsing in Lua.
- **One statement per call**, with up to 1000 parameters. A statement without parameters may leave
  `params` out: `db:query(sql, cb)`, `db:exec(sql)`.

## Errors

`err` is `{ code, message, detail?, hint?, constraint?, table? }`. `code` is the SQLSTATE the
engine reported - the other two engines are mapped onto PostgreSQL's codes, so one test works
everywhere - or one of the module's own codes; the optional fields are present when the engine
filled them (`constraint` on a `23505`, for example).

| `err.code` | Meaning | What to do |
|---|---|---|
| `db_disabled` | There is no connection by that name: no `db.toml` entry, or its `url` is empty. | Degrade at load and run without the feature, or tell the host. |
| `08001` | No live connection: the database is down or not reached yet. | The pool reconnects on its own; retry later or wait for `db:ready()`. |
| `08006` | The connection was lost while the statement ran, or the server is shutting down. | Whether the statement took effect is unknown - retry only through an idempotency key (below). |
| `57014` | The statement ran past `query_timeout_ms` (also a SQLite busy timeout). | An index, a narrower query, or a larger timeout. |
| `23505` | Unique violation; `err.constraint` names the index. | Expected in the idempotency pattern; or `ON CONFLICT` when the duplicate is fine. |
| `23503` / `23502` / `23514` | Foreign key, not null, check. | A bug in the write or in the schema. |
| `42601` / `42P01` | Syntax error - also what a string with two statements gets - and no such table. | One statement per call; run your migrations first. |
| `40001` / `40P01` | Serialization failure, deadlock. | Retry the whole transaction; lock rows in a fixed order (the wallet example does). |
| `25P02` | A statement after an earlier one failed inside the transaction. | Check every `err` in `fn`; raise at the first. |
| `25P01` | The transaction was ended by a `COMMIT`/`ROLLBACK` run through the handle. | Return from `fn` or raise; never end it by hand. |
| `db_queue_full` | 1000 statements are already waiting. | You issue faster than the database answers: back off, look for the slow-statement lines, raise `connections`. |
| `db_result_cap` | More rows than `max_rows`; the result was dropped. | `LIMIT` and paginate, or `exec` when the count is all you need. |
| `db_tx_timeout` | The transaction outlived `tx_timeout_ms` and was rolled back, or `BEGIN` waited that long for a free connection. | Shorter transactions, never suspend for anything else inside `fn`, more connections. |
| `db_tx_aborted` | The transaction was rolled back because its resource was unloaded. | Nothing: the resource is going. Re-read the database at load. |
| `0A000` | The engine's driver does not support what the statement asks for (`COPY`, for one). | Say it another way -- `INSERT` inside a transaction instead of `COPY`. |
| `db_params` | A value the module cannot send, or more than 1000 parameters. | Fix the parameter table. |
| `rollback` | `fn` raised (`message`, and the raised value in `cause`) or called `tx:rollback(reason)`. | Your own decision; a SQLSTATE that caused it is in `err.cause.code`. |

A reload or shutdown between sending a statement and its answer drops the answer: the callback
never runs and the suspended coroutine is not resumed - the statement itself may well have run.
That is why writes that must not happen twice carry a key.

### Idempotency with a unique key

An `08006`, a dropped answer or a player who clicks twice leave you not knowing whether a write
happened. Make the database refuse the repeat: give each write a key that is unique per intended
action, store it in a `UNIQUE` column, and treat `23505` on that constraint as "already done".

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

The insert goes first in the transaction, so a duplicate is refused before any balance moves. On
PostgreSQL `err.constraint` tells you *which* unique index refused it, which is worth checking when
the table has more than one.

## Migrations

The server does not manage your schema; a resource creates and upgrades its own tables at load.
Two things make that safe when several server instances share one database, or a resource is
reloaded while another copy is still starting: a transaction-scoped advisory lock, so only one
migrator runs at a time, and a `schema_migrations` table that records how far each resource got.

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

`pg_advisory_xact_lock` - not `pg_advisory_lock` - because the transaction-scoped lock is released
at `COMMIT`/`ROLLBACK`; the session-scoped one would stay on the pooled connection after `tx` ends
and block the next migrator until that connection closes. (On SQLite the lock line is unnecessary
and unknown: one writer at a time is the engine's own rule.) Everything runs in one transaction, so
a failing migration leaves the schema and the version as they were, and the whole batch is bounded
by `tx_timeout_ms` - split a long data backfill into its own steps. Append to `MIGRATIONS`, never
edit an entry that has run somewhere.

Run it at load, once the connection answers, and gate the rest of the resource on the result:

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

## Performance

- **The worker never waits, but the queue can grow.** Each statement is queued and run by the first
  free connection; 1000 waiting statements is the cap (`db_queue_full`). A statement per
  `serverTick` (10 Hz) or per vehicle position update floods it - poll on a timer, batch writes,
  cache reads that change rarely, and never suspend a hot handler on a query.
- **Pool size.** `connections` (default 4) is the number of statements in flight at once, and each
  `db:tx` holds one for its whole life. Raise it when `queueDepth` climbs or transactions wait for
  `BEGIN`; a PostgreSQL connection is a process on the database side, so do not raise it into the
  hundreds. A SQLite pool writes one at a time whatever you set.
- **Timeouts.** `query_timeout_ms` (default 10 s) bounds a statement, `tx_timeout_ms` (default
  30 s) bounds a transaction. Both are protection, not a budget: a statement near either is a
  statement to fix.
- **Slow statements** are logged: `db[default]: slow statement (312 ms): SELECT …` for anything
  over 250 ms, with the SQL cut short and parameters never logged. Read them as a to-do list for
  indexes.
- **`max_rows`** (default 10 000) drops a larger result with `db_result_cap` - `LIMIT` and paginate
  (keyset: `WHERE id > $1 ORDER BY id LIMIT 100`), or `exec` when you only need the count.
- **No session state** through `db:query` (`SET`, advisory locks, temporary tables): every
  statement may land on a different connection, and whatever it leaves behind is the next
  statement's problem.
- **Counters.** `db:status()` answers one table for EVERY connection the module holds, keyed by
  name, whichever handle you call it on -- each entry:
  `{ driver, enabled, ready, queries, errors, p50Ms, p95Ms, queueDepth, connections, transactions,
  deadTransactions }` - statements run and failed, latency over the last 512, statements waiting,
  live connections, open transactions, and handles the pool finished on its own that their owner
  has not ended yet. Log or export it from a timer.
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

`db.lua` sits beside `main.lua` in `server/`.

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

What the shape buys you: the ledger insert comes first, so a retry with the same key stops at
`23505` before anything moves and the player is told "already applied" rather than paying twice;
`FOR UPDATE` in a fixed order serialises two transfers between the same pair without a deadlock;
the balance check reads the locked rows, so no concurrent transfer can slip between the read and
the write; `assert` on every statement turns any SQL failure into a rollback whose SQLSTATE the
caller can still log from `err.cause.code`; and the `08006` retry is the only retry, because it is
the only case where the outcome is unknown. Amounts are integers all the way - the database never
sees a float, the player never sees a rounding error.

## Migrating from node.pg

The calls are the same shape, so most of the work is mechanical:

| Was | Is |
|---|---|
| `node.pg.query/exec/tx` | `db:query/exec/tx` on a connection from `require("db").open()` |
| `node.pg.NULL` | `require("db").NULL` (or `db.NULL` on a connection with the current `db.lua`) |
| `node.pg.enabled()` | gone: a missing connection answers `db_disabled` on the first statement |
| `node.pg.ready()` | `db:ready()` (suspending or with a callback, like everything else) |
| `node.server.metrics().plugin.pg` | `db:status()` |
| `[Database]` in `server.toml` | `[connections.default]` in `modules/db.toml` |
| `NODE_DATABASE_URL` | `NODE_DB_URL` (the old name still works) |
| `pg_disabled`, `pg_queue_full`, `pg_result_cap`, `tx_timeout`, `pg_params` | `db_disabled`, `db_queue_full`, `db_result_cap`, `db_tx_timeout`, `db_params` |
| `pg_*` in the C ABI | gone. The ABI is major 2; rebuild every native module |

Two differences worth knowing beyond the renaming: a statement's answer now travels over the
resource bus as JSON, so a `bytea` column arrives as text rather than raw bytes in the strictest
sense of the word, and `db.lua` must be copied into each resource that uses it - there is no global
`db`.

## Next

- [Configuration](/hosting/configuration/) - the server's own keys; the database's live in
  `modules/db.toml`.
- [Native modules](/plugins/native-modules/) - what a module is, and how one talks to resources.
- [Concurrency](/plugins/concurrency/) - the worker thread, `node.async`, `node.suspend` and why
  callbacks look the way they do.
- [Resources](/plugins/resources/#state-nodestorage) - `node.storage`, for the data that does not
  need a database.
