---
title: Chat
description: Talking to players, chat commands with roles, refusing or rewriting what players say, watching the chat for logs and bridges, and the chat settings.
---

Chat is part of the server. Players can talk with no resource installed, and your resource can
speak, take commands, filter lines and watch the conversation with a few calls.

## Speaking

| Call | Who sees it |
|---|---|
| `node.chat.say(text, ...)` | everyone |
| `node.chat.tell(player, text, ...)` | one player (a `Player` or an id) |
| `player:tell(text, ...)` | that player |

All three take `string.format` arguments and show as a line from **System**. Control characters are
removed and the line is cut to `[Chat] MaxLength` (256 bytes by default). They work in any handler,
timer or coroutine, and the server's console shows them when chat logging is on.

<!-- doctest: server+client -->
```lua
node.on("playerJoined", function(player)
    player:tell("Welcome to the server, %s!", player.name)
    node.chat.say("%s joined. %d online.", player.name, node.players.count())
end)

-- expect-client: Alice chat:msg .*Welcome to the server, Alice!
-- expect-client: Alice chat:msg .*Alice joined\. 1 online\.
```

## Commands

A line that starts with `/` is a command. It's never shown to other players. `node.commands.add`
registers one:

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/dice 20"}]]} -->
```lua
node.commands.add("dice", function(player, args, raw)
    local sides = tonumber(args[1]) or 6
    if sides < 2 or sides > 1000 then
        player:tell("Usage: /dice [sides], 2 to 1000")
        return
    end
    node.chat.say("%s rolled %d (d%d)", player.name, math.random(sides), sides)
end)

-- expect-client: Alice chat:msg .*Alice rolled \d+ \(d20\)
```

The handler gets the player, the words after the command as an array, and the whole line as typed.
Command names are case-insensitive: `/Dice` and `/DICE` reach the same handler.

To limit a command to a role, pass `{ role = "admin" }`. Anyone else gets
`You are not allowed to use /<name>`. Roles come from your resources
([Players and vehicles → Roles](/plugins/players-and-vehicles/#roles)):

<!-- doctest: server+client {"players": ["Alice", "Bob"], "emit": [["chat:send", {"text": "/announce Restart in 5 minutes"}], ["chat:send", {"text": "/announce hi"}, "Bob"]]} -->
```lua
node.on("playerJoined", function(player)
    if player.name == "Alice" then player:setRole("admin") end
end)

node.commands.add("announce", function(player, args, raw)
    local text = raw:match("^/%S+%s+(.+)$")
    if not text then
        player:tell("Usage: /announce <text>")
        return
    end
    node.chat.say("[Announcement] %s", text)
end, { role = "admin" })

-- expect-client: Bob chat:msg .*\[Announcement\] Restart in 5 minutes
-- expect-client: Bob chat:msg .*You are not allowed to use /announce
```

A few things worth knowing:

- An unknown command gets no answer, unless a resource gives one. A server with no command handler
  at all tells the player `This server has no commands.`
- Two resources may register the same name. Both handlers run.
- `node.commands.remove(name)` unregisters one.
- Commands whose arguments shouldn't end up in the log (`/login <password>`) are hidden by
  `[Chat] LogHiddenCommands`, which already lists the usual ones.

## Refusing and rewriting

`chatMessageRequest(player, msg)` runs before a line is sent. `msg.text` is already cleaned and cut
to length; `msg.scope` is `"global"` or `"local"`. Your handler decides:

| Return | What happens |
|---|---|
| nothing (or `true`) | the line goes out as it is |
| `false, reason` | nobody gets the line; the sender is told the reason |
| a string | the line goes out with this text instead, marked as edited |
| `{ text = ..., scope = ... }` | changes the text, the scope, or both |

Handlers run in the order they subscribed, and each sees the text as the one before left it. The
first `false` ends it: later handlers don't see the line.

A reason that starts with `muted` or `filtered` (`"muted"`, `"muted: spamming"`,
`"filtered: links are not allowed"`) tells the player's game what kind of refusal it is, so it can
show a translated message; the part after the colon is shown as the detail. Any other reason is shown
as it is.

<!-- doctest: server+client {"players": ["Alice", "Bob"], "emit": [["chat:send", {"text": "free stuff at http://spam.example"}], ["chat:send", {"text": "darn it"}]]} -->
```lua
local muted = {} -- [accountId or name] = true

local function key(player) return player.accountId or player.name end

node.on("chatMessageRequest", function(player, msg)
    if muted[key(player)] then
        return false, "muted"
    end
    if msg.text:find("https?://") then
        return false, "filtered: links are not allowed here"
    end
    local clean, changed = msg.text:gsub("[Dd]arn", "****")
    if changed > 0 then return clean end
end)

node.commands.add("mute", function(player, args)
    local target = args[1] and node.players.find(args[1])
    if not target then return player:tell("Usage: /mute <name>") end
    muted[key(target)] = true
    player:tell("%s is muted", target.name)
end, { role = "admin" })

-- expect-client: Alice chat:msg .*links are not allowed here
-- expect-client: Bob chat:msg .*\*\*\*\* it
```

A rewritten line is cleaned and cut again, and reaches everyone with `edited = true`. A scope other
than `"global"` or `"local"` refuses the line instead of showing it to everyone. With no
`chatMessageRequest` handler at all, lines go out at once without waiting for the plugin thread.

## Watching the chat

`chatMessage(player, msg)` fires once the line's fate is decided, so it's the right place to log the
chat, count activity or bridge to Discord: unlike in `chatMessageRequest`, nothing can change the
outcome any more.

| Field | Meaning |
|---|---|
| `msg.text`, `msg.scope` | the final text and scope |
| `msg.sent` | `true` when the line went out |
| `msg.mid` | the line's number, when sent |
| `msg.code` | when not sent: `"muted"`, `"filtered"`, `"blocked"`, `"empty"` or `"invalid"` |
| `msg.reason` | what the refusing handler said |

<!-- doctest: server+client {"emit": [["chat:send", {"text": "hello there"}]]} -->
```lua
node.on("chatMessage", function(player, msg)
    if msg.sent then
        node.log("[%s] %s: %s", msg.scope, player.name, msg.text)
    else
        node.log("not sent (%s): %s", msg.code, msg.text)
    end
end)

-- expect: \[global\] Alice: hello there
```

Commands and lines refused before any resource saw them (the rate limit, a broken message) don't
fire `chatMessage`. A bridge to Discord is in [Recipes](/plugins/recipes/#post-chat-to-discord).

## Local chat

Players can send a line to `local` scope. It reaches the players in the sender's
[visibility group](/plugins/players-and-vehicles/#visibility-groups); when no resource uses groups,
that's everyone.

## Settings

The host sets these in `server.toml`; your resource can't change them, but should know they exist.

| Setting | Default | What it does |
|---|---|---|
| `[Chat] MaxLength` | `256` | The longest line, in bytes (16 to 2048). Longer lines are cut. |
| `[Chat] RatePerSec` | `2` | Lines (and commands) a player may send per second on average. Over that, the line isn't sent and the player is told so. |
| `[Chat] Burst` | `5` | Lines a player may send at once before the rate applies. |
| `[Chat] LogToConsole` | `true` | Shows the chat in the console and `logs/server.log`. |
| `[Chat] LogHiddenCommands` | a list | Commands logged as `/login ***`. |

## For resources written before chat moved into the server

The wire event `chat:send` still reaches resources that subscribe to it, for every line that passed
the rate limit, commands and refused lines included. Read it if you like, but don't relay the line
yourself any more: the server already did. To refuse lines, use `chatMessageRequest`; to send lines,
use `node.chat`.

## Next

- [Recipes](/plugins/recipes/): `/kick`, `/ban`, a Discord bridge and more, complete.
- [Events](/plugins/events/): everything else your resource can react to.
