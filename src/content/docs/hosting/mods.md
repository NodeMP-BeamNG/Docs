---
title: Mods and maps
description: How to add a map, a car or any other BeamNG mod to the server, how players get them, and how to keep a mod from being sent.
---

Mods are ordinary BeamNG zips: a map, a car, a sound pack. The server hands them to players, and the
launcher downloads them before the game starts. Players install nothing by hand.

## Add a mod

1. Put the mod's zip into the `content/` folder next to `server.toml`. In Docker that's
   `data/content/`.
2. Restart the server. It reads the folder only when it starts.

The log then has a line such as `serving 2 mods (148.3 MB) from content/`. A file that isn't a zip
is skipped with `'…' is not a ZIP file and will be ignored`.

After replacing or removing a zip, restart the server too.

## A map of your own

Put the map's zip into `content/` and name the map in `[server] map`:

```toml
[server]
map = "/levels/my_map/info.json"
```

`my_map` is the map's folder inside the zip, under `levels/`. To find it, open the zip and look at
the folder in `levels/`.

If the map has a picture of its own, the server shows it in the server list
([Get listed](/hosting/registering/#the-picture)).

## How players get mods

Before a join, the launcher downloads the zips the player doesn't have yet and keeps them in its
cache. The next visit downloads nothing. The server's card shows the files and their total size,
and players can filter servers by download size. So keep the folder lean: every new player waits
for every megabyte.

## A mod that isn't sent

Sometimes a mod may not be passed around and players have to get it themselves. Open
`content/mods.json` (the server writes it) and set `"protected": true` on that zip:

```json
"big-map.zip": { "protected": true }
```

The entry has other fields too; leave them and change only `protected`. The server then never sends
that file. A player who doesn't have the mod is told by the launcher which cache folder to put it
in. The mark survives replacing the zip.

## Client scripts aren't mods

Resources can send Lua scripts to players as well, but that's a different mechanism: the scripts
arrive on join and don't go into `content/`. See [Resources](/hosting/resources/).

The two can work together. Since client mod 1.7.6 a resource's scripts can switch on Lua from a mod
in `content/`. The mod then needs no start-up script (`scripts/…/modScript.lua`) of its own: its
Lua runs when the resource loads it and is switched off when the player leaves.
[Client scripts](/plugins/client-scripting/#mods-from-the-content-folder) shows how.
