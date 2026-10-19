---
title: HTTP requests
description: Callbacks and coroutines, errors, a Discord webhook, certificates and why requests to local addresses are refused.
---

`node.http` sends HTTP and HTTPS requests from a plugin. Requests run on background threads and the answer comes back on the worker thread, so a slow service doesn't hold the server up.

| Call | What it does |
|---|---|
| `node.http.get(url, headers, cb)` | GET. |
| `node.http.post(url, body, headers, cb)` | POST. A table body is sent as JSON. |
| `node.http.request(method, url, opts, cb)` | Any method; `opts = { headers, body }`. |
| `node.http.put`, `patch`, `delete`, `head` | The same with a fixed method. |
| `node.http.fetch(url, opts)` | Inside `node.async`, waits for the answer and returns it. |

You can leave out `headers`. The callback gets `(status, body, headers)`. A request lasts at most about 15 seconds, and the answer can be up to 8 MB. The server follows redirects itself, at most five, but doesn't follow a redirect from `https` to `http` while certificate checking is on. The call returns `false` if the request couldn't be queued, and then the callback is not called.

## Errors

If a request fails before any answer arrives (no connection, a bad certificate, a timeout), `status` is `-1` and `body` says why. A refused request shows what that looks like:

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

Requests to the server's own machine and to private networks are refused by default ([below](#local-and-private-addresses)), which is why this request fails.

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

This plugin writes to a Discord channel when a player joins the server. The webhook address is a secret, so it lives in `[config]`, not in the code:

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

The server checks HTTPS certificates against the system's trusted root certificates and the `cacert.pem` that ships with the server. A host can point `[http] ca_file` at a bundle of their own. `[http] insecure` turns the check off. Leave it off: otherwise anyone between the server and the service can read and change what you send.

## Local and private addresses

A plugin can't reach the server's own machine, the local network or other private addresses unless the host sets `[http] allow_private_networks = true`. That keeps a plugin from reaching services that must not be exposed. If a service such as statistics runs next to the game server, the host can turn the key on, but then the private addresses are open to every plugin on the server.
