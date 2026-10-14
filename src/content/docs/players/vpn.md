---
title: VPN and bad connections
description: Playing NodeMP through a VPN or on a shaky connection - what works, what the launcher does when the link drops, and what to do about lag and jumping cars.
---

NodeMP is built to survive the things VPNs and mobile connections do: a tunnel that stalls for a
few seconds, an address that changes in the middle of a session, a slow download. This page says
what to expect and what helps.

## Playing through a VPN

Most VPNs just work. A few things worth knowing:

- **Keep the VPN on for the whole session**, from the click on *Hold to play* until you leave.
  Switching it on or off mid-game changes your address; the launcher usually recovers, but you'll
  see a reconnect.
- **Split tunnelling is fine.** The game's traffic may leave partly through the tunnel and partly
  around it; the server recognises your car's position packets by a key, not by your address.
- **Options that split the first packet** of a connection into small pieces (the "TLS fragment"
  setting some VPN apps have) are fine too.
- **A slow VPN is fine.** The server gives the secure handshake 20 seconds by default, and a mod
  download is only stopped when nothing at all has moved for a minute. Slow is never a reason to
  cut you off.

## When the connection drops

A short drop doesn't throw you off the server:

1. If the server hears nothing from you for 8 seconds, the other players see your car stop and
   turn see-through, with a *LAG* mark next to your name. Nobody can take your seat yet.
2. Your launcher reconnects on its own. In the game you see *Connection lost, reconnecting…* with
   a countdown and the attempt number.
3. If it gets through within 30 seconds, you carry on as if nothing happened: same name, same
   cars, and the cars that changed meanwhile are brought up to date.

After that the server lets you go and you join again as usual. The host can make the waiting
time longer, so a server meant for players on mobile connections may give you more than 30
seconds.

## A download that breaks

If a mod download breaks off, join again. The files that finished downloading stay in the
launcher's cache, so the next attempt only fetches what is still missing.

## Lag and jumping cars

Every player's game simulates its own car and sends its position 60 times a second. When those
packets arrive late or in bursts, your game has to catch the other car up, and that is what you see
as a car jumping or sliding sideways. Mostly it's the other player's connection, not yours.

What helps, on your side:

- Pick a server near you: the **Country** filter in the server list, and your ping in the session
  panel in the game.
- Use a cable instead of Wi-Fi, and pause big downloads and streams while you play.
- In **Options → NodeMP → Cars & network**, *Hold other cars tightly* (on by default) keeps other
  cars closer to their real path. The advanced *Correction strength* and *Teleport threshold*
  change how hard the game pulls them back and when it gives up and moves them in one step.

If one particular player's car keeps jumping for everyone, their connection is the problem; the
session panel shows each player's ping when you open the player list.

## Messages you may see

- *Connection lost, reconnecting…* in the game: the launcher is getting you back, see above.
- `TLS handshake failed: unexpected eof while reading` when joining: the server closed the
  connection before the secure handshake. Often the server is limiting how many connections may be
  set up at once from one address, and many players share your VPN's exit address. Try again in a
  minute, and tell the host if it keeps happening; they can raise the limit
  ([hosting troubleshooting](/hosting/troubleshooting/)).
- Anything else: [Can't join a server](/support/joining/) and
  [Messages and exit codes](/support/error-codes/).
