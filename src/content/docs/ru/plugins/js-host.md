---
title: Ресурсы на JavaScript
description: Ресурсы на JavaScript с модулем js-host — где его взять, первый ресурс, как API выглядит из JavaScript, пакеты npm и чем всё это отличается от Lua.
---

Lua встроен в сервер, и для большинства ресурсов это правильный выбор. Но когда работа — в основном
учёт, текст или разговор с другими сервисами, а в npm уже есть нужная библиотека, ресурс можно
написать на JavaScript. Нативный модуль `js-host` запускает такие ресурсы на встроенном Node.js, с
собственными модулями Node и вашими пакетами npm.

## Где взять js-host

В архиве релиза `js-host` нет. Его собирают из исходников вместе с Node.js, собранным как
библиотека, и пока он собирается только под Windows. Положите `js-host.dll` в `modules/` рядом с
сервером, а `libnode.dll` от Node — рядом с исполняемым файлом, и запустите сервер. Он подтвердит:

```
js-host: resources with type = "js" will run on Node
```

Без него ресурс на JavaScript пропускается, а лог объясняет почему:

```
hello-js · resource type 'js' has no language host loaded, skipping (a native module in modules/ must register one)
```

## Первый ресурс

```
resources/
└── hello-js/
    ├── resource.toml
    └── server/
        └── main.js
```

```toml
name = "hello-js"
type = "js"

[server]
main = "server/main.js"
```

```js
'use strict';

node.log(`${resource.name} loaded, ${node.getPlayerCount()} online`);

node.onBuiltin('playerJoined', (playerId) => {
    const name = node.getPlayerName(playerId);
    node.emitResource('chat:say', JSON.stringify({ pid: playerId, text: `Welcome, ${name}!` }));
});

node.onRequest('vehicleSpawnRequest', (playerId, vehicleId, data) => {
    const config = JSON.parse(data);
    if (config.jbm === 'citybus') return 'No buses on this server';
});

const timer = node.setInterval(() => {
    node.log(`${node.getPlayerCount()} player(s) online`);
}, 60_000);

module.exports.unload = () => node.clearTimer(timer);
```

Файл выполняется один раз, как `main.lua` в Lua. Кроме обычных глобальных имён Node он получает два
своих: `node` — сервер и `resource` — `name` ресурса и его папку `dir`. Функция в
`module.exports.unload` выполняется перед перезагрузкой ресурса или остановкой сервера.

## Как API выглядит из JavaScript

Вызовы — это API сервера один к одному, с теми же именами, что у [`node.raw`](/ru/plugins/api/raw/)
в Lua: на входе номера, а вызов, который возвращает запись, отдаёт разобранный объект. Объектов
`Player` и `Vehicle` нет — вы работаете с номерами.

| Lua | JavaScript |
|---|---|
| `node.on("playerJoined", fn)` | `node.onBuiltin('playerJoined', (playerId) => ...)` |
| `node.on("vehicleEdited", fn)` | `node.onVehicle('vehicleEdited', (playerId, vehicleId, data) => ...)` |
| `node.on("vehicleSpawnRequest", fn)` | `node.onRequest('vehicleSpawnRequest', (playerId, vehicleId, data) => ...)` |
| `node.on("race:finish", fn)` (сетевое событие) | `node.on('race:finish', (playerId, data) => ...)` |
| `node.bus.on(name, fn)`, `node.bus.emit(name, data)` | `node.onResource(name, (source, data) => ...)`, `node.emitResource(name, string)` |
| `player.name`, `player:kick(reason)` | `node.getPlayerName(id)`, `node.kickPlayer(id, reason)` |
| `player:send(name, data)` | `node.emitClient(id, name, string)` |
| `node.after(ms, fn)`, `node.every(ms, fn)` | `node.setTimeout(fn, ms)`, `node.setInterval(fn, ms)`, `node.clearTimer(id)` |
| `node.log(text)`, `node.log.warn(text)` | `node.log(text)`, `node.log(text, 'warn')` |
| `node.storage.get(key)` | `node.storageGet(key)` |

Отправляемые данные — строка: объекты кодируйте через `JSON.stringify`. Данные, которые приходят в
обработчик, — строка такой, какой её отправили: раскодируйте через `JSON.parse`. `node.off(id)`
снимает то, что вернул вызов `on…`.

## Как сказать «нет»

Обработчик запроса отказывает, возвращая строку — это причина, которую увидит игрок, — или `false`,
чтобы отказать без причины. Всё остальное запрос пропускает. Сервер ждёт ответа до двух секунд, а
если ответ запоздал, пропускает запрос, так что держите эти обработчики быстрыми.

Две вещи умеет только Lua: забрать строку чата как команду (`{ handled = true }`; из JavaScript
строку можно только отклонить, и игроку об этом скажут) и пустить игрока сверх лимита
([резервные места](/ru/plugins/players-and-vehicles/#резервные-места)). Эти части напишите
маленьким Lua-ресурсом — по [шине](/ru/plugins/bus/) они договорятся.

## Пакеты npm и модули Node

`require` работает как в Node: собственные модули Node (`node:fs`, `node:path`, ...) и пакеты из
папки `node_modules` внутри ресурса. Выполните `npm install` в папке ресурса и подключайте пакет по
имени.

Сеть у Node своя, а не сервера: `fetch` и `node:https` идут мимо `node.http`, поэтому настройки
`[Http]` владельца (запрет частных адресов, набор сертификатов) на них не действуют. Помните об этом,
когда ресурс ходит по адресам, которые ему дали игроки.

## Ошибки

Исключение в обработчике или промис, который никто не поймал, попадают в лог со стеком и не
останавливают ни ресурс, ни сервер. Ресурс, упавший при загрузке, записывается как
`js: hello-js failed to load: …` и пропускается.

## Дальше

- [Примеры плагинов](/ru/plugins/examples/#session-report): `session-report`, готовый ресурс на
  JavaScript.
- [Справочник raw Lua](/ru/plugins/api/raw/): имена, общие с вызовами JavaScript.
