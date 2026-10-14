---
title: HTTP
description: Calling websites and services from a resource - GET and POST, any method, JSON, waiting in a coroutine, errors and retries, secrets, and what the host controls.
---

A resource can talk to the outside world over HTTP and HTTPS: post to a Discord webhook, save race
results on your website, ask a service for data. Requests run on a background thread, and your
callback runs on the worker when the answer is in, so the server never waits for the network.

## A request and its answer

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

`node.http.get(url, headers, cb)` starts the request and returns at once. `cb(status, body, headers)`
runs later:

- `status` is the HTTP status code, or `-1` when no answer came at all; then `body` holds the error
  text ([below](#when-a-request-fails)).
- `body` is the response as a string. Decode JSON with `node.json.decode`.
- `headers` is a table keyed by the lowercased header name: `headers["content-type"]`, never
  `headers["Content-Type"]`.

The call itself returns `false` only when the request couldn't even be queued (the server is
stopping or the background pool is full); the callback then never runs.

## Sending data

`node.http.post(url, body, headers, cb)` sends a body. A table is encoded as JSON for you, but the
`Content-Type` isn't set for you: without it the body goes out as `application/octet-stream`, and
most APIs will refuse it. Put tokens and other secrets in the resource's `[config]`, not in the code:

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

A complete Discord webhook is in [Recipes](/plugins/recipes/#post-chat-to-discord).

## Any method

`node.http.request(method, url, { headers = ..., body = ... }, cb)` sends whatever method the
service wants: `"PUT"`, `"PATCH"`, `"DELETE"`, `"HEAD"` or its own. `node.http.put`, `patch`,
`delete` and `head` are the same with the method filled in:

<!-- doctest: skip a fragment: url, h and cb stand for your own values -->
```lua
node.http.request("PATCH", url, { headers = h, body = { banned = true } }, cb)
node.http.delete(url, nil, h, cb)  -- most services want no body on DELETE
node.http.head(url, nil, cb)       -- cb(status, "", headers): no body, ever
```

## Waiting in a coroutine

Inside `node.async`, `node.http.fetch(url, opts)` waits for the answer and returns
`status, body, headers`, so several requests in a row read top to bottom.
`opts` takes `method`, `headers` and `body`. Here it fetches a message of the day and tries again
when the service is down:

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

`fetch` returns status `0` with the body `"request not queued"` when the request couldn't be
queued. Called outside `node.async`, it fails like every waiting call
([Timers and coroutines](/plugins/concurrency/#waiting-without-blocking-nodeasync)).

## When a request fails

A request that got no answer calls back with status `-1` and the reason in `body`, starting with the
step that failed and followed by the system's own message:

```
results · result not saved (-1): connect failed: Connection refused
```

Other reasons you'll meet: `resolve failed` (no such host), `TLS handshake failed` (including a
certificate that didn't check out), a timeout, or a response that was too big or broken.

A few limits are fixed: a request gives up after about 15 seconds, follows at most five redirects,
never follows an `https` address to plain `http`, and the answer may be at most 8 MB. The server sends
`User-Agent: Node-Server` unless you set your own.

## What the host controls

Three settings in the host's `server.toml` decide what your requests may do; a resource can't change
them ([Configuration → Every setting](/hosting/configuration/#every-setting)):

- **Certificates are checked.** Every `https` request verifies the site's certificate against the
  authorities the machine trusts, so a fake site can't answer in its place. `[Http] CaFile` points at
  the host's own bundle instead, for a private authority. `[Http] Insecure = true` turns the check
  off; the server warns about it on every start, and it should stay off.
- **Private addresses are refused.** By default a resource can't reach `127.0.0.1`, the local
  network or the cloud's metadata address, even through a host name or a redirect. Such a request
  calls back at once with:

  ```
  refusing to connect to a non-public address (127.0.0.1 -> 127.0.0.1): loopback, link-local, private and IPv4-mapped ranges are blocked for resources; set [Http] AllowPrivateNetworks = true to allow it
  ```

  When your resource talks to a service on the same machine or in the next container, tell the host
  to set `[Http] AllowPrivateNetworks = true`.

## Next

- [Recipes](/plugins/recipes/): a Discord webhook and more, complete.
- [Database](/plugins/database/): for data you query rather than fetch.
