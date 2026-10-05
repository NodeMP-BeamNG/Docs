---
title: "Start-up messages"
description: "What Node-Server prints when it cannot start, what each message means and how to fix it."
---

## Server start-up messages

For hosts: the lines with which `Node-Server` refuses to start or explains a mistake in
`server.toml`. Players never see them; they are in the console and in `logs/server.log`. Every
one ends the start with `Closing in 10 seconds` and exit code 1, except the last three: the two
directory-certificate lines leave the server running, unlisted, and the client-file line is a
report about one resource.

| Message | Meaning | Action |
|---|---|---|
| `Cannot listen on port … (…): the port is already in use (…). Usually another Node-Server is still running on this machine -- a previous instance that was not stopped, or a second copy started by mistake -- or another program owns the port. Stop it, or give this server a different port with [General] Port in server.toml or --port=<number>. Closing.` | Another process holds `[General] Port`; the first parentheses name `udp` or `tcp`, the last carry the operating system's own words. The other half of the port fails a line later with `Cannot listen on port … (…) either: …`. | Stop the other instance, or change the port. [Running → Logs](/hosting/administration/#logs) |
| `Cannot listen on port … (…): … failed: …. Closing.` | The listening socket could not be opened, bound or put into listening for another reason; the step and the system's words are in the line. | Read the system's words; check that `[General] IP` is an address of this machine. |
| `[General] IP = "…" is not an IP address (…); the server cannot listen. Leave it at "::" to listen on every interface, or give the address of one of this machine's interfaces. Closing.` | `[General] IP` (or `NODE_IP`) does not parse as an address. | Set it to `::`, `0.0.0.0` or one of the machine's addresses. |
| `Error parsing config file value: …: the table […] appears twice. Put the keys into the existing […] table -- the server wrote one with every key in it on the first start -- and remove the second […] line together with the keys under it. The file has not been changed; fix it and start the server again.` | A section header appears twice in `server.toml` - the pasted `[Directory]` block; the first `…` is the file and the line. | Move the keys into the existing table, delete the second header. [Registering](/hosting/registering/#put-the-key-into-the-server) |
| `Error parsing config file value: …: the key … is given twice. Keep one of the two lines. The file has not been changed; fix it and start the server again.` | The same key twice in one table. | Delete one of the two lines. |
| `` Error parsing config file value: …: … -- the line reads `…`. Fix that line and start the server again, or delete the file and the server writes a fresh one with every default. `` | Any other TOML error; the parser's reason and the offending line are quoted. | Fix the line, or delete `server.toml` for a fresh default file. |
| `This machine has no trusted root certificates to verify the directory against (the Windows certificate store is empty and there is no cacert.pem next to Node-Server.exe): put Mozilla's cacert.pem (https://curl.se/ca/cacert.pem) next to the executable, or name a PEM bundle in [Directory] CaFile` | Windows, with a server key set: nothing to verify the directory's certificate with. The server keeps running unlisted. | Put `cacert.pem` from the archive back next to the executable. [Registering → Windows](/hosting/registering/#windows-the-directorys-certificate) |
| `[Directory] CaFile '…' could not be loaded (…): the directory's certificate cannot be verified and this server will not be listed until it can` | `[Directory] CaFile` names a bundle that does not exist, does not parse or holds no certificate. | Fix the path or the file, or leave `CaFile` empty for `api.nodemp.com`. |
| `… · client file '…' has a syntax error: … (the file ships anyway; the game's Lua will very likely refuse it too)` | A resource's client `.lua` file does not parse; the resource's name, the file and Lua's message are in the line. The resource loads and the file is still streamed. | Fix the file and restart. [Resources → Obfuscation](/plugins/resources/#obfuscation) |

Hosts: what to look at on your side when a player quotes one of these rows is on
[Running the server → When a player is refused](/hosting/administration/#when-a-player-is-refused); the
reasons a plugin can send are described in [Recipes](/plugins/recipes/); the `VerifyGame` levels
are in [Configuration](/hosting/configuration/).
