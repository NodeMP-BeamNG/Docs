---
title: Glossary
description: The words the NodeMP documentation uses, one for each thing, with the Russian equivalent.
---

The documentation calls each thing by one word. Here are those words, the Russian one in parentheses, and the page with more. Where the software prints another word, the row says so.

## Players

| Word | What it means | More |
|---|---|---|
| Launcher (лаунчер) | The Windows program you use to sign in, pick a server and join. It updates itself and installs the client mod. | [Install the launcher](/players/install/) |
| Helper (помощник) | The launcher's background part, without a window: it starts the game, keeps the connection to the server and carries the traffic while you play. The interface calls it "the launcher's traffic helper", and its log is `launcher.log`. | [When something breaks](/players/troubleshooting/#the-launchers-traffic-helper) |
| Client mod (клиентский мод) | `NodeMP.zip`, the BeamNG mod that does all the multiplayer work inside the game. The launcher installs and updates it. | [Install the launcher](/players/install/#the-client-mod) |
| Server mods (моды сервера) | The zip archives a server hands out to players. The launcher calls them "Content". | [Mods and maps](/hosting/mods/) |
| Account (аккаунт) | An account on nodemp.com. It gives you a permanent name that servers check. | [Your account](/players/sign-in/) |
| **Test Drive** | Playing without an account under a guest name like `Guest-7K3MQ`, which stays the same for every join from the same launcher installation. The mode is "Test Drive"; the player is a "guest". | [Your account](/players/sign-in/#test-drive) |
| Server list (список серверов) | The servers that are running now and have reported to NodeMP. In the launcher it is the **Servers** tab, on the website nodemp.com/servers. | [Join a server](/players/join/) |
| **Direct Connect** (прямое подключение) | Joining by `address:port` instead of from the list. | [Join a server](/players/join/#join-by-address) |
| **Hold to play** (зажмите для игры) | The join button: you hold it so you don't join by accident. With holding turned off, it is called **Play**. | [Join a server](/players/join/#join) |
| Strict server (строгий сервер) | A server with `[integrity] verify = "strict"`: it compares your game and user folder with a clean installation. | [When something breaks](/players/troubleshooting/#a-strict-server-refuses-you) |
| Strict session (строгая сессия) | Client rules a server plugin turns on for a session: the game puts the free camera back in the car, closes the console and the editor, cancels the pause, keeps you out of cars the server didn't seat you in, and turns local mods off. Unrelated to a strict server: that one checks files, while a strict session restricts the game. | [Client scripts](/plugins/client-scripting/#strict-sessions) |

## Hosts

| Word | What it means | More |
|---|---|---|
| Host (хост) | The person who runs a server. Not "hoster". | [Run a server](/hosting/quick-start/) |
| Working directory (рабочая папка) | The folder where the server looks for `server.toml`, `resources/` and `content/` and writes `logs/`: the one it was started from, or the one set with `--working-directory`. | [Configuring the server](/hosting/server-toml/) |
| Server key (ключ сервера) | The Host ID and Host secret from your account on nodemp.com. With it the server gets onto the list. | [Get listed](/hosting/registering/) |
| Fingerprint (отпечаток) | The SHA-256 of the server's TLS certificate. Launchers know a server by it. | [Get listed](/hosting/registering/#the-servers-fingerprint) |
| Reference manifest (эталонный манифест) | A description of a clean BeamNG installation of one version, which a strict server checks players against. | [Strict file check](/hosting/strict-verification/) |
| Obfuscation (обфускация) | Scrambling the plugins' client scripts before they are sent to players. Prometheus from the `tools/` folder does it. | [Plugins on the server](/hosting/resources/#obfuscating-client-scripts) |

## Plugin authors

| Word | What it means | More |
|---|---|---|
| Plugin (плагин) | Anything that extends the server: a folder in `resources/` with a server part in Lua (or another language) and, optionally, client scripts, or a native module. | [Overview](/plugins/overview/) |
| Resource (ресурс) | The code's word, not the name of a plugin: it names the `resources/` folder, the `resource.toml` file, `node.resources`, the `[resources]` table and the `resourceUnload` event. In the text, a plugin in such a folder is still a plugin; "resource" appears only where the code's name is meant. | [How a plugin is built](/plugins/resources/) |
| Native module (нативный модуль) | A `.dll` or `.so` library in the `modules/` folder next to the server program; it works through the C ABI. | [Native modules](/plugins/native-modules/) |
| C ABI | The binary interface between the server and native modules, described in `node.h`. The version is written as "major.minor". | [Native modules](/plugins/native-modules/) |
| Language host (языковой хост) | A native module that runs plugins of its own `type`, for example `js-host` for JavaScript. | [JavaScript plugins](/plugins/js-host/) |
| Event (событие) | What you subscribe to with `node.on`: the server's events, requests that can be refused, and wire events from clients. | [Events](/plugins/events/) |
| Wire event (сетевое событие) | A named message between a client script and the server, named `domain:verb`. | [Client scripts](/plugins/client-scripting/) |
| Bus (шина) | The channel between plugins on one server: `node.bus.emit` and `node.bus.on`. | [The bus between plugins](/plugins/bus/) |
| Relay (ретрансляция) | Forwarding one player's traffic to the others. It can be filtered for individual receivers. | [Native modules](/plugins/native-modules/) |
| Driver, authority, spawner (водитель, авторитет, спавнер) | The spawner created the car. The driver sits behind the wheel. The authority is the player whose game simulates the car and sends out its state; usually the driver. | [Players and vehicles](/plugins/players-and-vehicles/) |
