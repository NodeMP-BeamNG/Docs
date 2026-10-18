---
title: Get listed
description: Create a server key in your NodeMP account, put it into the settings, choose how the server looks in the list, and find out why it isn't there.
---

A server without a key works exactly the same, and anyone can join it by address through **Direct
Connect**. But it isn't in the server list, and it doesn't check players' names.

With a key the server introduces itself to NodeMP, shows up in the launcher and on
[nodemp.com/servers](https://nodemp.com/servers), and every player's account is verified on join.

## Create a key

:::caution[Keys made before NodeMP started afresh]
NodeMP moved to a new service and started its accounts and server list from scratch. Accounts and
server keys made before that are gone, and a server with an old key is refused. Sign up again, link
Discord and create a new key. Update the server too: a release from before the move can't be listed
([Updating](/hosting/updating/)).
:::

You need a NodeMP account with a confirmed e-mail and a linked Discord account. Discord is linked
under **Connections** in your account.

1. Sign in at [nodemp.com](https://nodemp.com) and open
   [**My servers**](https://nodemp.com/account/servers).
2. Enter a label you'll recognise the server by, and create the key.
3. The site shows the **Host ID** and the **Host secret**. The secret is shown once: copy it now.

One key is for one server. **My servers** lists all your keys and when each server last checked in.
How many keys an account may have depends on its roles; the page shows how many you have left.

When the site won't create a key, it says why: Discord isn't linked, the e-mail isn't confirmed, the
account has all the keys it may have (delete one you no longer use, or rotate the secret of an
existing key instead), or the request was refused to protect the service. In that last case the site
shows a decision number: ask for help on Discord and quote it.

## Put the key into the settings

`server.toml` already has a `[listing]` table with empty `url`, `host_id` and `host_secret`. Fill
them in:

```toml
[listing]
url = "https://api.nodemp.com"
host_id = "…"
host_secret = "…"
```

:::caution[One `[listing]` table]
The site shows these three lines ready to copy. Set them in the `[listing]` table already in the
file; don't add a second `[listing]`: TOML doesn't allow the same table twice, and the server won't
start.
:::

The same as environment variables, for Docker or systemd. These names didn't change:

```
NODE_DIRECTORY_URL=https://api.nodemp.com
NODE_DIRECTORY_HOST_ID=…
NODE_DIRECTORY_HOST_SECRET=…
```

Restart the server. All three are needed. With `url` empty the server just isn't announced; with
`url` set and a key missing, it starts unlisted and says so in the log. Treat the secret like a
password.

## What happens next

At start the server logs `announcing this server to https://api.nodemp.com`, and once the key is
accepted and the list shows the server, `listed in the server browser`. From then on it reports
regularly, usually every 15 seconds: name, map, players and slots, tags, the list of mods and the
fingerprint of its certificate. If NodeMP can't be reached, the server keeps running and retries on
its own.

NodeMP never connects to your server, so nothing checks the port from outside before players do.
When players get join tickets for your server and none of them reaches it, NodeMP marks the server
**Can't connect** in **My servers**, the launcher marks it in the list, and the server's log says
`Listed in the server browser, but players cannot connect: …` with the port to forward. The mark
goes once a player gets through. So open and forward the port for TCP and UDP, and test it from
outside your own network.

While the server is listed, every join is checked: the player's launcher brings a one-time ticket,
the server checks it with NodeMP and gets the account name. A Test Drive player gets a guest name.
A server without a key checks nothing and takes the name the launcher sends.

## How the server looks in the list

The other `[listing]` keys shape the server's card and who it lets in:

```toml
[listing]
description = "Freeroam on West Coast, no ramming"
mode = "freeroam"
tags = "freeroam, no-crash, eu"
guests = true
```

- `description`: one or two sentences under the name.
- `mode`: one word, its own column in the list: `freeroam`, `racing`, `roleplay`…
- `tags`: up to eight, comma-separated. Players filter the list by them.
- `guests = false` turns away players without an account. The launcher marks such a server
  *Account required*.
- `public = false` keeps the server out of the public list. People who know the address still see
  it online.
- `admit_when_down` decides what happens when NodeMP can't be reached at the moment of a join:
  `false` (the default) refuses the player, `true` lets them in as an unverified guest.

`fingerprint`, `ca_file` and `allow_http` are only for a server list you run yourself. Leave them
out for `api.nodemp.com`.

### Links

In the server's details, under the map, the launcher and
[nodemp.com/servers](https://nodemp.com/servers) show buttons to the server's own pages, each with
its domain written on it. There are five, all in `[listing]`:

```toml
[listing]
discord = "https://discord.gg/abc123"
rules = "https://example.com/rules"
site = "https://example.com"
donate = "https://example.com/donate"
voice = "mumble://voice.example.com:64738"
```

- A link starts with `https://`. `voice` may also be `mumble://` or `ts3server://`; such an address
  is copied rather than opened, because only the voice app can open it.
- `discord` has to be an invite: `https://discord.gg/…` or `https://discord.com/invite/…`.
- At most 256 characters, no spaces, no `user:password@`.
- A link that breaks these rules is left out at start, with a warning that names the key:
  `[listing] discord = "…" is not a link the server list shows: …; left out`. The rest of the
  listing works as usual.

In the environment they are `NODE_DIRECTORY_LINK_DISCORD`, `NODE_DIRECTORY_LINK_RULES`,
`NODE_DIRECTORY_LINK_SITE`, `NODE_DIRECTORY_LINK_DONATE` and `NODE_DIRECTORY_LINK_VOICE`.

### The picture

The server's card shows a picture of the map. It comes from:

1. `preview`, if you set it: a JPEG or PNG of your own, at most 2 MB. A relative path starts in the
   working directory.
2. Otherwise, for a custom map in `content/`, the map's own picture from its zip.
3. For a stock map, NodeMP shows the game's own picture and the server sends nothing.

## The server's fingerprint

Launchers know a server by the fingerprint of its TLS certificate, logged at every start:
`TLS 1.3 enabled — certificate fingerprint (SHA-256): …`. The server sends it to NodeMP with every
report, and a launcher joining from the list accepts only that certificate. It changes only if
`node_cert.pem` and `node_key.pem` are lost or replaced, so keep them in your backups. Players who
joined by address remember the fingerprint and won't connect to a server with a different one.

## Change or delete the key

In **My servers**, **Rotate secret** gives a new secret (also shown once) and the old one stops
working. Put the new `host_secret` in and restart. Do this whenever the secret might have leaked.
**Delete** removes the key: the server keeps running but drops out of the list.

## The server isn't in the list

| In the log | Why | What to do |
|---|---|---|
| `The directory refused this server's credentials: …` | A wrong Host ID or secret, a rotated secret, a deleted key, or a key made before NodeMP started afresh. | Compare with **My servers**. If unsure, rotate the secret and put in the new one. An old key needs a new one. |
| `The directory refused this server: This server is banned from the directory.` | NodeMP's staff banned this server. | Ask on Discord. |
| `This server is NOT announced to a directory: …` | `host_id` or `host_secret` is missing. | Fill in `url`, `host_id` and `host_secret` in `[listing]`. |
| `Could not reach the directory at https://api.nodemp.com: …` | No outgoing HTTPS, a DNS problem, or NodeMP is down. | Try `curl https://api.nodemp.com/healthz` on the server's machine. The server retries on its own. |
| `The directory answered 429 …: Too many requests. Try again later.` or `The directory answered 503 …` | Too many attempts in a short time (a restart loop, say), or NodeMP is busy. The text after the colon is NodeMP's own reason. | Nothing: the server waits as long as NodeMP asks and tries again. |
| `not shown in the server browser: [listing] public is false; …` | `public = false`. | Remove it, or set `public = true`, and restart. |
| `Not shown in the server browser: the directory's staff have hidden it` | NodeMP's staff hid the server from the list. | Ask on Discord. |
| `Not shown in the server browser: another server key already announces this address and port, …` | Two keys announce the same address and port, and only one of them is listed. | One key per server: delete the other key in **My servers**. |
| `Listed in the server browser, but players cannot connect: …` | Players got join tickets, but none of them reached the server. | Forward the port named in the line for TCP and UDP and open it in the firewall. |
| Players are refused with `The server could not verify your account with the directory (…)` | NodeMP couldn't be reached when they joined, or was too busy. | Wait. On a server that allows Test Drive you can turn on `admit_when_down`. |
