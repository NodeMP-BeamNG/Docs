---
title: Чат и команды
description: Как устроен чат сервера, как отклонить или переписать строку, записать чат в лог, говорить от имени сервера, сделать роутер команд и команды кика и бана для модераторов.
---

Стандартное поведение сервера и чата, это приём строки от игрока, применение фильтров из файла конфигурации сервера из раздела `[chat]`, с последующей отправкой этого сообщения все игрокам включая автора, если не определено другое поведение. К примеру обработка команд, скрытие плохим сообщений или иное поведение.

## Путь строки через сервер

1. Мод отправляет строку с областью `global` (всем) или `local` (своей группе).
2. Сервер убирает управляющие символы и обрезает строку до `[chat] max_length`. Игроку, который пишет слишком часто, сообщают об этом.
3. Обработчики `chatMessageRequest` решают: пропустить, отклонить, переписать или принять как команду.
4. Строка уходит, а `chatMessage` сообщает ресурсам, что с ней стало.

## Как работает ответ в обработчике

Обработчик `chatMessageRequest` получает игрока и `msg = { text, scope }`. Решает то, что он вернёт:

| Что вернуть | Что будет |
|---|---|
| ничего | Строка уходит как есть. |
| `false, "причина"` | Строка отклонена, её никто не получит. |
| строку | Строка уходит с этим текстом вместо исходного. |
| `{ text = ..., scope = ... }` | Заменить текст, область или и то и другое. |
| `{ handled = true }` | Строку забрал ресурс как свою команду; её никто не увидит. |

Обработчики идут по очереди, и каждый видит текст таким, каким его оставил предыдущий. 

:::caution[Внимание]
Первый отказ обрывает цепочку.
:::


Как переписать строку:

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

Отклонить. Если причина начинается с `muted` или `filtered`, игра игрока покажет свою готовую строку
для этого случая («у вас мут», «сообщение не прошло фильтр сервера»); любая другая причина
показывается как обычное «заблокировано». Полная причина попадает в лог сервера.

<!-- doctest: server+client {"emit": [["chat:send", {"text": "see https://example.com", "cid": 7}]]} -->
```lua
node.on("chatMessageRequest", function(player, msg)
    if msg.text:find("https?://") then
        return false, "filtered: links are not allowed"
    end
end)

-- expect-client: Alice chat:refused .*filtered
```

## Чат в лог

`chatMessage` приходит после решения, с итогом: `sent` равно `true` для строки, которая ушла, а иначе
`code` говорит почему (`"muted"`, `"filtered"`, `"blocked"`, `"handled"`, …). Здесь удобно вести лог чата или пересылать его в Discord.

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

## Сообщение от имени сервера

- `player:tell(text, ...)` и `node.chat.tell(player, text, ...)` — системная строка одному игроку.
- `node.chat.say(text, ...)` — системная строка всем игрокам.
<add table code to deistvie>
Обе принимают аргументы как `string.format`. Текст можно раскрашивать кодами с `^`: `^0`–`^9` и
`^a`–`^f` — цвета, `^#RRGGBB` — любой цвет, `^l` — жирный, `^o` — курсив, `^n` — подчёркнутый,
`^m` — зачёркнутый, `^r` — сбросить.

## Команды

Готовых функций для обработки команд у сервера нет. Строка, которая начинается с `/`, остаётся обычной строкой, пока какой-нибудь ресурс не вернёт для неё `{ handled = true }`; строка с `/`, которую никто не забрал, уходит в чат как любая другая строка. Рекомендуется держать несколько команд в 1 маленьком роутере:

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

Аргументы команд с паролями (`/login`, `/register` и других из `[chat] masked_commands`) пишутся
в лог как `***`. Пример `chat-commands` из архива сервера так же добавляет `/help`, `/me` и `/pm`
([Примеры плагинов](/ru/plugins/examples/)).

## Команды для модераторов

Кому можно пользоваться командой, решает ресурс. Обычно доступ прописывают по айди аккаунтов в `[config]`;

`/kick` и `/ban` принимают имя игрока и причину, бан длится сутки:

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

Опираться на `accountId` безопасно: гость может назваться как угодно, а за аккаунт ручается только
NodeMP. На сервере без ключа игроков никто не проверяет, поэтому права по имени там не раздавайте.
