---
title: Native modules
description: Plugins in C or C++ - the three exported functions, ABI versions, threads, what only a module can do, language hosts, and installing a module.
---

A native module is a library, `.dll` on Windows or `.so` on Linux, in the `modules/` folder next to
the server's executable. It talks to the server through a table of C functions, `NodeApi`, declared
in one header, `node.h`. Modules load before resources.

Write a module when Lua can't keep up: code that runs for every packet, or a library that exists only
in C. For game rules and commands a Lua resource is simpler and safer: an error in Lua is a log line,
an error in a module can take the server down.

## The three functions

A module exports exactly three functions:

| Function | When the server calls it |
|---|---|
| `node_plugin_abi()` | First, before anything else: which ABI version the module was built for. |
| `node_plugin_init(api)` | Once, at load. Return `0` to load, anything else to refuse. |
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

`node.h` is a single C header: no import library, no server internals. Any C or C++ compiler works.
On Windows, build with the static C runtime so the DLL needs nothing beside it.

## ABI versions

The ABI version reads `major.minor`; this server speaks 2.7. `NodeApi` is a struct read by position,
so its layout is a contract: new functions are only ever added at the end, which raises the minor.

- **A different major** is refused at load, before the module can touch anything:
  `module '…' was built against SDK ABI 1.12, this server speaks 2.7 -- refusing to load it. Rebuild the module.`
- **An older minor** loads: everything the module knows is where it expects it.
- **A newer minor** loads with a warning: the module may call functions this server doesn't have.
  Check `api->struct_size` before using a function added after the version you require.

Lua and JavaScript resources need no rebuilding when the server updates.

## Return values

- An action returns `0` on success and `-1` on failure. A question returns `1` for yes and `0` for no.
- A function that fills a buffer returns the number of bytes written, or `-1` when the buffer is too
  small. Called with a `NULL` buffer it returns the length it needs, without the terminating zero.

## Threads

- Every `NodeApi` function may be called from any thread, including threads the module starts.
- Callbacks (events, timers, jobs, HTTP, the bus) run on the server's single worker thread, one at a
  time, like Lua handlers. Blocking in one holds up every resource.
- The relay filter is the exception: it runs on network threads, for every packet, and must be a
  fast function of the module's own data. Never change server state from it.
- Long work goes to `submit_job`, which runs it on a background thread and calls you back on the
  worker.

## What only a module can do

- **Filter the relay on the hot path.** `register_relay_filter` is asked, packet by packet, whether
  one player may see what another sends. Lua can do it too, but a module does it without leaving the
  network thread.
- **Host another language.** `register_language_host` claims a resource `type`: the server then
  hands such resources to the module to load and run. That's how `js-host` runs `type = "js"`
  ([JavaScript resources](/plugins/js-host/)). A host that runs Lua 5.4 gives a resource the same
  sandbox as the server's own Lua with the sdk's `lua_sandbox.hpp`, unless `is_resource_trusted`
  says the host listed it in `[resources] trusted`.
- **Suppress log lines.** A log sink set with `set_log_sink` sees every line and may drop it.

Modules reach resources over the [bus](/plugins/bus/) (`emit_resource_event`,
`register_resource_event`, where they appear as `"native"`), and their client halves through the
numbered binary channels (`register_module_channel`, `send_module`). Since ABI 2.6 a module can also
ask resources a question: `call_resource_event` runs their handlers at once and passes each answer to
a callback before it returns. Call it from a callback, on the worker thread. A module subscribed to
the name sees the question but can't answer it. A module can't add functions to Lua: what it offers
resources goes over the bus, the way the [db module](/plugins/database/) does.

## Installing a module

Copy the library into `modules/` next to the executable and restart the server. The log reports
each module it loads, and the reason for each one it refuses. In Docker the folder is inside the
image, so adding a module means building your own image on top of the release one.

The full list of functions, with what each does, is the [C API reference](/plugins/api/c/).
