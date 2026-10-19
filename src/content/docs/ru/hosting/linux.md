---
title: Сервер на Linux
description: Как скачать Node-Server для Linux, поставить Lua 5.1 для обфускации, открыть порт и запустить сервер службой systemd.
---

Сборка для Linux рассчитана на x64 и сделана на Ubuntu 24.04. На более старой системе запускайте [Docker-образ](/ru/hosting/docker/).

## Скачать и распаковать

Архив лежит на [странице загрузки](https://nodemp.com/download) в блоке **Свой сервер**, кнопка **Linux x64**. На машине без браузера возьмите его с GitHub:

```bash
sudo mkdir -p /opt/nodemp && sudo chown "$USER" /opt/nodemp
cd /opt/nodemp
version=<версия>
url=https://github.com/NodeMP-BeamNG/releases/releases/download/server-v$version
curl -LO "$url/Node-Server-$version-linux-x64.tar.gz"
curl -LO "$url/Node-Server-$version-linux-x64.tar.gz.sha256"
sha256sum -c Node-Server-$version-linux-x64.tar.gz.sha256
tar -xzf Node-Server-$version-linux-x64.tar.gz
```

`sha256sum` должен ответить `OK`. В папке появятся `Node-Server`, `tools/`, `modules/` и `examples/`.

## Поставить Lua 5.1

Клиентские скрипты плагинов сервер перед отправкой игрокам обфусцирует. Обфускатор написан на Lua и запускается через Lua 5.1, которой в архиве для Linux нет:

```bash
sudo apt install -y lua5.1
```

Путь к ней сервер берёт из переменной `NODE_LUA`. Без Lua сервер тоже работает, только отправляет клиентские скрипты как есть и предупреждает об этом при запуске.

## Запустить

```bash
NODE_LUA=/usr/bin/lua5.1 ./Node-Server
```

Сервер пишет в текущую папку `server.toml`, `logs/` и `content/`. Остановить его можно сочетанием Ctrl+C или командой `stop`.

## Открыть порт

С `ufw`:

```bash
sudo ufw allow 30814/tcp
sudo ufw allow 30814/udp
```

У VPS-провайдера бывает ещё и свой брандмауэр в панели управления, и порт нужно открыть там тоже.

## Служба systemd

Так сервер запускается вместе с системой и поднимается после сбоя. Заведите для него пользователя и отдайте ему папку:

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

Секреты, например ключ сервера, держите в `/etc/nodemp.env`, по одной строке `ИМЯ=значение`, а не в `server.toml` ([Вписать ключ в настройки](/ru/hosting/registering/#вписать-ключ-в-настройки)).

У службы нет терминала, поэтому нет и консоли. Останавливает сервер `sudo systemctl stop nodemp`, а кикают и банят игроков плагины ([Консоль, кики и баны](/ru/hosting/administration/#кики-и-баны)).
