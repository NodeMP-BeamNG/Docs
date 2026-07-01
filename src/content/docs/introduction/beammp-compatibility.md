---
title: BeamMP compatibility
description: How NodeMP runs unmodified BeamMP server-side Lua plugins, what is translated between the two models, and the known limitations.
---

NodeMP runs server-side Lua plugins written for **BeamMP** without editing their code. The
plugin engine is ported from BeamMP (`TLuaEngine` / `TLuaPlugin`): the same global API
(`MP`, `Util`, `FS`, `Http`), the same event names and ordering, the same "one plugin folder →
one Lua state" model, vetoing via `return 1`, `MP.RegisterEvent`, `CreateEventTimer`, and so on.

On top of that sits a thin **translation layer** (`server/include/Lua/BeamMPCompat.h`) that
smooths over the single fundamental difference between the two models: vehicle identification.

## Verified

The admin plugin **[CobaltEssentials](https://github.com/prestonelam2003/CobaltEssentials)**
v1.7.6 loads and runs unchanged: every module and CobaltDB initializes, the config is read,
extensions load, and console commands respond (`ce help`, `ce status`, `ce about`,
`ce setgroup`, `ce setcfg`, …). Zero Lua errors on load or at runtime.

## What is translated, and how

### 1. Vehicle identifiers

| | BeamMP | NodeMP |
|---|---|---|
| Vehicle ID | per-player: `(player_id, vehicle_id)` | one global `vehicle_id` |
| Signatures | `MP.RemoveVehicle(pid, vid)`, `MP.GetPositionRaw(pid, vid)` | `(vehicleId)` |
| Vehicle data | string `"pid-vid:{ jbm, vcf, pos?, rot? }"` | object `{ jbm, config, … }` |

The solution: **our global id acts as the BeamMP `vehicle_id`** (it is unique and round-trips
correctly, so there is no need to synthesize per-player counters).

- `MP.RemoveVehicle` and `MP.GetPositionRaw` (C++, `Lua/Engine.cpp`) accept **both**
  `(vehicleId)` **and** `(playerId, vehicleId)` — in the two-argument form the id is the
  **second** argument (the single-argument form uses its sole argument). Existing two-argument
  calls still resolve correctly because the vehicle id a plugin holds **is** the global id.
- `MP.GetPlayerVehicles(pid)` and the `data` argument of the `onVehicleSpawn` /
  `onVehicleEdited` events are returned in BeamMP's `"pid-vid:{ … }"` format, with `config`
  mapped to `vcf` (`server/include/Lua/BeamMPCompat.h`). The `pos`/`rot` fields are typically
  **absent** — a spawn's car JSON carries `jbm` + `config` (no top-level position), and
  `onVehicleEdited` wraps the raw edit packet, which has no car fields.
- `onVehicleReset` is delivered as plain JSON (as in BeamMP, where the plugin calls
  `json.parse` directly); `onVehicleDeleted` carries `(pid, vid)` and already matches.

`NodeMP.*` (our own API) is **unchanged**: the `NodeMPApi.h` prelude captures the native
`MP.RegisterEvent` / `MP.GetPlayerVehicles` before the shim is installed, so the overrides on
the global `MP` table affect only plugins that call the flat `MP` API directly (that is,
BeamMP plugins).

### 2. Server console — `onConsoleInput`

Input typed into the server console is forwarded to Lua as an `onConsoleInput(line)` event
(`server/src/Core/ConsoleCommands.cpp`). Whatever string the handler **returns** is printed
to the console — this is how BeamMP plugins (for example CobaltEssentials with its `ce …`
commands) print their replies. NodeMP's built-in commands (`help`, `kick`, `stop`, …) keep
working; the "unknown command" message is suppressed while a plugin is listening for the event.

### 3. Server config — the `[General]` section

Many BeamMP plugins read `ServerConfig.toml` **directly** (raw file I/O, bypassing the API),
expecting a flat `[General]` section (`Name`, `Port`, `MaxCars`, `MaxPlayers`, `Map`,
`Private`, `Description`, `Tags`, `Debug`, `LogChat`, `ResourceFolder`, `AuthKey`).

When generating `ServerConfig.toml`, NodeMP now **also writes a mirror `[General]` section**
(`server/src/Core/Config.cpp`) kept in sync with the main settings. NodeMP itself ignores it
(it reads its own typed sections: `[Server]`, `[Network]`, …).

:::note
For an **existing** config created by an older version, add the `[General]` section by hand
(or delete `ServerConfig.toml` and let the server generate a fresh one).
:::

## Installing a BeamMP plugin

Unpack the plugin into `Resources/Server/<PluginName>/` (exactly as in BeamMP). Top-level
`.lua` files load automatically into a single Lua state; nested modules load via `require`
(both `<plugin>/?.lua` and `<plugin>/lua/?.lua` are added to `package.path`).

## Known limitations

- **Thin vehicle-data structure.** Fields are mapped by meaning (`vcf` ↔ `config`, `jbm`,
  `pos`, `rot`). Plugins that parse BeamMP-specific internal packet fields may work with
  reduced fidelity.
- **Player identifiers.** `identifiers.ip` is always present; `identifiers.beammp` (the BeamMP
  forum id) is not. Per-account logic that depends strictly on `beammp` can fall back to the
  name or `ip`.
- **`[General]` in the config** is a mirror, not the source of truth: edit values in the main
  sections (and keep `[General]` in sync when editing by hand).
- Plugins with a **client-side** part (a BeamNG mod script) need separate verification — this
  page covers the server side.

## See also

- [Migrating BeamMP plugins](/plugins/migrating/) — port a plugin to NodeMP's native API.
- [Resources & mods](/hosting/resources/) — where plugins and mods live on a server.
