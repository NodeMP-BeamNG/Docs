---
title: Неполадки на стороне хоста
description: Сервер не запускается, игроки до него не достают, игроков не пускает на входе, Docker и его файлы TLS — что пишет лог и что делать.
---

Начните с того, что видите. Всё, что сервер говорит, есть в его консоли и в `logs/server.log`.

## Сервер не запускается

Сервер объясняет каждую причину, по которой не может запуститься, затем останавливается со строкой
`Closing in 10 seconds` и кодом выхода 1 — так менеджер служб видит сбой, а не чистую остановку.

| Сообщение | Что значит | Что делать |
|---|---|---|
| `Cannot listen on port … (…): the port is already in use (…). Usually another Node-Server is still running on this machine -- a previous instance that was not stopped, or a second copy started by mistake -- or another program owns the port. Stop it, or give this server a different port with [General] Port in server.toml or --port=<number>. Closing.` | Порт занят другой программой; первые скобки говорят `udp` или `tcp`, последние — слова самой системы. | Остановите другой сервер (часто это старая копия, которая всё ещё работает) или выберите другой порт. |
| `Cannot listen on port … (…): … failed: …. Closing.` | Порт не удалось открыть по другой причине; слова системы есть в строке. | Прочитайте их; проверьте, что `[General] IP` — адрес этой машины. |
| `[General] IP = "…" is not an IP address (…); the server cannot listen. Leave it at "::" to listen on every interface, or give the address of one of this machine's interfaces. Closing.` | `IP` (или `NODE_IP`) — не адрес. | Верните `"::"`. |
| `Error parsing config file value: …: the table […] appears twice. Put the keys into the existing […] table -- the server wrote one with every key in it on the first start -- and remove the second […] line together with the keys under it. The file has not been changed; fix it and start the server again.` | Таблица встречается в `server.toml` дважды — обычно вторая `[Directory]`, вставленная с сайта. | Перенесите ключи в ту таблицу, что уже была, вторую удалите. |
| `Error parsing config file value: …: the key … is given twice. Keep one of the two lines. The file has not been changed; fix it and start the server again.` | Одна и та же настройка дважды в одной таблице. | Удалите одну из строк. |
| `` Error parsing config file value: …: … -- the line reads `…`. Fix that line and start the server again, or delete the file and the server writes a fresh one with every default. `` | Любая другая ошибка в файле; строка процитирована. | Исправьте строку или удалите `server.toml`, чтобы начать со значений по умолчанию. |
| `[Network] timers must satisfy LagGraceSec < AuthTakeoverSec <= AuthReleaseSec <= DisconnectSec …` | Четыре таймера идут не по порядку. | Исправьте их в `server.toml` (или в переменных `NODE_NETWORK_*`). |
| `TLS: cannot write … (…); the certificate pair is generated on the first start, so point [Network] TlsCert and TlsKey (NODE_TLS_CERT, NODE_TLS_KEY) at files in a writable directory` | Сервер не может записать сертификат туда, куда указывают настройки. | Укажите обоим файлам папку, куда можно писать. В Docker см. [ниже](#docker-пара-tls). |

Если сервер запустился, но какая-то его часть нет, лог пишет
`started, but … failed — what they do may not work`; строки выше говорят, что и почему. Сервер при
этом продолжает работать.

## Игроки не достают до сервера

Лаунчеры пишут `Could not reach the server`, или сервер так и не появляется в списке.

1. **Порт должен быть открыт и для TCP, и для UDP**: TCP — для входа и всего, что должно дойти,
   UDP — для позиций машин. Проверьте файрвол на машине и проброс порта на роутере, если он есть.
2. **Проверяйте снаружи.** Подключение из своей же сети ничего не говорит о роутере. Попросите
   друга или воспользуйтесь проверкой портов для `ваш публичный адрес:30814`.
3. **`[General] IP` должен быть `"::"`.** Так сервер слушает все адреса, IPv4 и IPv6; лог
   подтверждает это строкой `listening on [::]:30814 (tcp, tls 1.3, dual-stack: IPv4 + IPv6)`.
4. **В Docker пробрасывайте порт, который сервер действительно использует**:
   `-p 30814:30814/tcp -p 30814:30814/udp` по умолчанию или тот, что вы задали `NODE_PORT`. На порт,
   объявленный в метаданных образа, не смотрите — значение имеет только проброс.

Игроки за тем же роутером, что и сервер, заходят по его локальному адресу (`192.168.…:30814`).

## Игроков не пускают на входе

Игрок говорит, что лаунчер показал `TLS handshake failed: unexpected eof while reading`, — часто
сразу несколько игроков из одного места или все на одном VPN. Сервер ограничивает, сколько
соединений с одного адреса может одновременно находиться в процессе входа, и закрывает следующее
ещё до рукопожатия. Ваш лог пишет об этом под тегом `Net`:
`… connections from this address are still being set up ([Network] MaxConnectionsPerIp)`.

- Лимит — `[Network] MaxConnectionsPerIp`, по умолчанию 32. Поднимите его, если многие ваши игроки
  приходят с одного адреса (клуб, NAT оператора, выход VPN).
- `[Network] ConnectionLimitExempt` перечисляет диапазоны адресов без ограничения на адрес. По
  умолчанию это loopback и частные диапазоны — то есть VPN или обратный прокси на той же машине,
  что и сервер. Добавьте туда диапазон, если все игроки приходят через один шлюз.
- Фоновые опросы списка серверов из лаунчера тоже считаются соединениями.

Каждое соединение, которое сорвалось до входа, пишется под `Net` с адресом и причиной (истёк срок,
не TLS 1.3, вообще не TLS-клиент, закрыто клиентом) — раз в минуту на адрес.

## Docker: пара TLS

Сервер останавливается сразу после старта с `TLS: cannot write /opt/node/node_key.pem (…)`. Внутри
образа папка исполняемого файла доступна только для чтения, а сертификат по умолчанию пишется рядом
с исполняемым файлом. Укажите обоим файлам том с данными:

```bash
-e NODE_TLS_CERT=/data/tls/node_cert.pem -e NODE_TLS_KEY=/data/tls/node_key.pem
```

Образ создаёт `/data/tls` при каждом запуске. Храните эти два файла: это удостоверение сервера.

## Docker: другие сюрпризы

- **`server.toml` не читается.** Образ задаёт `NODE_PROVIDER_DISABLE_CONFIG=true`, так что каждая
  настройка берётся из переменных `NODE_*` ([все настройки](/ru/hosting/configuration/#все-настройки)).
  Если вам удобнее файл, задайте `NODE_PROVIDER_DISABLE_CONFIG=false`; тогда сервер читает и пишет
  `/data/server.toml`.
- **«Permission denied» при запуске**, или скопированные файлы не подхватываются: сервер работает от
  пользователя 10001. `sudo chown -R 10001:10001 data`, затем перезапуск.
- **Консоль не реагирует.** У контейнера без терминала консоли нет; запустите его с терминалом
  (`-it` или `stdin_open` и `tty` в Compose) и подключитесь через `docker attach`.

## Сервера нет в списке

См. [Попасть в список → Если не получается](/ru/hosting/registering/#если-не-получается). Чаще всего
дело в порте: NodeMP должен достучаться до сервера снаружи, прежде чем покажет его.

## Игрок жалуется на лаги

Найдите строки `netstats` этого игрока в логе, по одной каждые 15 секунд: `rtt` — его время отклика
в миллисекундах, `loss` — доля пакетов с позицией, которые так и не дошли. Высокие `rtt` или `loss`
у одного игрока при нормальных у остальных — это его связь; отправьте ему страницу
[VPN и плохая связь](/ru/players/vpn/). Высокие цифры у всех указывают на связь самого сервера.
