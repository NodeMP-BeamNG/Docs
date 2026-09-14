---
title: Устранение неполадок
description: Все сообщения лаунчера при неудачном подключении с причиной и решением, где лежат логи и как тестировщики направляют лаунчер на другую директорию.
---

О проблемах лаунчер сообщает уведомлениями внизу окна; уведомление держится несколько секунд.
Каждое сообщение начинается с префикса, который говорит, какая часть отказала:

| Префикс | Что отказало |
|---|---|
| `Could not join · …` | Проверка клиентского мода, и пригодного `NodeMP.zip` на диске нет. |
| `Could not start the launcher · …` | Не удалось запустить процесс хелпера. |
| `Could not connect · …` | Хелпер не смог достучаться до сервера. |
| `Disconnected · …` | Сервер отказал или завершил сессию; текст — названная им причина. |
| `The launcher stopped · …` | Хелпер завершился во время подключения; текст — последняя строка его лога. |
| `Session ended · …` | Игра уже работала, когда сессия закончилась. |

## Подключение не удаётся

Любое сообщение `Could not join · …` означает, что `NodeMP.zip` на диске ещё нет; когда он
установлен, те же сбои показываются как `Client mod could not be updated · joining with the
installed copy`.

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
| `Disconnected · Protocol version mismatch: launcher speaks v17, server speaks v16 - update the outdated side` | Лаунчер и сервер говорят на разных версиях сетевого протокола. | С лаунчером 1.0.0 устарел сервер; сообщите его хосту. |
| `Disconnected · This server requires a NodeMP account: sign in to the launcher and join again` | Вы в режиме Test Drive, а сервер не принимает гостей (*Account required*). | **Settings → Account → Sign in** или фильтр *No account needed*. |
| `Disconnected · Your join ticket was not accepted (join ticket invalid or expired). Join again from the launcher to get a new one` | Билет одноразовый и живёт меньше минуты; подключение с другого IP тоже отклоняется. | Подключитесь снова из лаунчера. |
| `Disconnected · The server could not verify your account with the directory (…). Try again in a moment` | Сервер не смог связаться с директорией. | Повторите через минуту. |
| `Disconnected · Server full!`, `Disconnected · You are banned from this server`, `Disconnected · The server is still starting, please try joining again later.` | То, что написано. | Фильтр *Free slots*; обратитесь к хосту; подождите минуту. |
| `Disconnected · Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again. …` | Сервер проверяет файлы игры, а ваши отличаются от манифеста игры. | Проверьте файлы игры в Steam. |
| `Disconnected · Invalid mod "…"`, `Disconnected · Failed to verify "…"`, `Disconnected · Server cannot find …` | Файл контента, объявленный сервером, повреждён или отсутствует на сервере. | Сообщите хосту. Удаление файла в **Content** заставит скачать его заново. |

Если игра уже была на экране, та же причина приходит и как `Session ended · …`, а игра
показывает *The session has ended* с этой причиной. Все причины, которые может прислать
сервер, перечислены в разделе [Коды ошибок](/ru/reference/error-codes/).

## Вход в аккаунт

| Сообщение | Причина | Решение |
|---|---|---|
| `Enter a username and a password of at least four characters.` | Собственная проверка формы. | Заполните оба поля. |
| `invalid username or password` | Неверные учётные данные. | Сбросьте пароль на [nodemp.com/forgot](https://nodemp.com/forgot). |
| `please verify your e-mail first` | Ссылка подтверждения не была открыта. | Откройте её; она действует недолго, поэтому зарегистрируйтесь заново под другим именем, если ссылка пропала. |
| `username must be 3-24 chars [A-Za-z0-9_-]`, `password must be 8-200 chars`, `already exists` | Правила директории для нового аккаунта. | Выберите другое имя или более длинный пароль. |
| `two-factor code required or invalid` | У аккаунта включена двухфакторная аутентификация; в лаунчере 1.0.0 нет поля для кода. | Играйте как Test Drive или используйте аккаунт без двухфакторной аутентификации. |
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
