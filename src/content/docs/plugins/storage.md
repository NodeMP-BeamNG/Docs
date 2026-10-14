---
title: Storage and files
description: Keeping data across restarts with node.storage, reading and writing files in the resource folder, safe writes, watching a file, and when to use a database instead.
---

Lua variables live as long as the resource: a reload or a restart clears them. Data that must last
goes into storage, into files, or into a [database](/plugins/database/).

## node.storage

Every resource has a key-value store of its own, in the `storage/` folder of the server's working
directory: `<resource>.json` with the data and `<resource>.log` with the changes since. Values are
anything JSON can hold: numbers, strings, booleans, tables. Every `set` is on disk before it returns,
so a crash doesn't lose it.

| Call | What it does |
|---|---|
| `node.storage.get(key, default)` | The stored value, or `default` when there is none. |
| `node.storage.set(key, value)` | Stores the value. |
| `node.storage.delete(key)` | Removes the key. |

Counting a player's visits, keyed by the account so it follows the player across names and
addresses:

<!-- doctest: server+client -->
```lua
node.on("playerJoined", function(player)
    if not player.accountId then return end
    local key = "visits:" .. player.accountId
    local visits = node.storage.get(key, 0) + 1
    node.storage.set(key, visits)
    player:tell("Visit number %d", visits)
end)

-- expect-client: Alice chat:msg .*Visit number \d+
```

A table goes in and comes out whole:

<!-- doctest: server -->
```lua
node.storage.set("race", { laps = 3, track = "west" })

local race = node.storage.get("race")
node.log("laps=%d track=%s", race.laps, race.track)

-- expect: laps=3 track=west
```

The whole store is kept in memory, and you can only look things up by key. That suits settings,
counters and per-player records. Data you want to search, sort or share between servers belongs in a
database.

## Files in the resource folder

`node.fs` reads and writes files inside the resource's own folder. A path is relative to that folder,
with forward slashes; a path that leads outside it is refused.

| Call | What it does |
|---|---|
| `node.fs.read(path)` | The file's contents, or `nil`. |
| `node.fs.write(path, data)` | Writes the file, creating folders on the way. |
| `node.fs.list(path)` | The folder's entries: `name`, `dir`, `size`. |
| `node.fs.exists(path)` | `"file"`, `"dir"` or `nil`. |
| `node.fs.mkdir(path)` | Creates a folder and its parents. |
| `node.fs.remove(path, recursive)` | Deletes a file, or a folder. |
| `node.fs.rename(from, to)` | Renames or moves, replacing the target. |

<!-- doctest: server -->
```lua
node.fs.mkdir("reports")
local report = node.json.encode({ ok = true }, { pretty = true })
node.fs.write("reports/today.json", report)

local back = node.json.decode(node.fs.read("reports/today.json"))
node.log("read back: %s", back.ok and "ok" or "?")

-- expect: read back: ok
```

`node.fs.write` isn't atomic: a crash in the middle leaves half a file. When that matters, write to a
temporary name and rename, which replaces the old file in one step:

<!-- doctest: server -->
```lua
local function saveFile(path, data)
    local tmp = path .. ".tmp"
    if not node.fs.write(tmp, data) then return false end
    return node.fs.rename(tmp, path)
end

node.log("saved: %s", tostring(saveFile("state.json", "{}")))

-- expect: saved: true
```

For a big file that would hold the worker up, `node.fs.writeAsync(path, data, done)` writes on a
background thread and calls `done(ok)` afterwards.

## Watching a file

`node.fs.watch(path, fn)` calls `fn(path, "changed")` or `fn(path, "removed")` within about a second
of a change. Handy for a list the host edits by hand while the server runs:

<!-- doctest: server -->
```lua
node.fs.watch("notes.txt", function(path, what)
    node.log("%s %s", path, what)
end)

node.after(1500, function()
    node.fs.write("notes.txt", "hello")
end)

-- expect: notes.txt changed
```

`node.fs.unwatch(id)` stops a watch; watches end with the resource.
