---
title: Native modules
description: The three exported functions, ABI versions, threads, what only a native module can do, language hosts and installing a module.
---

A native module is a library (`.dll` on Windows, `.so` on Linux) in the `modules/` folder next to the server program. It talks to the server through `NodeApi`, a table of C functions declared in one header, `node.h`. Modules load before plugins.

Write a module when Lua can't keep up: code that runs for every packet, or a library that exists only in C. For game rules and commands a Lua plugin is simpler and safer: an error in Lua is a log line, while an error in a module can take the server down.

## The three functions

A module exports exactly three functions:

| Function | When the server calls it |
|---|---|
| `node_plugin_abi()` | First, before anything else: which ABI version the module was built for. |
| `node_plugin_init(api)` | Once, at load. `0` loads the module, any other value refuses it. |
| `node_plugin_shutdown()` | When the server stops. |

A module that greets every player in the log:

```c
#include "node.h"
#include <stdio.h>

static const NodeApi* api;

static void on_joined(int player_id, void* user) {
    char name[64], line[128];
    if (api->get_player_name(player_id, name, sizeof name) < 0) return;
    snprintf(line, sizeof line, "hello, %s", name);
    api->log_info(line);
}

NODE_PLUGIN_ABI()

NODE_EXPORT int node_plugin_init(const NodeApi* a) {
    api = a;
    api->register_builtin_event("playerJoined", on_joined, NULL);
    return 0;
}

NODE_EXPORT void node_plugin_shutdown(void) {
    api->unregister_builtin_event("playerJoined", on_joined, NULL);
}
```

`node.h` is a single C header with no import library and none of the server's internals. Any C or C++ compiler works. On Windows, build with the static C runtime so the DLL needs nothing next to it.

## ABI versions

The ABI version is `major.minor`, set by `NODE_ABI_VERSION_MAJOR` and `NODE_ABI_VERSION_MINOR` in `node.h`. `NodeApi` is a structure read by offsets, so its layout is a contract: new functions are only appended, which raises the minor version.

| The module was built | What the server does |
|---|---|
| With a different major version | Refuses to load it before the module touches anything: `module '…' was built against SDK ABI 1.12, this server speaks 2.8 -- refusing to load it. Rebuild the module.` |
| With an older minor version | Loads it: everything the module knows is where it expects. |
| With a newer minor version | Loads it with a warning: the module may call functions this server doesn't have. If it must also work on such a server, check `api->struct_size` before calling a new function. |

Lua and JavaScript plugins don't need rebuilding when the server is updated.

## Return values

- An action returns `0` on success and `-1` on failure. A question returns `1` for yes and `0` for no.
- A function that fills a buffer returns the number of bytes written, or `-1` if the buffer is too small. With a `NULL` buffer it returns the length it needs, without the terminating zero.

## Threads

- Any `NodeApi` function can be called from any thread, including the module's own.
- Callbacks (events, timers, jobs, HTTP, the bus) run on the server's single worker thread, one at a time, like Lua handlers. Blocking in one holds up all plugins ([Timers and coroutines](/plugins/concurrency/)).
- The log sink (`set_log_sink`) runs on the thread that wrote the line, and must not block.
- The relay filter runs on network threads, for every packet, and must be a fast function of the module's own data. It must not change the server's state.
- The server runs the work function of `submit_job` on a background thread and calls you back on the worker thread.

## What only a module can do

- Filter the relay on the hot path. The server asks the filter from `register_relay_filter` whether one player may see another's packet, and remembers the answer. Lua can do this too, but a module answers without leaving the network thread.
- Run another language. `register_language_host` claims a plugin `type`: the server hands such plugins to the module, which loads and runs them; that is how `js-host` runs `type = "js"` ([JavaScript plugins](/plugins/js-host/)). A Lua 5.4 host can give plugins the server's own sandbox with the sdk's `lua_sandbox.hpp`, and `is_resource_trusted` says whether a plugin is listed in `[resources] trusted`.
- Suppress log lines. The log sink set with `set_log_sink` sees every line and may drop it. The server has one sink: the next `set_log_sink` replaces the previous one.

Modules talk to plugins over the [bus](/plugins/bus/) (`emit_resource_event`, `register_resource_event`, where they appear as `"native"`), and to their own client halves over numbered binary channels (`register_module_channel`, `send_module`). A module can also ask plugins: `call_resource_event` runs their handlers at once and passes each answer to a callback before returning; call it from a callback, on the worker thread. A module subscribed to the name sees such a question but can't answer it ([The bus](/plugins/bus/#asking-and-answering)). A module can't add functions to Lua: whatever it offers plugins goes over the bus, as with the [db module](/plugins/database/).

## Installing a module

Installing a module on a server: [Plugins on the server](/hosting/resources/#native-modules). At startup the server logs `<file> initialized` for each module it loads and the reason for each one it refuses.

Every function is described in the [C API reference](/plugins/api/c/).
