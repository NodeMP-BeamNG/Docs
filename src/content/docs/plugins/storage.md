---
title: Storage and files
description: node.storage for state that survives restarts, node.fs for files in your resource folder - reading, writing safely, folders, and watching a file for changes.
---

A resource keeps data in two places: **`node.storage`** for state (scores, settings players changed,
who was muted), and **`node.fs`** for files in its own folder (data you ship, reports you write).
For lots of data, or data shared with a website, use a [database](/plugins/database/).

## node.storage

A key-value store per resource that survives reloads, restarts and crashes. Values are anything that
fits in JSON: strings, numbers, booleans and tables (an array when its keys are `1..n`, an object
otherwise). Keys are strings up to 256 bytes.

| Call | Does |
|---|---|
| `node.storage.get(key, default)` | the stored value, or `default` when there is none |
| `node.storage.set(key, value)` | stores the value; `false` if it couldn't be written to disk |
| `node.storage.delete(key)` | removes the key; `false` when it wasn't there |

<!-- doctest: server+client -->
```lua
local visits = node.storage.get("visits", 0) + 1
node.storage.set("visits", visits)
node.log("server start number %d", visits)

node.on("playerJoined", function(player)
    if player.accountId then
        node.storage.set("lastSeen:" .. player.accountId, node.server.unixTime())
        node.log("last seen of account %d is %d", player.accountId, node.storage.get("lastSeen:" .. player.accountId))
    end
end)

-- expect: server start number 1
-- expect: last seen of account 42 is \d+
```

Each `set` is on disk before it returns, so even if the server process crashes, nothing you stored
is lost. It costs the size of the value, not of the whole store, so calling it from a handler is
fine.

Keep data under `player.accountId` (or `player.name` for guests), never under `player.id`, which is
reused.

### Where it lives

The store is `storage/<resource>.json` in the server's working directory, plus a change log
`storage/<resource>.log` while the server runs. After a clean stop you'll find one readable JSON
file. A `.log` left behind by a crash is replayed at the next start
(`storage 'race' replayed 3 changes from its log`). Edit the JSON by hand only while the server is
stopped. Hosts should back up `storage/` ([Running a server](/hosting/running/#what-to-back-up)).

## node.fs

`node.fs` works inside your resource folder and nowhere else. Paths are relative to the folder, use
`/` on every system, and may not contain `..`, a drive or a leading `/`. A path that leaves the
folder gets `nil` (or `false`) and, from the newer calls, the reason `"outside"`.

### Reading and writing

| Call | Does |
|---|---|
| `node.fs.read(path)` | the file's contents, or `nil` |
| `node.fs.write(path, data)` | writes the file, creating folders on the way. Synchronous. |
| `node.fs.writeAsync(path, data, cb)` | writes on a background thread; `cb(ok)` runs afterwards. Several writes to one file before it gets there collapse into the last. |
| `node.fs.list(path)` | the entries of a folder (`name`, `dir`, `size`); the resource folder when `path` is omitted |

<!-- doctest: server {"files": {"data/words.json": "[\"hello\", \"welcome\"]"}} -->
```lua
local words = node.json.decode(node.fs.read("data/words.json") or "[]") or {}
node.log("%d word(s) shipped with the resource", #words)

local lines = {}
for _, p in ipairs(node.players.all()) do
    lines[#lines + 1] = string.format("%s\t%s", p.name, p.ip or "?")
end
node.fs.writeAsync("reports/" .. os.date("%Y-%m-%d") .. ".txt", table.concat(lines, "\n"), function(ok)
    node.log("report written: %s", tostring(ok))
end)

-- expect: 2 word\(s\) shipped with the resource
-- expect: report written: true
```

Use `writeAsync` for anything bigger than a few kilobytes, so the worker doesn't wait for the disk.

### Folders, copies and renames

| Call | Returns |
|---|---|
| `node.fs.exists(path)` | `"file"`, `"dir"` or `nil` |
| `node.fs.stat(path)` | `{ dir, size, mtime }`, or `nil, "not found"` |
| `node.fs.mkdir(path)` | creates the folder and any missing parents |
| `node.fs.copy(from, to)` | copies a file, replacing the target |
| `node.fs.rename(from, to)` | renames or moves, replacing the target |
| `node.fs.remove(path, recursive)` | removes a file or empty folder; a full folder needs `recursive = true` |

They return `true`, or `false` (or `nil`) and a reason. `node.fs.join(...)`, `node.fs.dirname`,
`node.fs.basename` and `node.fs.extension` build and take apart paths.

<!-- doctest: server {"files": {"data/config.json": "{\"level\": 1}"}} -->
```lua
node.log("data/config.json is a %s", tostring(node.fs.exists("data/config.json")))
node.log("data/missing.json: %s", tostring(node.fs.exists("data/missing.json")))

assert(node.fs.mkdir("backup/old"))
assert(node.fs.copy("data/config.json", node.fs.join("backup", "config.json")))
local info = node.fs.stat("backup/config.json")
node.log("backup is %d bytes", info.size)

assert(node.fs.remove("backup", true))
node.log("backup removed: %s", tostring(node.fs.exists("backup") == nil))

-- expect: data/config.json is a file
-- expect: data/missing.json: nil
-- expect: backup is 12 bytes
-- expect: backup removed: true
```

### Writing a file safely

`node.fs.write` replaces the file in place, so a crash halfway leaves half a file. When a file must
never be half-written, write a temporary file and rename it over the real one. The rename is atomic
where the system allows:

<!-- doctest: server -->
```lua
local function saveJson(path, value)
    local tmp = path .. ".tmp"
    if not node.fs.write(tmp, node.json.encode(value, { pretty = true })) then
        return false, "write failed"
    end
    return node.fs.rename(tmp, path)
end

assert(saveJson("data/standings.json", { { name = "Alice", points = 25 } }))
node.log("saved: %s", node.fs.read("data/standings.json"):match('"name": "(%w+)"'))

-- expect: saved: Alice
```

### Watching a file

`node.fs.watch(path, fn)` calls `fn(path, "changed")` or `fn(path, "removed")` within about a second
of the file changing, appearing or disappearing. Use it for a data file the host edits while the
server runs. It returns an id for `node.fs.unwatch(id)`; a resource can watch up to 64 files, and a
reload drops the watches.

<!-- doctest: server {"files": {"data/rules.json": "[]"}} -->
```lua
local rules = node.json.decode(node.fs.read("data/rules.json") or "[]") or {}

node.fs.watch("data/rules.json", function(path, what)
    if what == "changed" then
        rules = node.json.decode(node.fs.read(path) or "[]") or rules
        node.log("%s reloaded: %d rule(s)", path, #rules)
    end
end)

node.after(1500, function() node.fs.write("data/rules.json", '[{"speed": 90}]') end) -- the host editing the file

-- expect: data/rules\.json reloaded: 1 rule\(s\)
```

Changes to your own `server/` and `client/` files aren't picked up automatically: `reload <name>` in
the console picks up `server/`, and `client/` needs a restart.

## node.json

Most of the API encodes for you: a table given to `player:send`, `node.bus.emit` or
`node.storage.set` becomes JSON on its own. For everything else:

- `node.json.encode(value, { pretty = true })` and `node.json.decode(text)` (`nil` on bad JSON);
- `node.json.diff(a, b)` and `node.json.patch(a, ops)` compute and apply the changes between two
  values, for sending only what changed;
- `node.json.flatten(value)` and `node.json.unflatten(flat)` turn a nested table into flat
  `"/a/b/1"` keys and back.

## Next

- [Database](/plugins/database/): PostgreSQL, MySQL and SQLite through the `db` module.
- [HTTP](/plugins/http/): talking to websites and services.
