---
title: "Вход и список серверов"
description: "Если не получается войти или список серверов пуст."
---

## Вход в аккаунт

| Сообщение | Причина | Решение |
|---|---|---|
| `Enter a username and a password of at least four characters.` | Собственная проверка формы. | Заполните оба поля. |
| `invalid username or password` | Неверные учётные данные. | Сбросьте пароль на [nodemp.com/forgot](https://nodemp.com/forgot). |
| `please verify your e-mail first` | Ссылка подтверждения не была открыта. | Откройте её; она действует недолго, поэтому зарегистрируйтесь заново под другим именем, если ссылка пропала. |
| `username must be 3-24 chars [A-Za-z0-9_-]`, `password must be 8-200 chars`, `already exists` | Правила директории для нового аккаунта. | Выберите другое имя или более длинный пароль. |
| `two-factor code required or invalid` | У аккаунта включена двухфакторная аутентификация; в лаунчере нет поля для кода. | Играйте как Test Drive или используйте аккаунт без двухфакторной аутентификации. |
| `could not reach the directory: …` | Нет связи с `https://api.nodemp.com`. | Проверьте соединение и VPN. |

## Список серверов пуст

- Экран **No connection** (`NodeMP cannot reach its server list. Check that you are online —
  and if you use a VPN for a test server, that it is connected.`): директория не ответила при
  запуске. *Try again* или *Continue without the list*; Direct Connect продолжает работать. Пока
  директория недоступна, Refresh сообщает `Could not reach NodeMP at https://api.nodemp.com`.
  Подключение, сделанное при недоступной директории, идёт без билета на подключение, так что
  никто не проверяет, кто вы: войдя в аккаунт, вы приходите под именем аккаунта, но непроверенным.
  Сервер без ключа сервера и так берёт имена как есть. Сервер из списка, разрешающий Test Drive,
  пускает подключение без билета как непроверенного гостя; сервер с *Account required* отказывает
  ему с `Disconnected · This server requires a NodeMP account: sign in to the launcher and join again`.
- `No servers online` / `Nobody is hosting right now.`: директория ответила пустым списком. С
  вашей стороны всё в порядке.
- `Nothing matches these filters`: откройте **Filters** и нажмите *Reset*. Favorites и Recent
  показывают только серверы, которые сейчас в сети.
- Сервер, который точно работает, но не виден, — приватный, не числится в списке (нет ключа
  сервера) или перестал посылать маяки. Подключайтесь к нему через Direct Connect.

`could not remove …: …` в разделе Content означает, что BeamNG.drive держит архив; закройте игру
и удалите снова.

