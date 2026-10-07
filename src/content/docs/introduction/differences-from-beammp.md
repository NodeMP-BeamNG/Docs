---
title: Differences from BeamMP
description: What NodeMP and BeamMP do the same, where they differ (transport, plugin runtime, client delivery, tooling), what BeamMP has that NodeMP does not, and why a BeamMP server cannot move over as it is.
---

If you have experience hosting or developing for BeamMP, this page will help you understand how NodeMP is structured and what changes when transitioning between the two platforms.

While both are multiplayer solutions for BeamNG.drive, their ecosystems and network stacks are completely independent: the NodeMP launcher connects exclusively to NodeMP servers, and a NodeMP server accepts only NodeMP clients.

Below is a direct comparison of both platforms today — where workflows feel familiar, how the internals differ, and what to keep in mind when moving a server or writing plugins. BeamMP details reflect [docs.beammp.com](https://docs.beammp.com/).

## The same in both

The core concepts of both platforms are very similar:

- The underlying architecture follows a familiar model: the server distributes mods to joining players, a desktop launcher starts the game and manages the connection, and the client driving a vehicle remains authoritative for its physics.
- Configuration uses a single primary TOML file that can be overridden by environment variables (`NODE_*` in NodeMP, `BEAMMP_*` since BeamMP 3.2.0). See [Configuration](/hosting/configuration/).
- Mods and maps reside on the server as zip archives (`content/` in NodeMP, `Resources/Client` in BeamMP) and are downloaded automatically before players enter the world.
- Public server listing requires a key from the project's website: the `[Directory]` section in `server.toml` for NodeMP, or an `AuthKey` in `ServerConfig.toml` for BeamMP. Keys and user accounts are entirely separate.
- Both platforms support accounts as well as guest access (`[Directory] TestDrive` in NodeMP, `AllowGuests` in BeamMP).

## What differs

| | NodeMP | BeamMP |
|---|---|---|
| Transport | TLS 1.3 over TCP; UDP position stream with an auth trailer; every packet is a typed binary `(Category, SubType)` frame. Wire protocol v23 is validated on connect (version mismatches are rejected). | Plain TCP and UDP; packets identified by a leading character; game traffic is unencrypted. |
| Plugin runtime | Non-blocking, single-threaded event loop for all resource handlers: no locks, but blocking calls freeze the worker. Async tasks use coroutines (`node.async`, `node.sleep`) or thread pools (`node.job`). No synchronous HTTP or blocking sleep. | `MP.*` API; calls like `MP.Sleep` and `Http.Get` block the calling Lua state. Periodic work runs via `MP.CreateEventTimer`. |
| Plugin API shape | `node.on(name, fn)` receives structured `Player` and `Vehicle` objects; reject actions with `return false, reason`; one entry point per resource, other modules loaded via `require`. | `MP.RegisterEvent(name, "handler")` passes raw IDs; reject actions with `return 1`; automatically loads every top-level `.lua` file in the folder. |
| Reload | Explicit: `node.resources.reload(name)` with a `resourceUnload` cleanup hook. Files are not watched automatically. | Automatic: editing any top-level `.lua` triggers a hot reload; `onFileChanged` watches everything under `Resources/Server`. |
| Client-side Lua | Streamed on join from `resources/<name>/client/`, runs inside the game under the resource's namespace, and never touches the disk. Obfuscated with Prometheus by default. Cannot overwrite base game or client mod files ([Client scripting](/plugins/client-scripting/#what-a-client-file-can-and-cannot-do)). | Packaged inside mod zips in `Resources/Client` and mounted by BeamNG like standard mods. |
| Other languages | C ABI for native modules (`.dll`/`.so`). Modules can provide language runtimes — such as `type = "js"` via `js-host` ([Native modules](/plugins/native-modules/)). | Lua only. |
| Database | Built-in asynchronous PostgreSQL pool via `node.pg` ([Database access](/plugins/database/)). | No built-in database support. |
| Game install check | `[General] VerifyGame`: the helper verifies player game files (`size`, `scripts`, `full`, or `strict` against a reference manifest) before join ([Strict verification](/hosting/strict-verification/)). | No equivalent in `ServerConfig.toml`. |
| Chat | Modular: chat is handled by the `chat` resource; `node.chat.say` is a no-op without it. | Core feature: built-in `onChatMessage` and `MP.SendChatMessage`. |
| Console | The server takes no direct stdin console commands; administer via chat, event bus, or custom client tools. | Interactive console with built-in commands and an `onConsoleInput` hook. |
| Files and JSON from Lua | Resource-scoped: `node.fs.read`, `write`, `writeAsync`, `list`; `node.json.encode`/`decode`. Standard `io` and `os` libraries remain accessible ([Resources → Files](/plugins/resources/#files-nodefs)). | System-wide `FS.*` file operations (`Exists`, `CreateDirectory`, `Remove`, etc.); `Util.Json*` with prettify, minify, flatten, and RFC 6902 diff/patch. |
| Diagnostics from Lua | `node.server.metrics()` (player counts, vehicle stats, network counters, event queue) plus a stall watchdog. No OS name, memory stats, or per-handler timings. | `MP.GetOSName`, `MP.GetStateMemoryUsage`, `MP.GetLuaMemoryUsage`, `Util.DebugExecutionTime`. |
| Protected mods | All zips in `content/` download to every connecting player. | `protectmod`: allows marking mods that clients must obtain separately. |

## Can I run my BeamMP server on NodeMP?

No. `Node-Server` is a distinct binary with its own configuration structure, directory keys, and plugin architecture. It does not load `MP.*` plugins.

When migrating a server:
- **Maps and vehicles** move over as they are: simply place your mod zip archives into `content/`.
- **Plugin scripts** need to be rewritten using the `node` API. See the [Migration guide](/plugins/migrating/) for a detailed comparison of functions and events between platforms.
- **Players** will need to [Install the launcher](/players/install/). Once you [Register your server](/hosting/registering/), your community can find it in the public server list.
