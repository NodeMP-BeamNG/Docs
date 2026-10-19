---
title: The db module
description: Setting up the db module, db.lua, queries with placeholders, creating tables, transactions, NULL and errors in PostgreSQL, SQLite and MySQL.
---

The database module ships with the server: `db.dll` or `db.so` in `modules/`. It works the same way with PostgreSQL, SQLite and MySQL/MariaDB. You write the SQL, the placeholders `$1`, `$2`… work on every engine, and values are sent separately from the query text.

## Setting it up

The host tells the module where the database is. Copy `db.example.toml` from the `modules/` folder next to the program to `modules/db.toml` in the server's working folder, and fill in the `default` connection. A `db.toml` directly in the working folder works too.

```toml
[connections.default]
driver = "postgres"
url = "postgres://node:secret@127.0.0.1/node"
connections = 4
```

| Key | Default | What it means |
|---|---|---|
| `driver` | guessed from `url` | `postgres`, `sqlite` or `mysql`. Without the key the engine comes from `url`: `postgres://`, `postgresql://` or a `host=… dbname=…` string means PostgreSQL, `mysql://` or `mariadb://` means MySQL, anything else SQLite. |
| `url` | none | The database address. For SQLite it is a file path from the server's folder, for example `"data/server.db"`; `":memory:"` gives an in-memory database that disappears when the server stops. |
| `connections` | `4` | How many connections the pool keeps, from 1 to 32. That many queries can run at once. |
| `query_timeout_ms` | `10000` | How long one query may run. |
| `tx_timeout_ms` | `30000` | How long a transaction may stay open, including the wait for a free connection. |
| `max_rows` | `10000` | A result with more rows than this ends with the error `db_result_cap`. |

The module reads the file once, at startup. The password doesn't have to be in the file: the environment variable `NODE_DB_DEFAULT_URL` replaces the address from the file (for a connection with another name it is `NODE_DB_<NAME>_URL`), and without a file the module takes `NODE_DB_URL`. Until a connection is configured, the module writes `no database configured` at startup and answers every request with the error `db_disabled`.

## db.lua in a plugin

A plugin talks to the module through a small library, `db.lua`, which lies in `modules/` next to the module. Copy it into the plugin's `server/` folder and load it:

<!-- doctest: skip the doctest runner puts these lines in front of every db block -->
```lua
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]")
package.path = here .. "/?.lua;" .. package.path
local db = require("db").open()
```

`open()` takes the `default` connection, and `open("stats")` takes another one from `db.toml`. Write every call with a colon: `db:query(...)`. The library rejects a call with a dot and says why. After you update the server, copy the new `db.lua` over the old one.

## Queries

| Call | What it returns |
|---|---|
| `db:query(sql, params)` | `{ rows, count, columns }`, or `nil, err`. Each row in `rows` is a table of column = value. |
| `db:exec(sql, params)` | The number of rows changed, or `nil, err`. For `insert`, `update` and `delete`. |
| `db:ready()` | `true` once the connection is up. |
| `db:status()` | The driver, state and counters of all connections, in one table. |

Inside `node.async` the calls wait for the answer and return it. If you pass a function as the last argument, the call returns at once and calls that function later with `(result, err)`.

A plugin usually creates its tables at startup. In the first moments after the server starts the connection may not be up yet, so wait for it:

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

A visit counter: one statement inserts the first visit or adds one, and a second reads the number.

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

`db:tx(fn)` reserves one connection for the whole of `fn`. Inside it, `tx:query` and `tx:exec` always wait for their answers. When `fn` returns, the changes are saved; if it raises an error or calls `tx:rollback(reason)`, they are undone. `db:tx` returns what `fn` returned, or `nil, err`. For a rollback the error's `code` is `"rollback"`, and what `fn` raised is in `err.cause`.

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

The module rolls back a transaction that runs longer than `tx_timeout_ms` from `db.toml`, so a forgotten transaction doesn't hold a connection forever. If the plugin is reloaded or stopped in the middle of a transaction, the connection is released at once.

## NULL and other values

A parameter list is a Lua array, and a `nil` would end it early. Write `db.NULL` for SQL NULL. The library rejects a list with a gap with an error; if you need a gap, give the length explicitly: `{ a, nil, b, n = 3 }` sends `nil` as NULL.

<!-- doctest: skip shows only the parameter list -->
```lua
db:exec("insert into notes (id, text) values ($1, $2)", { 7, db.NULL })
```

A table in the parameters is sent as JSON, for `json` or `jsonb` columns.

## Errors

An error isn't raised: it is returned as a value `{ code, message, detail, constraint, … }`. The code is a SQLSTATE, the same on every engine for the same error, or a code of the module itself that starts with `db_`:

| Code | What it means |
|---|---|
| `23505` | That unique key already exists; `constraint` names it if the engine reports the name. |
| `23503`, `23502`, `23514` | A foreign key, NOT NULL or CHECK constraint was violated. |
| `42601`, `42P01` | A syntax error; no such table. |
| `57014` | The query ran longer than `query_timeout_ms`. |
| `08001`, `08006` | There is no connection; the connection was lost. |
| `db_disabled` | There is no connection with that name, or the module isn't configured. |
| `db_tx_timeout` | The transaction ran longer than `tx_timeout_ms`. |
| `db_result_cap` | The result has more rows than `max_rows`. |
| `db_params` | The parameter list or the SQL can't be used. |
