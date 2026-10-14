---
title: FAQ
description: Short answers to what players, hosts and plugin authors ask most, each with a link to the page that has the details.
---

Short answers, each with a link to the full story. Words with a special meaning are in the
[glossary](/reference/glossary/).

## Players

### Do I need an account?

No. Test Drive lets you play without one, under a guest name that changes every session. Some
servers want an account (their card says *Account required*); with one you also keep your name on
every server. Sign-up is free at [nodemp.com](https://nodemp.com/register).
→ [Your account](/players/sign-in/)

### Which BeamNG.drive version do I need?

0.39.4.0. The client mod is built for it, and strict servers check against a clean copy of it.
Copies outside Steam work too: set the folder under **Settings → Game**.
→ [Install the launcher](/players/install/#what-you-need)

### Windows says the publisher is unknown. Is the installer genuine?

The installer isn't code-signed yet, which is why Windows warns. To be sure you have the real file,
compare its SHA-256 (`Get-FileHash NodeMP-Setup-<version>.exe` in PowerShell) with the `.sha256`
file published next to it on [GitHub releases](https://github.com/NodeMP-BeamNG/releases).

### Why does the launcher download mods before the game starts?

So a missing mod or a refused join never costs you a game start. The launcher joins the server,
checks your game files and downloads what the server needs, and only then starts BeamNG.drive.
→ [Find and join a server](/players/join/#join)

### Will a short connection drop throw me off?

No. If the server hears nothing from you for 8 seconds, others see your car frozen and see-through;
your launcher reconnects on its own, and within 30 seconds (or longer, if the host allows) you carry
on with the same cars. → [VPN and bad connections](/players/vpn/)

### Does the server check my game files? What about my mods?

Every server checks the game's own files; only a **strict** server also looks at your user folder.
Zip mods in `mods\` never fail a check, and the game turns them off during a session anyway (unless
you allowed local mods and the server does too).
→ [What the server checks](/players/join/#what-the-server-checks-on-your-pc)

### How do I see everything a strict server didn't like?

Click **Copy** under the refusal and run the command it copies: it lists every problem, one per
line. → [Strict servers](/support/strict-servers/#see-every-problem)

### How do I go to another server?

Close BeamNG.drive and pick the next server in the launcher. You can't switch from inside the game.

### My message isn't on these pages. What now?

Every message is on [Messages and exit codes](/support/error-codes/). If yours isn't, send the
message and your `launcher.log` to the forum or Discord.
→ [Logs and what to send](/support/troubleshooting/#logs-and-what-to-send)

## Hosts

### What do I need to get my server listed?

A NodeMP account, a server key you create in it (a Host ID and a secret), and a port players can
reach over TCP and UDP (`30814` unless you change it). Without a key the server still runs; players
join it by address. → [Get listed](/hosting/registering/)

### Do I still need the `chat` resource?

No. Chat is part of the server, and `player:tell`, `node.chat.say` and chat commands work without
it. If you have `resources/chat` from an older setup, you can delete it.
→ [Mods and resources](/hosting/resources/)

### I pasted the `[Directory]` block from the website and now the server won't start.

The `server.toml` the server wrote already has a `[Directory]` table, and TOML doesn't allow two.
Put `Url`, `HostId` and `HostSecret` into the existing table and delete the pasted one. The server
says so itself: `the table [Directory] appears twice. Put the keys into the existing [Directory] table …`.
→ [Get listed](/hosting/registering/#put-the-key-into-the-server)

### My Docker server ignores `server.toml`.

That's on purpose: the image reads its settings from environment variables (`NODE_PORT`,
`NODE_NAME`, …), which keep secrets out of files. If you prefer a file, set
`NODE_PROVIDER_DISABLE_CONFIG=false`. → [Hosting troubleshooting](/hosting/troubleshooting/#docker-other-surprises)

### My Docker server stops right after start with a TLS error.

Point `NODE_TLS_CERT` and `NODE_TLS_KEY` at the data volume (`/data/tls/node_cert.pem` and
`/data/tls/node_key.pem`); the default location next to the executable is read-only in the image.
→ [Hosting troubleshooting](/hosting/troubleshooting/#docker-tls-pair)

### Several players behind one VPN or one address can't get in.

The server limits how many connections from one address may be in the middle of joining at once
(`[Network] MaxConnectionsPerIp`, 32 by default; private ranges are exempt). Raise it, or exempt the
range. → [Hosting troubleshooting](/hosting/troubleshooting/#players-are-refused-at-the-door)

### How do I lift a ban?

Stop the server, then `Node-Server --bans list` and `Node-Server --bans remove <ip | nodemp:<id> | <id>>`.
A plugin can also call `node.bans.remove` on a running server.
→ [Console, kicks and bans](/hosting/administration/#bans)

### Where are the example resources?

In `examples/` in the release archive, next to `Node-Server`; `examples/README.txt` says what each
does. Copy a folder into `resources/` and restart. → [Mods and resources](/hosting/resources/)

### Do I need a Windows PC for the strict check?

You need a PC with a clean BeamNG.drive install to make the description of a clean install, once
per game version. The file then works on any server, Linux and Docker included.
→ [Strict verification](/hosting/strict-verification/)

### Where are the release notes?

In the description of each server release on [GitHub releases](https://github.com/NodeMP-BeamNG/releases).
They say what changed, whether a default changed and whether players need a new launcher.
→ [Updating](/hosting/updating/)

## Plugin authors

### What are events called, and do the old names still work?

Notifications are `<subject><Verb-ed>` (`playerJoined`, `vehicleSpawned`), requests you can refuse
are `<subject><Action>Request` (`vehicleSpawnRequest`), and messages to and from clients are
`<domain>:<verb>` (`chat:send`). Events renamed in release 1.2.0 answer only to the new name:
subscribing to an old one (`playerJoin`, `onVehicleSpawnRequest`, …) is refused with an error that
names the new spelling. → [Events](/plugins/events/)

### Does `node.http` check certificates? Can it reach my LAN?

It checks certificates by default, against the system's trusted roots plus the `cacert.pem` shipped
with the server. It refuses private and local addresses unless the host sets
`[Http] AllowPrivateNetworks = true`. → [HTTP](/plugins/http/)

### Is there a socket API?

No. Use `node.http` for web services, the bus between resources, and wire events or the module
channel to talk to clients. → [Resources talking to each other](/plugins/bus/)

### What survives a resource reload?

`node.storage`, the files in the resource folder and every other resource. Handlers, timers,
coroutines and the Lua state itself start over, and `resourceUnload("reload")` runs first so you
can save what you need. → [Resources → Reloading](/plugins/resources/#reloading)

### Can I test a plugin without the game?

Mostly. Server code runs with no players on; chat commands can be fed through the bus
(`chat:command`); anything that needs a car or a client script needs a game.
→ [Your first resource](/plugins/getting-started/#testing-without-the-game)

### How do I check that a file exists, make a folder, or watch a file?

`node.fs.exists`, `stat`, `mkdir`, `remove`, `rename`, `copy` and `watch`, all inside the resource
folder. → [Storage and files](/plugins/storage/)

### Can `node.json` pretty-print or diff?

Yes: `node.json.encode(value, { pretty = true })`, and `flatten`, `unflatten`, `diff` and `patch`.
→ [Lua API reference](/plugins/api/lua/#nodejson)

### How much memory does my resource use? Which OS am I on?

`node.server.memory()` gives this resource's Lua memory, all resources together and the whole
process; `node.server.platform()` the OS and architecture. → [Conventions](/plugins/conventions/)

### Can I write a resource in JavaScript?

The server can host other languages through a native module, and a JavaScript host exists, but it
isn't part of the release archive. Lua is what every server runs out of the box.
→ [Native modules](/plugins/native-modules/#other-languages)

### Can a client script replace a file of the game or of the client mod?

No. A resource's client files are compiled in memory under the resource's own name and never
written to the player's disk; they add to the game, they don't replace anything.
→ [Client scripts](/plugins/client-scripting/)
