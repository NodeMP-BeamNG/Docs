---
title: Storage and files
description: Keeping data with node.storage, files in the plugin's folder, safe writes, watching a file, and when a database fits better.
---

Lua variables are lost when a plugin reloads or the server restarts. Put what must survive in `node.storage`, in files or in a [database](/plugins/database/).

## node.storage

Each plugin has its own key-value store in `storage/` under the server's working folder: `<plugin name>.json` holds the data, `<plugin name>.log` the changes since. Values are stored as JSON: numbers, strings, booleans and tables. Each `set` is on disk before it returns, so a server crash doesn't lose it; a power cut can.

| Call | What it does |
|---|---|
| `node.storage.get(key, default)` | The stored value, or `default` if there is none. |
| `node.storage.set(key, value)` | Stores the value; `false` for an unusable key or a failed write. |
| `node.storage.delete(key)` | Removes the key; `false` if it doesn't exist. |

A key is a non-empty string of up to 256 bytes. You choose the keys; a prefix keeps them apart: `visits:42`, `settings`.

A visit counter keyed by account doesn't depend on the player's name or address:

<!-- doctest: server+client -->
```lua
local function countVisit(player)
    if not player.accountId then return end
    local key = "visits:" .. player.accountId
    local visits = node.storage.get(key, 0) + 1
    node.storage.set(key, visits)
    player:tell("Visit number %d", visits)
end

node.on("playerJoined", countVisit)

-- expect-client: Alice chat:msg .*Visit number \d+
```

A table is stored and returned whole:

<!-- doctest: server -->
```lua
node.storage.set("race", { laps = 3, track = "west" })

local race = node.storage.get("race")
node.log("laps=%d track=%s", race.laps, race.track)

-- expect: laps=3 track=west
```

The whole store is held in memory and looked up only by key: fine for settings, counters and per-player records. Data to search, sort or share between servers belongs in a database.

## Files in the plugin's folder

`node.fs` reads and writes files in the plugin's own folder. Paths count from that folder, with forward slashes; the server refuses absolute paths and `..` steps.

| Call | What it does |
|---|---|
| `node.fs.read(path)` | The file's contents, or `nil`. |
| `node.fs.write(path, data)` | Writes the file, creating folders along the path. |
| `node.fs.list(path)` | The folder's entries, with `name`, `dir` and `size`. |
| `node.fs.exists(path)` | `"file"`, `"dir"` or `nil`. |
| `node.fs.stat(path)` | `{ dir, size, mtime }`, or `nil` and the reason `"outside"` or `"not found"`. |
| `node.fs.mkdir(path)` | Creates a folder and its parents. |
| `node.fs.remove(path, recursive)` | Deletes a file or an empty folder; a folder with contents only with `recursive = true`. |
| `node.fs.rename(from, to)` | Renames or moves, replacing the target. |
| `node.fs.copy(from, to)` | Copies a file, replacing the target. |

For paths there are `node.fs.join`, `node.fs.dirname`, `node.fs.basename` and `node.fs.extension`.

<!-- doctest: server -->
```lua
node.fs.mkdir("reports")
local report = node.json.encode({ ok = true }, { pretty = true })
node.fs.write("reports/today.json", report)

local back = node.json.decode(node.fs.read("reports/today.json"))
node.log("read back: %s", back.ok and "ok" or "?")

-- expect: read back: ok
```

`node.fs.write` isn't atomic: a crash mid-write leaves half a file. When that matters, write a temporary file and rename it, which replaces the old file in one step.

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

For a big file whose write would hold up the worker thread, `node.fs.writeAsync(path, data, done)` writes on a background thread, then calls `done(ok)`.

## Watching a file

`node.fs.watch(path, fn)` calls `fn(path, "changed")` or `fn(path, "removed")` about a second after a change, which suits a list the host edits by hand while the server runs:

<!-- doctest: server -->
```lua
local function logChange(path, what)
    node.log("%s %s", path, what)
end

node.fs.watch("notes.txt", logChange)

local function writeNotes()
    node.fs.write("notes.txt", "hello")
end

node.after(1500, writeNotes)

-- expect: notes.txt changed
```

`node.fs.watch` returns an id, and `node.fs.unwatch(id)` stops the watch. A plugin can have at most 64 watches; the next call returns `nil, "limit"`. Watches end when the plugin unloads.
