---
title: Registering your host
description: Register your server with the backend so it appears in the public list — create a host, open a session, and beacon — plus loopback/LAN testing without a backend.
---

A NodeMP server only shows up in the **public server browser** if it is registered with the
backend. Registration gives your server a **host id** and **host secret**; with those it opens an
authenticated *host session* and sends a periodic *beacon* that keeps it listed.

If you only want a private or LAN server, you can skip all of this — see
[Testing without the backend](#testing-without-the-backend) at the bottom.

## How listing works

```
register host ──▶ HostId + HostSecret ──▶ ServerConfig.toml [Backend]
                                              │
server starts ───────────────────────────────┘
   │  POST /v1/hosts/session   (HostId + HostSecret)  → session token
   └─ POST /v1/hosts/beacon    (every interval)       → stays listed
```

The server reaches the backend at the URL in `NODEMP_BACKEND_URL` (see
[Running the server](/hosting/running/)). It opens a host session with your credentials, then
beacons its live state (player count, map, name, tags, version, mod list…) so the browser keeps a
fresh *presence* record that expires shortly after the beacons stop.

## 1. Get a HostId and HostSecret

You need a backend account first (register through the launcher, or
`POST /v1/auth/register`). Then create a host. The easiest way is the helper script
`deploy/register-host.sh`, which logs in, calls `POST /v1/hosts`, prints the credentials, and can
write them straight into your config:

```bash
NODEMP_BACKEND_URL=http://<backend-ip>:8080 \
  bash deploy/register-host.sh http://<backend-ip>:8080 /opt/nodemp/ServerConfig.toml
```

It prints:

```
HostId     = <id>
HostSecret = <secret>
(the secret is shown only once — store it now)
```

:::caution
The **host secret is shown only once**. Store it immediately. If you lose it, rotate it with
`POST /v1/hosts/{id}/rotate-secret` (which returns a new secret and invalidates the old one).
:::

Prefer to do it by hand? Create the host directly:

```bash
curl -X POST http://<backend-ip>:8080/v1/hosts \
  -H "Authorization: Bearer <access-token>" \
  -H 'Content-Type: application/json' \
  -d '{"label":"my-nodemp-host"}'
# → {"host_id":"...","host_secret":"..."}
```

## 2. Put the credentials in the config

Add them to the `[Backend]` section of `ServerConfig.toml` and set `Private = false` so the node
is allowed in the public list:

```toml
[Server]
Private = false

[Backend]
HostId     = "<id>"
HostSecret = "<secret>"
```

Restart the server. On a healthy start it reports the mesh as *registered as '<id>'*.

## 3. Choose private-by-IP or public-listed

Two backend flags decide how strict the join path is. Pick the mode that matches your goal:

| | Private / by IP (default) | Public list |
|---|---|---|
| Players find the server | by direct IP in the launcher | in the server browser |
| `NODEMP_PROBE_ENABLED` | `false` | `true` (backend must reach `30814`) |
| `NODEMP_STRICT_REDEEM_IP` | `false` (flexible behind NAT) | `true` (stricter) |
| `ServerConfig.toml` `Private` | `true` | `false` |
| Port `30814` exposed | for players | for players **and** the probe |

Accounts work in both modes. For a public listing the backend's **probe** must be able to reach
your `30814` from outside, so forward the port accordingly.

## 4. Preflight the chain

Before inviting players, verify the whole auth path — backend reachable → host session → join
ticket → redeem — with `deploy/preflight.sh`. Run it **on the game-server host** so the backend
sees the same public IP:

```bash
NODEMP_BACKEND_URL=http://<backend-ip>:8080 \
NODEMP_HOST_ID=<id> NODEMP_HOST_SECRET=<secret> \
NODEMP_HOST_ADDR=<public-ip>:30814 \
  bash deploy/preflight.sh
```

Each step prints `OK`/`FAIL` with a hint, so a broken link (address, JWT, host creds, probe,
IP/host mismatch) is obvious before players try to connect.

## Host endpoints reference

The backend exposes these `/v1` routes (the server and helper scripts call them for you):

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /v1/hosts` | account | Create a host → `{ host_id, host_secret }`. |
| `GET /v1/hosts` | account | List your hosts. |
| `POST /v1/hosts/{id}/rotate-secret` | account | Issue a new secret → `{ host_secret }`. |
| `DELETE /v1/hosts/{id}` | account | Remove a host. |
| `POST /v1/hosts/session` | host creds | Open a host session → `{ session_token, expires_in, beacon_interval }`. |
| `POST /v1/hosts/beacon` | host session | Refresh presence → `{ listed, advisories, next_in }`. |

Accounts are capped to a maximum number of hosts each (admins are unlimited).

## Testing without the backend

You do **not** need any of this for a local or LAN test:

- **Loopback** — a connection from `127.0.0.1` is trusted automatically when
  `[Network] TrustLoopback = true` (the default), so you can join your own server with no
  backend and no account. This is the [quick start](/hosting/quick-start/) path.
- **LAN** — leave `[Backend]` blank and `Private = true`; players connect by your machine's LAN
  IP and direct port. Note that off-machine players are **not** loopback, so they still go
  through the normal account/ticket path if the server points at a backend; for a pure no-account
  LAN test keep `NODEMP_BACKEND_URL` unset/unreachable and use loopback on the host itself.

:::caution
If your server sits behind a reverse proxy that connects from `127.0.0.1`, set
`TrustLoopback = false` — otherwise external players arriving via the proxy could be treated as
trusted loopback peers.
:::

## Common problems

- **Not in the list** — is it public mode (`Private = false`, `NODEMP_PROBE_ENABLED=true`) and is
  port `30814` reachable from outside? If the probe can't reach you, you won't be listed.
- **`redeem failed` / `ticket_host_mismatch`** — the ticket's host address (public IP) didn't
  match the IP the server opened its session from (NAT). For a relaxed test set
  `NODEMP_STRICT_REDEEM_IP=false`.
- **Host session fails** — wrong `HostId`/`HostSecret`. Re-run `register-host.sh` or rotate the
  secret.

## Next steps

- [Updating](/hosting/updating/) — keep your server current.
- [Resources & mods](/hosting/resources/) — server plugins and client mods.
