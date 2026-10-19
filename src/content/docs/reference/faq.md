---
title: Frequent questions
description: Questions from players, hosts and plugin authors, each with a link to the page that describes the answer in full.
---

## Players

### Do I need an account?

No. Without one you can play in Test Drive mode, but some servers don't let guests in ([Your account](/players/sign-in/)).

### Which BeamNG.drive version do I need?

Version 0.39 ([Install the launcher](/players/install/)).

### Windows says the publisher is unknown. Is the installer genuine?

The installer isn't signed yet, which is why Windows warns you, and you can check the file against its SHA-256 ([Install the launcher](/players/install/)).

### When are the server's mods downloaded?

The launcher downloads them when you join, before it starts BeamNG.drive ([Join a server](/players/join/#join)).

### Will a drop of a few seconds throw me off?

No. The launcher reconnects by itself, and if the connection is back within 30 seconds, the game carries on ([A bad connection and VPNs](/players/connection/)).

### Does the server check my files? What about my mods?

Your game files are checked (on a strict server, your user folder too), and your zip mods don't fail the check ([Join a server](/players/join/#what-the-server-checks)).

### How do I go to another server?

You pick another server in the launcher; you can't switch from inside the game ([In the game](/players/in-game/)).

### My message isn't on these pages. What now?

If it isn't on [Error messages](/reference/error-codes/), send it with your `launcher.log` to Discord ([When something breaks](/players/troubleshooting/#what-to-send-when-you-ask-for-help)).

## Hosts

### What does my server need to be listed?

A NodeMP account with Discord linked, a server key, and a port open for TCP and UDP ([Get listed](/hosting/registering/)).

### Do I need a plugin for chat?

No. Chat is built into the server, and plugins add commands to it ([Chat and commands](/plugins/chat/)).

### I pasted the keys from the website and the server isn't listed.

The server log says why, and the table on [Get listed](/hosting/registering/#the-server-isnt-in-the-list) explains each line.

### My Docker server ignores `server.toml`.

That's on purpose: the image takes its settings from environment variables ([Server in Docker](/hosting/docker/)).

### Several players on one VPN can't get in.

The server limits how many joins from one address can be in progress, and the host can raise the limit ([When the server misbehaves](/hosting/troubleshooting/#players-are-refused-at-the-door)).

### How do I lift a ban?

Stop the server and run `Node-Server --bans remove` ([Console, kicks and bans](/hosting/administration/#bans)).

### Do I need Windows for the strict check?

You make the reference manifest on a Windows computer with a clean BeamNG.drive, and a server on any system can use it ([Strict file check](/hosting/strict-verification/)).

### Where are the release notes?

In the description of each server release on GitHub ([Updating the server](/hosting/updating/#where-releases-are)).

## Plugin authors

### What language are plugins written in?

Usually Lua; JavaScript, C and C++ go through modules ([Overview](/plugins/overview/)).

### What are events called?

The name shows the kind of event, for example `playerJoined`, `vehicleSpawnRequest` or `race:start` ([Events](/plugins/events/#kinds-of-events)).

### How do I make a chat command?

Subscribe to `chatMessageRequest` and return `{ handled = true }` ([Chat and commands](/plugins/chat/#commands)).

### What survives a plugin reload?

The storage, the files in the plugin's folder and the other plugins; handlers, timers and the Lua state start over ([How a plugin is built](/plugins/resources/#reloading)).

### Does `node.http` check certificates? Can it reach my LAN?

By default certificates are checked, and private addresses are refused until the host turns on `[http] allow_private_networks` ([HTTP requests](/plugins/http/)).

### Is a plugin's client code written to the player's disk?

No, the mod compiles it in memory ([Client scripts](/plugins/client-scripting/#how-files-reach-the-game)).
