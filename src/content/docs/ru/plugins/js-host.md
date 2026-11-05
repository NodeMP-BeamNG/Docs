---
title: Плагины на JavaScript
description: Что нужно для плагинов на JavaScript, первый плагин, как API выглядит из JavaScript, отказ в запросах, пакеты npm и что умеет только Lua.
---

Если стоит нативный модуль `js-host`, плагин можно написать на JavaScript. Он работает на Node.js, с модулями самого Node и пакетами из npm. Это хороший выбор для учёта, отчётов, связи с другими сервисами и задач, под которые в npm уже есть библиотека. Правила игры проще писать на Lua.

## Что для этого нужно

`js-host` в архив сервера не входит: его собирают из исходников, только на Windows и вместе с Node.js, собранным как библиотека. Положите `js-host.dll` в папку `modules/`, а `libnode.dll` рядом с программой сервера, и запустите сервер. В логе появится:

```text
js-host: resources with type = "js" will run on Node
```

Без модуля сервер пропускает плагин на JavaScript и пишет в лог `resource type 'js' has no language host loaded, skipping`.

## Первый плагин

```toml
name = "hello-js"
type = "js"

[server]
main = "server/main.js"
```

```js
'use strict';

node.log(`${resource.name} loaded`);

function greet(playerId) {
    const name = node.getPlayerName(playerId);
    node.log(`${name} joined`);
}

node.onBuiltin('playerJoined', greet);

function countPlayers() {
    node.log(`${node.getPlayerCount()} online`);
}

const timer = node.setInterval(countPlayers, 60_000);

function stopTimer() {
    node.clearTimer(timer);
}

module.exports.unload = stopTimer;
```

Файл выполняется один раз, как `main.lua` в Lua. Кроме глобальных переменных Node он получает `node`, то есть сервер, и `resource` с именем плагина `name` и папкой `dir`. Функция в `module.exports.unload` выполняется перед перезагрузкой плагина или остановкой сервера.

## API из JavaScript

Вызовы повторяют API сервера один к одному, с именами как у [`node.raw`](/ru/plugins/api/raw/) в Lua: на вход идут id, а вызов, который возвращает запись, отдаёт разобранный объект. Объектов `Player` и `Vehicle` нет.

| Lua | JavaScript | Аргументы обработчика |
|---|---|---|
| `node.on("playerJoined", fn)` | `node.onBuiltin('playerJoined', fn)` | `(playerId)` |
| `node.on("vehicleEdited", fn)` | `node.onVehicle('vehicleEdited', fn)` | `(playerId, vehicleId, data)` |
| `node.on("vehicleSpawnRequest", fn)` | `node.onRequest('vehicleSpawnRequest', fn)` | `(playerId, vehicleId, data)` |
| `node.on("race:finish", fn)`, сетевое событие | `node.on('race:finish', fn)` | `(playerId, data)` |
| `node.bus.on(name, fn)` | `node.onResource(name, fn)` | `(source, data)` |
| `node.bus.emit(name, data)` | `node.emitResource(name, string)` | |
| `player.name`, `player:kick(reason)` | `node.getPlayerName(id)`, `node.kickPlayer(id, reason)` | |
| `player:send(name, data)` | `node.emitClient(id, name, string)` | |
| `node.after`, `node.every` | `node.setTimeout(fn, ms)`, `node.setInterval(fn, ms)`, `node.clearTimer(id)` | |

Отправляют строки: объекты кодируйте через `JSON.stringify`. Обработчик получает строку такой, какой её отправили, и разбирает её через `JSON.parse`. `node.off(id)` снимает подписку по id, который вернул вызов `on…`.

## Отказ в запросе

Обработчик запроса отказывает, если вернёт строку, то есть причину, которую увидит игрок, или `false`, чтобы отказать без причины. Всё остальное запрос пропускает.

```js
function refuseCityBus(playerId, vehicleId, data) {
    const config = JSON.parse(data);
    if (config.jbm === 'citybus') return 'No buses on this server';
}

node.onRequest('vehicleSpawnRequest', refuseCityBus);
```

`js-host` ждёт ответа до двух секунд, а если ответ запоздал, пропускает запрос. Поэтому такие обработчики должны быть быстрыми.

## Что умеет только Lua

- Принять строку чата как команду (`{ handled = true }`). Из JavaScript строку можно только отклонить.
- Пустить игрока сверх лимита ([резервные места](/ru/plugins/events/#резервные-места)).

Эти части пишут маленьким плагином на Lua, а с JavaScript он общается по [шине](/ru/plugins/bus/).

## Пакеты npm

`require` работает как в Node: модули самого Node (`node:fs`, `node:path`, …) и пакеты из папки `node_modules` внутри плагина. Выполните `npm install` в папке плагина.

Сеть в Node своя, не серверная: `fetch` и `node:https` идут мимо `node.http`, поэтому настройки хоста из `[http]` (запрет частных адресов, набор сертификатов) на них не действуют. Помните об этом, если плагин обращается по адресам, которые ему дали игроки.

## Ошибки

Исключение в обработчике попадает в лог строкой `js: uncaught in handler: …`, промис, который никто не поймал, — строкой `js: unhandled promise rejection: …` со стеком. Плагин после этого работает дальше. Плагин, который сломался при загрузке, попадает в лог как `js: hello-js failed to load: …` и пропускается.

`session-report` из архива сервера — готовый плагин на JavaScript ([Примеры плагинов](/ru/plugins/examples/)).
