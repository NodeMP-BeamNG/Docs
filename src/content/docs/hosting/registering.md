---
title: Get listed
description: Create a server key in your NodeMP account, give it to the server, choose how the server looks in the list - name, description, tags, picture - and fix what stops it from showing up.
---

A **server key** puts your server into the launcher's list. Without one the server runs exactly the
same and anyone with the address can join through Direct Connect, but it isn't listed and nobody's
name is checked. With one, the server introduces itself to NodeMP, shows up in the launcher and on
[nodemp.com/servers](https://nodemp.com/servers), and every player's account is verified when they
join.

## Create a server key

You need a NodeMP account with a confirmed e-mail and a linked Discord account (link it under
**Connections** in your account; it's used for nothing else).

1. Sign in at [nodemp.com](https://nodemp.com) and open **My servers**
   ([nodemp.com/account/servers](https://nodemp.com/account/servers)).
2. Enter a label you'll recognise (`EU Freeroam #1`) and create the key.
3. The site shows the **Host ID** and the **Host secret**. The secret is shown only once; copy it
   now. The site also offers both ready to paste, as `server.toml` lines or as environment
   variables.

Each key is for one server. **My servers** lists your keys with their status and when each server
last checked in.

## Put the key into the server

`server.toml` already has a `[Directory]` table: the server wrote it on its first start, with empty
values. Fill in these three keys **in that table**:

```toml
[Directory]
Url = "https://api.nodemp.com"
HostId = "…"
HostSecret = "…"
```

Don't paste a second `[Directory]` table under the first one. TOML doesn't allow it, and the server
then stops at start with
`the table [Directory] appears twice. Put the keys into the existing [Directory] table -- the server wrote one with every key in it on the first start -- and remove the second [Directory] line together with the keys under it. …`
followed by `Closing in 10 seconds`.

The same as environment variables, for Docker or a systemd unit (they win over the file):

```
NODE_DIRECTORY_URL=https://api.nodemp.com
NODE_DIRECTORY_HOST_ID=…
NODE_DIRECTORY_HOST_SECRET=…
```

Restart the server. All three are needed; with one missing, the server starts unlisted and says so.
Treat the secret like a password: on a machine where `server.toml` gets copied around, the
environment is the better place for it.

## What happens next

At start the server logs `announcing this server to https://api.nodemp.com`, and once NodeMP
accepted the key, `listed in the server browser`. From then on it reports in every 15 seconds:
name, map, players, slots, tags, the mods it sends and their size. If NodeMP can't be reached, the
server tries again after 5, 15, 30 and 60 seconds, then every 2 minutes, and keeps running
meanwhile.

NodeMP also checks from outside that it can reach your server on its port. A server it can't reach
isn't shown, even though `listed in the server browser` appeared in the log. So behind a router,
forward the port, and check from outside your network: the server should appear in the launcher's
list within about 15 seconds of the port opening. A test from your own network proves nothing about
the router.

While the server is listed, every join brings a one-time ticket from the player's launcher, and the
server checks it with NodeMP: a signed-in player gets their account name, a Test Drive player a
guest name. A server without a key skips this and takes names as the launcher sends them.

## How the server looks in the list

Everything else in `[Directory]` shapes the entry and who may join:

```toml
[Directory]
Description = "Freeroam on West Coast, no crashing into others"
Mode = "freeroam"
Tags = "freeroam, no-crash, eu"
Preview = "listing.jpg"
Public = true
TestDrive = true
```

- `Description`: one or two sentences under the name.
- `Mode`: one word, shown as a column: `freeroam`, `racing`, `roleplay`, …
- `Tags`: up to eight, comma-separated; players can filter by them.
- `Preview`: the picture in the list (see below).
- `Public`: `false` keeps the server out of the public list. People who know the address still see
  it online; handy for a private group.
- `TestDrive`: `false` turns away players without an account. The launcher shows such a server as
  *Account required*, and a guest who tries anyway gets
  `This server requires a NodeMP account: sign in to the launcher and join again`.
- `RedeemFailOpen`: what to do while NodeMP can't be reached to check a ticket. `false` (default)
  refuses the join; `true` lets the player in as an unverified guest under the name they asked for.
- `Fingerprint`, `CaFile` and `AllowInsecure` are for a directory you run yourself. Leave them empty
  and off for `api.nodemp.com`.

Change any of them and restart; the next report carries the new values.

### The picture

The server's card in the launcher shows a picture of the map. Where it comes from:

1. `Preview`, if you set it: a JPEG or PNG of your own, at most 2 MB. NodeMP crops it to 16:9 and
   shrinks it to at most 960 by 540. A relative path starts in the working directory.
2. Otherwise, for a custom map in `content/`, the map's own picture from its zip.
3. For a stock map, NodeMP shows the game's own picture; the server sends nothing.

The log names the picture and where it came from (`map preview for the server list: …`), and says
when it was sent (`map preview sent to the directory (…)`). A file that is too big or isn't a JPEG
or PNG gets a warning that says so, and a picture NodeMP refused isn't sent again until you change
it.

## Your server's fingerprint

Launchers know your server by the fingerprint of its TLS certificate, logged at every start as
`TLS 1.3 enabled — certificate fingerprint (SHA-256): …`. Listed servers pass it to players through
NodeMP; players who join by address remember it on their first visit. It only changes if
`node_cert.pem` and `node_key.pem` are lost or replaced, so back them up
([What to back up](/hosting/running/#what-to-back-up)). The `Fingerprint` setting in `[Directory]`
is about NodeMP's certificate, not yours.

## Change or delete a key

In **My servers**, **Rotate secret** gives a new secret (shown once) and the old one stops working:
update `HostSecret` and restart. Do it whenever the secret might have leaked. **Delete** removes the
key; a server still using it logs
`The directory refused this server's credentials: check [Directory] HostId and HostSecret, and that the host still exists in your account`,
keeps running and is no longer listed.

## Troubleshooting

| What you see | Why | What to do |
|---|---|---|
| `announcing this server to …`, then `The directory refused this server's credentials: …` | Wrong Host ID or secret, a rotated secret, or a deleted key. | Compare with the key in **My servers**; rotate it if unsure and paste the new secret. |
| `This server is NOT announced to a directory: [Directory] needs Url, HostId and HostSecret, and one of them is empty` | One of the three is missing or misspelt. | Fill in all three. The variables are `NODE_DIRECTORY_URL`, `NODE_DIRECTORY_HOST_ID` and `NODE_DIRECTORY_HOST_SECRET`. |
| `Refusing to announce this server: the [Directory] Url is plain http…` | `Url` starts with `http://`. | Use `https://api.nodemp.com`. |
| `Could not reach the directory at https://api.nodemp.com: …` | No outgoing HTTPS, a DNS problem, or NodeMP is down. | Try `curl https://api.nodemp.com/healthz` on the server's machine. The server keeps retrying on its own. |
| `This machine has no trusted root certificates to verify the directory against …` | A Windows machine with an empty certificate store and no `cacert.pem` next to `Node-Server.exe`. | Put `cacert.pem` from the release archive back next to the executable. |
| `[Directory] CaFile '…' could not be loaded (…): …` | `CaFile` names a file that doesn't exist or isn't a certificate bundle. | Leave `CaFile` empty for `api.nodemp.com`. |
| `listed in the server browser`, but the server isn't in the launcher's list | NodeMP can't reach your port from outside, or `Public = false`. | Open and forward the port (TCP for the check, UDP too for playing). The list updates within about 15 seconds. |
| `Could not reach the directory to stay listed: …` or `The directory answered 503 to a beacon: …` | A report didn't get through. | Nothing to do; the server retries, and players already on stay on. |
| Players are refused with `The server could not verify your account with the directory (…)` | NodeMP couldn't be reached at the moment they joined. | Wait; or set `RedeemFailOpen = true` on a server that allows Test Drive. |
