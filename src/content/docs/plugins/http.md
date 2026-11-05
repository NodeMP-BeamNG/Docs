---
title: HTTP requests
description: Callbacks and coroutines, errors, a Discord webhook, certificates and why requests to local addresses are refused.
---

`node.http` sends HTTP and HTTPS requests from a plugin. They run on background threads and answer on the worker thread, so a slow service doesn't hold up the server.

| Call | What it does |
|---|---|
| `node.http.get(url, headers, cb)` | GET. |
| `node.http.post(url, body, headers, cb)` | POST. A table body is sent as JSON. |
| `node.http.request(method, url, opts, cb)` | Any method; `opts = { headers, body }`. |
| `node.http.put`, `patch`, `delete`, `head` | The same with a fixed method. |
| `node.http.fetch(url, opts)` | Inside `node.async`, waits for the answer and returns it. |

`headers` is optional. The callback gets `(status, body, headers)`. A request takes at most about 15 seconds, and an answer can be up to 8 MB. The server follows up to five redirects, but not from `https` to `http` while certificates are checked. The call returns `false` if the request couldn't be queued, and the callback is then never called.

## Errors

If a request fails before an answer (no connection, a bad certificate, a timeout), `status` is `-1` and `body` says why, as a refused request shows:

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

Requests to the server's own machine and private networks are refused by default ([below](#local-and-private-addresses)), which is why this one fails.

## Waiting in a coroutine

Inside `node.async`, `node.http.fetch` waits for the answer and returns it, so several requests in a row read top to bottom:

<!-- doctest: server -->
```lua
local function fetchStatus()
    local status = node.http.fetch("http://127.0.0.1:9/")
    node.log("status %d", status)
end

node.async(fetchStatus)

-- expect: status -1
```

`fetch` takes `{ method = "POST", body = ..., headers = ... }` as its second argument. If the request couldn't be queued, `status` is `0` and `body` is `request not queued`.

## A Discord webhook

This plugin posts to a Discord channel when a player joins. The webhook address is a secret, so it goes in `[config]`, not in the code:

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

## Certificates

The server checks HTTPS certificates against the system's trusted roots and the `cacert.pem` shipped with the server; a host can point `[http] ca_file` at their own bundle. `[http] insecure` turns the check off. Don't turn it on: anyone between the server and the service could then read and change what you send.

## Local and private addresses

A plugin can't reach the server's own machine, the local network or other private addresses unless the host sets `[http] allow_private_networks = true`. That keeps plugins away from services that must not be exposed. If, say, a statistics service runs next to the game server, the host can turn the key on, but private addresses then open to every plugin on the server.
