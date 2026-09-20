---
title: Conventions
description: Naming rules, objects versus ids, return shapes, payload encoding, what the API promises across versions, and how log lines are tagged.
---

The rules the API follows and expects you to follow: how things are named, what a call hands back,
what stays stable between releases, and how a log line is put together. None of it is new
machinery - it is the shape of what the other pages describe, collected in one place.

## Names

- **Wire events** are `<domain>:<verb>`, lowercase, one colon: `chat:send`, `race:start`. The
  server's own traffic uses the domains `chat`, `vehicle`, `player`, `session`, `world` and
  `modules`; a resource picks a domain of its own, usually its name. `node:` is reserved for the
  framework. Event names carry no version: a renamed event does not fail, it goes quiet - so keep
  names once published and add new ones beside them.
- **Engine hooks** are camelCase and never cross the wire: `playerJoined`, `vehicleSpawned`. A
  notification is `<subject><Verb-ed>` - past tense, after the subject (`vehicleEdited`,
  `playerSeatChanged`, `serverShutdown`); a stream is `…Changed`; a request a handler can deny is
  `<subject><Action>Request` (`vehicleSpawnRequest`, `relayRequest`) - no `on` prefix, `node.on`
  already says it. Two spellings, two kinds - a reader can tell a network message from a server
  hook at a glance. The spellings servers before 1.2.0 used (`playerJoin`, `onVehicleSpawnRequest`,
  `canRelay`) are deprecated aliases that still work and warn once per resource; see
  [Events → Naming](/plugins/events/#naming).
- **Bus messages** between resources follow the wire rule: `chat:say`, `chat:command`,
  `dimensions:changed`.
- **Resource names** use letters, digits, `_`, `-` and `.`, starting with a letter or digit. The
  name is the folder, the log tag, the `node.storage` store (`storage/<name>.json`, at most 64
  characters) and the name the client mod files the streamed scripts under (at most 128).
- **Storage keys** are `kind:id` strings up to 256 characters: `playtime:42`, `lastSeen:42`. Key
  by `player.accountId` or `player.name`, never by `player.id`.
- **Module channels** are `u32` ids you choose; the id space is shared by every module and
  resource on a server, so publish yours. `0x44494D53` (`DIMS`) belongs to `dimensions`.
- **Console tags** of your own (`node.log.custom`, C `log_custom`) stay within six characters so
  the console columns line up.

## Objects and ids

The server thinks in ids: a player id (small, assigned at connect, reused after a disconnect) and a
vehicle's global id (unique for the life of the server). The `node` face wraps them in objects;
`node.raw` and the C ABI keep the ids.

- A `Player` or `Vehicle` is a table with `id` and a metatable. Reading any other field fetches the
  record once and caches it on the object; `refresh()` drops the cache; methods act by id, so the
  object outlives the record (`player:isConnected()`, `vehicle:exists()` tell you whether it still
  refers to something). Two objects are `==` when their ids match; `tostring` gives
  `Player#3 Alice`, `Vehicle#12 Alice`.
- Ids inside a record that name another entity come as objects with the raw id beside them:
  `vehicle.driver` is a `Player`, `vehicle.driverId` the number; `player.vehicle` a `Vehicle`,
  `player.vehicleId` the number (`-1` on foot).
- Every `node` call that takes a player or a vehicle accepts the object or the id:
  `node.send(target, ...)`, `node.players.get(id)`, `vehicle:seat(player)`, `node.bans.add(who)`.
- Where speed matters the ids stay: `node.raw.on` hands raw arguments, and the relay filter
  (`relayRequest`) receives `(fromPid, toPid, category, subtype, globalId)` because it runs per packet.
- A raw name is the C name in camelCase: `kick_player` is `node.raw.kickPlayer`,
  `get_vehicle_transform_json` is `node.raw.getVehicleTransform` returning the decoded table.

## Return shapes

The Lua reference marks each shape in the signature; these are the shapes it uses.

| Shape | Used by | Examples |
|---|---|---|
| `boolean` | actions: `true` when done, `false` when the target does not exist or the request was not accepted | `player:kick`, `node.send`, `node.storage.set`, `vehicle:setTag`, `node.resources.reload` |
| value or `nil` (marked `?`) | lookups and reads of things that may not exist yet | `node.players.find`, `vehicle:transform()`, `node.fs.read`, `node.json.decode` (`nil` on a parse error) |
| array, possibly empty | lists | `node.players.all()`, `player:vehicles()`, `node.bans.all()` |
| `number` | counts and ids | `node.off` (handlers removed), `node.after` (a timer id), `player:resync()` (bundles sent) |
| `result, err` | one background call | `node.await(workFn, args)` gives the result, or `nil` and an error string |
| `status, body, headers` | one coroutine HTTP call | `node.http.fetch`: `0, "request not queued", {}` when it could not start; `-1` and the error text in `body` when the transport failed |
| callback arguments | asynchronous forms | `cb(status, body, headers)` for HTTP, `cb(ok)` for `node.fs.writeAsync`, `doneFn(result, err)` for `node.job` |
| a default | `node.storage.get(key, default)` | returns `default` when the key is absent |
| an error (throws) | misuse, not runtime failure | `node.on` with a non-string name or a non-function handler, `node.commands.add` with a bad signature, `node.sleep` outside `node.async` |

Nothing in `node` returns an error object: a failed action is `false`, a missing thing is `nil`, a
programming mistake throws. `node.on(name, fn)` with the same `fn` twice is one subscription: the
second call replaces the first, the handler runs once per event, and `node.off(name, fn)` removes
it and returns `1` ([Events → Naming](/plugins/events/#naming) says the same for the deprecated
spellings). Two different functions are two handlers. Subscribe at load; a reload starts from a
clean state.

In C the shapes are integers: an action returns `0` on success and `-1` on failure, a question
`1` or `0`, a buffer fill the number of bytes written or `-1` when the buffer is too small, and a
size query (`buf = NULL`) the length it would write. [Native modules](/plugins/native-modules/)
has the buffer loop.

## Payloads

- A table you hand to `player:send`, `node.broadcast`, `node.bus.emit`, `node.storage.set` or
  `node.http.post` is JSON-encoded for you: an array when its keys are `1..n`, an object otherwise;
  functions become `null`; nesting stops at 32 levels. A string goes as it is.
- A wire event's `data` arrives on the server as the string the client sent - decode it with
  `node.json.decode` and check the type. A notification's or request's payload arrives decoded
  where it is JSON on the wire (a config, a coupler call) and as a string where it is a name (a
  seat role).
- Bus `data` is a string too; the module channel carries bytes and parses nothing.
- On the client, `node.emitServer(name, data)` sends `tostring(data)`: encode a table with
  `jsonEncode` there and decode on the server. `NodeMP.events.triggerServer` encodes for you.

## Versions and compatibility

| Surface | Version | What is promised |
|---|---|---|
| Wire protocol | `v21` (`Wire::ProtoVersion`) | Exact match. Launcher, client mod and server ship together; a mismatch is refused at the handshake with `Protocol version mismatch: launcher speaks v18, server speaks v21 - update the outdated side`. |
| C ABI | `2.3` (`NODE_ABI_VERSION_MAJOR` `2`, `MINOR` `3`) | The major is the layout: nothing moves within it, new entries are appended and bump the minor, a retired entry becomes a stub that keeps its slot. A module built against an older `2.x` keeps working; a different major is refused by the loader -- major 2 is the first such break (the `pg_*` entries left with the database), so a module built against a `1.x` header must be rebuilt. |
| Lua `node` and `node.raw` | server `1.3.0` | Generated from one schema, `sdk/api.toml`, together with `node.h` and the reference pages; `apigen.py docs --check` fails when they drift, so the [reference](/plugins/api/) says what the server does. `node.raw` is the one-to-one mirror of the C entries. |
| Client `node` table | client mod `1.5.4` | The ten functions on [Client scripting](/plugins/client-scripting/). |
| `NodeMP.*` | client mod `1.5.4` (`NodeMP.VERSION`) | One stable global; the original flat helpers stay as aliases of the namespaced calls. `NodeMP.internal` and the dotted module names underneath may move between versions. |

The wire changelog lives in `server/include/net/Protocol.h`, and the ABI history in the entry
docs of `sdk/node.h` (`ABI 1.8`, `ABI 1.9`, ...). Neither is duplicated here.

## The Lua environment

Each resource runs in its own Lua 5.4 state with the standard libraries open - `string`, `table`,
`math`, `os`, `io`, `coroutine`, `utf8`, `debug` - and only the C module loaders removed
([Native modules](/plugins/native-modules/#loading-c-lua-modules-with-require)). `node` adds the
server; it does not duplicate the standard library, so several "how do I" questions have a
standard Lua answer, and a few have none yet:

| I want to | Use | Notes |
|---|---|---|
| A random float in `[0, 1)` | `math.random()` | Lua 5.4 seeds the generator randomly when the state is created; no `math.randomseed` call is needed. |
| A random integer in `[a, b]` | `math.random(a, b)` | |
| A random float in `[a, b)` | `a + (b - a) * math.random()` | There is no `node` helper for it. |
| Random bytes for a token or a key | `node.crypto.randomBytes(n)`, `node.crypto.randomHex(n?)` | Cryptographic; `math.random` is not. |
| How long something took | `node.server.uptime()` before and after: monotonic, fractional seconds | `os.clock()` is the process's CPU time over every thread, so it measures CPU-bound code on the worker and little else. There is no per-handler statistics call like BeamMP's `Util.DebugExecutionTime`; the server itself logs every handler slice over 250 ms ([Concurrency](/plugins/concurrency/#one-worker-thread)). |
| The wall clock | `node.server.time()` (unix, fractional), `node.server.unixTime()` (whole seconds), `os.date`, `os.time` | |
| Memory used by this resource | `collectgarbage("count") * 1024` - bytes of this Lua state | The current state only: there is no figure for all states together, nor for the process, and `node.server.metrics()` carries counts (players, vehicles, queue depth), not bytes. |
| The operating system | not in `node` | `package.config:sub(1, 1)` is `"\\"` on Windows and `"/"` elsewhere, which is what a path needs; the OS name and version are not exposed. `node.server.version()` is the server's own version. |
| JSON | `node.json.encode(value)`, `node.json.decode(text)` | `encode` writes compact JSON and takes no options: no pretty-printing, no minify, no flatten (RFC 6901), no diff or patch (RFC 6902) - BeamMP's `Util.JsonPrettify`, `JsonFlatten`, `JsonDiff` and `JsonDiffApply` have no equivalent. Pretty-print with a few lines of Lua when a file is for humans; a diff is a table comparison you write. |

<!-- doctest: server -->
```lua
local t0 = node.server.uptime()
local sum = 0
for _ = 1, 100000 do sum = sum + math.random(1, 6) end
node.log("100000 dice rolls in %.2f ms, average %.3f", (node.server.uptime() - t0) * 1000, sum / 100000)

node.log("float %.3f · int %d · float in [10, 20) %.3f · token %s",
    math.random(), math.random(1, 6), 10 + 10 * math.random(), node.crypto.randomHex(4))
node.log("this Lua state uses %d KB · path separator %s",
    math.floor(collectgarbage("count")), package.config:sub(1, 1))

-- expect: 100000 dice rolls in \d+\.\d\d ms, average 3\.\d+
-- expect: this Lua state uses \d+ KB
```

## Logging

Every console line is `HH:MM:SS  Tag    › message`: the time, a tag padded to six characters, a
`›` and the message; `logs/server.log` receives the same line without colours. With
`[General] Debug = true` the timestamp gains milliseconds and a column with the writing thread's
name is inserted after the `›` (`Res    › PluginFramework race · …`), so a parser should not
assume the message starts right after it. Where your output lands:

- `node.log(msg, ...)` prints under the `Res` tag with the resource's name in front:
  `race · Player#0 Alice is ready`. Extra arguments are `string.format` arguments.
- `node.log.warn` and `node.log.error` use the `Warn` and `Error` tags, same prefix. Errors the
  server reports on your behalf read `race · error in event 'race:ready': ...` with a stack trace
  (`error in resource event '…'` for a bus handler, `error in timer callback`,
  `error in async task`), and a handler that holds the worker for more than 250 ms is reported as
  a stall, with the resource and the kind in parentheses. Not every line the server prints about
  your code carries the prefix: `emitClient: invalid player ID '0'` (a `node.send` to a player
  that is not there) and `node.sleep called outside a node.async task` name no resource.
- `node.log.tag(tag, msg)` writes under one of the server's own tags - `Core`, `Net`, `Res`,
  `Mods`, `Module`, `Join`, `Leave`, `Kick`, `Veh`, `Warn`, `Error`, `Debug`; an unknown tag falls
  back to `Module`. `node.log.custom(tag, rgb, msg)` uses a tag of your own in an `0xRRGGBB` colour,
  `node.log.raw(text)` skips the prefix, `node.log.sink(fn)` observes every line, `node.log.title`
  sets the console title.
- A native module's `log_info` lands under `Module`; `log_custom` under its own tag; a C log sink
  may suppress lines, a Lua one only observes.

On the client, `beamng.log` tags the mod's lines: `node.res` for delivery and activation of your
files, `node.events` for `node.log` and handler errors (`Error in event handler for "race:start"
from source "node.res/race": ...`), `node.net` and `node.session` for the link and the roster, and
`nodemp.events` for errors inside `NodeMP.events.on` handlers (`Handler for 'race:start' errored: ...`).

## Next

- [Lua API reference](/plugins/api/lua/) - every signature with its shape marked.
- [Events](/plugins/events/) - the naming rule applied to every event kind.
- [Native modules](/plugins/native-modules/) - the C conventions in full.
- [Wire protocol](/plugins/protocol/) - where `v21` is defined.
