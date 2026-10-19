---
title: The join queue
description: How a full server lets players with an account wait for a place, the limits of the queue, what the console shows and how plugins steer the queue.
---

When the server is full, a player with an account doesn't have to try again and again: the player waits in the server's queue, and the launcher gets everything ready meanwhile. The queue is on by default on every listed server. `[queue]` sets it up ([settings reference](/hosting/configuration/#queue)), and `enabled = false` turns it off.

## Who waits

- Only players with an account. A full server answers a guest in Test Drive with `Server full!`, and the one-time join ticket isn't spent.
- Only players whose launcher can wait. A launcher that can't gets `Server full!` too.
- Banned players are refused, not queued.
- A player who restores a broken session within `[network] disconnect_sec` skips the queue, and so does a player a plugin holds a place for (`playerConnectRequest` answers `true`): both are let in over `max_players`.

## How a waiting player gets in

While a player waits, the server checks their game files and sends the mod list, and the launcher downloads what is missing: `downloads_while_waiting` players at once, in queue order. The downloads of players joining a free place count too and go first, so the queue doesn't slow a join down. A waiting player can download only the files in the mod list, each once.

A free place goes to the first player in the queue whose mods are ready. The first in line keeps their place while downloading, but a ready player behind them gets in earlier. Then the game starts and the player joins like any other, with no second file check and no second download.

Once a player has a place, the queue no longer hurries them. The usual limits remain: a download that makes no progress for `[network] download_stall_sec` seconds is cut off.

A waiting launcher pings the server every 30 seconds, and a waiting connection that stays silent for 90 seconds loses its place. The server sends a place in the queue only when it changes, and no more often than once every 5 seconds.

## Limits

- At most `max_waiting` players wait in total (50). The next one is refused with `The server is full and so is its join queue`.
- At most `max_waiting_per_ip` players wait from one address (1). Addresses in `[network] connection_limit_exempt`, such as a local network, aren't limited. A second player from the same address is refused with `Someone from your address is already in this server's join queue`.
- One place per account. Joining from another launcher takes the place and keeps it, and the old connection is closed.
- Whoever leaves loses the place. If a player clicked **Cancel**, closed the launcher or was removed from the queue, the launcher fetches a new join ticket by itself at the next attempt, and the player goes to the end.
- No-shows. A player who got a place and left without reaching the world `max_no_shows` times (3) within `no_show_window_min` minutes (60) can't join this server's queue for `no_show_bar_min` minutes (30). The player is told until when. A kick, a ban or a server stop isn't a no-show, and joining while a place is free still works.

A waiting player costs the server about 135 KB of memory and no thread of their own: 50 waiting players take about 7 MB. A waiting player doesn't take one of the `max_connections` slots for incoming connections either.

## What the player sees

The launcher shows the place in the queue in its join line ([When the server is full](/players/join/#when-the-server-is-full)). The texts of the refusals and how the launcher shows them: [The server's refusals and kicks](/reference/error-codes/#the-servers-refusals-and-kicks).

## What the console shows

```text
20:41:07.112  Join   › Kayla waits in the join queue (3 of 7)
20:47:59.430  Join   › Kayla gets a place after 412 s in the join queue; 6 waiting
20:48:12.015  Leave  › Ivan left the join queue at 4 after 95 s (Connection closed by the client); 5 waiting
20:48:30.201  Kick   › 203.0.113.7 refused at the join queue: The server is full and so is its join queue
20:52:44.876  Leave  › Ivan (account 1042) left without entering the world after its turn in the join queue: 2 of 3 within 60 min
21:19:03.548  Join   › Kayla has been joining for 31 min, longer than joins here usually take (15 min); its game attached and is loading
```

The last line reports a slow join: one that takes four times as long as the median of the recent joins to this server, and at least 15 minutes. The server doesn't interrupt such a join, and plugins get the `playerJoinSlow` event.

## For plugins

Every function is described under [`node.queue`](/plugins/api/lua/#nodequeue--the-join-queue), and every event in the [event reference](/plugins/api/events/). A player in the queue has no player id yet, so the queue names the player by account id.

- `queueJoinRequest` asks whether a player may wait, and where. Return `false` and a reason to refuse, or a position to put the player there.
- `queueAdmitRequest` asks who gets a free place. The candidates are the ready players. Return an account id to choose, or `false` to leave the place free for now.
- `queueAdmitted`, `queueLeft` and `queueNoShow` say what became of a waiting player, and `playerJoinSlow` reports a slow join.

League members wait at the front:

<!-- doctest: skip needs a full server with players waiting in its queue -->
```lua
local members = { [1042] = true, [2077] = true }

local function put_members_first(request)
    if members[request.accountId] then return { position = 1 } end
end

node.on("queueJoinRequest", put_members_first)
```

During a race there are no new players, and the waiting ones read the note under their place:

<!-- doctest: skip needs a full server with players waiting in its queue -->
```lua
node.queue.pause("The race ends at 21:30, places open after it")
-- ...
node.queue.resume()
```

`node.queue.list()` returns the waiting players in order, `move` and `first` change a place, `remove` removes a player with a reason, `admit` lets a player in over `max_players` as soon as their mods are ready, and `limits` and `setLimits` read and change the `[queue]` numbers until the server restarts.

<!-- doctest: skip needs a full server with players waiting in its queue -->
```lua
for _, waiter in ipairs(node.queue.list()) do
    node.log(string.format("%d. %s%s", waiter.position, waiter.name, waiter.ready and " (ready)" or ""))
end
node.queue.setLimits({ maxWaiting = 20 })
```
