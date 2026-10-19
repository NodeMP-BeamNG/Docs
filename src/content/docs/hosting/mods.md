---
title: Mods and maps
description: How to add your own map, a car or another BeamNG mod to the server, how players get them and how to keep a mod from being sent.
---

Mods are ordinary BeamNG zip archives: a map, a car, a sound pack. The server hands them to players, and the launcher downloads them before the game starts. Players don't install mods by hand.

## Add a mod

1. Put the mod's zip into the `content/` folder next to `server.toml`. In Docker that's `data/content/`.
2. Restart the server. It reads the folder only at start.

The log then has a line such as `serving 2 mods (148.3 MB) from content/`. If a file isn't a zip, the server skips it and writes `'…' is not a ZIP file and will be ignored`.

After replacing or deleting a zip, restart the server too.

## A map of your own

Put the map's zip into `content/` and set the map in `[server] map`:

```toml
[server]
map = "/levels/my_map/info.json"
```

Here `my_map` is the name of the map's folder inside the archive, under `levels/`. To find it, open the archive and look at which folder is in `levels/`.

If the map has a picture of its own, the server shows it in the server list ([The picture](/hosting/registering/#the-picture)).

## How players get mods

Before joining, the launcher downloads from the server the archives the player doesn't have yet and keeps them in a cache ([Join a server](/players/join/#look-at-a-server)). Every new player waits for every megabyte to download, and the **Download size** filter in the list hides heavy servers, so remove the mods you don't need.

## A mod that isn't sent

Some mods may not be redistributed, and players have to download them themselves. Open `content/mods.json` (the server writes it) and set `"protected": true` for such an archive:

```json
"big-map.zip": { "protected": true }
```

The entry has other fields too; leave them alone and change only `protected`. The server then no longer sends that file. The launcher of a player who doesn't have the mod explains which cache folder to put it in. The mark stays even if you replace the archive.

## Plugins' client scripts

Plugins can also send Lua scripts to players, but that is a different mechanism: the scripts arrive on join, and you don't put them in `content/` ([Plugins on the server](/hosting/resources/)).

The two mechanisms work together too: a plugin's scripts can switch on Lua from a mod in `content/`. The mod then needs no start script of its own (`scripts/…/modScript.lua`): the plugin loads its Lua and switches it off when the player leaves. How to do it: [Client scripts](/plugins/client-scripting/).
