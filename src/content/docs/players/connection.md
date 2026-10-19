---
title: A bad connection and VPNs
description: How to play through a VPN or on an unstable connection, what happens when the link drops, and what to do about lag and jumping cars.
---

## Playing through a VPN

- Don't turn the VPN on or off while you are on a server: your address changes and the launcher has to reconnect.
- Split tunneling is fine: part of the traffic may go through the tunnel and part around it. The server recognizes your packets by a session key, not by your address.
- Splitting the first packet of a connection (such as "TLS fragment" in some VPN apps) is fine too: the server waits for the whole start of the TLS connection, up to 20 seconds by default.
- A slow VPN is fine: the server stops a mod download only if it stands still for a whole minute.

## When the connection drops

A short drop doesn't kick you off the server:

1. If the server hears nothing from you for 8 seconds, your car stops and turns see-through for others, and your name gets a *LAG* mark. For the first 10 seconds of silence the driver's seat stays yours; after that another player can take it.
2. The launcher reconnects by itself. In the game you see *Connection lost, reconnecting… (N s)* and *Attempt N*.
3. If the connection returns within 30 seconds, the game goes on with the same name and cars.

If the connection doesn't return, the server closes the session and you can join again. The host can lengthen those 30 seconds, but not beyond 600: the launcher won't wait longer.

If a mod download broke off, join again: the files that finished stay in the launcher's cache, and the broken one downloads again.

## Lag and jumping cars

Each player's own game simulates their car and sends its position 60 times a second. When packets arrive late or in bursts, your game pulls the other car to its real position, and the car jumps or slides sideways. If only one player's car jumps, the cause is their connection, not yours: the player list on the session panel shows everyone's ping.

What helps on your side:

- Choose a server closer to you (the **Country** filter in the server list).
- Play over a cable rather than Wi-Fi, and pause big downloads and streams.
- If the game freezes when someone spawns or changes a car, check that **Schedule other players' car changes** is on ([Other players' new cars and changes](/players/settings/#other-players-new-cars-and-changes)).

## Connection error messages

`TLS handshake failed: unexpected eof while reading` when you join means the server closed the connection before the TLS handshake finished. That happens when more players join from your address at once than the host allows (through a VPN, many players share one address), or when a VPN distorts or delays the handshake. Try again in a minute. If that doesn't help, tell the host ([When the server misbehaves](/hosting/troubleshooting/#players-are-refused-at-the-door)).

Other messages: [When something breaks](/players/troubleshooting/) and [Error messages](/reference/error-codes/).
