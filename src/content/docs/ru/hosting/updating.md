---
title: Обновление сервера
description: Как узнать версию, поставить новый релиз на Windows, Linux и в Docker, что переживает обновление и когда игрокам нужен новый лаунчер.
---

Обновление заменяет программу и папки, которые идут вместе с ней (`tools/`, `modules/`,
`examples/`), или Docker-образ. Всё остальное — ваши данные, они остаются: `server.toml`,
TLS-сертификат, ресурсы, моды, хранилище, баны.

## Какая версия сейчас

```bash
./Node-Server --version
```

Команда печатает, например, `Node-Server v1.9.0`. Та же версия видна в заставке при запуске.

## Где брать релизы

Релизы сервера — это теги `server-v…` на
[GitHub](https://github.com/NodeMP-BeamNG/releases/releases). В описании каждого релиза — что
изменилось, поменялись ли значения по умолчанию и нужен ли игрокам новый лаунчер. Прочитайте его до
обновления.

## Windows

1. Остановите сервер.
2. Скачайте новый архив и распакуйте его в ту же папку поверх старых файлов. Проводник спросит про
   замену — соглашайтесь.
3. Запустите сервер и проверьте версию в заставке.

Из PowerShell распаковать с заменой можно так:

```powershell
$zip = "$HOME\Downloads\Node-Server-1.9.0-windows-x64.zip"
Expand-Archive $zip -DestinationPath C:\NodeMP -Force
```

Без `-Force` команда откажется перезаписывать файлы.

## Linux

Со службой из страницы [Сервер на Linux](/ru/hosting/linux/#служба-systemd):

```bash
cd /tmp
url=https://github.com/NodeMP-BeamNG/releases/releases/download/server-v1.9.0
curl -LO "$url/Node-Server-1.9.0-linux-x64.tar.gz"
curl -LO "$url/Node-Server-1.9.0-linux-x64.tar.gz.sha256"
sha256sum -c Node-Server-1.9.0-linux-x64.tar.gz.sha256
```

Затем остановите службу, распакуйте архив поверх и запустите снова:

```bash
sudo systemctl stop nodemp
sudo tar -xzf Node-Server-1.9.0-linux-x64.tar.gz -C /opt/nodemp
sudo chown -R nodemp:nodemp /opt/nodemp
sudo systemctl start nodemp
```

Распаковка поверх заменяет ровно то, что есть в архиве. Ваша папка `resources/`, в том числе копии
примеров, в архив не входит и не трогается.

## Docker

Загрузите новый образ и укажите его тег:

```bash
docker load -i nodemp-server-v1.9.0-image.tar
```

В `compose.yaml` поменяйте строку `image:` на новый тег и выполните `docker compose up -d`. С
`docker run` удалите старый контейнер и запустите новый с тем же `-v` и теми же переменными. Папка
`data/` не меняется. Чтобы откатиться, верните прежний тег.

## Что переживает обновление

- **`server.toml`** остаётся как есть. Новая настройка из новой версии берёт значение по умолчанию,
  пока вы не впишете её в файл, — сам сервер её не дописывает. В Docker файла нет: новая настройка
  берёт значение по умолчанию, пока вы не зададите её переменную. Единственное исключение — переход
  на 1.9.0, о нём ниже.
- **`node_cert.pem` и `node_key.pem`** в архив не входят и создаются, только если их нет. Берегите
  их: игроки, заходившие по адресу, запомнили сертификат и не подключатся к серверу с другим.
- **`resources/`, `content/`, `storage/`, `bans.json`** — ваши, обновление их не трогает. Если ваш
  ресурс использует `db.lua` модуля базы данных, скопируйте в него новый `modules/db.lua`.
- **`integrity/`** привязан к версии игры, а не сервера. После обновления BeamNG его нужно сделать
  заново ([Строгая проверка](/ru/hosting/strict-verification/#после-обновления-игры)).
- **Нативные модули** в `modules/` проверяются при загрузке. Модуль, собранный под несовместимую
  версию интерфейса, сервер не загрузит и попросит пересобрать. Lua-ресурсы пересобирать не нужно.

Начиная с сервера 1.8.0 у сервера нет своих команд чата, их добавляют ресурсы. Ресурс, который
вызывал `node.commands`, упадёт на этой строке с ошибкой `attempt to index a nil value (field
'commands')`. Обновите его или возьмите за основу `examples/chat-commands`
([Чат и команды](/ru/plugins/chat/)).

## Настройки с 1.9.0

В сервере 1.9.0 у `server.toml` новый вид: ключи строчными буквами, а таблицы названы по тому, что
они настраивают. Переделывать файл вручную не нужно.

- При первом запуске 1.9.0 сервер переписывает файл старого вида в новый с теми же настройками, а
  старый оставляет рядом как `server.toml.old`. В логе будет строка
  `server.toml was in the legacy layout: rewritten in the new one with the same settings`.
- В новом файле есть `[server]` и `[listing]`, как в только что созданном, и все остальные
  настройки, значение которых отличалось от значения по умолчанию. Ключ, который сервер не читает,
  не переносится, и лог его называет.
- Переменные `NODE_*` остались прежними, так что сервер, настроенный через них, в том числе
  Docker-образ, ничего не заметит.
- Если сервер не может записать новый файл, он сообщит об этом в логе и прочитает старый как есть.

В старых инструкциях попадаются старые имена. Пишите новые: таблица со старым именем в новом файле
сработает, но сервер тогда переведёт файл ещё раз, выбросит ваши комментарии в нём и заменит
`server.toml.old`. Куда переехал каждый ключ:

| До 1.9.0 | С 1.9.0 |
|---|---|
| `[General] Name` | `[server] name` |
| `[General] Port` | `[server] port` |
| `[General] MaxPlayers` | `[server] max_players` |
| `[General] MaxCars` | `[server] cars_per_player` |
| `[General] Map` | `[server] map` |
| `[Content] Folder` | `[server] mods` |
| `[General] IP` | `[server] address` |
| `[General] Console` | `[server] console` |
| `[Directory] Url` | `[listing] url` |
| `[Directory] HostId` | `[listing] host_id` |
| `[Directory] HostSecret` | `[listing] host_secret` |
| `[Directory] Description` | `[listing] description` |
| `[Directory] Mode` | `[listing] mode` |
| `[Directory] Tags` | `[listing] tags` |
| `[Directory] Preview` | `[listing] preview` |
| `[Directory] Public` | `[listing] public` |
| `[Directory] TestDrive` | `[listing] guests` |
| `[Directory] Fingerprint` | `[listing] fingerprint` |
| `[Directory] CaFile` | `[listing] ca_file` |
| `[Directory] RedeemFailOpen` | `[listing] admit_when_down` |
| `[Directory] AllowInsecure` | `[listing] allow_http` |
| `[General] VerifyGame` | `[integrity] verify` |
| `[General] IntegrityDir` | `[integrity] manifests` |
| `[Network] TlsCert` | `[network] tls_cert` |
| `[Network] TlsKey` | `[network] tls_key` |
| `[Network] StateRelayRadius` | `[network] relay_radius` |
| `[Network] LagGraceSec` | `[network] lag_grace_sec` |
| `[Network] AuthTakeoverSec` | `[network] seat_takeover_sec` |
| `[Network] AuthReleaseSec` | `[network] seat_release_sec` |
| `[Network] DisconnectSec` | `[network] disconnect_sec` |
| `[Network] SendQueueBudgetMB` | `[network] send_queue_budget_mb` |
| `[Network] MaxConnectionsPerIp` | `[network] max_connections_per_ip` |
| `[Network] MaxConnections` | `[network] max_connections` |
| `[Network] ConnectionLimitExempt` | `[network] connection_limit_exempt` |
| `[Network] HandshakeTimeoutSec` | `[network] handshake_timeout_sec` |
| `[Network] DownloadStallSec` | `[network] download_stall_sec` |
| `[Chat] MaxLength` | `[chat] max_length` |
| `[Chat] RatePerSec` | `[chat] rate_per_sec` |
| `[Chat] Burst` | `[chat] burst` |
| `[Chat] LogToConsole` | `[chat] log` |
| `[Chat] LogHiddenCommands` | `[chat] masked_commands` |
| `[General] Debug` | `[logs] debug` |
| `[Log] MaxSizeMB` | `[logs] max_size_mb` |
| `[Log] Keep` | `[logs] keep` |
| `[Log] Date` | `[logs] date` |
| `[Network] StatsIntervalSec` | `[logs] netstats_sec` |
| `[Sync] Variant` | `[sync] variant` |
| `[Sync] HoldTight` | `[sync] hold_tight` |
| `[Sync] SteerLead` | `[sync] steer_lead` |
| `[Sync] VerboseTrace` | `[sync] verbose_trace` |
| `[Sync] TraceRate` | `[sync] trace_rate` |
| `[Http] CaFile` | `[http] ca_file` |
| `[Http] Insecure` | `[http] insecure` |
| `[Http] AllowPrivateNetworks` | `[http] allow_private_networks` |
| `[Resources] Obfuscate` | `[resources] obfuscate` |
| `[Experimental] NodeGrab` | `[experimental] node_grab` |

## Когда игрокам нужен новый лаунчер

Лаунчер и сервер говорят по протоколу с номером версии. Сервер 1.9.0 говорит на v23, как и
предыдущие версии: лаунчеры с версии 1.1.23 и клиентские моды с версии 1.6.25 заходят на него как
раньше. Если релиз меняет протокол, в его описании это выделено, а старый лаунчер получает отказ с
просьбой обновиться. Лаунчер сам предлагает **Обновить сейчас**, а клиентский мод обновляется перед
каждым входом. Обновляйте сервер тогда же, когда игрокам приходит новый лаунчер.
