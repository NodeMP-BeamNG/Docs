---
title: HTTP
description: Как ресурсу обращаться к сайтам и сервисам — GET и POST, любой метод, JSON, ожидание в корутине, ошибки и повторы, секреты и что решает владелец сервера.
---

Ресурс может разговаривать с внешним миром по HTTP и HTTPS: отправить сообщение в вебхук Discord,
сохранить результаты гонки на вашем сайте, спросить у сервиса данные. Запросы выполняются в фоновом
потоке, а ваш обратный вызов срабатывает в рабочем потоке, когда ответ пришёл, — сервер сеть никогда
не ждёт.

## Запрос и ответ

<!-- doctest: server+client {"config": {"api": "http://127.0.0.1:9"}} -->
```lua
local API = node.config.api -- "https://stats.example.com", from resource.toml

node.on("playerJoined", function(player)
    if not player.accountId then return end
    node.http.get(API .. "/players/" .. player.accountId, nil, function(status, body, headers)
        if status ~= 200 then
            node.log.warn("no profile for %s (%d): %s", player.name, status, body)
            return
        end
        if not player:isConnected() then return end -- the answer can take seconds
        local profile = node.json.decode(body) or {}
        player:tell("Welcome back! Races won: %d", profile.wins or 0)
    end)
end)
```

`node.http.get(url, headers, cb)` запускает запрос и сразу возвращается. `cb(status, body, headers)`
выполняется позже:

- `status` — код ответа HTTP или `-1`, если ответа не было вовсе; тогда в `body` лежит текст ошибки
  ([ниже](#когда-запрос-не-удался)).
- `body` — ответ строкой. JSON раскодируйте через `node.json.decode`.
- `headers` — таблица с именами заголовков в нижнем регистре: `headers["content-type"]`, но никогда
  не `headers["Content-Type"]`.

Сам вызов возвращает `false`, только если запрос не удалось даже поставить в очередь (сервер
останавливается или фоновый пул занят); обратный вызов тогда не сработает.

## Отправить данные

`node.http.post(url, body, headers, cb)` отправляет тело. Таблицу он закодирует в JSON сам, а вот
`Content-Type` за вас не поставит: без него тело уходит как `application/octet-stream`, и
большинство API его отвергнет. Токены и прочие секреты держите в `[config]` ресурса, а не в коде:

<!-- doctest: server {"config": {"endpoint": "http://127.0.0.1:9/api/results", "token": "test"}} -->
```lua
local function saveResult(result)
    node.http.post(node.config.endpoint, result, {
        ["Content-Type"] = "application/json",
        ["Authorization"] = "Bearer " .. node.config.token,
    }, function(status, body)
        if status ~= 200 and status ~= 201 then
            node.log.warn("result not saved (%d): %s", status, body)
        end
    end)
end

node.bus.on("race:finished", function(source, data)
    saveResult(node.json.decode(data))
end)
```

```toml
# resources/results/resource.toml
[config]
endpoint = "https://league.example.com/api/results"
token = "…"
```

Готовый вебхук Discord — в [Рецептах](/ru/plugins/recipes/#чат-в-discord).

## Любой метод

`node.http.request(method, url, { headers = ..., body = ... }, cb)` отправляет тот метод, который
нужен сервису: `"PUT"`, `"PATCH"`, `"DELETE"`, `"HEAD"` или свой. `node.http.put`, `patch`, `delete`
и `head` — то же самое с уже подставленным методом:

<!-- doctest: skip a fragment: url, h and cb stand for your own values -->
```lua
node.http.request("PATCH", url, { headers = h, body = { banned = true } }, cb)
node.http.delete(url, nil, h, cb)  -- most services want no body on DELETE
node.http.head(url, nil, cb)       -- cb(status, "", headers): no body, ever
```

## Ждать в корутине

Внутри `node.async` вызов `node.http.fetch(url, opts)` дожидается ответа и возвращает
`status, body, headers`, так что несколько запросов подряд читаются сверху вниз. `opts` принимает
`method`, `headers` и `body`. Здесь он забирает сообщение дня и пробует снова, если сервис лежит:

<!-- doctest: server {"config": {"motd": "http://127.0.0.1:9/motd.json"}} -->
```lua
local function fetchJson(url)
    for attempt = 1, 3 do
        local status, body = node.http.fetch(url, { headers = { Accept = "application/json" } })
        if status == 200 then return node.json.decode(body) end
        if status > 0 and status < 500 then return nil, "HTTP " .. status end -- our mistake: don't retry
        node.sleep(attempt * 500) -- the service is down or unreachable: wait a little longer each time
    end
    return nil, "gave up after 3 attempts"
end

node.async(function()
    local motd, err = fetchJson(node.config.motd)
    if motd then
        node.chat.say(motd.text)
    else
        node.log.warn("no message of the day: %s", err)
    end
end)

-- expect: no message of the day: gave up after 3 attempts
```

`fetch` возвращает статус `0` и тело `"request not queued"`, если запрос не удалось поставить в
очередь. Вне `node.async` он падает, как и любой ждущий вызов
([Таймеры и корутины](/ru/plugins/concurrency/#ждать-не-блокируя-nodeasync)).

## Когда запрос не удался

Запрос, на который не пришёл ответ, вызывает обратный вызов со статусом `-1` и причиной в `body`:
сначала шаг, на котором всё сломалось, потом сообщение самой системы:

```
results · result not saved (-1): connect failed: Connection refused
```

Ещё встретятся: `resolve failed` (такого хоста нет), `TLS handshake failed` (в том числе когда
сертификат не прошёл проверку), тайм-аут, слишком большой или испорченный ответ.

Несколько ограничений постоянны: запрос сдаётся примерно через 15 секунд, проходит не больше пяти
перенаправлений, никогда не уходит с `https` на простой `http`, а ответ может весить не больше 8 МБ.
Сервер отправляет `User-Agent: Node-Server`, если вы не поставили свой.

## Что решает владелец сервера

Три настройки в `server.toml` владельца решают, что вашим запросам можно; ресурс их не меняет
([Настройка → Все настройки](/ru/hosting/configuration/#все-настройки)):

- **Сертификаты проверяются.** Каждый запрос по `https` сверяет сертификат сайта с центрами, которым
  доверяет машина, так что поддельный сайт не ответит вместо настоящего. `[Http] CaFile` указывает
  вместо них собственный набор владельца — для частного центра сертификации.
  `[Http] Insecure = true` отключает проверку; сервер предупреждает об этом при каждом запуске, и
  включать её не стоит.
- **Частные адреса закрыты.** По умолчанию ресурс не достучится до `127.0.0.1`, локальной сети или
  адреса метаданных облака — ни через имя хоста, ни через перенаправление. Такой запрос сразу
  возвращается с:

  ```
  refusing to connect to a non-public address (127.0.0.1 -> 127.0.0.1): loopback, link-local, private and IPv4-mapped ranges are blocked for resources; set [Http] AllowPrivateNetworks = true to allow it
  ```

  Если ваш ресурс ходит к сервису на той же машине или в соседнем контейнере, попросите владельца
  поставить `[Http] AllowPrivateNetworks = true`.

## Дальше

- [Рецепты](/ru/plugins/recipes/): вебхук Discord и другое, целиком.
- [База данных](/ru/plugins/database/): для данных, которые запрашивают, а не скачивают.
