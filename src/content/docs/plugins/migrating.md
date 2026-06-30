---
title: Migrating BeamMP plugins
description: Port a BeamMP server plugin to NodeMP — the global vehicle id, the sync-owner / persistence model, and the changed event and function signatures.
---

Most BeamMP **server-side** plugins run on NodeMP **unchanged** — same global API (`MP`, `Util`,
`FS`, `Http`), same event names and ordering, same "one plugin folder → one Lua state" model,
vetoing via `return 1`, `MP.RegisterEvent`, `CreateEventTimer`, and so on. A thin translation
layer smooths over the one real difference between the two models: how vehicles are identified.

This page is the porting checklist. For the full compatibility picture see
[BeamMP compatibility](/introduction/beammp-compatibility/); for the new API see
[Server Lua API](/plugins/server-api/).

## Install it like BeamMP

Unpack the plugin into `Resources/Server/<PluginName>/` exactly as on BeamMP. Top-level `.lua`
files load automatically into a single Lua state; nested modules load via `require` (both
`<plugin>/?.lua` and `<plugin>/lua/?.lua` are on `package.path`). Many plugins work with no edits
at all — the admin plugin **CobaltEssentials** v1.7.6 loads and runs unchanged.

## The big change: one global vehicle id

This is the difference that matters when porting.

| | BeamMP | NodeMP |
|---|---|---|
| Vehicle id | per-player pair `(player_id, vehicle_id)` | one **global** `vehicleId` (decimal string, e.g. `"42"`) |
| Removal | `MP.RemoveVehicle(pid, vid)` | `MP.RemoveVehicle(vehicleId)` |
| Position | `MP.GetPositionRaw(pid, vid)` | `MP.GetPositionRaw(vehicleId)` |
| Vehicle data | string `"pid-vid:{ jbm, vcf, pos, rot }"` | object `{ jbm, config, pos, rot }` |

NodeMP's global id **acts as** the BeamMP `vehicle_id`: it is unique and round-trips correctly, so
there's no need to synthesize per-player counters. To keep BeamMP plugins working:

- **`MP.RemoveVehicle` and `MP.GetPositionRaw` accept both forms** — `(vehicleId)` and
  `(playerId, vehicleId)`. The id is always the **last** argument, so existing two-argument calls
  still resolve correctly.
- **`MP.GetPlayerVehicles(pid)`** and the `data` argument of `onVehicleSpawn` / `onVehicleEdited`
  are returned in BeamMP's `"pid-vid:{ … }"` string format, with `config` mapped to `vcf`. So
  plugins that parse that string keep working.
- **`onVehicleReset`** is delivered as plain JSON (as in BeamMP, where the plugin calls
  `json.parse` directly); **`onVehicleDeleted`** carries `(pid, vid)` and already matches.

:::tip
Writing **new** code? Prefer NodeMP's native API, where `vehicleId` is the global id everywhere
and `onVehicleSpawn(spawnerId, vehicleId, carJson)` gives you the raw car JSON. The compatibility
shim only reshapes the flat `MP` API that BeamMP plugins call directly — `NodeMP.*` is unaffected.
:::

## Changed event signatures

Under NodeMP's native API the vehicle events use the global id and a spawner id:

```lua
-- NodeMP native
NodeMP.events.on("onVehicleSpawn", function(spawnerId, vehicleId, carJson) ... end)  -- [veto]
NodeMP.events.on("onVehicleDeleted", function(spawnerId, vehicleId) ... end)
NodeMP.events.on("onVehicleEdited", function(spawnerId, vehicleId, packetJson) ... end) -- [veto]
```

`spawnerId` is the player who created the vehicle (attribution), and `vehicleId` is the global id.
Contrast BeamMP, where these were keyed by the `(playerId, vehicleId)` pair. The full event list
and which events are vetoable is in [Server Lua API](/plugins/server-api/).

## The sync-owner & persistence model

NodeMP separates three roles a vehicle can have, which changes some assumptions BeamMP plugins
make:

- **spawner** — who created the vehicle (attribution; used for `MaxCars` accounting and locks).
- **sync owner** — the single connected client currently transmitting the vehicle's state. The
  server assigns this and can hand it over (e.g. when the driver changes or a client leaves).
- **driver** — whoever is in the driver seat right now.

Two consequences to watch for when porting:

- **Vehicles are persistent.** A player disconnecting does **not** delete their vehicles — the
  server reassigns the sync owner and the car stays in the world. Don't assume "player left ⇒
  their cars are gone." Delete explicitly with `NodeMP.vehicles.remove(vehicleId)` (or `MP.RemoveVehicle`).
- **Authority is server-controlled.** State-bearing actions are accepted only from a vehicle's
  current sync owner (or spawner, for deletes). This is enforced by the server, not the plugin.

See the [wire protocol §5.3](/plugins/protocol/) for the exact selection and persistence rules.

## Player identifiers

- `identifiers.ip` is **always** present.
- `identifiers.beammp` (the BeamMP forum id) is **not** present. Per-account logic that depends
  strictly on `beammp` should fall back to the name or `ip`. NodeMP also exposes a `nodemp`
  identifier (the static account id) for real accounts.

## Server console — `onConsoleInput`

Input typed into the server console is forwarded to Lua as an `onConsoleInput(line)` event, and
whatever string your handler **returns** is printed to the console — exactly how BeamMP plugins
(e.g. CobaltEssentials with its `ce …` commands) print their replies. NodeMP's built-in commands
(`help`, `kick`, `stop`, …) keep working; the "unknown command" message is suppressed while a
plugin is listening for the event.

## Config — the `[General]` section

Many BeamMP plugins read `ServerConfig.toml` **directly** (raw file I/O, bypassing the API),
expecting a flat `[General]` section (`Name`, `Port`, `MaxCars`, `MaxPlayers`, `Map`, `Private`,
`Description`, `Tags`, `Debug`, `LogChat`, `ResourceFolder`, `AuthKey`). NodeMP generates a mirror
`[General]` section for exactly this reason; it keeps the section in sync with the real settings,
but NodeMP itself ignores it. If a plugin reads stale config values, make sure `[General]` exists
and matches — see [Configuration](/hosting/configuration/).

## Known limitations

- **Thin vehicle-data structure.** Fields are mapped by meaning (`vcf` ↔ `config`, `jbm`, `pos`,
  `rot`). Plugins that parse BeamMP-specific internal packet fields may work with reduced fidelity.
- **`[General]` is a mirror, not the source of truth.** Edit values in the real sections and keep
  `[General]` in sync when hand-editing.
- **Client-side plugin parts** (a BeamNG mod script shipped with the plugin) need separate
  verification — this checklist covers the server side. See the
  [Client mod API](/plugins/client-api/).

## Next steps

- [BeamMP compatibility](/introduction/beammp-compatibility/) — what's verified and translated.
- [Server Lua API](/plugins/server-api/) — the native `NodeMP.*` API to port toward.
