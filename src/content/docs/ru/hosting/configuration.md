---
title: Настройки сервера
description: Как устроен server.toml, переменные окружения, параметры командной строки и все настройки сервера со значениями по умолчанию.
---

Все настройки сервера лежат в одном файле — `server.toml` в рабочей папке сервера. Сначала о том,
как файл себя ведёт, потом о настройках, которые меняют чаще всего, а в конце — [все
настройки](#все-настройки), таблица за таблицей.

## Как устроен файл

При первом запуске сервер создаёт короткий файл с двумя таблицами, которые заполняет хост:
`[server]` и `[listing]`.

```toml
# NodeMP server settings: https://docs.nodemp.com/hosting/configuration/
# Environment variables (NODE_PORT, NODE_NAME, ...) win over this file.

[server]
name = "Node Server"
port = 30814
max_players = 8
cars_per_player = 1
map = "/levels/gridmap_v2/info.json"
mods = "content"  # folder of mod zips players download

[listing]
url = ""  # "https://api.nodemp.com" to be listed in the launcher
host_id = ""
host_secret = ""  # or NODE_DIRECTORY_HOST_SECRET, out of this file
description = ""
mode = "freeroam"
tags = ""
preview = ""  # a JPEG or PNG; empty: the map's own
public = true
guests = true  # players without a NodeMP account
```

- **Остальное вы дописываете сами.** Если настройки нет в файле, действует значение по умолчанию.
  Чтобы её поменять, впишите её в нужную таблицу, а если такой таблицы в файле ещё нет, добавьте и
  её. Имена — в таблицах [ниже](#все-настройки).
- **Сервер ваш файл только читает.** Он ничего в нём не дописывает и не меняет, а читает его при
  запуске, так что после правки перезапустите сервер.
- **Ошибки объясняются.** Значение не того типа или вне допустимых пределов сервер заменит
  значением по умолчанию и предупредит в логе. О незнакомом ключе он тоже предупредит и назовёт
  его — так находятся опечатки. Если таблица записана дважды, сервер не запустится. Чаще всего это
  второй `[listing]`, вставленный под тот, что уже есть в файле: перенесите ключи в первый, а
  второй удалите.
- **Списки** (`connection_limit_exempt`, `masked_commands`) можно писать строкой через запятую или
  списком TOML.
- **Файл, созданный до 1.9.0** (с `[General]`, `[Directory]` и так далее), переводится один раз —
  при первом запуске 1.9.0. Сервер записывает его в новом виде с теми же настройками, а старый
  оставляет рядом как `server.toml.old`. Какие имена поменялись, написано на странице
  [Обновление](/ru/hosting/updating/#настройки-с-190).

## Что меняют чаще всего

**Имя, карта и места** — `name`, `map`, `max_players` и `cars_per_player` в `[server]`. Пример — на
странице [Запуск сервера](/ru/hosting/quick-start/#имя-карта-и-места).

**Порт** — `[server] port`, по умолчанию `30814`, один и тот же для TCP и UDP. `address` лучше
оставить `"::"`: так сервер слушает все адреса, IPv4 и IPv6.

**Проверка файлов игры** — `[integrity] verify`:

| Значение | Что проверяется | Сколько ждёт игрок |
|---|---|---|
| `"size"` | Размер каждого файла игры и лишние файлы в её `content/`. По умолчанию. | Около 2 секунд. |
| `"scripts"` | То же плюс контрольные суммы `lua/` и `ui/` игры. Ловит изменённые скрипты. | Около 10 секунд. |
| `"full"` | Контрольные суммы всей игры, около 50 ГБ. Это аудит, а не проверка перед каждым входом. | Минуты. |
| `"strict"` | Вся папка игры, содержимое архивов и пользовательская папка — по эталону чистой установки. | Несколько секунд. См. [Строгая проверка](/ru/hosting/strict-verification/). |
| `"off"` | Сервер ничего не требует, но лаунчер всё равно проверяет `size`. | |

**Место в списке серверов** — таблица `[listing]`, а в ней и ссылки на ваш Discord, правила, сайт и
голосовой чат. Как её заполнить, рассказано на странице [Попасть в список](/ru/hosting/registering/).

**Чат** встроен в сервер. `[chat] max_length`, `rate_per_sec` и `burst` не дают его заспамить:
лишние строки просто не уходят, за чат никого не кикают.

**Плохие соединения.** Если игрок молчит `lag_grace_sec` секунд (8), его машина помечается как
отстающая. Через `disconnect_sec` (30) его отключают, и столько же сервер ждёт, пока оборванное
соединение восстановится. Игрокам с мобильным интернетом или VPN можно дать больше времени:

```toml
[network]
disconnect_sec = 60
```

Больше 600 секунд ставить бесполезно: через 600 секунд лаунчер перестаёт пытаться вернуться. Четыре
таймера должны идти по порядку, иначе сервер не запустится:
`lag_grace_sec < seat_takeover_sec <= seat_release_sec <= disconnect_sec`.

## Переменные окружения

У каждой настройки есть своя переменная окружения, её имя указано в таблицах ниже. Переменная
важнее файла, а `--port` в командной строке важнее их обоих. Секреты вроде `host_secret` лучше
держать в окружении: так они не попадут в файл, который копируют и пересылают.

Несколько переменных к настройкам не относятся:

| Переменная | Что делает |
|---|---|
| `NODE_LUA` | Путь к Lua 5.1 для обфускатора. Нужна на Linux. |
| `NODE_TOOLS_DIR` | Другое место для папки `tools/`. |
| `NODE_PROVIDER_DISABLE_CONFIG` | `true` — не читать `server.toml`, брать всё из окружения. Так работает Docker-образ. |
| `NODE_PROVIDER_IP_ENV`, `NODE_PROVIDER_PORT_ENV` | Для хостинг-панелей: имя переменной, в которой панель передаёт адрес и порт. |
| `NODE_HEARTBEAT_FILE` | Файл, который сервер обновляет, пока работает. По нему Docker проверяет здоровье контейнера. |
| `NODE_FORCE_ANSI` | `1` — оставить цвета, даже если вывод идёт не в терминал. |

## Командная строка

| Параметр | Что делает |
|---|---|
| `--config=FILE` | Какой файл настроек читать. По умолчанию — `server.toml` в рабочей папке. |
| `--port=N` | Порт TCP и UDP. Важнее файла и окружения. |
| `--working-directory=DIR` | Рабочая папка: от неё считаются все относительные пути. |
| `--version` | Показать версию и выйти. |
| `--help` | Показать справку и выйти. |
| `--gen-integrity GAMEDIR` | Создать эталонный манифест для строгой проверки ([подробнее](/ru/hosting/strict-verification/#создать-манифест)). |
| `--bans list`, `--bans remove …` | Показать или снять баны, пока сервер остановлен ([подробнее](/ru/hosting/administration/#баны)). |
| `--obf-selftest` | Проверить, что обфускатор работает. |

Значение можно писать и через пробел: `--port 30815`. Чтобы запустить два сервера на одной машине,
дайте каждому свою рабочую папку и свой порт:

```bash
./Node-Server --working-directory=/srv/nodemp-2 --port=30815
```

## Все настройки

В том порядке, в каком их объявляет сервер. Строки — в кавычках, как в файле.

### `[server]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[server]` | `name` | string | `"Node Server"` | `NODE_NAME` | Имя сервера в списке и в игре. |
| `[server]` | `port` | int | `30814` | `NODE_PORT` | Порт TCP и UDP, к которому подключаются игроки. |
| `[server]` | `max_players` | int | `8` | `NODE_MAX_PLAYERS` | Сколько игроков может быть на сервере одновременно. |
| `[server]` | `cars_per_player` | int | `1` | `NODE_MAX_CARS` | Сколько машин может держать один игрок. |
| `[server]` | `map` | string | `"/levels/gridmap_v2/info.json"` | `NODE_MAP` | Карта: путь к её `info.json`. |
| `[server]` | `mods` | string | `"content"` | `NODE_CONTENT_FOLDER` | Папка с zip-архивами модов, которые скачивают игроки. |
| `[server]` | `address` | string | `"::"` | `NODE_IP` | Адрес, на котором сервер слушает. `"::"` — все адреса, IPv4 и IPv6. Это не публичный адрес. |
| `[server]` | `console` | bool | `false` | `NODE_CONSOLE` | Читать команды консоли со стандартного ввода, даже если терминала нет. |

### `[listing]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[listing]` | `url` | string | `""` | `NODE_DIRECTORY_URL` | Куда сообщать о сервере: `"https://api.nodemp.com"`. Пусто — сервера нет в списке. |
| `[listing]` | `host_id` | string | `""` | `NODE_DIRECTORY_HOST_ID` | Открытая часть ключа сервера. |
| `[listing]` | `host_secret` | string | `""` | `NODE_DIRECTORY_HOST_SECRET` | Секретная часть. Храните её как пароль. |
| `[listing]` | `description` | string | `""` | `NODE_DIRECTORY_DESCRIPTION` | Одно-два предложения под именем в списке. |
| `[listing]` | `mode` | string | `"freeroam"` | `NODE_DIRECTORY_MODE` | Тип сервера, отдельная колонка в списке: `freeroam`, `racing`, `roleplay` и так далее. |
| `[listing]` | `tags` | string | `""` | `NODE_DIRECTORY_TAGS` | До восьми тегов через запятую, по ним игроки фильтруют список. |
| `[listing]` | `preview` | string | `""` | `NODE_DIRECTORY_PREVIEW` | Картинка для списка, JPEG или PNG, не больше 2 МБ. Пусто — картинка самой карты. |
| `[listing]` | `public` | bool | `true` | `NODE_DIRECTORY_PUBLIC` | `false` — не показывать сервер в общем списке. |
| `[listing]` | `guests` | bool | `true` | `NODE_DIRECTORY_TEST_DRIVE` | Пускать игроков без аккаунта. |
| `[listing]` | `fingerprint` | string | `""` | `NODE_DIRECTORY_FINGERPRINT` | Только для собственного каталога серверов. Оставьте пустым. |
| `[listing]` | `ca_file` | string | `""` | `NODE_DIRECTORY_CA_FILE` | Только для собственного каталога серверов. Оставьте пустым. |
| `[listing]` | `admit_when_down` | bool | `false` | `NODE_DIRECTORY_REDEEM_FAIL_OPEN` | Пока NodeMP недоступен: `false` — не пускать, `true` — пускать как непроверенных гостей. |
| `[listing]` | `allow_http` | bool | `false` | `NODE_DIRECTORY_ALLOW_INSECURE` | Разрешить адрес с `http://` в `url`. Не включайте. |
| `[listing]` | `discord` | string | `""` | `NODE_DIRECTORY_LINK_DISCORD` | Приглашение в ваш Discord: `https://discord.gg/…` или `https://discord.com/invite/…`. |
| `[listing]` | `rules` | string | `""` | `NODE_DIRECTORY_LINK_RULES` | Страница с правилами сервера. |
| `[listing]` | `site` | string | `""` | `NODE_DIRECTORY_LINK_SITE` | Сайт сервера. |
| `[listing]` | `donate` | string | `""` | `NODE_DIRECTORY_LINK_DONATE` | Страница, где игроки могут поддержать сервер. |
| `[listing]` | `voice` | string | `""` | `NODE_DIRECTORY_LINK_VOICE` | Голосовой чат: `https://…`, `mumble://…` или `ts3server://…`. |

### `[integrity]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[integrity]` | `verify` | string | `"size"` | `NODE_VERIFY_GAME` | Насколько строго проверять файлы игры у игрока: `off`, `size`, `scripts`, `full` или `strict`. |
| `[integrity]` | `manifests` | string | `"integrity"` | `NODE_INTEGRITY_DIR` | Папка с эталонными манифестами для `strict`. |

### `[network]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[network]` | `tls_cert` | string | `"node_cert.pem"` | `NODE_TLS_CERT` | TLS-сертификат сервера, создаётся при первом запуске. Относительный путь считается от папки с программой. |
| `[network]` | `tls_key` | string | `"node_key.pem"` | `NODE_TLS_KEY` | Закрытый ключ сертификата. |
| `[network]` | `relay_radius` | int | `0` | `NODE_STATE_RELAY_RADIUS` | Отправлять позиции машины только игрокам в этом радиусе, в метрах. `0` — всем. |
| `[network]` | `lag_grace_sec` | int | `8` | `NODE_NETWORK_LAG_GRACE_SEC` | Через сколько секунд тишины игрок считается отстающим. |
| `[network]` | `seat_takeover_sec` | int | `10` | `NODE_NETWORK_AUTH_TAKEOVER_SEC` | Сколько секунд молчащий водитель держит место, прежде чем его сможет занять другой. |
| `[network]` | `seat_release_sec` | int | `30` | `NODE_NETWORK_AUTH_RELEASE_SEC` | Через сколько секунд тишины сервер освобождает место водителя и передаёт машину другому. |
| `[network]` | `disconnect_sec` | int | `30` | `NODE_NETWORK_DISCONNECT_SEC` | Через сколько секунд тишины игрок отключается. Столько же ждут, пока оборванное соединение восстановится. |
| `[network]` | `send_queue_budget_mb` | int | `256` | `NODE_NETWORK_SEND_QUEUE_BUDGET_MB` | Сколько памяти могут занять все исходящие очереди вместе. `0` — без общего предела. |
| `[network]` | `max_connections_per_ip` | int | `32` | `NODE_NETWORK_MAX_CONNECTIONS_PER_IP` | Сколько подключений с одного адреса могут проходить вход одновременно. |
| `[network]` | `max_connections` | int | `256` | `NODE_NETWORK_MAX_CONNECTIONS` | То же для всех адресов вместе. |
| `[network]` | `connection_limit_exempt` | string | `"127.0.0.0/8, ::1/128, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 100.64.0.0/10, fd00::/8"` | `NODE_NETWORK_CONNECTION_LIMIT_EXEMPT` | Диапазоны адресов без лимита на адрес. `""` или `"none"` — без исключений. |
| `[network]` | `handshake_timeout_sec` | int | `20` | `NODE_NETWORK_HANDSHAKE_TIMEOUT_SEC` | Сколько секунд у нового подключения на рукопожатие и начало входа. |
| `[network]` | `download_stall_sec` | int | `60` | `NODE_NETWORK_DOWNLOAD_STALL_SEC` | Загрузка мода обрывается, если столько секунд она не продвигалась. Медленную загрузку не обрывают. |

### `[chat]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[chat]` | `max_length` | int | `256` | `NODE_CHAT_MAX_LENGTH` | Самая длинная строка чата, в байтах, от 16 до 2048. |
| `[chat]` | `rate_per_sec` | int | `2` | `NODE_CHAT_RATE_PER_SEC` | Сколько строк в секунду в среднем может отправлять игрок. Лишние не уходят, никого не кикают. |
| `[chat]` | `burst` | int | `5` | `NODE_CHAT_BURST` | Сколько строк подряд можно отправить, прежде чем включится ограничение. |
| `[chat]` | `log` | bool | `true` | `NODE_CHAT_LOG_TO_CONSOLE` | Показывать чат в консоли и в логе. |
| `[chat]` | `masked_commands` | string | `"login, register, reg, password, passwd, pass, pw, auth, changepassword, setpassword, 2fa, totp, otp, pin, token, apikey"` | `NODE_CHAT_LOG_HIDDEN_COMMANDS` | Команды, аргументы которых пишутся в лог как `***`. `""` — писать всё как есть. |

### `[logs]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[logs]` | `debug` | bool | `false` | `NODE_DEBUG` | Подробный отладочный лог всех частей сервера. |
| `[logs]` | `max_size_mb` | int | `50` | `NODE_LOG_MAX_SIZE_MB` | Начинать новый `server.log`, когда он вырос больше этого размера в МБ, и при каждом запуске. `0` — только при запуске. |
| `[logs]` | `keep` | int | `5` | `NODE_LOG_KEEP` | Сколько старых логов хранить. |
| `[logs]` | `date` | bool | `false` | `NODE_LOG_DATE` | Писать дату перед временем в каждой строке. |
| `[logs]` | `netstats_sec` | int | `15` | `NODE_NETWORK_STATS_INTERVAL_SEC` | Как часто писать в лог строку `netstats` по каждому игроку. `0` — только при выходе. |

### `[sync]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[sync]` | `variant` | string | `""` | `NODE_SYNC_VARIANT` | Для тестов синхронизации: один вариант, от `"A"` до `"D"`, для всех. Пусто — у каждого свой. |
| `[sync]` | `hold_tight` | string | `""` | `NODE_SYNC_HOLD_TIGHT` | `"on"` или `"off"` — включить или выключить всем «Плотно удерживать чужие машины». |
| `[sync]` | `steer_lead` | string | `""` | `NODE_SYNC_STEER_LEAD` | То же для «Упреждение руля». |
| `[sync]` | `verbose_trace` | string | `""` | `NODE_SYNC_VERBOSE_TRACE` | `"on"` включает всем самые подробные логи синхронизации. |
| `[sync]` | `trace_rate` | int | `0` | `NODE_SYNC_TRACE_RATE` | Частота этих логов для всех: `10`, `20` или `60` Гц. `0` — у каждого своя. |

### `[http]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[http]` | `ca_file` | string | `""` | `NODE_HTTP_CA_FILE` | Свой набор корневых сертификатов для HTTPS-запросов плагинов. |
| `[http]` | `insecure` | bool | `false` | `NODE_HTTP_INSECURE` | Не проверять сертификаты в HTTPS-запросах плагинов. Не включайте. |
| `[http]` | `allow_private_networks` | bool | `false` | `NODE_HTTP_ALLOW_PRIVATE_NETWORKS` | Разрешить HTTP-запросам плагинов ходить на локальные и частные адреса. |

### `[resources]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[resources]` | `obfuscate` | bool | `true` | `NODE_OBFUSCATE` | Обфусцировать клиентские скрипты ресурсов. `false` — отправлять как есть. |
| `[resources]` | `trusted` | list | `[]` | `NODE_RESOURCES_TRUSTED` | Ресурсы, которым доступна вся стандартная библиотека Lua: любые файлы, запуск программ, переменные окружения. `"*"` — всем. Остальным доступна только своя папка ([что может ресурс](/ru/plugins/resources/#окружение-lua)). |

### `[experimental]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[experimental]` | `node_grab` | bool | `false` | `NODE_EXPERIMENTAL_NODEGRAB` | Разрешить экспериментальный захват узлов с проверкой на сервере. Каждый захват всё равно должен разрешить плагин. |
