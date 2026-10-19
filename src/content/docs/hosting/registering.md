---
title: Get listed
description: How to create a server key in your NodeMP account, put it into the settings, set how the server looks in the list and find out why it isn't there.
---

A server without a key works the same, and you can join it by address through **Direct Connect**. But it isn't in the server list, and it doesn't check players' names.

With a key the server reports itself to NodeMP, appears in the launcher and on [nodemp.com/servers](https://nodemp.com/servers), and every player's account is checked on join.

## Create a key

You need a NodeMP account with a linked Discord. Link Discord under **Connections** in your account, or with the **Link Discord** button on the **My servers** page.

1. Sign in at [nodemp.com](https://nodemp.com) and open [**My servers**](https://nodemp.com/account/servers).
2. Enter a label that tells this server from your others (only you see it) and click **Create key**.
3. In the *Server key created* window the site shows the **Host ID** and the **Host secret**. The secret is shown once, so copy it right away.

Each server needs a key of its own. **My servers** shows all your keys and when each server was last online. How many keys you can create depends on your account's roles. How many you have used is shown next to the creation form.

If the site doesn't create a key, it says why: Discord isn't linked, the account already has all the keys it may have (delete one you don't need or rotate the secret of an existing key), or the request was refused to protect the service. In the last case the site shows a decision number, which you quote to support.

## Put the key into the settings

`server.toml` already has a `[listing]` table with empty `url`, `host_id` and `host_secret`. Fill them in:

```toml
[listing]
url = "https://api.nodemp.com"
host_id = "…"
host_secret = "…"
```

:::caution[One `[listing]` table]
The site shows these lines ready to copy. Put them into the `[listing]` table that is already in the file, and don't add a second one: TOML doesn't allow the same table twice, and the server won't start.
:::

You can set the same with environment variables, for Docker or systemd:

```text
NODE_DIRECTORY_URL=https://api.nodemp.com
NODE_DIRECTORY_HOST_ID=…
NODE_DIRECTORY_HOST_SECRET=…
```

Restart the server. It needs all of them. If all of them are empty, the server doesn't report itself and says nothing about it, and if only some are empty, it says so in the log. Keep the secret like a password.

## What happens next

At start the server writes `announcing this server to https://api.nodemp.com` to the log, and once the key is accepted and the list shows the server, `listed in the server browser`. After that it reports regularly, usually every 15 seconds: its name, map, number of players and slots, tags, list of mods and the fingerprint of its certificate. If NodeMP is unreachable, the server keeps running and retries by itself.

NodeMP never connects to the server, so nobody checks the port from outside until players arrive. If players get join tickets for your server and none of them reaches it, NodeMP marks the server *Can't connect* on the **My servers** page, the launcher marks it in the list, and the server's log has `Listed in the server browser, but players cannot connect: …` with the port you need to forward. The mark goes away as soon as a player reaches the server. So open and forward the port for TCP and UDP, and test it from outside your own network.

While the server is listed, every join is checked: the player's launcher brings a one-time ticket, the server checks it with NodeMP and gets the account name. A player in Test Drive gets a guest name. A server without a key checks nothing and takes the name the launcher sent.

## How the server looks in the list

The other `[listing]` keys set the server's card and whom it lets in ([settings reference](/hosting/configuration/#listing)):

```toml
[listing]
description = "Freeroam on West Coast, no ramming"
mode = "freeroam"
tags = "freeroam, no-crash, ru"
guests = true
```

- `tags` takes up to eight tags, each up to 24 characters. Players filter the list by them.
- With `guests = false` the server doesn't let in players without an account, and its card shows *Account required* in the **Access** row.
- With `public = false` the server isn't in the public list, but you can still join it by address.

### Links

In the server's details, under the map, the launcher and [nodemp.com/servers](https://nodemp.com/servers) show buttons to the server's own pages, each labeled with its domain. The `[listing]` keys set the links:

```toml
[listing]
discord = "https://discord.gg/abc123"
rules = "https://example.com/rules"
site = "https://example.com"
donate = "https://example.com/donate"
voice = "mumble://voice.example.com:64738"
```

- A link starts with `https://`. `voice` can also be `mumble://` or `ts3server://`: such an address is copied rather than opened, because only a voice chat program can open it.
- `discord` must be an invite: `https://discord.gg/…` or `https://discord.com/invite/…`.
- A link is at most 256 characters long, with no spaces and no `user:password@`.
- A link that breaks these rules isn't passed to the list at start, and the server warns, naming the key: `[listing] discord = "…" is not a link the server list shows: …; left out`.

### The picture

The server's card shows a picture of the map. It comes from:

1. `preview`, if it is set: your own JPEG or PNG of up to 2 MB. A relative path starts at the working directory. If the file can't be read, is too big or isn't an image, the server warns in the log: `No map preview is sent to the directory: …`.
2. Otherwise, for your own map from `content/`, the map's own picture from its archive.
3. For a stock map NodeMP shows the picture from the game, and the server sends nothing.

## The server's fingerprint

Launchers know a server by the fingerprint of its TLS certificate. It's written to the log at every start: `TLS 1.3 enabled — certificate fingerprint (SHA-256): …`. The server passes it to NodeMP in every report, and a launcher joining from the list accepts only that certificate. The fingerprint changes only if you lose or replace `node_cert.pem` and `node_key.pem`, so keep them in a backup. Players who joined by address remember the fingerprint and won't connect to a server with another one.

## Change or delete the key

On the **My servers** page, the **Rotate secret** button gives a new secret (also shown once), and the old one stops working. Put the new `host_secret` in and restart the server. Do this if the secret may have leaked. The **Delete** button deletes the key: the server keeps running but disappears from the list.

## The server isn't in the list

| In the log | Why | What to do |
|---|---|---|
| `The directory refused this server's credentials: …` | The Host ID or secret is wrong, the secret was rotated or the key was deleted. | Compare the key with the **My servers** page. If in doubt, rotate the secret and put in the new one. |
| `The directory refused this server: This server is banned from the directory.` | NodeMP's moderators blocked this server. | Ask the moderators on Discord. |
| `This server is NOT announced to a directory: …` | `url`, `host_id` or `host_secret` is missing. | Fill in all of them in `[listing]`. |
| `Refusing to announce this server: the [listing] url is plain http, …` | `url` has `http://`, and the secret would go in the clear. | Put in an address with `https://`. |
| `Could not reach the directory at https://api.nodemp.com: …` | There is no outgoing HTTPS, DNS doesn't work or NodeMP is unreachable. | On the server's machine, run `curl https://api.nodemp.com/healthz`. The server retries by itself. |
| `The directory answered 429 …` or `The directory answered 503 …` | Too many attempts in a short time (for example, the server restarts in a loop) or NodeMP is busy. NodeMP writes the reason after the colon. | Nothing: the server waits as long as NodeMP asks and tries again. |
| `not shown in the server browser: [listing] public is false; …` | `public = false` is set. | Remove it or set `public = true`, and restart the server. |
| `Not shown in the server browser: the directory's staff have hidden it` | NodeMP's moderators hid the server from the list. | Ask the moderators on Discord. |
| `Not shown in the server browser: it is banned from the directory` | The server is blocked in the directory. | Ask the moderators on Discord. |
| `Not shown in the server browser: another server key already announces this address and port, …` | Two keys announce the same address and port, and the list shows only one. | Delete the extra key on the **My servers** page. |
| `Listed in the server browser, but players cannot connect: …` | Players got join tickets, but none of them reached the server. | Forward the port from this line for TCP and UDP and open it in the firewall. |
| Players are refused with `The server could not verify your account with the directory (…)` | NodeMP was unreachable or overloaded when they joined. | Wait. On a server with Test Drive you can turn on `admit_when_down`. |
