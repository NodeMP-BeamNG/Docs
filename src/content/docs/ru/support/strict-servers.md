---
title: "Серверы со строгой проверкой"
description: "Что строгий сервер проверяет на вашем ПК, почему он не пускает с изменённой игрой и как зайти."
---

## Строгие серверы

Сервер с `VerifyGame = "strict"` сравнивает всю вашу установку BeamNG — папку игры, оглавление
каждого архива и вашу пользовательскую папку BeamNG — с эталоном чистой установки той версии
игры, на которой он работает ([Строгая проверка](/ru/hosting/strict-verification/) объясняет,
что настроил хост). При подключении появляются ещё два шага,
`Downloading the server's integrity manifest` (один раз; файл кэшируется) и
`Checking game files`, а несовпадение отклоняет вас с
`Could not join · Your game files do not match this server's reference (N problems) · <path>`
(причина сервера, `Game files do not match this server's reference (N problems). …`, несёт до
трёх примеров; панель под карточкой сервера объясняет первый). Лаунчер продолжает
проверять и во время сессии, так что изменение, сделанное во время игры, завершает её с
`Session ended · Your game files changed while you were playing and no longer match this server's reference (N problems)`.

Обычные причины на немодифицированной игре — файлы, которые проверка не может отличить от
модификации:

- **Остатки распакованных модов в пользовательской папке** — `vehicles\<model>\info_*.json`,
  `*.materials.json`, `*.jbeam` под `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\vehicles\`,
  оставшиеся после удаления мода из `mods\`. Там разрешены только сохранённые конфигурации
  (`vehicles\<model>\<name>.pc` с превью `.png`/`.jpg`) и собственные заглушки игры
  `main.materials.json`, которые движок сам пишет под `vehicles\` и `art\`; любой другой
  `*.materials.json` — остаток.
- **Ваши собственные уровни или частицы** — уровень в `current\levels\`, отредактированный
  `current\lua\common\particles.json`, что угодно под `current\lua\`, `ui\`, `art\` или `scripts\`,
  что не принадлежит игре. Уберите это на время игры на строгом сервере; `mods\` и папки
  сохранений редакторов не проверяются.
- **Файлы, добавленные в папку игры** — лаунчер или утилита, скопированные рядом с
  `BeamNG.drive.exe`, мод, установленный в саму установку вместо пользовательской папки.
  Считается всё, чего нет в эталоне, кроме логов, кеша шейдеров и `desktop.ini` самой Windows.
- **Версия игры не та, что у сервера** — после обновления BeamNG, пока хост не перегенерировал
  эталон (или пока вы не обновились): примеры тогда называют файлы игры вроде
  `/Bin64/BeamNG.drive.x64.exe (hash)`.
- **Изменённый игровой архив** — перепакованный или отредактированный `.zip` в `content\`:
  проверьте файлы игры в Steam.

Отказ показывает три примера. Чтобы увидеть весь список, выполните ту же проверку сами: она
встроена в лаунчер как `--integrity-check`, берёт эталон, который прислал сервер (кэш в
`%LOCALAPPDATA%\com.nodemp.launcher\helper\cache\integrity\<id>.manifest`; по файлу на каждый
эталон, который вы забирали), и печатает каждую проблему. Проще всего получить команду из панели
под карточкой сервера после отказа: её кнопка **Copy** даёт команду с уже подставленным файлом.
Набирая руками, помните, что `<id>` — имя файла манифеста из 64 символов, а при нескольких файлах
в этой папке самый новый обычно и есть эталон сервера, который вам только что отказал. Из
командной строки, при закрытом BeamNG:

```
cd %LOCALAPPDATA%\com.nodemp.launcher\helper
%LOCALAPPDATA%\NodeMP\nodemp-launcher.exe --helper --data-dir %LOCALAPPDATA%\com.nodemp.launcher\helper --integrity-check cache\integrity\<id>.manifest
echo %ERRORLEVEL%
```

(`--helper` превращает исполняемый файл лаунчера в хелпер; `--data-dir` и рабочий каталог — то,
что лаунчер передаёт сам, так что проверка читает тот же `Launcher.cfg`, что и подключение.
Добавьте `--game-dir <folder>`, если в **Settings → Game** указана папка, как это делает
лаунчер; `--user-path <folder>` переопределяет пользовательскую папку. Отдельная сборка
`Node-Launcher.exe` принимает те же опции без `--helper`.) Вывод, который пишется и в
`launcher.log`, выглядит так:

```
integrity check (strict) against C:\Users\you\AppData\Local\com.nodemp.launcher\helper\cache\integrity\e326499d….manifest
  game folder  C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive
  user folder  C:\Users\you\AppData\Local\BeamNG\BeamNG.drive\current
  launcher     exe C:\Users\you\AppData\Local\NodeMP\nodemp-launcher.exe, data C:\Users\you\AppData\Local\com.nodemp.launcher\helper\, cache C:\Users\you\AppData\Local\com.nodemp.launcher\helper\cache
  manifest     id e326499d…, format 2, game 0.39.4.0 build 20972, 14193 root files, 173 archives, generated 2026-…
  overlay   userfolder:vehicles/bell407/info_bell407.json
  overlay   userfolder:levels/mytrack/info.json
  unlisted  /Node-Launcher.exe
game files DIFFER: 14193 files checked in 1.0s (strict), 7203 hashed, 1 not part of the game, 2 user-folder overrides -- e.g. userfolder:vehicles/bell407/info_bell407.json (overlay) userfolder:levels/mytrack/info.json (overlay) /Node-Launcher.exe (unlisted)
counts: missing 0, size 0, hash 0, unlisted 1, archive 0, userfolder 2, folders skipped 0
```

Каждая проблема — одна строка: причина, затем путь, выровненные в две колонки:

| Причина | Путь | Значение | Решение |
|---|---|---|---|
| `overlay` | `userfolder:<path>` | Файл в `current\` вашей пользовательской папки, перекрывающий контент игры. | Уберите его из `current\`; упакованный мод должен лежать в `mods\`, которая не проверяется. |
| `unreadable` | `userfolder:<folder>` | Папка там, которую лаунчер не смог прочитать, обычно путь длиннее, чем позволяет Windows. | Укоротите или удалите её. |
| `unlisted` | `/<path>` | Файл в папке игры, которого в чистой установке нет. | Удалите его из папки игры. |
| `hash`, `size`, `missing` | `/<path>` | Файл игры отредактирован, изменил размер или удалён. Много таких, включая `/Bin64/…`, означают, что ваша версия игры — не та, которую описывает эталон. | Проверьте файлы игры в Steam; обновите игру или дождитесь, пока хост перегенерирует эталон. |
| `crc`, `size`, `extra`, `missing`, `duplicate` | `/<zip>!<entry>` | Запись игрового архива отличается от чистой. | Проверьте файлы игры в Steam. |
| `unreadable` | `/<zip>` | Архив — не читаемый zip. | Проверьте файлы игры в Steam. |
| `not judged` | `<path> (the launcher's own)` | Не проблема: лаунчер живёт внутри папки игры и исключил собственные файлы. | Ничего. |

Последняя строка перед итогом, `counts: missing N, size N, hash N, unlisted N, archive N,
userfolder N, folders skipped N`, — та же разбивка в виде сумм. Код выхода — `0`, когда установка
чистая, `1`, когда есть проблемы, и `2`, когда проверку вообще не удалось выполнить —
`cannot read the manifest file …`, `not a reference manifest: …`,
`could not check: manifest format outdated (format 1)` (устаревший файл эталона: попросите хоста
перегенерировать его) или `could not check: the game's user folder … does not exist`.

