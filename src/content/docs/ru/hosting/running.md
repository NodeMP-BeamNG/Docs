---
title: Запуск сервера
description: Node-Server как служба systemd или сервис Docker Compose — где лежат файлы, как читать логи, корректно останавливать и что резервировать.
---

Эта страница предполагает, что сервер уже запускается вручную, как в
[быстром старте](/ru/hosting/quick-start/). Она превращает это в нечто, переживающее
перезагрузку, и перечисляет файлы, за которые отвечаете вы.

## Файлы и папки

Сервер строит пути от двух точек: **рабочего каталога**, в котором запущен, и **папки
исполняемого файла**. Когда вы запускаете его из его собственной папки, как в быстром старте,
это одно и то же место.

| Путь | Относительно | Что это |
|---|---|---|
| `server.toml` | рабочий каталог (или `--config=`) | Конфигурация, перезаписывается при каждом запуске. |
| `resources/<name>/` | рабочий каталог | Ресурсы: серверные скрипты и передаваемые игрокам клиентские скрипты. |
| `content/` | рабочий каталог (`[Content] Folder`) | Zip-архивы клиентских модов и кэш хешей `content/mods.json`. |
| `storage/<store>.json`, `.log` | рабочий каталог | Постоянные данные, которые ресурсы хранят через API хранилища. |
| `bans.json` | рабочий каталог | Заблокированные адреса и аккаунты ([Баны](#баны)). |
| `logs/server.log`, `logs/server.old.log` | рабочий каталог | Лог текущего и предыдущего запуска. |
| `node_cert.pem`, `node_key.pem` | папка исполняемого файла (`[Network] TlsCert`, `TlsKey`) | TLS-идентичность сервера. |
| `modules/` | папка исполняемого файла | Нативные модули (`.so`, `.dll`). |
| `tools/` | папка исполняемого файла (или `NODE_TOOLS_DIR`) | Обфускатор и, на Windows, его интерпретатор Lua. |
| `.obfcache/` | рядом с `tools/` | Кэш обфусцированных клиентских скриптов; можно удалять. |

`--working-directory=/path` меняет первую группу без `cd`; `--config=` переносит только файл
конфигурации.

## Linux: systemd

Дайте серверу своего пользователя и папку, затем unit, который перезапускает его и передаёт
две нужные ему переменные: интерпретатор Lua для обфускации и, если вы держите ключ сервера вне
`server.toml`, переменные `NODE_DIRECTORY_*` из файла, доступного только root.

```bash
sudo useradd -r -s /usr/sbin/nologin -d /opt/nodemp nodemp
sudo chown -R nodemp:nodemp /opt/nodemp
sudo install -m 600 /dev/null /etc/nodemp.env   # optional: NODE_DIRECTORY_URL, _HOST_ID, _HOST_SECRET
```

`/etc/systemd/system/nodemp-server.service`:

```ini
[Unit]
Description=NodeMP game server
After=network-online.target
Wants=network-online.target

[Service]
User=nodemp
Group=nodemp
WorkingDirectory=/opt/nodemp
Environment=NODE_LUA=/usr/bin/lua5.1
EnvironmentFile=-/etc/nodemp.env
ExecStart=/opt/nodemp/Node-Server
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nodemp-server
journalctl -u nodemp-server -f
```

Строки в `EnvironmentFile` имеют вид `NAME=value` без кавычек. Переменные перекрывают те же
ключи в `server.toml`, поэтому секрет из `/etc/nodemp.env` никогда не попадает в файл.

## Windows

Запустите `Node-Server.exe` из оболочки, открытой в его папке, и оставьте окно открытым; Ctrl+C
останавливает сервер. Чтобы сервер стартовал вместе с машиной, создайте задачу в планировщике
заданий, которая запускает `C:\NodeMP\Node-Server.exe` с полем *Start in* (рабочая папка), равным
`C:\NodeMP`, при запуске системы, независимо от того, вошёл ли пользователь. Прилагаемый
`tools\lua515\lua5.1.exe` находится автоматически; переменная окружения не нужна.

## Docker Compose

Образ настраивается целиком переменными `NODE_*` и хранит состояние в `/data`. Этот сервис — та
форма, в которой работает официальный сервер:

```yaml
services:
  gameserver:
    image: ghcr.io/nodemp-beamng/server:v1.2.0
    restart: unless-stopped
    ports:
      - "30814:30814/tcp"
      - "30814:30814/udp"
    environment:
      NODE_NAME: My server
      NODE_MAP: /levels/west_coast_usa/info.json
      NODE_MAX_PLAYERS: "16"
      NODE_MAX_CARS: "2"
      NODE_VERIFY_GAME: size
      NODE_TLS_CERT: /data/tls/node_cert.pem
      NODE_TLS_KEY: /data/tls/node_key.pem
      NODE_DIRECTORY_URL: https://api.nodemp.com
      NODE_DIRECTORY_HOST_ID: ${NODE_DIRECTORY_HOST_ID}
      NODE_DIRECTORY_HOST_SECRET: ${NODE_DIRECTORY_HOST_SECRET}
    volumes:
      - ./data:/data
```

Положите два секрета в файл `.env` рядом с `compose.yaml` (`NODE_DIRECTORY_HOST_ID=…`,
`NODE_DIRECTORY_HOST_SECRET=…`, права 600), создайте папку данных для пользователя контейнера и
запустите:

```bash
mkdir -p data && sudo chown 10001:10001 data
docker compose up -d
docker compose logs -f gameserver
```

Две TLS-переменные в контейнере обязательны: папка исполняемого файла внутри образа доступна
только для чтения, поэтому сертификат и ключ должны лежать на томе. Чтобы изменить переменную,
отредактируйте файл и снова выполните `docker compose up -d`; Compose пересоздаст контейнер, а
`data/` сохранится. Файлы, которые вы копируете в `data/resources/` или `data/content/`, должны
быть доступны для чтения пользователю с id 10001 (`sudo chown -R 10001:10001 data`), а контент
индексируется при запуске, поэтому после добавления архива перезапустите:
`docker compose restart gameserver`.

Консоли нет: процесс ничего не читает со стандартного ввода — ни в контейнере, ни вне его.
Администрирование выполняется через ресурсы — команды чата вроде тех, что в
[Рецептах](/ru/plugins/recipes/#кик-и-бан-с-причиной), — а для банов через файл, описанный
[ниже](#баны).

## Баны

Баны живут в `bans.json` в рабочем каталоге. Файла нет до первого бана; сервер читает его один раз
при запуске и записывает обратно после каждого нового бана. Это один JSON-объект, ключи которого —
заблокированный IP-адрес (`"203.0.113.7"` или IPv6-адрес без скобок) либо аккаунт NodeMP в виде
`"nodemp:<id аккаунта>"`, а значения несут причину, которую видит игрок, время и имя на тот момент:

```json
{
  "203.0.113.7": { "reason": "Spamming", "at": 1789558100, "name": "Bob" },
  "nodemp:108": { "reason": "Spamming", "at": 1789558100, "name": "Bob" }
}
```

Бан подключённого игрока через `node.bans.add(player)` или `player:ban()` записывает две записи —
адрес и аккаунт; бан голого адреса или id аккаунта записывает одну. Игрок, чей адрес или аккаунт
есть в файле, получает отказ у двери с сохранённой причиной или с `You are banned from this server`,
если причина пуста. Лог запуска считает загруженное:
`2 banned IPs and 1 banned account loaded from bans.json`.

Чтобы снять бан на сервере 1.2.0: **остановите сервер**, удалите запись (обе записи для игрока,
забаненного в сессии) из `bans.json`, запустите снова. Правка файла при работающем сервере не
работает — сервер держит список в памяти и при следующем бане записывает старый список обратно.
Ресурс может снять бан и на ходу через `node.bans.remove(who)`; команда `/unban` из
[рецепта модерации](/ru/plugins/recipes/#кик-и-бан-с-причиной) — это она в восемь строк, и ей
нужен ресурс `chat`.

Начиная с сервера 1.2.1 тот же файл читается и правится из командной строки при остановленном
сервере:

```
Node-Server --bans list
Node-Server --bans remove 203.0.113.7
Node-Server --bans remove nodemp:108
```

`list` печатает каждую запись с ключом, датой, именем и причиной; `remove` принимает IP-адрес,
аккаунт в виде `nodemp:<id>` или голый id аккаунта, удаляет запись и говорит, сколько банов
осталось. `--working-directory=` учитывается, `server.toml` не читается.

## Логи

Всё, что сервер печатает, попадает и в `logs/server.log` без цветовых кодов. При каждом запуске
предыдущий файл переименовывается в `logs/server.old.log`, так что хранится ровно один прошлый
запуск. Каждая строка имеет вид `время  тег › сообщение`, где тег — `Core`, `Net`, `Res`,
`Mods`, `Join`, `Leave`, `Kick`, `Warn`, `Error` и так далее. `[General] Debug = true` (или
`NODE_DEBUG=true`) добавляет отладочные строки и метки времени с миллисекундами;
`NODE_FORCE_ANSI=1` сохраняет цвета, когда вывод — не терминал.

Строки, которые стоит узнавать с первого взгляда:

- `server is ready` — все подсистемы запущены.
- `TLS 1.3 enabled — certificate fingerprint (SHA-256): …` — идентичность, которую закрепляют
  лаунчеры.
- `announcing this server to https://api.nodemp.com`, затем `listed in the server browser` —
  директория приняла ключ. Только вторая строка означает, что сервер в списке.
- `client obfuscation ready · runner lua5.1 · Prometheus (cache .obfcache)` — клиентские скрипты
  будут обфусцированы; строка `Warn` вместо неё называет, чего не хватает.
- `startup not successful, systems [Directory] had errors — this may or may not cause issues` —
  одна подсистема не запустилась; строки выше говорят, какая и почему.
- `Error › bind() failed: …` (`Only one usage of each socket address … is normally permitted` на
  Windows, `Address already in use` на Linux) — **порт занят**, почти всегда всё ещё работающим
  предыдущим экземпляром сервера. Сервер 1.2.0 затем работает ещё несколько секунд — может даже
  напечатать `listening on …` и `server is ready` — и сам останавливается, что выглядит как
  падение, но им не является; остановите другой экземпляр (или смените `[General] Port` /
  `--port=`) и запустите снова. Начиная с сервера 1.2.1 строка читается
  `Cannot listen on port 30814 (…): the port is already in use …`, называет обычную причину,
  `server is ready` за ней не следует, а процесс завершается с кодом 1 после
  `Closing in 10 seconds`.
- `Kick › <name> kicked — <reason>` — сервер отказал игроку или завершил его сессию; причина —
  тот текст, который игрок вам цитирует (см. [Когда игроку отказано](#когда-игроку-отказано)).

## Остановка

Ctrl+C, `systemctl stop` или `docker compose stop` посылают SIGINT или SIGTERM. Сервер пишет в лог
`gracefully shutting down via SIGTERM`, отключает всех игроков с причиной `Server shutdown`,
останавливает подсистемы и завершает работу строкой `Shutdown.`. Повторное нажатие Ctrl+C
принудительно завершает процесс. Две вещи, которые чистая остановка сервера 1.2.0 печатает, — шум,
а не поломка: на Windows после `Shutdown.` строки
`Error › UDP recvfrom() failed: A blocking operation was interrupted by a call to WSACancelBlockingCall`
и `Error › Failed to accept() new client: …` — это сетевые потоки сообщают о собственной отмене; с
настроенной базой данных `Warn › pg: no live database connection (reconnecting)` — пул объявляет
переподключение, которого не сделает.

## Когда игроку отказано

Игрок, который не может подключиться, цитирует всплывающее сообщение;
[Коды ошибок](/ru/reference/error-codes/) перечисляют каждый текст с его смыслом. С вашей стороны:

- Каждый отказ и кик сервер пишет в лог под тегом `Kick` как `<name> kicked — <reason>`
  (`connection from 203.0.113.5 refused (banned: Spamming)` для бана у двери), так что
  `logs/server.log` говорит, кому он отказал и почему, теми же словами, что увидел игрок.
- `Invalid mod "…"`, `Failed to verify "…"`, `Server cannot find …`: zip в `content/` повреждён,
  заменён во время работы сервера или отсутствует. Посмотрите строки о контенте в логе запуска
  (`serving 2 mods (148.3 MB) from content/`, `'…' is not a ZIP file and will be ignored`),
  исправьте или удалите файл и перезапустите — папка индексируется только при запуске.
- `Connection refused` без причины: ресурс отклонил `playerConnectRequest`, не назвав её. Какой —
  говорят собственные строки лога ресурса (его имя — тег); сервер этого не говорит.
- `You are banned from this server` или причина бана: запись в `bans.json`, [выше](#баны).
- Всё о файлах игры или эталонном манифесте: уровень `VerifyGame`, который вы задали; сторона
  игрока — на странице [Устранение неполадок → Строгие серверы](/ru/players/troubleshooting/#строгие-серверы),
  ваша — на странице [Строгая проверка](/ru/hosting/strict-verification/).

## Что резервировать

| Хранить | Зачем |
|---|---|
| `server.toml` | Ваши настройки. Не нужен для Docker-варианта только на переменных; храните вместо него файлы Compose и `.env`. |
| `node_cert.pem`, `node_key.pem` (`data/tls/` в Docker) | Отпечаток, по которому лаунчеры и директория узнают ваш сервер. Новая пара — новая идентичность. |
| `resources/`, `content/` | Ваши дополнения. |
| `storage/`, `bans.json` | Данные, записанные ресурсами, и ваши блокировки. |

`logs/`, `.obfcache/` и `content/mods.json` создаются заново и в резервной копии не нуждаются.
