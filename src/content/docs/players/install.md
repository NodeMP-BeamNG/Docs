---
title: Install the launcher
description: Download and install the NodeMP launcher 1.1.12 on Windows, let it install the client mod, and sign in or continue as Test Drive.
---

The **launcher** is the Windows app that runs NodeMP for you: it signs you in, keeps the
**client mod** (`NodeMP.zip`) in step with the release the **directory** publishes, starts
BeamNG.drive and carries your traffic to the server. You install the launcher once; the client
mod is installed and updated by the launcher, never by hand. The parts are introduced in
[What is NodeMP](/introduction/what-is-nodemp/), and the words used here - launcher, helper,
client mod, content, Test Drive, strict - are defined in the
[glossary](/reference/glossary/#for-players).

## Requirements

- Windows 10 or 11, 64-bit.
- BeamNG.drive **0.39.4.0**, the current release: client mod 1.6.9 is built for it, and a strict
  server's reference is made for one game version. Other versions are not what the mod is built
  or tested against.
- The game started at least once: the first start creates the user folder the client mod is
  installed into and writes `BeamNG.Drive.ini`, one of the places the launcher looks for the
  game. A Steam copy is found on its own; a copy installed elsewhere works when you point
  **Settings → Game** at its folder (the launcher starts `Bin64\BeamNG.drive.x64.exe` from
  whatever folder it knows, and asks Steam only when that fails).

## Download and install

1. Download `NodeMP-Setup-1.1.12.exe` from [nodemp.com/download](https://nodemp.com/download)
   (the *Launcher (Windows)* card). The same file is attached to tag `launcher-v1.1.12` at
   [github.com/NodeMP-BeamNG/releases](https://github.com/NodeMP-BeamNG/releases), with a
   `.sha256` file next to it.
2. The installer is not code-signed yet, so Windows SmartScreen may warn about an unknown
   publisher (**More info → Run anyway**). Before you run it, check that the file is the
   published one: `Get-FileHash .\NodeMP-Setup-1.1.12.exe` in PowerShell prints the SHA-256 of the
   file you have, and it must equal the published one - the value in the `.sha256` file next to
   the installer on the release page, which the Download page shows as well.
3. Run it. The installer installs for the current user only, into `%LOCALAPPDATA%\NodeMP`, and
   does not ask for administrator rights.
4. To upgrade, run the new installer over the old one. The launcher does not check for or
   announce its own updates - the client mod is updated for you, the launcher is not: when a
   server needs a newer launcher, the join stops with
   `Could not join · This server needs a newer launcher — update from the Download page`, and
   the Download page always offers the current version. Launchers before 1.0.0 wrote a
   `directory.url` file beside the executable that pointed at a test address; 1.0.0 removes it
   on first start. A `directory.url` you wrote yourself is kept (a developer setting, see
   [Troubleshooting](/players/troubleshooting/#advanced-another-directory)).

## First start

The launcher opens as a small **Sign in** window: **Sign in** with your nodemp.com account,
**Create an account**, or **Continue as Test Drive** (see [Accounts](#accounts)). A sign-in is
remembered in the Windows credential store, so the window is skipped next time; Test Drive is
not remembered - the window opens at every start and you press **Continue as Test Drive** again.

Once open, the launcher checks the client mod in the background (next section) and loads the
server list from `https://api.nodemp.com`. If the directory does not answer, you get the **No
connection** screen: *Try again*, or *Continue without the list* to reach Direct Connect.

Open **Settings → Game** once to confirm that the game was found: the line under the heading
says what, for example `Version 0.39.4.0`. Nothing else happens there, but a join with no game
found fails later with
`The launcher stopped · … Failed to find the game please launch it. Report this if the issue persists code 8`,
and this is the place to fix that first. If the line says `Could not find a BeamNG.drive install.
Browse to it, or launch the game once so Steam writes its path.`, press **Browse** and pick the
folder that contains `Bin64\BeamNG.drive.x64.exe`, or start the game once through Steam and press
**Find it**.

## The client mod

The client mod is the BeamNG mod that does the multiplayer work inside the game. The launcher
installs it into BeamNG's user folder, next to a small file that records its version:

```
%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\mods\multiplayer\NodeMP.zip
%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\mods\multiplayer\NodeMP.zip.version
```

A moved user folder (`UserPath` in `startup.ini` beside the game, or `userFolder` in
`BeamNG.Drive.ini`) is followed. BeamNG derives the mod id `multiplayernodemp` from that path;
the launcher's helper activates it in `mods/db.json` before every game start, so the mod is on
even if you disabled it in the game's mod manager.

- At every launcher start and before every join, the launcher fetches the current release
  (`GET https://api.nodemp.com/v1/releases/mod`) and compares the SHA-256 of the installed zip
  with the published one. Versions are not compared; only the hash counts. So on a fresh
  install the mod is normally downloaded while the launcher opens, before your first
  **Hold to play**; the join repeats the check and downloads only if the start-up check could
  not.
- If the hashes differ, the release is downloaded to `NodeMP.zip.part`, verified by size and
  hash, and only then renamed over the old file. A failed download leaves the previous zip
  untouched.
- BeamNG must be closed while the file is replaced - keep it closed the first time you open the
  launcher, and while a new client mod release is installed. With the game running the launcher
  reports `Could not check the client mod · could not replace …\NodeMP.zip (is BeamNG.drive running?): …`.
- If the update cannot be fetched but a zip is on disk, a join goes ahead with the toast
  `Client mod could not be updated · joining with the installed copy`; whether an older mod is
  accepted is the server's decision. With no zip on disk the join stops:
  `Could not join · client mod is not installed and the directory is unreachable`.

**Settings → Launcher → Client mod** shows the installed version and the last result
(`Up to date · v1.4.0`, `Not installed yet; it is downloaded before the first join`, …);
**Check now** repeats the check without joining.

Do not copy `NodeMP.zip` into the folder yourself. (For developers only - players can skip this:
a copy of the mod's source kept unpacked at `mods/unpacked/nodemp` is left alone; the launcher
installs nothing and reports `Unpacked developer copy at mods/unpacked/nodemp is in use`.)

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

## Next step

[Join a server](/players/join/).
