---
title: Сервер на Linux
description: Скачать Node-Server для Linux, поставить Lua 5.1 для обфускации, открыть порт и запустить сервер службой systemd.
---

Сборка для Linux работает на x64 с glibc 2.38 и новее — это Ubuntu 24.04, Debian 13 и их ровесники.
На более старой системе запускайте [Docker-образ](/ru/hosting/docker/).

## Скачать и распаковать

```bash
sudo mkdir -p /opt/nodemp && sudo chown "$USER" /opt/nodemp
cd /opt/nodemp
url=https://github.com/NodeMP-BeamNG/releases/releases/download/server-v1.13.0
curl -LO "$url/Node-Server-1.13.0-linux-x64.tar.gz"
curl -LO "$url/Node-Server-1.13.0-linux-x64.tar.gz.sha256"
sha256sum -c Node-Server-1.13.0-linux-x64.tar.gz.sha256
tar -xzf Node-Server-1.13.0-linux-x64.tar.gz
```

`sha256sum` должен ответить `OK`. В папке появятся `Node-Server`, `tools/`, `modules/` и
`examples/`.

## Поставить Lua 5.1

Клиентские скрипты плагинов сервер перед отправкой игрокам обфусцирует. Обфускатор написан на Lua и
запускается через Lua 5.1, которой в архиве для Linux нет:

```bash
sudo apt install -y lua5.1
```

Путь к ней сервер берёт из переменной `NODE_LUA`. Без Lua сервер тоже работает, только отправляет
клиентские скрипты как есть и предупреждает об этом при запуске.

## Запустить

```bash
NODE_LUA=/usr/bin/lua5.1 ./Node-Server
```

Сервер пишет в текущую папку `server.toml`, `logs/` и `content/`. Остановить — Ctrl+C или `stop`.

## Открыть порт

С `ufw`:

```bash
sudo ufw allow 30814/tcp
sudo ufw allow 30814/udp
```

У VPS-провайдера бывает ещё и свой брандмауэр в панели управления — там порт тоже нужно открыть.

## Служба systemd

Так сервер запускается вместе с системой и поднимается после сбоя. Заведите для него пользователя
и отдайте ему папку:

```bash
sudo useradd -r -s /usr/sbin/nologin -d /opt/nodemp nodemp
sudo chown -R nodemp:nodemp /opt/nodemp
```

Создайте файл `/etc/systemd/system/nodemp.service`:

```ini
[Unit]
Description=NodeMP server
After=network-online.target
Wants=network-online.target

[Service]
User=nodemp
WorkingDirectory=/opt/nodemp
Environment=NODE_LUA=/usr/bin/lua5.1
EnvironmentFile=-/etc/nodemp.env
ExecStart=/opt/nodemp/Node-Server
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Включите и запустите службу, затем посмотрите лог:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nodemp
journalctl -u nodemp -f
```

В `/etc/nodemp.env` удобно держать секреты, например ключ сервера: по одной строке `ИМЯ=значение`
без кавычек. Переменные окружения важнее `server.toml`, так что секрет не попадёт в файл, который
вы однажды вставите в чат поддержки. Пример — на странице
[Попасть в список](/ru/hosting/registering/).

У службы нет терминала, поэтому консоль сервера выключена. Включить её чтение из стандартного ввода
можно настройкой `[server] console`, но для службы это обычно не нужно.

## Что дальше

- [Имя, карта и места](/ru/hosting/quick-start/#имя-карта-и-места).
- [Попасть в список серверов](/ru/hosting/registering/).
- [Обновление сервера](/ru/hosting/updating/).
