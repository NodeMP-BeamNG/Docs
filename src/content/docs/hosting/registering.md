---
title: Registering your server
description: Create a server key at nodemp.com, give it to the server as [Directory] keys or NODE_DIRECTORY_* variables, and see what the directory does with it.
---

A server key is what puts your server into the launcher's list. Without one the server runs
exactly the same and anyone with the address can join through Direct Connect, but it is not
listed and nobody's name is verified. With one, the server announces itself to the
**directory** at `https://api.nodemp.com`, the directory shows it to players, and every join
ticket is checked against the player's account.

## Create a server key

You need a NodeMP account with a **verified e-mail address** and a **linked Discord account**.
Registration at [nodemp.com/register](https://nodemp.com/register) asks for a username, an e-mail
and a password and sends a verification link; signing in before the link is opened answers
`please verify your e-mail first`. Discord is not asked for at registration - it is linked on the
`/hosts` page, and only an account with a linked Discord account can create a key (the link is
used for nothing else). A host without Discord cannot list a server; the server still runs and is
reachable through Direct Connect.

1. Sign in at [nodemp.com](https://nodemp.com) and open [nodemp.com/hosts](https://nodemp.com/hosts)
   (**Server keys**).
2. If the page shows **Link Discord to create server keys**, press **Link Discord account** and
   authorise; the form to create a key appears once the link is made.
3. Under **Create a server key**, enter a **Label** (up to 64 characters, `EU Freeroam #1`) and
   press **Create key**.
4. The dialog **Server key created** shows the **Host ID** and the **Host secret**. The secret is
   shown once; copy it now. Two tabs offer it ready to paste, **server.toml** and **Environment**
   (next section).

Each key registers one server. The directory allows a small number of keys per account (three
by default). Your keys are listed under **Your servers** with their status (**Online**,
**Offline**, **Banned**), region, address and *last seen* time.

## Put the key into the server

`server.toml` already contains a `[Directory]` table: the server wrote it at its first start,
with every key at its default (empty strings for these three). Fill in the values of the three
keys **in that existing table**:

```toml
Url        = "https://api.nodemp.com"
HostId     = "…"
HostSecret = "…"
```

Do not paste a second `[Directory]` header below the first one. TOML rejects a table that is
defined twice, and the server then exits at start with
`Error parsing config file value: server.toml, line …: the table [Directory] appears twice. Put the keys into the existing [Directory] table -- the server wrote one with every key in it on the first start -- and remove the second [Directory] line together with the keys under it. The file has not been changed; fix it and start the server again.`
and `Closing in 10 seconds` (before 1.2.1 the line quoted the parser instead:
`toml::insert_value: table ("Directory") already exists`). The site's **server.toml** tab shows
the three key lines for exactly this reason, and the generated file's own header comment says the
same. The comment above `Url` names the directory, `https://api.nodemp.com` (a file written by
1.2.0 or older carries a wrong example address there until the next start rewrites it).

The same as variables, for the Docker image or a systemd unit; they override the same keys in
`server.toml`:

```
NODE_DIRECTORY_URL=https://api.nodemp.com
NODE_DIRECTORY_HOST_ID=…
NODE_DIRECTORY_HOST_SECRET=…
```

Restart the server. All three values are needed; if one is empty the server starts unlisted and
warns. Treat the secret like a password: the environment is the better place for it on a machine
where `server.toml` gets copied or pasted into support threads.

## What the server does with it

At start the server opens a **session** with the directory (`POST /v1/hosts/session`, carrying
the key) and logs `announcing this server to https://api.nodemp.com`. It then sends a **beacon**
every 15 seconds — the interval is set by the directory and clamped to 5–300 seconds — with the
server name, description, mode, tags, port, map, player count and capacity, up to 100 player
names, the `Public` and `TestDrive` flags, the names and total size of the zips in `content/`,
and the server version. The first accepted beacon logs `listed in the server browser`. When
beacons stop, the listing lapses 45 seconds later; when the directory cannot be reached, the
server retries after 5, 15, 30, 60 and then every 120 seconds.

The directory also **probes** the server: it connects to the address the beacon came from, on
the port the beacon reported, and completes a TLS handshake. The probe runs with the first
beacon, is repeated with every beacon while it fails, and every two minutes once it has
succeeded. A server whose probe fails is kept out of the public list even though the beacon was
accepted, and the certificate fingerprint the probe sees is what launchers are told to expect. Your server's address in the list is therefore the public address of the
machine that sends the beacons, plus `[General] Port`; behind a router, forward that port to the
machine. The server's log does not show the probe's result: `listed in the server browser` means
the beacon was accepted, not that the probe got through. Whether it did you see in two places -
the server appears in the launcher's list and at [nodemp.com/servers](https://nodemp.com/servers)
within about 15 seconds of the port opening, and a TCP connection to `your public address:30814`
from outside your network succeeds (`Test-NetConnection 203.0.113.10 -Port 30814` from a PC on
another connection, or any online port checker). **Online** under **Your servers** on `/hosts`
only says that a beacon arrived, and a connection from your own LAN proves nothing about the
router.

While the session is up, every join carries a ticket from the launcher, which the server
redeems with the directory: the account's username replaces the name the launcher asked for, or
a guest name is minted for a Test Drive player. Servers without a key skip this and take names as
given.

## Listing options

Everything else in `[Directory]` shapes the entry and the door policy:

```toml
[Directory]
Description = "Freeroam on West Coast, no crashing into others"
Mode        = "freeroam"
Tags        = "freeroam, no-crash, eu"
Public      = true
TestDrive   = true
```

- `Description` — one or two sentences under the name (cut at 500 characters).
- `Mode` — one word shown as a column: `freeroam`, `racing`, `roleplay`, …
- `Tags` — up to eight comma-separated tags, each up to 24 characters; players filter by them.
- `Public` — `false` keeps the server out of the list while still announcing it, so people who
  know the address see it as online. A private server for a group.
- `TestDrive` — `false` refuses players without an account. The launcher shows such a server as
  *Account required*, and a guest who tries gets
  `This server requires a NodeMP account: sign in to the launcher and join again`.
- `RedeemFailOpen` — `true` lets players in as unverified guests while the directory is
  unreachable, instead of refusing them with
  `The server could not verify your account with the directory (…). Try again in a moment`.
  Only effective together with `TestDrive = true`; the reasoning is in the
  [framework overview](/framework/overview/).
- `Fingerprint`, `CaFile` and `AllowInsecure` are for a directory you run yourself (a pinned
  certificate, a private CA's bundle, a plain-`http://` address). Leave all three at their
  defaults for `api.nodemp.com`: its certificate is verified against the machine's trusted roots
  - on Windows the Windows certificate store plus the `cacert.pem` from the archive, see
  [below](#windows-the-directorys-certificate). `CaFile` names a PEM bundle to verify against
  *instead of* those roots; a relative path resolves from the working directory.

Change any of them and restart; the next beacon carries the new values.

## Windows: the directory's certificate

The directory's certificate is an ordinary public one. On Windows the server verifies it against
the **Windows certificate store** (the `ROOT` store) and, as a fallback for a machine whose own
store is thin - a fresh Server Core, a stripped image - against **`cacert.pem`**, Mozilla's bundle
of public roots that the Windows archive ships next to `Node-Server.exe` together with its
`cacert.LICENSE` (MPL 2.0). Keep the file where it is when you move the executable; nothing needs
configuring. OpenSSL's `SSL_CERT_FILE` / `SSL_CERT_DIR` variables are honoured as well. A machine
with neither a usable store nor the file gets one clear line at start,
`This machine has no trusted root certificates to verify the directory against (the Windows certificate store is empty and there is no cacert.pem next to Node-Server.exe): put Mozilla's cacert.pem (https://curl.se/ca/cacert.pem) next to the executable, or name a PEM bundle in [Directory] CaFile`,
and the same advice inside the handshake failure. Linux and the Docker image use the
distribution's roots.

Before 1.2.1 - on 1.1.0 and 1.2.0 - the Windows build looked in neither place and failed every
attempt with
`Could not reach the directory at https://api.nodemp.com: TLS handshake failed: certificate verify failed (SSL routines)`
although key and network were fine. A host still on one of those versions updates
([Updating](/hosting/updating/)); until then, `SSL_CERT_FILE` pointed at a PEM bundle of public
roots (`Invoke-WebRequest https://curl.se/ca/cacert.pem -OutFile C:\NodeMP\cacert.pem`, then
`$env:SSL_CERT_FILE = "C:\NodeMP\cacert.pem"` before `.\Node-Server.exe`) gets the old build
listed. Do not work around it with `[Directory] Fingerprint`: pinning the directory's leaf
certificate breaks when the certificate rotates.

## Your server's TLS fingerprint

The server's identity towards launchers is the SHA-256 fingerprint of its certificate, logged at
every start as `TLS 1.3 enabled — certificate fingerprint (SHA-256): …`. Listed servers hand it
to players through the directory (the probe records it); Direct Connect players pin it on their
first visit. It changes only if `node_cert.pem` and `node_key.pem` are lost or replaced, so keep
them — see [Updating](/hosting/updating/). It is not a `[Directory]` setting; the `Fingerprint`
key there is about the directory's certificate, not yours.

## Rotate or delete a key

Under **Your servers** at [nodemp.com/hosts](https://nodemp.com/hosts):

- **Rotate secret** issues a new secret and shows it once in the dialog **New host secret**. The
  old secret stops working; update `HostSecret` (or `NODE_DIRECTORY_HOST_SECRET`) and restart.
  Do this whenever the secret may have leaked.
- **Delete**, then **Confirm**, removes the key. A server still using it logs
  `The directory refused this server's credentials: check [Directory] HostId and HostSecret, and that the host still exists in your account`,
  keeps running and is no longer listed.

## Troubleshooting

| What you see | Cause | What to do |
|---|---|---|
| `announcing this server to …` but never `listed in the server browser`, and `The directory refused this server's credentials: …` | Wrong Host ID or secret, a rotated secret, or a deleted key. | Compare with the key on nodemp.com; rotate if unsure and paste the new secret. |
| `Could not reach the directory at https://api.nodemp.com: TLS handshake failed: certificate verify failed (SSL routines)` | The server has no trusted root certificates to verify the directory with. On a current server this means a Windows machine with an empty store and no `cacert.pem` next to the executable (the start-up log says so); on 1.2.0 or 1.1.0 it happened on every Windows machine. The key and the network are fine. | Update the server; put `cacert.pem` back next to `Node-Server.exe`; or, on an old build, set `SSL_CERT_FILE` - see [the Windows note](#windows-the-directorys-certificate). |
| `[Directory] CaFile '…' could not be loaded (…): the directory's certificate cannot be verified and this server will not be listed until it can` | `CaFile` names a bundle that does not exist, does not parse or holds no certificate. | Fix the path or the file, or leave `CaFile` empty for `api.nodemp.com`. |
| `Could not reach the directory at https://api.nodemp.com: …` (any other text after the colon) | No outgoing HTTPS, DNS failure, or the directory is down. | Check `curl https://api.nodemp.com/healthz` from the server's machine (it answers `{"status":"ok"}`). The server retries by itself after 5, 15, 30, 60 and then every 120 seconds. |
| `This server is NOT announced to a directory: [Directory] needs Url, HostId and HostSecret, and one of them is empty` | One of the three values is missing or misspelt. | Fill in all three. Variable names are `NODE_DIRECTORY_URL`, `NODE_DIRECTORY_HOST_ID`, `NODE_DIRECTORY_HOST_SECRET`. |
| `Refusing to announce this server: the [Directory] Url is plain http…` | `Url` starts with `http://`. | Use `https://api.nodemp.com`. |
| `listed in the server browser`, but the server is not in the launcher's list | The probe cannot reach `your public address:Port` over TCP, or `Public = false`. | Open and forward `30814/tcp` (and `/udp` for play). The probe is repeated with every beacon, so the list updates within about 15 seconds of the port opening. |
| Players are refused with `This server requires a NodeMP account…` | `TestDrive = false`. | Intended; set it to `true` to admit guests. |
| Players are refused with `The server could not verify your account with the directory (…)` | The directory was unreachable from the server at the moment of the join. | Wait; or set `RedeemFailOpen = true` on a Test Drive server. |
| `Could not reach the directory to stay listed: …` or `The directory answered 503 to a beacon: …` during play | A beacon failed. | The server backs off and retries; players already in stay in. |
