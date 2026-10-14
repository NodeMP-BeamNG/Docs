---
title: Хранилище и файлы
description: node.storage для состояния, которое переживает перезапуски, node.fs для файлов в папке ресурса — чтение, надёжная запись, папки и слежение за файлом.
---

Ресурс хранит данные в двух местах: **`node.storage`** — для состояния (очки, настройки, которые
поменяли игроки, кто в муте), и **`node.fs`** — для файлов в собственной папке (данные, которые вы
поставляете с ресурсом, отчёты, которые он пишет). Когда данных много или они нужны ещё и сайту,
берите [базу данных](/ru/plugins/database/).

## node.storage

Хранилище «ключ — значение» у каждого ресурса своё и переживает перезагрузки, перезапуски и падения.
Значением может быть всё, что укладывается в JSON: строки, числа, логические значения и таблицы
(массив, если ключи `1..n`, иначе объект). Ключи — строки длиной до 256 байт.

| Вызов | Что делает |
|---|---|
| `node.storage.get(key, default)` | сохранённое значение или `default`, если его нет |
| `node.storage.set(key, value)` | сохраняет значение; `false`, если на диск записать не удалось |
| `node.storage.delete(key)` | удаляет ключ; `false`, если его не было |

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

Каждый `set` оказывается на диске раньше, чем вернётся, так что даже если процесс сервера упадёт,
ничего из сохранённого не пропадёт. Стоит запись столько, сколько весит значение, а не всё
хранилище, поэтому звать её из обработчика можно спокойно.

Храните данные под `player.accountId` (или `player.name` для гостей) и никогда под `player.id`:
номера достаются следующим игрокам.

### Где оно лежит

Хранилище — это `storage/<ресурс>.json` в рабочем каталоге сервера, а пока сервер работает, рядом
ведётся журнал изменений `storage/<ресурс>.log`. После чистой остановки остаётся один читаемый
JSON-файл. `.log`, оставшийся после падения, проигрывается при следующем запуске
(`storage 'race' replayed 3 changes from its log`). Править JSON руками можно только при
остановленном сервере. Владельцу сервера стоит делать резервную копию `storage/`
([Запуск сервера](/ru/hosting/running/#что-сохранять-в-резервную-копию)).

## node.fs

`node.fs` работает внутри папки вашего ресурса и больше нигде. Пути отсчитываются от этой папки,
пишутся через `/` на любой системе и не могут содержать `..`, букву диска или `/` в начале. Путь,
который выходит за пределы папки, получает `nil` (или `false`), а в новых вызовах ещё и причину
`"outside"`.

### Чтение и запись

| Вызов | Что делает |
|---|---|
| `node.fs.read(path)` | содержимое файла или `nil` |
| `node.fs.write(path, data)` | записывает файл, по дороге создаёт папки. Синхронно. |
| `node.fs.writeAsync(path, data, cb)` | записывает в фоновом потоке, потом вызывает `cb(ok)`. Несколько записей в один файл, которые не успели уйти, схлопываются в последнюю. |
| `node.fs.list(path)` | содержимое папки (`name`, `dir`, `size`); без `path` — папка ресурса |

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

Всё, что больше пары килобайт, пишите через `writeAsync`, чтобы рабочий поток не ждал диск.

### Папки, копии и переименования

| Вызов | Что возвращает |
|---|---|
| `node.fs.exists(path)` | `"file"`, `"dir"` или `nil` |
| `node.fs.stat(path)` | `{ dir, size, mtime }` или `nil, "not found"` |
| `node.fs.mkdir(path)` | создаёт папку вместе с недостающими родителями |
| `node.fs.copy(from, to)` | копирует файл, заменяя целевой |
| `node.fs.rename(from, to)` | переименовывает или перемещает, заменяя целевой |
| `node.fs.remove(path, recursive)` | удаляет файл или пустую папку; для непустой нужен `recursive = true` |

Они возвращают `true` либо `false` (или `nil`) и причину. `node.fs.join(...)`, `node.fs.dirname`,
`node.fs.basename` и `node.fs.extension` собирают пути и разбирают их на части.

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

### Надёжная запись

`node.fs.write` заменяет файл на месте, поэтому падение посреди записи оставит полфайла. Если файл
ни в коем случае не должен оказаться записанным наполовину, запишите временный файл и переименуйте
его поверх настоящего. Там, где система это позволяет, переименование атомарно:

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

### Слежение за файлом

`node.fs.watch(path, fn)` вызывает `fn(path, "changed")` или `fn(path, "removed")` примерно в
течение секунды после того, как файл изменился, появился или исчез. Это для файла с данными,
который владелец сервера правит на ходу. Вызов возвращает номер для `node.fs.unwatch(id)`; ресурс
может следить максимум за 64 файлами, а перезагрузка снимает все слежения.

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

Изменения в ваших собственных `server/` и `client/` сами не подхватываются: `reload <имя>` в
консоли подхватит `server/`, а для `client/` нужен перезапуск.

## node.json

Большая часть API кодирует сама: таблица, переданная в `player:send`, `node.bus.emit` или
`node.storage.set`, превращается в JSON без вашего участия. Для всего остального:

- `node.json.encode(value, { pretty = true })` и `node.json.decode(text)` (`nil`, если JSON
  испорчен);
- `node.json.diff(a, b)` и `node.json.patch(a, ops)` вычисляют и применяют изменения между двумя
  значениями — чтобы отправлять только то, что поменялось;
- `node.json.flatten(value)` и `node.json.unflatten(flat)` превращают вложенную таблицу в плоские
  ключи вида `"/a/b/1"` и обратно.

## Дальше

- [База данных](/ru/plugins/database/): PostgreSQL, MySQL и SQLite через модуль `db`.
- [HTTP](/ru/plugins/http/): разговор с сайтами и сервисами.
