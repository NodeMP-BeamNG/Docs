---
title: A bad connection and VPNs
description: Playing through a VPN or on a shaky connection, what happens when the link drops, and what helps against lag and jumping cars.
---

NodeMP is built for what VPNs and mobile internet do: a tunnel that stalls for a few seconds, an
address that changes mid-game, a slow download. Here's what to expect and what helps.

## Playing through a VPN

Most VPNs just work. Worth knowing:

- **Keep the VPN on while you play**, from **Hold to play** until you leave the server. Switching it
  on or off mid-game changes your address. The launcher usually copes, but you'll see a reconnect.
- **Split tunnelling is fine.** Part of the game's traffic may go through the tunnel and part around
  it. The server recognises your car's packets by a key, not by your address.
- **Features that split the first packet of a connection** (such as "TLS fragment" in some VPN apps)
  are fine too.
- **A slow VPN is fine.** The server gives the handshake 20 seconds by default and stops a mod
  download only when nothing has moved for a whole minute. Being slow never gets you dropped.

## When the connection drops

A short drop doesn't throw you off the server:

1. If the server hears nothing from you for 8 seconds, the other players see your car stop and turn
   see-through, with a *LAG* mark next to your name. Nobody can take your seat yet.
2. The launcher reconnects by itself. In the game you see *Connection lost, reconnecting…* with a
   countdown and the attempt number.
3. If it gets through within 30 seconds, you carry on as if nothing happened: same name, same cars,
   and whatever changed meanwhile catches up.

If it doesn't, the server lets you go and you join again as usual. The host can make the wait
longer, so a server meant for players on mobile internet may wait more than 30 seconds.

## A download broke off

If a mod download breaks off, just join again. The files that finished stay in the launcher's cache,
and the next try fetches only what's missing.

## Lag and jumping cars

Every player's game simulates their own car and sends its position 60 times a second. When those
packets arrive late or in bursts, your game has to catch the other car up, and that's what you see
as a car jumping or sliding sideways. Mostly it's the other player's connection, not yours.

What helps on your side:

- Pick a server near you: the **Country** filter in the server list, and your ping on the session
  panel.
- Play on a cable rather than Wi-Fi, and pause big downloads and streams.
- In the game's options, **NodeMP → Cars & network**, *Hold other cars tightly* is on: it keeps other
  cars closer to their real path.

If one player's car keeps jumping for everyone, their connection is the problem. Each player's ping
is in the player list on the session panel.

## Messages you may see

- *Connection lost, reconnecting…* in the game: the launcher is getting you back, see above.
- `TLS handshake failed: unexpected eof while reading` when joining: the server closed the connection
  before the handshake. Often the server limits how many connections from one address may be joining
  at once, and many players share a VPN's address. Try again in a minute. If it keeps happening, tell
  the host; they can raise the limit.
- Anything else: [When something breaks](/players/troubleshooting/) and
  [Error messages](/reference/error-codes/).
