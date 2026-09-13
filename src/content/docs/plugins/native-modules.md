---
title: Native modules
description: Writing a native module against the C ABI - the three exports, ABI negotiation, building plugin-example with CMake, threads, language hosts.
---

A native module is a shared library - `.dll` on Windows, `.so` elsewhere - that the server loads
from `modules/` next to its executable, before it scans `resources/`. It receives a pointer to
`NodeApi`, a struct of function pointers that is the whole server API, and it runs inside the
server process. Everything a Lua resource can do, a module can do too, plus three things only
native code can: teach the server a new resource language (a **language host**), run a **relay
filter** inline on the network threads, and own threads and sockets of its own. Write one for a
hot path or for those three; for game rules, a resource in Lua is shorter and reloadable.

The SDK is one self-contained C header, `sdk/node.h` - no import library, no server internals -
so any C or C++ toolchain works. This page is the module author's guide; every function pointer is
documented in the [C ABI reference](/plugins/api/c/).

## The three exports

The loader looks up exactly three symbols by name (`GetProcAddress` on Windows, `dlsym` elsewhere):

```c
NODE_EXPORT uint32_t node_plugin_abi(void);             /* the SDK ABI you compiled against */
NODE_EXPORT int      node_plugin_init(const NodeApi* api); /* 0 = loaded, nonzero = refuse */
NODE_EXPORT void     node_plugin_shutdown(void);
```

`NODE_PLUGIN_ABI()`, placed once at file scope, defines the first one for you. `node_plugin_init`
is where you register everything: it runs during startup, before any resource has loaded, and the
`NodeApi` pointer it receives stays valid until `node_plugin_shutdown` has returned. In C++ the
three definitions go inside `extern "C" { }`, as `examples/plugin-example/plugin.cpp` does.

The smallest complete module greets each joining player:

```c
/* hello_module.c */
#include "node.h"

static const NodeApi* api;

static void on_join(int player_id, void* user) {
    char name[128];
    if (api->get_player_name(player_id, name, sizeof name) < 0) {
        return;
    }
    api->emit_client(player_id, "hello:greet", name);
    api->log_info("greeted a player");
}

NODE_PLUGIN_ABI()

NODE_EXPORT int node_plugin_init(const NodeApi* a) {
    api = a;
    if (api->struct_size < sizeof(NodeApi)) {
        api->log_error("hello_module: this server is older than the SDK it was built against");
        return -1;
    }
    api->register_builtin_event("playerJoin", on_join, NULL);
    api->log_info("hello_module loaded");
    return 0;
}

NODE_EXPORT void node_plugin_shutdown(void) {
    api = NULL;
}
```

The console confirms a loaded module under the `Module` tag with `hello_module.dll initialized`
(`libhello_module.so` on Linux). `on_join` runs on the framework worker thread; `hello:greet`
arrives at the player's client files as an ordinary wire event.

## ABI negotiation

`NodeApi` is positional: a module reads each capability at an offset fixed when it was compiled.
Against a reordered struct it would not fail, it would call whatever now sits at that offset - so
the layout is a contract, with a version. The header carries `NODE_ABI_VERSION_MAJOR` `1` and
`NODE_ABI_VERSION_MINOR` `10`, packed into `NODE_ABI_VERSION` as `major << 16 | minor`.

- The loader calls `node_plugin_abi()` **first**, before `node_plugin_init` and before touching any
  field. A module whose major differs is refused:
  `module 'x.dll' was built against SDK ABI 2.0, this server speaks 1.10 -- refusing to load it. Rebuild the module.`
  A module without the symbol at all is refused too:
  `module 'x.dll' does not export node_plugin_abi -- it was built against a pre-versioning SDK. Rebuild it against the current sdk/node.h.`
- A module built against a **newer minor** loads with a warning
  (`was built against a NEWER SDK (1.11 vs 1.10); it may expect capabilities this server does not have`).
  A module built against an older minor loads silently: everything it knows about is where it
  expects it.
- New capabilities are appended and bump the minor. Nothing is reordered or removed; a retired
  call becomes a stub that keeps its slot. Any change that moves a field bumps the major.
- The first two members are plain fields for your own check: `abi_version` (index 0) is
  `NODE_ABI_VERSION` as the server was built, `struct_size` (index 1) is `sizeof(NodeApi)` as the
  server built it. When `struct_size` is smaller than your `sizeof(NodeApi)`, the server predates
  some capability you compiled against, and you must not read past it - refuse to load, as the
  example above does, or degrade. The `dimensions` module refuses when the visibility-group calls
  it needs are missing (`dimensions: this server has no visibility groups (needs ABI 1.7)`).

A module that returns nonzero from `node_plugin_init` is unloaded with
`module 'x.dll' failed to initialize (returned -1), skipping`; the server starts without it.

## Building plugin-example

`examples/plugin-example` is the reference module: a tour of the whole `NodeApi` surface - a
coloured console tag, a log sink that suppresses marked lines, builtin and cancellable
events, timers, client events (`cpp_ping` is answered with `cpp_pong`), storage, HTTP, the module
channel, a relay filter, and a background thread with its own UDP socket. Its `CMakeLists.txt` is
the minimal project to copy: CMake 3.16, C++17, one `add_library(example_plugin SHARED plugin.cpp)`,
the include path `../../sdk` for `node.h`, a static CRT on Windows so the DLL has no runtime
dependency (`CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>"`), and `ws2_32`
for its socket. Its `project(node-example-plugin CXX)` enables C++ only; a C listing needs
`project(... C CXX)` (or a `.cpp` file name).

**Linux**

```bash
cd examples/plugin-example
cmake -S . -B build
cmake --build build --config Release
cp build/libexample_plugin.so /opt/nodemp/modules/
```

**Windows** (PowerShell)

```powershell
Set-Location examples\plugin-example
cmake -S . -B build
cmake --build build --config Release
Copy-Item build\Release\example_plugin.dll C:\NodeMP\modules\
```

The output is `example_plugin.dll` or `libexample_plugin.so`. Create `modules/` next to the
executable if it is not there yet: the server skips a missing folder with a debug-level line and
loads nothing. `examples/build.py` does the same for every module and resource in the examples
folder: `python examples/build.py --out dist/server` builds each folder with a `CMakeLists.txt`
into `dist/server/modules/` and copies each folder with a `resource.toml` into
`dist/server/resources/`; `--only plugin-example` limits it to one. Under Docker, `modules/` is
inside the image, not on the `/data` volume ([Resources and content](/hosting/resources/)).

## Callbacks and threads

Two rules cover most of the API, and three exceptions cover the rest.

| Code | Runs on | Rule |
|---|---|---|
| Any `NodeApi` function you call | the calling thread, inline | Thread-safe from any thread, including threads the module spawns; queries snapshot state under internal locks, emits and kicks write to the network directly. |
| Registered callbacks: client events, builtin events, verdicts, vehicle notifications, timers, `done` of a job, HTTP responses, bus messages, module-channel data, a language host's `load`/`unload` | the single framework worker thread, one at a time | Never two at once, and never concurrent with a Lua handler. Blocking here stalls every resource: keep callbacks short and hand long work to `submit_job` or your own thread. |
| `set_log_sink` | whatever thread produced the log line, under the log-hook lock | Fast, never blocking; lines you log from inside the sink bypass it. Return nonzero to suppress the line from the console and `logs/server.log`. |
| `register_relay_filter` | the network thread relaying the packet - the UDP loop, a client's TCP thread, or the worker | A pure function of module data. Never call a state-mutating function (`seat_player`, `kick_player`, `spawn_vehicle`, ...) from it; it can run under internal locks. Verdicts are cached per (from, to, category, subtype, vehicle) - call `invalidate_relay_cache` when the data the filter reads changed. |
| `work` of `submit_job` | a background pool thread | Must not call into Lua; every `NodeApi` function is safe. Its return value is handed to `done` on the worker. |

Callbacks carry no global lock, so state shared between the worker, the sink and your threads
needs atomics or a mutex of your own - `plugin-example` counts sink lines in a `std::atomic_int`
and keeps worker-only detail in plain globals. A verdict callback runs while the requesting
client's network thread waits for the answer; keep it fast. Timers never fire after the framework
has shut down, and the framework clears the log sink and stops the worker before it calls
`node_plugin_shutdown`, so by then no callback of yours is running - join your own threads there.

The inline relay filter is the reason `dimensions` was once a module with a filter; today the
core's visibility groups (`set_player_group`, `set_vehicle_group`) answer the same question by
comparing two numbers on the thread that holds the packet, and `dimensions` only decides who
gets which number. Prefer groups for room-style rules; a filter is for rules a number cannot
express.

## Buffers and return conventions

- An action returns `0` on success and `-1` on failure; a question returns `1` for yes and `0` for
  no. Both are `int` - read the entry you are calling.
- A function that fills a buffer `(char* buf, int buflen)` returns the bytes written, or `-1` when
  the buffer is too small.
- Ask for the size first: call with `buf = NULL` (or `buflen = 0`) and it returns the length it
  would write, without the NUL, so allocate `length + 1`. `-1` from a size query means the thing
  does not exist. Do this for anything that can grow - the world snapshot, the metrics JSON, a
  vehicle config - and allocate more than reported, ready to retry: the answer is a snapshot of a
  live server and can be longer by the time you read it. `plugin-example`'s `FetchString` is that
  loop.
- Strings are UTF-8 and NUL-terminated; `data` pointers passed to a callback are valid only for the
  duration of the call - copy what you keep.
- Where a JSON view exists beside a struct getter - `get_vehicle_json` next to `get_vehicle_info`,
  `get_player_session_json` for the whole session - the JSON carries the variable-length parts
  (passengers, whitelist, tags) that a fixed struct cannot.

## Language hosts

A language host teaches the server a new kind of resource. Put `type = "js"` in a `resource.toml`
and the folder is handed to whichever module registered that name; Lua is built in and needs no
host. The server never learns the language: the host embeds the interpreter, the server only
decides who gets the folder and forwards events.

```c
NodeLanguageHost host = { 0 };
host.struct_size = sizeof(NodeLanguageHost);
host.type_name = "js";
host.load = js_load;      /* int  (const char* name, const char* dir, const char* entry, void* user) */
host.unload = js_unload;  /* void (const char* name, void* user) */
if (api->register_language_host(&host) != 0) {
    return -1;
}
```

Register in `node_plugin_init`: modules load before resources, so the host is in place when the
scan begins. `load` is called once per resource folder with the absolute `dir` and the manifest's
`server.main` (already checked to stay inside the folder); return `0` to accept, anything else to
refuse - the server then logs `<name> · the 'js' host refused it (returned -1)` and leaves the
resource unloaded. `unload` runs at shutdown and on `reload_resource` for that name. Both run on
the worker, one at a time. Client files are packaged for a hosted resource exactly as for a Lua
one: what the client runs is the game's Lua whatever language wrote the server half.
`register_language_host` returns `-1` for a `struct_size` that does not match the server's
(`register_language_host: struct size mismatch ...; rebuild the module`) or a type already taken,
including the built-in `lua`.

Registrations a host makes while the framework is calling its `load()` - event handlers, timers,
relay filters, bus subscriptions, module channels, the log sink - are attributed to that resource
and dropped when it unloads. For registrations made later, from a callback or your own thread, say
whom they belong to with `set_resource_owner(name)` and `set_resource_owner(NULL)` afterwards; it
applies per thread until changed. Work already in flight is not covered: a `submit_job` or
`http_request` completion fires whether or not the resource that started it still exists.

`examples/js-host` is the reference host: a module that claims `type = "js"` and runs resources on
Node. It starts the runtime on demand at the first `load`, so a server without JavaScript
resources pays nothing; it needs a built Node source tree (`cmake -DNODE_SRC=<path>`, containing
`out/Release/libnode.lib`) and, unlike the other modules, links the dynamic CRT because it shares
an allocator with `libnode.dll`. Once it is in `modules/`, the console prints
`js-host: resources with type = "js" will run on Node`, and a resource such as `session-report`
loads from its manifest:

```toml
name = "session-report"
version = "1.0.0"
type = "js"

[server]
main = "server/main.js"
```

Without the host, the same folder is skipped with
`session-report · resource type 'js' has no language host loaded, skipping (a native module in modules/ must register one)`.

## Events, channels and the bus from C

The same four event kinds a resource sees, by registration function:

- `register_client_event(name, cb, user)` - a wire event from a client; `cb(player_id, data)`.
  Answer with `emit_client(id, event, data)`, `emit_all(event, data)` or
  `emit_others(except_id, event, data)`; the `_bytes` variants (`emit_client_bytes`,
  `emit_all_bytes`) carry payloads with NUL bytes.
- `register_builtin_event(name, cb, user)` - the observer form of engine events (`playerJoin`,
  `vehicleSpawned`, `serverTick`, ...); `cb(id)` carries a player id or, for vehicle events, the
  vehicle's global id. Cancellable names can be observed here too, without a veto.
- `register_vehicle_event(name, cb, user)` - `vehicleEdited`, `vehicleReset`, `vehiclePainted`,
  `playerSeatChanged` with `(player_id, global_id, data)`.
- `register_cancellable_event(name, cb, user)` - a verdict callback for the nine `on…Request`
  names; return nonzero to deny and write a reason into the buffer you are given. Every handler
  runs; one veto denies. `onVehicleNodeGrabRequest` is fail-closed: registering a handler that
  returns `0` is how a module opts the grabber in.
- `register_module_channel(channel, cb, user)` and `send_module(player_id, channel, data, len)` -
  the binary channel; `player_id` `-1` broadcasts to every synced client, through the relay filter.
- `register_resource_event(name, cb, user)` and `emit_resource_event(name, data)` - the bus shared
  with Lua resources; a module appears as the source `"native"`.

Every `register_*` has an `unregister_*` twin that takes the same `cb` and `user`; a dispatch
already in flight may still deliver one final call. Timers are `set_timeout`, `set_interval` and
`clear_timer`; storage is `storage_set`/`storage_get`/`storage_delete` with a store name of your
own (`NULL` means the calling resource's store and is refused from a thread with no resource in
scope); `http_request` and `submit_job` are the asynchronous pair whose callbacks land on the
worker. The [events reference](/plugins/api/events/) names every event with its C registration.

## Next

- [C ABI reference](/plugins/api/c/) - every `NodeApi` entry with its index, arguments and threading note.
- [Events](/plugins/events/) - the four kinds, from the resource side.
- [Concurrency](/plugins/concurrency/) - the worker thread the callbacks share with Lua.
- [Wire protocol](/plugins/protocol/) - the frames the relay filter is asked about.
