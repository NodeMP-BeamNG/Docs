---
title: Хранилище и файлы
description: Как хранить данные между перезапусками через node.storage, читать и писать файлы в папке плагина, записывать надёжно, следить за файлом и когда лучше взять базу данных.
---

Переменные Lua пропадают при перезагрузке плагина и перезапуске сервера. То, что должно сохраниться, кладут в хранилище `node.storage`, в файлы или в [базу данных](/ru/plugins/database/).

## node.storage

У каждого плагина своё хранилище «ключ — значение» в папке `storage/` рабочей папки сервера: `<имя плагина>.json` с данными и `<имя плагина>.log` с изменениями после них. Значения хранятся как JSON, поэтому это числа, строки, логические значения и таблицы. Каждый `set` оказывается на диске до того, как вернёт управление, так что падение сервера его не потеряет. От выключения питания это не защищает.

| Вызов | Что делает |
|---|---|
| `node.storage.get(key, default)` | Сохранённое значение или `default`, если его нет. |
| `node.storage.set(key, value)` | Сохраняет значение; `false`, если ключ не подходит или запись на диск не удалась. |
| `node.storage.delete(key)` | Удаляет ключ, `false`, если такого нет. |

Ключ — непустая строка до 256 байт. Выбираете ключи вы, а префикс не даёт им перепутаться: `visits:42`, `settings`.

Счётчик визитов по аккаунту не зависит от имени и адреса игрока:

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

Таблица сохраняется и возвращается целиком:

<!-- doctest: server -->
```lua
node.storage.set("race", { laps = 3, track = "west" })

local race = node.storage.get("race")
node.log("laps=%d track=%s", race.laps, race.track)

-- expect: laps=3 track=west
```

Всё хранилище лежит в памяти, а искать в нём можно только по ключу. Для настроек, счётчиков и записей по игрокам это подходит. Данным, которые нужно искать, сортировать или делить между серверами, место в базе данных.

## Файлы в папке плагина

`node.fs` читает и пишет файлы внутри папки самого плагина. Путь отсчитывается от этой папки, через прямые слеши. Абсолютный путь и шаг `..` сервер отклоняет.

| Вызов | Что делает |
|---|---|
| `node.fs.read(path)` | Содержимое файла или `nil`. |
| `node.fs.write(path, data)` | Записывает файл, создавая папки по пути. |
| `node.fs.list(path)` | Содержимое папки в записях `name`, `dir`, `size`. |
| `node.fs.exists(path)` | `"file"`, `"dir"` или `nil`. |
| `node.fs.stat(path)` | `{ dir, size, mtime }` или `nil` и причина `"outside"` либо `"not found"`. |
| `node.fs.mkdir(path)` | Создаёт папку вместе с родительскими. |
| `node.fs.remove(path, recursive)` | Удаляет файл или пустую папку; папку с содержимым только с `recursive = true`. |
| `node.fs.rename(from, to)` | Переименовывает или переносит, заменяя цель. |
| `node.fs.copy(from, to)` | Копирует файл, заменяя цель. |

Для путей есть `node.fs.join`, `node.fs.dirname`, `node.fs.basename` и `node.fs.extension`.

<!-- doctest: server -->
```lua
node.fs.mkdir("reports")
local report = node.json.encode({ ok = true }, { pretty = true })
node.fs.write("reports/today.json", report)

local back = node.json.decode(node.fs.read("reports/today.json"))
node.log("read back: %s", back.ok and "ok" or "?")

-- expect: read back: ok
```

`node.fs.write` не атомарен: если сервер упадёт посреди записи, останется полфайла. Когда это важно, пишите во временный файл и переименовывайте: переименование заменяет старый файл за один шаг.

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

Большой файл, запись которого задержала бы рабочий поток, пишет `node.fs.writeAsync(path, data, done)`: в фоновом потоке, а потом вызывает `done(ok)`.

## Слежка за файлом

`node.fs.watch(path, fn)` вызывает `fn(path, "changed")` или `fn(path, "removed")` примерно через секунду после изменения. Удобно для списка, который хост правит руками, пока сервер работает:

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

`node.fs.watch` возвращает id слежки, а `node.fs.unwatch(id)` её прекращает. У плагина не больше 64 слежек, следующая вернёт `nil, "limit"`. Когда плагин выгружается, его слежки заканчиваются.
