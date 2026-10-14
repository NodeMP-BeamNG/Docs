---
title: Сообщения и коды выхода
description: Все сообщения, которыми может закончиться вход, — уведомления лаунчера, отказы и кики сервера, коды выхода помощника — и что с каждым делать.
---

Пронумерованных ошибок в NodeMP нет. Всё, что вас останавливает, — это фраза из одного из трёх
мест: уведомление лаунчера, причина отказа или кика от сервера или последняя строка лога помощника.
Здесь они собраны все (`…` — значение, которое меняется). Если нужен разбор неудачного входа по
шагам, начните со страницы [Не пускает на сервер](/ru/support/joining/).

## Уведомления лаунчера

У уведомления есть **заголовок** — какой шаг не удался, — а под ним точная причина, по-английски.
Ниже они записаны как **заголовок** · `причина`. Старые уведомления хранятся под значком
колокольчика на левой панели. Заголовки приведены по-русски, как их показывает лаунчер на русском
языке.

### Клиентский мод

| Сообщение | Что произошло | Что делать |
|---|---|---|
| **Не удалось войти** · `client mod is not installed and the directory is unreachable` | Первый вход без `NodeMP.zip`, и сервис NodeMP не ответил. | Подключитесь к интернету и зайдите снова. |
| **Не удалось войти** · `client mod is not installed and no release has been published yet` | Первый вход, а клиентский мод ещё не опубликован. | Дождитесь релиза. |
| **Не удалось войти** · `could not start the download: …`, `the download server returned …`, `the download stopped: …`, `the download was N bytes, the release says M`, `the download is larger than the release says` | Загрузка не началась или оборвалась. | Проверьте соединение, VPN или прокси и зайдите снова. |
| **Не удалось войти** · `the downloaded client mod does not match the published checksum` | Файл пришёл повреждённым. | Зайдите снова. |
| **Не удалось войти** · `LOCALAPPDATA is not set, so BeamNG's user folder cannot be found` | Не хватает стандартной настройки Windows. | Выйдите из учётной записи Windows и войдите снова. |
| **Клиентский мод не обновился** · `Joining with the installed copy.` | Проверка не удалась, но у вас есть старый `NodeMP.zip`. Это предупреждение, а не ошибка. | Если сервер не принимает старый мод: закройте игру и нажмите **Настройки → Лаунчер → Клиентский мод → Проверить**. |
| **Не удалось проверить клиентский мод** · `could not replace …\NodeMP.zip (is BeamNG.drive running?): …` | Запущенная игра держит файл. | Закройте BeamNG.drive и нажмите **Проверить**. |

### Запуск сессии

| Сообщение | Что произошло | Что делать |
|---|---|---|
| **Не удалось запустить сессию** · `could not start …: …` | Windows или антивирус не дали запустить помощник лаунчера. | Разрешите NodeMP в антивирусе или переустановите с [nodemp.com/download](https://nodemp.com/download). |
| **Сетевой помощник лаунчера остановился** · *последняя строка его лога* | Помощник завершился во время входа. | Найдите строку в разделе [Коды выхода помощника](#коды-выхода-помощника). |
| **Вы уже на сервере: выйдите из игры, чтобы подключиться к другому** | Вход начат, пока идёт сессия. | Сначала закройте BeamNG.drive. |
| **Подключение отменено** | Вы нажали **Отмена**. | Ничего. |

### Подключение

| Сообщение | Что произошло | Что делать |
|---|---|---|
| **Не удалось подключиться** · `Could not reach the server` | По этому адресу никто не отвечает: сервер выключен, порт закрыт или мешает файрвол. | Обновите список. Если это ваш сервер, проверьте, что его порт открыт для TCP и UDP. |
| **Не удалось подключиться** · `DNS Lookup Failed` | Имя, введённое в прямом подключении, не находится. | Проверьте написание или используйте IP-адрес. |
| **Не удалось подключиться** · `server certificate fingerprint mismatch` | У сервера, на который вы заходили по адресу, другой сертификат, чем в прошлый раз. | Спросите хоста. Если он переустанавливал сервер, удалите строку этого сервера из `known_servers.json` в папке кэша лаунчера. |
| **Не удалось подключиться** · `TLS handshake failed: …`, `server presented no certificate` | Ответил не сервер NodeMP, или соединение оборвалось во время защищённого рукопожатия. | Проверьте адрес и порт и попробуйте ещё раз. С VPN — см. [VPN и плохая связь](/ru/players/vpn/#сообщения-которые-можно-увидеть). |

### Загрузка модов сервера

Эти причины приходят как **Сервер не пустил в игру** или **Сессия завершена** — от самого
помощника:

| Причина | Что произошло | Что делать |
|---|---|---|
| `Server cannot find …`, `Server refused … (protected)`, `Server failed to read …` | Сервер указывает мод, который не может или не хочет отдать. | Сообщите хосту. |
| `Mod '…' is protected: the server does not send it, so it has to be put in the cache folder by hand: …` | Хост пометил этот мод как тот, который игроки берут сами. | Возьмите zip у хоста (на его сайте или в Discord) и положите в папку из сообщения. |
| `Failed to verify "…"` | Скачанный мод дважды не совпал с тем, что объявил сервер. | Сообщите хосту. Удаление файла в **Контенте** заставит скачать его заново. |
| `Received corrupted download confirmation, aborting download.`, `Download announcement does not match the mod list, aborting download.` | Ответ сервера во время загрузки не сошёлся. | Зайдите снова; если повторяется — сообщите хосту. |

### Список серверов, кэш и обновления

| Сообщение | Что произошло | Что делать |
|---|---|---|
| **Не удалось связаться с NodeMP** | Список серверов не загрузился; строка под заголовком — адрес, к которому обращался лаунчер. | Проверьте соединение и VPN. Прямое подключение по-прежнему работает. |
| **Не удалось удалить файл** · `could not remove …: …`, `… is no longer in the cache`, `… is not a cached content file` | Не удалось удалить файл в **Контенте**; первое обычно значит, что его держит BeamNG.drive. | Закройте игру и удалите ещё раз. |
| **Не удалось установить обновление лаунчера** · `the downloaded installer does not match the published checksum`, `the download stopped (…); it resumes on the next try`, `the download stopped at N of M bytes; it resumes on the next try` | Обновление лаунчера скачалось не полностью. | Попробуйте ещё раз; загрузка продолжится с того же места. |
| `Could not find a BeamNG.drive install. Browse to it, or launch the game once so Steam writes its path.` | Под **Настройки → Игра**: игра не найдена. | Нажмите **Обзор** и выберите папку игры или запустите игру один раз через Steam и нажмите **Найти**. |
| `No Bin64\BeamNG.drive.x64.exe in this folder` | Под **Настройки → Игра**: это не основная папка игры. | Выберите папку, в которой лежит `Bin64\`. |

## Отказы и кики сервера

Сервер отказывает словами. На входе лаунчер показывает это как **Сервер не пустил в игру**; во
время сессии игра сообщает, что сессия завершена, а лаунчер возвращается с **Сессия завершена**. В
логе сервера тот же текст пишется как `<имя> kicked — <причина>`.

Проблемы с версиями и файлами игры лаунчер переписывает в совет с кнопкой; в таблице это помечено
как *показывается как*, а слова самого сервера остаются в **Подробностях**. Плагины могут кикать со
своим текстом — тогда вы видите его как есть.

| Причина | Когда | Что делать |
|---|---|---|
| `Protocol version mismatch: launcher speaks v22, server speaks v21 - update the outdated side` | Лаунчер и сервер говорят на разных версиях протокола (числа настоящие; сейчас все говорят на v23). Если отстал лаунчер, показывается как `This server needs a newer launcher — update now` с кнопкой **Обновить сейчас**; если отстал сервер — как `This server runs an older NodeMP server (protocol v21; this launcher speaks v22)`. | **Обновить сейчас** обновит лаунчер и зайдёт снова. Если отстал сервер, сообщите хосту. |
| `Your NodeMP mod is out of date for this server (it speaks wire protocol …, the server …). Reinstall it from the launcher.` | Ваш клиентский мод говорит на другой версии протокола, чем сервер. | Закройте игру, **Настройки → Лаунчер → Клиентский мод → Проверить**, зайдите снова. |
| `Server full!` | На сервере столько игроков, сколько он пускает. | Включите фильтр *Есть места* или подождите. |
| `The server is starting up; join again in a moment.` | Сервер ещё загружал свои плагины. | Попробуйте через минуту. |
| `Server shutdown` | Сервер останавливается; при выключении это получают все, кто на нём. | Подождите, пока хост вернёт сервер. |
| `You are banned from this server` | Ваш адрес или аккаунт в списке банов сервера, без причины. Бан с причиной показывает её. | Спросите хоста. |
| `This server requires a NodeMP account: sign in to the launcher and join again` | Сервер не пускает в режиме Test Drive, а вы зашли без аккаунта. | **Настройки → Аккаунт → Войти** или фильтр *Без аккаунта*. |
| `Your join ticket was not accepted (join ticket invalid or expired). Join again from the launcher to get a new one` | NodeMP не принял одноразовый билет на подключение; в скобках — почему. Билет одноразовый и живёт недолго. | Зайдите снова. |
| `The server could not verify your account with the directory (…). Try again in a moment` | Сервер не смог связаться с NodeMP, чтобы проверить аккаунт. | Попробуйте чуть позже. |
| `Resume rejected` | Связь оборвалась, и сервер не принял переподключение: старой сессии уже нет. | Зайдите снова. |
| `Resume rejected: too many failed attempts, try again later` | Слишком много неудачных переподключений с вашего адреса за короткое время. | Подождите минуту и зайдите снова. |
| `Connection refused` | Плагин не пустил вас и не назвал причину; с причиной вы увидите её. | Спросите хоста. |
| `Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | Сервер сверяет файлы игры со списком самой игры, и часть не совпала. Число настоящее. | Проверьте целостность файлов игры в Steam. |
| `Your BeamNG install changed while you were playing, and this server requires it to match the game's own file list (1 file differs). …` | Та же проверка, повторённая во время сессии, нашла изменение. | Уберите то, что установили; проверьте файлы игры. |
| `Game files do not match this server's reference (3 problems). userfolder:vehicles/pickup/pickup.jbeam (overlay), …` | Строгий сервер: ваша установка или пользовательская папка отличается от чистой копии, которую подготовил хост. Дальше — до трёх примеров. Показывается как `Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam`, с первой проблемой словами и командой, которая выведет все. | См. [Строгие серверы](/ru/support/strict-servers/). |
| `Game files changed while you were playing and no longer match this server's reference (1 problem). …` | Строгая проверка, повторённая во время сессии, нашла изменение. Показывается как `Your game files changed while you were playing and no longer match this server's reference (1 problem)`. | Верните как было и зайдите снова. |
| `Your launcher checked your BeamNG install against a different reference manifest than this server uses (checked against reference manifest … but this server uses …). Reconnect so it fetches the current one.` | С вашего прошлого визита хост заменил описание чистой установки. Показывается как `This server's reference manifest changed — join again`. | Зайдите снова. |
| `This server requires the strict check of your BeamNG install, but your launcher ran only 'size'. Update your launcher and try again.` | Строгий сервер получил результат более лёгкой проверки. Показывается как `This server needs a newer launcher — update now`. | **Обновить сейчас** или переустановите с [nodemp.com/download](https://nodemp.com/download). |
| `` This server requires a strict check of your BeamNG install but has no integrity manifest to check it against. Ask the host to run `Node-Server --gen-integrity <gamedir>` and put the file in the server's integrity folder. `` | Хост включил строгую проверку без нужного для неё файла. | Сообщите хосту ([Строгая проверка](/ru/hosting/strict-verification/)). |
| `This server has integrity manifests for 2 game versions (0.39.4.0, 0.39.3.0) and cannot tell which one you run. Ask the host to keep exactly one manifest in the server's integrity folder.` | У хоста лежат файлы для нескольких версий игры. | Сообщите хосту. |
| `Unknown integrity manifest requested` | Лаунчер попросил файл, которого у сервера нет, — обычно только что заменённый хостом. Показывается как `The server would not send its reference manifest`. | Зайдите чуть позже; если повторяется — сообщите хосту. |
| `Too many integrity manifest requests` | Лаунчер слишком часто просил этот файл за одну сессию. Показывается как `The server stopped sending its reference manifest (asked too often)`. | Зайдите чуть позже; если повторяется — переустановите лаунчер. |
| `This server requires a check of your BeamNG install, which could not be completed: …` | Проверка не смогла выполниться; текст после двоеточия объясняет почему. Показывается как `BeamNG's user folder was not found`, `Could not download the server's reference manifest`, `The server's reference manifest is out of date` или `Your game files could not be checked`. | Сделайте то, что советует лаунчер, и зайдите снова. |
| `Kicked`, `Kicked by the server`, `Kicked by module` | Плагин, консоль сервера или нативный модуль убрали вас без причины. | Спросите хоста. |
| `Banned` | Плагин забанил вас без причины. | Спросите хоста. |
| `Packet rate limit exceeded` | Ваша игра отправляла пакеты быстрее, чем разрешает сервер. | Зайдите снова; если повторяется — сообщите. |
| `Disconnected after failing to receive packets` | Сервер не смог доставить вам данные. | Зайдите снова. |
| `TCP send of MODS_INFO failed` | Сервер не смог отправить список модов: соединения уже не было. | Зайдите снова. |
| `Expected HELLO`, `Malformed HELLO`, `Expected IDENTITY after HELLO`, `Unknown packet type during handshake`, `Frame length cap exceeded`, `Per-type body cap exceeded`, `Malformed frame`, `Packet decode failed`, `Sent a compressed packet that does not decompress`, `Malformed game verification report` | Лаунчер прислал то, что сервер не принимает. Так ведёт себя только изменённый или сломанный лаунчер. | Переустановите лаунчер с [nodemp.com/download](https://nodemp.com/download). |

**Сессия завершена** совсем без причины значит, что BeamNG.drive закрыли.

## Коды выхода помощника

Помощник — фоновая часть лаунчера, которая и выполняет вход. Если он завершается во время входа,
лаунчер показывает **Сетевой помощник лаунчера остановился** с последней строкой его лога. Сам код
виден, только если запустить помощник вручную из командной строки. Полный лог —
`%LOCALAPPDATA%\com.nodemp.launcher\helper\logs\launcher.log`.

| Код | Последняя строка лога | Что значит | Что делать |
|---|---|---|---|
| `0` | `game closed - launcher closing soon` | BeamNG.drive закрыли, сессия закончилась. | Ничего. |
| `1` | `Launcher.cfg is there but cannot be read; check its permissions, or delete it to start from the defaults`, `Launcher.cfg is not valid JSON; fix it, or delete it to start from the defaults` | Файл настроек помощника не читается или испорчен. | Удалите `Launcher.cfg` — помощник создаст новый. |
| `1` | `Cannot create the mod cache …: …. Point CacheDirectory in Launcher.cfg at a folder you can write to.` | Не получается создать папку для скачанных модов. | Исправьте права на папку или задайте `CacheDirectory` в `Launcher.cfg`. |
| `2` | `BeamNG.drive was not found. Choose its folder (the launcher's Settings > Game, or --game-dir), or start the game once so it records where it is.` | Игра не найдена. Помощник закрывается через 10 секунд. | Укажите папку в **Настройки → Игра** или запустите игру один раз через Steam. |
| `2` | `The game could not be started (through Steam, or by its executable); the launcher closes in 5 s.` | Ни Steam, ни исполняемый файл игры не запустили BeamNG.drive. | Проверьте файлы игры в Steam и путь в **Настройки → Игра**. |
| `5` | `Another Node-Launcher is already running on port 4444 - closing` | Второй помощник запущен, пока работает первый. | Закройте другой (или BeamNG.drive вместе с ним) и попробуйте снова. |
| `6` | `port 4444 is in use by another program …` | Другая программа заняла локальный порт, по которому игра говорит с помощником. | Закройте её; в сообщении есть команда, которая покажет, какая это программа. |

Проверку файлов игры помощник умеет запускать и отдельно (`--integrity-check`, см.
[Строгие серверы](/ru/support/strict-servers/#увидеть-все-проблемы)). Она завершается с кодом `0`,
если всё чисто (`game files verified: …`), `1`, если что-то отличается (`game files DIFFER: …`), и
`2`, если проверка не смогла выполниться (`cannot read the manifest file …`,
`not a reference manifest: …`, `could not check: …`).
