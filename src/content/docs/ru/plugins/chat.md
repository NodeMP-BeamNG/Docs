---
title: Чат
description: Говорить с игроками, команды чата с ролями, отказывать или переписывать сказанное, наблюдать за чатом для логов и мостов, и настройки чата.
---

Чат — часть сервера. Игроки общаются без единого ресурса, а ваш ресурс может говорить, принимать
команды, фильтровать строки и следить за разговором парой вызовов.

## Говорить

| Вызов | Кто видит |
|---|---|
| `node.chat.say(text, ...)` | все |
| `node.chat.tell(player, text, ...)` | один игрок (`Player` или номер) |
| `player:tell(text, ...)` | этот игрок |

Все три принимают аргументы `string.format` и показываются как строка от **System**. Управляющие
символы удаляются, строка обрезается до `[Chat] MaxLength` (по умолчанию 256 байт). Они работают в
любом обработчике, таймере или корутине, а консоль сервера показывает их, когда журнал чата включён.

<!-- doctest: server+client -->
```lua
node.on("playerJoined", function(player)
    player:tell("Welcome to the server, %s!", player.name)
    node.chat.say("%s joined. %d online.", player.name, node.players.count())
end)

-- expect-client: Alice chat:msg .*Welcome to the server, Alice!
-- expect-client: Alice chat:msg .*Alice joined\. 1 online\.
```

## Команды

Строка, начинающаяся с `/`, — команда. Другим игрокам она не показывается никогда.
`node.commands.add` регистрирует команду:

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

Обработчик получает игрока, слова после команды массивом и всю строку как набрана. Имена команд
не зависят от регистра: `/Dice` и `/DICE` попадают в один обработчик.

Чтобы открыть команду только для роли, передайте `{ role = "admin" }`. Все остальные получат
`You are not allowed to use /<имя>`. Роли выдают ваши ресурсы
([Игроки и машины → Роли](/ru/plugins/players-and-vehicles/#роли)):

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

Что ещё стоит знать:

- На неизвестную команду никто не отвечает, если ответ не даст какой-нибудь ресурс. Сервер, где нет
  ни одного обработчика команд, отвечает игроку `This server has no commands.`
- Два ресурса могут зарегистрировать одно имя. Выполнятся оба обработчика.
- `node.commands.remove(name)` снимает команду.
- Команды, аргументам которых не место в логе (`/login <пароль>`), скрывает
  `[Chat] LogHiddenCommands` — там уже перечислены обычные.

## Отказать и переписать

`chatMessageRequest(player, msg)` выполняется до отправки строки. `msg.text` уже очищен и обрезан;
`msg.scope` — `"global"` или `"local"`. Решает ваш обработчик:

| Что вернуть | Что произойдёт |
|---|---|
| ничего (или `true`) | строка уходит как есть |
| `false, reason` | строку не получит никто; отправителю сообщат причину |
| строку | уходит этот текст вместо исходного, с пометкой «изменено» |
| `{ text = ..., scope = ... }` | меняет текст, область или и то и другое |

Обработчики выполняются в порядке подписки, и каждый видит текст таким, каким его оставил
предыдущий. Первый `false` всё заканчивает: следующие обработчики строку не увидят.

Причина, которая начинается с `muted` или `filtered` (`"muted"`, `"muted: spamming"`,
`"filtered: links are not allowed"`), говорит игре игрока, что это за отказ, чтобы та показала
переведённое сообщение; часть после двоеточия показывается как подробность. Любая другая причина
показывается как есть.

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

Переписанная строка снова очищается и обрезается и уходит всем с `edited = true`. Область, отличная
от `"global"` и `"local"`, не показывает строку всем, а отклоняет её. Если обработчиков
`chatMessageRequest` нет вовсе, строки уходят сразу, не дожидаясь потока плагинов.

## Наблюдать за чатом

`chatMessage(player, msg)` срабатывает, когда судьба строки решена, поэтому это правильное место,
чтобы вести журнал чата, считать активность или делать мост в Discord: в отличие от
`chatMessageRequest`, исход уже ничто не изменит.

| Поле | Значение |
|---|---|
| `msg.text`, `msg.scope` | итоговый текст и область |
| `msg.sent` | `true`, если строка ушла |
| `msg.mid` | номер строки, если ушла |
| `msg.code` | если не ушла: `"muted"`, `"filtered"`, `"blocked"`, `"empty"` или `"invalid"` |
| `msg.reason` | что сказал отказавший обработчик |

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

Команды и строки, отклонённые раньше, чем их увидел любой ресурс (лимит частоты, испорченное
сообщение), `chatMessage` не вызывают. Мост в Discord — в [Рецептах](/ru/plugins/recipes/#чат-в-discord).

## Локальный чат

Игроки могут отправить строку в область `local`. Она доходит до игроков в
[группе видимости](/ru/plugins/players-and-vehicles/#группы-видимости) отправителя; если ни один
ресурс не использует группы, это все.

## Настройки

Их задаёт владелец сервера в `server.toml`; ваш ресурс их не меняет, но знать о них стоит.

| Настройка | По умолчанию | Что делает |
|---|---|---|
| `[Chat] MaxLength` | `256` | Самая длинная строка в байтах (от 16 до 2048). Длиннее — обрезается. |
| `[Chat] RatePerSec` | `2` | Сколько строк (и команд) игрок может отправлять в секунду в среднем. Сверх этого строка не уходит, а игроку об этом сообщают. |
| `[Chat] Burst` | `5` | Сколько строк можно отправить разом, прежде чем начнёт действовать лимит. |
| `[Chat] LogToConsole` | `true` | Показывает чат в консоли и в `logs/server.log`. |
| `[Chat] LogHiddenCommands` | список | Команды, которые пишутся в лог как `/login ***`. |

## Для ресурсов, написанных до того, как чат стал частью сервера

Сетевое событие `chat:send` по-прежнему доходит до ресурсов, которые на него подписаны, — для каждой
строки, прошедшей лимит частоты, включая команды и отклонённые строки. Читайте его, если нужно, но
сами строку больше не пересылайте: сервер это уже сделал. Отказывать — через `chatMessageRequest`,
отправлять — через `node.chat`.

## Дальше

- [Рецепты](/ru/plugins/recipes/) — `/kick`, `/ban`, мост в Discord и другое, целиком.
- [События](/ru/plugins/events/) — всё остальное, на что может реагировать ресурс.
