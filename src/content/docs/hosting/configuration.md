---
title: Configuration
description: Every key in ServerConfig.toml — the [Server], [Network], [Backend], [Gameplay], [Logging] and [Updates] sections — with its type, default, and meaning.
---

A NodeMP server is configured through a single file, **`ServerConfig.toml`**, in the folder you
run the server from. It is created automatically on first launch (see the
[quick start](/hosting/quick-start/)) with sensible defaults, then yours to edit.

:::note
Settings are read **once at startup**. Edit a value, save the file, then **restart the server**
to apply it. Keep quotes around text values; numbers and `true`/`false` stay unquoted.
:::

## `[Server]` — identity

How your node presents itself in the server browser, and who may join.

| Key | Type | Default | Meaning |
|---|---|---|---|
| `Name` | string | `"NodeMP Server"` | Name shown in the server browser. |
| `Description` | string | `"Default NodeMP server"` | One-line description in the browser. |
| `Tags` | string | `""` | Comma-separated tags, e.g. `"Freeroam,Drift"`. |
| `Map` | string | `"/levels/gridmap_v2/info.json"` | The level the server hosts. |
| `ResourceFolder` | string | `"Resources"` | Folder holding server plugins and client mods. See [Resources & mods](/hosting/resources/). |
| `Private` | bool | `true` | Hide the node from the public browser. Set `false` to be listed (also requires backend credentials and a reachable port). |
| `AllowGuests` | bool | `true` | Allow players without an account to join. |

## `[Network]` — uplink

The listening socket and per-session limits.

| Key | Type | Default | Meaning |
|---|---|---|---|
| `IP` | string | `"0.0.0.0"` | Bind address; `0.0.0.0` means all interfaces. |
| `Port` | int | `30814` | Listening port — used for **both** TCP and UDP. |
| `MaxPlayers` | int | `10` | Maximum simultaneous players. |
| `MaxCars` | int | `5` | Vehicles each player may spawn. |
| `TrustLoopback` | bool | `true` | Trust `127.0.0.1` peers without backend auth (local dev). **Set `false` if the server sits behind a reverse proxy** that appears as loopback, otherwise external players could be treated as trusted. |

## `[Backend]` — mesh credentials

The credentials the server presents to the backend to open its host session and appear in the
public list. Leave both blank to stay **private / LAN-only**.

| Key | Type | Default | Meaning |
|---|---|---|---|
| `HostId` | string | `""` | Host id issued by the backend. |
| `HostSecret` | string | `""` | Host secret issued by the backend (shown only once). |

Get these by registering your host — see [Registering your host](/hosting/registering/), which
can also fill this section in for you.

:::caution
The **address** of the backend itself is **not** set here. It comes from the
`NODEMP_BACKEND_URL` environment variable (default `https://api.nodemp.com`). See
[Running the server](/hosting/running/).
:::

## `[Gameplay]` — ruleset

| Key | Type | Default | Meaning |
|---|---|---|---|
| `InformationPacket` | bool | `false` | Advanced; keep `false` unless told otherwise. |

## `[Logging]` — telemetry

| Key | Type | Default | Meaning |
|---|---|---|---|
| `LogChat` | bool | `true` | Echo chat messages to the console. |
| `Debug` | bool | `false` | Verbose trace and event logging. Handy while testing plugins. |

## `[Updates]`

Controls the "your server is outdated" reminder.

| Key | Type | Default | Meaning |
|---|---|---|---|
| `ImScaredOfUpdates` | bool | `false` | Set `true` to mute the outdated reminder. |
| `UpdateReminderTime` | int | `360` | Minutes between update reminders. |

## `[General]` — BeamMP compatibility mirror

When NodeMP generates the config it also appends a `[General]` section in BeamMP's flat layout
(`Name`, `Port`, `MaxCars`, `MaxPlayers`, `Map`, `Private`, `Description`, `Tags`, `Debug`,
`LogChat`, `ResourceFolder`, `AuthKey`). Many BeamMP server plugins read `ServerConfig.toml`
directly (raw file I/O, bypassing the API) and expect exactly this section.

NodeMP itself **ignores** `[General]` — it reads its own typed sections above. Treat `[General]`
as a mirror, not the source of truth:

- Edit real values in `[Server]` / `[Network]` / etc.
- If you hand-edit a value a plugin reads from `[General]`, keep the two in sync.
- For a config created by an older version that lacks `[General]`, add it by hand or delete
  `ServerConfig.toml` and let the server regenerate a fresh one.

See [BeamMP compatibility](/introduction/beammp-compatibility/) for the full picture.

## Example

A complete generated `ServerConfig.toml` (comments trimmed):

```toml
[Server]
Name           = "NodeMP Server"
Description    = "Default NodeMP server"
Tags           = ""
Map            = "/levels/gridmap_v2/info.json"
ResourceFolder = "Resources"
Private        = true
AllowGuests    = true

[Network]
IP            = "0.0.0.0"
Port          = 30814
MaxPlayers    = 10
MaxCars       = 5
TrustLoopback = true

[Backend]
HostId     = ""
HostSecret = ""

[Gameplay]
InformationPacket = false

[Logging]
LogChat = true
Debug   = false

[Updates]
ImScaredOfUpdates  = false
UpdateReminderTime = 360
```

## Next steps

- [Running the server](/hosting/running/) — Linux, Windows, and Docker.
- [Registering your host](/hosting/registering/) — fill in `[Backend]` and get listed.
