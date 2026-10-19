---
title: Server in Docker
description: How to get the Node-Server image, prepare a data folder, run the container with docker run or Compose and set it up with variables.
---

The image runs on any Linux with Docker, including systems older than the Ubuntu 24.04 it is built on. It already has Lua 5.1 for the obfuscator and a health check for the container.

## Get the image

The image is in the `ghcr.io` registry. Its tag is the release tag without `server-`: a `v` and the version number:

```bash
docker pull ghcr.io/nodemp-beamng/server:<tag>
```

On the [download page](https://nodemp.com/download), in the **Your own server** block under **Checksums and Docker**, this command is already filled in with the right tag. Don't use the `latest` tag: it's built from the code in development, not from a release.

## How the container works

- By default the image doesn't read `server.toml`: each setting has an environment variable of its own, `NODE_NAME` for `[server] name` and so on. The full list is in the [settings reference](/hosting/configuration/).
- The server's data is in `/data`: plugins, mods, storage, bans, logs. The server can't change the program's own folder.
- The server runs as user 10001, and the data folder must belong to it.
- The TLS certificate must be in `/data` too. By default the server puts it next to the program, where the image is read-only. The variables below move it to `/data/tls`.

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
  -e NODE_NAME="Evening freeroam" \
  -e NODE_MAP=/levels/west_coast_usa/info.json \
  ghcr.io/nodemp-beamng/server:<tag>
```

`-p` publishes the port the server listens on, for TCP and UDP. If you change the port with `NODE_PORT`, change it in `-p` too. The server doesn't listen on port `25565`, which the image's metadata names (`EXPOSE`), so `-P` doesn't work: publish the port explicitly.

To follow the log:

```bash
docker logs -f nodemp
```

To change a setting, remove the container (`docker rm -f nodemp`) and run it again with the new variables. The `data/` folder isn't touched.

## The same with Compose

With Compose the settings are easier to edit in a file. Put a `compose.yaml` next to the `data/` folder:

```yaml
services:
  nodemp:
    image: ghcr.io/nodemp-beamng/server:<tag>
    restart: unless-stopped
    ports: ["30814:30814/tcp", "30814:30814/udp"]
    volumes: ["./data:/data"]
    stdin_open: true
    tty: true
    env_file: .env
    environment:
      NODE_TLS_CERT: /data/tls/node_cert.pem
      NODE_TLS_KEY: /data/tls/node_key.pem
      NODE_NAME: Evening freeroam
      NODE_MAP: /levels/west_coast_usa/info.json
```

Put the secrets, such as the server key ([Get listed](/hosting/registering/)), in a `.env` file next to it and close it to other users (`chmod 600 .env`). Until you have secrets the file can be empty, but it must exist (`touch .env`). Then:

```bash
docker compose up -d
docker compose logs -f
```

After editing `compose.yaml`, run `docker compose up -d` again: Compose recreates the container, and `data/` stays as it is.

## The console

`stdin_open` and `tty` give the server a terminal, and the server then has a console. To attach to it:

```bash
docker attach nodemp
```

If you started the container with Compose and no `container_name`, `docker compose ps` shows its name. To leave without stopping the server, press Ctrl+P, then Ctrl+Q. With `docker run`, the console appears if you add `-it`.

## Plugins and mods

Copy plugins into `data/resources/` and mods into `data/content/`. The files must be readable by user 10001, so run `sudo chown -R 10001:10001 data` after copying. The server reads mods at start, so restart the container afterwards (`docker restart nodemp`).

Native modules are inside the image, not in `/data`: to add one, build your own image on top of this one.
