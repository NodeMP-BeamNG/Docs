---
title: Glossary
description: The words the NodeMP documentation uses, one per thing, with the Russian equivalent.
---

The documentation calls each thing by one word. Here are those words, the Russian word in brackets,
and the page with more. Where the software prints another word, the row says so.

## Players

| Word | What it means | More |
|---|---|---|
| **Launcher** (лаунчер) | The Windows program you sign in, pick a server and join with. It updates itself and installs the client mod. | [Install the launcher](/players/install/) |
| **Helper** (помощник) | The launcher's background part without a window: it starts the game, talks to the server and carries your traffic while you play. The interface calls it "the launcher's traffic helper"; its log is `launcher.log`. | [When something breaks](/players/troubleshooting/#the-launchers-traffic-helper) |
| **Client mod** (клиентский мод) | `NodeMP.zip`, the BeamNG mod that does all the multiplayer work inside the game. The launcher installs and updates it. | [Install the launcher](/players/install/#the-client-mod) |
| **Server mods** (моды сервера) | The zips a server hands to players. The launcher calls them "Content". | [Mods and maps](/hosting/mods/) |
| **Account** (аккаунт) | An account at nodemp.com. It gives you a lasting name that servers check. | [Your account](/players/sign-in/) |
| **Test Drive** | Playing without an account, under a new `Guest…` name each session. The mode is "Test Drive", the player a "guest". | [Your account](/players/sign-in/#test-drive) |
| **Server list** (список серверов) | The servers that are running and have introduced themselves to NodeMP. **Servers** in the launcher, nodemp.com/servers on the web. | [Join a server](/players/join/) |
| **Direct Connect** (прямое подключение) | Joining by `address:port` instead of from the list. | [Join a server](/players/join/#join-by-address) |
| **Hold to play** (зажмите для игры) | The join button: you hold it so you don't join by accident. | [Join a server](/players/join/#join) |
| **Strict server** (строгий сервер) | A server with `[integrity] verify = "strict"`: it compares your game and user folder with a clean install. | [When something breaks](/players/troubleshooting/#a-strict-server-refuses-you) |

## Hosts

| Word | What it means | More |
|---|---|---|
| **Host** (хост) | The person running a server. | [Run a server](/hosting/quick-start/) |
| **Working directory** (рабочая папка) | The folder the server was started in. It holds `server.toml`, `resources/`, `content/`, `logs/`. | [Server settings](/hosting/configuration/) |
| **Server key** (ключ сервера) | The Host ID and Host secret from your account at nodemp.com. With it the server gets listed. | [Get listed](/hosting/registering/) |
| **Fingerprint** (отпечаток) | The SHA-256 of the server's TLS certificate. Launchers know a server by it. | [Get listed](/hosting/registering/#the-servers-fingerprint) |
| **Reference manifest** (эталонный манифест) | A description of a clean BeamNG install of one version, which a strict server checks players against. | [Strict file check](/hosting/strict-verification/) |
| **Obfuscation** (обфускация) | Scrambling the resources' client scripts before they go to players. Prometheus in `tools/` does it. | [Resources](/hosting/resources/#obfuscating-client-scripts) |

## Plugin authors

| Word | What it means | More |
|---|---|---|
| **Plugin** (плагин) | Anything that extends the server: a resource or a native module. | [Overview](/plugins/overview/) |
| **Resource** (ресурс) | A folder in `resources/`: a server half in Lua (or another language) and, if needed, client scripts. | [How a resource is built](/plugins/resources/) |
| **Native module** (нативный модуль) | A `.dll` or `.so` in `modules/` that works through the C ABI. | [Native modules](/plugins/native-modules/) |
| **C ABI** | The binary interface between the server and native modules, described in `node.h`. Its version reads "major.minor". | [Native modules](/plugins/native-modules/) |
| **Language host** (языковой хост) | A native module that runs resources of its own `type`, such as `js-host` for JavaScript. | [JavaScript resources](/plugins/js-host/) |
| **Event** (событие) | What you subscribe to with `node.on`: server events, requests you can refuse, and wire events from clients. | [Events](/plugins/events/) |
| **Wire event** (сетевое событие) | A named message between a client script and the server, named `domain:verb`. | [Client scripts](/plugins/client-scripting/) |
| **Bus** (шина) | The channel between resources on one server: `node.bus.emit` and `node.bus.on`. | [The bus between resources](/plugins/bus/) |
| **Relay** (ретрансляция) | Passing one player's traffic on to the others. It can be filtered per receiver. | [Native modules](/plugins/native-modules/) |
| **Driver, authority, spawner** (водитель, авторитет, спавнер) | The spawner created the car. The driver sits behind the wheel. The authority is the player whose game simulates the car and sends its state; usually the driver. | [Players and vehicles](/plugins/players-and-vehicles/) |
