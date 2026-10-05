---
title: "Серверы со строгой проверкой"
description: "Что строгий сервер проверяет на вашем ПК, почему он не пускает изменённую установку, как увидеть все проблемы и как зайти."
---

**Строгий** сервер сравнивает всю вашу установку BeamNG — папку игры, содержимое архивов игры и
папку пользователя BeamNG — с эталоном чистой установки той версии игры, на которой он работает.
Всё, чего нет в чистой установке, закрывает вход. Проверка идёт в лаунчере на вашем ПК, серверу
уходит только результат. Что настроил хост — на странице
[Строгая проверка](/ru/hosting/strict-verification/).

## Как это выглядит

У входа на строгий сервер два лишних шага: `Fetching the server's reference manifest` (только в
первый раз — эталон сохраняется) и `Checking your game files against the server's reference`.
Если что-то отличается, вход останавливается:

> **Сервер не пустил в игру**\
> `Your game files do not match this server's reference (3 problems) · vehicles/pickup/pickup.jbeam`

Ниже лаунчер называет первую проблему простыми словами, говорит, что с ней делать, и предлагает
команду, которая выводит все проблемы, — с кнопкой **Копировать**. В сообщении сервера не больше
трёх примеров; полный список — в [диагностике](#полный-список-проблем).

## Частые причины

Если вы ничего в игре не меняли, обычно виноваты файлы, которые проверка не отличает от модификации:

- **Остатки распакованных модов в папке пользователя** — `info_*.json`, `*.materials.json`,
  `*.jbeam` в `%LOCALAPPDATA%\BeamNG\BeamNG.drive\current\vehicles\`, оставшиеся после удаления мода
  из `mods\`. Там допустимы только ваши сохранённые конфигурации (`<имя>.pc` с превью `.png`/`.jpg`)
  и заглушки `main.materials.json`, которые пишет сама игра.
- **Свои карты и правки** — карта в `current\levels\`, изменённый
  `current\lua\common\particles.json`, всё ваше в `current\lua\`, `ui\`, `art\` или `scripts\`.
  Уберите это на время игры на строгом сервере.
- **Файлы, добавленные в папку игры** — программа, скопированная рядом с игрой, мод, поставленный в
  папку игры вместо папки пользователя. Логи, кэш шейдеров и `desktop.ini` Windows не считаются.
- **Другая версия игры** — после обновления BeamNG, пока хост не пересоздаст эталон (или пока вы не
  обновитесь). В примерах тогда файлы игры, например `/Bin64/BeamNG.drive.x64.exe (hash)`.
- **Изменённый архив игры** — перепакованный или отредактированный `.zip` в `content\`. Проверьте
  целостность файлов в Steam.

**Не причина:** упакованные моды в `mods\`. Строгая проверка туда не смотрит, а на время сессии
они и так выключены.

## Полный список проблем

В лаунчер встроена та же проверка, и она выводит весь список. Проще всего — кнопка **Копировать**
под отказом: она даёт полную команду со всеми путями. Вставьте её в командную строку, закрыв
BeamNG.

Вручную команде нужен эталон, который прислал сервер. Эталоны лежат в
`%LOCALAPPDATA%\com.nodemp.launcher\helper\cache\integrity\<id>.manifest` — по файлу на каждый
скачанный эталон; самый новый обычно и есть эталон сервера, который вас только что не пустил.
Программа лаунчера — единственный `.exe` в `%LOCALAPPDATA%\NodeMP`, кроме `uninstall.exe`:

```
cd /d %LOCALAPPDATA%\com.nodemp.launcher\helper
"%LOCALAPPDATA%\NodeMP\<программа>.exe" --helper --data-dir %LOCALAPPDATA%\com.nodemp.launcher\helper --integrity-check cache\integrity\<id>.manifest
```

Добавьте `--game-dir <папка>`, если в **Настройки → Игра** указана папка; `--user-path <папка>`
задаёт папку пользователя. Вывод пишется и в `launcher.log` и выглядит так:

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

## Как читать результат

По строке на проблему: причина, затем путь.

| Причина | Путь | Что значит | Что делать |
|---|---|---|---|
| `overlay` | `userfolder:<путь>` | Файл в папке пользователя, который подменяет контент игры. | Уберите его из `current\`. Упакованному моду место в `mods\`. |
| `unreadable` | `userfolder:<папка>` | Папка, которую лаунчер не смог прочитать, — обычно слишком длинный для Windows путь. | Сократите путь или удалите папку. |
| `unlisted` | `/<путь>` | Файл в папке игры, которого нет в чистой установке. | Удалите его — проверка файлов в Steam лишние файлы не удаляет. |
| `hash`, `size`, `missing` | `/<путь>` | Файл игры изменён, другого размера или удалён. Если таких много и среди них `/Bin64/…` — у вас другая версия игры. | Проверьте целостность файлов в Steam; обновите игру или дождитесь хоста. |
| `crc`, `size`, `extra`, `missing`, `duplicate` | `/<zip>!<файл>` | Файл внутри архива игры отличается от чистого. | Проверьте целостность файлов в Steam. |
| `unreadable` | `/<zip>` | Архив не читается как zip. | Проверьте целостность файлов в Steam. |
| `not judged` | `<путь> (the launcher's own)` | Не проблема: собственные файлы лаунчера в папке игры не учитываются. | Ничего. |

Код выхода — `0`, если установка чистая, `1`, если есть проблемы, и `2`, если проверку не удалось
провести, например `could not check: manifest format outdated (format 1)` (попросите хоста
пересоздать эталон) или `could not check: the game's user folder … does not exist` (запустите игру
один раз).

## Во время игры

Строгий сервер перепроверяет файлы и во время сессии: каждые 10 минут и при изменении файлов в папке
игры или пользователя (не чаще раза в минуту). Если что-то изменилось, сессия завершается —
**Сессия завершена** и
`Your game files changed while you were playing and no longer match this server's reference (1 problem)`.
Верните как было и зайдите снова. Интервал — `StrictRecheckMin` в
[Launcher.cfg](/ru/players/settings/#для-продвинутых-launchercfg).
