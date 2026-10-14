---
title: Frequent questions
description: Short answers to what players, hosts and plugin authors ask most, each with a link to the details.
---

Short answers, each with a link to the page that has the details.

## Players

### Do I need an account?

No. Test Drive lets you play without one, under a guest name that changes every session. Some
servers only let in players with an account; their card says *Account required*. With an account you
have the same name on every server. Signing up is free at [nodemp.com](https://nodemp.com/register).
More on [Your account](/players/sign-in/).

### Which BeamNG.drive version do I need?

0.39.4.0: the client mod is built for it, and strict servers compare files with exactly that
version. A copy outside Steam works too: set its folder under **Settings → Game**.
More on [Install the launcher](/players/install/#what-you-need).

### Windows says the publisher is unknown. Is the installer genuine?

The installer isn't signed yet, which is why Windows warns. To be sure the file is genuine, compare
its SHA-256 (`Get-FileHash` in PowerShell) with the `.sha256` file published next to it on
[GitHub](https://github.com/NodeMP-BeamNG/releases/releases).

### Why are mods downloaded before the game starts?

So a refused join or a missing mod never costs you a game start. The launcher connects to the
server, checks your files, downloads what's needed and only then starts BeamNG.drive.

### Will a drop of a few seconds throw me off?

No. The launcher reconnects by itself, and if the connection is back within 30 seconds (or longer,
if the host allows), you carry on with the same cars. More on [A bad connection](/players/connection/).

### Does the server check my files? What about my mods?

Every server checks the game's files. Only a strict server looks at your user folder. Zip mods in
`mods\` never fail a check, and the game turns them off during a session anyway.
More on [Join a server](/players/join/#what-the-server-checks).

### How do I go to another server?

Close BeamNG.drive and pick the next server in the launcher. You can't switch from inside the game.

### My message isn't on these pages. What now?

Every message is on [Error messages](/reference/error-codes/). If yours isn't there, send it with
your `launcher.log` to the forum or Discord
([what to send](/players/troubleshooting/#what-to-send-when-you-ask-for-help)).

## Hosts

### What does my server need to be listed?

A NodeMP account, a server key from that account, and a port open for TCP and UDP (`30814` unless
you changed it). Without a key the server still runs, and players join it by address.
More on [Get listed](/hosting/registering/).

### Do I need a resource for chat?

No. Chat is part of the server. Chat commands come from resources: the `chat-commands` example in
the archive adds `/help`, `/me` and `/pm`. More on [Resources](/hosting/resources/).

### I pasted the `[Directory]` block from the website and the server won't start.

`server.toml` already has a `[Directory]` table, and TOML doesn't allow two. Move `Url`, `HostId`
and `HostSecret` into the existing table and delete the pasted one.
More on [Get listed](/hosting/registering/#put-the-key-into-the-settings).

### My Docker server ignores `server.toml`.

That's on purpose: the image takes its settings from environment variables. If you want a file, set
`NODE_PROVIDER_DISABLE_CONFIG=false`. More on [Server in Docker](/hosting/docker/).

### Several players on one VPN can't get in.

The server limits how many connections from one address may be joining at once
(`[Network] MaxConnectionsPerIp`, 32 by default). Raise the limit or exempt the range.
More on [When the server misbehaves](/hosting/troubleshooting/#players-are-refused-at-the-door).

### How do I lift a ban?

Stop the server and run `Node-Server --bans remove <address or nodemp:<id>>`. On a running server a
plugin can lift it. More on [Console, kicks and bans](/hosting/administration/#bans).

### Do I need Windows for the strict check?

You need a computer with a clean BeamNG.drive to make the reference manifest, once per game
version. The file then works on any server, Linux and Docker included.
More on [Strict file check](/hosting/strict-verification/).

### Where are the release notes?

In the description of each server release on [GitHub](https://github.com/NodeMP-BeamNG/releases/releases).
They say what changed and whether players need a new launcher.

## Plugin authors

### What language are plugins written in?

Lua: it's built into the server, nothing to install. JavaScript and C/C++ are possible too, but need
native modules. More on [Overview](/plugins/overview/).

### What are events called, and do the old names work?

Notifications read `<subject><Verb-ed>` (`playerJoined`), requests you can refuse
`<subject><Action>Request` (`vehicleSpawnRequest`), and messages to and from clients
`<domain>:<verb>` (`chat:send`). Old event names don't work: subscribing to one is refused with an
error that names the new one. More on [Events](/plugins/events/).

### How do I make a chat command?

Subscribe to `chatMessageRequest`, parse the line and return `{ handled = true }`.
More on [Chat and commands](/plugins/chat/).

### What survives a resource reload?

`node.storage`, the files in the resource folder and every other resource. Handlers, timers,
coroutines and the Lua state start over. `resourceUnload` with the reason `"reload"` runs first.
More on [How a resource is built](/plugins/resources/).

### Does `node.http` check certificates? Can it reach my LAN?

Certificates are checked by default. Private and local addresses are refused until the host turns on
`[Http] AllowPrivateNetworks`. More on [HTTP requests](/plugins/http/).

### Can a client script replace a file of the game?

No. A resource's client files are compiled in memory under the resource's name and never written to
the player's disk. They add to the game, they don't replace anything.
More on [Client scripts](/plugins/client-scripting/).
