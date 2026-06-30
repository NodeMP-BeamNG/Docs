---
title: Overview
description: How NodeMP server plugins work — where they live, the one-folder-one-Lua-state model, the event lifecycle, and the two APIs available to them.
---

NodeMP runs **server-side Lua plugins** that react to what happens on your server: players
joining, vehicles spawning, chat messages, console commands, timers, and more. Plugins are how
you add admin commands, persistence, custom game modes, MOTDs — anything beyond the base relay.

Because the plugin engine is ported from BeamMP, **BeamMP server plugins run on NodeMP largely
unchanged**, and you also get NodeMP's own cleaner `NodeMP.*` API. See
[BeamMP compatibility](/introduction/beammp-compatibility/) for the compatibility details.

## Where plugins live

Plugins live under the server's resource folder, in **`Resources/Server`**, each in its own
subfolder:

```
Resources/Server/
├── MyPlugin/
│   ├── main.lua
│   └── lua/
│       └── helper.lua
└── CobaltEssentials/
    └── ...
```

The folder is empty by default. To install a plugin, drop its folder in (exactly as in BeamMP).
For where this sits relative to client mods, see [Resources & mods](/hosting/resources/).

## One plugin folder, one Lua state

The core model — identical to BeamMP — is:

- **Each plugin folder is one Lua state, running on its own thread.** Plugins are isolated from
  each other; they communicate over events, not shared globals.
- **All top-level `.lua` files in a folder load into that one shared state**, in lexicographic
  order. This is why the bundled examples are named `00_framework.lua`, `10_admin.lua`,
  `20_dimensions.lua`, … — the numeric prefixes set load order, and later files can use what
  earlier ones defined (e.g. `10_admin` registers a command registry that `20_dimensions` adds
  to).
- **Nested modules load with `require`.** Both `<plugin>/?.lua` and `<plugin>/lua/?.lua` are on
  `package.path`, so `require("helper")` finds `lua/helper.lua`.

:::note
Files in the **same** folder share state and can call each other directly. Files in **different**
plugin folders do not — keep a self-contained feature in one folder.
:::

## Lifecycle and events

A plugin is event-driven. On load, its top-level code runs once (register handlers, set up
state); after that the server calls your handlers as things happen. Key lifecycle events:

| Event | When |
|---|---|
| `onInit` | The Lua state has started. |
| `onPlayerJoin` | A player finished auth and sync. |
| `onPlayerDisconnect` | A player left. |
| `onChatMessage` | A player sent a chat message (vetoable). |
| `onVehicleSpawn` / `postVehicleSpawn` | A player spawns a vehicle (the first is vetoable). |
| `onVehicleDeleted`, `onVehicleEdited`, `onVehicleReset` | Vehicle lifecycle. |
| `onShutdown` | The server is stopping. |

Some events can be **vetoed** by returning a non-zero integer (for example, returning `1` from
`onChatMessage` swallows the message — that's how the example admin plugin keeps `/commands` out
of public chat). The full list of events, their arguments, and which are vetoable is in
[Server Lua API](/plugins/server-api/).

## Two APIs, both available

Inside a plugin you have:

- **The BeamMP-compatible global API** — `MP.*`, `Util.*`, `FS.*`, `Http.*`, with BeamMP's event
  model (`MP.RegisterEvent`, `CreateEventTimer`, veto via `return 1`). Existing BeamMP plugins
  use this and keep working.
- **The namespaced `NodeMP.*` API** — a cleaner surface built on top of the same primitives
  (`NodeMP.events.on`, `NodeMP.players.get`, `NodeMP.chat.broadcast`, `NodeMP.vehicles.remove`,
  …). New code should prefer this.

A minimal plugin (`Resources/Server/Hello/main.lua`):

```lua
local NodeMP = _G.NodeMP

NodeMP.events.on("onPlayerJoin", function(playerId)
    NodeMP.chat.send(playerId, "Welcome to the server!")
end)
```

## Learn from the examples

The repository ships five example plugins under `server/examples/server-plugins` that together
demonstrate most of the API:

- **`00_framework.lua`** — a module registry + client manifest (enable/disable features, persisted
  config).
- **`10_admin.lua`** — chat `/` commands with a permission model and a reusable command registry.
- **`20_dimensions.lua`** — parallel worlds on one map (a framework module, off by default).
- **`30_persistence.lua`** — saving and restoring the vehicle world to disk.
- **`40_welcome.lua`** — a join greeting / MOTD.

Copy a folder into `Resources/Server` to try it.

## Next steps

- [Server Lua API](/plugins/server-api/) — the full `MP.*` and `NodeMP.*` reference.
- [Wire protocol](/plugins/protocol/) — the packet format underneath the API.
- [Client mod API](/plugins/client-api/) — the `NodeMP.*` API inside the BeamNG mod.
- [Migrating BeamMP plugins](/plugins/migrating/) — port a plugin to NodeMP's model.
