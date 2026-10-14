---
title: Chat
description: Talking to players, making chat commands, refusing or rewriting what players say, answering in their language, and watching the chat.
---

Chat is part of the server. Players can talk with no resource installed, and your resource can
speak, add commands, filter lines and watch the conversation with a few calls.

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

The server itself knows no chat commands: a line that starts with `/` is a chat line like any
other. A command is a line your resource takes for itself. Catch it in `chatMessageRequest`, do the
work, and return `{ handled = true }`:

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/dice 20"}]]} -->
```lua
node.on("chatMessageRequest", function(player, msg)
    local sides = msg.text:match("^/dice%s*(%d*)$")
    if not sides then return end -- not our command: let the line through

    sides = tonumber(sides) or 6
    if sides < 2 or sides > 1000 then
        player:tell("Usage: /dice [sides], 2 to 1000")
    else
        node.chat.say("%s rolled %d (d%d)", player.name, math.random(sides), sides)
    end
    return { handled = true }
end)

-- expect-client: Alice chat:msg .*Alice rolled \d+ \(d20\)
-- expect-log: /dice 20\s+\[handled by a resource\]
```

When a handler answers `{ handled = true }`:

- nobody receives the line, and the sender's chat drops it quietly, so the player sees only your
  answer;
- handlers subscribed after yours don't see the line;
- the server's console logs it with `[handled by a resource]` at the end.

A line no resource takes goes to the chat as usual, `/` or not. So if a player mistypes `/dcie`,
everyone reads `/dcie`.

### Many commands, some for admins

With more than one or two commands, keep them in a table and let one handler pick. Here each
command can name the role it needs. Roles come from your resources
([Players and vehicles → Roles](/plugins/players-and-vehicles/#roles)):

<!-- doctest: server+client {"players": ["Alice", "Bob"], "emit": [["chat:send", {"text": "/announce Restart in 5 minutes"}], ["chat:send", {"text": "/announce hi"}, "Bob"], ["chat:send", {"text": "/online"}, "Bob"]]} -->
```lua
local commands = {}

commands.online = {
    run = function(player, rest)
        player:tell("%d player(s) online", node.players.count())
    end,
}

commands.announce = {
    role = "admin",
    run = function(player, rest)
        if rest == "" then return player:tell("Usage: /announce <text>") end
        node.chat.say("[Announcement] %s", rest)
    end,
}

node.on("chatMessageRequest", function(player, msg)
    local name, rest = msg.text:match("^/(%S+)%s*(.-)%s*$")
    local command = name and commands[name:lower()]
    if not command then return end

    if command.role and player.role ~= command.role then
        player:tell("You are not allowed to use /%s", name)
    else
        command.run(player, rest)
    end
    return { handled = true }
end)

node.on("playerJoined", function(player)
    if player.name == "Alice" then player:setRole("admin") end
end)

-- expect-client: Bob chat:msg .*\[Announcement\] Restart in 5 minutes
-- expect-client: Bob chat:msg .*You are not allowed to use /announce
-- expect-client: Bob chat:msg .*2 player\(s\) online
```

`name:lower()` makes `/Online` and `/ONLINE` work too. The server comes with a complete example of
this pattern, `examples/chat-commands`, with `/help`, `/me` and `/pm`; copy the folder into
`resources/` and add your own commands to its table.

A few things worth knowing:

- **Don't refuse `/` lines you don't know.** Another resource may know them, and a `false` from
  your handler ends the line before that resource sees it. Return nothing and let it pass.
- **Two resources with the same command:** the first handler that answers `{ handled = true }`
  wins; the other never sees the line. Resources subscribe in the order they load.
- **Secrets in commands.** `[Chat] LogHiddenCommands` lists commands whose arguments the log hides
  (`/login hunter2` is written as `/login ***`). The host sets it; tell them if your resource has
  such a command.
- **Testing a command without the game** is on
  [Your first resource → Testing without the game](/plugins/getting-started/#testing-without-the-game).

## Refusing and rewriting

`chatMessageRequest(player, msg)` runs before a line is sent. `msg.text` is already cleaned and cut
to length; `msg.scope` is `"global"` or `"local"`. Your handler decides:

| Return | What happens |
|---|---|
| nothing (or `true`) | the line goes out as it is |
| `false, reason` | nobody gets the line; the sender is told the reason |
| a string | the line goes out with this text instead, marked as edited |
| `{ text = ..., scope = ... }` | changes the text, the scope, or both |
| `{ handled = true }` | your resource took the line as a command: nobody gets it, the sender isn't told anything |

Handlers run in the order they subscribed, and each sees the text as the one before left it. The
first `false` or `{ handled = true }` ends it: later handlers don't see the line.

A reason that starts with `muted` or `filtered` (`"muted"`, `"muted: spamming"`,
`"filtered: links are not allowed"`) tells the player's game what kind of refusal it is, so it can
show a translated message; the part after the colon is shown as the detail. Any other reason is shown
as it is.

Here is a small moderator in one handler: a `/mute` command for admins, the mute itself, a link
filter and a word filter.

<!-- doctest: server+client {"players": ["Alice", "Bob"], "emit": [["chat:send", {"text": "free stuff at http://spam.example"}], ["chat:send", {"text": "darn it"}]]} -->
```lua
local muted = {} -- [accountId or name] = true

local function key(player) return player.accountId or player.name end

node.on("chatMessageRequest", function(player, msg)
    local target = msg.text:match("^/mute%s+(%S+)")
    if target and player.role == "admin" then
        local who = node.players.find(target)
        if who then
            muted[key(who)] = true
            player:tell("%s is muted", who.name)
        else
            player:tell("Nobody called %s is here", target)
        end
        return { handled = true }
    end

    if muted[key(player)] then
        return false, "muted"
    end
    if msg.text:find("https?://") then
        return false, "filtered: links are not allowed here"
    end
    local clean, changed = msg.text:gsub("[Dd]arn", "****")
    if changed > 0 then return clean end
end)

-- expect-client: Alice chat:msg .*links are not allowed here
-- expect-client: Bob chat:msg .*\*\*\*\* it
```

A rewritten line is cleaned and cut again, and reaches everyone with `edited = true`. A scope other
than `"global"` or `"local"` refuses the line instead of showing it to everyone. With no
`chatMessageRequest` handler at all, lines go out at once without waiting for the plugin thread.

## In the player's language

`player.locale` is the language the player's game runs in, such as `"ru_RU"` or `"en_US"`, as their
client mod reports it. It's known by `playerJoined`. A mod older than 1.7.4 doesn't send it, and
then it's an empty string, so always keep a fallback:

<!-- doctest: server+client -->
```lua
local welcome = {
    ru = "Добро пожаловать, %s!",
    de = "Willkommen, %s!",
}

node.on("playerJoined", function(player)
    local lang = (player.locale or ""):match("^(%a+)") -- "ru_RU" -> "ru"
    player:tell(welcome[lang] or "Welcome, %s!", player.name)
end)

-- expect-client: Alice chat:msg .*Welcome, Alice!
```

## Watching the chat

`chatMessage(player, msg)` fires once the line's fate is decided, so it's the right place to log the
chat, count activity or bridge to Discord: unlike in `chatMessageRequest`, nothing can change the
outcome any more.

| Field | Meaning |
|---|---|
| `msg.text`, `msg.scope` | the final text and scope |
| `msg.sent` | `true` when the line went out |
| `msg.mid` | the line's number, when sent |
| `msg.code` | when not sent: `"handled"` (a resource took it as a command), `"muted"`, `"filtered"`, `"blocked"`, `"empty"` or `"invalid"` |
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

Lines refused before any resource saw them (the rate limit, a broken message) don't fire
`chatMessage`. A bridge to Discord is in [Recipes](/plugins/recipes/#post-chat-to-discord).

## Local chat

Players can send a line to `local` scope. It reaches the players in the sender's
[visibility group](/plugins/players-and-vehicles/#visibility-groups); when no resource uses groups,
that's everyone.

## Settings

The host sets these in `server.toml`; your resource can't change them, but should know they exist.

| Setting | Default | What it does |
|---|---|---|
| `[Chat] MaxLength` | `256` | The longest line, in bytes (16 to 2048). Longer lines are cut. |
| `[Chat] RatePerSec` | `2` | Lines a player may send per second on average, commands included. Over that, the line isn't sent and the player is told so. |
| `[Chat] Burst` | `5` | Lines a player may send at once before the rate applies. |
| `[Chat] LogToConsole` | `true` | Shows the chat in the console and `logs/server.log`. |
| `[Chat] LogHiddenCommands` | a list | Commands logged as `/login ***`. |

## Older resources

- **`node.commands`** was removed in server 1.8.0, together with the bus event `chat:command`. A
  resource that calls `node.commands.add` stops at that line. Move each command into a
  `chatMessageRequest` handler as shown [above](#commands); the body of the command stays the same.
- **The wire event `chat:send`** still reaches resources that subscribe to it, for every line that
  passed the rate limit, handled and refused ones included. Read it if you like, but don't relay the
  line yourself: the server already did. To refuse lines, use `chatMessageRequest`; to send lines,
  use `node.chat`.

## Next

- [Recipes](/plugins/recipes/): `/kick`, `/ban`, a Discord bridge and more, complete.
- [Events](/plugins/events/): everything else your resource can react to.
