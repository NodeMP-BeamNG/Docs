---
title: Account and sign-in
description: Create a NodeMP account, sign into the launcher through your browser, or play without registration in Test Drive.
---

You can play NodeMP with or without a registered account.

- **With an account:** you get a permanent, verified username. Nobody else can take it, and your friends will always recognize you on servers.
- **In Test Drive mode:** you can jump straight into the action without creating an account. You'll receive a temporary guest name, though some servers require a registered account to join.

## Create an account

Accounts are registered on the website: [nodemp.com/register](https://nodemp.com/register).

1. Choose a **username** — 3 to 24 characters (Latin letters, numbers, hyphens, and underscores). This name appears on servers.
2. Enter your **e-mail** and a strong **password**.
3. Confirm your address using the verification link sent to your inbox. You must confirm your email before signing in.

Server hosts use the exact same account to generate server keys — there is no separate host profile.

## Sign in to the launcher

The launcher never asks for your password directly: sign-in is handled securely through your web browser.

1. In the launcher sign-in window, click **Sign in with browser**. The launcher displays a one-time **sign-in code** and opens nodemp.com in your browser.
2. Log in on the site if you haven't already.
3. Verify that the code on the web page matches the code in the launcher, then confirm the sign-in.
4. The launcher greets you by name and opens the main screen.

While waiting, a countdown timer is displayed ("Waiting for approval · 4:59"). Click **Open again** to reopen the browser page, or **Copy link** to copy the URL to your clipboard.

Your sign-in is saved, so the launcher will take you straight to the main window on future launches.

### If something goes wrong

| What you see | Solution |
|---|---|
| *The browser did not open…* | The link and code are already copied to your clipboard. Open the URL in any browser and enter the code manually. |
| *The code expired…* | The confirmation window timed out. Click **Get a new code** and approve the sign-in again. |
| *Sign-in was declined in the browser.* | Someone clicked "Deny" on the website. Start the sign-in process again. |
| *Browser sign-in did not work: …* | Check your internet connection. The message after the colon provides additional details. |
| *Browser sign-in is not available here.* | The authentication service is temporarily unavailable. You can use Test Drive for now and sign in later. |

If you cannot sign in, check the [Sign-in and the server list](/support/launcher/) guide.

## Test Drive — playing without an account

Clicking **Continue as Test Drive** lets you jump right in as a guest. You will be assigned a random name like `Guest-7f3a` for that session. You cannot choose custom names in Test Drive.

Keep in mind that individual servers can restrict guest access:
- The server card displays **Access: Account required**.
- The **No account needed** filter hides servers that require registration.
- If you attempt to connect, the server will prompt you to sign in with an account.

Test Drive is not remembered across restarts — the launcher will prompt you again next time. If you decide to log in later, simply open **Settings → Account → Sign in**.

## Managing the account

Under **Settings → Account**, you can see your current username, manage your profile on the website, or sign out.

In your [website account dashboard](https://nodemp.com/account), you can:
- change your username, email, or password;
- enable two-factor authentication (2FA);
- link your Discord profile;
- view active sessions and log out from other devices.

## Banned accounts

If an account is banned, the launcher displays an **Account banned** notification with the reason and duration. While banned, the account cannot connect to any public NodeMP servers.

Bans on individual servers are separate: they are issued by that server's host and do not affect your ability to play on other servers.
