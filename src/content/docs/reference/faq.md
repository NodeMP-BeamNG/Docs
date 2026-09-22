---
title: FAQ
description: The questions players, hosts and plugin authors asked while reading these pages, answered in a few lines each with a link to the details.
---

Short answers to the questions readers actually asked, each with the page that has the details.
The words used here are defined in the [glossary](/reference/glossary/).

## Players

**Is there a Play button or a hold button?** A hold button: **Hold to play**, held for about a
second. There is no separate *Play*. → [Join a server](/players/join/#joining)

**What is the difference between the launcher and the helper?** The launcher is the window you
see. The helper is the part of it that starts BeamNG.drive and holds the connection while you
play - the same `nodemp-launcher.exe`, run a second time without a window. The toasts call the
helper "the launcher": `The launcher stopped · …` means that background process stopped, and
its log is `launcher.log`. → [Troubleshooting](/players/troubleshooting/)

**Do I need an account to play? What is Test Drive?** No. Test Drive is playing without an
account: you get a fresh `Guest…` name at every join and cannot choose it, and some servers
refuse guests (*Account required* in the panel; the *No account needed* filter hides them). An
account gives you a fixed, verified name and works on every server. The website's registration
page talks to hosts, but it is the same account. Test Drive is not remembered between launcher
starts; a sign-in is. → [Install the launcher → Accounts](/players/install/#accounts)

**Which BeamNG version do I need?** 0.39.4.0, the current release: client mod 1.6.1 is built
for it, and a strict server's reference describes one game version. A copy that is not from
Steam works when **Settings → Game** points at its folder.
→ [Install the launcher → Requirements](/players/install/#requirements)

**Windows warns about an unknown publisher. Is the installer genuine?** The installer is not
code-signed yet, so SmartScreen warns. Compare the file's SHA-256 (`Get-FileHash` in PowerShell)
with the published one in the `.sha256` file next to the installer on the release page; the
Download page shows the same value. → [Install the launcher](/players/install/#download-and-install)

**Does the server check my game files? What about my mods?** Every server checks your install,
at the level its host chose; only a **strict** server also looks at your BeamNG user folder. Your
packed mods in `mods\` are never what refuses you - no level looks there - and they are switched
off during a session unless you enable *Use my local mods in multiplayer* and the server allows
it. What a strict server refuses is what a mod left outside `mods\`: unpacked files under the
user folder's `vehicles\`, `levels\`, `lua\`, `ui\`, `art\`, `scripts\`, or anything added to the
game folder. Remove those; a zip in `mods\` needs no moving.
→ [Join a server → What the server checks on your PC](/players/join/#what-the-server-checks-on-your-pc)

**How do I see the whole list of what a strict server rejected?** The refusal shows three
examples; the diagnostic built into the launcher prints every one, with a reason per line
(`overlay`, `unlisted`, `hash`, …) and what to do about each. The panel under the server's card
offers the command with a **Copy** button. → [Troubleshooting → Strict servers](/players/troubleshooting/#strict-servers)

**What do "Stock content" and "Required mods" mean?** Both are about the **content** a server
sends you before the game starts - its own mod zips, downloaded by the launcher for that session.
`Stock content` means the server sends nothing extra. Neither says anything about your own
install. The loading screen's `Downloading Resource 2/5` is the same content, file by file.
→ [Join a server → The server list](/players/join/#the-server-list)

**Does the launcher update itself?** No. The client mod is updated for you before every join;
the launcher is not. When a server needs a newer one, the join stops with
`Could not join · This server needs a newer launcher — update from the Download page`, and the
[Download page](https://nodemp.com/download) always offers the current version.
→ [Install the launcher](/players/install/#download-and-install)

**Direct Connect "still works" while the server list is down - how?** You join by address
without a join ticket, so nobody verifies your name. A server without a server key takes names as
they come anyway; a listed server that allows Test Drive admits you as an unverified guest; one
with *Account required* refuses the join. → [Troubleshooting → The server list is empty](/players/troubleshooting/#the-server-list-is-empty)

**My message says "Report this if the issue persists". Is my message documented?** Every text
the launcher, the helper or a server can show is quoted on [Troubleshooting](/players/troubleshooting/)
and indexed on [Error codes](/reference/error-codes/); search either page for the exact words.
When you report a problem, attach `launcher.log`, the exact toast text and the server's name.

## Hosts

**Which server version do these pages describe?** The current release, 1.2.1 for the server,
1.1.6 for the launcher, 1.5.0 for the client mod, wire protocol v23; the table on
[What is NodeMP](/introduction/what-is-nodemp/#versions) is the reference. Where an older
server behaved differently, a short `before 1.2.1` sentence says how.

**What do I need before my server can be listed?** A NodeMP account with a verified e-mail and a
linked Discord account (only such an account can create a server key), a machine reachable on
port 30814 TCP and UDP, and the key set in the **existing** `[Directory]` table of `server.toml`.
Without a key the server runs unlisted and is reachable through Direct Connect.
→ [Quick start](/hosting/quick-start/#what-you-need), [Registering your server](/hosting/registering/)

**I pasted the `[Directory]` block from the website and the server exits. Why?** `server.toml`
already had a `[Directory]` table, so the file now defines it twice, which TOML rejects. Delete
the pasted block and set `Url`, `HostId` and `HostSecret` in the existing table. The server
says so itself: `the table [Directory] appears twice. Put the keys into the existing [Directory] table …`.
→ [Registering → Put the key into the server](/hosting/registering/#put-the-key-into-the-server)

**On Windows the log says `TLS handshake failed: certificate verify failed` towards
`api.nodemp.com`. Is the key wrong?** No - the server found no trusted root certificates. On the
current server that means the Windows certificate store is empty and `cacert.pem` is no longer
next to `Node-Server.exe` (put it back); on 1.2.0 and 1.1.0 it happened on every Windows machine,
and the way out until the update is `SSL_CERT_FILE` pointed at a PEM bundle of public roots. Do
not pin `[Directory] Fingerprint`.
→ [Registering → Windows](/hosting/registering/#windows-the-directorys-certificate)

**How do I know the directory's probe reached my port?** The server's log does not say. The
server appears in the launcher's list and at nodemp.com/servers once it did, and a TCP
connection to your public address on port 30814 from outside your network succeeds.
→ [Registering → What the server does with it](/hosting/registering/#what-the-server-does-with-it)

**The server says `Cannot listen on port 30814 … the port is already in use` and quits. Why?** Almost
always a previous instance of the server is still running; stop it, or give this one another port.
The server exits with code 1 so a supervisor notices. (A 1.2.0 server printed `bind() failed` and
even `server is ready` before it quit.) → [Running → Logs](/hosting/running/#logs)

**How do I lift a ban?** Stop the server, then `Node-Server --bans list` shows the entries and
`Node-Server --bans remove <ip | account id>` removes one (both entries, address and account, for
a player banned in a session); start again. Editing `bans.json` by hand with the server stopped
does the same. A running server can also lift one through a resource (`node.bans.remove`).
→ [Running → Bans](/hosting/running/#bans)

**Where are the example resources (`chat`, `demo-numbers`, …)?** In the release archive under
`examples/`, next to `Node-Server`; `examples/README.txt` says what each one does. Copy one into
`resources/` and restart. (The 1.2.0 and older archives did not contain them.)
→ [Resources and content → Installing a resource](/hosting/resources/#installing-a-resource)

**Do I need a Windows PC for `strict`?** For generating the reference manifest, yes: the
generator reads a clean BeamNG install, so it runs where the game is installed. The manifest file
is then copied to the server, Linux or Docker included. → [Strict verification](/hosting/strict-verification/#generating-the-manifest)

**Where are the release notes?** In the release body on GitHub, from 1.2.1 on (the server
repository's `RELEASE_NOTES.md` section for the tag): what changed, whether a default changed,
whether the wire protocol moved. Older releases have a one-sentence body; these pages describe the
current release. A server release that keeps the wire protocol needs no launcher update from your
players. → [Updating](/hosting/updating/)

## Plugin authors

**What is the event naming rule, and what happens to the old names?** A notification is
`<subject><Verb-ed>` (`playerJoined`, `vehicleSpawned`, `serverShutdown`); a request a handler
can deny is `<subject><Action>Request` (`vehicleSpawnRequest`, `relayRequest`); there is no `on`
prefix. Wire events are `<domain>:<verb>` in lowercase (`chat:send`). The spellings servers
before 1.2.0 used - `playerJoin`, `onVehicleSpawnRequest`, `canRelay` and the rest - are
deprecated aliases: they still subscribe to the same event, log one `[deprecated]` warning per
resource per name, and will be removed in 2.0. → [Events → Naming](/plugins/events/#naming)

**Which HTTP methods exist?** `node.http.request(method, url, opts?, cb)` takes any method;
`node.http.get`, `post`, `put`, `patch`, `delete` and `head` are it with the method fixed, and
`node.http.fetch(url, { method = … })` is the coroutine form inside `node.async` (the methods
other than `get` and `post` were added in server 1.2.0; before it `fetch` sent anything but `POST`
as `GET`). Response headers arrive with
lowercased names (`headers["content-type"]`). TLS peer verification is off unless the host sets
`[Http] CaFile`, and then every `https://` request is checked against that bundle.
→ [Concurrency → HTTP](/plugins/concurrency/#http)

**Are there sockets - a `node.net`?** Not yet. The server has no socket API for resources:
what exists is `node.http` towards the outside and wire events, the bus and the module channel
inside. A socket API is on the platform's list, without a date; nothing on these pages describes
one, and nothing should be built on it yet.

**What survives a resource reload, and what is `resourceUnload`?** A reload drops everything the
server half registered - handlers, timers, coroutines, bus and module subscriptions, relay
filters, log sinks - and the whole Lua state, then runs `main.lua` again. `node.storage`, the
files in your folder and the other resources survive; a background job or HTTP request already
in flight is not cancelled, and client files are not re-packaged until a restart.
`node.on("resourceUnload", fn(reason))` runs in the old instance right before the drop, with
`"reload"` or, at a server stop, `"shutdown"`: write what you must and return - nothing started
there runs again. → [Resources → Reload](/plugins/resources/#reload)

**What does a strict server check, and what does it not?** It compares the whole game folder,
every archive's table of contents and the player's user folder with a reference of a clean
install, before the join and again during the session. It does not hash archive contents (CRC-32
tables only), does not check the launcher itself, and does not look into `mods\`. A **strict
session** is a different thing: in-game rules your resource switches on per player with
`session:config.strict`. → [Strict verification](/hosting/strict-verification/#what-strict-does-not-check),
[Client scripting → Strict sessions](/plugins/client-scripting/#strict-sessions-sessionconfigstrict)

**How do I test a plugin without the game?** Everything server-side runs without a player.
A chat command is exercised through the bus contract `chat` speaks: publish
`chat:command` with `{ pid, name, args, raw }` (lowercase `name`) and watch the reply on
`chat:say`. A wire event handler needs a client, and client files run only inside the game.
→ [Getting started → Testing without the game](/plugins/getting-started/#testing-without-the-game)

**Why does `/HELLO` not reach my handler when I publish `chat:command` myself?** `chat`
lowercases the typed word before it publishes and `node.commands.add` lowercases the registered
name; the lookup itself is exact. A `chat:command` you publish must carry the lowercase name.
→ [Recipes → A chat command](/plugins/recipes/#a-chat-command)

**`node.on` with the same function twice - once or twice?** Once: the second call replaces the
first, and `node.off(name, fn)` removes it. Two different functions are two handlers.
→ [Conventions → Return shapes](/plugins/conventions/#return-shapes)

**Why did my 600 ms timer callback not trigger the stall warning?** On the current server it does:
every handler, timer callback, coroutine slice and completion callback is timed on its own, and the
line names the resource and the kind (`(resource race, timer)`). Before 1.2.1 only whole worker
jobs were timed, which left timer callbacks and `node.async` slices unreported.
→ [Concurrency → One worker thread](/plugins/concurrency/#one-worker-thread)

**Is a syntax error in my client file reported by the server?** Yes, at load: every client file is
parsed when it is packaged, and one that does not parse gets an `Error` line naming the resource,
the file and the Lua message, whatever the obfuscation setting. The file still ships (the server
runs no client code), and the game's own compile error is in the player's `beamng.log`. Before
1.2.1 the only sign was Prometheus's warning, with obfuscation on. → [Resources → Obfuscation](/plugins/resources/#obfuscation)

**Where are the examples, and where is `chat`?** Under `examples/` in the release archive, next
to the server executable (`examples/README.txt` lists them). `chat`'s protocol - `chat:send` and
`chat:msg` on the wire, `chat:command` and `chat:say` on the bus - is documented, so a stand-in
is a few lines. → [Events → node.bus](/plugins/events/#between-resources-nodebus)

**Can a resource overwrite a file of the game or of the client mod with a client file of its
own?** No. Streamed client files are compiled in memory under the resource's own name and never
written to the player's disk, so they add modules and hooks beside the originals and shadow
nothing. Change behaviour at run time instead: the same events, a `ge` extension of your own, the
module manifest that switches a built-in client module off.
→ [Client scripting → What a client file can and cannot do](/plugins/client-scripting/#what-a-client-file-can-and-cannot-do)

**How do I check that a file exists, create a folder, rename or copy a file with `node.fs`?**
`node.fs` has `read`, `write`, `writeAsync` and `list`, nothing else. Exists: look the name up in
`node.fs.list(folder)`. A folder: `node.fs.write` creates the parents of the path it writes. Copy:
`node.fs.write(to, node.fs.read(from))`. Rename and delete: the standard `os.rename` and
`os.remove`, with an absolute path built from the resource folder. Write paths with `/` on
Windows and Linux alike. → [Resources → What node.fs does not have](/plugins/resources/#what-nodefs-does-not-have)

**Is there a `fileChanged` event?** No, and the server watches no files. Poll with `node.every`,
comparing the sizes `node.fs.list` reports or a hash of the content.
→ [Events → No file-watch event](/plugins/events/#no-file-watch-event)

**Random numbers, execution time, memory use, the operating system - where?** Standard Lua for
the first three: `math.random()` and `math.random(a, b)` (seeded for you), `node.server.uptime()`
before and after a section, `collectgarbage("count")` for this resource's state. There is no total
over all states, no per-handler statistics and no OS name or version in `node`.
→ [Conventions → The Lua environment](/plugins/conventions/#the-lua-environment)

**Can `node.json` pretty-print, or diff and patch two documents?** No. `node.json.encode` writes
compact JSON and takes no options; there is no diff, patch or flatten.
→ [Conventions → The Lua environment](/plugins/conventions/#the-lua-environment)

**Can the server call my language host from several threads?** No. Every delivery to a hosted
resource arrives on the single framework worker, one at a time; `NodeLanguageHost` has no flag
for anything else, and none is scheduled. A host with its own event loop hands callbacks over
itself, as `js-host` does; `NodeApi` calls, the relay filter and `submit_job` work run off the
worker already. → [Native modules → Language hosts](/plugins/native-modules/#language-hosts)
