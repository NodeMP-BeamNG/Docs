---
title: When the server misbehaves
description: The server won't start, can't be reached, refuses players at the door, Docker surprises, a player says it lags. What the log says and what to do.
---

Everything the server can tell you, it writes to the console and to `logs/server.log`. Start with the log.

## The server won't start

When the server can't start, it explains why, prints `Closing in 10 seconds` and exits with code 1. A systemd service sees that as a failure, not a normal stop.

| Message | What happened | What to do |
|---|---|---|
| `Cannot listen on port … (…): the port is already in use (…). …` | The port is taken. Most often it's a second copy of the server that nobody stopped. | Stop the other copy or set another port. |
| `Cannot listen on port … (…): … failed: …. Closing.` | The port couldn't be opened for another reason; the system's own words are in the line. | Read them. Check that `[server] address` is an address of this machine. |
| `[server] address = "…" is not an IP address (…); the server cannot listen. …` | `address` (or `NODE_IP`) isn't an address. | Set it back to `"::"`. |
| `Error parsing config file value: …: the table […] appears twice. …` | A table is written twice in `server.toml`, usually a second `[listing]`. | Move the keys into the first table and delete the second. |
| `Error parsing config file value: …: the key … is given twice. …` | One setting is written twice in one table. | Delete one of the lines. |
| `Error parsing config file value: …: … -- the line reads …` | Another mistake in the file; the line is quoted. | Fix the line, or delete `server.toml` so that the server writes a new one. |
| `[network] timers must satisfy lag_grace_sec < seat_takeover_sec <= seat_release_sec <= disconnect_sec …` | The `[network]` timers are out of order. | Fix them in `server.toml` or in the `NODE_NETWORK_*` variables. |
| `TLS: cannot write … (…); the certificate pair is generated on the first start, …` | The server can't write the certificate where the settings point. | Point `[network] tls_cert` and `tls_key` at files in a folder you can write to. In Docker, see [below](#docker). |

If the server started but some part of it didn't, the log has `started, but … failed — what they do may not work`, and the lines above it say why. The server keeps running.

## The server can't be reached

The launcher says it can't reach the server, or the list marks the server as one players can't connect to.

1. Open the port for both TCP and UDP. TCP is for joining and everything reliable, UDP for the cars' positions. Check the firewall on the machine and the port forwarding on the router.
2. Test from outside: a connection from your own network says nothing about the router. Ask a friend or use a port-checking service.
3. Leave `[server] address` at `"::"`. The server then listens on every address, and the log confirms it: `listening on [::]:30814 (tcp, tls 1.3, dual-stack: IPv4 + IPv6)`.
4. In Docker, publish the port the server listens on: `-p 30814:30814/tcp` and `-p 30814:30814/udp`, or the one set in `NODE_PORT` ([Server in Docker](/hosting/docker/#run-it)).

Players on the same network as the server join by its local address, such as `192.168.1.20:30814`.

## Players are refused at the door

A player says the launcher showed `TLS handshake failed: unexpected eof while reading`. Often it's several players from one place, or everyone from one VPN. The server limits how many connections from one address may be joining at the same time and closes the extra ones before the handshake. The server's log shows this under the `Net` tag.

- The limit is `[network] max_connections_per_ip`, 32 by default. Raise it if many players come from one address: a club, a carrier's NAT, a VPN exit.
- `[network] connection_limit_exempt` lists address ranges without the per-address limit. By default these are local and private networks, which covers a VPN or proxy on the same machine as the server.
- The launchers' background polls of the server list count as connections too.

Every connection that fails before joining is written to the log under the `Net` tag with the address and the reason: a timeout, not TLS 1.3, not TLS at all, the client closed the connection.

## Docker

### The server stops right after starting

The log has `TLS: cannot write /opt/node/node_key.pem (…)`. Inside the image the program's folder is read-only, and the certificate is written there by default. Move it to the data folder:

```bash
-e NODE_TLS_CERT=/data/tls/node_cert.pem
-e NODE_TLS_KEY=/data/tls/node_key.pem
```

The image creates `/data/tls` at every start. Why you must not lose these files: [The server's fingerprint](/hosting/registering/#the-servers-fingerprint).

### `server.toml` isn't read

This is by design: the image sets `NODE_PROVIDER_DISABLE_CONFIG=true`, and every setting comes from the `NODE_*` variables. To make the server read and write `/data/server.toml`, set `NODE_PROVIDER_DISABLE_CONFIG=false`.

### Permission denied at start

The server runs as user 10001 and can't write to the data folder or read the files you copied into it. Run `sudo chown -R 10001:10001 data` and restart the container.

### The console doesn't respond

A container without a terminal has no console ([The console](/hosting/docker/#the-console)).

## The server isn't listed

The log says why: [Get listed](/hosting/registering/#the-server-isnt-in-the-list). A closed port doesn't remove the server from the list: the list marks it as one players can't connect to ([above](#the-server-cant-be-reached)).

## A player says it lags

Find the player's `netstats` lines in `logs/server.log`, one every 15 seconds. `rtt` is the round trip in milliseconds, `loss` the share of lost UDP packets. If the numbers are high for one player and fine for the others, it's their connection: send them [A bad connection and VPNs](/players/connection/). If it's bad for everyone, the problem is the server's own connection.
