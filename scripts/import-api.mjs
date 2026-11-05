#!/usr/bin/env node
// Runs apigen in a scratch copy of the sdk (its `docs` command writes next to
// the sdk folder) and imports the result into src/content/docs/plugins/api/.
// Without an sdk checkout it writes a single placeholder page so the site still builds.
//
// Environment:
//   NODEMP_SDK_DIR     sdk checkout (default ../sdk)
//   NODEMP_PYTHON      interpreter to try first (then python3, python)
//   CI                 set → no sdk/python is an error (exit 1) instead of the placeholder
//   IMPORT_API_STRICT  set to 1 → exit 1 when a guide page apigen links to does not exist
//                      yet (the pages arrive with the content tasks; the final content task
//                      turns this on in CI). Unset: missing guides link to /plugins/overview/
//                      and are listed in one "guide pages missing" summary line.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  headingMap, transformPage, placeholderPage, resolveGuideLinks, GUIDE_LINKS, PAGE_FILES, PAGE_TITLES, TITLES,
} from './lib/api-transform.mjs';

const CONTENT_ROOT = 'src/content/docs';
const OUT_DIRS = ['src/content/docs/plugins/api', 'src/content/docs/ru/plugins/api'];
const sdkDir = resolve(process.env.NODEMP_SDK_DIR || '../sdk');

// `/plugins/events/` exists when src/content/docs/plugins/events.md (or .mdx, or events/index.md) does.
function pageExists(url) {
  const slug = url.replace(/^\/+|\/+$/g, '');
  return ['.md', '.mdx', '/index.md', '/index.mdx'].some((ext) => existsSync(join(CONTENT_ROOT, slug + ext)));
}

function resetOut() {
  for (const d of OUT_DIRS) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }
}

function python() {
  for (const cand of [process.env.NODEMP_PYTHON, 'python3', 'python'].filter(Boolean)) {
    const r = spawnSync(cand, ['--version'], { encoding: 'utf8' });
    if (r.status === 0) return cand;
  }
  return null;
}

function placeholder(reason) {
  console.warn(`import-api: ${reason}; writing the placeholder page`);
  resetOut();
  for (const d of OUT_DIRS) writeFileSync(join(d, 'index.md'), placeholderPage());
  process.exit(0);
}

const hasSdk = existsSync(join(sdkDir, 'api.toml'));
const py = python();
if (!hasSdk || !py) {
  const reason = !hasSdk ? `no sdk at ${sdkDir}` : 'no python3/python on PATH';
  if (process.env.CI) { console.error(`import-api: ${reason}; CI must build the real reference`); process.exit(1); }
  placeholder(reason);
}

const missingGuides = [];
const scratch = mkdtempSync(join(tmpdir(), 'nodemp-apigen-'));
try {
  for (const rel of ['api.toml', 'node.h', 'lua/prelude.lua', 'tools/apigen.py']) {
    cpSync(join(sdkDir, rel), join(scratch, 'sdk', rel));
  }
  const r = spawnSync(py, [join(scratch, 'sdk', 'tools', 'apigen.py'), 'docs'], { encoding: 'utf8' });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  if (r.status !== 0) throw new Error('import-api: apigen docs failed');
  const src = join(scratch, 'docs', 'api');
  const raw = Object.fromEntries(Object.keys(PAGE_FILES).map((n) => [n, readFileSync(join(src, n), 'utf8')]));
  const maps = Object.fromEntries(Object.entries(raw).map(([n, t]) => [n, headingMap(t)]));
  const guideLinks = resolveGuideLinks(pageExists);
  for (const [g, url] of Object.entries(GUIDE_LINKS)) {
    if (guideLinks[g] !== url) missingGuides.push(url);
  }
  resetOut();
  for (const [name, text] of Object.entries(raw)) {
    const page = transformPage(name, text, maps, guideLinks);
    const title = /^title: (.*)$/m.exec(page.text)[1].replace(/^"(.*)"$/, (m, s) => JSON.parse(m));
    if (title !== (TITLES[name] || PAGE_TITLES[name])) {
      console.warn(`import-api: ${name} is titled "${title}" but links to it read "${PAGE_TITLES[name]}"; update PAGE_TITLES`);
    }
    for (const d of OUT_DIRS) writeFileSync(join(d, page.file), page.text);
  }
  console.log(`import-api: wrote ${Object.keys(raw).length} pages to ${OUT_DIRS.join(' and ')}`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

if (missingGuides.length) {
  const strict = process.env.IMPORT_API_STRICT === '1';
  console[strict ? 'error' : 'warn'](
    `import-api: ${missingGuides.length} guide page(s) missing, linked to /plugins/overview/ instead: ${missingGuides.join(' ')}` +
    (strict ? ' (IMPORT_API_STRICT=1: failing)' : ''),
  );
  if (strict) process.exitCode = 1;
}
