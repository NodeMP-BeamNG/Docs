# Docs: audit and structure (2026-10-19)

Foundation for the rewrite of the documentation: what is wrong now, which page owns which fact, and the structure the Russian rewrite follows. Rules for the text itself are in `STYLE.md`. The pilot, the players section in Russian, is in the same pull request; it follows this plan. The owner's decisions of 2026-10-19 are in section 10; the work order is section 12.

What the facts are checked against: the new docs describe the next release and go live with it, so facts follow the code of the release the docs ship with, today the `main` of each repository. For the server and the two launcher repositories `main` equals the released code apart from comments (compared with comments stripped: the server and `UI-launcher` differ from their tags in comments only; `launcher` also in one test script, `run/strict_test.py`). The client mod's `main` is ahead of the released mod. Facts that differ from what players have now are listed in the pull request description, with the page and the version.

## 1. Summary

- 42 hand-written pages per language (and 5 generated API pages, out of scope). The pilot adds one: 43. The proposal below ends at 44 (players +1, configuration guide +1; FAQ and updating stay).
- Every page repeats facts that have a better home elsewhere. The biggest clusters: refusal messages and strict-check advice (players/troubleshooting, reference/error-codes, hosting pages), the join steps (what-is-nodemp, players/join, protocol), "what the player sees" paragraphs on three hosting pages, the examples table (two pages), guest names, versions and ports (6 to 8 pages each). Section 4.
- The code disagrees with the text in the players section on 14 points (section 5, appendix A): a button that does not exist, a setting that does not exist, a wrong menu path (five places per language), a wrong rule for guest names, and more. Two of the 14 (rows 5 and 6) hold only on the client mod's `main`, the target; in the released mod the old text was right. Other sections: 5 findings so far, one of them unverified; the rest was not checked line by line (section 2).
- The Russian is not machine-sounding in the way the owner described: the stale-phrase list (`данный`, `осуществлять`, `является`, `позволяет`, `Важно отметить`) matches almost nothing (1 `позволяет` in all RU pages). What is wrong is structure and rhythm: Russian pages mirror the English ones heading by heading and sentence by sentence (75k vs 72k words), 473 spaced dashes and 340 bold spans in 24k words, announcements instead of content, calques, English interface words left in Russian text. Section 6.
- The structure change is small on purpose: every merge or split below has evidence. No URL disappears, so there are no redirects to add; the configuration split moves anchors, which are retargeted (section 9).
- Product versions: 14 English pages state one (13 Russian after the pilot), 51 mentions of a three-part number, plus the wire protocol number on three pages. The owner's decision removes all of them (section 11).

## 2. How the audit was done, and how far it goes

| Depth | Pages | What was done |
|---|---|---|
| Full | the 6 players pages, both languages | Every claim checked against `UI-launcher` (`ru.ts`, `en.ts`, components, `joinErrors.ts`, `session.ts`, Rust side), `launcher` (`Integrity.cpp`, `ContentSync.cpp`, `Tls.cpp`, `GameLauncher.cpp`), `NodeMP` (`settingsSchema.lua`, `strings.js`, `runtime.js`, `chat.lua`, `strict.lua`, input actions), `server` (`Config.cpp`, `Settings.cpp`, `Network.cpp`, `Chat.cpp`), `Backend` (`device.go`, `play.go`) and `Website` (`messages/ru.json`). |
| Read | `what-is-nodemp` (both languages), `faq` and `glossary` (English), `error-codes` (English, first 120 lines), `index` (English; the Russian front page by its link list) | The parts that repeat or contradict the players pages. |
| Read | `hosting/quick-start`, `windows`, `linux`, `docker`, `mods`, `resources`, `strict-verification`, parts of `administration`, `troubleshooting`, `configuration`, `registering`, `join-queue` | English read; Russian sampled; claims checked against code only where a claim touched the players section or was cheap to grep. |
| Diff | the 11 pages of PR #20 (`plugins/bus`, `chat`, `concurrency`, `database`, `events`, `examples`, `getting-started`, `http`, `overview`, `resources`, `storage`) | Read the diff, not the pages. |
| Scan | everything else | Headings, automated duplicate detection (8-word windows, repeated code spans) and pattern counts on the Russian text. |

`node scripts/check-claims.mjs` with the five repositories is clean on `main` (84 pages, 6 checks, 4 allowlisted) and on this branch. It covers config keys and defaults, CLI help, kick and refusal texts, event names, versions and protocol tables; none of the 14 players findings is in its scope.

Things the audit did not do: it did not read the plugin pages line by line against `api.toml` and the Lua runtime, and it did not check the hosting tables beyond what `check-claims` does. "No wrong facts found" for a page in section 7 means "none found at the depth stated", not "verified".

## 3. Who owns what

One row per fact that today lives on more than one page. The home is the page that explains it in full; the others give a link and at most one sentence.

| Fact | Home | Repeated on (to become a link) |
|---|---|---|
| Product versions | none: the docs state no product version (STYLE rule 13); the table in `what-is-nodemp#versions` goes | `hosting/quick-start`, `windows`, `linux`, `docker`, `updating`, `players/install`, `faq` (section 11) |
| Requirements, installing, SmartScreen, first start, launcher updates, client mod location | `players/install` | `faq`, `glossary`, `what-is-nodemp` |
| Registration rules, browser sign-in, Test Drive and guest names, account bans | `players/sign-in` | `faq`, `glossary`, `players/install` (ban window) |
| Server list, filters, card, Direct Connect, the join steps, queue as the player sees it | `players/join` | `what-is-nodemp` (4-step list), `hosting/quick-start` (join your server), `hosting/join-queue` (what the player sees), `protocol` (order of a join keeps its own, packet-level view) |
| Session panel, chat as a player uses it, keys, leaving | `players/in-game` (new) | `players/join`, `players/settings` (until this PR) |
| Launcher settings, the NodeMP tab, locked rows, scheduled changes as a player sees them | `players/settings` | `hosting/configuration` (what players see), `plugins/players-and-vehicles` (scheduled changes) |
| Drops, VPN, lag | `players/connection` | `players/join`, `players/troubleshooting`, `faq` |
| TLS handshake failure at the door (cause on the host's side) | `hosting/troubleshooting#players-are-refused-at-the-door` | `players/connection`, `hosting/administration`, `faq` |
| What to do about a symptom; strict-check clean-up; where the logs are | `players/troubleshooting` | `error-codes`, `faq` |
| The text of every message and what it means | `reference/error-codes` | `players/troubleshooting` (refusal table, until this PR), `hosting/join-queue`, `hosting/administration` |
| What the strict file check compares, manifest, rechecks | `hosting/strict-verification` | `players/join`, `players/troubleshooting`, `hosting/configuration`, `glossary`, `faq` |
| Strict session (client-side rules a resource switches on) | `plugins/client-scripting#strict-sessions` | `players/settings` (effect only), `players/in-game` |
| Join queue rules and limits | `hosting/join-queue` | `players/join`, `error-codes` |
| Server install per system, firewall, autostart | `hosting/windows`, `linux`, `docker` | `quick-start`, `faq` |
| The default port, every setting and its default | `hosting/configuration` (the table of every key; the server writes this URL) | `quick-start`, `docker`, `troubleshooting`, `faq`, `join` (8 pages mention `30814`) |
| How `server.toml` works, environment variables, command line, the settings hosts change most | `hosting/server-toml` (new guide, from `configuration`) | `quick-start`, `docker`, `faq` |
| Listing: key, fingerprint, list picture and links, why a server is missing | `hosting/registering` | `hosting/troubleshooting`, `faq`, `glossary` |
| Mods and maps | `hosting/mods` | `players/join` (card), `plugins/client-scripting` |
| Installing, configuring and reloading a resource; obfuscation | `hosting/resources` | `plugins/resources`, `plugins/getting-started`, `glossary`, `docker`, `linux`, `windows` |
| The example resources | `plugins/examples` | `hosting/resources` (9-row table), `faq` |
| Console, kicks and bans for hosts | `hosting/administration` | `faq`, `plugins/chat` (moderator commands), `plugins/players-and-vehicles` (API) |
| Threads, the 250 ms rule | `plugins/concurrency` | `plugins/overview`, `plugins/conventions`, `plugins/events`, `plugins/migrating`, `plugins/native-modules` |
| Errors in handlers | `plugins/conventions#errors-in-handlers` | `plugins/resources#errors`, `getting-started` step 9, `overview` |
| Event naming and the renamed events | `plugins/events#kinds-of-events`; the list in the API reference | `plugins/conventions#names`, `faq`; the "Old event names" section is removed (see STYLE) |
| Colour codes in chat | `plugins/chat` | `players/settings` (until this PR), `players/in-game` (link) |
| Wire protocol | `reference/protocol` | `what-is-nodemp` |
| Terms | `reference/glossary` | all |
| Other platforms | `plugins/migrating` (the only page that names them) | `plugins/overview`, `what-is-nodemp` (links only) |

## 4. Duplicates found, by cluster

1. Refusals and what to do. `players/troubleshooting` carried a 10-row refusal table and a 4-row strict table; 67 eight-word windows are shared with `reference/error-codes` (the largest overlap on the site). `hosting/administration` and `hosting/troubleshooting` repeat the reasons from the host's side; `faq` repeats three of them.
2. The join. Four steps in `what-is-nodemp`, seven in `players/join`, the same in `protocol#the-order-of-a-join`, "join your server" in `hosting/quick-start`.
3. "What the player sees". `hosting/join-queue`, `hosting/strict-verification`, `hosting/configuration` (other players' cars) each retell a launcher page.
4. Examples. The same nine resources in `hosting/resources` and `plugins/examples`.
5. Threads. "All handlers on one worker thread, 250 ms" on `overview`, `concurrency`, `conventions`, `events`, `native-modules`, `migrating`.
6. Errors in handlers on `resources`, `getting-started`, `conventions`, `overview`.
7. Reload: `hosting/resources`, `plugins/resources`, `getting-started` step 8, `faq`.
8. Strict check: described on 13 pages (players/join, settings, troubleshooting, error-codes, protocol, administration, configuration, strict-verification, client-scripting, js-host, updating, faq, glossary), with "strict server" (file check) and "strict session" (client rules) mixed up on `players/settings`.
9. Test Drive on 11 pages; guest name stated wrongly on 3 (section 5).
10. Versions and the port: `1.13.0` on 6 pages, `1.2.0` on 3, `0.39.4.0` on 5, `30814` on 8. `check-claims` keeps them consistent, but each is a place to forget on release. The versions go entirely (section 11); the port stays and is repeated only where a page needs it.
11. Launcher.cfg and the helper's files: `players/settings`, `error-codes`, `troubleshooting`.
12. Time-bound text in the body: "since 1.7.5", "since client mod 1.7.6", "Settings since 1.9.0", "Resources since 1.10.0", "NodeMP's new service" (updating), the "keys made before NodeMP restarted" box (registering), "Old event names" (events). STYLE rules 6 and 13.

## 5. Wrong against the code

Found and fixed in the pilot (players section, Russian). The English pages keep their text in this run; they still carry these errors. Rows 5 and 6 are true only on the client mod's `main`, which is the target; in the released mod the Debug section and the "Hold other cars tightly" row exist and the old text was right. The other 12 rows were checked against `main` only.

| # | Page | The text said | The code says | Evidence |
|---|---|---|---|---|
| 1 | sign-in, install | Ban window has an **Appeal** button that opens the page to contest the ban | Two buttons: **Закрыть** and, only if NodeMP names a support address, **Написать в поддержку**. No appeal | `UI-launcher/src/components/BannedScreen.svelte`, `ru.ts` `ban.support` |
| 2 | sign-in (also faq, glossary) | A new guest name every session | `Guest-XXXXX`, five characters from a fixed alphabet, derived from the launcher's install id: the same on every join from this install | `Backend/.../play/internal/app/play.go` `GuestName`; `store.svelte.ts` comment on `identityFor` |
| 3 | install, settings, troubleshooting (also `error-codes` twice) | **Settings → Launcher → Client mod → Check now** | The **Client mod** block is on the **Game** page: **Настройки → Игра → Клиентский мод → Проверить** | `SettingsView.svelte` (game page, `settings.clientMod`) |
| 4 | join | Card shows "Stock content" when the server sends nothing; **It will send you** lists the mods you do not have | The card's **Контент** row reads **Отсутствует** (`detail.stock`); **Что придётся скачать** is the title of the list of all the server's files | `ServersView.svelte`, `ru.ts` |
| 5 | settings | A **Debug** section with a **Tools** button | Mod `main` only: three sections, Players, Chat, Cars & network. The debug rows were removed in settings version 4; the diagnostics window is a key binding. The released mod still has the section | `settingsSchema.lua` `CATEGORIES`, `OBSOLETE_V4` |
| 6 | settings, connection (also `hosting/configuration`) | A setting "Hold other cars tightly" | Mod `main` only: no such row. `nodemp.sync.holdTight` is in the list of removed settings (the released mod has the row). The server key `[sync] hold_tight` still pins that setting (`Config.cpp`); what the mod does with a pin for a removed setting was not checked | `settingsSchema.lua` `OBSOLETE_V4`; `server/src/core/Config.cpp` |
| 7 | settings | "Locked by the strict session" means a strict server turned it off | A strict session is a different thing from a strict server: a server resource switches client rules on (no free camera, no cars the server did not seat, no console or editor, local mods off) | `NodeMP/.../sys/strict.lua`; `plugins/client-scripting#strict-sessions` |
| 8 | join | Local mods are off during a session unless the player turned them on and the server allows it | Also forced off in a strict session: the row **Мои локальные моды в мультиплеере** is pinned to off | `settingsSchema.lua` (`pin = { strict = true, value = false }`) |
| 9 | join, in-game | RU text: "Leave", "следить за игроком", "перенести камеру" | Russian game shows **Выйти**, **Наблюдать** (you sit in his car as a passenger), **Камеру к нему** (free camera 7 m behind, 3 m up). Both look-at buttons are refused in a strict session | `nodemp-hud/runtime.js`, `view/ui.lua` |
| 10 | join (RU) | Button **Connect** on the site | RU site: **Подключиться** | `Website/messages/ru.json` `servers.detail.connect` |
| 11 | sign-in | Countdown example `4:59` | The code lives 10 minutes | `Backend/.../auth/internal/app/device.go` `deviceTTL` |
| 12 | sign-in | Row "Browser sign-in is not available here…" | No such text in the launcher, the backend or the site. Dropped | grep over `UI-launcher`, `Backend`, `Website` |
| 13 | troubleshooting | User-folder trees that count as an overlay: `levels`, `lua`, `ui`, `art`, `scripts` (and leftovers in `vehicles`) | `gameplay` is on the list too | `launcher/src/game/Integrity.cpp` `OverlayTrees` |
| 14 | install, troubleshooting | The **Update channel** and **Go back** rows are always there; the log path is **Settings → Launcher → Logs** | Channel row only in builds that carry more than one update key; **Go back** only when a previous version is cached; logs are under **Папки → Логи → Открыть** | `SettingsView.svelte` |

Also corrected, not errors of fact but statements that were wrong in effect: the PowerShell caveat and exit codes of the diagnostics command (the path is quoted only when it contains a space, and PowerShell then needs `& `), the launcher texts that exist only in English (join step captions, the strict-check block, the game check line, the key names), the chat's Enter and Esc behaviour.

Found outside the players section, not fixed (their own sections will):

- `reference/error-codes` rows for the client mod and the outdated mod: wrong menu path (3 above), in both languages.
- `reference/faq` and `reference/glossary`: guest name (2 above).
- `hosting/configuration`, row `[sync] hold_tight` (6 above; on mod `main` the key pins a setting the mod no longer shows).
- `introduction/what-is-nodemp`: "the client mod is built for 0.39.4.0". The mod only checks the 0.39 branch and shows a toast for another one (`scripts/NodeMP/modScript.lua`).
- `hosting/quick-start`, `linux`: "glibc 2.38 and libstdc++ of GCC 13" is not in any repository checked; the Dockerfile builds on Ubuntu 24.04. Not verified, not known to be wrong.

## 6. The Russian text: what is wrong with it

Measured on all 42 pages (before the pilot): 23,985 Russian words outside code, 340 bold spans, 473 spaced dashes.

| Problem | Evidence | Pages |
|---|---|---|
| Mirrors the English page: same headings, same order, one sentence per sentence | EN 75k words, RU 72k; headings identical in structure on every page | all |
| Announcements and signposts instead of content | "Сначала о том, как файл себя ведёт, потом о настройках…" (`configuration`), "Здесь — как одно ложится на другое" (`migrating`), "Дальше раздел говорит…" (`overview`), a closing "Что дальше" list on 5 pages (`docker`, `linux`, `windows`, `quick-start`, `getting-started`), "Куда дальше", "Вам сюда" (`what-is-nodemp`) | many |
| Metaphor and calque | "живёт", "ложится", "уходит", "держите кнопку", "без лишних движений", "Ресурсы не делят переменные", "Что видно" | `configuration`, `migrating`, `database`, `what-is-nodemp`, `bus`, `sign-in` |
| Dashes and bold everywhere | 473 and 340; bold lead-in on list items; tables for one-dimensional lists | `players/settings` (38 bold), `error-codes` (44), `players/join` (26), `protocol` (32 dashes), `configuration` (44 dashes), `faq` (23 dashes in 732 words) |
| English interface words in Russian text | "Leave", "Connect", "Direct Connect", "Hold to play" where the Russian interface has **Выйти**, **Подключиться**, **Прямое подключение**, **Зажмите для игры** | `players/*`, `glossary` |
| Fact errors inherited from the English text (section 5) | 14 in the players section | `players/*`, `faq`, `glossary`, `error-codes` |
| History in the body | "since 1.7.5", "keys made before the restart", "old event names" | `events`, `registering`, `updating`, `mods` |
| Terms unsettled | ресурс/плагин (decided: плагин, section 10); помощник/хелпер; хост/сервер | `plugins/*`, `players/troubleshooting` |
| Machine phrases | `данный` 0, `осуществлять` 0, `является` 0, `позволяет` 1 (`what-is-nodemp`), `Важно отметить` 0 | none to speak of |

PR #20 fixes a good part of the first four on the 11 plugin pages and adds new errors (STYLE lists them). It is the base for those 11 pages in the next run, with the STYLE corrections applied on top.

## 7. Page by page

Words are English / Russian, outside code. "Home" means the page that owns the fact (section 3).

### Start

| Page | Covers | Shares | Wrong | Russian |
|---|---|---|---|---|
| `index` (403/385) | Front page, links to 21 pages | Link titles copy page titles; `ru` still read "Настройки и управление" (fixed in the pilot) | none found | not read in detail |
| `introduction/what-is-nodemp` (429/387) | Parts table, the join in 4 steps, versions, where next | Join steps -> `players/join`; versions are the home; "where next" is the sidebar | "built for 0.39.4.0" (section 5) | "позволяет кататься", "без лишних движений", "Вам сюда", "Куда дальше", "держите **Зажмите для игры**" |

### Players (pilot, done in Russian)

| Page | Covers | Shares | Wrong | Russian |
|---|---|---|---|---|
| `players/install` (606/522) | Requirements, install, first start, client mod, launcher updates, game not found | Ban window -> `sign-in`; "Connection lost" screen -> also in `troubleshooting` | 1, 3, 14; missing: maintenance screen | one-to-one with English; "Подать апелляцию" |
| `players/sign-in` (607/507) | Account, browser sign-in, Test Drive, account in the launcher, bans | Test Drive on 11 pages; ban window again in `install` | 1, 2, 11, 12 | table headers "Что видно / Что сделать" |
| `players/join` (1041/875) | List, card, Direct Connect, join steps, queue, check, in the game, leave | "In the game" and "Leave" belong to a different page; check duplicates `strict-verification`; queue duplicates `join-queue` | 4, 8, 9, 10 | "Leave", "Connect" left in English |
| `players/settings` (1118/983) | Launcher settings, NodeMP tab, chat, keys, Launcher.cfg | Chat and keys are controls, not settings; colour codes duplicate `plugins/chat`; scheduled changes duplicate `configuration` | 3, 5, 6, 7 | 38 bold, one big table |
| `players/connection` (593/537) | VPN, drops, lag, messages | Drop behaviour repeated in `join`, `troubleshooting`, `faq`; TLS message repeated in `hosting/troubleshooting` | 6 | "Что видно", "Сообщения, которые можно увидеть" |
| `players/troubleshooting` (1311/1141) | Refusals, strict check, mods, game, drops, empty list, helper, what to send | Refusal table = `error-codes` (67 windows) | 3, 13 | table cells half English |

### Hosting a server

| Page | Covers | Shares | Wrong / unverified | Russian |
|---|---|---|---|---|
| `hosting/quick-start` (564/496) | Needs, five steps, first start, name/map/slots, join | "Join your server" -> `players/join`; tag and checksum text -> per-OS pages; port `30814` | glibc 2.38 not found in code | "Что дальше", bold lead-ins, `Предупреждение … — это нормально` |
| `hosting/windows` (381/353) | Download, unpack, firewall, autostart | Checksum steps with `linux`; "Next" list | none found | "Что дальше" |
| `hosting/linux` (390/358) | Download, Lua 5.1, port, systemd | as `windows`; Lua 5.1 text with `docker`, `resources`, `glossary` | `NODE_LUA` and Lua 5.1 confirmed in `Dockerfile` | "Что дальше" |
| `hosting/docker` (538/489) | Image, container model, run, Compose, console | `server.toml` vs variables with `configuration`; Lua with `linux` | uid 10001 confirmed in `Dockerfile` | "Что дальше" |
| `hosting/configuration` (3405/3164) | How the file works, env, CLI, every setting; splits into the guide `hosting/server-toml` and the table that stays here | "Other players' cars" retells `players/settings` (27 windows with `players-and-vehicles`); `[integrity]` rows repeat `strict-verification` | `hold_tight` (6, mod `main` only); defaults checked by `check-claims`; "before 1.9.0" and "since 1.12.0" | announces its own structure; 44 dashes |
| `hosting/registering` (1590/1397) | Key, settings, listing, picture, fingerprint, why not listed | "Not in the list" table repeated in `hosting/troubleshooting` and `faq`; history box about keys made before the restart | Discord requirement matches `discord_required` on the site | bold lead-ins; history box |
| `hosting/mods` (437/389) | Adding mods and maps, protected mods | "How players get mods" -> `players/join`; "since client mod 1.7.6" | none found | calm |
| `hosting/resources` (741/655) | Install, examples, `[config]`, reload, obfuscation, modules | Examples table = `plugins/examples`; reload = `plugins/resources` | none found | "плагин" throughout (decided) |
| `hosting/administration` (1071/955) | Console, kicks, bans, restart, log, "A player can't get in" | Last section = `hosting/troubleshooting`; kicks API = `plugins/players-and-vehicles` | commands covered by `check-claims` | 18 dashes |
| `hosting/join-queue` (1128/987) | Who waits, how, limits, what the player sees, console, plugins | "What the player sees" = `players/join`; refusal wording = `error-codes` | keys covered by `check-claims` | bold lead-ins (12) |
| `hosting/strict-verification` (918/777) | What it checks, manifest, rechecks, what players see | "What players see" = `players/troubleshooting`; summary = `players/join` | recheck 600 s confirmed | calm |
| `hosting/updating` (1418/1298) | Version, install per system, what survives, old-version migrations, new launcher; stays one page, migrations and versions go | Migrations "since 1.9.0 / 1.10.0 / the new service" are history; protocol text = `error-codes` | tables vs `Config.cpp` legacy names consistent; 20 version mentions, the most of any page | 8 "вы"-forms, history |
| `hosting/troubleshooting` (1009/905) | Start, reach, door, Docker, listing, lag | "Door" = `players/connection`; "Not listed" = `registering`; "Lag" = `players/connection` | messages covered by `check-claims` | calm |

### Plugin development

All 17 pages: depth Scan, and Diff for the 11 pages of PR #20.

| Page | Covers | Shares | Notes |
|---|---|---|---|
| `plugins/overview` (580/503) | Kinds of plugins, halves, how code runs, where to start | Threads -> `concurrency`; halves -> `resources`, `client-scripting` | PR #20 edit; "Рекомендуется" |
| `plugins/getting-started` (962/865) | A resource step by step | Reload, errors, event naming each repeat a home | PR #20 edit; its `msg.text[0]` example is invalid Lua |
| `plugins/resources` (967/878) | Files, `resource.toml`, Lua environment, reload, errors | Reload = `hosting/resources`; errors = `conventions` | PR #20 renames the title to "плагина" |
| `plugins/events` (1008/912) | Kinds, join order, refusing, reserved slots, unsubscribing, rates, old names | Old names = `faq`, `conventions`; join order = `protocol` | PR #20 removes "Старые имена"; "ивент" |
| `plugins/players-and-vehicles` (1387/1246) | Players, vehicles, kicks, scheduled changes | Scheduled changes = `configuration`, `players/settings` | not read in detail |
| `plugins/chat` (932/851) | Chat path, commands, moderators | Colour codes, moderator commands | PR #20 edit; `:::caution` for one line |
| `plugins/concurrency` (820/755), `storage` (587/546), `database` (971/874), `http` (496/445), `bus` (624/575) | One topic each | `http`: `allow_private_networks` also in `configuration`, `faq`, `updating` | PR #20 edits; `<rewrite this text …>` notes left in `database` and `storage` |
| `plugins/client-scripting` (1292/1162) | The client half, strict sessions, binary data | Obfuscation, strict check, content-folder mods | not read in detail |
| `plugins/conventions` (637/588) | Failure, handler errors, names, ids, versions, memory | Errors, names, 250 ms all repeat a home | grab-bag; keeps failure, ids, versions, memory |
| `plugins/native-modules` (857/775), `js-host` (673/625) | Other languages | Threads; `[resources] trusted` | not read in detail |
| `plugins/examples` (580/511) | The example resources, built-from-source plugins | Table = `hosting/resources` | PR #20 edit |
| `plugins/migrating` (1283/1167) | Moving from other platforms | Several "differences" repeat pages they link to | the one page that names other platforms |

### Reference

| Page | Covers | Shares | Wrong | Russian |
|---|---|---|---|---|
| `reference/error-codes` (3020/2747) | Launcher notifications, refusals and kicks, helper exit codes | Players' refusal table; join-queue wording | 3 (two rows) | 44 bold, table cells half English |
| `reference/faq` (972/841) | 25 questions; stays as questions, each answered by a link | Every answer repeats a home | 2; "since 1.9.0" | "Подробнее — на странице …" nine times |
| `reference/glossary` (745/671) | Terms | arbiter | 2 | calm |
| `reference/protocol` (2720/2382) | Wire protocol v23 | "Order of a join" = `players/join` | tables checked by `check-claims` | 32 dashes |

## 8. Proposed structure

Players: 6 -> 7. Hosting: 13 -> 14. Plugins: 17 -> 17. Reference: 4 -> 4. Start: 2 -> 2. Total 42 -> 44 (43 after this PR). Page names and places below are decided (section 10).

**Start**
- `index`: unchanged; links follow the pages.
- `introduction/what-is-nodemp`: parts and a two-line pointer to `players/join` instead of the 4 steps. The versions table goes (section 11).

**Players** (done)
- `install` (owns requirements, install, launcher and mod updates), `sign-in` (account, Test Drive, bans), `join` (list, card, Direct Connect, steps, queue), `in-game` (new: session panel, chat, keys, leaving), `settings` (launcher and game settings, locked rows, scheduled changes), `connection` (VPN, drops, lag), `troubleshooting` (symptoms, strict clean-up, logs; messages link to `error-codes`).
- Reason for `in-game`: chat and keys are not settings, the panel and leaving are not part of joining; the old page was called "Settings and controls".

**Hosting**
- `quick-start`: five steps; drops "join your server" (link to `players/join#подключиться-по-адресу`).
- `windows`, `linux`, `docker`: kept; the "Next" lists go; the checksum and port steps stay per system because the commands differ. File names and the image tag in the commands carry `<версия>` and `<тег>` instead of a number (STYLE rule 13).
- `server-toml` (new, the guide, split from `configuration`): how the file works, the settings hosts change most (as links to the table, not repeats), environment variables, command line. Title «Настройка сервера» / "Configuring the server". The name is the file hosts look for; the place is next to the table in the Hosting group.
- `configuration`: becomes the reference table of every key by table, with type, default and environment variable. The title becomes «Справочник настроек» / "Settings reference"; the URL stays: the released server writes `https://docs.nodemp.com/hosting/configuration/`, without an anchor, into its warning and into every generated `server.toml` (`Config.cpp`, identical in the 1.13.0 tag). Reason for the split: 2k of the 3.4k words are a lookup table found by key name, and the other 1.4k a guide read once.
- `registering`, `mods`, `strict-verification`, `join-queue`, `administration`, `troubleshooting`: kept; their "what the player sees" and "a player can't get in" sections become one-line links.
- `resources`: keeps install, `[config]`, reload, obfuscation, native modules; the examples table goes (link to `plugins/examples`).
- `updating`: stays one page: the steps per system, what survives, what the launcher does when it is too old. No versions and no migrations: "settings since 1.9.0", "resources since 1.10.0" and "NodeMP's new service" go, and there is no `upgrade-notes` page.

**Plugins** (unchanged page list)
- `overview` loses "How code runs" (link to `concurrency`); `conventions` keeps failure, errors in handlers, ids that last, the version calls (`node.server.version()`, `protoVersion()`) and memory and time, and hands "Names" to `events`; `events` loses "Old event names".
- Plugin pages are rewritten from PR #20 as the base; the title of `getting-started` becomes «Первый плагин», of `resources` «Устройство плагина».

**Reference**
- `error-codes`: the home of messages, unchanged in structure.
- `faq`: stays as a short list of questions, each answered only by a link to the page that owns the fact. It is written last, because the answers point into every other page.
- `glossary`: the arbiter; gains "strict session" and the Russian interface words; «плагин» and «ресурс» as in section 10.
- `protocol`: unchanged; the only page that states the protocol version.

## 9. Redirects and anchors

Both locales (the `withLocales` helper adds `/ru` itself). No URL disappears: the FAQ stays and the configuration table stays at its URL, so no redirect is added. The split moves anchors, and a fragment cannot be redirected, so inbound links are retargeted instead.

| Old | New | When |
|---|---|---|
| `/support/faq/` (existing redirect) | still `/reference/faq/`; the FAQ stays, so nothing to retarget | no change |
| `/hosting/command-line/` (existing redirect, now to `/hosting/configuration/`) | `/hosting/server-toml/`, where the command line moves | hosting section |
| `/hosting/configuration/#how-the-file-works`, `#what-people-change-most`, `#environment-variables`, `#command-line` | `/hosting/server-toml/#…` | hosting section, links retargeted |
| `/hosting/configuration/#every-setting` (`docker` links to it) | `/hosting/configuration/`: the page is the table, there is no such heading | hosting section |
| `/hosting/configuration/#queue`, `#vehicles` and the other per-table anchors | unchanged; the headings stay on the table page | none |
| `/hosting/updating/#settings-since-190`, `#resources-since-1100`, `#nodemps-new-service` | none; the sections go and the links to them (`configuration`, `faq`) go with them | hosting section |

The pilot changes no URL: the players pages keep their slugs, `in-game` is new. Inbound anchors that changed in Russian were retargeted: `ru/reference/glossary` (`#войти` -> `#вход-на-сервер`) and `ru/reference/error-codes` (`#сообщения-которые-можно-увидеть` -> `#сообщения-о-сбоях-связи`). `index.mdx` and the sidebar gained the new page in both locales; the English `settings` page is retitled "Settings".

## 10. Decisions (owner, 2026-10-19)

Decided:

1. Term: «плагин» everywhere, as Igor wrote it in PR #20. «Ресурс» stays only where the folder `resources/` itself, or a field or API named after it, is meant (`resource.toml`, `node.resources`, `[resources]`, `resourceUnload`). Applied in this PR: STYLE, both glossaries (the English keeps "resource" as a term wherever the code says resource; the Russian says how the two words relate), `scripts/check-stale.mjs` (Cyrillic «ресурс» on a rewritten Russian page), the pilot pages. The plugin pages follow in section 1 of the work order.
2. What the facts are checked against: the docs describe the next release and go live with it, so facts follow the code of the release they ship with, today the `main` of each repository (for the launcher and the server equal to their released code apart from comments). Every fact that differs from what players have now is listed in the pull request description, with the page and the version. STYLE rule 1 says so; the reviewer's "check against the release tag" is replaced.
3. FAQ: stays as a short list of questions, each answered only by a link to the page that owns the fact. No removal, no redirect to `/`.
4. Split `hosting/configuration` into a guide and a reference table of every key. The table stays at `/hosting/configuration/` (the server writes that URL); the guide is the new `hosting/server-toml`. `hosting/updating` stays one page.
5. No product versions in the docs. All products restart at 1.0 at launch. No "since 1.9.0", "in 1.13.0", "before 1.7.5" and no migrations between versions; the wire protocol's version stays on the protocol page, `NodeMP.VERSION` in the API reference, and neither says which product version brought it. STYLE rule 13; `check-stale` flags three-part numbers; section 11 lists the pages.
6. Mod `main` is the target. Rows 5 and 6 of section 5 and the `hold_tight` item below are true only there; they are marked as such.
7. Calques: «лежат» for files is normal Russian and is not on the list (section 6).

Not decided yet; the rule or the plan applies meanwhile:

- One paragraph per line in the sources (STYLE rule 11; matches PR #20). It makes the first pull request for each section large.
- The English players pages carry the errors in section 5 until the English pass.
- Product points found on the way, not docs: the Russian launcher shows English text for join step captions, the strict-check block and the game-check line; the Russian site tells players to hold "Hold to play" while the launcher says **Зажмите для игры**; `links.ts` has empty Discord and Telegram addresses, so the launcher's community block shows only nodemp.com and a ban window without a support address has only **Закрыть**; on mod `main` the server key `[sync] hold_tight` pins a setting the mod no longer shows; the server still reads the old `server.toml` layout (the legacy names in `Config.cpp`) and the docs say nothing about it under rule 13, so whether 1.0 keeps that conversion is the owner's call.
- The generated API reference carries version markers from `sdk/api.toml` (section 11).

## 11. Product versions in the docs

Counted on 2026-10-19 after the pilot. A mention is a three-part number (`1.13.0`, also inside `server-v1.13.0` and file names); the wire protocol number and the game number are listed apart. English / Russian; the pilot removed the Russian `players/install` ones.

| Page | EN / RU | What | What happens |
|---|---|---|---|
| `hosting/updating` | 20 / 20 | `1.13.0` in file names (9), "since/before 1.9.0" (6), 1.8.0 (1), 1.10.0 (2), 1.6.25 (client mods that still join), 1.2.0 (launchers that join); plus "speaks v23" | The migrations go; the compatibility paragraph says what the launcher does, without numbers; file names with `<версия>` |
| `hosting/docker` | 6 / 6 | image file name, release tag in a link, `nodemp-server:1.13.0-78abbaa` (3) | `<версия>` and `<тег>`; the link goes to the latest release |
| `hosting/linux` | 5 / 5 | archive name in four commands | `<версия>` |
| `hosting/windows` | 4 / 4 | archive name in the commands | `<версия>` |
| `introduction/what-is-nodemp` | 3 / 3 | the versions table (server, launcher, mod); also "speak wire protocol v23" (1) and "built for 0.39.4.0" (1) | The table goes; the game is "0.39", as the mod checks |
| `hosting/configuration` | 3 / 3 | "A file from before 1.9.0 … first start of 1.9.0" (2), `recheck_sec` "Since 1.12.0" | Both go with the split |
| `hosting/quick-start` | 2 / 2 | the release tag `server-v1.13.0` in a link and in the text | Link to the latest release |
| `plugins/events` | 2 / 2 | "Since client mod 1.7.5, the server (1.9.0 and later)" | Sentence without history |
| `hosting/mods` | 1 / 1 | "Since client mod 1.7.6" | Sentence without history |
| `plugins/bus` | 1 / 1 | "`call` was added in server 1.9.0" | Goes |
| `plugins/client-scripting` | 1 / 1 | "Since client mod 1.7.6" | Goes |
| `plugins/players-and-vehicles` | 1 / 1 | "since client mod 1.7.4" | Goes |
| `reference/faq` | 1 / 1 | "the layout introduced in server 1.9.0"; also the game number (1) | Goes with the answer's rewrite to a link |
| `players/install` | 1 / 0 | the installer file name; the Russian also had the game number (2), now "0.39" | Russian done; English with the English pass |
| `plugins/native-modules` | 0 / 0 | "Since ABI 2.6" (1), a history marker; the quoted refusal message with ABI numbers stays | Marker goes |
| `reference/error-codes` | 0 / 0 | protocol numbers in the quoted mismatch message (4), game numbers in the quoted manifest message (2) | Stay as the program prints them, in code spans |
| `plugins/conventions` | 0 / 0 | The "Versions" section is about the calls `node.server.version()` and `protoVersion()`, with no numbers | Stays; no "since" notes |
| `hosting/strict-verification` | 0 / 0 | game number in two strings the program prints | Stay |
| `reference/protocol` | 0 / 0 | the protocol number, the page's subject | Stays |

Total: 51 three-part mentions on 14 English pages, 50 on 13 Russian ones. Not in the table: the generated API reference, whose descriptions come from `sdk/api.toml` and carry 35 "server x.y.z" and 109 "ABI x.y" markers that say which version brought a feature. The fix is in the sdk (or a strip in `scripts/import-api.mjs`), not in these pages; the owner decides which.

Tooling that reads versions, not pages: `src/content/versions.json`, check 5 of `check-claims` (`versions.docs` and `versions.code`), the README table of `versions.*`, and the version lookups in `ci.yml` and `deploy.yml` (the code tags to check out, the server release the doctests download).

The check: `scripts/check-stale.mjs` flags, on every page that is off `PENDING`, a three-part number (not part of a longer dotted number, so addresses and four-part game numbers pass) and "protocol v23" outside backticks, except on `reference/protocol`. `\b\d+\.\d+\.\d+\b` alone misses `server-v1.13.0` and `nodemp-server-v1.13.0-image`, because there is no word boundary between `v` and the digit. Today it covers `ru/players` and `ru/index.mdx`; each section adds its pages by deleting its line from `PENDING`.

## 12. Work order

Homes before links: a section that owns a fact is written before the sections that link to it. Every section ends the same way:

- the Russian pages are written from the facts at `main` (STYLE), with no product versions and «плагин» for the thing, never «ресурс» outside the code's names;
- the section's line leaves `PENDING` in `scripts/check-stale.mjs`, so the version and term rules guard its pages from then on;
- facts that differ from what players have now go into the pull request description with the page and the version;
- link texts in `index.mdx`, the sidebar labels in `astro.config.mjs` and the glossary follow every retitled page;
- `npm run build`, `npm run check`, `npm test`, and `npm run doctest` when a page has examples.

The owner reads the pilot before section 1 starts.

0. **Pattern checker** (before section 1). `scripts/check-style.mjs`: paragraphs wrapped on a line, `Что дальше` headings, bold at the start of a line, dash density and colon density counted together (a dash swapped for a colon must not pass), the banned phrases of STYLE. The version and term rules are the ones in `check-stale`, imported, not copied.
1. **Plugins** (17 pages). The 11 pages of PR #20 are based on Igor's text, with the corrections STYLE lists on top: `bus`, `chat`, `concurrency`, `database`, `events`, `examples`, `getting-started`, `http`, `overview`, `resources`, `storage`. The other 6 are written from the facts: `players-and-vehicles`, `client-scripting`, `conventions`, `native-modules`, `js-host`, `migrating`. Order: `concurrency`, `resources`, `events`, `conventions`, `chat`, `players-and-vehicles`, `client-scripting`, `storage`, `database`, `http`, `bus`, `native-modules`, `js-host`, `examples`, `migrating`, then `getting-started` and `overview`, which link to everything. Also: the moves of section 8 (`overview`, `conventions`, `events`), the titles «Первый плагин» and «Устройство плагина», `<ресурс>:<что>` becomes `<плагин>:<что>`, versions out of `events`, `bus`, `client-scripting`, `players-and-vehicles`, `native-modules` (section 11), the scheduled-changes text of `players-and-vehicles` goes into the PR table (mod `main` only). Reason for going first: the term decision lands here, PR #20 is ready as a base, and `events`, `chat`, `client-scripting#strict-sessions` and `concurrency` are the homes the pilot and the hosting pages link to. This is also where the Lua examples run against the server, and where the audit has not yet read a page line by line against `api.toml` (section 2).
2. **Reference** (3 pages). `error-codes` (the home of messages; the wrong menu path in two rows; quoted messages keep their numbers), `protocol` (stays the only page with the protocol number), `glossary` (guest name, "strict session", Russian interface words, link texts after section 1). Hosting pages link to the messages, so the home is written before them.
3. **Hosting** (14 pages, one new). Order: the split first (`server-toml` and `configuration`, both locales, redirect and anchors of section 9, sidebar and `index`), then `quick-start`, `windows`, `linux`, `docker` (file names with `<версия>`), `resources`, `registering`, `mods`, `strict-verification`, `join-queue`, `administration`, `troubleshooting`, and `updating` last (no versions, no migrations). The `hold_tight` row is written as the code has it and flagged in the PR (mod `main`).
4. **Start pages and FAQ** (3 pages). `introduction/what-is-nodemp` (no versions table, a pointer to `players/join`), `index` (both locales), `reference/faq` (the short list of questions, each answered by a link; the `/support/faq/` redirect already points at it). Last of the Russian text, because they link to everything and own nothing.
5. **Tooling** (after the last page). Delete `PENDING` and the English line with it; retire check 5 of `check-claims` and the README row once no page states a version; make `ci.yml` and `deploy.yml` read the code at `main` while the docs describe the next release (today they take the tags from `versions.json` unless a branch of the same name exists, and `versions.json` stays for the doctests' server download until the owner sets the 1.0 refs); take the API reference markers of section 11 out in the sdk or in `scripts/import-api.mjs`.
6. **English** (all pages). From the Russian, section by section, each after the owner approves the Russian one; the players section first, because its English twins carry the errors of section 5. "Plugin" in general, "resource" where the code says resource; no versions. `check-locales` keeps the structures equal.

## Appendix A. What the pilot changed

Pages: `ru/players/{install,sign-in,join,settings,connection,troubleshooting}` rewritten from the facts; `ru/players/in-game` new; the English twins follow the structure (`players/in-game` new from the "In the game" and "Leave" sections of `join` and the "Chat" and "Keys" sections of `settings`; `settings` retitled "Settings"; text otherwise unchanged). Sidebar and both front pages list the new page.

Words (Russian, outside code): 3,856 before in six pages; 4,434 after in seven (3,999 in the six old pages, 435 in the new `in-game`, whose content moved out of `join` and `settings`). The growth is facts the old pages lacked: registration rules, the ban window, the maintenance screen, the real join step captions, the chat reasons, the update-channel and rollback conditions, the strict-check reasons `unreadable`. What went: the refusal table (now a link), the repeated strict-check text, `Launcher.cfg`, the paragraph on how code was said to work.

After the review: the installer file name (twice) and the game number are out of `ru/players/install` (the game is "0.39", which is what the mod checks, as `players/troubleshooting` already said), «ресурс» became «плагин» in `ru/players/settings` and `ru/index.mdx`, and `check-stale` guards both.

## Appendix B. Not verified

- The launcher opens itself at the end of the installer (Tauri's default; nothing in the repository sets or unsets it).
- The installer is unsigned. The site says so and no signing is configured; the published file was not inspected.
- Other 0.39.x versions of the game: the mod only checks the major and minor number.
- Whether BeamNG.drive must be closed after **Выйти** before joining another server. Verified only that a second join cannot start during a session (`notify.linkBusy`) and that the main-menu button's toast says to close the game and press Connect.
- When the chat refusal `no_handler` appears. It exists in the mod's texts; no code path in the server repository produces it. Not mentioned in the pages.
- The reference-page claims listed under "Outside the players section" in section 5.
- What the mod does with a server pin (`[sync] hold_tight`) for a setting `main` has removed.
- The launcher's `run/strict_test.py` differs from the 1.2.0 tag beyond comments; it is a test, and only the product code was compared.
