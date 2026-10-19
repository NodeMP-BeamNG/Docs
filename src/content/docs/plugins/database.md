---
title: The db module
description: Setting up the db module, db.lua, queries with placeholders, creating tables, transactions, NULL and errors in PostgreSQL, SQLite and MySQL.
---

The database module ships with the server as `db.dll` or `db.so` in `modules/` and works the same with PostgreSQL, SQLite and MySQL/MariaDB. You write the SQL; the placeholders `$1`, `$2`… work on every engine, and values travel separately from the query text.

## Setting it up

The host tells the module where the database is: copy `db.example.toml` from `modules/` next to the program to `modules/db.toml` in the server's working folder and fill in the `default` connection. A `db.toml` directly in the working folder also works.

```toml
[connections.default]
driver = "postgres"
url = "postgres://node:secret@127.0.0.1/node"
connections = 4
```

| Key | Default | What it means |
|---|---|---|
| `driver` | from `url` | `postgres`, `sqlite` or `mysql`. Without it, `url` decides: `postgres://`, `postgresql://` or a `host=… dbname=…` string is PostgreSQL, `mysql://` or `mariadb://` is MySQL, anything else SQLite. |
| `url` | none | The database address. For SQLite, a file path from the server's folder, such as `"data/server.db"`; `":memory:"` is an in-memory database that is gone when the server stops. |
| `connections` | `4` | The pool size, from 1 to 32: how many queries can run at once. |
| `query_timeout_ms` | `10000` | How long one query may run. |
| `tx_timeout_ms` | `30000` | How long a transaction may stay open, including the wait for a free connection. |
| `max_rows` | `10000` | A result with more rows fails with `db_result_cap`. |

The module reads the file once, at startup. To keep the password out of the file, set `NODE_DB_DEFAULT_URL`: it replaces the file's address (`NODE_DB_<NAME>_URL` for a connection with another name). Without a file the module takes `NODE_DB_URL`. With no connection configured, the module logs `no database configured` at startup and answers every request with `db_disabled`.

## db.lua in a plugin

Plugins reach the module through `db.lua`, a small library in `modules/` next to the module. Copy it into the plugin's `server/` folder and load it:

<!-- doctest: skip the doctest runner puts these lines in front of every db block -->
```lua
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]")
package.path = here .. "/?.lua;" .. package.path
local db = require("db").open()
```

`open()` takes the `default` connection, `open("stats")` another one from `db.toml`. Call with a colon, `db:query(...)`: the library rejects a call with a dot and says why. After a server update, copy the new `db.lua` over the old one.

## Queries

| Call | What it returns |
|---|---|
| `db:query(sql, params)` | `{ rows, count, columns }`, or `nil, err`. Each row in `rows` is a column = value table. |
| `db:exec(sql, params)` | How many rows changed, or `nil, err`. For `insert`, `update` and `delete`. |
| `db:ready()` | `true` once the connection is up. |
| `db:status()` | One table with the driver, state and counters of every connection. |

Inside `node.async` the calls wait and return the answer. With a function as the last argument, the call returns at once and later calls it with `(result, err)`.

A plugin usually creates its tables at startup, when the connection may not be up yet, so wait for it:

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

A visit counter: one statement inserts the first visit or adds one, another reads the count.

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

## Transactions

`db:tx(fn)` holds one connection for all of `fn`, and inside it `tx:query` and `tx:exec` always wait for the answer. When `fn` returns, the changes are committed; if it raises an error or calls `tx:rollback(reason)`, they are undone. `db:tx` returns what `fn` returned, or `nil, err`. After a rollback `err.code` is `"rollback"` and what `fn` raised is in `err.cause`.

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

The module rolls back a transaction open longer than `tx_timeout_ms`, so a forgotten one can't hold a connection forever. If the plugin reloads or stops mid-transaction, the connection is freed at once.

## NULL and other values

A parameter list is a Lua array, where a `nil` would end it early, so write `db.NULL` for SQL NULL. The library rejects a list with a gap; to keep a gap, give the length: `{ a, nil, b, n = 3 }` sends the `nil` as NULL.

<!-- doctest: skip shows only the parameter list -->
```lua
db:exec("insert into notes (id, text) values ($1, $2)", { 7, db.NULL })
```

A table in the parameters is sent as JSON, for `json` or `jsonb` columns.

## Errors

Errors are returned, not raised, as `{ code, message, detail, constraint, … }`. The code is a SQLSTATE, the same on every engine for the same error, or the module's own code starting with `db_`:

| Code | What it means |
|---|---|
| `23505` | Duplicate unique key; `constraint` names it if the engine reports the name. |
| `23503`, `23502`, `23514` | A foreign key, NOT NULL or CHECK violation. |
| `42601`, `42P01` | A syntax error; no such table. |
| `57014` | The query ran longer than `query_timeout_ms`. |
| `08001`, `08006` | No connection; the connection was lost. |
| `db_disabled` | No connection by that name, or the module isn't configured. |
| `db_tx_timeout` | The transaction ran longer than `tx_timeout_ms`. |
| `db_result_cap` | More rows than `max_rows`. |
| `db_params` | The parameter list or the SQL is unusable. |
