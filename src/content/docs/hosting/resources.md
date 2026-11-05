---
title: Plugins on the server
description: How to install a plugin on the server, configure, reload and obfuscate it, and what native modules are.
---

A plugin is a folder in `resources/` with Lua code that runs on the server and, if needed, scripts that the server sends to players. Chat commands, rules, game modes and admin tools are all plugins. How to write them: [Plugin development](/plugins/overview/).

## Install a plugin

1. Copy the plugin's whole folder into `resources/` next to `server.toml`. If there is no `resources/` folder yet, create it. In Docker that's `data/resources/`.
2. Restart the server.

The server logs every plugin it loads:

```text
demo-numbers v1.0 loaded — lua · server 1 file · 1 client file
1 resource · 1 module loaded
```

Chat works without plugins; chat commands such as `/pm` come from plugins.

The server archive has an `examples/` folder next to the program with ready-made plugins. To try an example, copy its folder into `resources/`. The copy is yours: you can change it, and updating the server won't touch it. Which examples there are: [The example plugins](/plugins/examples/).

## A plugin's settings

A plugin's folder can hold a `resource.toml` file. What a host needs in it is the `[config]` table with the plugin's own settings. The plugin's author says which keys it takes. For example, for `vehicle-cleanup`:

```toml
[config]
deleteIdleAfterSeconds = 600
maxWorldVehicles = 20
```

After an edit, restart the server or reload the plugin.

## Reload a plugin

The `reload <name>` command in the server console starts a plugin's server part again without restarting the whole server. The server packs the client scripts once, at start, so changes to them reach players only after a restart.

## Obfuscating client scripts

Before sending the scripts a plugin gives to players, the server scrambles them (`[resources] obfuscate`, on by default) to make them harder to copy. Prometheus, a Lua program in the `tools/` folder, does this, and it needs Lua 5.1. It's already in the Windows archive and in the Docker image; on Linux you install it separately ([Install Lua 5.1](/hosting/linux/#install-lua-51)).

When all is well, the log has `client obfuscation ready · runner … · Prometheus (cache .obfcache)`. If not, the server still works and sends the scripts as they are, and the log explains what is missing. To check the setup, run `Node-Server --obf-selftest`: on success it prints `[obf-selftest] available=1`.

The plugin chooses how hard to scramble with the `[client] obfuscation` key in `resource.toml`: `none`, `light` (the default), `medium` or `strong`. The results are cached in `.obfcache/`, and you can delete that folder at any time.

The server also checks the syntax of client scripts while packing them. It still sends a script with an error, but warns in the log: `… client file 'main.lua' has a syntax error: …`.

## Native modules

A native module is a compiled library (`.dll` or `.so`) in the `modules/` folder next to the program. Modules load before plugins. The archive already has the database module for plugins ([The db module](/plugins/database/)).

At load the server checks which interface version a module was built for. It doesn't load an incompatible module and asks for a rebuild. How to add a module in Docker: [Plugins and mods](/hosting/docker/#plugins-and-mods).
