---
title: Устройство плагина
description: Файлы плагина, все ключи resource.toml, окружение Lua, код в нескольких файлах, перезагрузка, ошибки при загрузке и лог.
---

Плагин лежит в папке внутри `resources/`. Сервер загружает все такие папки при запуске.

## Файлы

| Путь | Что это |
|---|---|
| `resource.toml` | Описание плагина. Файл необязательный: без него имя берётся из папки, а остальное по умолчанию, как в таблице ниже. |
| `server/main.lua` | Точка входа серверной части. |
| `server/*.lua` | Остальной серверный код, подключается через `require` ([ниже](#несколько-файлов)). |
| `client/**/*.lua` | Клиентская часть ([Клиентские скрипты](/ru/plugins/client-scripting/)). |
| `client/lua/vehicle/*.lua` | Клиентские файлы, которые выполняются внутри машин игрока ([Клиентские скрипты](/ru/plugins/client-scripting/#файлы-которые-выполняются-в-машине)). |
| всё остальное | Ваши данные: читайте и пишите их через `node.fs`. |

Папку, в которой нет ни серверной точки входа, ни клиентских файлов, сервер пропускает.

## resource.toml

```toml
name = "race"
version = "1.2"

[server]
main = "server/main.lua"

[client]
files = ["main.lua", "ui.lua"]
obfuscation = "medium"

[config]
laps = 3
```

| Ключ | По умолчанию | Что делает |
|---|---|---|
| `name` | имя папки | Имя плагина в логе, в команде `reload` и в сообщениях шины. |
| `version` | нет | Показывается в логе рядом с именем. |
| `type` | `"lua"` | Чем выполнять серверную часть. Для `"js"` нужен модуль `js-host` ([Плагины на JavaScript](/ru/plugins/js-host/)). |
| `[server] main` | `"server/main.lua"` | Точка входа, путь от папки плагина. |
| `[client] files` | все `.lua` в `client/` | Какие клиентские файлы отправлять, путь от `client/`. |
| `[client] obfuscation` | `"light"` | Насколько запутывать клиентские файлы: `"none"`, `"light"`, `"medium"` или `"strong"` ([Плагины на сервере](/ru/hosting/resources/#обфускация-клиентских-скриптов)). |
| `[config]` | пусто | Собственные настройки плагина. Доступны как `node.config`; `node.resources.manifest().config` читает файл заново. |

Путь в `[server] main` или `[client] files`, который ведёт за пределы папки плагина, сервер отклоняет. Если `resource.toml` не читается, сервер пишет об этом в лог и загружает плагин со значениями по умолчанию.

## Окружение Lua

Серверная часть работает на Lua 5.4 со стандартными библиотеками. Поверх них доступна глобальная переменная `node` со всем API ([справочник](/ru/plugins/api/lua/)). У каждого плагина своё состояние Lua, и глобальных переменных другого плагина он не видит.

На диске плагину доступна только его собственная папка. Так скачанный у кого-то плагин не прочитает `server.toml`, не удалит файлы и не запустит программы на машине хоста:

| Что | В плагине |
|---|---|
| `io.open`, `io.lines`, `os.remove`, `os.rename`, `dofile`, `loadfile`, `require`, `package.searchpath` | Файлы внутри папки плагина. Путь считается от этой папки; путь от папки сервера (`resources/race/data.json`) или абсолютный тоже подходит, если ведёт внутрь. За пределами папки `io.open`, `os.remove`, `os.rename` и `loadfile` возвращают `nil, "…: outside the resource folder"`, а `io.lines` и `dofile` бросают ошибку с тем же текстом. |
| `os.time`, `os.clock`, `os.date`, `os.difftime`, `io.write` | Как обычно. |
| `os.getenv` | `nil` для любой переменной: в окружении лежат секреты сервера. |
| `os.execute`, `io.popen`, `os.exit`, `os.setlocale`, `os.tmpname`, `io.tmpfile`, `io.read`, `io.input`, `io.output` | Вызывают ошибку с подсказкой про `[resources] trusted`. |
| `load` | Только текст, скомпилированные куски не загружаются. |
| `debug` | Только `traceback` и `getinfo`. |

<!-- doctest: server -->
```lua
local _, err = pcall(os.execute, "echo hi")
node.log("%s", err)

-- expect: os\.execute is not available to resources
```

То же действует внутри `node.job` и `node.await`. Если плагину нужно больше, хост вписывает его в `server.toml`. Тогда плагин получает всю стандартную библиотеку, а пути считаются от папки сервера:

```toml
[resources]
trusted = ["backup"]
```

Подключить Lua-модуль на C не может ни один плагин, даже доверенный. Для того, что не под силу Lua, есть [нативные модули](/ru/plugins/native-modules/).

## Несколько файлов

Относительные пути в `package.path` отсчитываются от папки плагина (у доверенного плагина от папки сервера), а папки `server/` в нём нет. Поэтому `require("util")` найдёт `util.lua` в корне плагина, но не `server/util.lua`. Добавьте папку `server/` в начало `package.path` один раз, в начале `main.lua`:

<!-- doctest: server {"files": {"server/util.lua": "local M = {}\nfunction M.add(a, b)\n    return a + b\nend\nreturn M\n"}} -->
```lua
local here = debug.getinfo(1, "S").source:sub(2):match("^(.*)[/\\]")
package.path = here .. "/?.lua;" .. package.path

local util = require("util")
node.log("2 + 3 = %d", util.add(2, 3))

-- expect: 2 \+ 3 = 5
```

Модуль `server/util.lua` обычный: он возвращает таблицу.

<!-- doctest: server -->
```lua
local M = {}

function M.add(a, b)
    return a + b
end

return M
```

## Перезагрузка

Команда `reload <имя>` в консоли сервера или `node.resources.reload(name)` из кода заменяет работающий плагин без перезапуска сервера:

1. Срабатывают обработчики `resourceUnload` плагина с причиной `"reload"`.
2. Его обработчики, таймеры и корутины снимаются, а вместе с ними и состояние Lua.
3. Папка загружается заново, и `main.lua` выполняется сначала.

`node.resources.reload` ставит перезагрузку в очередь и возвращает `true`, если её приняли. Плагин может перезагрузить сам себя.

Остаются `node.storage`, файлы в папке и все остальные плагины. Всё, что лежало в переменных Lua, пропадает, поэтому важное держите в хранилище. Успеть записать данные можно в обработчике `resourceUnload`:

<!-- doctest: server+client -->
```lua
local joins = node.storage.get("joins", 0)

local function countJoin()
    joins = joins + 1
end

node.on("playerJoined", countJoin)

local function saveJoins(reason)
    node.storage.set("joins", joins)
    node.log("joins so far: %d (%s)", joins, reason)
end

node.on("resourceUnload", saveJoins)

-- expect: joins so far: 1 \(shutdown\)
```

Когда сервер останавливается, тот же обработчик срабатывает с причиной `"shutdown"`. Таймеры и корутины, запущенные в нём, уже не выполнятся, поэтому сохраняйте данные сразу.

Перезагрузка не отправляет игрокам новые файлы из `client/`: их сервер упаковывает один раз, при запуске ([Клиентские скрипты](/ru/plugins/client-scripting/#как-файлы-попадают-в-игру)).

## Ошибки и лог

Ошибка на верхнем уровне `main.lua` прерывает остаток этого файла, а плагин остаётся загруженным с тем, на что успел подписаться до ошибки. Как такие ошибки и ошибки в обработчиках выглядят в логе, описано на странице [Общие правила API](/ru/plugins/conventions/#ошибки-в-обработчиках).

В лог пишите через `node.log`, а проблемы отмечайте `node.log.warn` и `node.log.error`. Все три принимают аргументы как `string.format`.
