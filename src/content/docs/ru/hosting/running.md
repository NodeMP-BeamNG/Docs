---
title: Чтобы сервер работал постоянно
description: Как запускать Node-Server службой в Linux, при старте Windows или в Docker Compose; где лежат его файлы, как он останавливается и что сохранять в резервную копию.
---

Когда сервер уже запускается вручную ([Запустить сервер](/ru/hosting/quick-start/)), стоит сделать
так, чтобы он стартовал сам и поднимался после сбоя. Здесь — три обычных варианта и файлы, которые
важны.

## Файлы и папки

Сервер ищет свои файлы в двух местах: в **рабочем каталоге**, из которого его запустили, и в
**папке исполняемого файла**. Если запускать его из его же папки, как в быстром старте, это одно и
то же место.

| Путь | Где | Что это |
|---|---|---|
| `server.toml` | рабочий каталог (или `--config=`) | Ваши настройки. Пишется один раз при первом запуске; потом добавляются только настройки, которые приносит новая версия. |
| `resources/<имя>/` | рабочий каталог | Плагины. |
| `content/` | рабочий каталог (`[Content] Folder`) | Zip-моды для игроков и `mods.json` — кэш их контрольных сумм. |
| `storage/` | рабочий каталог | То, что плагины сохраняют через API хранилища. |
| `bans.json` | рабочий каталог | Забаненные адреса и аккаунты ([Баны](/ru/hosting/administration/#баны)). |
| `integrity/` | рабочий каталог (`[General] IntegrityDir`) | Описания чистой установки игры для строгой проверки. |
| `logs/server.log` | рабочий каталог | Лог. Предыдущие — `server.1.log`, `server.2.log` и так далее; по умолчанию хранятся пять. |
| `node_cert.pem`, `node_key.pem` | папка исполняемого файла (`[Network] TlsCert`, `TlsKey`) | Удостоверение сервера для лаунчеров. |
| `modules/` | папка исполняемого файла | Нативные модули, включая модуль базы данных, который идёт с сервером. |
| `tools/` | папка исполняемого файла (или `NODE_TOOLS_DIR`) | Обфускатор скриптов и, на Windows, Lua, на которой он работает. |
| `.obfcache/` | рядом с `tools/` | Кэш обфусцированных клиентских скриптов; можно удалять. |

`--working-directory=/путь` переносит первую группу без `cd`; `--config=` переносит только файл
настроек.

## Linux: systemd

Заведите серверу своего пользователя и папку, а также юнит, который его перезапускает:

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

Строки в `EnvironmentFile` — `ИМЯ=значение`, без кавычек. Переменные окружения сильнее
`server.toml`, так что секрет из `/etc/nodemp.env` никогда не попадёт в файл, который вы можете
случайно вставить в чат поддержки.

## Windows

Запустите `Node-Server.exe` в его папке и не закрывайте окно — это ещё и консоль. Чтобы сервер
стартовал вместе с машиной, создайте задачу в Планировщике заданий, которая запускает
`C:\NodeMP\Node-Server.exe` с *Рабочей папкой* `C:\NodeMP`, при запуске компьютера, независимо от
того, вошёл ли кто-то в систему. Lua для обфускации уже есть в архиве, настраивать ничего не нужно.

Если закрыть окно консоли, сервер остановится как положено: он сначала закончит остановку, и только
потом окно исчезнет.

## Docker Compose

Образ берёт настройки из переменных `NODE_*` и хранит состояние в `/data`. Сначала загрузите образ
из релиза (`docker load -i nodemp-server-v1.7.0-image.tar`), затем:

```yaml
services:
  gameserver:
    image: nodemp-server:1.7.0-0c9c284
    restart: unless-stopped
    ports:
      - "30814:30814/tcp"
      - "30814:30814/udp"
    environment:
      NODE_NAME: My server
      NODE_MAP: /levels/west_coast_usa/info.json
      NODE_MAX_PLAYERS: "16"
      NODE_MAX_CARS: "2"
      NODE_TLS_CERT: /data/tls/node_cert.pem
      NODE_TLS_KEY: /data/tls/node_key.pem
      NODE_DIRECTORY_URL: https://api.nodemp.com
      NODE_DIRECTORY_HOST_ID: ${NODE_DIRECTORY_HOST_ID}
      NODE_DIRECTORY_HOST_SECRET: ${NODE_DIRECTORY_HOST_SECRET}
    volumes:
      - ./data:/data
    stdin_open: true
    tty: true
```

Положите два секрета в файл `.env` рядом с `compose.yaml` (`NODE_DIRECTORY_HOST_ID=…`,
`NODE_DIRECTORY_HOST_SECRET=…`, доступный только вам), отдайте папку данных пользователю контейнера
и запустите:

```bash
mkdir -p data && sudo chown 10001:10001 data
docker compose up -d
docker compose logs -f gameserver
```

- `server.toml` образ не читает; каждая настройка — переменная, все они перечислены на странице
  [server.toml](/ru/hosting/configuration/#все-настройки).
- Обе переменные TLS обязательны: внутри образа папка исполняемого файла доступна только для чтения.
- Чтобы поменять переменную, отредактируйте файл и снова выполните `docker compose up -d`. Compose
  пересоздаст контейнер; `data/` останется.
- Файлы, которые вы копируете в `data/resources/` или `data/content/`, должен уметь читать
  пользователь 10001 (`sudo chown -R 10001:10001 data`). Моды индексируются при запуске, так что
  после добавления перезапустите: `docker compose restart gameserver`.
- `stdin_open` и `tty` дают серверу терминал, а значит, включают его консоль.
  `docker attach <контейнер>` переносит вас в неё; Ctrl+P, Ctrl+Q выходит, не останавливая сервер.
- Образ проверяет себя сам: контейнер помечается нездоровым, если главный цикл сервера перестал
  двигаться.

## Консоль в службе

Консоль читает команды только из терминала. Под systemd, в Docker без терминала или за конвейером
(pipe) она выключена, если только `[General] Console = true` (`NODE_CONSOLE=true`) не просит читать
стандартный ввод всё равно. Плагины и лог сервера работают одинаково в обоих случаях.

## Остановка

Ctrl+C, `stop` в консоли, `systemctl stop` и `docker compose stop` останавливают сервер одинаково.
Он пишет `stop requested by …` (`Ctrl+C`, `SIGTERM`, …), отправляет всех игроков с причиной
`Server shutdown`, выключает свои части и заканчивает строкой `Shutdown.`. Если какая-то часть не
закончила за 10 секунд, сервер скажет, какая, всё равно завершится и выйдет с кодом 1; ещё
несколько нажатий Ctrl+C завершают его сразу.

Если сервер упал, он сначала пишет в `logs/server.log` строку `FATAL:` и трассировку стека (на
Windows ещё файл `logs/crash-<pid>.dmp`). Приложите их, когда будете сообщать о проблеме.

## Что сохранять в резервную копию

| Что | Зачем |
|---|---|
| `server.toml` | Ваши настройки. С Docker сохраняйте вместо него файлы Compose и `.env`. |
| `node_cert.pem`, `node_key.pem` (`data/tls/` в Docker) | Удостоверение сервера. Лаунчеры, заходившие по адресу, его запоминают; новая пара для них выглядит как другой сервер. |
| `resources/`, `content/` | Ваши плагины и моды. |
| `storage/`, `bans.json` | То, что сохранили плагины, и ваши баны. |

`logs/`, `.obfcache/` и `content/mods.json` создаются заново сами.
