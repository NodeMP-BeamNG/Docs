---
title: "Command line and environment"
description: "Node-Server's command-line flags, the provider variables and the other environment variables it reads."
---

## Provider variables

Three variables exist for hosting panels and containers. They are read from the environment
only and have no key in the file.

| Variable | Effect |
|---|---|
| `NODE_PROVIDER_DISABLE_CONFIG` | When its value is exactly `true` or `1` (`TRUE` and `yes` do not count): no `server.toml` is read, generated or rewritten; settings come from the environment and the defaults. The Docker image sets it. |
| `NODE_PROVIDER_PORT_ENV` | The name of another variable that carries the port, for a panel that exports it under its own name (`SERVER_PORT`). Read instead of `NODE_PORT`. |
| `NODE_PROVIDER_IP_ENV` | The same for the bind address, instead of `NODE_IP`. |

## Other environment variables

| Variable | Effect |
|---|---|
| `NODE_LUA` | Path of the Lua 5.1 (or LuaJIT) executable that runs the obfuscator. Without it the server looks for `tools/lua515/lua5.1` (`lua5.1.exe` on Windows), then `tools/luajit`, `tools/lua5.1`, `tools/lua`. |
| `NODE_TOOLS_DIR` | The `tools/` folder, when it is not next to the executable. |
| `NODE_FORCE_ANSI` | `1` or `true`: coloured console output even when the output is not a terminal. |
| `NODE_PLUGIN_POOL` | Threads in the background job pool resources use for `node.job` and `node.await`. Default: the machine's core count, between 2 and 32. |

## Command line

`Node-Server --help` prints:

```
USAGE:
    Node-Server [arguments]

ARGUMENTS:
    --help
                        Displays this help and exits.
    --port=1234
                        Sets the server's listening TCP and
                        UDP port. Overrides ENV and server.toml.
    --config=/path/to/server.toml
                        Absolute or relative path to the
                        server config file, including the
                        filename. For paths and filenames with
                        spaces, put quotes around the path.
    --working-directory=/path/to/folder
                        Sets the working directory of the Server.
                        All paths are considered relative to this,
                        including the path given in --config.
    --version
                        Prints version info and exits.
    --gen-integrity <gamedir> [--out <file>] [--game-version <v>]
                        Writes the integrity manifest that
                        VerifyGame = "strict" checks players
                        against, from a CLEAN game install at
                        <gamedir> (the folder with integrity.json):
                        EVERY file of the install with size and
                        SHA-256 (the game's own integrity.json omits
                        some shipped files) plus the table of
                        contents of every archive; hashing a few GB
                        takes well under a minute. Default output is
                        integrity/<game-version>.manifest under the
                        working directory ([General] IntegrityDir);
                        the version is read from integrity.json
                        unless --game-version says otherwise.
                        Prints the stats and the manifest hash, then
                        exits. Run it on a machine with the game
                        installed and copy the file to the server.
    --bans list
    --bans remove <ip | nodemp:<account id> | <account id>>
                        Shows or lifts bans without a running server.
                        Bans live in bans.json in the working
                        directory: one JSON object whose keys are the
                        banned IP address ("203.0.113.7", or an IPv6
                        address without brackets) or the NodeMP
                        account as "nodemp:<id>", and whose values are
                        {"reason": "<text shown to the player>",
                         "at": <unix seconds>, "name": "<player name
                        at the time>"}. Stop the server before editing
                        the file, by hand or with this: it reads the
                        file once, on the first ban check or ban after
                        a start, keeps the list in memory from then on
                        and writes it back on every new ban.
    --obf-selftest
                        Checks that the client-script obfuscator
                        (tools/) runs; prints [obf-selftest]
                        available=1 when it does. Exits.

EXAMPLES:
    Node-Server --config=../MyWestCoastServer.toml
        Runs the Node-Server and uses the server config file
        which is one directory above it and is named
        'MyWestCoastServer.toml'.
    Node-Server --gen-integrity "C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive"
        Writes integrity/0.39.4.0.manifest (for that game version).
    Node-Server --bans remove 203.0.113.7
        Lifts the ban on that address (server stopped).
```

`--gen-integrity` and `--bans` are separate tools sharing the binary: they take their words as
positional arguments, need no `server.toml`, and exit when done.
[Strict verification](/hosting/strict-verification/) walks through the first;
[Running the server](/hosting/administration/#bans) through the second. `--obf-selftest` checks that the
client-script obfuscator runs ([Resources and content](/hosting/resources/#obfuscation)).

