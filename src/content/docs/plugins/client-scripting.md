---
title: Client scripting
description: The two client surfaces - the streamed node table in a resource's client files, and the NodeMP.* SDK for mods that ship with the client mod.
---

Two kinds of Lua run on a player's machine for you. A resource's **client files** are streamed
from the server when the player joins, run inside the client mod and talk to your server half
through the client `node` table. A **mod that ships with the client** - a zip in `content/`, or a
mod the player installed - uses the `NodeMP.*` SDK that the client mod exposes to every script in
the game. The two are separate surfaces with separate tables. This page covers the first in full,
condenses the second, and ends with [when to use which](#which-surface).

## Resource client files

Every `.lua` under `client/` - or the `[client] files` list of `resource.toml` - reaches each
joining player after the world replay and before `playerJoined` fires on the server. The client mod
compiles the files, runs them, and confirms in `beamng.log` with
`Activated server resource "race" (1 ge file(s), 0 vehicle file(s))` per resource and
`Server resources ready: 2 resource(s), 3 ge file(s), 0 vehicle file(s)` once the delivery is
complete. When the player leaves, every handler and extension the files registered is dropped:
`Unloaded 2 server resource(s) (left server)`. A resource delivered again while a copy runs
replaces that copy. Packaging, the 900 KB chunk cap, the client's 8 MB / 512 file limit and the
obfuscation tiers are on [Resources](/plugins/resources/#the-client-half).

### The node table

Inside a client file, `node` is the client table - not the server `node` of the
[Lua API reference](/plugins/api/lua/). It has ten functions. The client mod fills in a per-resource
source behind the scenes, so the signatures you call are these:

| Call | What it does |
|---|---|
| `node.on(name, fn)` | Subscribes `fn(data)` to the wire event `name` - what the server half sends with `player:send` or `node.broadcast` - and to anything raised locally under that name. One handler per name per resource: a second `node.on` for the same name replaces the first. |
| `node.off(name)` | Removes this resource's handler for `name`. |
| `node.emitServer(name, data)` | Sends a wire event to the server. `data` goes through `tostring`, so encode a table with `jsonEncode` yourself. Server-terminal: it reaches server resources and nothing else. |
| `node.emitLocal(name, data)` | Runs every handler subscribed to `name` on this machine - yours, other resources', the client mod's - without involving the server. |
| `node.log(msg)` | Writes `msg` to `beamng.log` at info level under the `node.events` tag. |
| `node.onModule(channel, fn)` | Subscribes `fn(data)` to binary payloads the server sends on a `u32` channel; `data` is a byte string. One handler per channel per resource. |
| `node.offModule(channel)` | Drops this resource's subscription on the channel. |
| `node.sendModule(channel, data)` | Sends bytes to the server on a channel; they reach `node.modules.on` subscribers and native modules, never other players. |
| `node.requestVehicleTrigger(globalId, call)` | Asks the server to have the vehicle's sync authority run one controller call; `call` is a table or JSON text with `controllerName`, `functionName` and the variables. Gated by `vehicleTriggerRequest` on the server. |
| `node.requestNodeGrab(globalId, action, nodeId, x, y, z, force)` | The experimental node grabber: `action` is `"grab"`, `"move"` or `"release"`. Dropped unless `[Experimental] NodeGrab` is on and a resource allows `vehicleNodeGrabRequest`. |

A bad argument - an empty name, a non-function handler, a channel outside the `u32` range - logs an
`E` line under `node.events` such as `node.on: given event name is not a valid string`, and the
call does nothing.

### Events and payloads

A handler receives one argument: `data`, the string the server sent. The server half JSON-encodes
a table it passes to `player:send`, so decode it with the game's `jsonDecode`; a string arrives as
it was sent. In the other direction, `node.emitServer` sends whatever `tostring` makes of `data` -
a table would arrive as `table: 0x...` - so encode with `jsonEncode` and let the server half
decode with `node.json.decode`. Name wire events `<domain>:<verb>`, lowercase, one colon
(`race:start`, `race:ready`); `node:` is reserved for the framework. [Events](/plugins/events/)
has the server side of the same rule.

<!-- doctest: client -->
```lua
-- resources/race/client/main.lua
local M = {}

-- the server half sent a table with player:send; it arrives as JSON text
node.on("race:start", function(data)
    local start = jsonDecode(data)
    NodeMP.ui.notify("Race starts in " .. tostring(start.seconds) .. " s")
    node.log("race:start on " .. tostring(start.track))
end)

-- a wire event the server half handles with node.on("race:ready", fn(player, data))
node.emitServer("race:ready", jsonEncode({ car = "etk800" }))

-- a returned table with on* functions is registered as a game extension
function M.onVehicleSpawned(gameVehicleID)
    node.emitServer("race:spawned", tostring(gameVehicleID))
end

return M
```

Handlers run inside `pcall`: an error is logged as
`Error in event handler for "race:start" from source "node.res/race": ...` and the other handlers
still run. The source, `node.res/<name>`, is shared by every file of the resource - which is why
a resource holds one handler per event name, and why the client mod can drop all of them at once
when the player leaves.

### What a client file can and cannot do

A client file is not sandboxed. It runs in the game engine's Lua state with the resource's own
environment layered on top, so it sees everything a game script sees - `be`, `settings`,
`extensions`, `log`, `jsonEncode` and `jsonDecode` - and the `NodeMP.*` SDK described below. Only
two names are the resource's own: `node`, the table above, and `require`, which resolves against
the resource's streamed files first. Reads and writes of anything else go to the game's global
table, so a name you assign without `local` becomes a real game global shared with every other
script; keep state in locals or in the table you return.

- **`require`.** `require("lib/helpers")` finds the streamed file `lib/helpers.lua` by its delivered
  path (forward slashes, a leading `./` and the `.lua` suffix are ignored); each file runs once
  and its return value is cached. A name that is not one of the resource's files falls through to
  the game's `require`. A cycle fails with `circular require of resource module "lib/helpers"`.
- **Replacing the game's or the client mod's files.** Not possible. A client file is never written
  to disk: the client mod compiles the delivered text in memory under the chunk name
  `node/<resource>/<path>` and runs it inside the resource's own environment, so a streamed
  `lua/ge/extensions/nodemp/net/relay.lua` is a module of yours with a long name, not a
  replacement of the mod's - the game and the client mod keep loading their own files from the
  install and from `NodeMP.zip`, and the resource's `require` resolves your files for your files
  only. The delivery also rejects a path with `..`, a backslash or any character outside letters,
  digits, `.`, `_`, `-` and `/`. To change behaviour, work at run time instead: react to the same
  events (`node.on`, `NodeMP.events.on`, the game's extension hooks such as `onVehicleSpawned`),
  ship your feature as a `ge` extension of your own, and switch a built-in client module off
  with the module manifest - a server resource answers the mod's `modules:request` wire event
  with `player:send("modules:manifest", { modules = { nametags = { enabled = false } } })`
  (`nametags` and `damage` are the modules that register with it in client mod 1.5.7;
  `NodeMP.modules.list()` on the client lists them). The same manifest can pin the nametags' look:
  `nametags = { config = { style = "plain" | "plate", hideBehindObjects = true, maxDistance = 40,
  fadeStart = 25, showDistance = false } }` -- text without a plate, hidden behind walls and cars, gone
  past `maxDistance` metres and fading from `fadeStart`; a manifest without these keys leaves the look
  as it was, and a mod that does not know them ignores them. Assigning a game global from a client file
  does work, because the environment is not sandboxed - but nothing in `NodeMP.internal` is
  promised to keep its name between versions, so treat that as a last resort.
- **Extensions.** A `ge` file that returns a table with `on…` functions is registered as a game
  extension named `node_<resource>_<path>` (non-alphanumeric characters become `_`): `onUpdate(dt)`,
  `onPreRender`, `onVehicleSpawned` and the other game hooks are delivered to it.
  `onExtensionLoaded` and `onInit` run once at registration, `onExtensionUnloaded` at unload.
- **Errors.** Files are compiled under the chunk name `node/<resource>/<path>`, so a stack trace
  reads `node/race/main.lua:12:`. A file that does not compile is skipped with
  `Resource "race" (main.lua): compile error: ... -- file skipped`; the rest of the resource loads.
- **No offline runner.** Client files run only inside the game: the server packages them without
  executing them (it syntax-checks them and logs an `Error` for a file that does not parse), and
  nothing on the server side can call a `node.on` handler of a client file. To
  see one run, join the server with the launcher and read `beamng.log`; the server half, by
  contrast, is testable without the game
  ([Getting started](/plugins/getting-started/#testing-without-the-game)).
- **Other players.** Nothing reaches another player directly. `node.emitServer` ends at the server,
  and a feature of yours that must reach everyone is a server resource that forwards it
  (the client mod's own fire, grabber and triggers are typed packets the core relays).
- **The wire.** There is no packet API. Typed traffic (positions, seats, spawns) is the client
  mod's business; a client file has events, the module channel and the two vehicle requests.
- **Lifetime.** Nothing survives leaving the server. Keep durable state on the server in
  `node.storage`, or in the game's own settings through `NodeMP.settings`.

### Vehicle files

A file whose path starts with `lua/vehicle/` has the kind `vehicle`. It is not run in the game
engine: the client mod injects its source into the Lua state of every vehicle the player drives -
at activation, and again at each spawn of the player's own vehicle - and runs it there once, as a
plain script. Inside a vehicle state there is no `node` table. You have the vehicle engine's own
globals (`obj`, `v`, `electrics`) and the vehicle-side `NodeMP` table
([below](#vehicle-engine-ve)), whose `NodeMP.events.triggerServer(name, data)` relays a wire event
through the game engine to the server, JSON-encoding a table for you:

<!-- doctest: client -->
```lua
-- resources/race/client/lua/vehicle/ready.lua: runs once inside each vehicle you drive
NodeMP.events.triggerServer("race:vehicle", { gameId = NodeMP.vehicle.id() })
```

Receiving server events is game-engine-only: handle the reply in a `ge` file and reach the
vehicle with `queueLuaCommand` if you must. Errors are logged under `node.res` as
`VE compile race/lua/vehicle/ready.lua: ...` or `VE run race/lua/vehicle/ready.lua: ...`. Injected
scripts cannot be unloaded cleanly, which the client says at activation:
`Resource "race": 1 vehicle-side script(s) are streamed into the vehicle VM at runtime -- they
cannot be cleanly unloaded and are best shipped as content mods`. Take the hint for anything
beyond a few lines.

### Obfuscation

Before packaging, the server runs each `ge` and `vehicle` file through Prometheus at the tier
`[client] obfuscation` names: `none`, `light` (the default), `medium` or `strong`. Globals and
table keys are never renamed, so `M.onUpdate`, game hooks and the `node` calls keep working; local
names and string constants do not survive, so develop with `none` while `beamng.log` line numbers
matter and remove the line before you publish. The tiers and the server's fail-open rule are on
[Resources](/plugins/resources/#obfuscation).

## The mod SDK: NodeMP.*

A mod that ships with the client cannot rely on being streamed by a server, and it must not reach
into the client mod's internal modules, which move between versions. For it, the client mod
publishes one stable global table, `NodeMP`, in both Lua states - the game engine and every
vehicle. Every function resolves its target when called, so a mod that runs before the client mod
has started, or while nobody is in a session, gets `nil`, `false` or an empty table instead of an
error. `NodeMP.VERSION` is the mod version, `1.5.7`. Client files can call the same table; the
[example above](#events-and-payloads) uses `NodeMP.ui.notify`.

### Namespaces

| Namespace | Calls |
|---|---|
| `NodeMP.session` | the launcher link and the session: `isLauncherConnected`, `isConnected`, `isActive`, `isJoining`, `getServer`, `getServerName`, `getMap`, `getLauncherVersion`, `connect`, `leave` |
| `NodeMP.account` | what the server established from the join ticket: `get` (`verified`, `loggedIn`, `guest`, `username`, `accountId`, `roles`), `isLoggedIn`, `getUsername`, `getRole`, `getId`. `login` and `logout` exist for older mods and do nothing: signing in belongs to the launcher. |
| `NodeMP.players` | the roster: `get`, `getByName`, `getAll`, `ids`, `count`, `max`, `getLocalId`, `getLocal`, `isLocal`, `getRoleInfo` |
| `NodeMP.vehicles` | the world model, keyed by the global `vehicleId` and the local `gameId`: `getAll`, `getOwn`, `isOwn`, `getServerId`, `getGameId`, `getByServerId`, `getByGameId`, `getNicknameMap`, `getOwner`, `getDriver`, `getSyncOwner`, `count`, `forEach`, `isSynced` |
| `NodeMP.chat` | `send` (a `chat:send` wire event to the `chat` resource), `add`, `system`, `clear`, `toggle`, `getHistory` |
| `NodeMP.events` | `on`, `once`, `off`, `triggerServer`, `triggerLocal`, and the lifecycle names in `NAMES` |
| `NodeMP.keys` | `onPressed`, `onReleased`, `getState` - bridged into every vehicle's Lua state |
| `NodeMP.ui` | `notify`, `dialog`, `bringToFront`, `refreshPlayerList` |
| `NodeMP.network` | `isConnected`. Send events with `NodeMP.events.triggerServer`, not through this namespace. |
| `NodeMP.settings` | `get`, `set` - the game's settings store, where the mod keeps its options |
| `NodeMP.config` | `getNickname`, `setNickname`, `getFavorites`, `get`, `set` - the mod's `config.json` |
| `NodeMP.debug` | `getNetworkStats`, `focusOnPlayer` |
| `NodeMP.util` | `translate`, `b64encode`, `b64decode`, `hex2rgb`, `jsonEncode`, `jsonDecode` |
| `NodeMP.modules` | the client module framework: `register`, `list`, `isEnabled`, `getConfig`, `setLocalPref`, `onChanged`, `requestManifest` |
| `NodeMP.dimensions` | the client view of parallel worlds: `isActive`, `get`, `refresh`, `set` (sends `/dim n` through chat, so the server stays in charge), `onChanged` |
| `NodeMP.strict` | the strict session a server declared through `session:config` ([below](#strict-sessions-sessionconfigstrict)): `isActive`, `getConfig`, `getFilters`, `isGrabAllowed`, `isPhotoAllowed`, `onChanged` |

The original flat helpers - `NodeMP.isInSession`, `NodeMP.getCurrentServer`, `NodeMP.getAccount`,
`NodeMP.isLoggedIn`, `NodeMP.getLocalPlayerID`, `NodeMP.translate` and the rest - remain as
aliases of the namespaced calls. `NodeMP.internal` is the mod's own module tree; its names may
move between versions.

### Events

`NodeMP.events` rides the same event channel as the `node` table: a wire event the server sends
reaches both a resource's `node.on` handler and a mod's `NodeMP.events.on` handler, and a mod's
`triggerServer` arrives at the server half as an ordinary `node.on(name, fn(player, data))` event.
Two differences: `triggerServer` JSON-encodes whatever you pass - a string arrives quoted, so
always `node.json.decode` on the server - and an `on` handler receives its payload decoded - a
table when the text parses as JSON, the raw string otherwise.

<!-- doctest: client -->
```lua
NodeMP.events.on("race:start", function(start) print(start.track) end)   -- decoded for you
local id = NodeMP.events.once("race:finish", function(result) print(result.place) end)
NodeMP.events.triggerServer("race:ready", { car = "etk800" })              -- a table is JSON-encoded
NodeMP.events.triggerLocal("race:hud", { show = true })                    -- this machine only
NodeMP.events.off("race:start")                                             -- your handler for the name
```

`on(name, fn, id?)` keeps one handler per `id` (default: the calling file) and replaces it on
re-registration; `once` returns the id it generated; `off(name, id?)` removes that handler.
`triggerLocal` reaches `NodeMP.events.on` handlers only; a resource's `node.emitLocal` also reaches
them, since the mod subscribes to each name through `node.on`.

The client mod raises its own lifecycle events for mods, listed in `NodeMP.events.NAMES`:
`onNodeMPPlayerJoined` (a player table), `onNodeMPPlayerLeft` (`{ id, name }`),
`onNodeMPPlayerRoleChanged` (`{ id, role }`), `onNodeMPVehicleSpawned` (a vehicle table),
`onNodeMPVehicleDeleted` (`{ vehicleId }`), `onNodeMPVehicleSyncOwnerChanged`
(`{ vehicleId, syncOwnerId }`), `onNodeMPSynced` (no data, after the initial world sync),
`onNodeMPStrictChanged` (`{ active, config }`, whenever a strict session starts, is
reconfigured or ends), `ChatMessageSent` (the text) and `ChatMessageReceived` (text, username).
Subscribe to them with `NodeMP.events.on`; they are local and never cross the wire.

### Vehicle engine (VE)

The vehicle-side `NodeMP` is a per-vehicle subset, built for code that runs inside a vehicle's
Lua state - a content mod's vehicle script, or a streamed `vehicle` file:

| Call | What it does |
|---|---|
| `NodeMP.vehicle.type()` | `"L"` when this client syncs the vehicle, `"R"` when another client does, `nil` before it is tagged; `isLocal()` and `isRemote()` are the booleans, `id()` the game object id |
| `NodeMP.events.triggerServer(name, data)` | Relays a wire event to the server through the game engine; the payload is JSON-encoded. Handlers for server events live in the game engine only. |
| `NodeMP.keys.onPressed(key, fn)`, `onReleased`, `getState` | The key bridge, same as in the game engine |
| `NodeMP.electrics.get(name)`, `set(name, value)`, `exclude(name)` | Read or write an electrics value; `exclude` keeps a key out of network sync for a local-only animation |
| `NodeMP.controllers.register(types)`, `send(data)` | Register modded controller types for sync, from a `loadControllerSyncFunctions` hook; forward controller state by hand |
| `NodeMP.velocity.add(x, y, z)`, `set(x, y, z)` | Physics corrections, mostly for remote copies |
| `NodeMP.callGE(moduleKey, call)` | Queue a call into a game-engine module of the mod |

`NodeMP.vehicleType`, `NodeMP.isRemote`, `NodeMP.isLocal` and `NodeMP.triggerServer` are the flat
aliases. Most write helpers only make sense on a local vehicle: check `NodeMP.vehicle.isLocal()`
first.

## Strict sessions: `session:config.strict`

Client mod 1.5.7 can run a player's session under **strict** rules - the client half of what
[Strict verification](/hosting/strict-verification/) describes for the server: no free camera,
no switching into cars the server did not seat the player in, no console, editor, pause, time
scale or teleport actions, node grabber only on foot in first person, the spectate rows of the
session panel refused. Nothing of it runs unless a server resource switches it on, per player,
with the `strict` key of the `session:config` wire event:

<!-- doctest: server+client -->
```lua
-- server side, any resource; usually from a playerJoined handler
node.on("playerJoined", function(player)
    player:send("session:config", { strict = {
        actions     = { "toggleCamera", "switch_next_vehicle", "toggleConsoleNG" }, -- nil = the mod's default list
        photoMode   = "admins",   -- "admins" | "all" | "none"
        canPhoto    = false,      -- this player's photo-mode / free-camera permission
        nodeGrab    = "walking",  -- "walking" | "off"
        heartbeatMs = 2000,
    } })
end)
-- player:send("session:config", { strict = false }) switches it off again

-- expect-client: Alice session:config .*"strict":\{.*"heartbeatMs":2000
```

| Field | Values | Default | Effect |
|---|---|---|---|
| `actions` | array of input action names | the mod's list of 44 names | The names handed to the game's action filter (group `nodemp_strict`): free camera, vehicle switching, console and reloads, editor, pause and slow motion, recover and teleport, the vehicle menus, the "fun stuff" and traffic actions. `{}` filters nothing. A name that is one of the game's `core_input_actionFilter` templates (`vehicleTeleporting`, `editor`, `funStuff`, …) expands to that template. |
| `photoMode` | `"admins"`, `"all"`, `"none"` | `"admins"` | Who may use photo mode and, with it, the free camera and the pause it asks for: `all` everyone, `none` nobody, `admins` the players whose `canPhoto` is true. When it is not allowed, `photomode` is added to the filtered actions. |
| `canPhoto` | boolean | `false` | This player's permission; read only when `photoMode` is `"admins"`. |
| `nodeGrab` | `"walking"`, `"off"` | `"walking"` | `walking`: grabbing nodes only while on foot and in first person. `off`: never; the six `nodegrabber*` actions are added to the filtered ones. |
| `heartbeatMs` | number | `2000` | The heartbeat period, clamped to 500-60000. |

Only the `strict` key is looked at. A table, or `true` (the defaults), switches strict on - or
re-applies it in place when it is already on, so a resource can change `canPhoto` mid-session;
`false` switches it off and restores everything; a `session:config` **without** the key changes
nothing, so another resource's `{ allowClientMods = false }` cannot switch strict off; any other
value (`"false"`, a number) is ignored with
`W node.strict session:config.strict is a string ("false"), expected a table, true or false -- ignored`.
A table that arrives before the client's session is live is kept and applied at session start.
While strict, the player's local mods are switched off and stay off whatever `allowClientMods`
says; one second after activation the mod also lists the game's VFS overrides and reports any
file under `vehicles/`, `lua/`, `ui/` or `levels/` that is shadowed from the user folder
(outside `mods/multiplayer/` and NodeMP's own zip). Leaving the server ends it all: the filter
group is removed, every hook restored.

A mod or client file that offers a camera, teleport or spectate feature should hide it while
strict: `NodeMP.strict.isActive()` says so, `getConfig()` returns the normalised table (or
`nil`), `getFilters()` a copy of the action names the group blocks, `isGrabAllowed()` and
`isPhotoAllowed()` the two permissions as they stand right now, and
`onChanged(fn, id)` subscribes to `onNodeMPStrictChanged` (`{ active, config }`).

### The heartbeat and the violations

While strict, the mod sends two ordinary wire events that a server resource handles with
`node.on(name, fn(player, data))` and `node.json.decode`. Every `heartbeatMs`:

```json
{ "seq": 1, "filtersHash": "7b41bb4e", "filtersCount": 6, "filters": ["toggleCamera", "…"],
  "camera": "orbit", "vehicleId": 100, "walking": false, "timeScale": 1, "checksum": "b05ec1a4" }
```

`rp:strict.heartbeat` - `seq` counts from 1 per activation (it continues across a reconfigure and
a Lua reload); `filtersHash` is the FNV-1a32 of the blocked action names, sorted and joined with
`,`, and `filtersCount` their number, both on every beat; `filters`, the names the game
**really** blocks right now, only on `seq == 1` and on a beat whose hash differs from the
previous one (the server keeps the last list). Two encoding rules for a judge: an empty list is
a Lua `{}` and encodes as `{}`, not `[]`, so key on `filtersCount` (`0` = nothing blocked) and
treat `filters` as absent-or-a-list; `timeScale` is `be:getSimulationTimeScale()` at the beat
and is `0` during an **allowed** pause (photo mode of a player who may use it), so the rule is
"`timeScale` ≠ 1 while not in an allowed pause". `camera` is what the player sees - the active
global camera (`free`, `observer`, `bigMap`, …), `unicycle` on foot, else the vehicle camera
(`orbit`, `onboard.driver`, `passenger`, …); `vehicleId` is the server id of the player's
vehicle, `-1` when none; `walking` is `gameplay_walk.isWalking()`.

`rp:strict.violation` - `{ "kind": "camera", "details": { "camera": "free", "restored": "orbit", "suppressed": 3 } }`
on every **observed** breach, at most one per `kind` every 2 s (the repeats swallowed in between
arrive as `details.suppressed` on the next one). A refused request - the pause the ESC menu asks
for, a `simTimeAuthority.set` - is enforcement and is not reported; what is reported is a state
the mod had to undo or could only watch: `camera`, `vehicle_switch`, `console`, `editor`,
`pause`, `timescale`, `vehicle_reset`, `reset_action`, `recover`, `teleport`, `node_grab`,
`spectate`, `camera_to_player`, `filter_tamper`, `vfs_override`. Each is also a
`W node.strict violation <kind> <json>` line in `beamng.log`. Sanctions are the resource's
business; the mod only reports.

What the heartbeat proves: that the client mod's strict module is loaded and running - a beat
that stops coming is a client whose module stopped, and what follows from that is the
resource's decision, not the platform's - and that it runs with the configuration this server
sent, because `checksum` echoes it:

```
checksum        = FNV-1a32( sourceHash .. "\n" .. canonicalConfig )        -- 8 lowercase hex digits
canonicalConfig = "actions=" .. <resolved action list, comma-separated, in order>
               .. "|photoMode=" .. photoMode .. "|nodeGrab=" .. nodeGrab
               .. "|heartbeatMs=" .. heartbeatMs .. "|canPhoto=" .. ("true" | "false")
sourceHash      = FNV-1a32( the bytes of lua/ge/extensions/nodemp/sys/strict.lua as loaded )
```

The resolved list is the server's `actions` (or the default) with templates expanded and
duplicates dropped, then `photomode` when photo mode is not allowed, then the six `nodegrabber*`
names when `nodeGrab` is `"off"` - send plain names and the list is easy to mirror. `sourceHash`
is one constant per mod release: the mod's CI prints it in the job summary of every run as
`release sourceHash (FNV-1a32 of the LF bytes of sys/strict.lua): 849af14b (46402 bytes)` -
`849af14b` is the value for 1.4.0 - and the client logs it at load as
`source hash 849af14b for the heartbeat checksum (…)`. Take it from the CI summary of the
release you deploy, never from a local pack: a checkout with CRLF line endings hashes to another
value. When the mod cannot read its own source at load, it hashes a fixed string instead, logs
`W node.strict own source not readable …`, and `sourceHash` is `4368a6a9` - accept it but log
it. Any other value is a modified `strict.lua` or another release.

What the heartbeat does **not** prove is the integrity of the game: the checksum is computed by
the client, and a modified client can send anything. The install is the launcher's business -
`VerifyGame = "strict"` and `player:verify` on the server side - and the heartbeat is the
liveness and configuration echo of the client rules on top of it.

## Which surface

| | Resource client files | Mod SDK `NodeMP.*` |
|---|---|---|
| Ships as | part of the resource, streamed at every join | a zip in `content/`, or a mod the player installed |
| Lives | while the player is on your server | as long as the mod is installed, on every server |
| Server link | `node.emitServer` / `node.on(name, fn(data))` | `NodeMP.events.triggerServer` / `NodeMP.events.on` |
| Payloads | strings; encode and decode JSON yourself | everything JSON-encoded on send (a string arrives quoted) and decoded on receive |
| Best for | rules, HUD text and vehicle tweaks that belong to one server and change with it | UI, key bindings and vehicle logic a player carries between servers; reading the roster and session |

Write the client half of a resource when the behaviour is the server's: it needs no install, it
updates when the host restarts the server, and it is gone when the player leaves. Write a mod
when players should have it everywhere - and let it read `NodeMP.session` and `NodeMP.players`
rather than guessing. Both talk to the same server half, and a server resource cannot tell which
one sent an event.

## Next

- [Events](/plugins/events/) - the server end of a wire event, and how to forward one to other players.
- [Resources](/plugins/resources/) - `resource.toml`, `[client] files`, obfuscation tiers, delivery limits.
- [Recipes](/plugins/recipes/) - a teleport with a client half, among others.
- [Wire protocol](/plugins/protocol/) - the `Event` and `Module` frames underneath.
