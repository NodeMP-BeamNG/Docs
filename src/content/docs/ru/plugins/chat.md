---
title: Чат и команды
description: Как устроен чат сервера, как отклонить или переписать строку, записать чат в лог, говорить от имени сервера, сделать роутер команд и команды кика и бана для модераторов.
---

Чат встроен в сервер и работает без плагинов. Плагины нужны, чтобы отклонить строку, переписать её или принять как команду.

## Путь строки через сервер

1. Мод отправляет строку с областью `global` (всем) или `local` (игрокам из группы отправителя, а если группы не используются, всем).
2. Сервер убирает управляющие символы и обрезает строку до `[chat] max_length`. Если игрок пишет чаще, чем разрешают `[chat] rate_per_sec` и `[chat] burst`, сервер отклоняет строку и сообщает ему об этом.
3. Обработчики `chatMessageRequest` решают: пропустить, отклонить, переписать или принять как команду.
4. Сервер отправляет строку всем в её области, включая автора, а `chatMessage` сообщает плагинам, что с ней стало.

## Ответ обработчика

Обработчик `chatMessageRequest` получает игрока и `msg = { text, scope }`. Что будет со строкой, решает то, что он вернёт:

| Что вернуть | Что будет |
|---|---|
| ничего | Строка уходит как есть. |
| `false, "причина"` | Строка отклонена, её никто не получит. |
| строку | Строка уходит с этим текстом вместо исходного. |
| `{ text = ..., scope = ... }` | Заменить текст, область или и то и другое. Область бывает только `"global"` или `"local"`, с другой строка отклоняется. |
| `{ handled = true }` | Строку забрал плагин как свою команду, её никто не увидит. |

Обработчики идут по очереди, и каждый видит текст таким, каким его оставил предыдущий. Первый отказ обрывает цепочку.

Как переписать строку. Сервер очистит новый текст и обрежет его заново:

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

Как отклонить. Саму причину игрок не видит: мод показывает готовую строку, а какую, решает первое слово причины. Регистр не важен, после слова идёт двоеточие, пробел или конец причины.

| Первое слово причины | Что покажет мод |
|---|---|
| `muted` | *Не доставлено: у вас мут на этом сервере.* |
| `filtered` | *Не доставлено: сообщение не прошло фильтр сервера.* |
| любое другое | *Не доставлено: сервер заблокировал сообщение.* |

Причину сервер пишет в консоль, пока включён `[chat] log`.

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

## Чат в лог

`chatMessage` приходит после решения, с итогом: `sent` равно `true` для строки, которая ушла, а иначе `code` говорит почему (`"muted"`, `"filtered"`, `"blocked"`, `"handled"`, …). Строки, отклонённые до плагинов (слишком частые или нечитаемые), `chatMessage` не вызывают. Здесь удобно вести лог чата или пересылать его в Discord.

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

## Сообщение от имени сервера

| Вызов | Кому |
|---|---|
| `player:tell(text, ...)` и `node.chat.tell(player, text, ...)` | Системная строка одному игроку. |
| `node.chat.say(text, ...)` | Системная строка всем игрокам. |

Обе принимают аргументы как `string.format`. Текст можно раскрашивать кодами с `^`:

| Код | Что делает |
|---|---|
| `^0`–`^9`, `^a`–`^f` | Цвет. |
| `^#RRGGBB` | Любой цвет. |
| `^l`, `^o`, `^n`, `^m` | Жирный, курсив, подчёркнутый, зачёркнутый. |
| `^r` | Сбросить цвет и начертание. |

## Команды

Сервер не знает команд. Строка, которая начинается с `/`, остаётся обычной строкой, пока какой-нибудь плагин не вернёт для неё `{ handled = true }`. Команда — это обработчик `chatMessageRequest`, который узнаёт свою строку. Несколько команд удобно держать в небольшом роутере:

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

Аргументы команд с паролями (`/login`, `/register` и других из `[chat] masked_commands`) в лог пишутся как `***`. Пример `chat-commands` из архива сервера так же добавляет `/help`, `/me` и `/pm` ([Примеры плагинов](/ru/plugins/examples/)).

## Команды для модераторов

Кому можно пользоваться командой, решает плагин. Обычно доступ выдают по номерам аккаунтов из `[config]`. Команды `/kick` и `/ban` принимают имя игрока и причину, бан длится сутки:

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

Права выдавайте по `accountId`: за аккаунт ручается NodeMP, а назваться гость может как угодно. На сервере, которого нет в списке, NodeMP игроков не проверяет, и `accountId` там нет ни у кого ([Игроки и машины](/ru/plugins/players-and-vehicles/#кто-такой-игрок)).
