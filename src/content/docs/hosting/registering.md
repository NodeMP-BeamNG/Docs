---
title: Get listed
description: Create a server key in your NodeMP account, put it into the settings, choose how the server looks in the list, and find out why it isn't there.
---

A server without a key works exactly the same, and anyone can join it by address through **Direct
Connect**. But it isn't in the server list, and it doesn't check players' names.

With a key the server introduces itself to NodeMP, shows up in the launcher and on
[nodemp.com/servers](https://nodemp.com/servers), and every player's account is verified on join.

## Create a key

You need a NodeMP account with a confirmed e-mail and a linked Discord account. Discord is linked
under **Connections** in your account and isn't used for anything else.

1. Sign in at [nodemp.com](https://nodemp.com) and open
   [**My servers**](https://nodemp.com/account/servers).
2. Enter a label you'll recognise the server by, and create the key.
3. The site shows the **Host ID** and the **Host secret**. The secret is shown once: copy it now.

One key is for one server. **My servers** lists all your keys and when each server last checked in.

## Put the key into the settings

`server.toml` already has a `[Directory]` table with empty values. Fill in three keys there:

```toml
[Directory]
Url = "https://api.nodemp.com"
HostId = "…"
HostSecret = "…"
```

:::caution[Don't add a second table]
TOML doesn't allow the same table twice. If you paste another `[Directory]` under the existing one,
the server won't start. Fill in the one already in the file.
:::

The same as environment variables, for Docker or systemd:

```
NODE_DIRECTORY_URL=https://api.nodemp.com
NODE_DIRECTORY_HOST_ID=…
NODE_DIRECTORY_HOST_SECRET=…
```

Restart the server. All three are needed: with one missing, the server starts unlisted and says so
in the log. Treat the secret like a password.

## What happens next

At start the server logs `announcing this server to https://api.nodemp.com`, and once the key is
accepted, `listed in the server browser`. From then on it reports regularly, usually every 15
seconds: name, map, players and slots, tags and the list of mods. If NodeMP can't be reached, the server keeps running
and retries on its own.

NodeMP also checks from outside that it can reach the server on its port. A server it can't reach
isn't shown, even with `listed in the server browser` in the log. So the port has to be open and
forwarded, and you have to test it from outside your own network.

While the server is listed, every join is checked: the player's launcher brings a one-time ticket,
the server checks it with NodeMP and gets the account name. A Test Drive player gets a guest name.
A server without a key checks nothing and takes the name the launcher sends.

## How the server looks in the list

The other `[Directory]` keys shape the server's card and who it lets in:

```toml
[Directory]
Description = "Freeroam on West Coast, no ramming"
Mode = "freeroam"
Tags = "freeroam, no-crash, eu"
TestDrive = true
```

- `Description`: one or two sentences under the name.
- `Mode`: one word, its own column in the list: `freeroam`, `racing`, `roleplay`…
- `Tags`: up to eight, comma-separated. Players filter the list by them.
- `TestDrive = false` turns away players without an account. The launcher marks such a server
  *Account required*.
- `Public = false` keeps the server out of the public list. People who know the address still see
  it online.
- `RedeemFailOpen` decides what happens when NodeMP can't be reached at the moment of a join:
  `false` (the default) refuses the player, `true` lets them in as an unverified guest.

`Fingerprint`, `CaFile` and `AllowInsecure` are only for a server list you run yourself. Leave
them empty and off for `api.nodemp.com`.

### The picture

The server's card shows a picture of the map. It comes from:

1. `Preview`, if you set it: a JPEG or PNG of your own, at most 2 MB. A relative path starts in the
   working directory.
2. Otherwise, for a custom map in `content/`, the map's own picture from its zip.
3. For a stock map, NodeMP shows the game's own picture and the server sends nothing.

## The server's fingerprint

Launchers know a server by the fingerprint of its TLS certificate, logged at every start:
`TLS 1.3 enabled — certificate fingerprint (SHA-256): …`. It changes only if `node_cert.pem` and
`node_key.pem` are lost or replaced, so keep them in your backups. Players who joined by address
remember the fingerprint and won't connect to a server with a different one.

## Change or delete the key

In **My servers**, **Rotate secret** gives a new secret (also shown once) and the old one stops
working. Put the new `HostSecret` in and restart. Do this whenever the secret might have leaked.
**Delete** removes the key: the server keeps running but drops out of the list.

## The server isn't in the list

| In the log | Why | What to do |
|---|---|---|
| `The directory refused this server's credentials: …` | A wrong Host ID or secret, a rotated secret or a deleted key. | Compare with **My servers**. If unsure, rotate the secret and put in the new one. |
| `This server is NOT announced to a directory: …` | One of the three values is missing or misspelt. | Fill in `Url`, `HostId` and `HostSecret`. |
| `Could not reach the directory at https://api.nodemp.com: …` | No outgoing HTTPS, a DNS problem, or NodeMP is down. | Try `curl https://api.nodemp.com/healthz` on the server's machine. The server retries on its own. |
| `listed in the server browser`, but the server isn't in the launcher | NodeMP can't reach the port from outside, or `Public = false`. | Open and forward the port. The list updates within about 15 seconds. |
| Players are refused with `The server could not verify your account with the directory (…)` | NodeMP couldn't be reached when they joined. | Wait. On a server that allows Test Drive you can turn on `RedeemFailOpen`. |
