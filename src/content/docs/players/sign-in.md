---
title: Account and sign-in
description: A NodeMP account is made on the website, the launcher signs in through the browser with a code, and Test Drive plays without an account.
---

You can play with or without an account. An **account** gives you a fixed name that servers verify
with NodeMP — friends know you by it, and nobody else can take it. **Test Drive** is playing
without an account under a random guest name; some servers refuse guests.

## Create an account

Accounts are made on the website, not in the launcher: [nodemp.com/register](https://nodemp.com/register).

1. Pick a **username** — 3 to 24 characters: Latin letters, digits, hyphens and underscores. This
   is the name servers show.
2. Enter an **e-mail** and a **password** — 8 to 200 characters.
3. Open the e-mail and follow the link to confirm the address. You cannot sign in until you do.

Hosts use the same account — server keys are created in it. There is no separate host account.

## Sign in to the launcher

The launcher never asks for your password: it signs in through the website in your browser. The
password, the captcha and two-factor protection stay on the website.

1. In the sign-in window, press **Sign in with browser**. The launcher shows a **sign-in code**
   and opens nodemp.com in your browser.
2. Sign in on the website if you are not signed in yet.
3. Check that the website shows the same code as the launcher, and **approve** the sign-in.
4. The launcher greets you by name and opens the main window.

While it waits, the window counts down: *Waiting for approval · 4:59*. **Open again** opens the
page in the browser again, **Copy link** copies the address.

The sign-in is remembered: next time the launcher opens straight away.

### If something goes wrong

| What you see | What to do |
|---|---|
| *The browser did not open…* | The link and the code are already on the clipboard. Open the address from the window in any browser and enter the code. |
| *The code expired…* | Press **Get a new code** and approve again. |
| *Sign-in was declined in the browser.* | Someone pressed *Deny* on the website. Start again. |
| *Browser sign-in did not work: …* | Check your connection and try again; the text after the colon says why. |
| *Browser sign-in is not available here.* | The sign-in service is unavailable right now — play as Test Drive and sign in later. |

If signing in does not work at all, see [Sign-in and the server list](/support/launcher/).

## Test Drive — playing without an account

**Continue as Test Drive** in the sign-in window lets you in as a guest. You get a new name like
`Guest-7f3a` every time — you cannot choose it, and it changes with every join.

A server may refuse guests:

- its card in the list says **Access: Account required**;
- the **No account needed** filter hides such servers;
- a join to one is refused with a request to sign in.

Test Drive is not remembered — you pick it at every start. To sign in later, open
**Settings → Account → Sign in**.

## Managing the account

**Settings → Account** in the launcher shows the name servers see you under, with two buttons:
**Manage on the website** and **Sign out**.

On the website, in your [account](https://nodemp.com/account), you can:

- change the username (once per period), the e-mail or the password;
- turn on two-factor protection;
- link Discord;
- end sessions on other devices.

## Banned accounts

If the account is banned, the launcher shows an **Account banned** window with the reason and the
end date. While the ban lasts, the account cannot join NodeMP servers. A ban on one server is a
different thing: that server's host sets it, and it does not keep you off the others.
