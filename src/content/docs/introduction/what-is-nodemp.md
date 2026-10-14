---
title: What is NodeMP
description: NodeMP lets you play BeamNG.drive online with other people. What the parts are, how a join goes and which versions are current.
---

NodeMP lets you drive [BeamNG.drive](https://www.beamng.com/) online with other people: one map,
everybody's cars on it, everybody's crashes. You install one app, pick a server and hold a button.
The rest happens on its own.

## What you install

Only the **launcher**, a small Windows app. It signs you in, shows the list of servers, keeps the
multiplayer mod up to date and starts BeamNG.drive for you when you join.
→ [Install the launcher](/players/install/)

The **client mod** (`NodeMP.zip`) is the part that runs inside the game: other players' cars, the
chat, the name tags, the player list. The launcher installs and updates it, so you never have to
touch it.

## What a server does

A **server** is a program somebody runs on their PC or on a rented machine. It holds the session
together: who is on, which cars exist and where they are. Before you join, it sends you the mods
the session needs (a custom car, a map), and while you play it runs its own rules, called plugins.

Anyone can run one, on Windows, Linux or in Docker. → [Run a server](/hosting/quick-start/)

## Your account

You can play with a free NodeMP account or without one, in Test Drive. With an account you keep
your name from server to server, and a server can tell it is really you.
→ [Your account](/players/sign-in/)

## How a join goes

1. You pick a server in the launcher and hold **Hold to play**.
2. The launcher makes sure the client mod is current and checks the game files the server cares
   about.
3. It downloads the server's mods you don't have yet.
4. BeamNG.drive starts and loads straight into the server's map.

If something stops along the way, the launcher tells you what and why.
→ [Can't join a server](/support/joining/)

## Plugins

Whatever makes one server different from another, such as chat commands, roles, races or an
economy, is a plugin. Plugins live on the server and are written in Lua (or in C when speed
matters); a plugin can also send a script to every player's game.
→ [Plugin development](/plugins/overview/)

Coming from another multiplayer mod? The [differences](/introduction/differences-from-beammp/)
page compares the two.

## Versions

| Part | Version | Where to get it |
|---|---|---|
| Game server (`Node-Server`) | 1.7.0 | [Releases](https://github.com/NodeMP-BeamNG/releases): Linux, Windows and a Docker image |
| Launcher | 1.1.25 | [nodemp.com/download](https://nodemp.com/download) |
| Client mod (`NodeMP.zip`) | 1.7.3 | installed by the launcher |

The client mod is built for BeamNG.drive 0.39.4.0. The launcher, the mod and the server talk
protocol v23. When one side is too old the launcher says which, and when it is the launcher itself,
it offers to update.
