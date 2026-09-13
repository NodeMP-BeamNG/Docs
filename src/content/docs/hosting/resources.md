---
title: Resources and content
description: Install resources under resources/ and client mods under content/; the resource.toml schema, client obfuscation, content encryption, VerifyGame.
---

A server adds things on top of the game in three ways. This page covers installing them and the
settings that apply; writing them is the subject of [Plugin development](/plugins/overview/).

| | Resource | Content | Native module |
|---|---|---|---|
| What | A folder with a server-side script (Lua or, with `js-host`, JavaScript) and optionally client Lua that is streamed to players. | A BeamNG mod zip: a map, a car, a sound pack. | A compiled `.so` or `.dll` built against the server's SDK. |
| Where | `resources/<name>/` in the working directory | `content/` in the working directory (`[Content] Folder`) | `modules/` next to the executable |
| Players get | The client scripts, at every join, after the content sync. Nothing to install. | The zip, downloaded and mounted by the launcher before the game starts. | Nothing; it runs on the server. |
| Loaded | At start, after the modules | Indexed at start | At start, first |

## Installing a resource

Copy the folder into `resources/` and restart. The log confirms it:

```
demo-numbers v1.0 loaded — lua · 1 server file · 1 client file
1 resource · 0 modules loaded
```

A folder that has neither a server script nor client scripts is skipped silently. Under Docker
the folder is `data/resources/<name>/`; make it readable for user id 10001
(`sudo chown -R 10001:10001 data`) and restart the container.

## resource.toml

Every resource folder may carry a `resource.toml`. Everything in it is optional; a folder without
one is a Lua resource named after the folder with `server/main.lua` as its entry point.

```toml
name = "demo-numbers"
version = "1.0"
type = "lua"

[server]
main = "server/main.lua"

[client]
files = ["main.lua"]
obfuscation = "light"
```

| Key | Default | Meaning |
|---|---|---|
| `name` | the folder name | The resource's name in logs, in the API and in the packets that carry its client files. |
| `version` | empty | Shown after the name in the load line (`demo-numbers v1.0`). |
| `type` | `"lua"` | Which runtime runs the server side; lower-cased. `"js"` needs the `js-host` module. A type no module provides is skipped with `resource type 'js' has no language host loaded, skipping (a native module in modules/ must register one)`. |
| `[server] main` | `"server/main.lua"` | The server-side entry point, relative to the resource folder. It must stay inside the folder; a path that escapes it is refused. A resource may have no server side at all. |
| `[client] files` | every `.lua` under `client/`, recursively | The files streamed to players, relative to `client/`. When omitted, files in `client/lua/ge/extensions/` come first and the rest follow in alphabetical order. Listed paths must also stay inside the folder. |
| `[client] obfuscation` | `"light"` | `none`, `light`, `medium` or `strong`. `off` and `false` mean `none`; `high` and `full` mean `strong`; anything else is `light`. Ignored when `[Resources] Obfuscate = false`. |

A `[config]` table is not read by the server; the resource itself reads it as `node.config`, so
its keys are whatever the resource's author documented (see `vehicle-cleanup` in the examples).

### Client files

Client Lua is sent right after the content sync, before the join is announced to other
resources, as `Content::ResourceChunk` packets of up to 900 KB each. A file under
`client/lua/vehicle/` is delivered as a vehicle-side script, everything else as a game-engine
script. A single file above the 900 KB cap is skipped with a warning. Obfuscation happens
before delivery and is invisible to the client mod.

## Obfuscation

With `[Resources] Obfuscate = true` (the default) client Lua is run through a bundled copy of
the Prometheus obfuscator before it is streamed. Prometheus is a Lua program, so the server needs
a Lua 5.1 or LuaJIT executable to run it:

- Windows: `tools\lua515\lua5.1.exe` from the release archive, found automatically.
- Linux: the release archive has no runner. Install the distribution's `lua5.1` package and set
  `NODE_LUA=/usr/bin/lua5.1`. The Docker image has both built in.

At start the server checks the tiers on a sample module. Success is
`client obfuscation ready · runner lua5.1 · Prometheus (cache .obfcache)`. Without a runner you
get `no Lua 5.1/LuaJIT runner found under tools/, client scripts will be shipped unobfuscated (drop lua5.1.exe in tools/lua515/ or set NODE_LUA)`,
and with `tools/` missing `Prometheus not found under any tools/ dir, client scripts will be shipped unobfuscated`.
In both cases the server runs and ships plain source. A file Prometheus cannot handle is also
shipped plain, with a `Warn` line naming it, so a join never fails on obfuscation.
`Node-Server --obf-selftest` runs the same check from the command line and prints
`[obf-selftest] available=1` when it works.

The three tiers, from `[client] obfuscation`: `light` renames locals and hides string constants
(safe for code that runs every frame); `medium` adds indirection on locals and rewrites numbers
(heavier at runtime); `strong` also wraps the whole file (for menus and one-shot setup, not for
per-frame code). Output is deterministic and cached in `.obfcache/` next to `tools/`, so
restarts and rejoins do not re-run Prometheus for unchanged files; the folder can be deleted at
any time.

## Content: client mods

Put mod zips into `content/`. At start the server hashes each zip with SHA-256, caches the hash
in `content/mods.json` by size and modification time, and logs
`serving 2 mods (148.3 MB) from content/`. Anything that is not a `.zip` is reported with
`'…' is not a ZIP file and will be ignored`. The folder is indexed at start only: after adding,
replacing or removing a zip, restart. Replacing a zip is enough for an update; the changed size
or time triggers a rehash.

Joining players download the zips through the launcher before BeamNG starts, and the launcher
mounts them for that session only. The names and total size are part of the beacon, so the
launcher's server list shows how much a join will download, and players can filter servers by
content size. Keep the folder small.

`[Content] Encrypt = true` encrypts the zips in transit with ChaCha20 and a key generated at each
start; the launcher then keeps only encrypted copies in its cache and deletes the decrypted zips
from the game's mod folder when the player leaves. While a player is in the session the plain
zip exists on their disk, so this deters collecting mods from a cache; it does not stop a
determined user.

## Game install check

`[General] VerifyGame` decides how much of a joining player's BeamNG install is compared with
the game's own file list before the join goes ahead. The launcher always runs at least the
`size` check, so the setting chooses how much more to ask for: `scripts` catches an edited game
script, `full` hashes the whole install and is too slow for a join. A mismatch refuses the
player with the reason. The check covers the game's own files, not the zips from `content/`.
Values and timings are in [Configuration](/hosting/configuration/).

## Native modules

Modules are loaded from `modules/` next to the executable, before resources, and can teach the
server a new resource language: `js-host` registers `type = "js"`. Each module is checked
against the server's plugin ABI and refused with a rebuild request when the major version
differs. A module is built from source against the SDK; the Docker image ships an empty
`modules/` inside the image, not on the `/data` volume, so a module under Docker needs an image
built on top of it.

## Next steps

- [Plugin development](/plugins/overview/) — the resource model, the client `node` table and the
  server API.
- [Updating](/hosting/updating/) — what an update does to `resources/`, `content/` and the cache.
