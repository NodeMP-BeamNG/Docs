---
title: "Troubleshooting"
description: "Find your problem by what you see, and go to the page that explains it."
---

The launcher reports problems as toasts at the bottom of its window; a toast stays for a few
seconds. Each message starts with a prefix that says which part failed. Two of them say "the
launcher" and mean the **helper**: the part of the launcher that starts the game and holds the
connection while you play, the same `nodemp-launcher.exe` run a second time without a window. Its
log is `launcher.log` ([Logs](/support/logs/#logs)); the launcher window itself is what shows you the toast.

| Prefix | Who failed |
|---|---|
| `Could not join · …` | Either the client mod check, with no usable `NodeMP.zip` on disk, or a server refusal the launcher explains in its own words: the strict game-file check, the reference manifest, an outdated launcher or server. |
| `Could not start the launcher · …` | The helper process could not be started. |
| `Could not connect · …` | The helper could not reach the server. |
| `Disconnected · …` | The server refused or ended the session; the text is the reason it gave, word for word. |
| `The launcher stopped · …` | The helper exited during the join; the text is the last line of its log. |
| `Session ended · …` | The game was already running when the session ended. |

Every text below is quoted as the software prints it, so you can search this page for it. The
same texts, one line each, are indexed on [Error codes](/support/error-codes/).

- [Can't join a server](/support/joining/) — The launcher's message from a failed join, what it means and what to do, from the client mod check to the game window.
- [Strict servers](/support/strict-servers/) — What a strict server checks on your PC, why it refuses a modified install and how to get in.
- [Sign-in and the server list](/support/launcher/) — When signing in fails or the server list stays empty.
- [Logs and reports](/support/logs/) — Where the launcher, the helper and the game write their logs, and what to attach to a report.
