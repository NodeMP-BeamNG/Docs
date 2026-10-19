---
title: HTTP-запросы
description: Колбэки и корутины, ошибки, вебхук Discord, сертификаты и почему запросы из плагина к локальным адресам закрыты.
---

`node.http` отправляет из плагина HTTP- и HTTPS-запросы. Запросы идут в фоновых потоках, а ответ возвращается на рабочий поток, так что медленный сервис не задерживает сервер.

| Вызов | Что делает |
|---|---|
| `node.http.get(url, headers, cb)` | GET. |
| `node.http.post(url, body, headers, cb)` | POST. Тело-таблица отправляется как JSON. |
| `node.http.request(method, url, opts, cb)` | Любой метод; `opts = { headers, body }`. |
| `node.http.put`, `patch`, `delete`, `head` | То же с фиксированным методом. |
| `node.http.fetch(url, opts)` | Внутри `node.async` ждёт и возвращает ответ. |

`headers` можно не указывать. Колбэк получает `(status, body, headers)`. Запрос длится не дольше примерно 15 секунд, а ответ может быть до 8 МБ. По редиректам сервер идёт сам, не больше пяти раз, но с `https` на `http` не переходит, пока сертификаты проверяются. Вызов возвращает `false`, если запрос не удалось поставить в очередь: тогда колбэк не вызовется.

## Ошибки

Если запрос сорвался ещё до ответа (нет соединения, плохой сертификат, тайм-аут), `status` равен `-1`, а `body` объясняет почему. Как это выглядит, показывает отклонённый запрос:

<!-- doctest: server -->
```lua
local function logAnswer(status, body)
    if status == -1 then
        node.log("failed: %s", body)
    else
        node.log("answer %d, %d bytes", status, #body)
    end
end

node.http.get("http://127.0.0.1:9/", logAnswer)

-- expect: failed: .*blocked
```

Запросы к машине самого сервера и в частные сети по умолчанию закрыты ([ниже](#локальные-и-частные-адреса)), поэтому этот запрос и не проходит.

## Ожидание в корутине

Внутри `node.async` функция `node.http.fetch` ждёт ответа и возвращает его, так что несколько запросов подряд читаются сверху вниз:

<!-- doctest: server -->
```lua
local function fetchStatus()
    local status = node.http.fetch("http://127.0.0.1:9/")
    node.log("status %d", status)
end

node.async(fetchStatus)

-- expect: status -1
```

Вторым аргументом `fetch` принимает `{ method = "POST", body = ..., headers = ... }`. Если запрос не удалось поставить в очередь, `status` равен `0`, а `body` — `request not queued`.

## Вебхук Discord

Этот плагин пишет в канал Discord, когда игрок заходит на сервер. Адрес вебхука секретный, поэтому он лежит в `[config]`, а не в коде:

<!-- doctest: skip needs a real Discord webhook address -->
```lua
local webhook = node.config.webhook

local function warnOnFailure(status, body)
    if status ~= 204 then
        node.log.warn("webhook answered %d: %s", status, body)
    end
end

local function announceJoin(player)
    local message = { content = player.name .. " joined the server" }
    node.http.post(webhook, message, warnOnFailure)
end

node.on("playerJoined", announceJoin)
```

## Сертификаты

Сертификаты HTTPS проверяются по доверенным корневым сертификатам системы и по `cacert.pem`, который идёт с сервером. Хост может указать свой набор в `[http] ca_file`. `[http] insecure` выключает проверку. Не включайте его: тогда любой, кто находится между сервером и сервисом, сможет читать и менять то, что вы отправляете.

## Локальные и частные адреса

Плагин не может обратиться к машине самого сервера, к локальной сети и другим частным адресам, пока хост не поставит `[http] allow_private_networks = true`. Так плагин не доберётся до служб, которые не должны быть открыты. Если рядом с игровым сервером работает, например, сервис статистики, хост может включить этот ключ, но тогда частные адреса откроются всем плагинам сервера.
