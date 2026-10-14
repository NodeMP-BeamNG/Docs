---
title: Chat and commands
description: How the server's chat works, refusing and rewriting lines, logging the chat, speaking as the server, a command router, and kick and ban commands for moderators.
---

Chat is part of the server: it works with no resource installed. The server takes each line, cleans
it, applies the limits from `[chat]`, and sends it to everyone in its scope, the sender included.
Resources come in when they want to change that: refuse a line, rewrite it, or take it as a command.

## A line's way through the server

1. A player sends a line, with the scope `global` (everyone) or `local` (the player's group).
2. The server strips control characters and cuts the line to `[chat] max_length`. A player over the
   rate limit is told so; nobody is kicked for chatting.
3. `chatMessageRequest` handlers decide: let it through, refuse, rewrite, or take it as a command.
4. The line goes out, and `chatMessage` tells resources what happened to it.

## Deciding about a line

A `chatMessageRequest` handler gets the player and `msg = { text, scope }`. What it returns decides:

| Return | Effect |
|---|---|
| nothing | The line goes on as it is. |
| `false, "reason"` | The line is refused; nobody gets it. |
| a string | The line goes on with this text instead. |
| `{ text = ..., scope = ... }` | Replaces the text, the scope, or both. |
| `{ handled = true }` | The line is a command this resource took; nobody sees it. |

Handlers run in order, and each sees the text as the one before left it. The first refusal ends the
chain.

A rewrite:

<!-- doctest: server+client {"emit": [["chat:send", {"text": "spam here"}]]} -->
```lua
node.on("chatMessageRequest", function(player, msg)
    local clean = msg.text:gsub("[Ss]pam", "****")
    if clean ~= msg.text then
        return clean
    end
end)

-- expect-client: Alice chat:msg .*\*\*\*\* here
```

A refusal. When the reason starts with `muted` or `filtered`, the player's game shows its own
ready-made line for that case ("you are muted", "the message didn't pass the server's filter");
any other reason shows as a plain "blocked". The full reason goes to the server's log.

<!-- doctest: server+client {"emit": [["chat:send", {"text": "see https://example.com", "cid": 7}]]} -->
```lua
node.on("chatMessageRequest", function(player, msg)
    if msg.text:find("https?://") then
        return false, "filtered: links are not allowed"
    end
end)

-- expect-client: Alice chat:refused .*filtered
```

## Logging the chat

`chatMessage` comes after the decision, with the outcome: `sent` is `true` for a line that went out,
otherwise `code` says why not (`"muted"`, `"filtered"`, `"blocked"`, `"handled"`, …). This is the
place for a chat log or a bridge to Discord.

<!-- doctest: server+client {"emit": [["chat:send", {"text": "hello"}]]} -->
```lua
node.on("chatMessage", function(player, msg)
    if msg.sent then
        node.log("[%s] %s: %s", msg.scope, player.name, msg.text)
    else
        node.log("not sent (%s): %s", msg.code, msg.text)
    end
end)

-- expect: \[global\] Alice: hello
```

## Speaking as the server

- `player:tell(text, ...)` and `node.chat.tell(player, text, ...)`: a system line to one player.
- `node.chat.say(text, ...)`: a system line to everyone.

Both take `string.format` arguments. Text can be coloured with `^` codes: `^0`–`^9` and `^a`–`^f`
pick a colour, `^#RRGGBB` any colour, `^l` bold, `^o` italic, `^n` underline, `^m` strike-through,
`^r` back to normal.

## Commands

The server knows no commands. A line that starts with `/` is an ordinary line until a resource
returns `{ handled = true }` for it; a `/` line nobody takes goes to the chat like any other. So a
command is a `chatMessageRequest` handler that recognises its line. With more than one command, a
small router keeps them tidy:

<!-- doctest: server+client {"emit": [["chat:send", {"text": "/dice 20"}]]} -->
```lua
local commands = {}

function commands.dice(player, args)
    local sides = tonumber(args[1]) or 6
    node.chat.say("%s rolls %d", player.name, math.random(sides))
end

node.on("chatMessageRequest", function(player, msg)
    local name, rest = msg.text:match("^/(%S+)%s*(.*)$")
    local command = name and commands[name:lower()]
    if not command then return end
    local args = {}
    for word in rest:gmatch("%S+") do
        args[#args + 1] = word
    end
    command(player, args)
    return { handled = true }
end)

-- expect-client: Alice chat:msg .*Alice rolls \d+
```

Arguments of commands that carry a password (`/login`, `/register` and the others in
`[chat] masked_commands`) are written to the log as `***`. The `chat-commands` example in the
server archive adds `/help`, `/me` and `/pm` this way ([The example plugins](/plugins/examples/)).

## Commands for moderators

Who may use a command is the resource's decision. Here the moderators are account numbers in
`[config]`; `/kick` and `/ban` take a player's name and a reason, and a ban lasts a day:

<!-- doctest: server+client {"config": {"moderators": [42]}, "players": ["Alice", "Bob"], "emit": [["chat:send", {"text": "/kick Bob flooding"}]]} -->
```lua
local moderators = {}
for _, id in ipairs(node.config.moderators or {}) do
    moderators[id] = true
end

node.on("chatMessageRequest", function(player, msg)
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
end)

-- expect-log: Bob kicked — flooding
```

Keying moderators by `accountId` is safe: a guest can call itself anything, but only NodeMP can vouch
for an account. On a server without a key, players aren't verified, so don't hand out powers there
by name.
