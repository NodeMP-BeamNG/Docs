---
title: Quick start
description: Get a NodeMP game server running on your own machine and connect to it over loopback — no backend or accounts required.
---

This guide gets a NodeMP **game server** running on your own machine and has you connect to it
locally. A loopback connection (`127.0.0.1`) is trusted automatically, so for a single-PC test
you need **no backend and no account** — the server skips the ticket redeem for same-machine
players.

When you later want the server reachable by other people or listed in the public browser, see
[Running the server](/hosting/running/) and [Registering your host](/hosting/registering/).

## What you need

- A NodeMP **server binary** (`NodeMP-Server` on Linux, `NodeMP-Server.exe` on Windows).
  Until prebuilt downloads are published, you build it from source with the provided
  Dockerfile — see [Running the server](/hosting/running/) for the build commands.
- **BeamNG.drive** plus the NodeMP launcher and mod on the same PC, so you can join. See
  [Install the launcher](/players/install/).
- One free port: **30814** (TCP **and** UDP) by default.

## 1. Put the binary in its own folder

The server writes its config and creates its `Resources/` folders **next to the working
directory it is started from**, so give it a folder of its own — for example `C:\NodeMP` on
Windows or `/opt/nodemp` on Linux.

## 2. First launch generates the config

Run the server once from that folder:

```bash
# Linux
./NodeMP-Server
```

```powershell
# Windows (PowerShell)
.\NodeMP-Server.exe
```

On the first run there is no `ServerConfig.toml`, so the server writes a fresh one with sensible
defaults and creates empty `Resources/Server` and `Resources/Client` folders, then keeps running
on those defaults. You'll see a line like *"No config found … Writing a fresh one."* in the
console.

:::tip
On Windows, if you built from source, the helper script `run-server-local.bat` does this for
you: it runs the freshly built `build\Release\NodeMP-Server.exe` from a `run-local\` working
folder and keeps the window open so you can read the log.
:::

## 3. A minimal `ServerConfig.toml`

The generated defaults are already fine for a local test. The only values that matter here are:

```toml
[Server]
Name    = "My NodeMP Server"
Private = true            # keep it off the public browser while testing

[Network]
IP            = "0.0.0.0" # listen on all interfaces
Port          = 30814     # TCP + UDP
TrustLoopback = true      # trust 127.0.0.1 peers with no backend auth (local dev)

[Backend]
HostId     = ""           # leave blank for a private / LAN-only server
HostSecret = ""
```

`TrustLoopback = true` is what lets you join your own server without a backend. Leave the
`[Backend]` credentials empty for now — they are only needed to appear in the public list. See
[Configuration](/hosting/configuration/) for every key.

:::note
Edit a value, **save the file, then restart the server** to apply it. Settings are read once at
startup.
:::

## 4. Launch the server

Start the server again from its folder. A healthy start prints the node name, map, and uplink
summary (port, max players, max cars), and reports the mesh as *private / LAN* because no
credentials are set. Leave the window open.

## 5. Connect from BeamNG

With the launcher running and signed in (or as a guest), open **NodeMP Multiplayer** in BeamNG
and connect by direct IP to:

```
127.0.0.1:30814
```

Because the connection is loopback, the server trusts it without contacting a backend. You're
in — spawn a car and you're driving on your own server.

## Next steps

- [Configuration](/hosting/configuration/) — every `ServerConfig.toml` key explained.
- [Running the server](/hosting/running/) — build the binary, then run it on Linux (systemd),
  Windows, or Docker.
- [Registering your host](/hosting/registering/) — get on the public server list.
- [Resources & mods](/hosting/resources/) — add server plugins and client mods.
