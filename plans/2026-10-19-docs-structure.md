# Docs: audit and structure (2026-10-19)

Foundation for the rewrite of the documentation: what is wrong now, which page owns which fact, and the structure the Russian rewrite follows. Rules for the text itself are in `STYLE.md`. The pilot, the players section in Russian, is in the same pull request; it follows this plan.

## 1. Summary

- 42 hand-written pages per language (and 5 generated API pages, out of scope). The pilot adds one: 43. The proposal below ends at 44 (players +1, configuration split +1, updating split +1, FAQ removed -1).
- Every page repeats facts that have a better home elsewhere. The biggest clusters: refusal messages and strict-check advice (players/troubleshooting, reference/error-codes, hosting pages), the join steps (what-is-nodemp, players/join, protocol), "what the player sees" paragraphs on three hosting pages, the examples table (two pages), guest names, versions and ports (6 to 8 pages each). Section 4.
- The code disagrees with the text in the players section on 14 points (section 5, appendix A): a button that does not exist, a setting that does not exist, a wrong menu path (five places per language), a wrong rule for guest names, and more. Other sections: 5 findings so far, one of them unverified; the rest was not checked line by line (section 2).
- The Russian is not machine-sounding in the way the owner described: the stale-phrase list (`данный`, `осуществлять`, `является`, `позволяет`, `Важно отметить`) matches almost nothing (1 `позволяет` in all RU pages). What is wrong is structure and rhythm: Russian pages mirror the English ones heading by heading and sentence by sentence (75k vs 72k words), 473 spaced dashes and 340 bold spans in 24k words, announcements instead of content, calques, English interface words left in Russian text. Section 6.
- The structure change is small on purpose: every merge or split below has evidence. Only one URL disappears (`/reference/faq/`), so the redirect list is short (section 9).

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
| Current versions (server, launcher, mod, protocol, game) | `introduction/what-is-nodemp#versions`, from `versions.json` | `hosting/quick-start`, `windows`, `linux`, `docker`, `updating`, `players/install`, `faq` |
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
| The default port, every setting and its default | `reference/server-settings` (new, from `configuration`) | `quick-start`, `docker`, `troubleshooting`, `faq`, `join` (8 pages mention `30814`) |
| How `server.toml` works, environment variables, the settings hosts change most | `hosting/configuration` | `quick-start`, `docker`, `faq` |
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
10. Versions and the port: `1.13.0` on 6 pages, `1.2.0` on 3, `0.39.4.0` on 5, `30814` on 8. `check-claims` keeps them consistent, but each is a place to forget on release.
11. Launcher.cfg and the helper's files: `players/settings`, `error-codes`, `troubleshooting`.
12. Time-bound text in the body: "since 1.7.5", "since client mod 1.7.6", "Settings since 1.9.0", "Resources since 1.10.0", "NodeMP's new service" (updating), the "keys made before NodeMP restarted" box (registering), "Old event names" (events). STYLE rule 6.

## 5. Wrong against the code

Found and fixed in the pilot (players section, Russian). The English pages keep their text in this run; they still carry these errors.

| # | Page | The text said | The code says | Evidence |
|---|---|---|---|---|
| 1 | sign-in, install | Ban window has an **Appeal** button that opens the page to contest the ban | Two buttons: **Закрыть** and, only if NodeMP names a support address, **Написать в поддержку**. No appeal | `UI-launcher/src/components/BannedScreen.svelte`, `ru.ts` `ban.support` |
| 2 | sign-in (also faq, glossary) | A new guest name every session | `Guest-XXXXX`, five characters from a fixed alphabet, derived from the launcher's install id: the same on every join from this install | `Backend/.../play/internal/app/play.go` `GuestName`; `store.svelte.ts` comment on `identityFor` |
| 3 | install, settings, troubleshooting (also `error-codes` twice) | **Settings → Launcher → Client mod → Check now** | The **Client mod** block is on the **Game** page: **Настройки → Игра → Клиентский мод → Проверить** | `SettingsView.svelte` (game page, `settings.clientMod`) |
| 4 | join | Card shows "Stock content" when the server sends nothing; **It will send you** lists the mods you do not have | The card's **Контент** row reads **Отсутствует** (`detail.stock`); **Что придётся скачать** is the title of the list of all the server's files | `ServersView.svelte`, `ru.ts` |
| 5 | settings | A **Debug** section with a **Tools** button | Three sections only: Players, Chat, Cars & network. The debug rows were removed in settings version 4; the diagnostics window is a key binding | `settingsSchema.lua` `CATEGORIES`, `OBSOLETE_V4` |
| 6 | settings, connection (also `hosting/configuration`) | A setting "Hold other cars tightly" | No such row. `nodemp.sync.holdTight` is in the list of removed settings. The server key `[sync] hold_tight` appears to pin a row that no longer exists; not confirmed | `settingsSchema.lua` `OBSOLETE_V4`; `server/src/core/Config.cpp` |
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
- `hosting/configuration`, row `[sync] hold_tight` (6 above).
- `introduction/what-is-nodemp`: "the client mod is built for 0.39.4.0". The mod only checks the 0.39 branch and shows a toast for another one (`scripts/NodeMP/modScript.lua`).
- `hosting/quick-start`, `linux`: "glibc 2.38 and libstdc++ of GCC 13" is not in any repository checked; the Dockerfile builds on Ubuntu 24.04. Not verified, not known to be wrong.

## 6. The Russian text: what is wrong with it

Measured on all 42 pages (before the pilot): 23,985 Russian words outside code, 340 bold spans, 473 spaced dashes.

| Problem | Evidence | Pages |
|---|---|---|
| Mirrors the English page: same headings, same order, one sentence per sentence | EN 75k words, RU 72k; headings identical in structure on every page | all |
| Announcements and signposts instead of content | "Сначала о том, как файл себя ведёт, потом о настройках…" (`configuration`), "Здесь — как одно ложится на другое" (`migrating`), "Дальше раздел говорит…" (`overview`), a closing "Что дальше" list on 5 pages (`docker`, `linux`, `windows`, `quick-start`, `getting-started`), "Куда дальше", "Вам сюда" (`what-is-nodemp`) | many |
| Metaphor and calque | "лежат", "живёт", "ложится", "уходит", "держите кнопку", "без лишних движений", "Ресурсы не делят переменные", "Что видно" | `configuration`, `migrating`, `database`, `what-is-nodemp`, `bus`, `sign-in` |
| Dashes and bold everywhere | 473 and 340; bold lead-in on list items; tables for one-dimensional lists | `players/settings` (38 bold), `error-codes` (44), `players/join` (26), `protocol` (32 dashes), `configuration` (44 dashes), `faq` (23 dashes in 732 words) |
| English interface words in Russian text | "Leave", "Connect", "Direct Connect", "Hold to play" where the Russian interface has **Выйти**, **Подключиться**, **Прямое подключение**, **Зажмите для игры** | `players/*`, `glossary` |
| Fact errors inherited from the English text (section 5) | 14 in the players section | `players/*`, `faq`, `glossary`, `error-codes` |
| History in the body | "since 1.7.5", "keys made before the restart", "old event names" | `events`, `registering`, `updating`, `mods` |
| Terms unsettled | ресурс/плагин (PR #20 swaps one for the other); помощник/хелпер; хост/сервер | `plugins/*`, `players/troubleshooting` |
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
| `hosting/configuration` (3405/3164) | How the file works, env, CLI, every setting | "Other players' cars" retells `players/settings` (27 windows with `players-and-vehicles`); `[integrity]` rows repeat `strict-verification` | `hold_tight` (6); defaults checked by `check-claims` | announces its own structure; 44 dashes |
| `hosting/registering` (1590/1397) | Key, settings, listing, picture, fingerprint, why not listed | "Not in the list" table repeated in `hosting/troubleshooting` and `faq`; history box about keys made before the restart | Discord requirement matches `discord_required` on the site | bold lead-ins; history box |
| `hosting/mods` (437/389) | Adding mods and maps, protected mods | "How players get mods" -> `players/join`; "since client mod 1.7.6" | none found | calm |
| `hosting/resources` (741/655) | Install, examples, `[config]`, reload, obfuscation, modules | Examples table = `plugins/examples`; reload = `plugins/resources` | none found | "ресурс/плагин" |
| `hosting/administration` (1071/955) | Console, kicks, bans, restart, log, "A player can't get in" | Last section = `hosting/troubleshooting`; kicks API = `plugins/players-and-vehicles` | commands covered by `check-claims` | 18 dashes |
| `hosting/join-queue` (1128/987) | Who waits, how, limits, what the player sees, console, plugins | "What the player sees" = `players/join`; refusal wording = `error-codes` | keys covered by `check-claims` | bold lead-ins (12) |
| `hosting/strict-verification` (918/777) | What it checks, manifest, rechecks, what players see | "What players see" = `players/troubleshooting`; summary = `players/join` | recheck 600 s confirmed | calm |
| `hosting/updating` (1418/1298) | Version, install per system, what survives, old-version migrations, new launcher | Migrations "since 1.9.0 / 1.10.0 / the new service" are history; protocol text = `error-codes` | tables vs `Config.cpp` legacy names consistent | 8 "вы"-forms, history |
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
| `reference/faq` (972/841) | 25 questions | Every answer repeats a home | 2 | "Подробнее — на странице …" nine times |
| `reference/glossary` (745/671) | Terms | arbiter | 2 | calm |
| `reference/protocol` (2720/2382) | Wire protocol v23 | "Order of a join" = `players/join` | tables checked by `check-claims` | 32 dashes |

## 8. Proposed structure

Players: 6 -> 7. Hosting: 13 -> 14. Plugins: 17 -> 17. Reference: 4 -> 4 (FAQ out, server settings in). Start: 2 -> 2. Total 42 -> 44 (43 after this PR).

**Start**
- `index`: unchanged; links follow the pages.
- `introduction/what-is-nodemp`: parts, versions, a two-line pointer to `players/join` instead of the 4 steps. Owns the versions.

**Players** (done)
- `install` (owns requirements, install, launcher and mod updates), `sign-in` (account, Test Drive, bans), `join` (list, card, Direct Connect, steps, queue), `in-game` (new: session panel, chat, keys, leaving), `settings` (launcher and game settings, locked rows, scheduled changes), `connection` (VPN, drops, lag), `troubleshooting` (symptoms, strict clean-up, logs; messages link to `error-codes`).
- Reason for `in-game`: chat and keys are not settings, the panel and leaving are not part of joining; the old page was called "Settings and controls".

**Hosting**
- `quick-start`: five steps; drops "join your server" (link to `players/join#подключиться-по-адресу`).
- `windows`, `linux`, `docker`: kept; the "Next" lists go; the checksum and port steps stay per system because the commands differ.
- `configuration`: keeps how the file works, environment variables, command line and "what people change most".
- `reference/server-settings` (new, split from `configuration#every-setting`): the table of every key by table. Reason: 2k of the 3.4k words are a lookup table found by key name, and the other 1.4k a guide read once. Inbound links with `#every-setting` (`docker`) move with it.
- `registering`, `mods`, `strict-verification`, `join-queue`, `administration`, `troubleshooting`: kept; their "what the player sees" and "a player can't get in" sections become one-line links.
- `resources`: keeps install, `[config]`, reload, obfuscation, native modules; the examples table goes (link to `plugins/examples`).
- `updating`: keeps the steps per system, what survives, when players need a new launcher.
- `hosting/upgrade-notes` (new, split from `updating`): the migrations "settings since 1.9.0", "resources since 1.10.0", "NodeMP's new service". Reason: they are history, they rot, and only people on very old servers need them. Optional: the decision depends on whether servers older than 1.9 are still supported.

**Plugins** (unchanged page list)
- `overview` loses "How code runs" (link to `concurrency`); `conventions` keeps failure, errors in handlers, ids that last, versions, memory and time, and hands "Names" to `events`; `events` loses "Old event names".
- Plugin pages are rewritten from PR #20 as the base.

**Reference**
- `error-codes`: the home of messages, unchanged in structure.
- `faq`: removed. Each question already has a home; the page is the largest source of repeated facts after `troubleshooting`. A list of questions with links would only repeat the sidebar.
- `glossary`: the arbiter; gains "strict session" and the Russian interface words.
- `protocol`: unchanged.
- `server-settings`: new (above).

## 9. Redirects

Both locales (the `withLocales` helper adds `/ru` itself). Only the FAQ disappears; the splits keep every old URL and only move anchors, so inbound links with anchors are retargeted instead.

| Old | New | In this PR |
|---|---|---|
| `/reference/faq/` | `/` | no (with the reference section) |
| `/hosting/configuration/#every-setting` and the per-table anchors | `/reference/server-settings/#…` | no (link retarget, not redirect) |
| `/hosting/updating/#settings-since-190`, `#resources-since-1100`, `#nodemps-new-service` | `/hosting/upgrade-notes/#…` | no |

The pilot changes no URL: the players pages keep their slugs, `in-game` is new. Inbound anchors that changed in Russian were retargeted: `ru/reference/glossary` (`#войти` -> `#вход-на-сервер`) and `ru/reference/error-codes` (`#сообщения-которые-можно-увидеть` -> `#сообщения-о-сбоях-связи`). `index.mdx` and the sidebar gained the new page in both locales; the English `settings` page is retitled "Settings".

## 10. Order of work and decisions for the owner

Order: reference (`error-codes`, `glossary`, `faq` out), hosting, plugins on top of PR #20, start pages, then English from the Russian.

Decisions:

1. Ресурс or плагин. PR #20 swaps "ресурс" for "плагин" in titles and text. The glossary says a plugin is a resource or a native module, so the swap changes meaning. STYLE follows the glossary until you decide.
2. FAQ: remove (proposed) or keep as a list of questions with links.
3. Split `configuration` and `updating` (proposed) or leave them as they are.
4. One paragraph per line in the sources (STYLE rule 11; matches PR #20). It makes the first pull request for each section large.
5. The English players pages still carry the errors in section 5 until the English pass. Say if you want them fixed earlier.
6. Product points found on the way, not docs: the Russian launcher shows English text for join step captions, the strict-check block and the game-check line; the Russian site tells players to hold "Hold to play" while the launcher says **Зажмите для игры**; `links.ts` has empty Discord and Telegram addresses, so the launcher's community block shows only nodemp.com and a ban window without a support address has only **Закрыть**; the server key `[sync] hold_tight` pins a row the mod no longer has.
7. A script like `check-stale` for STYLE patterns (hard-wrapped paragraphs, `Что дальше` headings, dash density, bold at line start, a list of banned phrases) would keep new text from drifting. Worth writing before the next section.

## Appendix A. What the pilot changed

Pages: `ru/players/{install,sign-in,join,settings,connection,troubleshooting}` rewritten from the facts; `ru/players/in-game` new; the English twins follow the structure (`players/in-game` new from the "In the game" and "Leave" sections of `join` and the "Chat" and "Keys" sections of `settings`; `settings` retitled "Settings"; text otherwise unchanged). Sidebar and both front pages list the new page.

Words (Russian, outside code): 3,856 before in six pages; 4,434 after in seven (3,999 in the six old pages, 435 in the new `in-game`, whose content moved out of `join` and `settings`). The growth is facts the old pages lacked: registration rules, the ban window, the maintenance screen, the real join step captions, the chat reasons, the update-channel and rollback conditions, the strict-check reasons `unreadable`. What went: the refusal table (now a link), the repeated strict-check text, `Launcher.cfg`, the paragraph on how code was said to work.

## Appendix B. Not verified

- The launcher opens itself at the end of the installer (Tauri's default; nothing in the repository sets or unsets it).
- The installer is unsigned. The site says so and no signing is configured; the published file was not inspected.
- Other 0.39.x versions of the game: the mod only checks the major and minor number.
- Whether BeamNG.drive must be closed after **Выйти** before joining another server. Verified only that a second join cannot start during a session (`notify.linkBusy`) and that the main-menu button's toast says to close the game and press Connect.
- When the chat refusal `no_handler` appears. It exists in the mod's texts; no code path in the server repository produces it. Not mentioned in the pages.
- The reference-page claims listed under "Outside the players section" in section 5.
