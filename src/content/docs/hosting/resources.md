---
title: Mods and resources
description: Add maps and cars for players (content/), install plugins (resources/), what the example resources do, how client scripts are obfuscated, and native modules.
---

A server can add three kinds of things on top of the game. This page is about installing them;
writing plugins is the [Plugin development](/plugins/overview/) section.

| | Mods (content) | Resources | Native modules |
|---|---|---|---|
| What | BeamNG mod zips: a map, a car, a sound pack. | Plugins: a folder of Lua that runs on the server, optionally with scripts sent to players. | Compiled libraries (`.dll`, `.so`) for work that has to be fast. |
| Where | `content/` in the working directory | `resources/<name>/` in the working directory | `modules/` next to the executable |
| Players get | The zip, downloaded by the launcher before the game starts. | The scripts, sent when they join. Nothing to install. | Nothing; it runs on the server. |
| Picked up | At start | At start; one can be reloaded while running | At start, before resources |

## Mods: maps and cars

Put the mod zips into `content/` and restart. At start the server checks each zip and logs
`serving 2 mods (148.3 MB) from content/`; a file that isn't a zip is reported as
`'…' is not a ZIP file and will be ignored`. The folder is read at start only, so restart after
adding, replacing or removing a zip.

Players download the zips through the launcher before their game starts and keep them in the
launcher's cache, so the next visit downloads nothing. The launcher's server card lists the files
and their total size, and players can filter servers by it. Keep the folder lean.

**A custom map**: put its zip into `content/` and set `[General] Map` to
`/levels/<folder>/info.json`, where `<folder>` is the map's folder under `levels/` inside the zip.
If the map has a picture of its own, the server uses it for the list
([Get listed](/hosting/registering/#the-picture)).

**A mod players must get themselves**: open `content/mods.json` (the server writes it) and set
`"protected": true` on that zip's entry. The server then never sends the file, and a player who
doesn't have it is told where to put it in their launcher's cache. The mark survives replacing the
zip.

## Resources

A resource is a folder. Installing one means copying the folder into `resources/` and restarting.
The log confirms each one:

```
demo-numbers v1.0 loaded — lua · server 1 file · 1 client file
1 resource · 1 module loaded
```

Chat, `/` commands and the server's own chat messages work without any resource.

### The examples

The release archive has a few ready-made resources in `examples/`, next to `Node-Server`, with an
`examples/README.txt` that says what each one does. Copy a whole folder into `resources/` to use
one; the copy is yours to change and survives updates.

| Example | What it does |
|---|---|
| `demo-numbers` | The smallest resource with a server half and a client half. |
| `freeroam-example` | Greets players, answers a client event, runs timers. |
| `vehicle-cleanup` | Deletes cars nobody uses any more, by rules you set in its `resource.toml`. |
| `gatekeeper-example` | Shows how to refuse a join, a spawn or an edit, with a reason the player sees. |
| `seat-demo` | Seats players into cars from the server, takes them out, swaps them. |
| `nodegrab-allow` | Allows the experimental node grabber, which is refused unless a plugin says yes. |
| `devapi-example` | A tour of the plugin API, one feature at a time. |
| `chat` | Not needed any more: chat is part of the server. Kept as an example of reading chat lines. |
| `session-report` | Who played, for how long, in what. Written in JavaScript, which needs a native module the archive doesn't include; without it the server skips this one. |

[The example plugins](/plugins/examples/) walks through them for plugin authors.

### resource.toml

A resource may carry a `resource.toml`; everything in it is optional:

```toml
name = "demo-numbers"
version = "1.0"

[client]
obfuscation = "light"

[config]
greeting = "Welcome!"
```

`name` and `version` show in the log; `[config]` holds the resource's own settings, which its
author documents. The full list of keys is on [Resources](/plugins/resources/#resourcetoml).

### Reloading one resource

`reload <name>` in the server console runs a resource's server half again without restarting the
server. Its client scripts are packed once, at start: changes to those reach players after a
restart.

## Client scripts and obfuscation

Scripts a resource sends to players are scrambled first (`[Resources] Obfuscate = true`, the
default), so they're harder to copy. The tool is Prometheus, a Lua program in `tools/` (it has
nothing to do with the monitoring system of the same name). It needs Lua 5.1 to run:

- Windows: included in the archive, found automatically.
- Linux: install your distribution's `lua5.1` and set `NODE_LUA=/usr/bin/lua5.1`. The Docker image
  has it built in.

When it works the log says `client obfuscation ready · runner … · Prometheus (cache .obfcache)`.
Without Lua you get
`no Lua 5.1/LuaJIT runner found under tools/, client scripts will be shipped unobfuscated (drop lua5.1.exe in tools/lua515/ or set NODE_LUA)`,
and without `tools/`, `Prometheus not found under any tools/ dir, client scripts will be shipped unobfuscated`.
Either way the server runs and sends the scripts as plain text. `Node-Server --obf-selftest` checks
the setup and prints `[obf-selftest] available=1` when it works.

A resource picks how hard to scramble in `[client] obfuscation`: `none`, `light` (the default, fine
for code that runs every frame), `medium`, or `strong` (for menus and one-off setup, not per-frame
code). Results are cached in `.obfcache/`, which can be deleted at any time.

The server also checks every client script for syntax errors when it packs it, and says so:
`race · client file 'main.lua' has a syntax error: main.lua:1: unexpected symbol near '=' (the file ships anyway; the game's Lua will very likely refuse it too)`.

## Native modules

Modules go into `modules/` next to the executable and load before resources. The archive already
has one: the database module (`db.dll` or `db.so`), which plugins use to talk to PostgreSQL or
SQLite ([Database](/plugins/database/)). Until it's configured, it logs one warning at start and
otherwise waits.

Each module is checked against the server's plugin interface at load, and one built for an
incompatible version is refused with a message asking for a rebuild. In Docker, `modules/` is inside
the image, not on the data volume, so adding a module means building an image on top of it.
