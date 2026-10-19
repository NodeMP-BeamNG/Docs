---
title: Chat and commands
description: How the server's chat works, refusing and rewriting lines, logging chat, speaking as the server, a command router and kick and ban commands.
---

Chat is built into the server and works without plugins. Plugins are for refusing a line, rewriting it or taking it as a command.

## A line's way through the server

1. The mod sends a line with the scope `global` (everyone) or `local` (players in the sender's group, or everyone if groups aren't used).
2. The server strips control characters and cuts the line to `[chat] max_length`. If a player writes faster than `[chat] rate_per_sec` and `[chat] burst` allow, the server refuses the line and tells the player.
3. `chatMessageRequest` handlers pass the line, refuse it, rewrite it or take it as a command.
4. The server sends the line to everyone in its scope, the author included, and `chatMessage` tells plugins what became of it.

## The handler's answer

A `chatMessageRequest` handler gets the player and `msg = { text, scope }`, and what it returns decides what happens:

| Return | What happens |
|---|---|
| nothing | The line goes out unchanged. |
| `false, "reason"` | The line is refused; nobody receives it. |
| a string | This text goes out instead. |
| `{ text = ..., scope = ... }` | Replaces the text, the scope or both. A scope other than `"global"` or `"local"` refuses the line. |
| `{ handled = true }` | The plugin took the line as its command; nobody sees it. |

Handlers run in turn, each seeing the text as the previous one left it. The first refusal or `{ handled = true }` ends the chain.

To rewrite a line, return the new text; the server cleans and cuts it again:

<!-- doctest: server+client {"emit": [["chat:send", {"text": "spam here"}]]} -->
```lua
local function maskSpam(player, msg)
    local clean = msg.text:gsub("[Ss]pam", "****")
    if clean ~= msg.text then
        return clean
    end
end

node.on("chatMessageRequest", maskSpam)

-- expect-client: Alice chat:msg .*\*\*\*\* here
```

To refuse, return `false` and a reason. The player doesn't see the reason: the mod shows a fixed line picked by its first word, in any letter case and followed by a colon, a space or the end of the reason.

| First word of the reason | What the mod shows |
|---|---|
| `muted` | *Not delivered: you are muted on this server.* |
| `filtered` | *Not delivered: the message did not pass the server filter.* |
| anything else | *Not delivered: the server blocked this message.* |

The server writes the reason to the console while `[chat] log` is on.

<!-- doctest: server+client {"emit": [["chat:send", {"text": "see https://example.com", "cid": 7}]]} -->
```lua
local function refuseLinks(player, msg)
    if msg.text:find("https?://") then
        return false, "filtered: links are not allowed"
    end
end

node.on("chatMessageRequest", refuseLinks)

-- expect-client: Alice chat:refused .*filtered
```

## Logging the chat

`chatMessage` arrives after the decision, with the outcome: `sent` is `true` if the line went out, otherwise `code` says why not (`"muted"`, `"filtered"`, `"blocked"`, `"handled"`, …). Lines refused before plugins (too frequent or unreadable) don't trigger it. Keep a chat log or forward chat to Discord here.

<!-- doctest: server+client {"emit": [["chat:send", {"text": "hello"}]]} -->
```lua
local function logChat(player, msg)
    if msg.sent then
        node.log("[%s] %s: %s", msg.scope, player.name, msg.text)
    else
        node.log("not sent (%s): %s", msg.code, msg.text)
    end
end

node.on("chatMessage", logChat)

-- expect: \[global\] Alice: hello
```

## Speaking as the server

| Call | Who gets the line |
|---|---|
| `player:tell(text, ...)` and `node.chat.tell(player, text, ...)` | One player, as a system line. |
| `node.chat.say(text, ...)` | Every player, as a system line. |

Both take `string.format` arguments. Color the text with `^` codes:

| Code | What it does |
|---|---|
| `^0`–`^9`, `^a`–`^f` | A color. |
| `^#RRGGBB` | Any color. |
| `^l`, `^o`, `^n`, `^m` | Bold, italic, underline, strikethrough. |
| `^r` | Resets color and style. |

## Commands

The server knows no commands. A line starting with `/` stays an ordinary line until a plugin returns `{ handled = true }` for it: a command is a `chatMessageRequest` handler that recognizes its line. Several commands fit in a small router:

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/dice 20"}]]} -->
```lua
local commands = {}

function commands.dice(player, args)
    local sides = tonumber(args[1]) or 6
    node.chat.say("%s rolls %d", player.name, math.random(sides))
end

local function routeCommand(player, msg)
    local name, rest = msg.text:match("^/(%S+)%s*(.*)$")
    local command = name and commands[name:lower()]
    if not command then return end
    local args = {}
    for word in rest:gmatch("%S+") do
        args[#args + 1] = word
    end
    command(player, args)
    return { handled = true }
end

node.on("chatMessageRequest", routeCommand)

-- expect-client: Alice chat:msg .*Alice rolls \d+
```

The log masks the arguments of password commands (`/login`, `/register` and the rest of `[chat] masked_commands`) as `***`. The `chat-commands` example in the server archive adds `/help`, `/me` and `/pm` the same way ([The example plugins](/plugins/examples/)).

## Commands for moderators

The plugin decides who may use a command, usually by account numbers from `[config]`. Here `/kick` and `/ban` take a player's name and a reason, and a ban lasts a day:

<!-- doctest: server+client {"config": {"moderators": [42]}, "players": ["Alice", "Bob"], "emit": [["chat:send", {"text": "/kick Bob flooding"}]]} -->
```lua
local moderators = {}
for _, id in ipairs(node.config.moderators or {}) do
    moderators[id] = true
end

local function moderate(player, msg)
    local cmd, name, reason = msg.text:match("^/(%a+)%s+(%S+)%s*(.*)$")
    if cmd ~= "kick" and cmd ~= "ban" then return end
    if not moderators[player.accountId] then
        player:tell("Only moderators can do that")
        return { handled = true }
    end
    local who = node.players.find(name)
    if not who then
        player:tell("Nobody called %s here", name)
        return { handled = true }
    end
    if reason == "" then reason = "No reason given" end
    if cmd == "kick" then
        who:kick(reason)
    else
        who:ban(reason, os.time() + 24 * 3600)
    end
    node.chat.say("%s: %s (%s)", cmd, who.name, reason)
    return { handled = true }
end

node.on("chatMessageRequest", moderate)

-- expect-log: Bob kicked — flooding
```

Grant rights by `accountId`: NodeMP vouches for an account, while a guest can take any name. On a server not in the list, NodeMP verifies nobody and no one has an `accountId` ([Players and vehicles](/plugins/players-and-vehicles/#who-a-player-is)).
