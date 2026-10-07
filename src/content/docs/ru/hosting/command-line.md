---
title: "Командная строка и окружение"
description: "Флаги командной строки Node-Server, переменные провайдера и остальные переменные окружения."
---

## Переменные провайдера

Три переменные существуют для хостинг-панелей и контейнеров. Они читаются только из окружения и
не имеют ключа в файле.

| Переменная | Действие |
|---|---|
| `NODE_PROVIDER_DISABLE_CONFIG` | Когда её значение равно `true` или `1` в точности (`TRUE` и `yes` не считаются): `server.toml` не читается, не создаётся и не перезаписывается; настройки берутся из окружения и значений по умолчанию. Docker-образ задаёт её. |
| `NODE_PROVIDER_PORT_ENV` | Имя другой переменной, в которой лежит порт, — для панели, экспортирующей его под своим именем (`SERVER_PORT`). Читается вместо `NODE_PORT`. |
| `NODE_PROVIDER_IP_ENV` | То же для адреса привязки, вместо `NODE_IP`. |

## Другие переменные окружения

| Переменная | Действие |
|---|---|
| `NODE_LUA` | Путь к исполняемому файлу Lua 5.1 (или LuaJIT), который запускает обфускатор. Без неё сервер ищет `tools/lua515/lua5.1` (`lua5.1.exe` на Windows), затем `tools/luajit`, `tools/lua5.1`, `tools/lua`. |
| `NODE_TOOLS_DIR` | Папка `tools/`, если она лежит не рядом с исполняемым файлом. |
| `NODE_FORCE_ANSI` | `1` или `true`: цветной вывод в консоль, даже если вывод — не терминал. |
| `NODE_PLUGIN_POOL` | Потоков в фоновом пуле задач, который ресурсы используют через `node.job` и `node.await`. По умолчанию — число ядер машины, от 2 до 32. |

## Командная строка

`Node-Server --help` печатает:

```
USAGE:
    Node-Server [arguments]

ARGUMENTS:
    --help
                        Displays this help and exits.
    --port=1234
                        Sets the server's listening TCP and
                        UDP port. Overrides ENV and server.toml.
    --config=/path/to/server.toml
                        Absolute or relative path to the
                        server config file, including the
                        filename. For paths and filenames with
                        spaces, put quotes around the path.
    --working-directory=/path/to/folder
                        Sets the working directory of the Server.
                        All paths are considered relative to this,
                        including the path given in --config.
    --version
                        Prints version info and exits.
    --gen-integrity <gamedir> [--out <file>] [--game-version <v>]
                        Writes the integrity manifest that
                        VerifyGame = "strict" checks players
                        against, from a CLEAN game install at
                        <gamedir> (the folder with integrity.json):
                        EVERY file of the install with size and
                        SHA-256 (the game's own integrity.json omits
                        some shipped files) plus the table of
                        contents of every archive; hashing a few GB
                        takes well under a minute. Default output is
                        integrity/<game-version>.manifest under the
                        working directory ([General] IntegrityDir);
                        the version is read from integrity.json
                        unless --game-version says otherwise.
                        Prints the stats and the manifest hash, then
                        exits. Run it on a machine with the game
                        installed and copy the file to the server.
    --bans list
    --bans remove <ip | nodemp:<account id> | <account id>>
                        Shows or lifts bans without a running server.
                        Bans live in bans.json in the working
                        directory: one JSON object whose keys are the
                        banned IP address ("203.0.113.7", or an IPv6
                        address without brackets) or the NodeMP
                        account as "nodemp:<id>", and whose values are
                        {"reason": "<text shown to the player>",
                         "at": <unix seconds>, "name": "<player name
                        at the time>"}. Stop the server before editing
                        the file, by hand or with this: it reads the
                        file once, on the first ban check or ban after
                        a start, keeps the list in memory from then on
                        and writes it back on every new ban.
    --obf-selftest
                        Checks that the client-script obfuscator
                        (tools/) runs; prints [obf-selftest]
                        available=1 when it does. Exits.

EXAMPLES:
    Node-Server --config=../MyWestCoastServer.toml
        Runs the Node-Server and uses the server config file
        which is one directory above it and is named
        'MyWestCoastServer.toml'.
    Node-Server --gen-integrity "C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive"
        Writes integrity/0.39.4.0.manifest (for that game version).
    Node-Server --bans remove 203.0.113.7
        Lifts the ban on that address (server stopped).
```

`--gen-integrity` и `--bans` — отдельные встроенные утилиты в бинарнике сервера: они принимают аргументы позиционно, не требуют `server.toml` и завершают работу сразу после выполнения задачи.
Раздел [Строгая проверка](/ru/hosting/strict-verification/) разбирает генерацию манифеста, а раздел [Администрирование](/ru/hosting/administration/#баны) — управление блокировками. Команда `Node-Server --obf-selftest` проверяет работу обфускатора клиентских скриптов ([Ресурсы и контент](/ru/hosting/resources/#обфускация)).

