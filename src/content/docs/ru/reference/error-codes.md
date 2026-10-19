---
title: Сообщения об ошибках
description: Все сообщения, которыми может закончиться вход на сервер, то есть уведомления лаунчера, отказы и кики сервера и коды выхода помощника, и что с каждым делать.
---

Номеров ошибок в NodeMP нет. Вход останавливает фраза из одного из трёх мест: уведомление лаунчера, отказ или кик от сервера, последняя строка лога помощника. Здесь собраны все такие фразы, а `…` заменяет часть, которая меняется. Частые случаи по шагам: [Если что-то не работает](/ru/players/troubleshooting/).

## Уведомления лаунчера

У уведомления есть заголовок, который называет шаг, и под ним причина. Ниже они записаны как *заголовок* · `причина`. Заголовки лаунчер показывает на языке интерфейса, а причины от помощника и сервера пишет по-английски. Ошибки и предупреждения остаются в центре уведомлений под колокольчиком: кнопка **Копировать** кладёт их текст в буфер, а **Подробности** показывают исходные слова сервера или помощника.

### Клиентский мод

| Сообщение | Что случилось | Что сделать |
|---|---|---|
| *Не удалось войти* · `client mod is not installed and the directory is unreachable` | `NodeMP.zip` на диске ещё нет, а NodeMP не ответил. | Проверьте соединение и зайдите снова. |
| *Не удалось войти* · `client mod is not installed and no release has been published yet` | `NodeMP.zip` нет, а NodeMP ещё не опубликовал ни одной версии мода. | Зайдите позже. |
| *Не удалось войти* · `could not start the download: …`, `the download server returned …`, `the download stopped: …`, `the download was N bytes, the release says M`, `the download is larger than the release says` | Загрузка мода не началась или оборвалась. | Проверьте соединение, VPN или прокси и зайдите снова. |
| *Не удалось войти* · `the downloaded client mod does not match the published checksum`, `the …'s signature does not verify: it was not signed by NodeMP` | Скачанный файл не прошёл проверку суммы или подписи. Лаунчер такой мод не ставит. | Зайдите снова. |
| *Не удалось войти* · `LOCALAPPDATA is not set, so BeamNG's user folder cannot be found` | Windows не передала лаунчеру переменную `LOCALAPPDATA`, по ней он ищет папку пользователя игры. | Перезагрузите компьютер. Не помогло: задайте переменную сами, обычно это `%USERPROFILE%\AppData\Local`. |
| *Клиентский мод не обновился* · *Входим с установленной версией.* | Проверка не удалась, но прежний `NodeMP.zip` на месте, и лаунчер входит с ним. Это предупреждение. | Если сервер откажет старому моду, закройте игру и нажмите **Настройки → Игра → Клиентский мод → Проверить**. |
| *Не удалось проверить клиентский мод* · `could not replace …\NodeMP.zip (is BeamNG.drive running?): …` | Запущенная игра держит файл. | Закройте BeamNG.drive и нажмите **Проверить**. |

### Запуск сессии

| Сообщение | Что случилось | Что сделать |
|---|---|---|
| *Не удалось запустить сессию* · `could not start …: …` | Система не запустила помощника, а после двоеточия её сообщение. | Проверьте, не блокирует ли `NodeMP.exe` антивирус, или переустановите лаунчер с [nodemp.com/download](https://nodemp.com/download). |
| *Сетевой помощник лаунчера остановился* · последняя строка его лога | Помощник завершился с ошибкой до того, как открылась игра. | Найдите строку в разделе [Коды выхода помощника](#коды-выхода-помощника). |
| *Вы уже на сервере: выйдите из игры, чтобы подключиться к другому* | Вход начат, пока идёт другая сессия. | Закройте BeamNG.drive. |
| *Подключение отменено* | Вы нажали **Отмена**. | Ничего. |
| *Не удалось войти* · *Вход в аккаунт больше не действует. Войдите снова, чтобы играть под своим именем.* | NodeMP больше не принимает сохранённый вход, и билета на вход нет. Игра не запускалась. | Нажмите **Войти** в уведомлении и войдите заново ([Аккаунт и вход](/ru/players/sign-in/)). |
| *Не удалось войти* · *Не удалось связаться с NodeMP, чтобы получить билет на вход.* | NodeMP не ответил. Игра не запускалась. | Нажмите **Повторить**. |
| *Не удалось войти* · текст отказа от NodeMP | NodeMP не выдал билет на вход. Под текстом бывает совет *Попробуйте снова через N с.* или номер решения, который называют в поддержке. | Выполните совет. Если сервер пускает без аккаунта, в уведомлении есть **Играть гостем**. |

### Подключение

| Сообщение | Что случилось | Что сделать |
|---|---|---|
| *Не удалось подключиться* · `Could not reach the server` | По этому адресу никто не отвечает: сервер выключен, порт закрыт или мешает брандмауэр. | Обновите список. Если это ваш сервер, проверьте, что порт открыт для TCP и UDP. |
| *Не удалось подключиться* · `DNS Lookup Failed` | Имя, введённое в прямом подключении, не находится. | Проверьте написание или введите IP-адрес. |
| *Не удалось подключиться* · `server certificate fingerprint mismatch` | Сертификат сервера не тот, что ждал лаунчер: ни тот, который NodeMP знает о сервере из списка, ни тот, который лаунчер запомнил при прошлом входе по адресу. | Спросите хоста: он мог переустановить сервер. Если вы заходили по адресу, удалите строку сервера из `known_servers.json` в папке кэша лаунчера. |
| *Не удалось подключиться* · `TLS handshake failed: …`, `server presented no certificate` | Ответил не сервер NodeMP, или соединение оборвалось во время рукопожатия. | Проверьте адрес и порт и попробуйте снова. Через VPN: [Плохое соединение](/ru/players/connection/#сообщения-о-сбоях-связи). |

### Загрузка модов сервера

Эти причины приходят в уведомлении *Сервер не пустил в игру* или *Сессия завершена*.

| Причина | Что случилось | Что сделать |
|---|---|---|
| `Server cannot find …`, `Server refused … (protected)`, `Server failed to read …` | Сервер назвал мод, который не может или не хочет отправить. | Скажите хосту. |
| `Mod '…' is protected: the server does not send it, so it has to be put in the cache folder by hand: …` | Хост хочет, чтобы игроки скачали этот мод сами. | Возьмите zip у хоста и положите в папку из сообщения. |
| `Failed to verify "…"` | Скачанный мод дважды не совпал с тем, что объявил сервер. | Скажите хосту. Если удалить файл на вкладке **Контент**, он скачается заново. |
| `Received corrupted download confirmation, aborting download.`, `Download announcement does not match the mod list, aborting download.` | Ответ сервера во время загрузки не сошёлся. | Зайдите снова. Если повторяется, скажите хосту. |

### Список серверов, кэш и обновления

| Сообщение | Что случилось | Что сделать |
|---|---|---|
| *Не удалось связаться с NodeMP* | Список серверов не загрузился. Строка под заголовком называет адрес NodeMP. | Проверьте соединение и VPN. Прямое подключение работает и без списка. |
| *Технические работы: список серверов пока закрыт* | NodeMP на обслуживании. | Подождите: лаунчер спросит снова сам. Прямое подключение работает. |
| *Не удалось удалить файл* · `could not remove …: …`, `… is no longer in the cache`, `… is not a cached content file` | Файл не удалился с вкладки **Контент**. Первое сообщение обычно значит, что файл держит игра. | Закройте игру и попробуйте снова. |
| *Не удалось установить обновление лаунчера* · `the downloaded installer does not match the published checksum`, `the …'s signature does not verify: it was not signed by NodeMP`, `the download stopped (…); it resumes on the next try`, `the download stopped at N of M bytes; it resumes on the next try` | Установщик скачался не полностью или не прошёл проверку. | Попробуйте снова: загрузка продолжится с того же места. |
| `Could not find a BeamNG.drive install. Browse to it, or launch the game once so Steam writes its path.` | Под путём в **Настройки → Игра** игра не найдена. | Нажмите **Обзор** и выберите папку игры, или запустите игру через Steam и нажмите **Найти**. |
| `No Bin64\BeamNG.drive.x64.exe in this folder` | Под путём в **Настройки → Игра** выбрана не главная папка игры. | Выберите папку, в которой лежит `Bin64\`. |

## Отказы и кики сервера

Сервер отказывает простыми словами. При входе лаунчер показывает отказ как *Сервер не пустил в игру*. Во время сессии игра сообщает, что сессия завершена, и лаунчер возвращается с *Сессия завершена*. В логе сервера тот же текст записан как `<имя> kicked — <причина>`.

Проблемы с версиями и файлами игры лаунчер превращает в совет с кнопкой. Для таких строк указано, что показывается, а слова сервера остаются в **Подробностях**. Плагины могут кикать своим текстом, и вы увидите его как есть.

| Причина | Когда | Что сделать |
|---|---|---|
| `Protocol version mismatch: launcher speaks v22, server speaks v21 - update the outdated side` | Лаунчер и сервер говорят на разных версиях протокола, числа в сообщении настоящие. Если отстаёт лаунчер, лаунчер показывает `This server needs a newer launcher — update now` с кнопкой **Обновить сейчас**. Если отстаёт сервер, показывает `This server runs an older NodeMP server (protocol v21; this launcher speaks v22)`. | **Обновить сейчас** обновит лаунчер и зайдёт снова. Если отстаёт сервер, скажите хосту. |
| `Your NodeMP mod is out of date for this server (it speaks wire protocol …, the server …). Reinstall it from the launcher.` | Клиентский мод и сервер говорят на разных версиях протокола, оба числа в сообщении. | Если число мода меньше, закройте игру, нажмите **Настройки → Игра → Клиентский мод → Проверить** и зайдите снова. Если больше, скажите хосту: отстаёт сервер. |
| `Server full!` | На сервере столько игроков, сколько он пускает, а в очередь не встать: вы без аккаунта, лаунчер слишком старый для очередей или очередь на сервере выключена. | Включите в списке переключатель **Есть места** или подождите. |
| `The server is full and so is its join queue` | В [очереди на вход](/ru/hosting/join-queue/) уже ждёт столько игроков, сколько разрешает хост. Лаунчер пишет *Сервер заполнен, и очередь на него тоже. Попробуйте позже.* | Попробуйте позже. |
| `Someone from your address is already in this server's join queue` | С вашего адреса в очереди уже ждёт столько игроков, сколько разрешает хост, по умолчанию один. Через общее подключение все игроки приходят с одного адреса. Лаунчер пишет *Кто-то из вашей сети уже стоит в очереди на этот сервер.* | Дождитесь, пока тот игрок войдёт, или зайдите с другого подключения. |
| `You did not join after your turn too often; this server's join queue is closed to you until …` | Очередь подходила несколько раз, а вы уходили, не дойдя до мира. После слов `until` стоит время по UTC, когда очередь снова откроется. Лаунчер показывает его по вашему времени. | Подождите до этого времени. На сервер со свободным местом можно заходить и сейчас. |
| `The server is starting up; join again in a moment.` | Сервер ещё загружает плагины. | Попробуйте через минуту. |
| `Server shutdown` | Сервер останавливается. Это получают все, кто на нём. | Дождитесь, пока хост его поднимет. |
| `You are banned from this server` | Ваш адрес, аккаунт или установка лаунчера в списке банов сервера, причина не указана. Если хост её указал, вы увидите её. | Спросите хоста. |
| `This server requires a NodeMP account: sign in to the launcher and join again` | Сервер не пускает Test Drive, а вы зашли без аккаунта. | Войдите: **Настройки → Аккаунт → Войти**. Или включите в списке переключатель **Без аккаунта**. |
| `Your join ticket was not accepted (join ticket invalid or expired). Join again from the launcher to get a new one` | NodeMP не принял одноразовый билет на вход, в скобках причина. | Зайдите снова. |
| `The server could not verify your account with the directory (…). Try again in a moment` | Сервер не смог связаться с NodeMP, чтобы проверить аккаунт. | Попробуйте чуть позже. |
| `Resume rejected` | Соединение оборвалось, и лаунчер пытался вернуть сессию, а сервер её не принял: сессия уже закончилась или не сошёлся ключ. | Зайдите снова. |
| `Resume rejected: too many failed attempts, try again later` | С вашего адреса слишком много неудачных попыток вернуть сессию за короткое время. | Подождите минуту и зайдите снова. |
| `Connection refused` | Плагин не пустил вас и не назвал причину. Если назвал, вы увидите её. | Спросите хоста. |
| `Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | Часть файлов игры отличается от её собственного списка. Число настоящее. | Проверьте файлы игры в Steam. |
| `Your BeamNG install changed while you were playing, and this server requires it to match the game's own file list (1 file differs). …` | Та же проверка во время сессии нашла изменение. | Отмените то, что ставили, и проверьте файлы игры. |
| `Game files do not match this server's reference (3 problems). userfolder:vehicles/pickup/pickup.jbeam (overlay), …` | Строгий сервер: ваша игра или папка пользователя отличается от чистой установки хоста. Дальше идут до трёх примеров. Лаунчер показывает `Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam`, а под ним первую проблему словами и команду для полного списка. | [Строгий сервер не пускает](/ru/players/troubleshooting/#строгий-сервер-не-пускает). |
| `Game files changed while you were playing and no longer match this server's reference (1 problem). …` | Строгая проверка во время сессии нашла изменение. Лаунчер показывает `Your game files changed while you were playing and no longer match this server's reference (1 problem)`. | Верните файлы как были и зайдите снова. |
| `Your launcher checked your BeamNG install against a different reference manifest than this server uses (checked against reference manifest … but this server uses …). Reconnect so it fetches the current one.` | Хост заменил эталонный манифест сервера с вашего прошлого входа. Лаунчер показывает `This server's reference manifest changed — join again`. | Зайдите снова. |
| `This server requires the strict check of your BeamNG install, but your launcher ran only 'size'. Update your launcher and try again.` | Строгий сервер получил результат более лёгкой проверки. Лаунчер показывает `This server needs a newer launcher — update now`. | **Обновить сейчас** или переустановите лаунчер с [nodemp.com/download](https://nodemp.com/download). |
| `` This server requires a strict check of your BeamNG install but has no integrity manifest to check it against. Ask the host to run `Node-Server --gen-integrity <gamedir>` and put the file in the server's integrity folder. `` | Хост включил строгую проверку, а эталонного манифеста у сервера нет. | Скажите хосту ([Строгая проверка](/ru/hosting/strict-verification/)). |
| `This server has integrity manifests for 2 game versions (0.39.4.0, 0.39.3.0) and cannot tell which one you run. Ask the host to keep exactly one manifest in the server's integrity folder.` | В папке манифестов сервера лежат файлы для нескольких версий игры. | Скажите хосту. |
| `Unknown integrity manifest requested` | Лаунчер попросил манифест, которого у сервера нет: обычно хост только что его заменил. Лаунчер показывает `The server would not send its reference manifest`. | Зайдите чуть позже. Если повторяется, скажите хосту. |
| `Too many integrity manifest requests` | За одну сессию лаунчер слишком часто просил манифест. Лаунчер показывает `The server stopped sending its reference manifest (asked too often)`. | Зайдите чуть позже. Если повторяется, переустановите лаунчер. |
| `This server requires a check of your BeamNG install, which could not be completed: …` | Проверка не смогла пройти, после двоеточия причина. Лаунчер показывает `BeamNG's user folder was not found`, `Could not download the server's reference manifest`, `The server's reference manifest is out of date` или `Your game files could not be checked`. | Выполните совет под сообщением и зайдите снова. |
| `Kicked`, `Kicked by the server`, `Kicked by module` | Вас убрал плагин, консоль сервера или нативный модуль, причину не назвали. | Спросите хоста. |
| `Banned` | Плагин забанил вас, причину не назвал. | Спросите хоста. |
| `Packet rate limit exceeded` | Игра слала пакеты быстрее, чем разрешает сервер. | Зайдите снова. Если повторяется, сообщите об этом. |
| `Disconnected after failing to receive packets` | Сервер не смог доставить вам данные. | Зайдите снова. |
| `TCP send of MODS_INFO failed` | Сервер не смог отправить список модов: соединения уже не было. | Зайдите снова. |
| `Expected HELLO`, `Malformed HELLO`, `Expected IDENTITY after HELLO`, `Unknown packet type during handshake`, `Frame length cap exceeded`, `Per-type body cap exceeded`, `Malformed frame`, `Packet decode failed`, `Sent a compressed packet that does not decompress`, `Malformed game verification report`, `Unexpected packet while waiting in the join queue` | Лаунчер прислал то, чего сервер не принимает. Так ведёт себя только изменённый или сломанный лаунчер. | Переустановите лаунчер с [nodemp.com/download](https://nodemp.com/download). |

*Сессия завершена* без причины значит, что BeamNG.drive закрылась.

## Коды выхода помощника

Помощник — фоновая часть лаунчера, которая и выполняет вход. Если он завершится с ошибкой во время входа, лаунчер покажет *Сетевой помощник лаунчера остановился* и последнюю строку его лога, а код выхода будет в **Подробностях**. Полный лог: `%LOCALAPPDATA%\NodeMP\helper\logs\launcher.log`.

| Код | Последняя строка лога | Что значит | Что сделать |
|---|---|---|---|
| `0` | `game closed - launcher closing soon` | BeamNG.drive закрыли, сессия закончилась. | Ничего. |
| `1` | `Launcher.cfg is there but cannot be read; check its permissions, or delete it to start from the defaults`, `Launcher.cfg is not valid JSON; fix it, or delete it to start from the defaults` | Файл настроек помощника не читается или испорчен. | Удалите `Launcher.cfg`, помощник напишет новый. |
| `1` | `Cannot create the mod cache …: …. Point CacheDirectory in Launcher.cfg at a folder you can write to.` | Не удаётся создать папку для скачанных модов. | Исправьте права на папку или задайте `CacheDirectory` в `Launcher.cfg`. |
| `2` | `BeamNG.drive was not found. Choose its folder (the launcher's Settings > Game, or --game-dir), or start the game once so it records where it is.` | Игра не найдена. Помощник завершается через 10 секунд. | Укажите папку в **Настройки → Игра** или один раз запустите игру через Steam. |
| `2` | `The game could not be started (through Steam, or by its executable); the launcher closes in 5 s.` | Игру не запустил ни Steam, ни её собственный файл. | Проверьте файлы игры в Steam и путь в **Настройки → Игра**. |
| `5` | `Another Node-Launcher is already running on port 4444 - closing` | Второй помощник запущен, пока работает первый. | Закройте первый или BeamNG.drive вместе с ним и попробуйте снова. |
| `6` | `port 4444 is in use by another program …` | Локальный порт, по которому игра говорит с помощником, занят другой программой. | Закройте её. Сообщение называет команду, которая покажет, какая это программа. |

Проверку файлов игры помощник умеет запускать и отдельно: команду даёт кнопка **Копировать** под отказом строгого сервера. Она завершается с кодом `0`, если всё чисто (`game files verified: …`), с кодом `1`, если есть отличия (`game files DIFFER: …`), и с кодом `2`, если проверить не удалось (`cannot read the manifest file …`, `not a reference manifest: …`, `could not check: …`).
