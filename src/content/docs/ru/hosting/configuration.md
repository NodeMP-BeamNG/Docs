---
title: Конфигурация
description: Все ключи server.toml с секцией, типом, значением по умолчанию и переменной NODE_*; приоритет, перезапись файла, переменные провайдера, флаги.
---

Сервер читает один файл, `server.toml`, из каталога, в котором запущен (или по пути из
`--config=`). Если файла при запуске нет, сервер записывает его со всеми ключами по умолчанию и
комментарием к каждому, а затем работает на этих значениях. Настройки читаются один раз при
запуске: отредактируйте файл и перезапустите сервер.

Любой ключ можно задать и переменной окружения с именем `NODE_…`. Так настраивается
Docker-образ, и это правильное место для секрета хоста на любой машине, где файл конфигурации
копируют туда-сюда.

## Приоритет

От сильнейшего к слабейшему:

1. `--port=` в командной строке (только порт).
2. Переменная окружения, если она задана и не пуста.
3. Значение в `server.toml`.
4. Встроенное значение по умолчанию.

Детали, которые важны, когда настройка не применяется:

- Логическая переменная принимает `true`, `false`, `1` и `0` в любом регистре. Любое другое
  значение игнорируется с сообщением
  `Environment variable NODE_DEBUG has non-boolean value 'yes', ignoring it (accepted: true/false/1/0)`,
  и решает файл.
- Целочисленная переменная должна быть простым числом; текст читается как `0`.
- Ключ неверного типа в файле (`Port = "30814"`, в кавычках) сопровождается сообщением
  `Value 'General.Port' has unexpected type, expected type 'integer'`, и используется значение
  по умолчанию.
- Ключ, отсутствующий в файле, молча получает значение по умолчанию. Именно поэтому файл,
  записанный старой версией, продолжает работать.
- Файл, который отвергает парсер TOML, останавливает сервер:
  `Error parsing config file value: …`, `Closing in 10 seconds`, код выхода 1.

## Файл перезаписывается

После каждого успешного чтения файла (при запуске, до всего остального) сервер записывает
`server.toml` обратно: все известные ему ключи с его собственными комментариями. Последствия:

- Ваши комментарии теряются, а ключи, которых сервер не знает, удаляются. Заметки держите в
  другом месте.
- Значения, заданные через окружение, в файл не записываются. Файл сохраняет то, что в нём было;
  ключ, которого в файле не было, получает значение по умолчанию, а не значение из окружения.
  Разовое переопределение никогда не становится постоянным.
- Ключи, добавленные новой версией, появляются со значениями по умолчанию после первого запуска
  (см. [Обновление](/ru/hosting/updating/)).

Перезапись пропускается, если задана `NODE_PROVIDER_DISABLE_CONFIG` (см.
[Переменные провайдера](#переменные-провайдера)).

## Справочник

Строки в TOML берутся в кавычки (`Name = "My server"`); целые числа и логические значения — нет
(`Port = 30814`, `Debug = false`).

| Секция | Ключ | Тип | По умолчанию | Окружение |
|---|---|---|---|---|
| `[General]` | `Debug` | bool | `false` | `NODE_DEBUG` |
| `[General]` | `IP` | string | `"::"` | `NODE_IP` |
| `[General]` | `Port` | int | `30814` | `NODE_PORT` |
| `[General]` | `Name` | string | `"Node Server"` | `NODE_NAME` |
| `[General]` | `MaxCars` | int | `1` | `NODE_MAX_CARS` |
| `[General]` | `MaxPlayers` | int | `8` | `NODE_MAX_PLAYERS` |
| `[General]` | `Map` | string | `"/levels/gridmap_v2/info.json"` | `NODE_MAP` |
| `[General]` | `VerifyGame` | string | `"size"` | `NODE_VERIFY_GAME` |
| `[General]` | `IntegrityDir` | string | `"integrity"` | `NODE_INTEGRITY_DIR` |
| `[Resources]` | `Obfuscate` | bool | `true` | `NODE_OBFUSCATE` |
| `[Content]` | `Folder` | string | `"content"` | `NODE_CONTENT_FOLDER` |
| `[Content]` | `Encrypt` | bool | `false` | `NODE_CONTENT_ENCRYPT` |
| `[Network]` | `TlsCert` | string | `"node_cert.pem"` | `NODE_TLS_CERT` |
| `[Network]` | `TlsKey` | string | `"node_key.pem"` | `NODE_TLS_KEY` |
| `[Network]` | `StateRelayRadius` | int | `0` | `NODE_STATE_RELAY_RADIUS` |
| `[Experimental]` | `NodeGrab` | bool | `false` | `NODE_EXPERIMENTAL_NODEGRAB` |
| `[Directory]` | `Url` | string | `""` | `NODE_DIRECTORY_URL` |
| `[Directory]` | `HostId` | string | `""` | `NODE_DIRECTORY_HOST_ID` |
| `[Directory]` | `HostSecret` | string | `""` | `NODE_DIRECTORY_HOST_SECRET` |
| `[Directory]` | `Fingerprint` | string | `""` | `NODE_DIRECTORY_FINGERPRINT` |
| `[Directory]` | `Description` | string | `""` | `NODE_DIRECTORY_DESCRIPTION` |
| `[Directory]` | `Mode` | string | `"freeroam"` | `NODE_DIRECTORY_MODE` |
| `[Directory]` | `Tags` | string | `""` | `NODE_DIRECTORY_TAGS` |
| `[Directory]` | `Public` | bool | `true` | `NODE_DIRECTORY_PUBLIC` |
| `[Directory]` | `TestDrive` | bool | `true` | `NODE_DIRECTORY_TEST_DRIVE` |
| `[Directory]` | `RedeemFailOpen` | bool | `false` | `NODE_DIRECTORY_REDEEM_FAIL_OPEN` |
| `[Directory]` | `AllowInsecure` | bool | `false` | `NODE_DIRECTORY_ALLOW_INSECURE` |
| `[Database]` | `Url` | string | `""` | `NODE_DATABASE_URL` |
| `[Database]` | `Pool` | int | `4` | `NODE_DATABASE_POOL` |
| `[Database]` | `QueryTimeoutMs` | int | `10000` | `NODE_DATABASE_QUERY_TIMEOUT_MS` |
| `[Database]` | `TxTimeoutMs` | int | `30000` | `NODE_DATABASE_TX_TIMEOUT_MS` |
| `[Database]` | `MaxRows` | int | `10000` | `NODE_DATABASE_MAX_ROWS` |

### `[General]`

- `Debug` — дополнительные отладочные и трассировочные строки в логе и метки времени с
  миллисекундами.
- `IP` — адрес, на котором слушать. `::` — все интерфейсы, IPv6 и IPv4; `0.0.0.0` — все
  интерфейсы IPv4; один адрес выбирает один интерфейс. К вашему публичному адресу отношения не
  имеет.
- `Port` — единственный порт, используется для TCP и UDP.
- `Name` — имя, которое игроки видят в списке и в лаунчере.
- `MaxCars` — сколько автомобилей может одновременно иметь каждый игрок.
- `MaxPlayers` — игроков одновременно; список показывает это как вместимость.
- `Map` — уровень, который получают подключающиеся игроки, в виде пути к его `info.json` внутри
  игры, например `/levels/west_coast_usa/info.json`. Уровень из мода работает, если его zip лежит
  в `content/`.
- `VerifyGame` — какую часть установки BeamNG подключающегося игрока сравнивать со списком
  файлов самой игры до подключения. `off`: лаунчер всё равно выполняет проверку `size`, а сервер
  только пишет о несовпадении в лог вместо отказа. `size`: длина каждого файла плюс поиск файлов,
  добавленных в папку `content/` игры, около двух секунд. `scripts`: дополнительно хешируются
  деревья `lua/` и `ui/` игры, около десяти секунд; именно это ловит отредактированный скрипт.
  `full`: хешируется вся установка, около 50 ГБ, минуты — аудит, а не проверка перед
  подключением. Игрок, чья установка не совпадает, получает отказ с сообщением
  `Your BeamNG install does not match the game's own file list (3 files differ). Verify the game's files in Steam and try again.`
  `strict`: проверка сравнивает не со списком файлов самой игры, а с **эталонным манифестом**
  чистой установки, который вы генерируете и кладёте в `IntegrityDir` — оглавление каждого
  архива, вся папка игры и пользовательская папка игры, причём `lua/`, `ui/`, бинарники и
  исполняемые файлы в корне хешируются SHA-256. Нужен ровно один `.manifest` в этой папке; без
  него или с несколькими каждое подключение отклоняется с текстом, который просит игрока
  обратиться к хосту. Несовпадение отклоняется с сообщением
  `Game files do not match this server's reference (3 problems). …`. Что именно проверяется, как
  сгенерировать манифест и что видят игроки — на странице
  [Строгая проверка](/ru/hosting/strict-verification/). Любое другое значение записывается в лог
  как ошибка и трактуется как `scripts`.
- `IntegrityDir` — папка с эталонными файлами `*.manifest`, с которыми сверяет
  `VerifyGame = "strict"`, относительно рабочего каталога (Docker: `/data/integrity/`). Каждый
  `.manifest` в ней загружается при запуске независимо от `VerifyGame`, поэтому сервер на
  `scripts` всё равно может провести строгий аудит по запросу через `player:verify("strict")`;
  для `VerifyGame = "strict"` в папке должен лежать ровно один файл. Файл пишет
  `Node-Server --gen-integrity <gamedir>`, по умолчанию именно туда (см.
  [Командная строка](#командная-строка)).

### `[Resources]`

- `Obfuscate` — обфусцировать клиентский Lua, который ресурсы передают игрокам. `false` отдаёт
  исходный текст, для отладки. Подробности — в разделе
  [Ресурсы и контент](/ru/hosting/resources/).

### `[Content]`

- `Folder` — папка с zip-архивами клиентских модов, относительно рабочего каталога.
- `Encrypt` — передавать архивы зашифрованными ChaCha20 с ключом, создаваемым при каждом запуске;
  лаунчер тогда хранит в кэше только зашифрованные копии.

### `[Network]`

- `TlsCert`, `TlsKey` — TLS-сертификат сервера и его закрытый ключ, PEM. Относительные пути
  разрешаются рядом с исполняемым файлом, а не в рабочем каталоге. Отсутствующие файлы создаются
  при запуске (самоподписанные, на десять лет). Отпечаток SHA-256 сертификата — то, что
  закрепляют лаунчеры, поэтому берегите оба файла; страница [Обновление](/ru/hosting/updating/)
  объясняет, почему.
- `StateRelayRadius` — ретрансляция позиций автомобилей по расстоянию, в метрах. `0` (по
  умолчанию) передаёт каждое обновление позиции каждому игроку. С радиусом игроки в ближней его
  половине получают обновления с полной частотой, в дальней половине — с половинной, за пределами
  — не получают. Подробности — в разделе
  [Как работает синхронизация](/ru/framework/sync/).

### `[Experimental]`

- `NodeGrab` — принимать по сети запросы node-grabber. Выключено — сервер их отбрасывает.
  Включено — каждый захват всё равно требует явного разрешения от обработчика
  `vehicleNodeGrabRequest` в ресурсе; пример `nodegrab-allow` — самый маленький из таких.

### `[Directory]`

Объявляет ли сервер о себе директории и как именно; рабочий процесс описан на странице
[Регистрация сервера](/ru/hosting/registering/).

- `Url`, `HostId`, `HostSecret` — директория, `https://api.nodemp.com`, и ключ сервера из вашего
  аккаунта. Нужны все три: если одно из них пусто, сервер предупреждает и не объявляется; если
  пусты все три — молчит. Секрет — это пароль: при утечке смените его в аккаунте.
- `Fingerprint` — SHA-256 TLS-сертификата *директории* в нижнем регистре, шестнадцатеричный, для
  директории, которую вы держите сами с самоподписанным сертификатом. Пусто — обычная проверка:
  сертификат от удостоверяющего центра, которому доверяет машина, с именем хоста. Это не отпечаток
  вашего собственного сервера.
- `Description` — одно-два предложения под именем сервера в списке (обрезается до 500 символов).
- `Mode` — одно слово, показывается колонкой в списке: `freeroam`, `racing`, `roleplay`, …
- `Tags` — до восьми тегов через запятую, по которым игроки фильтруют список:
  `"drift, no-crash, ru"`.
- `Public` — `true` помещает сервер в список. `false` всё равно объявляет его, так что игроки с
  адресом видят его в сети, но он не рекламируется.
- `TestDrive` — могут ли подключаться игроки без аккаунта. При настроенной директории это
  соблюдается строго: билет Test Drive или подключение без билета отклоняется с сообщением
  `This server requires a NodeMP account: sign in to the launcher and join again`, если стоит
  `false`.
- `RedeemFailOpen` — что делать с подключением, билет которого нельзя проверить из-за
  недоступности директории. `false` отклоняет его. `true` впускает игрока как непроверенного
  гостя под именем, которое запросил лаунчер, — только когда `TestDrive` тоже `true`. Имеет
  значение лишь пока директория не отвечает.
- `AllowInsecure` — разрешить `Url`, начинающийся с `http://`. Оставьте выключенным: секрет
  передаётся в каждом запросе сессии, и без TLS его прочитает любой на пути. Только для своей
  директории в LAN или VPN.

### `[Database]`

База данных PostgreSQL для ресурсов, использующих `node.pg`; самому серверу она не нужна.
Настройка и API описаны на странице [Доступ к базе данных](/ru/plugins/database/).

- `Url` — строка подключения libpq, `postgres://user:password@host:5432/dbname?sslmode=require`
  (форма `key=value` тоже работает). Пусто, значение по умолчанию, — драйвер выключен:
  `node.pg.enabled()` возвращает `false`, а каждый вызов `node.pg` отвечает `pg_disabled`. Под
  Docker задайте `NODE_DATABASE_URL`, как и остальные ключи.
- `Pool` — открытых соединений, по одному потоку базы данных на каждое, от 1 до 32. Каждая
  `node.pg.tx` резервирует одно на всё своё время, так что при `Pool = 1` транзакция и обычный
  запрос не могут идти одновременно.
- `QueryTimeoutMs` — `statement_timeout`, устанавливаемый на каждом соединении; оператор, который
  выполняется дольше, завершается с SQLSTATE `57014`. Не меньше 100.
- `TxTimeoutMs` — самое долгое время, которое `node.pg.tx` может оставаться открытой. По его
  истечении сервер откатывает транзакцию, а ресурс получает `tx_timeout`, так что зависший скрипт
  не может удерживать соединение бесконечно. Не меньше 100.
- `MaxRows` — самое большое число строк, которое может вернуть один оператор, от 1 до 1 000 000;
  больший результат отбрасывается с ошибкой `pg_result_cap`.

Значения вне этих пределов обрезаются с предупреждением. Пароль никогда не попадает в лог: URL
печатается как `postgres://nodemp:***@127.0.0.1:5432/nodemp`, а в написаниях `?password=` и
`password=` — тоже как `***`. Заведите серверу собственную роль базы данных с правами только на
одну схему, никогда не суперпользователя, и используйте `sslmode=require` в `Url`, когда база
данных стоит на другой машине. Соединения устанавливаются в фоне с повторами (от 0,5 с до 30 с
между ними), поэтому сервер запускается и работает, пока база данных недоступна; TCP keepalive
(`keepalives_idle=30`, `keepalives_interval=10`, `keepalives_count=3`) и `connect_timeout` в 10 с
задаются, если `Url` не выбирает собственные значения.

## Переменные провайдера

Три переменные существуют для хостинг-панелей и контейнеров. Они читаются только из окружения и
не имеют ключа в файле.

| Переменная | Действие |
|---|---|
| `NODE_PROVIDER_DISABLE_CONFIG` | Когда её значение равно `true` или `1` в точности (`TRUE` и `yes` не считаются): `server.toml` не читается, не создаётся и не перезаписывается; настройки берутся из окружения и значений по умолчанию. Docker-образ задаёт её. |
| `NODE_PROVIDER_PORT_ENV` | Имя другой переменной, в которой лежит порт, — для панели, экспортирующей его под своим именем (`SERVER_PORT`). Читается вместо `NODE_PORT`. |
| `NODE_PROVIDER_IP_ENV` | То же для адреса привязки, вместо `NODE_IP`. |

## Другие переменные окружения

| Переменная | Действие |
|---|---|
| `NODE_LUA` | Путь к исполняемому файлу Lua 5.1 (или LuaJIT), который запускает обфускатор. Без неё сервер ищет `tools/lua515/lua5.1` (`lua5.1.exe` на Windows), затем `tools/luajit`, `tools/lua5.1`, `tools/lua`. |
| `NODE_TOOLS_DIR` | Папка `tools/`, если она лежит не рядом с исполняемым файлом. |
| `NODE_FORCE_ANSI` | `1` или `true`: цветной вывод в консоль, даже если вывод — не терминал. |
| `NODE_PLUGIN_POOL` | Потоков в фоновом пуле задач, который ресурсы используют через `node.job` и `node.await`. По умолчанию — число ядер машины, от 2 до 32. |

## Командная строка

`Node-Server --help` печатает:

```
USAGE:
    Node-Server [arguments]

ARGUMENTS:
    --help
                        Displays this help and exits.
    --port=1234
                        Sets the server's listening TCP and
                        UDP port. Overrides ENV and server.toml.
    --config=/path/to/server.toml
                        Absolute or relative path to the
                        server config file, including the
                        filename. For paths and filenames with
                        spaces, put quotes around the path.
    --working-directory=/path/to/folder
                        Sets the working directory of the Server.
                        All paths are considered relative to this,
                        including the path given in --config.
    --version
                        Prints version info and exits.
    --gen-integrity <gamedir> [--out <file>] [--game-version <v>]
                        Writes the integrity manifest that
                        VerifyGame = "strict" checks players
                        against, from a CLEAN game install at
                        <gamedir> (the folder with integrity.json):
                        EVERY file of the install with size and
                        SHA-256 (the game's own integrity.json omits
                        some shipped files) plus the table of
                        contents of every archive; hashing a few GB
                        takes well under a minute. Default output is
                        integrity/<game-version>.manifest under the
                        working directory ([General] IntegrityDir);
                        the version is read from integrity.json
                        unless --game-version says otherwise.
                        Prints the stats and the manifest hash, then
                        exits. Run it on a machine with the game
                        installed and copy the file to the server.

EXAMPLES:
    Node-Server --config=../MyWestCoastServer.toml
        Runs the Node-Server and uses the server config file
        which is one directory above it and is named
        'MyWestCoastServer.toml'.
    Node-Server --gen-integrity "C:\Program Files (x86)\Steam\steamapps\common\BeamNG.drive"
        Writes integrity/0.39.4.0.manifest (for that game version).
```

`--gen-integrity` — отдельный инструмент в том же бинарнике: он принимает папку игры позиционным
аргументом, не нуждается в `server.toml` и завершается, записав файл.
[Строгая проверка](/ru/hosting/strict-verification/) разбирает его по шагам.

## Пример

`server.toml` со всеми ключами по умолчанию (комментарии, которые пишет сервер, опущены):

```toml
[General]
Debug = false
IP = "::"
Port = 30814
Name = "Node Server"
MaxCars = 1
MaxPlayers = 8
Map = "/levels/gridmap_v2/info.json"
VerifyGame = "size"
IntegrityDir = "integrity"

[Resources]
Obfuscate = true

[Content]
Folder = "content"
Encrypt = false

[Network]
TlsCert = "node_cert.pem"
TlsKey = "node_key.pem"
StateRelayRadius = 0

[Experimental]
NodeGrab = false

[Directory]
Url = ""
HostId = ""
HostSecret = ""
Fingerprint = ""
Description = ""
Mode = "freeroam"
Tags = ""
Public = true
TestDrive = true
RedeemFailOpen = false
AllowInsecure = false

[Database]
Url = ""
Pool = 4
QueryTimeoutMs = 10000
TxTimeoutMs = 30000
MaxRows = 10000
```
