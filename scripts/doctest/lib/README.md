# The runner's own helpers

Everything in this folder is this repository's code. Nothing from the server repository or the
examples is copied here: both are private and this repository is public. `run_test.py`
(`NothingVendoredTests`, part of `npm test` and of the CI `doctest` job) fails when a file here
carries one of their names or one of their header lines.

- `directory.py` - a stand-in NodeMP directory (host session, beacons, join-ticket redeems) with
  a fixed cast: Alice = account 42, Bob = 108 (the ids the recipes use), Carol a directory
  admin, Guest a Test Drive session without an account. Written after the shape of the real
  directory's answers as `server/run/identity_test.py` exercises them.

Chat has no stand-in: it is part of the server, so the examples run against the real one.

The wire codec and the fake player (`wire.py`, `wire_taxonomy.py`, `testclient.py`) are imported
at run time from `run/` of a `NodeMP-BeamNG/server` checkout: `NODEMP_SERVER_DIR`, else `./server`
(what CI clones with the read-only `SERVER_DEPLOY_KEY`, `run/` only), else `../server`. The
`zstandard` package is needed with them on Python 3.12 and 3.13.
