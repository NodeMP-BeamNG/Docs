---
title: Устранение неполадок
description: Все сообщения лаунчера при неудачном подключении с причиной и решением, где лежат логи и как тестировщики направляют лаунчер на другую директорию.
---

О проблемах лаунчер сообщает уведомлениями внизу окна; уведомление держится несколько секунд.
Каждое сообщение начинается с префикса, который говорит, какая часть отказала:

| Префикс | Что отказало |
|---|---|
| `Could not join · …` | Либо проверка клиентского мода, когда пригодного `NodeMP.zip` на диске нет, либо отказ сервера, который лаунчер объясняет своими словами: строгая проверка файлов игры, эталонный манифест, устаревший лаунчер или сервер. |
| `Could not start the launcher · …` | Не удалось запустить процесс хелпера. |
| `Could not connect · …` | Хелпер не смог достучаться до сервера. |
| `Disconnected · …` | Сервер отказал или завершил сессию; текст — названная им причина, слово в слово. |
| `The launcher stopped · …` | Хелпер завершился во время подключения; текст — последняя строка его лога. |
| `Session ended · …` | Игра уже работала, когда сессия закончилась. |

## Подключение не удаётся

Сообщение `Could not join · …` о клиентском моде означает, что `NodeMP.zip` на диске ещё нет;
когда он установлен, те же сбои показываются как `Client mod could not be updated · joining with
the installed copy`. Сообщение `Could not join · …` о ваших файлах игры, эталонном манифесте
сервера или версии лаунчера — это отказ сервера, переписанный лаунчером; такие строки приводят
и строку лаунчера, и собственную причину сервера, а панель под карточкой сервера объясняет её и
говорит, что делать. Всё остальное, что присылает сервер, приходит как `Disconnected · …` с
текстом сервера.

| Сообщение | Причина | Решение |
|---|---|---|
| `Could not join · client mod is not installed and the directory is unreachable` | Первое подключение, `NodeMP.zip` ещё нет, а `https://api.nodemp.com` не ответил или опубликовал непригодный релиз. | Выйдите в сеть и подключитесь снова; если повторяется, виновата директория — попробуйте позже. |
| `Could not join · client mod is not installed and no release has been published yet` | Первое подключение; у директории ещё нет релиза клиентского мода. | Дождитесь релиза. |
| `Could not join · could not start the download: …`, `… the download server returned 503 Service Unavailable`, `… the download stopped: …`, `… the download was N bytes, the release says M`, `… the download is larger than the release says` | Первое подключение; хост файла релиза (не директория) недоступен или передача оборвалась. | Проверьте соединение, VPN и прокси, подключитесь снова. |
| `Could not join · the downloaded client mod does not match the published checksum` | Скачанный файл повреждён. | Подключитесь снова. |
| `Could not join · cannot create …\mods\multiplayer: …`, `… could not create …\NodeMP.zip.part: …`, `… could not write …`, `… could not finish …`, `… could not read …\NodeMP.zip.part: …`, `… hashing …\NodeMP.zip.part was interrupted: …` | Пользовательская папка BeamNG недоступна для записи или диск заполнен. | Освободите место; проверьте права на `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\mods\multiplayer\`. |
| `Could not join · LOCALAPPDATA is not set, so BeamNG's user folder cannot be found` | Переменная окружения отсутствует. | Исправьте окружение пользователя; выйдите из Windows и войдите снова. |
| `Client mod could not be updated · joining with the installed copy` | Проверка не удалась, но старый `NodeMP.zip` есть. Само по себе не ошибка. | Если сервер отказывает старому моду: **Settings → Launcher → Check now** при закрытой BeamNG. |
| `Could not check the client mod · could not replace …\NodeMP.zip (is BeamNG.drive running?): …` | BeamNG.drive держит zip открытым. | Закройте игру, затем *Check now*. |
| `Could not start the launcher · could not start …\nodemp-launcher.exe: …` | Антивирус или политика заблокировали процесс хелпера. | Разрешите `nodemp-launcher.exe` или переустановите с [nodemp.com/download](https://nodemp.com/download). |
| `The launcher stopped · … Failed to find the game please launch it. Report this if the issue persists code 8` | Хелпер не нашёл BeamNG.drive. | Запустите игру один раз через Steam или укажите папку в **Settings → Game**. |
| `The launcher stopped · … Failed to Launch the game! launcher closing soon.` | `Bin64\BeamNG.drive.x64.exe` не запустился — и через Steam тоже. | Проверьте файлы игры в Steam; проверьте **Settings → Game**. |
| Шаг остаётся на `Starting BeamNG.drive` или `Loading BeamNG.drive` | Лаунчер ждёт окно BeamNG до четырёх минут; холодный старт может занять столько. | Подождите. Если игра так и не появилась, прочитайте `launcher.log` (ниже). |
| `Could not connect · Could not reach the server` | По адресу `host:port` никто не отвечает: сервер выключен, порт закрыт, брандмауэр. | Обновите список; хост проверяет `30814` по TCP и UDP. |
| `Could not connect · DNS Lookup Failed` | Имя хоста в адресе Direct Connect не разрешается. | Проверьте написание или используйте IP. |
| `Could not connect · server certificate fingerprint mismatch` | Сертификат сервера, к которому вы подключались по адресу, изменился; закрепление хранится на каждый `host:port`. | Если хост подтверждает смену, удалите запись сервера из `known_servers.json` в папке кеша (**Settings → Launcher → Downloaded content → Open**). |
| `Could not join · This server needs a newer launcher — update from the Download page` | Сервер говорит на более новой версии сетевого протокола, чем этот лаунчер. Причина сервера — `Protocol version mismatch: launcher speaks v17, server speaks v18 - update the outdated side` с реальными числами; лаунчер 1.1.0 говорит на v18. | Установите текущий лаунчер с [nodemp.com/download](https://nodemp.com/download); в панели под карточкой сервера есть кнопка *Open the Download page*. |
| `Could not join · This server runs an older NodeMP server (protocol v17; this launcher speaks v18)` | То же несовпадение в другую сторону: сервер отстаёт от лаунчера. | С вашей стороны ничего; сервер должен обновить хост. |
| `Disconnected · This server requires a NodeMP account: sign in to the launcher and join again` | Вы в режиме Test Drive, а сервер не принимает гостей (*Account required*). | **Settings → Account → Sign in** или фильтр *No account needed*. |
| `Disconnected · Your join ticket was not accepted (join ticket invalid or expired). Join again from the launcher to get a new one` | Билет одноразовый и живёт меньше минуты; подключение с другого IP тоже отклоняется. | Подключитесь снова из лаунчера. |
| `Disconnected · The server could not verify your account with the directory (…). Try again in a moment` | Сервер не смог связаться с директорией. | Повторите через минуту. |
| `Disconnected · Server full!`, `Disconnected · You are banned from this server`, `Disconnected · The server is still starting, please try joining again later.` | То, что написано. | Фильтр *Free slots*; обратитесь к хосту; подождите минуту. |
| `Disconnected · Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | Сервер проверяет файлы игры, а ваши отличаются от манифеста игры. | Проверьте файлы игры в Steam. |
| `Could not join · Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam` | **Строгий** сервер: ваша установка или ваша пользовательская папка BeamNG отличается от серверного эталона чистой игры. Число и путь — реальные; причина сервера — `Game files do not match this server's reference (3 problems). userfolder:vehicles/pickup/pickup.jbeam (overlay), …`. Панель под карточкой сервера называет первую проблему словами (`vehicles/pickup/pickup.jbeam — in the BeamNG user folder, overrides the game's files`), говорит, что с ней делать, и предлагает команду диагностики с кнопкой *Copy*. | Следуйте панели, затем запустите диагностику из раздела [Строгие серверы](#строгие-серверы) ниже, чтобы увидеть весь список. |
| `Could not join · This server's reference manifest changed — join again` | Лаунчер сверял с кэшированным эталоном, который сервер больше не использует (хост перегенерировал его). Причина сервера — `Your launcher checked your BeamNG install against a different reference manifest than this server uses (…). Reconnect so it fetches the current one.` | Подключитесь снова; лаунчер скачает текущий манифест. |
| `Disconnected · This server requires a strict check of your BeamNG install but has no integrity manifest to check it against. …`, `Disconnected · This server has integrity manifests for 2 game versions (…) and cannot tell which one you run. …` | Сервер настроен на strict, но у него нет эталона или их больше одного. С вашей стороны всё в порядке. | Сообщите хосту. |
| `Could not join · BeamNG's user folder was not found` | Strict нужна пользовательская папка игры; `startup.ini` или `BeamNG.Drive.ini` указывает на несуществующую. Причина сервера — `This server requires a check of your BeamNG install, which could not be completed: the game's user folder … does not exist`. | Исправьте путь в этом файле или запустите игру один раз, чтобы папка создалась. |
| `Could not join · Could not download the server's reference manifest`, `Could not join · The server's reference manifest is out of date`, `Could not join · Your game files could not be checked` | Строгая проверка не смогла выполниться: передача манифеста оборвалась (например, `the server sent nothing for 30 s during the manifest transfer`), эталон сервера в устаревшем формате или что-то ещё, что называет панель. Причина сервера начинается с `This server requires a check of your BeamNG install, which could not be completed: …`. | Подключитесь снова; если повторяется, сообщите хосту, приложив `launcher.log`. |
| `Could not join · The server would not send its reference manifest`, `Could not join · The server stopped sending its reference manifest (asked too often)` | Сервер отказал в передаче манифеста (`Unknown integrity manifest requested`, `Too many integrity manifest requests`). Текущий лаунчер запрашивает только тот id, который назвал сервер, и только один раз, так что это указывает на заменённый манифест на стороне хоста или сломанный лаунчер. | Подключитесь снова через минуту; если повторяется, сообщите хосту или переустановите лаунчер. |
| `Disconnected · Invalid mod "…"`, `Disconnected · Failed to verify "…"`, `Disconnected · Server cannot find …` | Файл контента, объявленный сервером, повреждён или отсутствует на сервере. | Сообщите хосту. Удаление файла в **Content** заставит скачать его заново. |

Если игра уже была на экране, та же причина приходит и как `Session ended · …`, а игра
показывает *The session has ended* с этой причиной. Все причины, которые может прислать
сервер, перечислены в разделе [Коды ошибок](/ru/reference/error-codes/).

## Строгие серверы

Сервер с `VerifyGame = "strict"` сравнивает всю вашу установку BeamNG — папку игры, оглавление
каждого архива и вашу пользовательскую папку BeamNG — с эталоном чистой установки той версии
игры, на которой он работает ([Строгая проверка](/ru/hosting/strict-verification/) объясняет,
что настроил хост). При подключении появляются ещё два шага,
`Downloading the server's integrity manifest` (один раз; файл кэшируется) и
`Checking game files`, а несовпадение отклоняет вас с
`Could not join · Your game files do not match this server's reference (N problems) · <path>`
(причина сервера, `Game files do not match this server's reference (N problems). …`, несёт до
трёх примеров; панель под карточкой сервера объясняет первый). Лаунчер продолжает
проверять и во время сессии, так что изменение, сделанное во время игры, завершает её с
`Session ended · Your game files changed while you were playing and no longer match this server's reference (N problems)`.

Обычные причины на немодифицированной игре — файлы, которые проверка не может отличить от
модификации:

- **Остатки распакованных модов в пользовательской папке** — `vehicles\<model>\info_*.json`,
  `*.materials.json`, `*.jbeam` под `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\vehicles\`,
  оставшиеся после удаления мода из `mods\`. Там разрешены только сохранённые конфигурации
  (`vehicles\<model>\<name>.pc` с превью `.png`/`.jpg`).
- **Ваши собственные уровни или частицы** — уровень в `current\levels\`, отредактированный
  `current\lua\common\particles.json`, что угодно под `current\lua\`, `ui\`, `art\` или `scripts\`,
  что не принадлежит игре. Уберите это на время игры на строгом сервере; `mods\` и папки
  сохранений редакторов не проверяются.
- **Файлы, добавленные в папку игры** — лаунчер или утилита, скопированные рядом с
  `BeamNG.drive.exe`, мод, установленный в саму установку вместо пользовательской папки.
  Считается всё, чего нет в эталоне, кроме логов, кеша шейдеров и `desktop.ini` самой Windows.
- **Версия игры не та, что у сервера** — после обновления BeamNG, пока хост не перегенерировал
  эталон (или пока вы не обновились): примеры тогда называют файлы игры вроде
  `/Bin64/BeamNG.drive.x64.exe (hash)`.
- **Изменённый игровой архив** — перепакованный или отредактированный `.zip` в `content\`:
  проверьте файлы игры в Steam.

Отказ показывает три примера. Чтобы увидеть весь список, выполните ту же проверку сами: она
встроена в лаунчер как `--integrity-check`, берёт эталон, который прислал сервер (кэш в
`%LOCALAPPDATA%\com.nodemp.launcher\helper\cache\integrity\<id>.manifest`; по файлу на каждый
эталон, который вы забирали), и печатает каждую проблему. Из командной строки, при закрытом
BeamNG:

```
cd %LOCALAPPDATA%\com.nodemp.launcher\helper
%LOCALAPPDATA%\NodeMP\nodemp-launcher.exe --helper --data-dir %LOCALAPPDATA%\com.nodemp.launcher\helper --integrity-check cache\integrity\<id>.manifest
echo %ERRORLEVEL%
```

(`--helper` превращает исполняемый файл лаунчера в хелпер; `--data-dir` и рабочий каталог — то,
что лаунчер передаёт сам, так что проверка читает тот же `Launcher.cfg`, что и подключение.
Добавьте `--game-dir <folder>`, если в **Settings → Game** указана папка, как это делает
лаунчер; `--user-path <folder>` переопределяет пользовательскую папку. Отдельная сборка
`Node-Launcher.exe` принимает те же опции без `--helper`.) Вывод, который пишется и в
`launcher.log`, выглядит так:

```
integrity check (strict) against C:\Users\you\AppData\Local\com.nodemp.launcher\helper\cache\integrity\e326499d….manifest
  game folder  C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive
  user folder  C:\Users\you\AppData\Local\BeamNG\BeamNG.drive\current
  launcher     exe C:\Users\you\AppData\Local\NodeMP\nodemp-launcher.exe, data C:\Users\you\AppData\Local\com.nodemp.launcher\helper\, cache C:\Users\you\AppData\Local\com.nodemp.launcher\helper\cache
  manifest     id e326499d…, format 2, game 0.39.4.0 build 20972, 14193 root files, 173 archives, generated 2026-…
  overlay   userfolder:vehicles/bell407/info_bell407.json
  overlay   userfolder:levels/mytrack/info.json
  unlisted  /Node-Launcher.exe
game files DIFFER: 14193 files checked in 1.0s (strict), 7203 hashed, 1 not part of the game, 2 user-folder overrides -- e.g. userfolder:vehicles/bell407/info_bell407.json (overlay) userfolder:levels/mytrack/info.json (overlay) /Node-Launcher.exe (unlisted)
counts: missing 0, size 0, hash 0, unlisted 1, archive 0, userfolder 2, folders skipped 0
```

Каждая проблема — одна строка: причина, затем путь, выровненные в две колонки:

| Причина | Путь | Значение | Решение |
|---|---|---|---|
| `overlay` | `userfolder:<path>` | Файл в `current\` вашей пользовательской папки, перекрывающий контент игры. | Уберите его из `current\`; упакованный мод должен лежать в `mods\`, которая не проверяется. |
| `unreadable` | `userfolder:<folder>` | Папка там, которую лаунчер не смог прочитать, обычно путь длиннее, чем позволяет Windows. | Укоротите или удалите её. |
| `unlisted` | `/<path>` | Файл в папке игры, которого в чистой установке нет. | Удалите его из папки игры. |
| `hash`, `size`, `missing` | `/<path>` | Файл игры отредактирован, изменил размер или удалён. Много таких, включая `/Bin64/…`, означают, что ваша версия игры — не та, которую описывает эталон. | Проверьте файлы игры в Steam; обновите игру или дождитесь, пока хост перегенерирует эталон. |
| `crc`, `size`, `extra`, `missing`, `duplicate` | `/<zip>!<entry>` | Запись игрового архива отличается от чистой. | Проверьте файлы игры в Steam. |
| `unreadable` | `/<zip>` | Архив — не читаемый zip. | Проверьте файлы игры в Steam. |
| `not judged` | `<path> (the launcher's own)` | Не проблема: лаунчер живёт внутри папки игры и исключил собственные файлы. | Ничего. |

Последняя строка перед итогом, `counts: missing N, size N, hash N, unlisted N, archive N,
userfolder N, folders skipped N`, — та же разбивка в виде сумм. Код выхода — `0`, когда установка
чистая, `1`, когда есть проблемы, и `2`, когда проверку вообще не удалось выполнить —
`cannot read the manifest file …`, `not a reference manifest: …`,
`could not check: manifest format outdated (format 1)` (устаревший файл эталона: попросите хоста
перегенерировать его) или `could not check: the game's user folder … does not exist`.

## Вход в аккаунт

| Сообщение | Причина | Решение |
|---|---|---|
| `Enter a username and a password of at least four characters.` | Собственная проверка формы. | Заполните оба поля. |
| `invalid username or password` | Неверные учётные данные. | Сбросьте пароль на [nodemp.com/forgot](https://nodemp.com/forgot). |
| `please verify your e-mail first` | Ссылка подтверждения не была открыта. | Откройте её; она действует недолго, поэтому зарегистрируйтесь заново под другим именем, если ссылка пропала. |
| `username must be 3-24 chars [A-Za-z0-9_-]`, `password must be 8-200 chars`, `already exists` | Правила директории для нового аккаунта. | Выберите другое имя или более длинный пароль. |
| `two-factor code required or invalid` | У аккаунта включена двухфакторная аутентификация; в лаунчере нет поля для кода. | Играйте как Test Drive или используйте аккаунт без двухфакторной аутентификации. |
| `could not reach the directory: …` | Нет связи с `https://api.nodemp.com`. | Проверьте соединение и VPN. |

## Список серверов пуст

- Экран **No connection** (`NodeMP cannot reach its server list. Check that you are online —
  and if you use a VPN for a test server, that it is connected.`): директория не ответила при
  запуске. *Try again* или *Continue without the list*; Direct Connect продолжает работать. Пока
  директория недоступна, Refresh сообщает `Could not reach NodeMP at https://api.nodemp.com`.
- `No servers online` / `Nobody is hosting right now.`: директория ответила пустым списком. С
  вашей стороны всё в порядке.
- `Nothing matches these filters`: откройте **Filters** и нажмите *Reset*. Favorites и Recent
  показывают только серверы, которые сейчас в сети.
- Сервер, который точно работает, но не виден, — приватный, не числится в списке (нет ключа
  сервера) или перестал посылать маяки. Подключайтесь к нему через Direct Connect.

`could not remove …: …` в разделе Content означает, что BeamNG.drive держит архив; закройте игру
и удалите снова.

## Логи

- **Лог хелпера** — `launcher.log` описывает одну сессию: поиск игры, соединение, скачивание
  контента и причину завершения сессии. **Settings → Launcher → Logs → Open** открывает его
  папку:

  ```
  %LOCALAPPDATA%\com.nodemp.launcher\helper\logs\launcher.log
  ```

  Файл перезаписывается при каждом подключении, поэтому скопируйте его, прежде чем пробовать
  снова. В родительской папке, `%LOCALAPPDATA%\com.nodemp.launcher\helper\`, лежат
  `Launcher.cfg` хелпера и его кеш `cache\` со скачанным контентом (та же папка, что открывает
  **Downloaded content → Open**), включая `known_servers.json` с закреплёнными TLS-отпечатками.
- **Окно лаунчера** — сам интерфейс лог-файл не пишет. Всё, что он знает, — в уведомлении и в
  последней строке лога хелпера в `The launcher stopped · …`.
- **BeamNG** — `beamng.log` в пользовательской папке игры,
  `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\`, содержит строки клиентского мода (тег `node.`).
  **Консоль диагностики** в игре (Options → NodeMP → Инструменты) показывает сессию вживую.

Сообщая о проблеме, приложите `launcher.log`, точный текст уведомления и название сервера.

## Дополнительно: другая директория

Тестировщики со своей директорией могут перенаправить лаунчер. В порядке приоритета:

1. Переменная окружения `NODEMP_API_BASE`, например `http://localhost:8080`.
2. Файл `directory.url` рядом с `nodemp-launcher.exe` в `%LOCALAPPDATA%\NodeMP`: одна строка с
   базовым URL; строки, начинающиеся с `#`, — комментарии. Лаунчер сам этот файл не пишет;
   остаток от лаунчера до 1.0.0 удаляется при запуске.
3. Встроенный `https://api.nodemp.com`.

Используемый адрес виден в уведомлении `Could not reach NodeMP at …`, когда список не удаётся
загрузить. `NODEMP_LAUNCHER=C:\dev\launcher\bin\Release\Node-Launcher.exe` заставляет лаунчер запускать отдельный исполняемый файл
хелпера вместо встроенного; это для тех, кто собирает хелпер сам.
