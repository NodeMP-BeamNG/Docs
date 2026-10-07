---
title: Join a server
description: Browse servers in the launcher or on the website, connect by direct address, and get into the game.
---

In NodeMP, servers are selected directly inside the launcher rather than through BeamNG.drive's main menu. Here is how to find a server, inspect its details beforehand, and join the game. Before starting, make sure the launcher is [installed](/players/install/) and you have [signed in or chosen Test Drive](/players/sign-in/).

## Find a server

When opened, the launcher displays the **Home** tab: if you have played previously, it lets you rejoin your last server or click **Browse servers**. The full directory is located under **Servers** (the ▶ icon on the left rail) — listing only servers that are currently online and reachable.

The directory offers three convenient tabs:
- **Public** — the full list of available public servers;
- **Favorites** — your starred servers;
- **Recent** — the last 30 servers you connected to.

Each row displays the server name, map, host country with flag, player count (`online / slots`), and game mode. Clicking any column header sorts the list; clicking again reverses the order.

Quickly find what you want using:
- **Search** (press `/`) — filters by name, tags, map, country, and host description;
- **Quick filters** — hide full, empty, or account-restricted servers (*Free slots*, *Players online*, *No account needed*);
- **Download size** — filters by mod download volume (from *Stock only* to *Any size*);
- **Map & Country** — select one or more regions, or pick *My country*.

Click **Refresh** to reload the live server list.

:::note[Server country detection]
The country and city are detected automatically from the server's IP address using the DB-IP database. See the tooltip beside the ⓘ icon on the *Country* column header for details.
:::

## Look at a server

Click any row to open the server card on the right:

- map screenshot and name;
- host links: Discord, server rules, website, donate link, and voice chat address (the voice chat address is automatically copied to your clipboard);
- description, tags, and key details: active players, access (*Test Drive allowed* or *Account required*), game mode, and location;
- list of players currently on the server;
- **It will send you** — mod files the server will download before you join.

Server content is downloaded automatically and stored separately from your personal mods. A *Stock content* badge means the server runs original BeamNG.drive vehicles and maps without extra mods.

The server list is also accessible on the web at [nodemp.com/servers](https://nodemp.com/servers). Clicking **Connect** on any web card opens the launcher straight to that server (requires an up-to-date launcher).

## Join by address

If a host gave you a direct address, click **Direct Connect** above the list and enter `host:port` (or `[IPv6]:port`), such as `203.0.113.10:30814`.

- If the server is public, the launcher locates it in the directory and begins a normal join.
- If the server is unlisted or runs without a directory key, the launcher connects directly.

On your first connection, the launcher remembers the server's security certificate. If the certificate changes on a future visit, the launcher warns you to prevent impersonation. If this happens, verify with the host whether their server was updated.

:::caution[Servers without a key]
Servers running without an official directory key do not verify accounts with the directory — they accept player names directly from the launcher.
:::

## Join

Select a server and **press and hold the *Hold to play* button** at the bottom of the card for about half a second, then release. This hold timer prevents accidental joins. If you prefer instant joins, disable the hold in **Settings → Launcher → Hold to play**. You can also hold Enter or Space on your keyboard, or the A button on a gamepad.

While connecting, the button displays current progress with a **Cancel** option:

1. **Launcher update** — if automatic checks are on and a new version is ready, the launcher updates quickly and resumes joining.
2. **Client mod** — verifies and downloads the latest `NodeMP.zip` if needed.
3. **Starting BeamNG.drive** — launches the game in your chosen graphics mode and fetches a one-time join ticket (using your account or a temporary Test Drive name).
4. **Checking game files** — on strict servers, the launcher verifies your game files against the server's reference manifest.
5. The launcher hides itself and brings BeamNG.drive to the foreground.

During the BeamNG.drive loading screen, you will see a progress bar for server mod downloads — and moments later you spawn into the world.

If a connection attempt fails, the launcher displays a clear explanation of what went wrong. For troubleshooting common join errors, see [Can't join a server](/support/joining/). All past alerts are saved in the notification centre (the bell icon on the left rail).

## What the server checks on your PC

Before admitting players, each server verifies game client integrity. This check runs locally on your PC inside the launcher; only the final verification status is sent to the server:

| Level | What is checked | When the server refuses connection |
|---|---|---|
| Normal (default) | Compares BeamNG system files against the game's manifest (file sizes and scripts). Your user folder and local mods are not checked. | If core game files were edited, replaced, or deleted. Verifying game files in Steam usually resolves this. |
| Strict (`strict`) | Checks the entire game folder, game archive contents, **and your BeamNG user folder** against the host's clean reference manifest. | If unexpected files are detected: unpacked mods in `vehicles\`, `levels\`, or `lua\` inside your user folder, extra files in the game folder, or an outdated game build. |

**What about my local mods?** Standard zip archives in your user folder's `mods\` directory do not break verification: they are automatically disabled for the multiplayer session (unless you enabled local mods in settings and the server explicitly permits them). Strict servers only reject loose files stored outside `mods\`. For tips on cleaning up your folder, check [Strict servers](/support/strict-servers/).

## In the game

The top-left corner features the **session panel**: server name, ping, and active player count. Clicking the player count reveals the roster, allowing you to spectate any player.

Essential shortcuts:
- `T` — open in-game chat (Enter sends message, Esc closes);
- `Tab` — show or hide the player roster;
- Additional multiplayer settings are in the pause menu under **Options → NodeMP** (see [Settings and controls](/players/settings/)).

## Leave

To disconnect from a server, hold **Leave** in the session panel — BeamNG.drive will return to the main menu. The launcher window reappears as soon as you close the game. If the server ends the session remotely, the launcher comes back immediately with a notification stating why.

You cannot switch directly between servers while in-game: close BeamNG.drive and pick your next server in the launcher.
