---
title: "Sign-in and the server list"
description: "When signing in fails or the server list stays empty."
---

## Signing in

| Message | Cause | Fix |
|---|---|---|
| `Enter a username and a password of at least four characters.` | The form's own check. | Fill both fields. |
| `invalid username or password` | Wrong credentials. | Reset the password at [nodemp.com/forgot](https://nodemp.com/forgot). |
| `please verify your e-mail first` | The verification link was not opened. | Open it; it expires after a short while, so register again under another name if it is gone. |
| `username must be 3-24 chars [A-Za-z0-9_-]`, `password must be 8-200 chars`, `already exists` | The directory's rules for a new account. | Pick another name or a longer password. |
| `two-factor code required or invalid` | The account has two-factor authentication on; the launcher has no field for the code. | Play as Test Drive, or use an account without two-factor. |
| `could not reach the directory: …` | No connection to `https://api.nodemp.com`. | Check your connection and any VPN. |

## The server list is empty

- **No connection** screen (`NodeMP cannot reach its server list. Check that you are online —
  and if you use a VPN for a test server, that it is connected.`): the directory did not answer
  at start-up. *Try again*, or *Continue without the list*; Direct Connect still works. While
  it is down, Refresh reports `Could not reach NodeMP at https://api.nodemp.com`. A join made
  while the directory is unreachable carries no join ticket, so nobody verifies who you are:
  signed in, you arrive under your account name, unverified. A server without a server key
  takes names as they come anyway. A listed server that allows Test Drive admits a ticket-less
  join as an unverified guest; one that says *Account required* refuses it with
  `Disconnected · This server requires a NodeMP account: sign in to the launcher and join again`.
- `No servers online` / `Nobody is hosting right now.`: the directory answered with an empty
  list. Nothing is wrong on your side.
- `Nothing matches these filters`: open **Filters** and press *Reset*. Favorites and Recent only
  show servers that are online now.
- A server you know is running but cannot see is private, unlisted (no server key) or has
  stopped sending beacons. Join it through Direct Connect.

`could not remove …: …` in the Content view means BeamNG.drive is holding the archive; close
the game and remove again.

