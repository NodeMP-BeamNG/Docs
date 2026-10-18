---
title: The join queue
description: How a full server lets signed-in players wait for a place, what they see, the limits that keep the queue fair, and how plugins steer it.
---

When the server is full, a signed-in player doesn't have to try again and again: he waits in the
server's queue, and the launcher gets everything ready while he waits. The queue is on by default
on every listed server. `[queue]` in [the settings](/hosting/configuration/#queue) tunes it, and
`enabled = false` turns it off.

## Who waits

- **Only players with an account.** Without one, with Test Drive, a full server says
  *Server full!*, and the one-time join ticket is not spent.
- **Only with a launcher that can wait.** An older launcher hears *Server full!*, as before.
- **Not the banned.** Bans are checked first; a banned player is refused, not queued.
- **Not those coming back.** A player whose connection broke takes his session back within
  `[network] disconnect_sec` without queuing, and a plugin that keeps a place for someone
  (`playerConnectRequest` answering `true`) still lets him in over `max_players`.

## How a waiting player gets in

While he waits, the server checks his game files and sends its mod list, and the launcher downloads
what is missing: `downloads_while_waiting` players at once, in queue order. Players joining a free
place count against that number and go first, so a queue never slows down a join. A waiting player
may fetch only the files of the mod list, each once.

A free place goes to the first player in the queue whose mods are ready. The first in line keeps
his place while he downloads, but a ready player behind him gets in before him: the first stays
first and waits longer. The game then starts and the player joins like anyone else, without a
second file check or a second download.

Once a player has a place, nothing in the queue times him out. The usual guards still apply: a
download that makes no progress for `[network] download_stall_sec` ends, a joining connection that
stays silent for minutes is dropped, and the launcher gives up when the game doesn't start within
ten minutes.

The waiting launcher pings every 30 seconds; a waiting connection silent for 90 seconds loses its
place. Positions are sent only when they change, at most every 5 seconds.

## Limits

- **In total**, `max_waiting` players (50). The next one hears
  *The server is full and so is its join queue*.
- **Per address**, `max_waiting_per_ip` (1). Addresses in `[network] connection_limit_exempt`, such as
  a LAN, are not limited. A second player from the same address hears
  *Someone from your address is already in this server's join queue*.
- **One place per account.** Joining again from another launcher takes over the place and keeps it;
  the old connection is closed.
- **Leaving costs the place.** After **Cancel**, a closed launcher or a removal, joining again needs a
  new ticket, which the launcher fetches, and starts at the end.
- **No-shows.** A player who got a place and left before reaching the world `max_no_shows` times (3)
  within `no_show_window_min` minutes (60) may not queue here for `no_show_bar_min` minutes (30). He
  is told until when. A kick, a ban or a server stop is not a no-show, and joining while a place is
  free still works.

A waiting player costs the server about 135 KB of memory and no thread of its own: 50 waiting
players take about 7 MB. He doesn't hold one of the `max_connections` joining slots either; those
are only for the handshake.

## What the player sees

The button in the launcher reads **In queue: 3 of 7**, next to the progress of the mod downloads.
**Cancel** leaves the queue. When the place comes, the launcher goes on to start the game, as for
any join. A refusal is a short notice: the queue is full, someone from his address already waits,
or the no-show bar with the time it ends, in his own time.

## What the console shows

```text
20:41:07.112  Join   › Kayla waits in the join queue (3 of 7)
20:47:59.430  Join   › Kayla gets a place after 412 s in the join queue; 6 waiting
20:48:12.015  Leave  › Ivan left the join queue at 4 after 95 s (Connection closed by the client); 5 waiting
20:48:30.201  Kick   › 203.0.113.7 refused at the join queue: The server is full and so is its join queue
20:52:44.876  Leave  › Ivan (account 1042) left without entering the world after its turn in the join queue: 2 of 3 within 60 min
21:19:03.548  Join   › Kayla has been joining for 31 min, longer than joins here usually take (15 min); its game attached and is loading
```

The last line is a slow join: one that takes four times as long as the recent joins on this server,
and at least 15 minutes. The server does nothing about it; a weak computer loading a heavy map for
the first time is slow, not wrong. Plugins hear it as `playerJoinSlow`.

## For plugins

Every function is under [`node.queue`](/plugins/api/lua/#nodequeue--the-join-queue), and every event is in
[the event reference](/plugins/api/events/). A player in the queue has no player id yet, so the
queue names him by his account id.

- `queueJoinRequest` asks whether a player may wait, and where. Return `false` and a reason to
  refuse him, or a position to put him there.
- `queueAdmitRequest` asks who gets a free place, with the ready players as candidates.
  Return an account id to choose, or `false` to keep the place free for now.
- `queueAdmitted`, `queueLeft` and `queueNoShow` say what became of a waiting player, and
  `playerJoinSlow` reports a slow join.

League members wait at the front:

<!-- doctest: skip needs a full server with players waiting in its queue -->
```lua
local members = { [1042] = true, [2077] = true }

node.on("queueJoinRequest", function(d)
    if members[d.accountId] then return { position = 1 } end
end)
```

No new player during a race, with a note the waiting players read under their place:

<!-- doctest: skip needs a full server with players waiting in its queue -->
```lua
node.queue.pause("The race ends at 21:30, places open after it")
-- ...
node.queue.resume()
```

The rest, briefly: `node.queue.list()` returns the waiting players in order, `move` and `first`
change a place, `remove` sends a player away with a reason, `admit` lets one in over `max_players`
as soon as his mods are ready, and `limits` and `setLimits` read and change the `[queue]` numbers
until the server restarts.

<!-- doctest: skip needs a full server with players waiting in its queue -->
```lua
for _, w in ipairs(node.queue.list()) do
    node.log(string.format("%d. %s%s", w.position, w.name, w.ready and " (ready)" or ""))
end
node.queue.setLimits({ maxWaiting = 20 })
```
