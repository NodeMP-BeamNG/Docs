---
title: When the server misbehaves
description: The server won't start, can't be reached, refuses players at the door, Docker surprises, a player says it lags - what the log says and what to do.
---

Everything the server can tell you, it prints to its console and to `logs/server.log`. Start with
the log.

## The server won't start

When the server can't start, it explains why, prints `Closing in 10 seconds` and exits with code 1.
A systemd service sees that as a failure, not a normal stop.

| Message | What happened | What to do |
|---|---|---|
| `Cannot listen on port … (…): the port is already in use (…). …` | The port is taken. Usually it's a second copy of the server nobody stopped. | Stop the other copy, or give this one another port. |
| `Cannot listen on port … (…): … failed: …. Closing.` | The port couldn't be opened for another reason; the system's own words are in the line. | Read them. Check that `[server] address` is an address of this machine. |
| `[server] address = "…" is not an IP address (…); the server cannot listen. …` | `address` (or `NODE_IP`) isn't an address. | Set it back to `"::"`. |
| `Error parsing config file value: …: the table […] appears twice. …` | A table is written twice in `server.toml`, usually a second `[listing]`. | Move the keys into the first table and delete the second. |
| `Error parsing config file value: …: the key … is given twice. …` | The same setting twice in one table. | Delete one of the lines. |
| `Error parsing config file value: …: … -- the line reads …` | Another mistake in the file; the line is quoted. | Fix the line, or delete `server.toml` so the server writes a fresh one. |
| `[network] timers must satisfy lag_grace_sec < seat_takeover_sec <= seat_release_sec <= disconnect_sec …` | The four timers are out of order. | Fix them in `server.toml` or in the `NODE_NETWORK_*` variables. |
| `TLS: cannot write … (…); the certificate pair is generated on the first start, …` | The server can't write its certificate where the settings say. | Point `[network] tls_cert` and `tls_key` at a folder it can write to. In Docker, see [below](#docker). |

If the server started but a part of it didn't, the log says
`started, but … failed — what they do may not work`, and the lines above say why. The server keeps
running.

## The server can't be reached

The launcher says it can't reach the server, or the server never shows up in the list.

1. **The port must be open for both TCP and UDP.** TCP is for joining and everything reliable, UDP
   for the cars' positions. Check the firewall on the machine and the port forwarding on the router.
2. **Test from outside.** A connection from your own network says nothing about the router. Ask a
   friend, or use a port-checking service.
3. **`[server] address` should be `"::"`.** The server then listens on every address, and the log
   confirms it: `listening on [::]:30814 (tcp, tls 1.3, dual-stack: IPv4 + IPv6)`.
4. **In Docker, map the port the server actually uses:** `-p 30814:30814/tcp` and
   `-p 30814:30814/udp`, or the one set in `NODE_PORT`. The port in the image's metadata doesn't
   matter.

Players on the same network as the server join with its local address, such as
`192.168.1.20:30814`.

## Players are refused at the door

A player says the launcher showed `TLS handshake failed: unexpected eof while reading`. Often it's
several players from one place, or everyone on one VPN. The server limits how many connections from
one address may be joining at the same time, and closes the extra ones before the handshake. The
server's log shows it under the `Net` tag.

- The limit is `[network] max_connections_per_ip`, 32 by default. Raise it if many players come from
  one address: a club, a carrier's NAT, a VPN exit.
- `[network] connection_limit_exempt` lists address ranges with no per-address limit. By default
  that's the local and private networks, which covers a VPN or proxy on the server's own machine.
- The launchers' background checks of the server list count as connections too.

Every connection that fails before it joins is logged under `Net` with the address and the reason:
timed out, not TLS 1.3, not TLS at all, closed by the client.

## Docker

**The server stops right after starting** with `TLS: cannot write /opt/node/node_key.pem (…)`.
Inside the image the program's folder is read-only, and that's where the certificate goes by
default. Move it to the data folder:

```bash
-e NODE_TLS_CERT=/data/tls/node_cert.pem
-e NODE_TLS_KEY=/data/tls/node_key.pem
```

The image creates `/data/tls` on every start. Those two files are the server's identity; keep them.

**`server.toml` is ignored.** That's on purpose: the image sets `NODE_PROVIDER_DISABLE_CONFIG=true`,
and every setting comes from `NODE_*` variables. If you'd rather have a file, set
`NODE_PROVIDER_DISABLE_CONFIG=false`; the server then reads and writes `/data/server.toml`.

**"Permission denied" at start, or files you copied in aren't picked up.** The server runs as user
10001. Run `sudo chown -R 10001:10001 data` and restart the container.

**The console doesn't respond.** A container without a terminal has no console. Run it with a
terminal (`-it`, or `stdin_open` and `tty` in Compose) and connect with `docker attach`.

## The server isn't listed

See [Get listed](/hosting/registering/#the-server-isnt-in-the-list). Most often it's the port:
NodeMP has to reach the server from outside before it shows it.

## A player says it lags

Find that player's `netstats` lines in `logs/server.log`, one every 15 seconds. `rtt` is the round trip in
milliseconds, `loss` the share of position packets that never arrived. High numbers for one player
while the others are fine mean it's their connection; send them
[A bad connection](/players/connection/). Bad numbers for everyone point at the server's own line.
