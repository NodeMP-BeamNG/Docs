---
title: HTTP-запросы
description: Обращение к веб-сервисам из ресурса — колбэки и корутины, ошибки, вебхук Discord, сертификаты и почему локальные адреса закрыты.
---

`node.http` отправляет из ресурса HTTP- и HTTPS-запросы. Запросы идут в фоновых потоках, а ответ
возвращается на рабочий поток, так что медленный сервис никогда не задерживает сервер.

| Вызов | Что делает |
|---|---|
| `node.http.get(url, headers, cb)` | GET. |
| `node.http.post(url, body, headers, cb)` | POST. Тело-таблица отправляется как JSON. |
| `node.http.request(method, url, opts, cb)` | Любой метод; `opts = { headers, body }`. |
| `node.http.put`, `patch`, `delete`, `head` | То же с фиксированным методом. |
| `node.http.fetch(url, opts)` | Внутри `node.async`: ждёт и возвращает ответ. |

`headers` можно не указывать. Колбэк получает `cb(status, body, headers)`. Запрос длится не дольше
примерно 15 секунд, а ответ может весить до 8 МБ.

## Ошибки

Если запрос сорвался ещё до ответа (нет соединения, плохой сертификат, тайм-аут), `status` равен
`-1`, а `body` объясняет почему. Как это выглядит, показывает отклонённый запрос:

<!-- doctest: server -->
```lua
node.http.get("http://127.0.0.1:9/", function(status, body)
    if status == -1 then
        node.log("failed: %s", body)
    else
        node.log("answer %d, %d bytes", status, #body)
    end
end)

-- expect: failed: .*blocked
```

Запросы к машине самого сервера и в частные сети по умолчанию закрыты
([ниже](#локальные-и-частные-адреса)), поэтому этот и не проходит.

## Ожидание в корутине

Внутри `node.async` функция `node.http.fetch` ждёт ответа и возвращает его, так что несколько запросов
подряд читаются сверху вниз:

<!-- doctest: server -->
```lua
node.async(function()
    local status, body = node.http.fetch("http://127.0.0.1:9/")
    node.log("status %d", status)
end)

-- expect: status -1
```

Вторым аргументом `fetch` принимает `{ method = "POST", body = ..., headers = ... }`.

## Вебхук Discord

Сообщение в канал Discord, когда игрок заходит на сервер. Адрес вебхука — секрет, поэтому он лежит в
`[config]`, а не в коде:

<!-- doctest: skip needs a real Discord webhook address -->
```lua
local webhook = node.config.webhook

node.on("playerJoined", function(player)
    local message = { content = player.name .. " joined the server" }
    node.http.post(webhook, message, function(status, body)
        if status ~= 204 then
            node.log.warn("webhook answered %d: %s", status, body)
        end
    end)
end)
```

## Сертификаты

Сертификаты HTTPS проверяются по доверенным корневым сертификатам системы и по `cacert.pem`, который
идёт с сервером. Хост может указать свой набор в `[Http] CaFile`. `[Http] Insecure` выключает проверку
совсем; не включайте его — тогда любой, кто стоит между сервером и сервисом, сможет читать и менять
то, что вы отправляете.

## Локальные и частные адреса

Ресурс не может обратиться к машине самого сервера, к локальной сети и другим частным адресам, пока
хост не поставит `[Http] AllowPrivateNetworks = true`. Так ресурс не доберётся до сервисов, которые
никогда не должны были быть открыты. Хост, у которого рядом с игровым сервером работает, например,
сервис статистики, включает это сознательно.
