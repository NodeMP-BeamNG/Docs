---
title: Server in Docker
description: Load the Node-Server image from the release, prepare a data folder, run the container with docker run or Compose, and set it up with variables.
---

The image runs on any Linux with Docker, including systems older than Ubuntu 24.04. It already has
Lua 5.1 for the obfuscator and a container health check.

## Load the image

The image comes with the release as a file. Download `nodemp-server-v1.10.0-image.tar` from the
[release page](https://github.com/NodeMP-BeamNG/releases/releases/tag/server-v1.10.0) and load it
into Docker:

```bash
docker load -i nodemp-server-v1.10.0-image.tar
```

Docker answers `Loaded image: nodemp-server:1.10.0-d3d67cc`. That tag is what you run.

## How the container works

- **Settings are environment variables only.** The image doesn't read `server.toml`: each setting
  has a variable of its own, `NODE_NAME` for `[server] name` and so on. The full list is on
  [server.toml](/hosting/configuration/#every-setting).
- **Everything the server writes lives in `/data`**: resources, mods, storage, bans, logs. The
  program's own folder is read-only.
- **The server runs as user id 10001.** The data folder must belong to it.
- **The TLS certificate must be in `/data` too.** By default the server puts it next to the
  program, which is read-only. The two variables below move it to `/data/tls`.

## Prepare the data folder

```bash
mkdir -p data && sudo chown 10001:10001 data
```

## Run it

```bash
docker run -d --name nodemp --restart unless-stopped \
  -p 30814:30814/tcp -p 30814:30814/udp \
  -v "$PWD/data:/data" \
  -e NODE_TLS_CERT=/data/tls/node_cert.pem \
  -e NODE_TLS_KEY=/data/tls/node_key.pem \
  -e NODE_NAME="Friday freeroam" \
  -e NODE_MAP=/levels/west_coast_usa/info.json \
  nodemp-server:1.10.0-d3d67cc
```

To follow the log:

```bash
docker logs -f nodemp
```

To change a setting, remove the container (`docker rm -f nodemp`) and run it again with new
variables. The `data/` folder isn't touched.

## The same with Compose

With Compose the settings are easier to edit in a file. Put `compose.yaml` next to the `data/`
folder:

```yaml
services:
  nodemp:
    image: nodemp-server:1.10.0-d3d67cc
    restart: unless-stopped
    ports: ["30814:30814/tcp", "30814:30814/udp"]
    volumes: ["./data:/data"]
    stdin_open: true
    tty: true
    env_file: .env
    environment:
      NODE_TLS_CERT: /data/tls/node_cert.pem
      NODE_TLS_KEY: /data/tls/node_key.pem
      NODE_NAME: Friday freeroam
      NODE_MAP: /levels/west_coast_usa/info.json
```

Put secrets such as the server key ([Get listed](/hosting/registering/)) into a `.env` file next to
it, readable only by you (`chmod 600 .env`). Until you have secrets the file can be empty, but it
must exist (`touch .env`). Then:

```bash
docker compose up -d
docker compose logs -f
```

After editing `compose.yaml`, run `docker compose up -d` again: Compose recreates the container and
`data/` stays as it is.

## The console

`stdin_open` and `tty` give the server a terminal, and with it a console. To reach it:

```bash
docker attach nodemp
```

Under Compose without a `container_name`, `docker compose ps` shows the container's name. To leave
without stopping the server, press Ctrl+P, then Ctrl+Q. With `docker run`, add `-it` to get a
console.

## Resources and mods

Copy resources into `data/resources/` and mods into `data/content/`. User 10001 must be able to read
them, so run `sudo chown -R 10001:10001 data` after copying. The server reads mods when it starts,
so restart the container afterwards (`docker restart nodemp`).

Native modules live inside the image, not in `/data`: to add one, build your own image on top of
this one.

## Next

- [Get listed](/hosting/registering/).
- [Updating the server](/hosting/updating/#docker).
- [When the server misbehaves](/hosting/troubleshooting/#docker).
