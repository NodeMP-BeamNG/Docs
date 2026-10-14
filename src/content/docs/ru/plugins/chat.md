---
title: Чат
description: Как говорить с игроками, делать команды чата, отклонять и переписывать сказанное, отвечать на языке игрока и следить за чатом.
---

Чат — часть сервера. Игроки общаются без единого ресурса, а ваш ресурс парой вызовов может
говорить, добавлять команды, фильтровать строки и следить за разговором.

## Говорить

| Вызов | Кто видит |
|---|---|
| `node.chat.say(text, ...)` | все |
| `node.chat.tell(player, text, ...)` | один игрок (`Player` или номер) |
| `player:tell(text, ...)` | этот игрок |

Все три принимают аргументы `string.format` и показываются строкой от **System**. Управляющие
символы удаляются, строка обрезается до `[Chat] MaxLength` (по умолчанию 256 байт). Работают в
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

Сам сервер команд чата не знает: строка, которая начинается с `/`, для него такая же строка, как
любая другая. Команда — это строка, которую ваш ресурс забирает себе. Поймайте её в
`chatMessageRequest`, сделайте дело и верните `{ handled = true }`:

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

Когда обработчик отвечает `{ handled = true }`:

- строку не получает никто, а чат отправителя тихо её убирает — игрок видит только ваш ответ;
- обработчики, подписанные после вашего, строку не видят;
- консоль сервера пишет её с пометкой `[handled by a resource]` в конце.

Строка, которую не забрал ни один ресурс, уходит в чат как обычно — со `/` или без. Если игрок
опечатается и наберёт `/dcie`, все прочитают `/dcie`.

### Много команд, часть — для админов

Когда команд больше одной-двух, держите их в таблице, а выбирает пусть один обработчик. Здесь у
каждой команды может быть роль, которая для неё нужна. Роли выдают ваши ресурсы
([Игроки и машины → Роли](/ru/plugins/players-and-vehicles/#роли)):

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

`name:lower()` нужен, чтобы `/Online` и `/ONLINE` тоже работали. С сервером идёт готовый пример
такого устройства — `examples/chat-commands` с командами `/help`, `/me` и `/pm`: скопируйте папку в
`resources/` и допишите свои команды в его таблицу.

Что ещё стоит знать:

- **Не отклоняйте строки со `/`, которых не знаете.** Их может знать другой ресурс, а `false` из
  вашего обработчика обрывает строку раньше, чем он её увидит. Ничего не возвращайте — пусть идёт
  дальше.
- **Одна команда в двух ресурсах:** побеждает первый обработчик, ответивший `{ handled = true }`,
  второй строку не увидит. Ресурсы подписываются в том порядке, в каком загружаются.
- **Секреты в командах.** `[Chat] LogHiddenCommands` перечисляет команды, аргументы которых лог
  скрывает (`/login hunter2` записывается как `/login ***`). Это настройка владельца сервера: если
  у вашего ресурса есть такая команда, скажите ему.
- **Проверить команду без игры** можно так, как описано в
  [Первом ресурсе → Проверка без игры](/ru/plugins/getting-started/#проверка-без-игры).

## Отказать и переписать

`chatMessageRequest(player, msg)` выполняется до отправки строки. `msg.text` уже очищен и обрезан,
`msg.scope` — `"global"` или `"local"`. Решает ваш обработчик:

| Что вернуть | Что произойдёт |
|---|---|
| ничего (или `true`) | строка уходит как есть |
| `false, reason` | строку не получит никто, отправителю сообщат причину |
| строку | вместо исходного уходит этот текст, с пометкой «изменено» |
| `{ text = ..., scope = ... }` | меняет текст, область или и то и другое |
| `{ handled = true }` | ваш ресурс забрал строку как команду: её не получит никто, отправителю ничего не сообщат |

Обработчики выполняются в порядке подписки, и каждый видит текст таким, каким его оставил
предыдущий. Первый `false` или `{ handled = true }` всё заканчивает: следующие обработчики строку
не увидят.

Причина, которая начинается с `muted` или `filtered` (`"muted"`, `"muted: spamming"`,
`"filtered: links are not allowed"`), говорит игре игрока, что это за отказ, и та показывает
переведённое сообщение; часть после двоеточия идёт как подробность. Любая другая причина
показывается как есть.

Вот маленький модератор в одном обработчике: команда `/mute` для админов, сама немота, фильтр
ссылок и фильтр слов.

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

Переписанная строка снова очищается и обрезается и уходит всем с `edited = true`. Область, отличная
от `"global"` и `"local"`, не показывает строку всем, а отклоняет её. Если обработчиков
`chatMessageRequest` нет вовсе, строки уходят сразу, не дожидаясь потока плагинов.

## На языке игрока

`player.locale` — язык, на котором работает игра игрока, например `"ru_RU"` или `"en_US"`, как его
сообщает клиентский мод. К `playerJoined` он уже известен. Мод старше 1.7.4 его не присылает, и
тогда это пустая строка, поэтому запасной вариант нужен всегда:

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

## Следить за чатом

`chatMessage(player, msg)` срабатывает, когда судьба строки решена, поэтому здесь и стоит вести
журнал чата, считать активность или делать мост в Discord: в отличие от `chatMessageRequest`, исход
уже ничто не изменит.

| Поле | Значение |
|---|---|
| `msg.text`, `msg.scope` | итоговый текст и область |
| `msg.sent` | `true`, если строка ушла |
| `msg.mid` | номер строки, если ушла |
| `msg.code` | если не ушла: `"handled"` (ресурс забрал её как команду), `"muted"`, `"filtered"`, `"blocked"`, `"empty"` или `"invalid"` |
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

Строки, отклонённые раньше, чем их увидел хоть один ресурс (лимит частоты, испорченное сообщение),
`chatMessage` не вызывают. Мост в Discord — в [Рецептах](/ru/plugins/recipes/#чат-в-discord).

## Локальный чат

Игроки могут отправить строку в область `local`. Она доходит до игроков в
[группе видимости](/ru/plugins/players-and-vehicles/#группы-видимости) отправителя; если ни один
ресурс группами не пользуется, это все.

## Настройки

Их задаёт владелец сервера в `server.toml`; ваш ресурс их не меняет, но знать о них стоит.

| Настройка | По умолчанию | Что делает |
|---|---|---|
| `[Chat] MaxLength` | `256` | Самая длинная строка в байтах (от 16 до 2048). Длиннее — обрезается. |
| `[Chat] RatePerSec` | `2` | Сколько строк игрок может отправлять в секунду в среднем, команды тоже считаются. Сверх этого строка не уходит, а игроку об этом сообщают. |
| `[Chat] Burst` | `5` | Сколько строк можно отправить разом, прежде чем начнёт действовать лимит. |
| `[Chat] LogToConsole` | `true` | Показывает чат в консоли и в `logs/server.log`. |
| `[Chat] LogHiddenCommands` | список | Команды, которые пишутся в лог как `/login ***`. |

## Старые ресурсы

- **`node.commands`** убран в сервере 1.8.0 вместе с событием шины `chat:command`. Ресурс, который
  вызывает `node.commands.add`, останавливается на этой строке. Перенесите каждую команду в
  обработчик `chatMessageRequest`, как показано [выше](#команды); тело команды остаётся тем же.
- **Сетевое событие `chat:send`** по-прежнему доходит до ресурсов, которые на него подписаны, — для
  каждой строки, прошедшей лимит частоты, включая забранные и отклонённые. Читайте его, если нужно,
  но сами строку не пересылайте: сервер это уже сделал. Отказывать — через `chatMessageRequest`,
  отправлять — через `node.chat`.

## Дальше

- [Рецепты](/ru/plugins/recipes/) — `/kick`, `/ban`, мост в Discord и другое, целиком.
- [События](/ru/plugins/events/) — всё остальное, на что может реагировать ресурс.
