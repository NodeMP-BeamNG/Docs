#!/usr/bin/env python3
"""A stand-in NodeMP directory for the doctest runner, so the fake players the examples
see have an account behind them.

The server, started with NODE_DIRECTORY_URL pointing here (announcing_env), opens a host
session (POST /v1/hosts/session), beacons (POST /v1/hosts/beacon) and redeems every join
ticket a player brings (POST /v1/play/redeem, bearer = the host session token). The answer
to a redeem is what the server takes the player's identity from: username, roles, guest,
identifiers, account_id. Anything else is refused the way the real directory refuses it:
{"error": {"code": ..., "message": ...}}.

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

# player name -> (join ticket, what the directory answers for it)
CAST = {
    "Alice": ("tk-alice", {"username": "Alice", "roles": "", "guest": False, "account_id": 42,
                           "identifiers": ["nodemp:42"]}),
    "Bob": ("tk-bob", {"username": "Bob", "roles": "", "guest": False, "account_id": 108,
                       "identifiers": ["nodemp:108"]}),
    "Carol": ("tk-carol", {"username": "Carol", "roles": "ADM", "guest": False, "account_id": 7,
                           "identifiers": ["nodemp:7"]}),
    "Guest": ("tk-guest", {"username": "Guest", "roles": "", "guest": True, "identifiers": []}),
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

    # -- the three routes -------------------------------------------------------------

    def _session(self, _headers, _body):
        return 200, {"session_token": HOST_TOKEN, "expires_in": 300, "beacon_interval": 5}

    def _beacon(self, _headers, _body):
        return 200, {"listed": True, "advisories": [], "next_in": 5}

    def _redeem(self, headers, body):
        with self._lock:
            self.redeems.append((headers.get("Authorization", ""), body))
        if headers.get("Authorization", "") != "Bearer " + HOST_TOKEN:
            return 401, {"error": {"code": "token_invalid", "message": "invalid or expired token"}}
        answer = self.by_ticket.get(body.get("ticket", ""))
        if answer is None:
            return 410, {"error": {"code": "ticket_expired", "message": "join ticket invalid or expired"}}
        out = dict(answer)
        out["identifiers"] = list(answer["identifiers"]) + ["ip:" + body.get("client_ip", "")]
        return 200, out

    # -- the http server ----------------------------------------------------------------

    def start(self):
        routes = {"/v1/hosts/session": self._session, "/v1/hosts/beacon": self._beacon,
                  "/v1/play/redeem": self._redeem}

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass  # the runner's output is the doctest table, not the directory's traffic

            def do_POST(self):
                length = int(self.headers.get("Content-Length") or 0)
                raw = self.rfile.read(length) if length else b"{}"
                try:
                    body = json.loads(raw or b"{}")
                except ValueError:
                    status, obj = 400, {"error": {"code": "validation", "message": "bad json"}}
                else:
                    route = routes.get(self.path)
                    if route is None:
                        status, obj = 404, {"error": {"code": "not_found", "message": "no such path"}}
                    else:
                        status, obj = route(self.headers, body if isinstance(body, dict) else {})
                data = json.dumps(obj).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

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
