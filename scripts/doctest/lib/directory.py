#!/usr/bin/env python3
"""A stand-in NodeMP directory for the doctest runner, so the fake players the examples
see have an account behind them.

The server, started with NODE_DIRECTORY_URL pointing here (announcing_env), opens a host
session (POST /v1/host/sessions), beacons (POST /v1/host/beacons), may upload its map
picture (PUT /v1/host/preview) and redeems every join ticket a player brings
(POST /v1/host/tickets/redeem, bearer = the host session token). The answer to a redeem is
what the server takes the player's identity from: username, roles, guest, identifiers,
account_id, install_id. Anything else is refused the way the real directory refuses it, in
problem+json.

The cast is fixed and is what the guides' examples key on: Alice is account 42 and Bob is
account 108 -- the two ids the permissions recipe lists as admins -- Carol carries the
directory role "ADM", and Guest is a Test Drive session with no account (player.accountId
is nil for her).
"""
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
HOST_TOKEN = "docs-doctest-host-session"
INTERVAL = 5

# player name -> (join ticket, what the directory answers for it)
CAST = {
    "Alice": ("tk-alice", {"username": "Alice", "roles": [], "guest": False, "account_id": 42,
                           "identifiers": ["nodemp:42"], "install_id": None}),
    "Bob": ("tk-bob", {"username": "Bob", "roles": [], "guest": False, "account_id": 108,
                       "identifiers": ["nodemp:108"], "install_id": None}),
    "Carol": ("tk-carol", {"username": "Carol", "roles": ["ADM"], "guest": False, "account_id": 7,
                           "identifiers": ["nodemp:7"], "install_id": None}),
    "Guest": ("tk-guest", {"username": "Guest", "roles": [], "guest": True, "account_id": None,
                           "identifiers": [], "install_id": None}),
}


def ticket_of(name):
    """The join ticket of a cast member; "" (a direct connect, no ticket) for anyone else."""
    return CAST[name][0] if name in CAST else ""


def announcing_env(url):
    """The NODE_DIRECTORY_* environment that makes a server announce to `url` and redeem
    tickets there. Plain http: the stand-in has no certificate, so AllowInsecure is on."""
    return {
        "NODE_DIRECTORY_URL": url,
        "NODE_DIRECTORY_HOST_ID": "docs-doctest",
        "NODE_DIRECTORY_HOST_SECRET": "docs-doctest-secret",
        "NODE_DIRECTORY_ALLOW_INSECURE": "true",
    }


def problem(status, code, detail):
    return {"type": "https://nodemp.com/errors/" + code, "code": code, "title": detail,
            "detail": detail, "status": status, "request_id": "docs-doctest"}


class Directory:
    """The stand-in on `port` for the duration of a `with` block; `url` is what to announce to."""

    def __init__(self, port, host=HOST):
        self.port = port
        self.host = host
        self.by_ticket = {ticket: answer for ticket, answer in CAST.values()}
        self.redeems = []           # (bearer, request body) of every redeem, for the curious
        self._lock = threading.Lock()
        self._httpd = None
        self._thread = None

    @property
    def url(self):
        return "http://%s:%d" % (self.host, self.port)

    # -- the routes -----------------------------------------------------------------------

    def _session(self, _headers, _body):
        return 200, {"session_token": HOST_TOKEN, "expires_in": 3600, "beacon_interval": INTERVAL}

    def _beacon(self, _headers, _body):
        return 200, {"listing": {"visible": True, "reason": "", "unreachable": False},
                     "advisories": [], "next_in": INTERVAL, "kick": []}

    def _redeem(self, headers, body):
        with self._lock:
            self.redeems.append((headers.get("Authorization", ""), body))
        answer = self.by_ticket.get(body.get("ticket", ""))
        if answer is None:
            return 403, problem(403, "ticket_invalid", "The join ticket is not valid.")
        out = json.loads(json.dumps(answer))
        if body.get("client_ip"):
            out["identifiers"].append("ip:" + body["client_ip"])
        return 200, out

    # -- the http server ----------------------------------------------------------------

    def start(self):
        posts = {"/v1/host/beacons": self._beacon, "/v1/host/tickets/redeem": self._redeem}

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass  # the runner's output is the doctest table, not the directory's traffic

            def answer(self, status, obj):
                data = json.dumps(obj).encode() if obj is not None else b""
                self.send_response(status)
                if obj is not None:
                    self.send_header("Content-Type", "application/json" if status < 400 else "application/problem+json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def body(self):
                length = int(self.headers.get("Content-Length") or 0)
                return self.rfile.read(length) if length else b""

            def authorized(self):
                return self.headers.get("Authorization", "") == "Bearer " + HOST_TOKEN

            def do_POST(self):
                raw = self.body()
                try:
                    body = json.loads(raw or b"{}")
                except ValueError:
                    return self.answer(400, problem(400, "validation", "The request is not valid."))
                body = body if isinstance(body, dict) else {}
                if self.path == "/v1/host/sessions":
                    return self.answer(*outer._session(self.headers, body))
                route = posts.get(self.path)
                if route is None:
                    return self.answer(404, problem(404, "not_found", "Not found."))
                if not self.authorized():
                    return self.answer(401, problem(401, "token_invalid", "The token is not valid."))
                self.answer(*route(self.headers, body))

            def do_PUT(self):
                self.body()
                if self.path != "/v1/host/preview":
                    return self.answer(404, problem(404, "not_found", "Not found."))
                if not self.authorized():
                    return self.answer(401, problem(401, "token_invalid", "The token is not valid."))
                self.answer(204, None)

        outer = self
        self._httpd = ThreadingHTTPServer((self.host, self.port), Handler)
        self._thread = threading.Thread(target=self._httpd.serve_forever, daemon=True)
        self._thread.start()
        return self

    def stop(self):
        if self._httpd is not None:
            self._httpd.shutdown()
            self._httpd.server_close()
            self._httpd = None

    def __enter__(self):
        return self.start()

    def __exit__(self, *_):
        self.stop()
        return False
