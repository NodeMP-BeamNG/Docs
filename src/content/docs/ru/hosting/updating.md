---
title: Обновление
description: Как узнать версию, заменить сервер или загрузить новый образ, что переживает обновление и когда игрокам нужен новый лаунчер.
---

Обновление заменяет исполняемый файл и папки, которые идут с ним (`tools/`, `modules/`,
`examples/`), или образ Docker. Всё остальное (`server.toml`, файлы TLS, ресурсы, моды, хранилище,
баны) — ваши данные, они остаются.

## Какая версия работает

```bash
./Node-Server --version
```

выводит `Node-Server v1.8.0`. Заставка при запуске показывает то же в строке `version`.

## Где релизы

Релизы сервера — теги `server-v…` в [релизах на GitHub](https://github.com/NodeMP-BeamNG/releases).
В каждом есть архивы для Windows и Linux и образ Docker, у каждого свой `.sha256`, а в описании —
заметки к релизу: что изменилось, поменялись ли значения по умолчанию и нужен ли игрокам новый
лаунчер. Прочитайте их перед обновлением.

## Windows

Остановите сервер, затем в PowerShell, в папке сервера:

```powershell
Set-Location C:\NodeMP
$base = "https://github.com/NodeMP-BeamNG/releases/releases/download/server-v1.8.0"
Invoke-WebRequest "$base/Node-Server-1.8.0-windows-x64.zip" -OutFile Node-Server-1.8.0-windows-x64.zip
Invoke-WebRequest "$base/Node-Server-1.8.0-windows-x64.zip.sha256" -OutFile Node-Server-1.8.0-windows-x64.zip.sha256
(Get-FileHash Node-Server-1.8.0-windows-x64.zip).Hash.ToLower() -eq (Get-Content Node-Server-1.8.0-windows-x64.zip.sha256).Split(' ')[0]
Expand-Archive Node-Server-1.8.0-windows-x64.zip -DestinationPath . -Force
.\Node-Server.exe --version
```

`-Force` разрешает `Expand-Archive` перезаписать старые файлы; без него он откажется. В именах файлов
укажите тот релиз, который ставите.

## Linux

С папкой и юнитом systemd из раздела [Чтобы сервер работал постоянно](/ru/hosting/running/):

```bash
cd /tmp
base=https://github.com/NodeMP-BeamNG/releases/releases/download/server-v1.8.0
curl -LO "$base/Node-Server-1.8.0-linux-x64.tar.gz"
curl -LO "$base/Node-Server-1.8.0-linux-x64.tar.gz.sha256"
sha256sum -c Node-Server-1.8.0-linux-x64.tar.gz.sha256
sudo systemctl stop nodemp-server
sudo tar -xzf Node-Server-1.8.0-linux-x64.tar.gz -C /opt/nodemp
sudo chown -R nodemp:nodemp /opt/nodemp
sudo systemctl start nodemp-server
/opt/nodemp/Node-Server --version
```

Распаковка поверх папки заменяет ровно то, что есть в архиве. Вашей `resources/`, включая ваши
копии примеров, в архиве нет, и её это не касается.

## Docker

Загрузите новый образ и укажите его тег в файле Compose:

```bash
docker load -i nodemp-server-v1.8.0-image.tar
# in compose.yaml: image: nodemp-server:1.8.0-e11def6
docker compose up -d gameserver
docker compose logs -f gameserver
```

Том `/data` не трогается. Чтобы откатиться, верните в файл прежний тег и снова выполните
`docker compose up -d`.

## Что переживает обновление

- **`server.toml`** остаётся таким, каким вы его написали. Если в новой версии есть настройки,
  которых нет в вашем файле, сервер добавит только эти строки со значениями по умолчанию и назовёт их
  в логе. Настройку, которой в новой версии больше нет, он пропускает (а где это важно, один раз
  пишет об этом в лог). В Docker файла нет: новая настройка берёт значение по умолчанию, пока вы не
  зададите её переменную.
- **`node_cert.pem` и `node_key.pem`** не входят в архив и создаются, только если их нет.
  Сохраняйте их: лаунчеры, заходившие по адресу, запоминают сертификат и отказывают серверу, чей
  сертификат изменился.
- **`resources/`, `content/`, `storage/`, `bans.json`** — ваши, их не трогают. Если ваш ресурс
  пользуется `db.lua` модуля базы данных, скопируйте в него новый `modules/db.lua`.
- **`integrity/`** привязан к версии игры, а не сервера: обновление сервера его не трогает,
  обновление BeamNG делает устаревшим ([Строгая проверка](/ru/hosting/strict-verification/#после-обновления-игры)).
- **`.obfcache/`** перестраивается по мере надобности; удалять его можно всегда.
- **Нативные модули** в `modules/` проверяются при загрузке. Модуль, собранный под несовместимый
  интерфейс плагинов, отклоняется с
  `module 'my-module' was built against SDK ABI 1.12, this server speaks 2.5 -- refusing to load it. Rebuild the module.`
  Lua-ресурсы пересобирать не нужно.
- **Команды чата** с сервера 1.8.0 — дело самих ресурсов, `node.commands` больше нет. Ресурс,
  который всё ещё его вызывает, останавливается на этой строке с
  `attempt to index a nil value (field 'commands')` в логе, и его команды молчат. Обновите ресурс
  или возьмите за основу `examples/chat-commands` из архива
  ([Чат → Команды](/ru/plugins/chat/#команды)).

## Когда игрокам нужен новый лаунчер

Лаунчер и сервер говорят на версионированном протоколе. Начиная с сервера 1.5.0 это `v23`, и сервер
1.8.0 его сохраняет: лаунчеры от 1.1.23 и клиентские моды от 1.6.25 заходят на него как прежде.
Если релиз всё же меняет протокол, его заметки говорят об этом жирным, а старый лаунчер получает
отказ `Protocol version mismatch: launcher speaks v22, server speaks v23 - update the outdated side`.
Лаунчер игрока тогда предложит **Обновить сейчас**, а клиентский мод и так обновляется перед каждым
входом. Обновляйте сервер в то же время, когда игроки получают новый лаунчер.
