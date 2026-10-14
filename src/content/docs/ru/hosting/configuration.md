---
title: server.toml
description: Настройки, которые хост действительно меняет, как устроены файл и переменные окружения, все настройки со значениями по умолчанию и командная строка.
---

Всё о сервере задаётся в одном файле — `server.toml` в рабочем каталоге сервера. Сначала на этой
странице — горстка настроек, которые трогает большинство хостов, потом — как файл себя ведёт, а в
конце — [все настройки](#все-настройки) и [командная строка](#командная-строка).

## Что вы будете менять

**Имя, карта и размер** (`[General]`):

```toml
[General]
Name = "Friday freeroam"
Map = "/levels/west_coast_usa/info.json"
MaxPlayers = 16
MaxCars = 2
```

- `Name` — то, что игроки видят в списке и в игре.
- `Map` — путь к `info.json` карты: `/levels/<папка>/info.json`. Для своей карты положите её zip в
  `content/` и укажите папку, в которой она лежит внутри zip под `levels/`.
- `MaxPlayers` — сколько игроков может быть на сервере одновременно; `MaxCars` — сколько машин
  может заспавнить каждый.

**Порт** (`[General] Port`, по умолчанию `30814`) используется и для TCP, и для UDP. `IP` остаётся
`"::"` — это значит слушать все адреса, IPv4 и IPv6; менять его стоит, только чтобы привязать сервер
к одной сетевой карте.

**Проверка файлов игры** (`[General] VerifyGame`) решает, насколько тщательно проверять установку
входящего игрока:

| Значение | Что проверяется | Сколько это стоит игроку |
|---|---|---|
| `"size"` (по умолчанию) | Размер каждого файла игры и всё, что добавлено в папку `content/` игры. | Около 2 секунд. |
| `"scripts"` | То же плюс контрольная сумма `lua/` и `ui/` игры; ловит изменённые скрипты. | Около 10 секунд. |
| `"full"` | Контрольная сумма всей установки. | Минуты. Это аудит, а не проверка на каждый вход. |
| `"strict"` | Вся папка игры, содержимое архивов и пользовательская папка игрока — по чистой установке, которую вы один раз описываете. | Несколько секунд. См. [Строгая проверка](/ru/hosting/strict-verification/). |
| `"off"` | Ничего сверх; лаунчер всё равно проверяет `size`. | |

**Попасть в список** — это таблица `[Directory]`: `Url`, `HostId`, `HostSecret` и то, что
показывается в списке (`Description`, `Mode`, `Tags`, `Preview`). Подробно — на странице
[Попасть в список](/ru/hosting/registering/).

**Чат** встроен. `[Chat] MaxLength` (256 байт), `RatePerSec` (2) и `Burst` (5) держат его читаемым;
за слишком частые сообщения никого не кикают, лишние строки просто не отправляются. `LogToConsole`
показывает чат в консоли и в логе, а `LogHiddenCommands` перечисляет команды, аргументы которых
никогда не пишутся в лог (`/login hunter2` превращается в `/login ***`).

**Игроки с нестабильной связью** (`[Network]`): замолчавший игрок помечается как лагающий через
`LagGraceSec` (8 с) и отпускается через `DisconnectSec` (30 с) — столько же даётся оборванному
соединению, чтобы вернуться. Сервер для игроков с мобильным интернетом или VPN может поднять
`DisconnectSec`; четыре таймера должны идти в порядке
`LagGraceSec < AuthTakeoverSec <= AuthReleaseSec <= DisconnectSec`, иначе сервер не запустится.
`MaxConnectionsPerIp` (32) ограничивает, сколько соединений с одного адреса может одновременно
находиться в процессе входа; см.
[неполадки на стороне хоста](/ru/hosting/troubleshooting/#игроков-не-пускают-на-входе).

**Консоль** читает команды, когда сервер запущен в терминале. `[General] Console = true` заставляет
её читать стандартный ввод и без терминала. **Логи**: `[Log] Keep` (5 старых логов) и `MaxSizeMB`
(50).

## Как устроен файл

- **Пишется один раз.** При первом запуске сервер записывает `server.toml` со всеми настройками,
  значениями по умолчанию и комментариями. Дальше он его никогда не переписывает: ваши правки,
  комментарии и порядок остаются. Когда новая версия сервера приносит новую настройку, он добавляет
  только эту строку в конец её таблицы и пишет об этом в лог.
- **Читается при запуске.** Поменяли значение — перезапустите сервер.
- **Ошибки объясняются.** Значение не того типа или вне допустимого диапазона сервер отмечает
  предупреждением и берёт значение по умолчанию. Таблица, встреченная дважды, останавливает сервер
  с фразой, которая называет строку; чаще всего это вторая `[Directory]`, вставленная с сайта:
  `the table [Directory] appears twice. Put the keys into the existing [Directory] table …`.
- **Списки.** `ConnectionLimitExempt` и `LogHiddenCommands` принимают либо строку через запятую,
  либо TOML-список строк.

### Переменные окружения

У каждой настройки есть переменная окружения, и она сильнее файла; в таблице ниже они названы.
`--port=` в командной строке сильнее обоих. Для `HostSecret` окружение — самое подходящее место:
секрет не попадает в файл, который копируют туда-сюда.

Для хостинг-панелей: `NODE_PROVIDER_IP_ENV` и `NODE_PROVIDER_PORT_ENV` называют переменную, в
которой панель передаёт выданные адрес и порт, а `NODE_PROVIDER_DISABLE_CONFIG=true` заставляет
сервер не читать `server.toml` и брать всё из окружения. Образ Docker задаёт как раз последнее.

Несколько переменных — не настройки: `NODE_LUA` указывает Lua 5.1, на которой работает обфускатор,
`NODE_TOOLS_DIR` переносит папку `tools/`, `NODE_FORCE_ANSI=1` сохраняет цвета, когда вывод идёт не
в терминал, а `NODE_HEARTBEAT_FILE` — файл, который сервер обновляет раз в несколько секунд, пока
он здоров (образ Docker использует его для проверки здоровья).

## Все настройки

В том порядке, в каком их объявляет сервер. Строки — в кавычках, как в файле.

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[General]` | `Debug` | bool | `false` | `NODE_DEBUG` | Отладочный лог от всех частей сервера, с потоком в каждой строке. |
| `[General]` | `IP` | string | `"::"` | `NODE_IP` | Адрес, который слушает сервер. `"::"` — все интерфейсы, IPv4 и IPv6. Это не ваш публичный адрес. |
| `[General]` | `Port` | int | `30814` | `NODE_PORT` | Порт TCP и UDP, к которому подключаются игроки. |
| `[General]` | `Name` | string | `"Node Server"` | `NODE_NAME` | Имя сервера, каким его видят игроки. |
| `[General]` | `MaxCars` | int | `1` | `NODE_MAX_CARS` | Сколько машин один игрок может держать заспавненными одновременно. |
| `[General]` | `MaxPlayers` | int | `8` | `NODE_MAX_PLAYERS` | Сколько игроков может быть на сервере одновременно. |
| `[General]` | `Map` | string | `"/levels/gridmap_v2/info.json"` | `NODE_MAP` | Карта — путь к её `info.json`. |
| `[General]` | `VerifyGame` | string | `"size"` | `NODE_VERIFY_GAME` | Насколько тщательно проверять установку игрока: `off`, `size`, `scripts`, `full` или `strict`. |
| `[General]` | `IntegrityDir` | string | `"integrity"` | `NODE_INTEGRITY_DIR` | Папка с описаниями чистой установки (`*.manifest`) для строгой проверки. |
| `[General]` | `Console` | bool | `false` | `NODE_CONSOLE` | Читать команды консоли со стандартного ввода, даже если это не терминал. |
| `[Resources]` | `Obfuscate` | bool | `true` | `NODE_OBFUSCATE` | Запутывать клиентские скрипты, которые плагины отправляют игрокам. `false` отправляет исходный код — удобно при отладке. |
| `[Content]` | `Folder` | string | `"content"` | `NODE_CONTENT_FOLDER` | Папка с zip-модами для входящих игроков. |
| `[Network]` | `TlsCert` | string | `"node_cert.pem"` | `NODE_TLS_CERT` | TLS-сертификат сервера, создаётся при первом запуске. Относительный путь — рядом с исполняемым файлом. |
| `[Network]` | `TlsKey` | string | `"node_key.pem"` | `NODE_TLS_KEY` | Закрытый ключ к нему. |
| `[Network]` | `StateRelayRadius` | int | `0` | `NODE_STATE_RELAY_RADIUS` | Отправлять частые обновления позиции машины только игрокам в пределах стольких метров (во внешней половине — вдвое реже). `0` — всем. |
| `[Network]` | `LagGraceSec` | int | `8` | `NODE_NETWORK_LAG_GRACE_SEC` | Секунд тишины, после которых игрок отмечается как лагающий. Пока у него ничего не отнимают. |
| `[Network]` | `AuthTakeoverSec` | int | `10` | `NODE_NETWORK_AUTH_TAKEOVER_SEC` | Секунд, которые водитель может молчать, прежде чем место за рулём получит другой игрок, если сядет туда. |
| `[Network]` | `AuthReleaseSec` | int | `30` | `NODE_NETWORK_AUTH_RELEASE_SEC` | Секунд тишины, после которых сервер сам освобождает место водителя и отдаёт машину игре другого игрока. |
| `[Network]` | `DisconnectSec` | int | `30` | `NODE_NETWORK_DISCONNECT_SEC` | Секунд тишины, после которых игрока отпускают. Столько же даётся оборванному соединению, чтобы вернуться. |
| `[Network]` | `SendQueueBudgetMB` | int | `256` | `NODE_NETWORK_SEND_QUEUE_BUDGET_MB` | Сколько вместе могут держать исходящие очереди всех игроков, прежде чем самый медленный потеряет состояние машин в очереди, а потом соединение. `0` — только 64 МБ на игрока. |
| `[Network]` | `StatsIntervalSec` | int | `15` | `NODE_NETWORK_STATS_INTERVAL_SEC` | Раз во столько секунд — строка `netstats` в логе на каждого игрока (пинг, трафик, потери, очередь). `0` — только строка при выходе. |
| `[Network]` | `MaxConnectionsPerIp` | int | `32` | `NODE_NETWORK_MAX_CONNECTIONS_PER_IP` | Соединений с одного адреса, которые могут одновременно находиться в процессе входа. Игроки за одним NAT оператора или одним выходом VPN делят адрес. |
| `[Network]` | `MaxConnections` | int | `256` | `NODE_NETWORK_MAX_CONNECTIONS` | Соединений в процессе входа одновременно со всех адресов вместе. |
| `[Network]` | `ConnectionLimitExempt` | string | `"127.0.0.0/8, ::1/128, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 100.64.0.0/10, fd00::/8"` | `NODE_NETWORK_CONNECTION_LIMIT_EXEMPT` | Диапазоны адресов, к которым не применяется `MaxConnectionsPerIp`. `""` или `"none"` — никаких исключений. |
| `[Network]` | `HandshakeTimeoutSec` | int | `20` | `NODE_NETWORK_HANDSHAKE_TIMEOUT_SEC` | Секунд, которые новое соединение получает на защищённое рукопожатие и первые шаги входа. |
| `[Network]` | `DownloadStallSec` | int | `60` | `NODE_NETWORK_DOWNLOAD_STALL_SEC` | Загрузка мода прерывается, если за столько секунд не сдвинулась ни на байт. Медленную не прерывают никогда. |
| `[Sync]` | `Variant` | string | `""` | `NODE_SYNC_VARIANT` | Для тестов синхронизации: закрепить вариант синхронизации клиентского мода (`"A"`–`"D"`) для всех. Пусто — у каждого свой. |
| `[Sync]` | `HoldTight` | string | `""` | `NODE_SYNC_HOLD_TIGHT` | `"on"` или `"off"` закрепляет *Плотно удерживать чужие машины* для всех. Пусто — у каждого своё. |
| `[Sync]` | `SteerLead` | string | `""` | `NODE_SYNC_STEER_LEAD` | `"on"` или `"off"` закрепляет *Упреждение руля* для всех. |
| `[Sync]` | `VerboseTrace` | string | `""` | `NODE_SYNC_VERBOSE_TRACE` | `"on"` включает у всех самые подробные логи синхронизации (около 1 МБ в минуту на каждую машину в поле зрения). |
| `[Sync]` | `TraceRate` | int | `0` | `NODE_SYNC_TRACE_RATE` | Частота подробных логов для всех: `10`, `20` или `60` Гц. `0` — у каждого своя. |
| `[Chat]` | `MaxLength` | int | `256` | `NODE_CHAT_MAX_LENGTH` | Самая длинная строка чата в байтах, от 16 до 2048. |
| `[Chat]` | `RatePerSec` | int | `2` | `NODE_CHAT_RATE_PER_SEC` | Сколько строк (и команд `/`) игрок может отправить в секунду в среднем. Лишние не отправляются; никого не кикают. |
| `[Chat]` | `Burst` | int | `5` | `NODE_CHAT_BURST` | Сколько строк подряд можно отправить, прежде чем вступит `RatePerSec`. |
| `[Chat]` | `LogToConsole` | bool | `true` | `NODE_CHAT_LOG_TO_CONSOLE` | Показывать чат в консоли и в логе по мере появления, включая отклонённые строки. |
| `[Chat]` | `LogHiddenCommands` | string | `"login, register, reg, password, passwd, pass, pw, auth, changepassword, setpassword, 2fa, totp, otp, pin, token, apikey"` | `NODE_CHAT_LOG_HIDDEN_COMMANDS` | Команды, аргументы которых пишутся в лог как `***`. `""` — все команды как набраны. |
| `[Log]` | `MaxSizeMB` | int | `50` | `NODE_LOG_MAX_SIZE_MB` | Начинать новый `server.log`, когда он вырос больше стольких МБ (и при каждом запуске). `0` — только при запуске. |
| `[Log]` | `Keep` | int | `5` | `NODE_LOG_KEEP` | Сколько старых логов хранить. |
| `[Log]` | `Date` | bool | `false` | `NODE_LOG_DATE` | Писать дату перед временем в каждой строке. |
| `[Experimental]` | `NodeGrab` | bool | `false` | `NODE_EXPERIMENTAL_NODEGRAB` | Разрешить экспериментальный нод-граббер с проверкой на сервере. Каждому захвату всё равно нужен плагин, который скажет «да». |
| `[Directory]` | `Url` | string | `""` | `NODE_DIRECTORY_URL` | Куда объявлять сервер: `"https://api.nodemp.com"`. Пусто — сервера нет в списке. |
| `[Directory]` | `HostId` | string | `""` | `NODE_DIRECTORY_HOST_ID` | Открытая половина ключа сервера из вашего аккаунта NodeMP. |
| `[Directory]` | `HostSecret` | string | `""` | `NODE_DIRECTORY_HOST_SECRET` | Секретная половина. Берегите как пароль; в лог не пишется никогда. |
| `[Directory]` | `Fingerprint` | string | `""` | `NODE_DIRECTORY_FINGERPRINT` | Только для своей директории с самоподписанным сертификатом. Оставьте пустым. |
| `[Directory]` | `CaFile` | string | `""` | `NODE_DIRECTORY_CA_FILE` | Только для своей директории за частным центром сертификации. Оставьте пустым. |
| `[Directory]` | `Description` | string | `""` | `NODE_DIRECTORY_DESCRIPTION` | Одно-два предложения под именем в списке. |
| `[Directory]` | `Mode` | string | `"freeroam"` | `NODE_DIRECTORY_MODE` | Тип сервера, показывается столбцом: `freeroam`, `racing`, `roleplay`, … |
| `[Directory]` | `Tags` | string | `""` | `NODE_DIRECTORY_TAGS` | До восьми тегов через запятую, по которым игроки фильтруют. |
| `[Directory]` | `Preview` | string | `""` | `NODE_DIRECTORY_PREVIEW` | JPEG или PNG для списка, не больше 2 МБ. Пусто — собственная картинка своей карты или игровая для стоковой. |
| `[Directory]` | `Public` | bool | `true` | `NODE_DIRECTORY_PUBLIC` | `false` убирает сервер из публичного списка; тем, у кого есть адрес, он всё равно виден онлайн. |
| `[Directory]` | `TestDrive` | bool | `true` | `NODE_DIRECTORY_TEST_DRIVE` | Пускать ли игроков без аккаунта. |
| `[Directory]` | `RedeemFailOpen` | bool | `false` | `NODE_DIRECTORY_REDEEM_FAIL_OPEN` | Пока NodeMP недоступен: `false` отказывает во входе, `true` пускает игроков как непроверенных гостей. |
| `[Directory]` | `AllowInsecure` | bool | `false` | `NODE_DIRECTORY_ALLOW_INSECURE` | Разрешить адрес директории на `http://`. Не включайте: секрет пойдёт открытым текстом. |
| `[Http]` | `CaFile` | string | `""` | `NODE_HTTP_CA_FILE` | Набор CA для HTTPS-запросов плагинов вместо системных корневых сертификатов. Пусто — системные плюс поставляемый `cacert.pem`. |
| `[Http]` | `Insecure` | bool | `false` | `NODE_HTTP_INSECURE` | Не проверять сертификаты в HTTPS-запросах плагинов. Не включайте. |
| `[Http]` | `AllowPrivateNetworks` | bool | `false` | `NODE_HTTP_ALLOW_PRIVATE_NETWORKS` | Разрешить HTTP-запросам плагинов ходить на локальные и частные адреса (вашу локальную сеть, эту машину). |

## Командная строка

Параметры командной строки сильнее `server.toml` и окружения. `Node-Server --help` выводит:

```
Node-Server, the NodeMP game server.

Usage: Node-Server [--config=FILE] [--port=N] [--working-directory=DIR]

  --config=FILE            The server.toml to read (default: server.toml in the
                           working directory). Quote a path with spaces.
  --port=N                 The TCP and UDP port, over server.toml and the
                           environment.
  --working-directory=DIR  Where the server runs: every relative path starts
                           here, --config's included.
  --version                Prints the version and exits.
  --help                   Prints this and exits.
  A value may also follow its option after a space: --port 30815.

Tools (they need no server.toml and do not start the server):

  --gen-integrity GAMEDIR [--out FILE] [--game-version V]
      Writes the reference manifest that VerifyGame = "strict" checks players
      against, from a clean game install at GAMEDIR (the folder that holds
      integrity.json): every file with its size and SHA-256 -- the game's own
      integrity.json leaves some out -- and the table of contents of every
      archive. Hashing a few GB takes under a minute. The file goes to
      integrity/<game version>.manifest in the working directory ([General]
      IntegrityDir) unless --out names another; the version comes from
      integrity.json unless --game-version gives it. Prints the totals and the
      manifest's hash. Run it where the game is installed and copy the file to
      the server.

  --bans list
  --bans remove <ip | nodemp:<id> | <id>>
      Shows or lifts bans while the server is not running. They are kept in
      bans.json in the working directory, one JSON object: each key is a banned
      address ("203.0.113.7", or an IPv6 address without brackets) or a NodeMP
      account as "nodemp:<id>", and each value is
      {"reason": "<what the player is told>", "at": <unix seconds>,
       "name": "<the player's name at the time>"}.
      Stop the server before you edit the file, with this or by hand: a running
      server reads it once, at its first ban check or ban, keeps it in memory
      and writes it back on every new ban.

  --obf-selftest
      Checks that the client-script obfuscator in tools/ runs, prints
      "[obf-selftest] available=1" when it does, and exits.

Examples:
  Node-Server --config=../west-coast.toml
  Node-Server --gen-integrity "C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive"
  Node-Server --bans remove 203.0.113.7
```

Двум серверам на одной машине нужны свои рабочие каталоги (или свои `--config=` и пути) и свои
порты: `Node-Server --working-directory=/srv/nodemp-2 --port=30815`.
