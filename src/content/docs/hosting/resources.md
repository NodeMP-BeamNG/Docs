---
title: Resources & mods
description: How the Resources folder works — server plugins in Resources/Server, client mods served to players from Resources/Client, and the auto-generated mods.json.
---

Everything a server adds on top of the base game lives under one folder, set by
`ResourceFolder` in `ServerConfig.toml` (default **`Resources`**). It has two halves:

```
Resources/
├── Server/     # server-side Lua plugins (run on the server)
└── Client/     # BeamNG mod .zip files (sent to every player)
```

Both folders are created empty on first launch, each with a short `README.txt`. The split matters:
**`Server`** code runs only on your machine; **`Client`** mods are downloaded and mounted by every
player who joins.

## Server plugins — `Resources/Server`

Put each plugin in its **own subfolder** here:

```
Resources/Server/
├── MyPlugin/
│   └── main.lua
└── CobaltEssentials/
    └── ...
```

Top-level `.lua` files in a plugin folder are loaded in lexicographic order and **share one Lua
state** (one thread per plugin folder); nested modules load via `require`. Plugins can use both
the BeamMP-compatible global API (`MP`, `Util`, `FS`, `Http`) and NodeMP's namespaced `NodeMP.*`
API.

The server is empty by default. Ready-made examples ship in the repo under
`server/examples/server-plugins` (`00_framework`, `10_admin`, `20_dimensions`, `30_persistence`,
`40_welcome`); copy a folder in to try it. For how plugins work and the full API, see:

- [Plugin overview](/plugins/overview/) — the plugin model and lifecycle.
- [Server Lua API](/plugins/server-api/) — `MP.*` and `NodeMP.*`.
- [BeamMP compatibility](/introduction/beammp-compatibility/) — running BeamMP plugins unchanged.

:::note
A plugin reads and writes data files **inside its own folder** (sandboxed), which is how the
example admin/persistence plugins store bans, the saved world, and module config.
:::

## Client mods — `Resources/Client`

Drop BeamNG mod **`.zip`** files here and they are served to every player automatically:

```
Resources/Client/
├── my_map.zip
├── cool_car.zip
└── mods.json        # auto-generated (see below)
```

When the server (re)scans this folder it:

1. Hashes each `.zip` with **SHA-256** and records its size.
2. Advertises the mod list to joining clients.
3. The launcher **downloads and mounts** each mod for every player on join, then **unmounts** it
   when they leave — so players don't have to install your map or car pack by hand.

Only `.zip` files are treated as mods; `README.txt` / `.md` files are skipped, and anything that
isn't a zip is ignored with a warning.

### `mods.json`

`mods.json` is an **auto-generated cache** the server maintains in `Resources/Client` — you don't
write it by hand. It stores, per mod file, the last-write time, size, SHA-256 hash, and a
`protected` flag, so the server can skip re-hashing files that haven't changed and rehash only the
ones you add or modify. Entries for files you delete are pruned automatically.

That means updating a client mod is just **replacing the `.zip`**: the server notices the changed
size/timestamp and rehashes it on the next scan. (A fresh, empty server may show `mods.json`
containing only `null` until the first scan populates it.)

## Pointing somewhere else with `ResourceFolder`

To keep resources outside the working directory, set `ResourceFolder` to another path:

```toml
[Server]
ResourceFolder = "Resources"
```

The server expects the same `Server/` and `Client/` subfolders under whatever path you choose, and
creates them if missing.

## Next steps

- [Plugin overview](/plugins/overview/) — start writing server plugins.
- [Updating](/hosting/updating/) — how resources survive a server update.
