#!/usr/bin/env node
// `npm run doctest [-- --only events --keep]`: runs scripts/doctest/run.py with the Python this
// machine has (NODEMP_PYTHON, then python3, then python -- the same search import-api.mjs makes)
// and exits with its status. The runner's own help: `npm run doctest -- --help`.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function python() {
  for (const cand of [process.env.NODEMP_PYTHON, 'python3', 'python'].filter(Boolean)) {
    const r = spawnSync(cand, ['--version'], { encoding: 'utf8' });
    if (r.status === 0 && /Python 3\.(1[1-9]|[2-9]\d)/.test(r.stdout + r.stderr)) return cand;
  }
  return null;
}

const py = python();
if (!py) {
  console.error('doctest: no Python 3.11+ on PATH (python3 or python; NODEMP_PYTHON names one to try first)');
  process.exit(2);
}
const r = spawnSync(py, [join(here, 'doctest', 'run.py'), ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);
