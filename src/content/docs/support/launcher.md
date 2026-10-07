---
title: "Launcher problems"
description: "What to do when signing in fails, the server list stays empty, the launcher cannot update, or a button reports an error."
---

## Signing in

Detailed guidance on logging into your profile is available in [Account and sign-in](/players/sign-in/#if-something-goes-wrong).

When the login window shows *Browser sign-in did not work:*, the text after the colon explains the exact reason:

| Text after the colon | Cause | What to do |
|---|---|---|
| `could not reach the directory: …` | No stable connection to `api.nodemp.com`. | Check your internet connection or disable any interfering VPN. |
| `the directory returned …` | A temporary service glitch on NodeMP's side. | Wait a couple of minutes and try signing in again. |
| `unexpected reply from the directory: …` | A captive portal or proxy intercepted the request (e.g. hotel/café Wi-Fi login screen). | Open your browser, navigate to any website to complete network authorization, and try again. |
| `could not save the sign-in: …`, `could not reach the credential store: …` | Windows Credential Manager failed to store your login token. | Try signing in again. Until this system error is resolved, your login won't be remembered across restarts. |

If an **Account banned** modal appears, the account has been suspended by administration. The window shows the ban reason, expiration date, and an **Appeal** button (see [Banned accounts](/players/sign-in/#banned-accounts)).

## The server list is empty

If no servers appear in the directory browser, check the status message:

- **Connection lost** at launch (*NodeMP could not load the server list. Check your internet connection.*) — click **Try again**. If the directory is temporarily unreachable, you can select **Continue without the list**: Direct Connect still works normally.
- **Could not reach NodeMP** after clicking **Refresh** — the launcher failed to fetch the updated server list. Try refreshing again shortly.
- Status *No servers online* or *Nobody is hosting right now.* — communication with NodeMP is working fine, but no public servers are currently online. Everything on your PC is completely normal.
- Status *Nothing matches these filters* — active servers exist, but your search or tag filters hide them. Click **Reset all filters**. Note that Favorites and Recent only display servers that are currently online.
- A server you know is running is missing from the list — the server might be private, running without an auth key, or temporarily disconnected from the directory. Join it directly using the **Direct Connect** tab.

When the NodeMP directory is temporarily unreachable, joins proceed without a directory join ticket. In this state, servers requiring accounts (*Account required*) reject the connection, servers permitting Test Drive let you in as an unverified guest, and unkeyed local servers accept your display name as entered.

## Launcher updates

The launcher automatically checks for program updates. If an update encounters an issue:

| Message | Cause | What to do |
|---|---|---|
| **Could not check for launcher updates** | Temporary connection issue with the NodeMP update server. | Nothing urgent: you can continue playing, and the launcher will recheck before your next launch. |
| **The update installs after you leave the server** | Protection against interrupting gameplay: the launcher never updates while inside an active session. | Finish your game session and close BeamNG.drive — the update will apply automatically. |
| **No newer launcher has been published yet** | A game server requires a launcher version newer than any public release. | Wait for the next official release. |
| **Could not install the launcher update** · `the downloaded installer does not match the published checksum` | The downloaded update file was corrupted. | Try running the update again. |
| **Could not install the launcher update** · `the download stopped (…); it resumes on the next try`, `the download stopped at N of M bytes; it resumes on the next try` | The download was interrupted due to a network drop. | Click update again — the download will resume where it left off. |
| `This copy does not update itself: …` with `this copy was not installed by the NodeMP installer; update it from the download page` (under **Settings → Launcher → Updates**) | The current launcher was not installed via the official Windows installer. | Install the launcher using the installer from [nodemp.com/download](https://nodemp.com/download). |
| **The update to v… did not install** / *Still on v…. It will be offered again.* | The installer process failed or was cancelled. | The update will be offered again on the next launch. If it repeatedly fails, download the installer manually. |
| **Could not go back to the previous version** | Automated rollback to the previous build failed. | Download and install the latest launcher from the website. |

## Other messages

| Message | What to do |
|---|---|
| **Could not remove the file** · `could not remove …: …` | The file is locked by the game. Close BeamNG.drive and try removing it again. |
| **Could not open the browser** | Copy the login link manually (**Copy link** in the login window) and paste it into any web browser. |
| **Could not open the folder** | Open the folder manually in Windows Explorer. Exact directory paths are listed on [Logs and reports](/support/logs/). |
| **Could not change Start with Windows** | Windows blocked modifying startup apps. Toggle NodeMP manually in *Windows Settings → Apps → Startup*. |
