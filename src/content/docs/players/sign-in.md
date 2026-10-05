---
title: "Account and sign-in"
description: "A NodeMP account, signing in through the browser, and playing without one in Test Drive."
---

## Accounts

You can play with or without an account. A NodeMP account gives you a fixed name that servers
verify with the directory, and it is the same account a host uses to create server keys - the
website's registration page speaks to hosts, but the account is one and the same. Without one you
play as **Test Drive** (below), which some servers refuse. Create an account:

- in the launcher: **Create an account** in the sign-in window (username, e-mail, password).
  The launcher registers you and signs you in. If the directory is configured to require
  e-mail verification, the form shows `please verify your e-mail first` instead — open the
  link in the e-mail, then press **Sign in**;
- on the website: [nodemp.com/register](https://nodemp.com/register). **Username**: 3 to 24
  characters, letters, digits, hyphens and underscores. **E-mail**. **Password**: 8 to 200
  characters. The page then says *Check your e-mail*: open the verification link (it expires
  after a short while), then sign in. Until then the directory answers
  `please verify your e-mail first`.

**Test Drive** is playing without an account: the launcher joins as a guest, and the directory
mints a fresh guest name (`Guest` plus random characters) for every join - you cannot choose it,
and it changes when you rejoin, so friends recognise you by your account name only. A server can
refuse guests: its detail panel says *Account required* (the filter chip *No account needed* hides
such servers), and the join ends with
`Disconnected · This server requires a NodeMP account: sign in to the launcher and join again`.
To sign in later, open **Settings → Account → Sign in**.

