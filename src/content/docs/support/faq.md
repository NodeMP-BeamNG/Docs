---
title: FAQ
description: Direct, concise answers to frequently asked questions from players, hosts, and plugin authors, with links to detailed guides.
---

Short answers to frequently asked questions about playing, server hosting, and plugin development. Defined terms are explained in the [glossary](/reference/glossary/).

## Players

### Is it a Play button or a hold button?

A hold button: **Hold to play** — press and hold it for about half a second, then let go. This guards against accidental clicks. If you prefer one-click joining, turn it off under **Settings → Launcher → Hold to play**. → [Join a server](/players/join/#join)

### Do I need an account? What is Test Drive?

No, an account is optional. Test Drive lets you play without registration: you receive a temporary random `Guest-…` name on each launch (it cannot be chosen manually). Certain servers disallow guest connections (*Account required* appears on the server card; the *No account needed* filter hides them). Registering an account gives you a permanent, verified name that works on every server. Accounts can be registered at [nodemp.com](https://nodemp.com/register), and login is completed through your browser in the launcher. → [Account and sign-in](/players/sign-in/)

### Which BeamNG version do I need?

0.39.4.0 — the current release of BeamNG.drive. Client mod 1.6.19 is built specifically for it, and strict server integrity manifests are generated for a clean installation of this version. Non-Steam copies are also supported: just select your game path under **Settings → Game**. → [Install the launcher → What you need](/players/install/#what-you-need)

### Windows warns about an unknown publisher. Is the installer genuine?

Yes. The installer executable is not yet code-signed with a commercial certificate, which causes Windows SmartScreen to show a warning. You can always verify the SHA-256 hash of the installer (`Get-FileHash` in PowerShell) against the published checksum on the download page. → [Install the launcher → Download and install](/players/install/#download-and-install)

### Does the launcher update itself?

Yes. It automatically checks for updates at launch and before every server connection. If a newer build is available, the launcher downloads it and prompts you to **Restart and update**. Updates are never applied while actively playing. If a server requires a newer launcher version, the join pauses with an **Update now** button — the launcher updates and immediately rejoins the server. The client mod is also verified before each connection. → [Install the launcher → Launcher updates](/players/install/#launcher-updates)

### Does the server check my game files? What about my mods?

Every server checks game integrity according to the mode chosen by its host. Only a **strict** server checks the BeamNG user folder as well. Normal zipped mods inside your `mods\` folder never block your join: integrity scans ignore them, and the launcher disables them during multiplayer sessions anyway (unless you enabled *Use my local mods in multiplayer* and the server allows it). A strict server only rejects files left outside `mods\`: unpacked files under `vehicles\`, `levels\`, `lua\`, `ui\`, `art\`, or `scripts\` in your user folder, or unauthorized files in the main game folder. → [Join a server → What the server checks on your PC](/players/join/#what-the-server-checks-on-your-pc)

### How do I see everything a strict server rejected?

The server refusal message shows up to three examples. The built-in launcher diagnostic tool lists every discrepancy, showing the exact reason code on each line (`overlay`, `unlisted`, `hash`, etc.). You can easily copy the diagnostic command by clicking **Copy** right beneath the refusal notification. → [Strict servers → See every problem](/support/strict-servers/#see-every-problem)

### What does "Stock content" mean?

This refers to **server content** downloaded by the launcher prior to joining. "Stock content" means the server uses only default BeamNG.drive vehicles and maps without extra mods. Any required downloads are listed under *It will send you* on the server card. This label does not refer to your local game installation. → [Join a server → Look at a server](/players/join/#look-at-a-server)

### How can Direct Connect work while the server list is down?

You connect directly via `IP:port` without a directory join ticket. Local unkeyed servers accept nicknames directly; listed servers with Test Drive enabled admit you as an unverified guest; and servers marked *Account required* reject connections until directory connectivity is restored. → [Launcher problems → The server list is empty](/support/launcher/#the-server-list-is-empty)

### What is the launcher's helper?

The background process of the launcher that launches BeamNG.drive and handles the multiplayer network session while you play. It is the same program running without a graphical window. Its activity is logged to `launcher.log`, and **The launcher's traffic helper stopped** indicates that this process exited unexpectedly. → [Troubleshooting](/support/troubleshooting/#the-launcher-and-its-helper)

### My message is not on these pages. What now?

All possible error texts from the launcher, helper, and server are indexed on the [Error codes](/support/error-codes/) page. If your error is not listed there, grab your `launcher.log`, note the message from the notification centre, and reach out on the forum or Discord community. → [Logs and reports](/support/logs/)

## Hosts

### Which server version do these pages describe?

The current release; the version table in [What is NodeMP](/introduction/what-is-nodemp/#versions) is the source of truth. Where older versions behaved differently, a brief version note highlights the difference.

### What do I need before my server can be listed?

A NodeMP account with a verified email and linked Discord profile (only verified accounts can generate server keys), a machine accessible on port 30814 over TCP and UDP, and your authentication key configured in the `[Directory]` section of `server.toml`. Without a key, the server runs unlisted and remains accessible via Direct Connect. → [Quick start](/hosting/quick-start/#what-you-need), [Registering your server](/hosting/registering/)

### I pasted the `[Directory]` block from the website and the server exits. Why?

The default `server.toml` already contains a `[Directory]` table. Pasting another one introduces duplicate table headers, which is invalid in TOML. Remove the duplicated block and paste your `Url`, `HostId`, and `HostSecret` into the existing `[Directory]` table. The server will output: `the table [Directory] appears twice. Put the keys into the existing [Directory] table …`. → [Registering → Put the key into the server](/hosting/registering/#put-the-key-into-the-server)

### On Windows the log says `TLS handshake failed: certificate verify failed` towards `api.nodemp.com`. Is the key wrong?

No, the key is fine — the server could not locate trusted Windows root certificates. Make sure `cacert.pem` is placed next to `Node-Server.exe`. If system certificates cannot be verified, set the `SSL_CERT_FILE` environment variable pointing to a PEM bundle of public roots. Do not manually pin `[Directory] Fingerprint`. → [Registering → Windows](/hosting/registering/#windows-the-directorys-certificate)

### How do I know the directory's probe reached my port?

The server log does not state this explicitly. Once the probe succeeds, your server appears in the launcher catalog and on nodemp.com/servers, and external TCP connections to your public IP on port 30814 will connect without issues. → [Registering → What the server does with it](/hosting/registering/#what-the-server-does-with-it)

### The server says `Cannot listen on port 30814 … the port is already in use` and quits. Why?

Port 30814 is in use by another process — usually a previous instance of `Node-Server` that is still shutting down. Terminate the older process or configure a different port. The server exits with code 1 so process supervisors notice. → [Running → Logs](/hosting/administration/#logs)

### How do I lift a ban?

Stop the server. Run `Node-Server --bans list` to display existing bans, and `Node-Server --bans remove <ip | account id>` to unban a player (for players banned during a session, both IP and account entries are cleared). You can also edit `bans.json` directly while the server is stopped, or call `node.bans.remove` from a running server plugin. → [Running → Bans](/hosting/administration/#bans)

### Where are the example resources (`chat`, `demo-numbers`, …)?

They are located in the `examples/` directory of the release archive beside `Node-Server`; `examples/README.txt` describes each one. Copy the desired resource into `resources/` and restart the server. → [Resources and content → Installing a resource](/hosting/resources/#installing-a-resource)

### Do I need a Windows PC for `strict`?

For generating reference manifests, yes: the generator tool reads a clean BeamNG installation, so it runs on a machine where the game is installed. The generated `.manifest` file can then be copied to any server running on Linux or inside Docker. → [Strict verification](/hosting/strict-verification/#generating-the-manifest)

### Where are the release notes?

In the GitHub release descriptions (starting from 1.2.1 — in `RELEASE_NOTES.md` in the server repository): summary of changes, default value adjustments, and protocol bumps. When a new server release does not increment the wire protocol, players are not required to update their launcher. → [Updating](/hosting/updating/)

## Plugin authors

### What is the event naming rule, and what happens to the old names?

Notification events are named `<subject><Verb-ed>` (`playerJoined`, `vehicleSpawned`, `serverShutdown`). Cancellable request events are named `<subject><Action>Request` (`vehicleSpawnRequest`, `relayRequest`). The `on` prefix is not used. Network events use lowercase colon notation: `<domain>:<verb>` (`chat:send`). Legacy event names (`playerJoin`, `onVehicleSpawnRequest`, etc.) remain supported as deprecated aliases: they continue working, print a single `[deprecated]` warning per resource, and will be removed in version 2.0. → [Events → Naming](/plugins/events/#naming)

### Which HTTP methods exist?

`node.http.request(method, url, opts?, cb)` accepts any standard HTTP method. Shorthands `node.http.get`, `post`, `put`, `patch`, `delete`, and `head` invoke the same request with a preset method, while `node.http.fetch(url, { method = … })` provides a coroutine-based alternative inside `node.async`. Response headers arrive with lowercased keys (`headers["content-type"]`). TLS certificate verification is disabled by default; set `[Http] CaFile` in your server configuration to enforce verification. → [Concurrency → HTTP](/plugins/concurrency/#http)

### Are there sockets - a `node.net`?

Not currently. The server does not expose a raw socket API to resources. Use `node.http` for external web services, and network events, `node.bus`, and module channels for inter-resource communication.

### What survives a resource reload, and what is `resourceUnload`?

A resource reload resets all server-side handlers, timers, coroutines, bus subscriptions, relay filters, and the Lua state, re-executing `main.lua`. `node.storage`, files in the resource directory, and other resources survive intact; background worker jobs and active HTTP requests continue running, while client files are not repackaged until a full server restart. The `node.on("resourceUnload", fn(reason))` hook executes immediately before teardown (with `"reload"` or `"shutdown"`), giving you an opportunity to persist state. → [Resources → Reload](/plugins/resources/#reload)

### What does a strict server check, and what does it not?

Strict mode compares the game directory, archive CRC-32 tables, and player user folder against a clean reference manifest upon joining and during gameplay. It does not hash full archive payloads, does not inspect launcher binaries, and ignores the `mods\` directory. Do not confuse this with a **strict session** (`session:config.strict`) — in-game vehicle restrictions enabled per player by your plugin. → [Strict verification](/hosting/strict-verification/#what-strict-does-not-check), [Client scripting → Strict sessions](/plugins/client-scripting/#strict-sessions-sessionconfigstrict)

### How do I test a plugin without the game?

Server-side plugin logic runs completely without connected players. Chat commands can be tested via the event bus: publish `chat:command` with `{ pid, name, args, raw }` (where `name` is lowercase) and inspect replies on `chat:say`. Network wire events and client scripts require an active game client. → [Getting started → Testing without the game](/plugins/getting-started/#testing-without-the-game)

### Why does `/HELLO` not reach my handler when I publish `chat:command` myself?

The `chat` resource and `node.commands.add` normalize command names to lowercase upon registration. Custom `chat:command` events published via the bus must also pass the `name` field in lowercase. → [Recipes → A chat command](/plugins/recipes/#a-chat-command)

### `node.on` with the same function twice - once or twice?

Once: registering the exact same function with `node.on` replaces the previous registration. Use `node.off(name, fn)` to unregister a handler. Registering two distinct functions creates two separate handlers. → [Conventions → Return shapes](/plugins/conventions/#return-shapes)

### Why did my 600 ms timer callback not trigger the stall warning?

On the current server release, it does: every event handler, timer callback, and coroutine slice is timed individually, and the stall warning names the offending resource and type (`(resource race, timer)`). → [Concurrency → One worker thread](/plugins/concurrency/#one-worker-thread)

### Is a syntax error in my client file reported by the server?

Yes. During server startup, client scripts are parsed during packaging. If a script contains syntax errors, the server logs an `Error` line with the resource name, file path, and Lua error message regardless of obfuscation settings. The file is still delivered to clients, and runtime errors will appear in the player's `beamng.log`. → [Resources → Obfuscation](/plugins/resources/#obfuscation)

### Where are the examples, and where is `chat`?

Example resources are included in the `examples/` directory of the release archive (listed in `examples/README.txt`). The chat wire protocol (`chat:send`, `chat:msg`) and bus contract (`chat:command`, `chat:say`) are documented, making custom chat implementations straightforward. → [Events → node.bus](/plugins/events/#between-resources-nodebus)

### Can a resource overwrite a file of the game or of the client mod with a client file of its own?

No. Streamed client files compile in memory under the resource's private namespace and are never written to the player's disk. They introduce hooks and extensions alongside existing code without overriding core game assets or the official `NodeMP.zip` mod. → [Client scripting → What a client file can and cannot do](/plugins/client-scripting/#what-a-client-file-can-and-cannot-do)

### How do I check that a file exists, create a folder, rename or copy a file with `node.fs`?

`node.fs` provides only `read`, `write`, `writeAsync`, and `list`. Check existence by inspecting `node.fs.list(folder)`. Calling `node.fs.write` automatically creates missing parent directories. To copy, read and rewrite (`node.fs.write(to, node.fs.read(from))`). To rename or delete, use standard Lua `os.rename` and `os.remove` with absolute paths within the resource directory. Always format file paths with forward slashes `/`. → [Resources → What node.fs does not have](/plugins/resources/#what-nodefs-does-not-have)

### Is there a `fileChanged` event?

No, the server does not watch filesystem modifications automatically. Poll periodically using `node.every`, comparing file sizes from `node.fs.list` or file content hashes. → [Events → No file-watch event](/plugins/events/#no-file-watch-event)

### Random numbers, execution time, memory use, the operating system - where?

Use standard Lua utilities: `math.random()` (already seeded), `node.server.uptime()` to measure elapsed execution time, and `collectgarbage("count")` to inspect memory allocated by the resource's Lua state. Global system metrics and OS version info are deliberately omitted from the API. → [Conventions → The Lua environment](/plugins/conventions/#the-lua-environment)

### Can `node.json` pretty-print, or diff and patch two documents?

No. `node.json.encode` outputs compact JSON without formatting options. Diff, patch, and flatten utilities are not included in the standard API. → [Conventions → The Lua environment](/plugins/conventions/#the-lua-environment)

### Can the server call my language host from several threads?

No. Invocations to hosted resources are delivered strictly sequentially on the single framework worker thread. If your language host uses an external event loop (such as `js-host`), it dispatches callbacks independently. `NodeApi` calls, relay filters, and `submit_job` work execute off the main thread. → [Native modules → Language hosts](/plugins/native-modules/#language-hosts)
