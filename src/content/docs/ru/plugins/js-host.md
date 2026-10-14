---
title: Ресурсы на JavaScript
description: Ресурсы на JavaScript с модулем js-host — что для этого нужно, первый ресурс, как API выглядит из JavaScript, отказ в запросах, пакеты npm и что умеет только Lua.
---

Если стоит нативный модуль `js-host`, ресурс можно написать на JavaScript. Он работает на Node.js, с
модулями самого Node и пакетами из npm. Это хороший выбор для учёта, отчётов, связи с другими
сервисами — для задач, под которые в npm уже есть библиотека. Правила игры проще писать на Lua.

## Что для этого нужно

`js-host` в архив сервера не входит. Его собирают из исходников вместе с Node.js, собранным как
библиотека, и собирается он на Windows. Положите `js-host.dll` в `modules/` рядом с сервером, а
`libnode.dll` из Node — рядом с программой, и запустите сервер. В логе появится:

```
js-host: resources with type = "js" will run on Node
```

Без него ресурс на JavaScript пропускается, и лог объясняет почему:
`resource type 'js' has no language host loaded, skipping`.

## Первый ресурс

```toml
name = "hello-js"
type = "js"

[server]
main = "server/main.js"
```

```js
'use strict';

node.log(`${resource.name} loaded`);

node.onBuiltin('playerJoined', (playerId) => {
    const name = node.getPlayerName(playerId);
    node.log(`${name} joined`);
});

const timer = node.setInterval(() => {
    node.log(`${node.getPlayerCount()} online`);
}, 60_000);

module.exports.unload = () => node.clearTimer(timer);
```

Файл выполняется один раз, как `main.lua` в Lua. Кроме глобальных переменных Node он получает `node`
— сервер — и `resource` с именем ресурса `name` и папкой `dir`. Функция в `module.exports.unload`
выполняется перед перезагрузкой ресурса или остановкой сервера.

## API из JavaScript

Вызовы — это API сервера один к одному, с именами как у [`node.raw`](/ru/plugins/api/raw/) в Lua: на
вход идут id, а вызов, который возвращает запись, отдаёт разобранный объект. Объектов `Player` и
`Vehicle` нет.

| Lua | JavaScript |
|---|---|
| `node.on("playerJoined", fn)` | `node.onBuiltin('playerJoined', (playerId) => …)` |
| `node.on("vehicleEdited", fn)` | `node.onVehicle('vehicleEdited', (playerId, vehicleId, data) => …)` |
| `node.on("vehicleSpawnRequest", fn)` | `node.onRequest('vehicleSpawnRequest', (playerId, vehicleId, data) => …)` |
| `node.on("race:finish", fn)`, сетевое событие | `node.on('race:finish', (playerId, data) => …)` |
| `node.bus.on(name, fn)` | `node.onResource(name, (source, data) => …)` |
| `node.bus.emit(name, data)` | `node.emitResource(name, string)` |
| `player.name`, `player:kick(reason)` | `node.getPlayerName(id)`, `node.kickPlayer(id, reason)` |
| `player:send(name, data)` | `node.emitClient(id, name, string)` |
| `node.after`, `node.every` | `node.setTimeout(fn, ms)`, `node.setInterval(fn, ms)`, `node.clearTimer(id)` |

То, что вы отправляете, — строка: объекты кодируйте через `JSON.stringify`. Обработчик получает
строку такой, какой её отправили: разбирайте её через `JSON.parse`. `node.off(id)` снимает то, что
вернул вызов `on…`.

## Отказ в запросе

Обработчик запроса отказывает, если вернёт строку — это причина, которую увидит игрок, — или `false`,
чтобы отказать без причины. Всё остальное запрос пропускает.

```js
node.onRequest('vehicleSpawnRequest', (playerId, vehicleId, data) => {
    const config = JSON.parse(data);
    if (config.jbm === 'citybus') return 'No buses on this server';
});
```

Сервер ждёт ответа до двух секунд, а если ответ запоздал, пропускает запрос. Поэтому такие
обработчики должны быть быстрыми.

## Что умеет только Lua

- Принять строку чата как команду (`{ handled = true }`). Из JavaScript строку можно только отклонить.
- Пустить игрока сверх лимита ([резервные места](/ru/plugins/events/#резервные-места)).

Эти части пишут маленьким ресурсом на Lua, а с JavaScript он общается по [шине](/ru/plugins/bus/).

## Пакеты npm

`require` работает как в Node: модули самого Node (`node:fs`, `node:path`, …) и пакеты из папки
`node_modules` внутри ресурса. Выполните `npm install` в папке ресурса.

Сеть в Node своя, не серверная: `fetch` и `node:https` идут мимо `node.http`, поэтому настройки хоста
из `[Http]` (запрет частных адресов, набор сертификатов) на них не действуют. Помните об этом, если
ресурс обращается по адресам, которые ему дали игроки.

## Ошибки

Исключение в обработчике или промис, который никто не поймал, пишутся в лог со стеком, а ресурс
работает дальше. Ресурс, который сломался при загрузке, попадает в лог как
`js: hello-js failed to load: …` и пропускается.

`session-report` из архива сервера — готовый ресурс на JavaScript
([Примеры плагинов](/ru/plugins/examples/)).
