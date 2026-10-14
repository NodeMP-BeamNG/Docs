---
title: Database
description: PostgreSQL, MySQL/MariaDB or SQLite from a resource with the db module - setup, queries, transactions, types, errors, migrations, and a complete wallet example.
---

The server ships with a database module, `modules/db.dll` (`db.so` on Linux), and a small Lua
library, `db.lua`, that your resource carries. Together they give you `db:query`, `db:exec` and
`db:tx` against PostgreSQL, MySQL/MariaDB or SQLite. Placeholders are `$1..$n` on every engine, a
value never goes into the SQL text, and nothing blocks the worker: a statement runs on a database
thread and its answer comes back as a callback or wakes your coroutine.

## Storage or a database?

| | `node.storage` | the `db` module |
|---|---|---|
| Setup | none | the host points the module at a database |
| Reads | instant, from memory | asynchronous: a callback or a paused coroutine |
| Shape | key to value | tables, indexes, `WHERE`, `ORDER BY`, `SUM` |
| Several writes as one | no | `db:tx` |
| Shared with | one resource | every resource, other servers, your website and tools |

Use `node.storage` for settings, counters and last-seen marks. Use a database when several resources
or servers share the data, when you query it (a top ten, a sum, a filter), when money or an
inventory needs a transaction, or when the data won't fit in memory.

## Setting it up

This part is the host's. The module is already in `modules/`. Without a configuration it stays
loaded and says so at start:

```
Warn   › no database configured: create modules/db.toml (see db.example.toml) or set NODE_DB_URL. The module stays loaded and every request answers db_disabled.
```

Copy `modules/db.example.toml` to `modules/db.toml` and name a connection:

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

- **SQLite** needs nothing installed: a file path is the whole setup, and the file is created on
  first use.
- **PostgreSQL**: give the server its own role that owns its database and nothing else, never a
  superuser. Add `?sslmode=require` for a database on another machine.
- **MySQL / MariaDB**: `mysql://user:password@host:3306/dbname`.

The password doesn't have to be in the file: `NODE_DB_DEFAULT_URL` overrides the `url` of
`default` (`NODE_DB_<NAME>_URL` for others), and with no file at all `NODE_DB_URL` opens a connection
called `default`. The console confirms each one, with the password hidden:

```
Db     › connection 'default': postgres, 4 connection(s)
Db     › db[default]: connected to postgres://nodemp:***@127.0.0.1:5432/nodemp (PostgreSQL 16.9)
```

The server starts and runs while the database is down. The module reconnects in the background, and
statements fail with `08001` until the database answers.

## Opening a connection

Copy `modules/db.lua` into your resource's `server/` folder, put that folder on the Lua path, and
open a connection by name:

<!-- doctest: skip the opening lines every db block below runs with -->
```lua
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]")
package.path = here .. "/?.lua;" .. package.path

local db = require("db").open()          -- the "default" connection
local stats = require("db").open("stats")
```

Opening costs nothing; the module already holds the connections. A name the host didn't configure
isn't an error until the first statement, which answers `db_disabled`. A resource that should also
run on servers without a database checks once at load and does without the feature.

## query and exec

`db:query(sql, params, cb)` runs one statement and gives you its rows. `db:exec(sql, params, cb)`
runs one and gives you only a count: rows changed by `INSERT`, `UPDATE` or `DELETE`. Values go in as
`$1..$n`, never glued into the SQL.

With a callback, from any handler (the `wallets` table comes from the [migration below](#migrations)):

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

Exactly one of `result` and `err` is set. `result` is `{ rows, count, columns }`: `rows` is an
array of tables keyed by column name, `count` the number of rows, `columns` the names in order.

Inside `node.async`, leave out the callback and the same call pauses the coroutine and returns the two
values:

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

Outside a coroutine the callback-less form doesn't wait: it logs
`node.suspend called outside a node.async task` and returns nothing. From a plain handler, pass a
callback.

Three rules, because the connections are shared by every resource:

- **One statement per call.** `"UPDATE ...; DELETE ..."` is a syntax error (`42601`). Statements
  that must succeed together go in `db:tx`.
- **No `BEGIN` by hand.** It would leave a shared connection inside a transaction; the module rolls
  it back at once and warns. Use `db:tx`.
- **No session settings.** A `SET` sticks to whichever connection ran it and surprises the next
  statement there. Cast or qualify in the statement instead (`$1::timestamptz`, `myschema.wallets`).

## Transactions

`db:tx(fn, cb)` takes one connection, starts a transaction, and runs `fn(tx)` as a coroutine. When
`fn` returns, the transaction is committed; when it raises an error, rolled back. Inside `fn`, use
`tx:query(sql, params)` and `tx:exec(sql, params)` (no callbacks; they pause) and
`tx:rollback(reason)`, which leaves `fn` and rolls back.

Called inside `node.async` without `cb`, `db:tx` pauses and returns what `fn` returned, or
`nil, err`. With `cb`, it runs on its own and calls `cb(...)` with the same values.

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

| `fn` | Result |
|---|---|
| returned, commit worked | what `fn` returned |
| returned, commit failed | `nil, err` with the engine's code (a constraint, a serialization failure, a lost connection) |
| raised `error(x)` | `nil, { code = "rollback", message = ..., cause = x }` |
| called `tx:rollback(reason)` | `nil, { code = "rollback", message = reason }` |
| ran longer than `tx_timeout_ms` | rolled back; the next `tx:` call answers `db_tx_timeout` |

Rules for transactions:

- **Check every `err` inside `fn`.** After a failed statement PostgreSQL refuses the rest with
  `25P02`. `assert(tx:exec(...))` raises at the first failure, which rolls back; the code is then in
  `err.cause.code`.
- **Only `tx:` calls are in the transaction.** A `db:query` inside `fn` runs on another connection
  and can't see the transaction's rows. With `connections = 1` it waits until the transaction times
  out.
- **No `COMMIT` or `ROLLBACK` by hand.** Return from `fn` to commit, raise to roll back.
- **Keep it short.** The connection is reserved while `fn` runs, including any `node.sleep` or HTTP
  call inside it. Read, decide, write, return.
- **A reload rolls back.** If your resource is reloaded or stopped mid-transaction, the connection is
  released at once and `fn` isn't resumed.

## Values in and out

| Lua parameter | Sent as |
|---|---|
| `db.NULL` | `NULL` (`nil` would end the parameter array) |
| `true` / `false` | boolean |
| integer | 64-bit integer |
| float | floating point |
| string | text |
| table | JSON, for a `json`/`jsonb` column |

| Column | Lua value |
|---|---|
| boolean | boolean |
| integer types | integer, exact to 64 bits |
| floating point | number |
| `numeric` | string, so nothing is lost; keep money as integer cents |
| text, `uuid`, dates and times | string in the engine's text form |
| `json` / `jsonb` | string; decode with `node.json.decode` |
| `bytea` / `BLOB` | string of bytes |
| `NULL` | the key is absent (`row.col == nil`) |

Columns with the same name overwrite each other in a row, so alias them. PostgreSQL guesses a
parameter's type from where it's used; where it can't, cast: `$1::int`, `$2::jsonb`. Do date
arithmetic in SQL (`now() - interval '7 days'`) rather than parsing timestamps in Lua. Up to 1000
parameters per statement; a statement without any may leave `params` out: `db:query(sql, cb)`.

## Errors

`err` is `{ code, message, detail?, hint?, constraint?, table? }`. `code` is the SQLSTATE; MySQL and
SQLite errors are mapped to PostgreSQL's codes, so one check works everywhere. The module adds a few
of its own.

| `err.code` | Meaning | What to do |
|---|---|---|
| `db_disabled` | No connection by that name. | Run without the feature, or tell the host. |
| `08001` | The database is down or not reached yet. | It reconnects on its own; retry later. |
| `08006` | The connection was lost mid-statement. | Whether it ran is unknown: retry only with an idempotency key ([below](#writes-that-must-not-happen-twice)). |
| `57014` | Ran past `query_timeout_ms`. | An index or a narrower query. |
| `23505` | Unique violation; `err.constraint` names the index. | Expected with idempotency keys, or use `ON CONFLICT`. |
| `23503`, `23502`, `23514` | Foreign key, not null, check. | A bug in the write or the schema. |
| `42601`, `42P01` | Syntax error (also two statements in one call), no such table. | One statement per call; run migrations first. |
| `40001`, `40P01` | Serialization failure, deadlock. | Retry the whole transaction; lock rows in a fixed order. |
| `25P02` | A statement after a failed one in a transaction. | Check every `err` in `fn`. |
| `db_queue_full` | 1000 statements already waiting. | You send faster than the database answers. |
| `db_result_cap` | More rows than `max_rows`. | `LIMIT` and page through. |
| `db_tx_timeout` | The transaction ran too long, or waited too long for a connection. | Shorter transactions. |
| `db_tx_aborted` | Rolled back because the resource was unloaded. | Nothing to do. |
| `db_params` | A value the module can't send. | Fix the parameters. |
| `rollback` | `fn` raised or called `tx:rollback`. | Your own decision; a cause's code is in `err.cause.code`. |

A reload or shutdown between sending a statement and its answer drops the answer: the callback never
runs, though the statement may well have.

### Writes that must not happen twice

A lost connection, a dropped answer or a player clicking twice leaves you not knowing whether a write
happened. Let the database refuse the repeat: give each intended action a key, store it in a
`UNIQUE` column, and treat `23505` on it as "already done".

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

The insert goes first, so a duplicate is refused before any balance moves.

## Migrations

The server doesn't manage your tables; your resource creates and upgrades them at load. Do it in one
transaction, take a lock so two servers sharing the database don't migrate at once, and record how far
you got:

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

`pg_advisory_xact_lock` ends with the transaction; the session-level `pg_advisory_lock` would stay on
the shared connection. SQLite doesn't need (or know) the lock line: it allows one writer at a time
anyway. Only ever append to `MIGRATIONS`; never edit a step that has run somewhere.

Run it at load, once the database answers, and hold the rest of the resource until it's done:

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

## Performance

- **Don't flood the queue.** A statement per `serverTick` or per position update fills the
  1000-statement queue. Poll on a timer, batch writes, and keep rarely changing data in memory.
- **`connections`** is how many statements run at once, and each transaction holds one for its whole
  life. Raise it when statements wait; a PostgreSQL connection is a process on the database side, so
  keep it in the tens.
- **Slow statements are logged**: `db[default]: slow statement (312 ms): SELECT ...` for anything
  over 250 ms, parameters never shown. Treat them as a to-do list for indexes.
- **`db:status()`** gives counters for every connection: statements run and failed, latency, queue
  depth, open transactions. Log it from a timer if you want to watch.

## A complete example: wallet transfers

A resource `wallet` with a balance per account, a ledger, `/balance` and `/pay <player> <coins>`.
Balances are integer cents; a transfer is one transaction that records the ledger row under an
idempotency key, locks both wallets in id order, checks the funds and moves them. `db.lua` sits
next to `main.lua` in `server/`.

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

Why it's shaped like this: the ledger insert comes first, so a retry with the same key stops at
`23505` before anything moves and the player hears "already applied" instead of paying twice.
Locking both rows in a fixed order lets two transfers between the same pair queue up instead of
deadlocking. The balance check reads the locked rows, so nothing can slip in between the check and
the update. The only retry is on `08006`, the one case where the outcome is unknown. And amounts are
integers all the way, so nobody ever sees a rounding error.

## Coming from node.pg

Before 1.3.0 the database was part of the server as `node.pg`. The calls kept their shape:

| Was | Is |
|---|---|
| `node.pg.query/exec/tx` | `db:query/exec/tx` on `require("db").open()` |
| `node.pg.NULL` | `db.NULL` |
| `node.pg.enabled()` | gone: a missing connection answers `db_disabled` |
| `node.pg.ready()` | `db:ready()` |
| `[Database]` in `server.toml` | `[connections.default]` in `modules/db.toml` |
| `NODE_DATABASE_URL` | `NODE_DB_URL` (the old name still works) |
| `pg_disabled`, `pg_queue_full`, `pg_result_cap`, `tx_timeout`, `pg_params` | `db_disabled`, `db_queue_full`, `db_result_cap`, `db_tx_timeout`, `db_params` |

## Next

- [Timers and coroutines](/plugins/concurrency/): `node.async` and `node.suspend`, which the
  callback-less form is built on.
- [Storage and files](/plugins/storage/): for data that doesn't need a database.
