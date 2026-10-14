---
title: Хранилище и файлы
description: Как хранить данные между перезапусками через node.storage, читать и писать файлы в папке ресурса, записывать надёжно, следить за файлом и когда лучше взять базу данных.
---

Переменные Lua живут, пока живёт ресурс: перезагрузка или перезапуск их стирают. То, что должно
сохраниться, кладут в хранилище, в файлы или в [базу данных](/ru/plugins/database/).

## node.storage

У каждого ресурса своё хранилище «ключ — значение» в папке `storage/` рабочей папки сервера:
`<ресурс>.json` с данными и `<ресурс>.log` с изменениями после него. Значения — всё, что умеет JSON:
числа, строки, логические значения, таблицы. Каждый `set` оказывается на диске до того, как вернёт
управление, так что падение сервера его не потеряет.

| Вызов | Что делает |
|---|---|
| `node.storage.get(key, default)` | Сохранённое значение или `default`, если его нет. |
| `node.storage.set(key, value)` | Сохраняет значение. |
| `node.storage.delete(key)` | Удаляет ключ. |

Счётчик визитов игрока по аккаунту — он не зависит от имени и адреса:

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

Таблица сохраняется и возвращается целиком:

<!-- doctest: server -->
```lua
node.storage.set("race", { laps = 3, track = "west" })

local race = node.storage.get("race")
node.log("laps=%d track=%s", race.laps, race.track)

-- expect: laps=3 track=west
```

Всё хранилище держится в памяти, а искать в нём можно только по ключу. Это подходит для настроек,
счётчиков и записей по игрокам. Данные, по которым нужно искать, которые нужно сортировать или
делить между серверами, место в базе данных.

## Файлы в папке ресурса

`node.fs` читает и пишет файлы внутри папки самого ресурса. Путь отсчитывается от этой папки, через
прямые слеши; путь за её пределы сервер отклоняет.

| Вызов | Что делает |
|---|---|
| `node.fs.read(path)` | Содержимое файла или `nil`. |
| `node.fs.write(path, data)` | Записывает файл, создавая папки по пути. |
| `node.fs.list(path)` | Содержимое папки: `name`, `dir`, `size`. |
| `node.fs.exists(path)` | `"file"`, `"dir"` или `nil`. |
| `node.fs.mkdir(path)` | Создаёт папку вместе с родительскими. |
| `node.fs.remove(path, recursive)` | Удаляет файл или папку. |
| `node.fs.rename(from, to)` | Переименовывает или переносит, заменяя цель. |

<!-- doctest: server -->
```lua
node.fs.mkdir("reports")
local report = node.json.encode({ ok = true }, { pretty = true })
node.fs.write("reports/today.json", report)

local back = node.json.decode(node.fs.read("reports/today.json"))
node.log("read back: %s", back.ok and "ok" or "?")

-- expect: read back: ok
```

`node.fs.write` не атомарен: если сервер упадёт посреди записи, останется полфайла. Когда это важно,
пишите во временный файл и переименовывайте — переименование заменяет старый файл за один шаг:

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

Большой файл, запись которого задержала бы рабочий поток, пишет `node.fs.writeAsync(path, data,
done)`: в фоновом потоке, а потом вызывает `done(ok)`.

## Слежка за файлом

`node.fs.watch(path, fn)` вызывает `fn(path, "changed")` или `fn(path, "removed")` примерно через
секунду после изменения. Удобно для списка, который хост правит руками, пока сервер работает:

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

`node.fs.unwatch(id)` прекращает слежку; вместе с ресурсом заканчиваются и все его слежки.
