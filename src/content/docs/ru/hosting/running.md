---
title: Запуск сервера
description: Соберите бинарный файл игрового сервера NodeMP и запустите его в Linux (systemd), Windows (нативно) или через Docker / docker-compose.
---

Эта страница описывает сборку **игрового сервера** NodeMP и три способа его запуска: нативно
в Linux под systemd, нативно в Windows и через Docker (один контейнер или комплексный стек
compose). О файле конфигурации, общем для всех способов, см.
[Конфигурация](/ru/hosting/configuration/).

## Порты и URL бэкенда

Два момента касаются каждого способа:

- **Порты** — по умолчанию сервер слушает **`30814/tcp` и `30814/udp`** (один порт, оба
  протокола). Откройте оба в брандмауэре для удалённых игроков.
- **URL бэкенда** — адрес бэкенда задаётся через переменную окружения
  **`NODEMP_BACKEND_URL`**, *а не* в файле TOML. По умолчанию — `https://api.nodemp.com`.
  Приватному/loopback-серверу бэкенд не нужен вовсе (см. [быстрый старт](/ru/hosting/quick-start/)).

## Сборка бинарного файла

Если не считать готовых загрузок, поддерживаемый способ получить бинарный файл — прилагаемый
**Dockerfile**, который фиксирует инструментарий (современный CMake + vcpkg) и выполняет
сборку за вас. Из каталога `server/`:

```bash
docker build -t nodemp-server-build .
id=$(docker create nodemp-server-build)
sudo mkdir -p /opt/nodemp
docker cp "$id":/workspace/build/NodeMP-Server /opt/nodemp/NodeMP-Server
docker rm "$id"
sudo chmod +x /opt/nodemp/NodeMP-Server
```

Также есть `Dockerfile.ubuntu` (на базе Ubuntu 24.04), если он вам предпочтительнее варианта
по умолчанию на Debian. Первый запуск из `/opt/nodemp` создаёт `ServerConfig.toml` и пустые
папки `Resources/Server` и `Resources/Client`.

## Linux — systemd (нативно)

Лучший вариант для выделенного хоста: соберите один раз, запускайте бинарный файл напрямую
под systemd (без Docker во время работы).

1. Установите библиотеки времени выполнения, с которыми слинкован бинарный файл:

```bash
sudo apt install -y liblua5.4-0 libssl3 libcurl4 zlib1g
```

2. Установите unit-файл, поставляемый в `deploy/nodemp-server.service`:

```bash
sudo cp deploy/nodemp-server.service /etc/systemd/system/
sudo nano /etc/systemd/system/nodemp-server.service   # set NODEMP_BACKEND_URL
sudo systemctl daemon-reload
sudo systemctl enable --now nodemp-server
journalctl -u nodemp-server -f                          # watch it come up
```

Unit-файл предполагает, что бинарный файл находится в `/opt/nodemp/NodeMP-Server`, запускается
из `/opt/nodemp` (где лежат конфигурация и `Resources/`) и перезапускается при сбое. Его
усиление изоляции (sandbox) — `NoNewPrivileges`, `ProtectSystem`, `ProtectHome` и
`PrivateTmp` — **включено по умолчанию**. Закомментированы лишь строки `User=`/`Group=`;
раскомментируйте их, как только создадите отдельного служебного пользователя
(`sudo useradd -r -s /usr/sbin/nologin nodemp`):

```ini
[Service]
WorkingDirectory=/opt/nodemp
ExecStart=/opt/nodemp/NodeMP-Server
Environment=NODEMP_BACKEND_URL=https://api.example.com
Restart=on-failure
RestartSec=5

# Sandbox hardening — on by default:
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true
# Uncomment once the dedicated user exists:
# User=nodemp
# Group=nodemp
```

3. Откройте брандмауэр:

```bash
sudo ufw allow 30814/tcp
sudo ufw allow 30814/udp
```

## Windows — нативно

NodeMP работает в Windows нативно. Поместите `NodeMP-Server.exe` в отдельную папку и запускайте
его оттуда, чтобы конфигурация и `Resources/` создавались рядом с ним.

Если вы собираете из исходников, вспомогательный скрипт **`run-server-local.bat`** — самый
простой путь для локальной проверки: он запускает свежесобранный
`build\Release\NodeMP-Server.exe` из рабочей папки `run-local\`, указывает
`NODEMP_BACKEND_URL` на `http://localhost:8080`, освобождает порт 30814 от любого зависшего
экземпляра и оставляет окно открытым, чтобы вы могли читать `run-local\Server.log`.

Для настоящего хоста на Windows задайте `NODEMP_BACKEND_URL` самостоятельно (системная
переменная окружения или в оболочке перед запуском) и разрешите `30814/tcp` + `30814/udp` в
брандмауэре Windows.

## Docker

### Один контейнер

Тот же образ, что используется для сборки, также запускает сервер. Смонтируйте папку хоста в
`/data`, чтобы ваша конфигурация и ресурсы сохранялись, и опубликуйте порт для обоих
протоколов:

```bash
docker build -t nodemp-server-build -f Dockerfile .
docker run -d --name nodemp-server \
  -e NODEMP_BACKEND_URL=https://api.example.com \
  -v "$PWD/gamedata:/data" -w /data \
  -p 30814:30814/tcp -p 30814:30814/udp \
  nodemp-server-build /workspace/build/NodeMP-Server
```

### Всё-в-одном с docker-compose

Для автономного стека — **Postgres + Redis + бэкенд + игровой сервер** на одном хосте —
используйте `deploy/docker-compose.yml`. Он идеален для сквозной (end-to-end) проверки, когда
вам нужны также аккаунты и список серверов.

```bash
cd deploy
cp .env.example .env        # set NODEMP_JWT_SECRET (openssl rand -base64 48)
docker compose up -d --build
docker compose logs -f game-server
```

Файл compose автоматически связывает игровой сервер с бэкендом
(`NODEMP_BACKEND_URL=http://backend:8080`) и сохраняет конфигурацию и ресурсы в
`deploy/gamedata/` (`ServerConfig.toml`, `Resources/Server`, `Resources/Client`). Его
значения по умолчанию подходят для приватной/по-IP проверки на одном хосте:

```
NODEMP_PROBE_ENABLED=false
NODEMP_STRICT_REDEEM_IP=false
```

Чтобы попасть в публичный список, зарегистрируйте хост и переключите эти флаги — см.
[Регистрация хоста](/ru/hosting/registering/).

:::note
В конфигурации compose на одном хосте бэкенд видит игровой сервер по IP его контейнера,
поэтому оставьте `NODEMP_STRICT_REDEEM_IP=false`. Для настоящего публичного сервера запускайте
компоненты с их реальной публичной адресацией.
:::

:::note
Тестируете лаунчер с **собственным HTTP-бэкендом** (как в стеке compose выше)? На машине
каждого игрока укажите лаунчеру на него через `NODEMP_API_BASE=<url>` **и** задайте
`NODEMP_DEV=1` — без режима разработчика лаунчер отклоняет любой бэкенд без HTTPS. Полная
настройка на стороне игрока описана в `server/DEPLOY.md`.
:::

## Проверьте, что всё работает

При успешном запуске выводятся имя узла, карта и сводка по аплинку (порт, максимум игроков,
максимум автомобилей). Если вы задали учётные данные `[Backend]`, сеть также отмечается как
*registered*; иначе — *private / LAN*. Чтобы проверить всю цепочку аккаунт/подключение до
того, как подключатся игроки, запустите `deploy/preflight.sh` (описано в
[Регистрация хоста](/ru/hosting/registering/)).

## Дальнейшие шаги

- [Регистрация хоста](/ru/hosting/registering/) — появитесь в публичном списке серверов.
- [Обновление](/ru/hosting/updating/) — замените бинарный файл, сохранив конфигурацию.
- [Ресурсы и моды](/ru/hosting/resources/) — добавьте серверные плагины и клиентские моды.
