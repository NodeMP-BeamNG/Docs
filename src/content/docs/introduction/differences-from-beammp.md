---
title: Differences from BeamMP
description: What NodeMP and BeamMP do the same, where they differ (transport, plugin runtime, client delivery, tooling), what BeamMP has that NodeMP does not, and why a BeamMP server cannot move over as it is.
---

This page is for people who know BeamMP. NodeMP shares ancestry with it: the game server and the
connection helper started as forks of BeamMP code under the AGPL-3.0-or-later licence, and the
client mod's vehicle synchronization is ported from BeamMP's. The two networks do not
interoperate: the NodeMP launcher joins only NodeMP servers, and a NodeMP server accepts only the
NodeMP launcher. The rest of the page is a plain comparison of the two current releases - where
they do the same thing, it says so; where BeamMP has something NodeMP lacks, it says that too.
The BeamMP side is taken from [docs.beammp.com](https://docs.beammp.com/).

## The same in both

- **The model.** A server sends its mods to joining players, a launcher starts the game and holds
  the connection, server-side Lua reacts to events. The client that simulates a vehicle is its
  authority and the others receive its state - NodeMP's vehicle sync is BeamMP's, ported.
- **Listing.** A key from the project's website goes into the server's config file: an
  `AuthKey` from the BeamMP Keymaster in `ServerConfig.toml`, a Host ID and secret from
  `nodemp.com/hosts` in `[Directory]` of `server.toml`. Same idea, different websites; the keys are
  not interchangeable.
- **Accounts and guests.** A project account signed in through the launcher, or a guest name when
  the server allows it (`AllowGuests` in BeamMP, `[Directory] TestDrive` in NodeMP). A BeamMP
  account does not work on NodeMP and vice versa.
- **Configuration.** One TOML file plus environment variables that override it (`BEAMMP_*` since
  BeamMP 3.2.0, `NODE_*` in NodeMP). Different files and keys; see
  [Configuration](/hosting/configuration/).
- **Content.** Mod zips in a folder on the server (`Resources/Client` in BeamMP, `content/` in
  NodeMP), downloaded by the launcher before the game enters the world.

## What differs

| | NodeMP | BeamMP |
|---|---|---|
| Transport | TLS 1.3 on the TCP session; UDP for the position stream with an authentication trailer; every packet a typed binary `(Category, SubType)` frame. Wire protocol v20 is checked at connect and a launcher with another version is refused. | Plain TCP and UDP; packets tagged by a leading character; game traffic is not encrypted. |
| Plugin runtime | One worker thread runs every handler of every resource: no locks, and a handler that blocks stalls all of them. Waiting is coroutines (`node.async`, `node.sleep`) and callbacks; heavy work goes to a background pool (`node.job`). There is no blocking sleep and no synchronous HTTP in the API. | `MP.*` API; `MP.Sleep` and `Http.Get` block the calling Lua state. Periodic work is an event timer (`MP.CreateEventTimer`). |
| Plugin API shape | `node.on(name, fn)` passes `Player` and `Vehicle` objects; a request is refused with `return false, reason`; one entry point per resource, the rest through `require`. | `MP.RegisterEvent(name, "handler")` passes ids; a request is refused with `return 1`; every top-level `.lua` of the plugin folder is loaded. |
| Reload | Explicit: `node.resources.reload(name)`, with a `resourceUnload` hook before the drop. Nothing watches the files. | Automatic: a change to a top-level `.lua` hot-reloads the plugin, and `onFileChanged` reports every other change under `Resources/Server`. |
| Client-side Lua from a plugin | Streamed from `resources/<name>/client/` at every join, run in the game under the resource's own namespace, never written to disk; obfuscated with Prometheus unless the resource or the host turns it off. It cannot replace files of the game or of the client mod ([Client scripting](/plugins/client-scripting/#what-a-client-file-can-and-cannot-do)). | Ships inside a mod zip in `Resources/Client`, mounted by the game like any other mod. |
| Other languages | A C ABI for native modules (`.dll`/`.so`), and a module can register a language host for another resource type - `type = "js"` with the `js-host` example, which embeds Node and needs a Node build ([Native modules](/plugins/native-modules/)). | Lua only. |
| Database | `node.pg`: an asynchronous PostgreSQL pool ([Database access](/plugins/database/)). | None built in. |
| Game install check | `[General] VerifyGame`: the helper checks the player's install at `size`, `scripts`, `full` or `strict` (against a reference manifest) before every join ([Strict verification](/hosting/strict-verification/)). | No counterpart in `ServerConfig.toml`. |
| Chat | Not part of the server: the `chat` example resource owns it, and `node.chat.say` is silent without it. | Built in: `onChatMessage`, `MP.SendChatMessage`. |
| Console | The server reads no console input; administration is chat commands, the bus or a client half. | Console commands, and `onConsoleInput` for your own. |
| Files and JSON from Lua | `node.fs.read`, `write`, `writeAsync`, `list` inside the resource folder; `node.json.encode`/`decode` and nothing else. The standard `io` and `os` libraries are open ([Resources → Files](/plugins/resources/#files-nodefs)). | `FS.*` anywhere on disk (`Exists`, `CreateDirectory`, `Remove`, `Rename`, `Copy`, `ConcatPaths`, …); `Util.Json*` with prettify, minify, flatten, and diff/patch (RFC 6902). |
| Diagnostics from Lua | `node.server.metrics()` (players, vehicles, net counters, the plugin queue) and the server's own stall watchdog. No OS name, no memory figures, no per-handler timing. | `MP.GetOSName`, `MP.GetStateMemoryUsage`, `MP.GetLuaMemoryUsage`, `Util.DebugExecutionTime`. |
| Protected mods | Every zip in `content/` is sent to every player. | `protectmod`: a listed mod must be obtained by the player. |

## Can I run my BeamMP server on NodeMP?

No. `Node-Server` is a different program with a different configuration file, a different listing
key and a different plugin API, and it does not load `MP.*` plugins. What you can carry over:

- **Your maps and vehicles.** Put the zips in `content/`; the server distributes them to joining
  players.
- **Your plugin logic.** Port it to the `node` API. [Migrating BeamMP plugins](/plugins/migrating/)
  maps the `MP.*` calls and events to their NodeMP equivalents, and lists what has none.
- **Your players.** They install the NodeMP launcher ([Install the launcher](/players/install/))
  and find your server in the list once it has a server key
  ([Registering your server](/hosting/registering/)).
