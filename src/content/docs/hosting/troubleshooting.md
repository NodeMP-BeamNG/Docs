---
title: Troubleshooting
description: The server won't start, players can't reach it, players are refused at the door, Docker and its TLS files - what the log says and what to do.
---

Start from what you see. Everything the server says is in its console and in `logs/server.log`.

## The server won't start

The server explains every reason it can't start, then stops with `Closing in 10 seconds` and exit
code 1, so a service manager sees a failure, not a clean stop.

| Message | What it means | What to do |
|---|---|---|
| `Cannot listen on port … (…): the port is already in use (…). Usually another Node-Server is still running on this machine -- a previous instance that was not stopped, or a second copy started by mistake -- or another program owns the port. Stop it, or give this server a different port with [General] Port in server.toml or --port=<number>. Closing.` | Another program holds the port; the first brackets say `udp` or `tcp`, the last ones carry the system's own words. | Stop the other server (often an old copy still running), or pick another port. |
| `Cannot listen on port … (…): … failed: …. Closing.` | The port couldn't be opened for another reason; the system's words are in the line. | Read them; check that `[General] IP` is an address of this machine. |
| `[General] IP = "…" is not an IP address (…); the server cannot listen. Leave it at "::" to listen on every interface, or give the address of one of this machine's interfaces. Closing.` | `IP` (or `NODE_IP`) isn't an address. | Set it back to `"::"`. |
| `Error parsing config file value: …: the table […] appears twice. Put the keys into the existing […] table -- the server wrote one with every key in it on the first start -- and remove the second […] line together with the keys under it. The file has not been changed; fix it and start the server again.` | A table appears twice in `server.toml`, usually a second `[Directory]` pasted from the website. | Move the keys into the table that was already there, delete the second one. |
| `Error parsing config file value: …: the key … is given twice. Keep one of the two lines. The file has not been changed; fix it and start the server again.` | The same setting twice in one table. | Delete one of the lines. |
| `` Error parsing config file value: …: … -- the line reads `…`. Fix that line and start the server again, or delete the file and the server writes a fresh one with every default. `` | Any other mistake in the file; the line is quoted. | Fix the line, or delete `server.toml` to start from the defaults. |
| `[Network] timers must satisfy LagGraceSec < AuthTakeoverSec <= AuthReleaseSec <= DisconnectSec …` | The four timers aren't in order. | Fix them in `server.toml` (or the `NODE_NETWORK_*` variables). |
| `TLS: cannot write … (…); the certificate pair is generated on the first start, so point [Network] TlsCert and TlsKey (NODE_TLS_CERT, NODE_TLS_KEY) at files in a writable directory` | The server can't write its certificate where the settings say. | Point both at a folder it can write to. In Docker, see [below](#docker-tls-pair). |

If the server started but a part of it didn't, the log says
`started, but … failed — what they do may not work`; the lines above it say what and why. The server
keeps running.

## Players can't reach the server

Launchers say `Could not reach the server`, or the server never shows up in the list.

1. **The port must be open for TCP and UDP**, both: TCP for joining and everything reliable, UDP
   for the cars' positions. Check the firewall on the machine, and the port forwarding on your
   router if there is one.
2. **Test from outside.** A connection from your own network says nothing about the router. Ask a
   friend, or use a port checker, against `your public address:30814`.
3. **`[General] IP` should be `"::"`.** That listens on every address, IPv4 and IPv6; the log
   confirms it with `listening on [::]:30814 (tcp, tls 1.3, dual-stack: IPv4 + IPv6)`.
4. **In Docker, map the port the server really uses**: `-p 30814:30814/tcp -p 30814:30814/udp` for
   the default, or the one you set with `NODE_PORT`. Ignore the port the image declares in its
   metadata; the mapping is what counts.

Players behind the same router as the server join with its local address (`192.168.…:30814`).

## Players are refused at the door

A player says the launcher showed `TLS handshake failed: unexpected eof while reading`, often
several players from the same place, or everyone on one VPN. The server limits how many connections
from one address may be in the middle of joining at once, and closes the next one before the
handshake. Your log says so under `Net`:
`… connections from this address are still being set up ([Network] MaxConnectionsPerIp)`.

- The limit is `[Network] MaxConnectionsPerIp`, 32 by default. Raise it if many of your players
  come from one address (a club, a carrier's NAT, a VPN exit).
- `[Network] ConnectionLimitExempt` lists address ranges with no per-address limit. By default
  that's loopback and the private ranges, which covers a VPN or a reverse proxy running on the
  server's own machine. Add a range there if all your players arrive through one gateway.
- The launcher's background pings of the server list count as connections too.

Every connection that fails before it joins is logged under `Net` with the address and why (timed
out, not TLS 1.3, not a TLS client at all, closed by the client), once a minute per address.

## Docker: TLS pair

The server stops right after start with `TLS: cannot write /opt/node/node_key.pem (…)`. Inside the
image the executable's folder is read-only, and by default the certificate is written next to the
executable. Point both files at the data volume:

```bash
-e NODE_TLS_CERT=/data/tls/node_cert.pem -e NODE_TLS_KEY=/data/tls/node_key.pem
```

The image creates `/data/tls` on every start. Keep those two files: they're the server's identity.

## Docker: other surprises

- **`server.toml` is ignored.** The image sets `NODE_PROVIDER_DISABLE_CONFIG=true`, so every
  setting comes from `NODE_*` variables ([every setting](/hosting/configuration/#every-setting)). If
  you'd rather use a file, set `NODE_PROVIDER_DISABLE_CONFIG=false`; the server then reads and
  writes `/data/server.toml`.
- **"Permission denied" on start**, or files you copied in aren't picked up: the server runs as user
  10001. `sudo chown -R 10001:10001 data`, then restart.
- **The console doesn't react.** A container without a terminal has no console; run it with a
  terminal (`-it`, or `stdin_open` and `tty` in Compose) and `docker attach` to it.

## The server isn't listed

See [Get listed → Troubleshooting](/hosting/registering/#troubleshooting). Most often it's the
port: NodeMP has to reach the server from outside before it shows it.

## A player says it lags

Look for that player's `netstats` lines in the log, one every 15 seconds: `rtt` is their round trip
in milliseconds, `loss` the share of position packets that never arrived. A high `rtt` or `loss`
on one player while the others are fine is their connection;
[VPN and bad connections](/players/vpn/) is the page to send them. High numbers for everyone point
at the server's own connection.
