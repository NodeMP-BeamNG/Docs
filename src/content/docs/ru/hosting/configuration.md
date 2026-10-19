---
title: Справочник настроек
description: Все настройки сервера по таблицам, с типом, значением по умолчанию и переменной окружения.
---

Ключи `server.toml` в том порядке, в каком их объявляет сервер. Строки пишутся в кавычках, как в файле. Как устроен файл, переменные окружения и командная строка: [Настройка сервера](/ru/hosting/server-toml/).

## `[server]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[server]` | `name` | string | `"Node Server"` | `NODE_NAME` | Имя сервера в списке и в игре. |
| `[server]` | `port` | int | `30814` | `NODE_PORT` | Порт TCP и UDP, к которому подключаются игроки. |
| `[server]` | `max_players` | int | `8` | `NODE_MAX_PLAYERS` | Сколько игроков может быть на сервере одновременно. |
| `[server]` | `cars_per_player` | int | `1` | `NODE_MAX_CARS` | Сколько машин может быть у одного игрока. |
| `[server]` | `map` | string | `"/levels/gridmap_v2/info.json"` | `NODE_MAP` | Карта: путь к её `info.json`. |
| `[server]` | `mods` | string | `"content"` | `NODE_CONTENT_FOLDER` | Папка с zip-архивами модов, которые скачивают игроки. |
| `[server]` | `address` | string | `"::"` | `NODE_IP` | Адрес, на котором сервер слушает. `"::"` значит все адреса, IPv4 и IPv6. Это не публичный адрес сервера. |
| `[server]` | `console` | bool | `false` | `NODE_CONSOLE` | Читать команды консоли со стандартного ввода, даже если это не терминал, а канал или файл. С терминалом консоль включается сама. |

## `[vehicles]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[vehicles]` | `queue` | string | `"allow"` | `NODE_VEHICLES_QUEUE` | При `"allow"` каждый игрок сам решает, придерживать ли чужие новые машины и правки ([Машины других игроков](/ru/hosting/server-toml/#машины-других-игроков)). При `"off"` каждое изменение строится сразу, как пришло. |
| `[vehicles]` | `queue_max_delay_sec` | int | `0` | `NODE_VEHICLES_QUEUE_MAX_DELAY_SEC` | Не `0`: каждый игрок строит ожидающее не позже чем через столько секунд после первого изменения, что бы он ни выбрал. До `3600`. |
| `[vehicles]` | `edit_interval_sec` | int | `5` | `NODE_VEHICLES_EDIT_INTERVAL_SEC` | Правки одной машины доходят до других игроков не чаще раза в столько секунд, последней конфигурацией. У автора правки машина меняется сразу. `0` отключает ограничение. |
| `[vehicles]` | `spawn_interval_sec` | int | `2` | `NODE_VEHICLES_SPAWN_INTERVAL_SEC` | Новые машины одного игрока не чаще раза в столько секунд. Машину, заказанную раньше, сервер отклоняет с `Wait N s`, и игра пишет *Подождите N с*. Пешеход и замена своей машины не считаются. `0` отключает ограничение. |

## `[listing]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[listing]` | `url` | string | `""` | `NODE_DIRECTORY_URL` | Куда сообщать о сервере: `"https://api.nodemp.com"`. Пусто значит, что сервера нет в списке. |
| `[listing]` | `host_id` | string | `""` | `NODE_DIRECTORY_HOST_ID` | Открытая часть ключа сервера. |
| `[listing]` | `host_secret` | string | `""` | `NODE_DIRECTORY_HOST_SECRET` | Секретная часть. Храните её как пароль. |
| `[listing]` | `description` | string | `""` | `NODE_DIRECTORY_DESCRIPTION` | Одно-два предложения под именем в списке. |
| `[listing]` | `mode` | string | `"freeroam"` | `NODE_DIRECTORY_MODE` | Тип сервера, отдельная колонка в списке: `freeroam`, `racing`, `roleplay` и так далее. |
| `[listing]` | `tags` | string | `""` | `NODE_DIRECTORY_TAGS` | Теги через запятую, по ним игроки фильтруют список ([сколько и какой длины](/ru/hosting/registering/#как-сервер-выглядит-в-списке)). |
| `[listing]` | `preview` | string | `""` | `NODE_DIRECTORY_PREVIEW` | Своя картинка для списка ([Картинка](/ru/hosting/registering/#картинка)). Пусто значит картинку самой карты. |
| `[listing]` | `public` | bool | `true` | `NODE_DIRECTORY_PUBLIC` | `false` убирает сервер из общего списка. |
| `[listing]` | `guests` | bool | `true` | `NODE_DIRECTORY_TEST_DRIVE` | Пускать игроков без аккаунта. |
| `[listing]` | `fingerprint` | string | `""` | `NODE_DIRECTORY_FINGERPRINT` | Только для собственного каталога серверов. Оставьте пустым. |
| `[listing]` | `ca_file` | string | `""` | `NODE_DIRECTORY_CA_FILE` | Только для собственного каталога серверов. Оставьте пустым. |
| `[listing]` | `admit_when_down` | bool | `false` | `NODE_DIRECTORY_REDEEM_FAIL_OPEN` | Пока NodeMP недоступен, `false` не пускает игроков, а `true` пускает их как непроверенных гостей, если `guests = true`. |
| `[listing]` | `allow_http` | bool | `false` | `NODE_DIRECTORY_ALLOW_INSECURE` | Разрешить адрес с `http://` в `url`. Не включайте. |
| `[listing]` | `discord` | string | `""` | `NODE_DIRECTORY_LINK_DISCORD` | Приглашение в ваш Discord. Какие ссылки принимает список: [Ссылки](/ru/hosting/registering/#ссылки). |
| `[listing]` | `rules` | string | `""` | `NODE_DIRECTORY_LINK_RULES` | Страница с правилами сервера. |
| `[listing]` | `site` | string | `""` | `NODE_DIRECTORY_LINK_SITE` | Сайт сервера. |
| `[listing]` | `donate` | string | `""` | `NODE_DIRECTORY_LINK_DONATE` | Страница, где игроки могут поддержать сервер. |
| `[listing]` | `voice` | string | `""` | `NODE_DIRECTORY_LINK_VOICE` | Голосовой чат. |

## `[integrity]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[integrity]` | `verify` | string | `"size"` | `NODE_VERIFY_GAME` | Насколько строго проверять файлы игры у игрока: `off`, `size`, `scripts`, `full` или `strict`. |
| `[integrity]` | `manifests` | string | `"integrity"` | `NODE_INTEGRITY_DIR` | Папка с эталонными манифестами для `strict`, от рабочей папки. |
| `[integrity]` | `recheck_sec` | int | `600` | `NODE_INTEGRITY_RECHECK_SEC` | При `strict` раз во сколько секунд файлы каждого игрока проверяются снова во время сессии. `0` отключает повторную проверку, а значения от `1` до `59` считаются за `60`. |

## `[network]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[network]` | `tls_cert` | string | `"node_cert.pem"` | `NODE_TLS_CERT` | TLS-сертификат сервера, создаётся при первом запуске. Относительный путь считается от папки с программой. |
| `[network]` | `tls_key` | string | `"node_key.pem"` | `NODE_TLS_KEY` | Закрытый ключ сертификата. |
| `[network]` | `relay_radius` | int | `0` | `NODE_STATE_RELAY_RADIUS` | Отправлять позиции машины только игрокам в этом радиусе, в метрах. `0` значит всем. |
| `[network]` | `lag_grace_sec` | int | `8` | `NODE_NETWORK_LAG_GRACE_SEC` | Через сколько секунд тишины игрок считается отстающим. |
| `[network]` | `seat_takeover_sec` | int | `10` | `NODE_NETWORK_AUTH_TAKEOVER_SEC` | Сколько секунд молчащий водитель держит место, прежде чем его сможет занять другой игрок. |
| `[network]` | `seat_release_sec` | int | `30` | `NODE_NETWORK_AUTH_RELEASE_SEC` | Через сколько секунд тишины сервер освобождает место водителя и передаёт машину другому. |
| `[network]` | `disconnect_sec` | int | `30` | `NODE_NETWORK_DISCONNECT_SEC` | Через сколько секунд тишины игрок отключается. Столько же сервер ждёт, пока оборванное соединение восстановится. |
| `[network]` | `send_queue_budget_mb` | int | `256` | `NODE_NETWORK_SEND_QUEUE_BUDGET_MB` | Сколько памяти могут занять все исходящие очереди вместе. `0` убирает общий предел, остаётся предел 64 МБ на игрока. |
| `[network]` | `max_connections_per_ip` | int | `32` | `NODE_NETWORK_MAX_CONNECTIONS_PER_IP` | Сколько подключений с одного адреса могут проходить вход одновременно. |
| `[network]` | `max_connections` | int | `256` | `NODE_NETWORK_MAX_CONNECTIONS` | То же для всех адресов вместе. |
| `[network]` | `connection_limit_exempt` | string | `"127.0.0.0/8, ::1/128, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 100.64.0.0/10, fd00::/8"` | `NODE_NETWORK_CONNECTION_LIMIT_EXEMPT` | Диапазоны адресов без лимита на адрес. Они всё равно входят в `max_connections`. `""` или `"none"` убирают исключения. |
| `[network]` | `handshake_timeout_sec` | int | `20` | `NODE_NETWORK_HANDSHAKE_TIMEOUT_SEC` | Сколько секунд у нового подключения на TLS-рукопожатие и на каждый из первых кадров входа. |
| `[network]` | `download_stall_sec` | int | `60` | `NODE_NETWORK_DOWNLOAD_STALL_SEC` | Загрузка мода обрывается, если столько секунд игрок не принял ни килобайта. Медленную загрузку не обрывают. |

## `[queue]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[queue]` | `enabled` | bool | `true` | `NODE_QUEUE_ENABLED` | Когда сервер заполнен, игроки с аккаунтом ждут в [очереди на вход](/ru/hosting/join-queue/), а не получают отказ. Работает только на сервере в списке (`[listing] url`): там проверяются аккаунты. |
| `[queue]` | `max_waiting` | int | `50` | `NODE_QUEUE_MAX_WAITING` | Сколько игроков может ждать одновременно, от 0 до 1000. `0` значит, что не ждёт никто. |
| `[queue]` | `max_waiting_per_ip` | int | `1` | `NODE_QUEUE_MAX_WAITING_PER_IP` | Сколько может ждать с одного адреса, от 1 до 1000. Адреса из `[network] connection_limit_exempt` не ограничены. |
| `[queue]` | `downloads_while_waiting` | int | `3` | `NODE_QUEUE_DOWNLOADS_WHILE_WAITING` | Сколько ждущих скачивают моды одновременно, от 1 до 64, по порядку очереди. |
| `[queue]` | `max_no_shows` | int | `3` | `NODE_QUEUE_MAX_NO_SHOWS` | После стольких неявок за `no_show_window_min` аккаунт не может встать в очередь на `no_show_bar_min` минут. Неявка значит, что игрок получил место и ушёл, не дойдя до мира. `0` отключает запрет. |
| `[queue]` | `no_show_window_min` | int | `60` | `NODE_QUEUE_NO_SHOW_WINDOW_MIN` | За сколько минут считаются неявки, от 1 до 10080. |
| `[queue]` | `no_show_bar_min` | int | `30` | `NODE_QUEUE_NO_SHOW_BAR_MIN` | На сколько минут очередь закрывается для такого аккаунта, до 10080. `0` значит, что не закрывается. |

## `[chat]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[chat]` | `max_length` | int | `256` | `NODE_CHAT_MAX_LENGTH` | Самая длинная строка чата, в байтах. Сервер приводит значение к диапазону от 16 до 2048. |
| `[chat]` | `rate_per_sec` | int | `2` | `NODE_CHAT_RATE_PER_SEC` | Сколько строк в секунду в среднем может отправлять игрок, не меньше 1. Лишние строки не уходят, игрока не кикают. |
| `[chat]` | `burst` | int | `5` | `NODE_CHAT_BURST` | Сколько строк подряд можно отправить, прежде чем включится ограничение, не меньше 1. |
| `[chat]` | `log` | bool | `true` | `NODE_CHAT_LOG_TO_CONSOLE` | Показывать чат в консоли и в логе. |
| `[chat]` | `masked_commands` | string | `"login, register, reg, password, passwd, pass, pw, auth, changepassword, setpassword, 2fa, totp, otp, pin, token, apikey"` | `NODE_CHAT_LOG_HIDDEN_COMMANDS` | Команды, аргументы которых пишутся в лог как `***`. Имена пишутся без `/`, регистр не важен. `""` значит писать всё как есть. |

## `[logs]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[logs]` | `debug` | bool | `false` | `NODE_DEBUG` | Подробный отладочный лог всех частей сервера. |
| `[logs]` | `details` | bool | `false` | `NODE_LOG_DETAILS` | Выводить в консоль статистику и служебные строки, которые иначе идут только в `logs/server.log`, например `netstats`. |
| `[logs]` | `max_size_mb` | int | `50` | `NODE_LOG_MAX_SIZE_MB` | Начинать новый `server.log`, когда он вырос больше этого размера в МБ, и при каждом запуске. `0` значит только при запуске. |
| `[logs]` | `keep` | int | `5` | `NODE_LOG_KEEP` | Сколько старых логов хранить. |
| `[logs]` | `date` | bool | `false` | `NODE_LOG_DATE` | Писать дату перед временем в каждой строке. |
| `[logs]` | `netstats_sec` | int | `15` | `NODE_NETWORK_STATS_INTERVAL_SEC` | Как часто писать в лог строку `netstats` по каждому игроку. `0` значит только при выходе игрока. |

## `[http]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[http]` | `ca_file` | string | `""` | `NODE_HTTP_CA_FILE` | Свой набор корневых сертификатов для HTTPS-запросов плагинов вместо системного. |
| `[http]` | `insecure` | bool | `false` | `NODE_HTTP_INSECURE` | Не проверять сертификаты в HTTPS-запросах плагинов. Не включайте. |
| `[http]` | `allow_private_networks` | bool | `false` | `NODE_HTTP_ALLOW_PRIVATE_NETWORKS` | Разрешить HTTP-запросам плагинов ходить на локальные и частные адреса. |

## `[resources]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[resources]` | `obfuscate` | bool | `true` | `NODE_OBFUSCATE` | Обфусцировать клиентские скрипты плагинов. `false` отправляет их как есть. |
| `[resources]` | `trusted` | string | `""` | `NODE_RESOURCES_TRUSTED` | Плагины, которым доступна вся стандартная библиотека Lua: любые файлы, запуск программ, переменные окружения. `"*"` доверяет всем. Остальным доступна только своя папка ([что может плагин](/ru/plugins/resources/)). |

## `[experimental]`

| Секция | Ключ | Тип | По умолчанию | Переменная | Что делает |
|---|---|---|---|---|---|
| `[experimental]` | `node_grab` | bool | `false` | `NODE_EXPERIMENTAL_NODEGRAB` | Разрешить экспериментальный захват узлов с проверкой на сервере. Каждый захват всё равно должен разрешить плагин. |
