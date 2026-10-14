---
title: Differences from BeamMP
description: For people who know BeamMP - what works the same in NodeMP, what works differently, and what moving a server over involves.
---

If you have played, hosted or written plugins for BeamMP, much of NodeMP will feel familiar. The
two are separate projects, though: the NodeMP launcher joins only NodeMP servers, and a NodeMP
server accepts only NodeMP players. This page lists what carries over and what does not.

## What is the same

- A desktop launcher starts the game and handles the connection; a client mod does the work
  inside the game.
- The server sends its mods (cars, maps) as zip files to everyone who joins, before they enter
  the world.
- The player driving a car is the one whose game simulates it.
- The server is configured with one TOML file, and every setting can also come from an
  environment variable (`NODE_*` in NodeMP).
- A public listing needs a key from the project's website, and players can join with an account
  or as guests (NodeMP calls it Test Drive).

## What works differently

| | NodeMP | BeamMP |
|---|---|---|
| Connection | TLS 1.3 for everything reliable; positions over UDP, each datagram signed. Launcher and server check each other's protocol version on connect. | Plain TCP and UDP. |
| Game file check | The server can ask the launcher to check the player's install, up to a strict check against a clean copy ([Strict verification](/hosting/strict-verification/)). | No equivalent setting. |
| Chat | Part of the server. Plugins can refuse or rewrite a line, or take it as their own command (`chatMessageRequest`). | Part of the server, with `onChatMessage`. |
| Server console | `help`, `status`, `players`, `kick`, `say`, `reload`, `stop` ([Administration](/hosting/administration/)). Plugins cannot add console commands yet. | Console with built-in commands and `onConsoleInput`. |
| Plugin API | `node.on(name, fn)`; handlers get `Player` and `Vehicle` objects; refuse with `return false, "reason"`. One entry file per resource, more files through `require`. | `MP.RegisterEvent(name, "handler")` with ids; refuse with `return 1`; every top-level `.lua` file is loaded. |
| Waiting | Nothing blocks. Timers, coroutines (`node.async`, `node.sleep`) and background jobs; HTTP is asynchronous. | `MP.Sleep` and `Http.*` block the plugin. |
| Reloading a plugin | On request: `reload <name>` in the console or `node.resources.reload(name)`, with a `resourceUnload` hook to save state. | Automatic when a file changes. |
| Scripts in the player's game | Streamed on join from the resource's `client/` folder; never written to the player's disk; obfuscated by default. | Shipped inside mod zips. |
| Database | The `db` module in the server archive: PostgreSQL and SQLite, and MySQL/MariaDB on Windows ([Database](/plugins/database/)). | None built in. |
| Other languages | Native modules in C or C++ against a C header; a module can add a language. | Lua only. |
| Protected mods | A mod marked `protected` in `content/mods.json` is never sent; players put it in their launcher cache themselves. | `protectmod`. |

Players notice one more thing: the NodeMP launcher downloads a server's mods and checks the game
files before it starts the game, and a connection that breaks mid-session resumes within 30 seconds
by default instead of ending it.

## Can I move my BeamMP server over?

Most of it, by hand:

- **Maps and cars** move as they are: put the zips into the server's `content/` folder.
- **Settings** go into `server.toml`; the [configuration page](/hosting/configuration/) lists
  them. The listing key comes from your NodeMP account ([Get listed](/hosting/registering/)).
- **Plugins** have to be ported to the `node` API. [Migrating BeamMP plugins](/plugins/migrating/)
  maps every `MP.*` call and event to its NodeMP form and walks through a port.
- **Players** install the NodeMP launcher ([Install the launcher](/players/install/)).
