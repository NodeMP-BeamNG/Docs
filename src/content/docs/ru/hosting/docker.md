---
title: Сервер в Docker
description: Загрузить образ Node-Server из релиза, подготовить папку данных, запустить контейнер через docker run или Compose и задать настройки переменными.
---

Образ подходит для любого Linux с Docker, в том числе для систем старше Ubuntu 24.04. В нём уже есть
Lua 5.1 для обфускатора и проверка здоровья контейнера.

## Загрузить образ

Образ лежит в релизе файлом. Скачайте `nodemp-server-v1.13.0-image.tar` со
[страницы релиза](https://github.com/NodeMP-BeamNG/releases/releases/tag/server-v1.13.0) и загрузите
его в Docker:

```bash
docker load -i nodemp-server-v1.13.0-image.tar
```

Docker ответит `Loaded image: nodemp-server:1.13.0-78abbaa`. Этот тег и запускают.

## Как устроен контейнер

- **Настройки — только переменные окружения.** Образ не читает `server.toml`: каждая настройка
  задаётся своей переменной, `NODE_NAME` для `[server] name` и так далее. Полный список — на
  странице [server.toml](/ru/hosting/configuration/).
- **Всё, что сервер пишет, лежит в `/data`**: ресурсы, моды, хранилище, баны, логи. Папку с
  программой сервер менять не может.
- **Сервер работает от пользователя с id 10001.** Папка данных должна принадлежать ему.
- **TLS-сертификат тоже должен лежать в `/data`.** По умолчанию сервер кладёт его рядом с
  программой, а там только чтение. Две переменные ниже переносят его в `/data/tls`.

## Подготовить папку данных

```bash
mkdir -p data && sudo chown 10001:10001 data
```

## Запустить

```bash
docker run -d --name nodemp --restart unless-stopped \
  -p 30814:30814/tcp -p 30814:30814/udp \
  -v "$PWD/data:/data" \
  -e NODE_TLS_CERT=/data/tls/node_cert.pem \
  -e NODE_TLS_KEY=/data/tls/node_key.pem \
  -e NODE_NAME="Вечерний фрирум" \
  -e NODE_MAP=/levels/west_coast_usa/info.json \
  nodemp-server:1.13.0-78abbaa
```

Лог смотрят так:

```bash
docker logs -f nodemp
```

Чтобы поменять настройку, удалите контейнер (`docker rm -f nodemp`) и запустите его снова с новыми
переменными. Папка `data/` при этом не трогается.

## То же через Compose

С Compose настройки удобнее править в файле. Положите рядом с папкой `data/` файл `compose.yaml`:

```yaml
services:
  nodemp:
    image: nodemp-server:1.13.0-78abbaa
    restart: unless-stopped
    ports: ["30814:30814/tcp", "30814:30814/udp"]
    volumes: ["./data:/data"]
    stdin_open: true
    tty: true
    env_file: .env
    environment:
      NODE_TLS_CERT: /data/tls/node_cert.pem
      NODE_TLS_KEY: /data/tls/node_key.pem
      NODE_NAME: Вечерний фрирум
      NODE_MAP: /levels/west_coast_usa/info.json
```

В файл `.env` рядом положите секреты, например ключ сервера
([Попасть в список](/ru/hosting/registering/)), и закройте его от чужих глаз (`chmod 600 .env`).
Пока секретов нет, файл может быть пустым, но он должен существовать (`touch .env`). Затем:

```bash
docker compose up -d
docker compose logs -f
```

После правки `compose.yaml` снова выполните `docker compose up -d`: Compose пересоздаст контейнер,
а `data/` останется как есть.

## Консоль

`stdin_open` и `tty` дают серверу терминал, и у него появляется консоль. Подключиться к ней:

```bash
docker attach nodemp
```

Если запускали через Compose без `container_name`, имя контейнера покажет `docker compose ps`.
Выйти, не останавливая сервер, — Ctrl+P, затем Ctrl+Q. С `docker run` консоль появится, если
добавить ключ `-it`.

## Ресурсы и моды

Копируйте ресурсы в `data/resources/`, моды — в `data/content/`. Файлы должны читаться пользователем
10001, поэтому после копирования выполните `sudo chown -R 10001:10001 data`. Моды сервер читает при
запуске, так что потом перезапустите контейнер (`docker restart nodemp`).

Нативные модули лежат внутри образа, а не в `/data`: чтобы добавить модуль, соберите свой образ на
основе этого.

## Что дальше

- [Попасть в список серверов](/ru/hosting/registering/).
- [Обновление сервера](/ru/hosting/updating/#docker).
- [Если сервер не работает](/ru/hosting/troubleshooting/#docker).
