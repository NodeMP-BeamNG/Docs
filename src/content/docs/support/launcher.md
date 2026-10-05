---
title: "Launcher problems"
description: "When signing in fails, the server list stays empty, the launcher will not update, or one of its buttons reports an error."
---

## Signing in

The sign-in window's own messages and what to do about them are on
[Account and sign-in](/players/sign-in/#if-something-goes-wrong). When it says
*Browser sign-in did not work:*, the text after the colon tells why:

| Text after the colon | Cause | What to do |
|---|---|---|
| `could not reach the directory: …` | No connection to `api.nodemp.com`. | Check the connection and any VPN. |
| `the directory returned …` | An error on NodeMP's side. | Try again in a few minutes. |
| `unexpected reply from the directory: …` | Something else answered — a proxy, a hotel or café login page. | Open any website in the browser first, then try again. |
| `could not save the sign-in: …`, `could not reach the credential store: …` | Windows Credential Manager refused to store the sign-in. | Sign in again. Until it works, the sign-in is not remembered across restarts. |

An **Account banned** window means the account itself is banned; it shows the reason, the end date
and an **Appeal** button. See [Banned accounts](/players/sign-in/#banned-accounts).

## The server list is empty

- **Connection lost** at start — *NodeMP could not load the server list. Check your internet
  connection.* Press **Try again**, or **Continue without the list**: Direct Connect still works.
- **Could not reach NodeMP** after **Refresh**, with the address the launcher tried — the same
  thing, later.
- *No servers online* / *Nobody is hosting right now.* — NodeMP answered, and the list really is
  empty. Nothing is wrong on your side.
- *Nothing matches these filters* — press **Reset all filters**. Favorites and Recent show only
  servers that are online now.
- A server you know is running is missing — it is private, has no server key, or stopped reporting
  to NodeMP. Join it with **Direct Connect**.

A join made while NodeMP is unreachable goes without a join ticket, so nobody can confirm who you
are: a server with *Account required* refuses it, one that allows Test Drive lets you in as an
unverified guest, and a server without a key takes your name as it comes.

## Launcher updates

| Message | Cause | What to do |
|---|---|---|
| **Could not check for launcher updates** | No connection to NodeMP. | Nothing urgent: joining works, and the check runs again before the next join. |
| **The update installs after you leave the server** | An update never installs during a session. | Leave the server; the update installs then. |
| **No newer launcher has been published yet** | A server asked for a launcher newer than any release. | Wait for the release. |
| **Could not install the launcher update** · `the downloaded installer does not match the published checksum` | The download was corrupted. | Try again. |
| **Could not install the launcher update** · `the download stopped (…); it resumes on the next try`, `the download stopped at N of M bytes; it resumes on the next try` | The download broke off. | Try again; it continues where it stopped. |
| `This copy does not update itself: …` with `this copy was not installed by the NodeMP installer; update it from the download page` (under **Settings → Launcher → Updates**) | A copy that was not installed with the installer. | Install the launcher from [nodemp.com/download](https://nodemp.com/download). |
| **The update to v… did not install** / *Still on v…. It will be offered again.* | The installer did not finish. | Nothing — the update is offered again. If it keeps failing, install from the download page. |
| **Could not go back to the previous version** | The previous version could not be reinstalled; the line under the title says why. | Install the current launcher from the download page. |

## Other messages

| Message | What to do |
|---|---|
| **Could not remove the file** · `could not remove …: …` | The game holds the archive: close BeamNG.drive and remove it again. |
| **Could not open the browser** | Copy the link instead (**Copy link** in the sign-in window). |
| **Could not open the folder** | Open it in Explorer by hand — the paths are on [Logs and reports](/support/logs/). |
| **Could not change Start with Windows** | Windows refused the change. Use *Startup apps* in Windows settings instead. |
