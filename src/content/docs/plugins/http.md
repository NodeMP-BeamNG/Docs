---
title: HTTP requests
description: Calling web services from a resource - callbacks and coroutines, errors, a Discord webhook, certificates and why local addresses are refused.
---

`node.http` sends HTTP and HTTPS requests from a resource. Requests run on background threads; the
answer comes back on the worker, so a slow service never holds the server up.

| Call | What it does |
|---|---|
| `node.http.get(url, headers, cb)` | GET. |
| `node.http.post(url, body, headers, cb)` | POST. A table body is sent as JSON. |
| `node.http.request(method, url, opts, cb)` | Any method; `opts = { headers, body }`. |
| `node.http.put`, `patch`, `delete`, `head` | The same with the method fixed. |
| `node.http.fetch(url, opts)` | Inside `node.async`: waits and returns the answer. |

`headers` can be left out. The callback gets `cb(status, body, headers)`. A request takes at most
about 15 seconds, and an answer may be up to 8 MB.

## Errors

When a request fails before any answer (no connection, a bad certificate, a timeout), `status` is
`-1` and `body` says why. A refused request shows what that looks like:

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

Requests to the server's own machine and to private networks are refused by default (see
[below](#local-and-private-addresses)), which is why this one fails.

## Waiting in a coroutine

Inside `node.async`, `node.http.fetch` waits for the answer and returns it, so several requests in a
row read top to bottom:

<!-- doctest: server -->
```lua
node.async(function()
    local status, body = node.http.fetch("http://127.0.0.1:9/")
    node.log("status %d", status)
end)

-- expect: status -1
```

`fetch` takes `{ method = "POST", body = ..., headers = ... }` as its second argument.

## A Discord webhook

Posting a line to a Discord channel when a player joins. The webhook address is a secret, so it goes
into `[config]`, not into the code:

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

## Certificates

HTTPS certificates are checked against the system's trusted roots and the `cacert.pem` that comes
with the server. A host can point `[http] ca_file` at a bundle of their own. `[http] insecure` turns
the check off entirely; leave it off, since then anyone between the server and the service can read
and change what you send.

## Local and private addresses

A resource can't reach the server's own machine, the local network or other private addresses
unless the host sets `[http] allow_private_networks = true`. That keeps a resource from poking at
services that were never meant to be public. A host who runs, say, a stats service next to the game
server turns it on knowingly.
