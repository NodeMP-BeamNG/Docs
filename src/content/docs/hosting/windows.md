---
title: Server on Windows
description: Download Node-Server for Windows, check the archive, start it, open the port in the firewall and start the server with Windows.
---

## Download

On the [release page](https://github.com/NodeMP-BeamNG/releases/releases/tag/server-v1.9.1),
download two files: `Node-Server-1.9.1-windows-x64.zip` and
`Node-Server-1.9.1-windows-x64.zip.sha256`.

To check that the archive arrived whole, run this in PowerShell in your downloads folder:

```powershell
$zip = "Node-Server-1.9.1-windows-x64.zip"
(Get-FileHash $zip).Hash.ToLower()
(Get-Content "$zip.sha256").Split(" ")[0]
```

The two lines must be the same. If they aren't, download the archive again.

## Unpack and start

Unpack the archive into a folder of its own, such as `C:\NodeMP`, and double-click
`Node-Server.exe`. The same from PowerShell:

```powershell
cd C:\NodeMP
.\Node-Server.exe
```

The server's window is also its console: it shows the log and the chat, and takes commands
([Console, kicks and bans](/hosting/administration/)). Keep it open while you need the server.
Closing it stops the server cleanly first.

What's in the folder:

| What | Why |
|---|---|
| `Node-Server.exe` | The server. |
| `tools/` | The client-script obfuscator and the Lua 5.1 it runs on. Nothing to set up on Windows. |
| `modules/` | The database module for plugins. |
| `examples/` | Ready-made example resources ([Resources](/hosting/resources/)). |
| `cacert.pem` | Root certificates for machines that have none. Keep it. |

## Open the port

Open PowerShell **as administrator** and allow incoming connections on the server's port:

```powershell
$port = 30814
New-NetFirewallRule -DisplayName "NodeMP TCP" -Direction Inbound `
  -Protocol TCP -LocalPort $port -Action Allow
New-NetFirewallRule -DisplayName "NodeMP UDP" -Direction Inbound `
  -Protocol UDP -LocalPort $port -Action Allow
```

If the computer is behind a router, forward the same port to it, TCP and UDP. Test from outside:
a connection from your own network says nothing about the router.

## Start with Windows

To have the server come back after a reboot, create a task in **Task Scheduler**:

1. **Action → Create Task**.
2. On **General**, choose **Run whether user is logged on or not**.
3. On **Triggers**, add a trigger **At startup**.
4. On **Actions**, add **Start a program**: program `C:\NodeMP\Node-Server.exe`, start in
   `C:\NodeMP`.

The start folder matters: the server looks for `server.toml`, `resources/` and `content/` there.
A server started this way has no window, and so no console.

## Next

- [Name, map and slots](/hosting/quick-start/#name-map-and-slots).
- [Get listed](/hosting/registering/).
- [Updating the server](/hosting/updating/).
