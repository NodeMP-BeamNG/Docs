---
title: Коды ошибок
description: Все тексты, которые показывает неудачное подключение - сообщения лаунчера, коды выхода хелпера и отказы сервера - с их значением и решением.
---

У NodeMP нет нумерованных кодов ошибок. То, что вы видите, - это текст из одного из трёх мест:
уведомление в окне лаунчера, последняя строка лога хелпера или причина, которую назвал сервер,
отказав в подключении или завершив сессию. Эта страница - указатель этих текстов, приведённых
ровно так, как их печатает код; `…` обозначает изменяющуюся часть. Подробные объяснения - в
разделе [Устранение неполадок](/ru/players/troubleshooting/); каждая строка ссылается на свой
раздел там.

## Сообщения лаунчера

Лаунчер (`nodemp-launcher.exe`) показывает уведомление на несколько секунд. Текст до ` · `
называет отказавший этап; текст после - причина, слово в слово взятая у отказавшего компонента.
Сообщения входа появляются в форме входа, а не в уведомлении.

| Сообщение | Значение | Действие | Подробнее |
|---|---|---|---|
| `Could not join · client mod is not installed and the directory is unreachable` | Первое подключение без `NodeMP.zip` на диске, а `https://api.nodemp.com` не ответил или опубликовал непригодный релиз. | Выйдите в сеть и подключитесь снова; если повторяется, подождите, пока директория заработает. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Could not join · client mod is not installed and no release has been published yet` | Первое подключение; у директории ещё нет релиза клиентского мода. | Дождитесь релиза. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Could not join · could not start the download: …`, `… the download server returned 503 Service Unavailable`, `… the download stopped: …`, `… the download was N bytes, the release says M`, `… the download is larger than the release says` | Хост файла релиза недоступен или передача оборвалась. | Проверьте соединение, VPN и прокси; подключитесь снова. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Could not join · the downloaded client mod does not match the published checksum` | Скачанный файл повреждён. | Подключитесь снова. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Could not join · cannot create …\mods\multiplayer: …`, `… could not create …\NodeMP.zip.part: …`, `… could not write …`, `… could not finish …`, `… could not read …\NodeMP.zip.part: …`, `… hashing …\NodeMP.zip.part was interrupted: …` | Пользовательская папка BeamNG недоступна для записи или диск заполнен. | Освободите место; проверьте права на `mods\multiplayer\`. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Could not join · LOCALAPPDATA is not set, so BeamNG's user folder cannot be found` | Переменная окружения отсутствует. | Исправьте окружение пользователя; выйдите из Windows и войдите снова. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Client mod could not be updated · joining with the installed copy` | Одна из проверок выше не удалась, но старый `NodeMP.zip` есть. Само по себе не ошибка. | Если сервер отказывает старому моду: **Settings → Launcher → Check now** при закрытой BeamNG. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Could not check the client mod · …` | Не удалась проверка при запуске или *Check now*. Текст после ` · ` - одна из причин выше или `could not replace …\NodeMP.zip (is BeamNG.drive running?): …`, когда игра держит zip открытым. | Закройте BeamNG.drive, затем *Check now*. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Client mod check failed` | Строка прогресса во время подключения, не уведомление: проверка не удалась, и подключение либо продолжается с установленной копией, либо заканчивается `Could not join · …`. | Смотрите уведомление, которое последует. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Could not start the launcher · could not start …\nodemp-launcher.exe: …` | Windows не дала запустить процесс хелпера (антивирус, политика). | Разрешите `nodemp-launcher.exe` или переустановите с [nodemp.com/download](https://nodemp.com/download). | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Could not start the launcher · cannot locate app data: …`, `… cannot create …\helper: …` | Не удалось создать папку данных хелпера в `%LOCALAPPDATA%\com.nodemp.launcher\`. | Проверьте права и свободное место. | [Логи](/ru/players/troubleshooting/#логи) |
| `Could not start the launcher · "…" is not a host:port address` | В адресе, переданном хелперу, нет порта. | Введите адрес как `host:port`. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Could not start the launcher · NODEMP_LAUNCHER points at …, which is not a file`, `… this build has no traffic helper compiled in, and no Node-Launcher.exe was found in the build tree` | Только сборки разработчика: переопределение `NODEMP_LAUNCHER` указывает в пустоту, или интерфейс собран без встроенного хелпера. | Исправьте переменную или соберите хелпер. | [Дополнительно](/ru/players/troubleshooting/#дополнительно-другая-директория) |
| `The launcher stopped · …`, `The launcher stopped` | Хелпер завершился во время подключения; текст - последняя строка его лога. | Читайте [коды выхода хелпера](#коды-выхода-хелпера) ниже. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Could not connect · Could not reach the server` | По адресу `host:port` никто не отвечает: сервер выключен, порт закрыт, брандмауэр. | Обновите список; хост проверяет `30814` по TCP и UDP. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Could not connect · DNS Lookup Failed`, `Could not connect · WSA failed to start` | Имя хоста в адресе Direct Connect не разрешается; не удалось инициализировать Winsock. | Проверьте написание или используйте IP; во втором случае перезагрузите Windows. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Could not connect · server certificate fingerprint mismatch` | Сертификат сервера, к которому вы подключались по адресу, изменился; закрепление хранится на каждый `host:port`. | Если хост подтверждает смену, удалите запись из `known_servers.json`. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Could not connect · TLS handshake failed: …`, `… TLS context creation failed: …`, `… TLS session creation failed: …`, `… TLS socket binding failed: …`, `… server presented no certificate` | На этом порту ответил не сервер NodeMP, или соединение оборвалось во время TLS-рукопожатия. | Проверьте адрес и порт; попробуйте снова. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Disconnected · …` | Сервер отказал или завершил сессию. Текст после ` · ` - причина из [таблицы сервера](#отказы-сервера-и-причины-кика) ниже или одна из собственных ошибок сессии хелпера в следующих трёх строках. | Прочитайте причину. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Disconnected · Invalid mod "…"`, `… Failed to verify "…"`, `… Server cannot find …`, `… Server refused … (protected)`, `… Server failed to read …`, `… Mod '…' is protected and therefore must be placed in the cache folder manually here: …`, `… Received corrupted download confirmation, aborting download.`, `… Download announcement does not match the mod list, aborting download.` | Синхронизация контента не удалась: объявленный сервером zip повреждён, отсутствует или защищён на сервере, либо его передача не совпала с объявлением. | Сообщите хосту. Удаление файла в **Content** заставит скачать его заново. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Disconnected · Authentication failed!`, `… Unexpected reply after the welcome`, `… Unexpected reply to the mod list request`, `… Unknown packet from server during handshake` | Сервер ответил на рукопожатие пакетом, которого хелпер не ожидал. | Обновите лаунчер; если устарел сервер, сообщите его хосту. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Disconnected · Socket Closed Code 1`, `… Socket Closed Code 2`, `… Socket Closed Code 3`, `… Socket Closed Code 5`, `… Invalid Socket`, `… Oversized frame from server`, `… Malformed frame from server`, `… Corrupt compressed frame from server` | TCP-соединение с сервером оборвалось или принесло кадр, который хелпер не смог прочитать: сервер остановился, NAT или VPN сбросили соединение, сеть нестабильна. | Подключитесь снова; проверьте соединение. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Session ended · …`, `Session ended` | Игра уже работала, когда сессия закончилась. Текст - причина сервера или последняя строка лога хелпера, если хелпер завершился с ошибкой; `Session ended` без причины означает, что BeamNG.drive закрыли. Игра показывает *The session has ended* с тем же текстом. | Выберите следующий сервер. | [Подключение не удаётся](/ru/players/troubleshooting/#подключение-не-удаётся) |
| `Connection cancelled` | Вы отменили подключение (Escape). Не ошибка. | Ничего. | [Подключение](/ru/players/join/#подключение) |
| `Could not reach NodeMP at https://api.nodemp.com`, `Could not reach NodeMP` | Refresh не смог загрузить список серверов; URL - используемая директория. | Проверьте соединение и VPN. | [Список серверов пуст](/ru/players/troubleshooting/#список-серверов-пуст) |
| `NodeMP cannot reach its server list. Check that you are online — and if you use a VPN for a test server, that it is connected.` | Экран *No connection*: директория не ответила при запуске. | *Try again* или *Continue without the list*; Direct Connect продолжает работать. | [Список серверов пуст](/ru/players/troubleshooting/#список-серверов-пуст) |
| `could not remove …: …`, `… is no longer in the cache`, `… is not a cached content file` | Не удалось удалить файл в **Content**; первое означает, что BeamNG.drive держит архив. | Закройте игру и удалите снова. | [Список серверов пуст](/ru/players/troubleshooting/#список-серверов-пуст) |
| `Enter a username and a password of at least four characters.` | Собственная проверка формы входа. | Заполните оба поля. | [Вход в аккаунт](/ru/players/troubleshooting/#вход-в-аккаунт) |
| `invalid username or password`, `please verify your e-mail first`, `two-factor code required or invalid` | Ответ директории на вход. | Сбросьте пароль на [nodemp.com/forgot](https://nodemp.com/forgot); откройте ссылку подтверждения; используйте аккаунт без двухфакторной аутентификации. | [Вход в аккаунт](/ru/players/troubleshooting/#вход-в-аккаунт) |
| `username must be 3-24 chars [A-Za-z0-9_-]`, `password must be 8-200 chars`, `already exists` | Правила директории для *Create an account*. | Выберите другое имя или более длинный пароль. | [Вход в аккаунт](/ru/players/troubleshooting/#вход-в-аккаунт) |
| `could not reach the directory: …`, `the directory returned 503 Service Unavailable`, `unexpected reply from the directory: …`, `too many requests, slow down` | Нет связи с `https://api.nodemp.com`, ошибка на её стороне или слишком много попыток подряд. | Проверьте соединение и VPN; подождите немного. | [Вход в аккаунт](/ru/players/troubleshooting/#вход-в-аккаунт) |
| `could not save the sign-in: …`, `could not reach the credential store: …`, `Could not sign in. Try again.` | Диспетчер учётных данных Windows не принял токен входа, или у сбоя не было текста. | Войдите снова; пока хранилище не работает, вход не запоминается между запусками. | [Вход в аккаунт](/ru/players/troubleshooting/#вход-в-аккаунт) |

## Коды выхода хелпера

Хелпер - это процесс на C++, который переносит трафик; он встроен в лаунчер и запускается как
`nodemp-launcher.exe --helper`. Когда он завершается во время подключения, лаунчер показывает
`The launcher stopped · …` с последней строкой его лога; когда он завершается, пока вы в игре,
окно возвращается с `Session ended · …`. Само число не показывается никогда: это код выхода
процесса, видимый только если вы запускаете хелпер из терминала сами. Полный лог -
`%LOCALAPPDATA%\com.nodemp.launcher\helper\logs\launcher.log`, перезаписывается при каждом
запуске.

| Код | Последняя строка лога | Значение | Действие |
|---|---|---|---|
| `0` | `game closed - launcher closing soon` | BeamNG.drive закрыли. Хелпер завершает сессию, ждёт 5 с и выходит. | Ничего; окно лаунчера возвращается с `Session ended`. |
| `0` | нет; на stdout `Node-Launcher 1.1.0 proto 18` или текст `USAGE:` | Запрошены `--version` или `--help`. | Ничего. |
| `0` | `game files verified: 14193 files checked in 0.9s (strict), 7203 hashed (0.912 s)` | `--integrity-check <manifest>` выполнил строгую проверку, и установка чистая. | Ничего. |
| `1` | `game files DIFFER: … (strict), …`, затем `counts: missing N, size N, hash N, unlisted N, archive N, userfolder N, folders skipped N` | `--integrity-check <manifest>` нашёл проблемы; каждая напечатана над итогом как причина (`overlay`, `unlisted`, `hash`, `crc`, …) и путь. | Читайте [Строгие серверы](/ru/players/troubleshooting/#строгие-серверы). |
| `2` | `cannot read the manifest file …`, `not a reference manifest: …`, `could not check: manifest format outdated (format 1)`, `could not check: the game's user folder … does not exist` | `--integrity-check <manifest>` не смог выполнить проверку: нет такого файла, это не манифест, он устаревший, или пользовательская папка игры отсутствует. | Проверьте путь; попросите у хоста текущий эталон; исправьте пользовательскую папку. |
| `1` | `Cannot get Local Appdata directory` | Windows не вернула папку Local AppData, поэтому пользовательскую папку BeamNG определить нельзя. | Проверьте учётную запись Windows; `%LOCALAPPDATA%` должна быть задана. |
| `1` | `Config failed to parse make sure it's valid JSON!`, `Failed to open Launcher.cfg!`, `Failed to write config on disk!` | `Launcher.cfg` в папке хелпера повреждён, заблокирован, или папка доступна только для чтения. | Удалите `Launcher.cfg` (он создаётся заново) или исправьте права на `%LOCALAPPDATA%\com.nodemp.launcher\helper\`. |
| `1` | `Failed to create caching directory: …. This is a fatal error. Please make sure to configure a directory which you have permission to create, read and write from/to.` | Не удалось создать папку `cache\`. | Исправьте права или `CacheDirectory` в `Launcher.cfg`. |
| `1` | `failed to create HKEY_CURRENT_USER\Software\Valve\Steam\Apps\284160`, `failed to create the value "Name" under HKEY_CURRENT_USER\Software\Valve\Steam\Apps\284160` | Только Wine или Proton: патч реестра, который хелпер там применяет, не удался. | Дайте хелперу право записи в реестр. |
| `1` | `Exception in main(): …`, затем `closing in 5 seconds` | Необработанная ошибка при запуске, до старта игры. | Прочитайте строки выше неё в `launcher.log`. |
| `2` | `Failed to find the game please launch it. Report this if the issue persists code 8` | Установка BeamNG.drive не найдена ни в **Settings → Game**, ни в `BeamNG.Drive.ini`, ни в ключах реестра BeamNG и Steam, ни в библиотеках Steam. `8` - код этого поиска и единственное число, которое печатает хелпер. Хелпер выходит через 10 с. | Запустите игру один раз через Steam или укажите папку в **Settings → Game**. |
| `2` | `Failed to Launch the game! launcher closing soon.` | `Bin64\BeamNG.drive.x64.exe` не запустился, и запрос к Steam (`steam://run/284160`) игру тоже не поднял. Хелпер выходит через 5 с. | Проверьте файлы игры в Steam; проверьте **Settings → Game**. |

Каждая строка с `1` выше, кроме вердикта `--integrity-check`, - фатальная строка лога: хелпер ждёт
несколько секунд, чтобы её можно было прочитать (5 с; 3 с для папки кеша), и выходит.

## Отказы сервера и причины кика

Сервер отказывает в подключении или завершает сессию кадром `Kick`, который несёт одну строку
текста. Во время подключения лаунчер показывает её как `Disconnected · …`; когда вы уже в игре,
она приходит как `Session ended · …`, а игра показывает диалог *The session has ended* с той же
строкой. Сервер пишет тот же текст в лог как `<name> kicked — <reason>`. Плагины могут прислать
любой свой текст; строки ниже - тексты, встроенные в `Node-Server` 1.1.0, и значения по
умолчанию API плагинов.

| Причина | Когда | Что делать |
|---|---|---|
| `Protocol version mismatch: launcher speaks v17, server speaks v18 - update the outdated side` | Лаунчер и сервер говорят на разных версиях сетевого протокола; оба числа - реальные значения. Лаунчер 1.1.0 и сервер 1.1.0 говорят на v18. | Если меньше число лаунчера, установите текущий лаунчер с [nodemp.com/download](https://nodemp.com/download); если число сервера - сообщите его хосту. |
| `Server full!` | Достигнут `[General] MaxPlayers`. | Фильтр *Free slots* или подождите. |
| `The server is still starting, please try joining again later.` | Сервер ещё загружал модули и ресурсы; рукопожатие какое-то время удерживалось, и ожидание истекло. | Попробуйте через минуту. |
| `Server shutdown` | Сервер останавливается; при выключении отправляется и всем, кто в сессии. | Дождитесь, когда хост его поднимет. |
| `You are banned from this server` | Ваш IP или аккаунт есть в `bans.json` сервера без сохранённой причины. Бан с причиной показывает вместо этого причину. | Обратитесь к хосту. |
| `This server requires a NodeMP account: sign in to the launcher and join again` | `[Directory] TestDrive = false`: вы подключались как Test Drive или без билета на подключение. | **Settings → Account → Sign in** или фильтр *No account needed*. |
| `Your join ticket was not accepted (join ticket invalid or expired). Join again from the launcher to get a new one` | Директория отклонила билет; в скобках - её собственное сообщение. Билет одноразовый, живёт меньше минуты и привязан к вашему IP. | Подключитесь снова из лаунчера. |
| `The server could not verify your account with the directory (…). Try again in a moment` | Сервер не смог спросить директорию; в скобках названа причина, например `no directory session (the directory is unreachable or this server has just started)`. Сервер с `RedeemFailOpen = true` и разрешённым Test Drive вместо этого пускает вас непроверенным. | Повторите через минуту. |
| `Connection refused` | Плагин отклонил `onPlayerConnectRequest`, не назвав причину; с причиной показывается она. | Обратитесь к хосту. |
| `Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | `[General] VerifyGame` равен `size`, `scripts` или `full`, а ваша установка отличается от манифеста игры. Число - реальное. | Проверьте файлы игры в Steam. |
| `Your BeamNG install changed while you were playing, and this server requires it to match the game's own file list (1 file differs). …` | Та же проверка, повторённая во время сессии, нашла изменение. | Отмените то, что установили; проверьте файлы игры. |
| `Game files do not match this server's reference (3 problems). userfolder:vehicles/pickup/pickup.jbeam (overlay), …` | `[General] VerifyGame` равен `strict`, а ваша установка или ваша пользовательская папка BeamNG отличается от эталонного манифеста сервера. Число - реальное; текст после него несёт то, что лаунчер исключил как своё (`excluded=…;`), сколько папок он не смог прочитать (`skipped=N;`) и до трёх примеров вида `path (reason)`. | Запустите диагностику из раздела [Строгие серверы](/ru/players/troubleshooting/#строгие-серверы) и удалите то, что она называет. |
| `Game files changed while you were playing and no longer match this server's reference (1 problem). …` | Строгая проверка, повторённая во время сессии (изменился файл или подошло расписание лаунчера), нашла несовпадение. | Отмените изменение; запустите диагностику. |
| `Your launcher checked your BeamNG install against a different reference manifest than this server uses (checked against reference manifest … but this server uses …). Reconnect so it fetches the current one.` | Отчёт лаунчера называет не тот манифест, который прислал сервер, - кэшированный эталон, который хост с тех пор заменил. В скобках - оба id. | Подключитесь снова; лаунчер заберёт текущий манифест. |
| `This server requires the strict check of your BeamNG install, but your launcher ran only 'size'. Update your launcher and try again.` | Строгий сервер получил на входе отчёт более слабого уровня. Текущий лаунчер выполняет тот уровень, который у него просят, так что это указывает на изменённый или сломанный лаунчер. | Переустановите лаунчер с [nodemp.com/download](https://nodemp.com/download). |
| `` This server requires a strict check of your BeamNG install but has no integrity manifest to check it against. Ask the host to run `Node-Server --gen-integrity <gamedir>` and put the file in the server's integrity folder. `` | `VerifyGame = "strict"` без единого `.manifest` в `[General] IntegrityDir`. | Сообщите хосту; см. [Строгую проверку](/ru/hosting/strict-verification/). |
| `This server has integrity manifests for 2 game versions (0.39.4.0, 0.39.3.0) and cannot tell which one you run. Ask the host to keep exactly one manifest in the server's integrity folder.` | `VerifyGame = "strict"` с более чем одним `.manifest` в папке; рукопожатие не несёт версию игры игрока. | Сообщите хосту. |
| `Unknown integrity manifest requested` | Лаунчер запросил манифест по id, который сервер не раздаёт, - или по строке, которая вообще не id. Текущий лаунчер просит только тот id, который сервер сам назвал в своём `VerifyRequest`, так что это указывает на изменённый или сломанный лаунчер. | Переустановите лаунчер с [nodemp.com/download](https://nodemp.com/download). |
| `Too many integrity manifest requests` | Больше четырёх передач манифеста за одну сессию. Текущий лаунчер забирает манифест один раз на id и хранит его, так что это указывает на изменённый или сломанный лаунчер. | Переустановите лаунчер с [nodemp.com/download](https://nodemp.com/download). |
| `This server requires a check of your BeamNG install, which could not be completed: …` | Хелпер не смог выполнить проверку, которую запросил сервер; текст после двоеточия говорит почему. На строгом сервере: `the game's user folder … does not exist`, `could not obtain the server's reference manifest: …` (например `the server sent nothing for 30 s during the manifest transfer`), `manifest format outdated (format 1)`. | Прочитайте подробность, затем попробуйте снова. |
| `Kicked` | `player:kick()` из ресурса без указания причины. Нативный модуль, вызвавший `kick_player` без причины, присылает `Kicked by module`. | Обратитесь к хосту. |
| `Banned` | `player:ban()` или `node.bans.add()` без указания причины; бан сохраняется с этим текстом. | Обратитесь к хосту. |
| `Packet rate limit exceeded` | Ваш клиент слал TCP-пакеты быстрее, чем позволяет лимит сервера. | Подключитесь снова; сообщите, если повторяется. |
| `Disconnected after failing to receive packets` | Сервер не смог доставить вам пакет события или модульного канала. | Подключитесь снова. |
| `Expected HELLO`, `Malformed HELLO`, `Expected IDENTITY after HELLO`, `Unknown packet type during handshake`, `Frame length cap exceeded`, `Per-type body cap exceeded`, `Malformed frame`, `Packet decode failed`, `Sent invalid compressed packet (this is likely a bug on your end)`, `Malformed game verification report` | Лаунчер прислал то, что сервер не принимает. Так ведёт себя только изменённый или сломанный лаунчер. | Переустановите лаунчер с [nodemp.com/download](https://nodemp.com/download). |

Хостам: причины, которые может прислать плагин, описаны в [Рецептах](/ru/plugins/recipes/);
уровни `VerifyGame` - в [Конфигурации](/ru/hosting/configuration/).
