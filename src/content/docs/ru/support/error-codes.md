---
title: Коды ошибок
description: "Справочник сообщений об ошибках: уведомления лаунчера, коды выхода фонового помощника и ответы сервера при отказе во входе."
---

В NodeMP нет числовых кодов ошибок. Вместо них вы видите понятное текстовое сообщение из одного из трёх мест: всплывающее уведомление лаунчера, последняя строка лога фонового помощника или ответ сервера при отклонении подключения. Здесь собраны все эти тексты в точности так, как их выводит программа (`…` обозначает меняющуюся часть). Пошаговые инструкции по решению проблем смотрите в руководстве [Не получается зайти на сервер](/ru/support/joining/).

Единственное число, которое может встретиться игроку — `code 8` в строке `Failed to find the game please launch it …`. Это внутренний статус поиска игры, а не код ошибки.

## Сообщения лаунчера

В **заголовке** уведомления лаунчер кратко сообщает, что именно пошло не так, а строкой ниже (в таблице — после ` · `) выводит конкретную техническую причину на английском языке.

### Клиентский мод

| Сообщение | Что значит | Что делать |
|---|---|---|
| **Не удалось войти** · `client mod is not installed and the directory is unreachable` | Первый вход без `NodeMP.zip`, и `api.nodemp.com` не ответил. | Проверьте интернет и войдите снова. |
| **Не удалось войти** · `client mod is not installed and no release has been published yet` | Первый вход; релиза клиентского мода ещё нет. | Дождитесь релиза. |
| **Не удалось войти** · `could not start the download: …`, `the download server returned …`, `the download stopped: …`, `the download was N bytes, the release says M`, `the download is larger than the release says` | Сервер с файлом недоступен, или загрузка оборвалась. | Проверьте соединение, VPN, прокси; войдите снова. |
| **Не удалось войти** · `the downloaded client mod does not match the published checksum` | Файл скачался повреждённым. | Войдите снова. |
| **Не удалось войти** · `LOCALAPPDATA is not set, so BeamNG's user folder cannot be found` | Нет переменной окружения Windows. | Выйдите из учётной записи Windows и войдите снова. |
| **Клиентский мод не обновился** · `Входим с установленной версией.` | Проверка не удалась, но старый `NodeMP.zip` есть. Предупреждение, а не ошибка. | Если сервер не принимает старый мод: закройте игру, **Настройки → Лаунчер → Клиентский мод → Проверить**. |
| **Не удалось проверить клиентский мод** · `could not replace …\NodeMP.zip (is BeamNG.drive running?): …` | Игра держит архив открытым. | Закройте BeamNG.drive и нажмите *Проверить*. |

### Запуск сессии

| Сообщение | Что значит | Что делать |
|---|---|---|
| **Не удалось запустить сессию** · `could not start …: …` | Windows не дала запустить помощника (антивирус, политика). | Добавьте `%LOCALAPPDATA%\NodeMP` в исключения антивируса или переустановите с [nodemp.com/download](https://nodemp.com/download). |
| **Не удалось запустить сессию** · `NODEMP_LAUNCHER points at …, which is not a file` | Только для сборок разработчика: переменная `NODEMP_LAUNCHER` указывает в никуда. | Исправьте переменную ([Логи → Для продвинутых](/ru/support/logs/#для-продвинутых-другой-каталог-серверов)). |
| **Сетевой помощник лаунчера остановился** · *последняя строка его лога* | Помощник завершился во время входа. | Найдите строку в [кодах выхода помощника](#коды-выхода-помощника). |
| **Вы уже на сервере: выйдите из игры, чтобы подключиться к другому** | Вход запущен, пока идёт сессия. | Сначала закройте BeamNG.drive. |
| **Подключение отменено** | Вы нажали *Отмена*. Не ошибка. | Ничего. |

### Подключение

| Сообщение | Что значит | Что делать |
|---|---|---|
| **Не удалось подключиться** · `Could not reach the server` | По адресу `host:port` никто не отвечает: сервер выключен, порт закрыт, мешает файрвол. | Обновите список; хост проверяет `30814` TCP и UDP. |
| **Не удалось подключиться** · `DNS Lookup Failed`, `WSA failed to start` | Имя в адресе прямого подключения не находится; не запустилась сеть Windows. | Проверьте написание или введите IP; во втором случае перезагрузите Windows. |
| **Не удалось подключиться** · `server certificate fingerprint mismatch` | У сервера, на который вы заходили по адресу, другой сертификат, чем в прошлый раз. | Если хост подтвердил замену — удалите его строку из `known_servers.json`. |
| **Не удалось подключиться** · `TLS handshake failed: …`, `TLS context creation failed: …`, `TLS session creation failed: …`, `TLS socket binding failed: …`, `server presented no certificate` | Ответил не сервер NodeMP, или соединение оборвалось во время рукопожатия. | Проверьте адрес и порт; попробуйте снова. |

### Сервер не пустил или сессия завершилась

**Сервер не пустил в игру** (при входе) и **Сессия завершена** (в игре) несут причину из
[таблицы ниже](#отказы-сервера-и-причины-кика) — или одну из собственных ошибок помощника:

| Причина | Что значит | Что делать |
|---|---|---|
| `Invalid mod "…"`, `Failed to verify "…"`, `Server cannot find …`, `Server refused … (protected)`, `Server failed to read …`, `Mod '…' is protected and therefore must be placed in the cache folder manually here: …`, `Received corrupted download confirmation, aborting download.`, `Download announcement does not match the mod list, aborting download.` | Синхронизация контента не удалась: мод сервера повреждён, отсутствует или защищён, или передача не совпала с объявленной. | Сообщите хосту. Удаление файла в разделе **Контент** заставит скачать его заново. |
| `Authentication failed!`, `Unexpected reply after the welcome`, `Unexpected reply to the mod list request`, `Unknown packet from server during handshake` | Сервер ответил на рукопожатие не тем, чего ждал помощник. | Обновите лаунчер; если устарел сервер — сообщите хосту. |
| `Socket Closed Code 1`, `Socket Closed Code 2`, `Socket Closed Code 3`, `Socket Closed Code 5`, `Invalid Socket`, `Oversized frame from server`, `Malformed frame from server`, `Corrupt compressed frame from server` | Соединение оборвалось или пришёл кадр, который помощник не смог прочитать: сервер остановлен, NAT или VPN сбросили соединение, нестабильная сеть. | Войдите снова; проверьте соединение. |

**Сессия завершена** без причины — значит, BeamNG.drive закрыли.

### Список серверов, контент и обновления

| Сообщение | Что значит | Что делать |
|---|---|---|
| **Не удалось связаться с NodeMP** | Список серверов не загрузился; под заголовком — адрес, к которому обращался лаунчер. | Проверьте соединение и VPN ([Список серверов пуст](/ru/support/launcher/#список-серверов-пуст)). |
| **Не удалось удалить файл** · `could not remove …: …`, `… is no longer in the cache`, `… is not a cached content file` | Удаление файла в разделе **Контент** не удалось; первое — архив занят игрой. | Закройте игру и удалите снова. |
| **Вход через браузер не удался:** `could not reach the directory: …`, `the directory returned …`, `unexpected reply from the directory: …`, `could not save the sign-in: …`, `could not reach the credential store: …` | Вход не удался ([Проблемы с лаунчером → Вход](/ru/support/launcher/#вход)). | Проверьте соединение; войдите снова. |
| **Не удалось установить обновление лаунчера** · `the downloaded installer does not match the published checksum`, `the download stopped (…); it resumes on the next try`, `the download stopped at N of M bytes; it resumes on the next try` | Обновление лаунчера не скачалось ([Обновления лаунчера](/ru/support/launcher/#обновления-лаунчера)). | Попробуйте снова. |
| `Could not find a BeamNG.drive install. Browse to it, or launch the game once so Steam writes its path.` | Под **Настройки → Игра**: лаунчер не нашёл игру. | **Обзор** — выберите папку игры, или запустите игру один раз через Steam и нажмите **Найти**. |
| `No Bin64\BeamNG.drive.x64.exe in this folder` | Под **Настройки → Игра**: это не корневая папка игры. | Выберите папку, в которой лежит `Bin64\`. |

## Коды выхода помощника

Фоновый помощник — сетевая часть лаунчера, та же самая программа, запущенная без графического интерфейса. Если он завершает работу во время входа, лаунчер выводит сообщение **Сетевой помощник лаунчера остановился** вместе с последней строкой лога, а в игре — **Сессия завершена**. Само число (код выхода процесса) видно только при запуске помощника из командной строки. Полный журнал сессии пишется в `%LOCALAPPDATA%\com.nodemp.launcher\helper\logs\launcher.log` и перезаписывается при каждом новом запуске.

| Код | Последняя строка лога | Что значит | Что делать |
|---|---|---|---|
| `0` | `game closed - launcher closing soon` | BeamNG.drive закрыли. Помощник завершает сессию, ждёт 5 с и выходит. | Ничего. |
| `0` | `game files verified: 14193 files checked in 0.9s (strict), 7203 hashed (0.912 s)` | `--integrity-check <manifest>` провёл строгую проверку, установка чистая. | Ничего. |
| `1` | `game files DIFFER: … (strict), …`, затем `counts: missing N, size N, hash N, unlisted N, archive N, userfolder N, folders skipped N` | `--integrity-check <manifest>` нашёл проблемы; каждая выведена над итогом. | См. [Серверы со строгой проверкой](/ru/support/strict-servers/#как-читать-результат). |
| `2` | `cannot read the manifest file …`, `not a reference manifest: …`, `could not check: manifest format outdated (format 1)`, `could not check: the game's user folder … does not exist` | `--integrity-check <manifest>` не смог провести проверку: нет файла, это не эталон, эталон устарел или нет папки пользователя. | Проверьте путь; попросите у хоста свежий эталон; запустите игру один раз. |
| `1` | `Config failed to parse make sure it's valid JSON!`, `Failed to open Launcher.cfg!`, `Failed to write config on disk!` | `Launcher.cfg` повреждён или занят, или папка только для чтения. | Удалите `Launcher.cfg` (он создастся заново) или исправьте права на `%LOCALAPPDATA%\com.nodemp.launcher\helper\`. |
| `1` | `Failed to create caching directory: …. This is a fatal error. Please make sure to configure a directory which you have permission to create, read and write from/to.` | Не удалось создать папку `cache\`. | Исправьте права или `CacheDirectory` в `Launcher.cfg`. |
| `1` | `failed to create HKEY_CURRENT_USER\Software\Valve\Steam\Apps\284160`, `failed to create the value "Name" under HKEY_CURRENT_USER\Software\Valve\Steam\Apps\284160` | Только Wine или Proton: не удалась правка реестра. | Дайте помощнику право записи в реестр. |
| `1` | `Exception in main(): …`, затем `closing in 5 seconds` | Неожиданная ошибка при запуске, до старта игры. | Смотрите строки выше в `launcher.log`. |
| `2` | `Failed to find the game please launch it. Report this if the issue persists code 8` | BeamNG.drive не найдена ни в **Настройки → Игра**, ни в `BeamNG.Drive.ini`, ни в реестре, ни в библиотеках Steam. Помощник выходит через 10 с. | Запустите игру один раз через Steam или укажите папку в **Настройки → Игра**. |
| `2` | `Failed to Launch the game! launcher closing soon.` | Игра не запустилась ни через Steam (`steam.exe -applaunch 284160`), ни через `Bin64\BeamNG.drive.x64.exe`. Помощник выходит через 5 с. | Проверьте целостность файлов в Steam и **Настройки → Игра**. |

## Отказы сервера и причины кика

Сервер отклоняет вход или завершает сессию понятной текстовой причиной. При подключении лаунчер показывает её в уведомлении **Сервер не пустил в игру**, а при разрыве во время заезда игра выводит экран *The session has ended*, а лаунчер — **Сессия завершена**. В логе сервера это записывается как `<имя> kicked — <причина>`.

При несовпадении версий или строгой проверке лаунчер расшифровывает причину понятным языком и предлагает кнопку с решением (в таблице такие варианты отмечены как `показано как ...`). Исходный ответ сервера всегда можно посмотреть по кнопке **Подробности**. Плагины могут возвращать собственные сообщения; в таблице ниже собраны стандартные ответы `Node-Server` и значения по умолчанию из API плагинов.

| Причина | Когда | Что делать |
|---|---|---|
| `Protocol version mismatch: launcher speaks v22, server speaks v21 - update the outdated side` | Лаунчер и сервер говорят на разных версиях протокола; числа настоящие (текущие версии — v23). Если отстал лаунчер, показано как `This server needs a newer launcher — update now` с кнопкой **Обновить сейчас**; если отстал сервер — как `This server runs an older NodeMP server (protocol v21; this launcher speaks v22)`. | **Обновить сейчас** обновит лаунчер и зайдёт снова. Если отстал сервер — сообщите хосту. |
| `Your NodeMP mod is out of date for this server (it speaks wire protocol …, the server …). Reinstall it from the launcher.` | Клиентский мод говорит на другой версии протокола, чем сервер. | Закройте игру, **Настройки → Лаунчер → Клиентский мод → Проверить**, войдите снова. |
| `Server full!` | Достигнут `[General] MaxPlayers`. | Фильтр *Есть места* — или подождите. |
| `The server is still starting, please try joining again later.` | Сервер ещё загружал плагины, и ожидание рукопожатия истекло. | Попробуйте через минуту. |
| `Server shutdown` | Сервер останавливается; это же получают все в сессии при остановке. | Подождите, пока хост его поднимет. |
| `You are banned from this server` | Ваш IP или аккаунт в списке банов сервера без причины. Если причина есть, вместо этого текста будет она. | Обратитесь к хосту ([Запуск сервера → Баны](/ru/hosting/administration/#баны)). |
| `This server requires a NodeMP account: sign in to the launcher and join again` | `[Directory] TestDrive = false`: вы зашли в Test Drive или без билета. | **Настройки → Аккаунт → Войти** или фильтр *Без аккаунта*. |
| `Your join ticket was not accepted (join ticket invalid or expired). Join again from the launcher to get a new one` | NodeMP не принял билет; в скобках — его сообщение. Билет одноразовый, живёт около минуты и привязан к вашему IP. | Войдите снова. |
| `The server could not verify your account with the directory (…). Try again in a moment` | Сервер не смог спросить NodeMP; в скобках — почему. Сервер с `RedeemFailOpen = true` и разрешённым Test Drive вместо этого пустит вас без проверки. | Попробуйте чуть позже. |
| `Replaced` | На этот сервер зашли с вашего аккаунта ещё раз — с другого ПК или из второго лаунчера, — и эта сессия закрыта. Следующий релиз сервера; в 1.5.0 этого нет. | Не играйте из двух мест сразу; если это были не вы — смените пароль. |
| `Resume rejected` | Соединение оборвалось, и сервер не дал лаунчеру восстановить сессию: старого соединения уже нет или оно не освободилось. Следующий релиз сервера; в 1.5.0 этого нет. | Войдите снова. |
| `Resume rejected: too many failed attempts, try again later` | Слишком много неудачных попыток восстановить сессию с вашего адреса за короткое время. Следующий релиз сервера; в 1.5.0 этого нет. | Подождите минуту и войдите снова. |
| `Connection refused` | Плагин не пустил вас, не назвав причину; если причина есть, будет она. | Обратитесь к хосту. |
| `Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | `[General] VerifyGame` — `size`, `scripts` или `full`, и ваша установка отличается от списка самой игры. Число настоящее. | Проверьте целостность файлов в Steam. |
| `Your BeamNG install changed while you were playing, and this server requires it to match the game's own file list (1 file differs). …` | Та же проверка, повторённая во время сессии, нашла изменение. | Отмените то, что установили; проверьте файлы игры. |
| `Game files do not match this server's reference (3 problems). userfolder:vehicles/pickup/pickup.jbeam (overlay), …` | `VerifyGame = "strict"`, и установка или папка пользователя отличается от эталона сервера. В тексте до трёх примеров вида `путь (причина)`. Показано как `Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam` — с первой проблемой словами и командой диагностики. | См. [Серверы со строгой проверкой](/ru/support/strict-servers/). |
| `Game files changed while you were playing and no longer match this server's reference (1 problem). …` | Строгая проверка, повторённая во время сессии, нашла изменение. Показано как `Your game files changed while you were playing and no longer match this server's reference (1 problem)`. | Верните как было; запустите диагностику. |
| `Your launcher checked your BeamNG install against a different reference manifest than this server uses (checked against reference manifest … but this server uses …). Reconnect so it fetches the current one.` | Лаунчер сверялся с сохранённым эталоном, который хост уже заменил. Показано как `This server's reference manifest changed — join again`. | Войдите снова. |
| `This server requires the strict check of your BeamNG install, but your launcher ran only 'size'. Update your launcher and try again.` | Строгий сервер получил результат более слабой проверки. Текущий лаунчер проводит ту проверку, которую просят, — значит, он изменён или повреждён. Показано как `This server needs a newer launcher — update now`. | **Обновить сейчас** или переустановите с [nodemp.com/download](https://nodemp.com/download). |
| `` This server requires a strict check of your BeamNG install but has no integrity manifest to check it against. Ask the host to run `Node-Server --gen-integrity <gamedir>` and put the file in the server's integrity folder. `` | `VerifyGame = "strict"`, а в `[General] IntegrityDir` нет `.manifest`. | Сообщите хосту ([Строгая проверка](/ru/hosting/strict-verification/)). |
| `This server has integrity manifests for 2 game versions (0.39.4.0, 0.39.3.0) and cannot tell which one you run. Ask the host to keep exactly one manifest in the server's integrity folder.` | В папке больше одного `.manifest`. | Сообщите хосту. |
| `Unknown integrity manifest requested` | Лаунчер попросил эталон, которого у сервера нет, — обычно тот, что хост только что заменил. Показано как `The server would not send its reference manifest`. | Войдите снова чуть позже; если повторяется — сообщите хосту. |
| `Too many integrity manifest requests` | Больше четырёх передач эталона за сессию. Показано как `The server stopped sending its reference manifest (asked too often)`. | Войдите снова чуть позже; если повторяется — переустановите лаунчер. |
| `This server requires a check of your BeamNG install, which could not be completed: …` | Помощник не смог провести проверку; после двоеточия — почему, например `the game's user folder … does not exist`, `could not obtain the server's reference manifest: …`, `manifest format outdated (format 1)`. Показано как `BeamNG's user folder was not found`, `Could not download the server's reference manifest`, `The server's reference manifest is out of date` или `Your game files could not be checked`. | Прочитайте совет под сообщением и войдите снова. |
| `Kicked`, `Kicked by module` | Плагин удалил вас, не назвав причину. | Обратитесь к хосту. |
| `Banned` | Плагин забанил вас, не назвав причину. | Обратитесь к хосту. |
| `Packet rate limit exceeded` | Ваш клиент отправлял пакеты чаще, чем позволяет сервер. | Войдите снова; если повторяется — сообщите. |
| `Disconnected after failing to receive packets` | Сервер не смог доставить вам данные. | Войдите снова. |
| `TCP send of MODS_INFO failed` | Сервер не смог отправить список модов: соединения уже не было. | Войдите снова. |
| `Expected HELLO`, `Malformed HELLO`, `Expected IDENTITY after HELLO`, `Unknown packet type during handshake`, `Frame length cap exceeded`, `Per-type body cap exceeded`, `Malformed frame`, `Packet decode failed`, `Sent invalid compressed packet (this is likely a bug on your end)`, `Malformed game verification report` | Лаунчер прислал то, что сервер не принимает, — так делает только изменённый или повреждённый лаунчер. | Переустановите лаунчер с [nodemp.com/download](https://nodemp.com/download). |
