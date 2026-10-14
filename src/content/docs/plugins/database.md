---
title: The db module
description: PostgreSQL, SQLite or MySQL from a resource - setting up the module, db.lua, queries with placeholders, creating tables at start, transactions, NULL and errors.
---

The database lives in a native module that ships with the server: `db.dll` or `db.so` in
`modules/`. It speaks to PostgreSQL, SQLite and MySQL/MariaDB the same way: the SQL is yours, the
placeholders are `$1`, `$2`… on every engine, and a value never goes into the SQL text.

## Setting it up

The host tells the module where the database is. Copy `modules/db.example.toml` to
`modules/db.toml` and fill in the `default` connection:

```toml
[connections.default]
driver = "postgres"
url = "postgres://node:secret@127.0.0.1/node"
connections = 4
```

`driver` is `postgres`, `sqlite` or `mysql`; for SQLite the `url` is a file path such as
`"data/server.db"`. The password doesn't have to be in the file: the `NODE_DB_DEFAULT_URL`
environment variable wins over it, and without a file at all the module takes `NODE_DB_URL`. Until a
connection is configured, the module logs `no database configured` at start and answers every
request with an error.

## db.lua in a resource

A resource talks to the module through a small library, `db.lua`, which comes in `modules/` next to
the module. Copy it into the resource's `server/` folder and load it:

<!-- doctest: skip the doctest runner puts these lines in front of every db block -->
```lua
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]")
package.path = here .. "/?.lua;" .. package.path
local db = require("db").open()
```

`open()` takes the `default` connection; `open("stats")` another one from `db.toml`. Every call is a
method, with a colon: `db:query(...)`. After a server update, copy the new `db.lua` over the old one.

## Queries

| Call | Gives |
|---|---|
| `db:query(sql, params)` | `{ rows, count, columns }`, or `nil, err`. Each row is a table of column = value. |
| `db:exec(sql, params)` | How many rows changed, or `nil, err`. For `insert`, `update`, `delete`. |
| `db:ready()` | `true` once the connection is up. |

Inside `node.async` the calls wait for the answer and return it. With a function as the last
argument they return at once and call it later with `(result, err)` instead.

A resource usually creates its tables when it starts. The connection may not be up in the first
moments after the server starts, so wait for it:

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

Counting visits: one statement inserts the first visit or adds one, a second reads the number back.

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

## Transactions

`db:tx(fn)` reserves one connection for the whole of `fn`. Inside it, `tx:query` and `tx:exec`
always wait for their answers. When `fn` returns, the changes are committed; when it raises an error
or calls `tx:rollback(reason)`, they're undone. `db:tx` returns what `fn` returned, or `nil, err`.

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

A transaction that runs longer than `tx_timeout_ms` from `db.toml` is rolled back, so a forgotten
one can't hold a connection forever. A resource that is reloaded or stopped mid-transaction releases
it at once.

## NULL and other values

A parameter list is a Lua array, and `nil` would end it early. For SQL NULL write `db.NULL`:

<!-- doctest: skip shows only the parameter list -->
```lua
db:exec("insert into notes (id, text) values ($1, $2)", { 7, db.NULL })
```

A table as a parameter is sent as JSON, for a `json` or `jsonb` column.

## Errors

An error is a value, never a raised one: `{ code, message, detail, constraint, … }`. The code is the
SQLSTATE where the engine has one, and every engine is mapped to the same codes:

| Code | Means |
|---|---|
| `23505` | A unique key already exists; `constraint` names it. |
| `23503`, `23502`, `23514` | A foreign key, a NOT NULL or a CHECK failed. |
| `42601`, `42P01` | A syntax error; no such table. |
| `57014` | The statement ran out of time. |
| `08001`, `08006` | No connection; the connection was lost. |
| `db_disabled` | No connection by that name. |
| `db_tx_timeout` | The transaction ran past `tx_timeout_ms`. |
| `db_params` | The parameter list or the SQL can't be used. |
