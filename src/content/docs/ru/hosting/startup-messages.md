---
title: "Сообщения при запуске"
description: "Что Node-Server пишет, когда не может запуститься, что значит каждое сообщение и как это исправить."
---

## Сообщения сервера при запуске

Хостам: строки, которыми `Node-Server` отказывается запускаться или объясняет ошибку в
`server.toml`. Игроки их не видят; они в консоли и в `logs/server.log`. Каждая завершает запуск
строкой `Closing in 10 seconds` и кодом выхода 1, кроме трёх последних: две строки о сертификате
директории оставляют сервер работать вне списка, а строка о клиентском файле — сообщение об одном
ресурсе.

| Сообщение | Смысл | Что делать |
|---|---|---|
| `Cannot listen on port … (…): the port is already in use (…). Usually another Node-Server is still running on this machine -- a previous instance that was not stopped, or a second copy started by mistake -- or another program owns the port. Stop it, or give this server a different port with [General] Port in server.toml or --port=<number>. Closing.` | Порт `[General] Port` держит другой процесс; в первых скобках — `udp` или `tcp`, в последних — слова самой операционной системы. Вторая половина порта падает строкой позже с `Cannot listen on port … (…) either: …`. | Остановите другой экземпляр или смените порт. [Запуск → Логи](/ru/hosting/administration/#логи) |
| `Cannot listen on port … (…): … failed: …. Closing.` | Слушающий сокет не удалось открыть, привязать или перевести в режим прослушивания по другой причине; шаг и слова системы — в строке. | Прочитайте слова системы; проверьте, что `[General] IP` — адрес этой машины. |
| `[General] IP = "…" is not an IP address (…); the server cannot listen. Leave it at "::" to listen on every interface, or give the address of one of this machine's interfaces. Closing.` | `[General] IP` (или `NODE_IP`) не разбирается как адрес. | Поставьте `::`, `0.0.0.0` или один из адресов машины. |
| `Error parsing config file value: …: the table […] appears twice. Put the keys into the existing […] table -- the server wrote one with every key in it on the first start -- and remove the second […] line together with the keys under it. The file has not been changed; fix it and start the server again.` | Заголовок секции встречается в `server.toml` дважды — вставленный блок `[Directory]`; первое `…` — файл и строка. | Перенесите ключи в существующую таблицу, удалите второй заголовок. [Регистрация](/ru/hosting/registering/#передача-ключа-серверу) |
| `Error parsing config file value: …: the key … is given twice. Keep one of the two lines. The file has not been changed; fix it and start the server again.` | Один и тот же ключ дважды в одной таблице. | Удалите одну из двух строк. |
| `` Error parsing config file value: …: … -- the line reads `…`. Fix that line and start the server again, or delete the file and the server writes a fresh one with every default. `` | Любая другая ошибка TOML; причина парсера и проблемная строка процитированы. | Исправьте строку или удалите `server.toml`, чтобы получить свежий файл со значениями по умолчанию. |
| `This machine has no trusted root certificates to verify the directory against (the Windows certificate store is empty and there is no cacert.pem next to Node-Server.exe): put Mozilla's cacert.pem (https://curl.se/ca/cacert.pem) next to the executable, or name a PEM bundle in [Directory] CaFile` | Windows с заданным ключом сервера: нечем проверить сертификат директории. Сервер продолжает работать вне списка. | Верните `cacert.pem` из архива рядом с исполняемым файлом. [Регистрация → Windows](/ru/hosting/registering/#windows-сертификат-директории) |
| `[Directory] CaFile '…' could not be loaded (…): the directory's certificate cannot be verified and this server will not be listed until it can` | `[Directory] CaFile` называет набор, которого нет, который не разбирается или без сертификатов. | Исправьте путь или файл либо оставьте `CaFile` пустым для `api.nodemp.com`. |
| `… · client file '…' has a syntax error: … (the file ships anyway; the game's Lua will very likely refuse it too)` | Клиентский `.lua`-файл ресурса не разбирается; имя ресурса, файл и сообщение Lua — в строке. Ресурс загружается, файл всё равно передаётся. | Исправьте файл и перезапустите. [Ресурсы → Обфускация](/ru/plugins/resources/#обфускация) |

Хостам: на что смотреть со своей стороны, когда игрок цитирует одну из этих строк, — на странице
[Запуск сервера → Когда игроку отказано](/ru/hosting/administration/#когда-игроку-отказано); причины,
которые может прислать плагин, описаны в [Рецептах](/ru/plugins/recipes/); уровни `VerifyGame` -
в [Конфигурации](/ru/hosting/configuration/).
