---
title: Server on Windows
description: Download Node-Server for Windows, check the archive, start it, open the port in the firewall and start the server with Windows.
---

## Download

On the [download page](https://nodemp.com/download), in the **Your own server** block, click **Windows x64**. The checksum is in the same block, under **Checksums and Docker**. From [GitHub](https://github.com/NodeMP-BeamNG/releases/releases) you can take two files: `Node-Server-<version>-windows-x64.zip` and `Node-Server-<version>-windows-x64.zip.sha256`.

To check that the archive arrived whole, run this in PowerShell in your downloads folder:

```powershell
$zip = "Node-Server-<version>-windows-x64.zip"
(Get-FileHash $zip).Hash.ToLower()
(Get-Content "$zip.sha256").Split(" ")[0]
```

The two lines must match. If they don't, download the archive again.

## Unpack and start

Unpack the archive into a folder of its own, such as `C:\NodeMP`, and double-click `Node-Server.exe`. The same from PowerShell:

```powershell
cd C:\NodeMP
.\Node-Server.exe
```

The server's window is also its console: it shows the log and the chat, and you type commands there ([Console, kicks and bans](/hosting/administration/)). Keep the window open while you need the server: closing it stops the server.

The folder holds:

- `Node-Server.exe`, the server;
- `tools/`, the client-script obfuscator and the Lua 5.1 it runs on, with nothing to set up;
- `modules/`, the database module for plugins;
- `examples/`, ready-made example plugins ([The example plugins](/plugins/examples/));
- `cacert.pem`, root certificates in case the system has none. Don't delete it.

## Open the port

Open PowerShell as administrator and allow incoming connections on the server's port:

```powershell
$port = 30814
New-NetFirewallRule -DisplayName "NodeMP TCP" -Direction Inbound `
  -Protocol TCP -LocalPort $port -Action Allow
New-NetFirewallRule -DisplayName "NodeMP UDP" -Direction Inbound `
  -Protocol UDP -LocalPort $port -Action Allow
```

If the computer is behind a router, forward the same port to it, TCP and UDP, and test it from outside ([The server can't be reached](/hosting/troubleshooting/#the-server-cant-be-reached)).

## Start with Windows

To have the server start by itself after a reboot, create a task in **Task Scheduler**:

1. In **Task Scheduler**, choose **Action → Create Task**.
2. On the **General** tab, choose **Run whether user is logged on or not**.
3. On the **Triggers** tab, add the trigger **At startup**.
4. On the **Actions** tab, add **Start a program**: the program `C:\NodeMP\Node-Server.exe`, start in `C:\NodeMP`.

The start folder matters because the server looks for `server.toml`, `resources/` and `content/` there. A server started this way has no window, and so no console.
