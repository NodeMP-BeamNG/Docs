// Turns the markdown that `sdk/tools/apigen.py docs` writes into Starlight pages.
// apigen computes anchors its own way; Astro ids headings with github-slugger,
// so every in-page and cross-page anchor is re-keyed through a heading map.
import GithubSlugger from 'github-slugger';

export const BASE = '/plugins/api/';
export const PAGE_FILES = { 'README.md': 'index.md', 'lua.md': 'lua.md', 'raw.md': 'raw.md', 'c.md': 'c.md', 'events.md': 'events.md' };
export const PAGE_URLS = { 'README.md': BASE, 'lua.md': BASE + 'lua/', 'raw.md': BASE + 'raw/', 'c.md': BASE + 'c/', 'events.md': BASE + 'events/' };
export const TITLES = { 'README.md': 'API reference' };
export const DESCRIPTIONS = {
  'README.md': 'The server-side plugin API: Lua node.*, node.raw, the C ABI and every event, generated from sdk/api.toml.',
  'lua.md': 'Every node.* function and Player/Vehicle method a resource can call.',
  'raw.md': 'node.raw: the 1:1 Lua mirror of the C ABI.',
  'c.md': 'The NodeApi C ABI for native modules.',
  'events.md': 'Every event name, its kind and its handler arguments.',
};
export const GUIDE_LINKS = {
  'guides/getting-started.md': '/plugins/getting-started/',
  'guides/resources.md': '/plugins/resources/',
  'guides/events.md': '/plugins/events/',
  'guides/concurrency.md': '/plugins/concurrency/',
  'guides/wire.md': '/plugins/client-scripting/',
  'guides/native-modules.md': '/plugins/native-modules/',
  'guides/recipes.md': '/plugins/recipes/',
  'guides/conventions.md': '/plugins/conventions/',
};

export function apigenAnchor(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Astro runs remark-smartypants before it ids a heading: outside inline code a
// run of exactly two hyphens becomes an em dash, which github-slugger drops
// (a literal hyphen it keeps). Mirror that, and drop the backticks, so the map
// yields the ids Astro actually emits.
function headingText(raw) {
  return raw.split('`').map((seg, i) => (i % 2 ? seg : seg.replace(/(?<!-)--(?!-)/g, '\u2014'))).join('');
}

export function headingMap(markdown) {
  const slugger = new GithubSlugger();
  const map = new Map();
  for (const line of markdown.split(/\r?\n/)) {
    const m = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const gh = slugger.slug(headingText(m[1]));
    const ap = apigenAnchor(m[1]);
    if (!map.has(ap)) map.set(ap, gh);
  }
  return map;
}

function stripH1(markdown) {
  const lines = markdown.split(/\r?\n/);
  const i = lines.findIndex((l) => /^# /.test(l));
  const title = i >= 0 ? lines[i].replace(/^# /, '').replace(/`/g, '').trim() : '';
  if (i >= 0) lines.splice(i, 1);
  return { title, body: lines.join('\n').replace(/^\n+/, '') };
}

// The hand-written guides arrive with the content tasks. Until a target page
// exists its links go to `fallback`, so the build never ships a dead link and
// the links validator stays strict; once the page lands the real link is used.
export function resolveGuideLinks(pageExists, fallback = '/plugins/overview/') {
  return Object.fromEntries(Object.entries(GUIDE_LINKS).map(([g, url]) => [g, pageExists(url) ? url : fallback]));
}

export function transformPage(name, markdown, maps, guideLinks = GUIDE_LINKS) {
  const { title: h1, body } = stripH1(markdown);
  const own = maps[name] || headingMap(markdown);
  let text = body;
  // ../../sdk/api.toml → plain code (the sdk repo is private)
  text = text.replace(/\[`?([^\]`]+)`?\]\(\.\.\/\.\.\/sdk\/api\.toml\)/g, '`$1`');
  // guides/*.md → hand-written pages
  text = text.replace(/\]\((guides\/[a-z-]+\.md)\)/g, (m, g) => `](${guideLinks[g] || '/plugins/overview/'})`);
  // other.md#anchor / other.md → absolute page url (+ re-keyed anchor)
  text = text.replace(/\]\((README|lua|raw|c|events)\.md(#[^)]+)?\)/g, (m, page, hash) => {
    const url = PAGE_URLS[page + '.md'];
    if (!hash) return `](${url})`;
    const key = hash.slice(1);
    const target = (maps[page + '.md'] || new Map()).get(key) || key;
    return `](${url}#${target})`;
  });
  // same-page anchors
  text = text.replace(/\]\(#([^)]+)\)/g, (m, key) => `](#${own.get(key) || key})`);
  const title = TITLES[name] || h1;
  const description = DESCRIPTIONS[name] || '';
  const fm = `---\ntitle: ${yamlString(title)}\ndescription: ${yamlString(description)}\n---\n\n`;
  return { file: PAGE_FILES[name], text: fm + text.trimEnd() + '\n' };
}

function yamlString(s) {
  return /[:#'"{}\[\]&*!|>%@`]/.test(s) ? JSON.stringify(s) : s;
}

export function placeholderPage() {
  return [
    '---', 'title: API reference',
    'description: The plugin API reference is generated from sdk/api.toml at build time.',
    '---', '',
    'This reference is generated from `sdk/api.toml` when the site is built. This copy was built without the SDK checkout, so the generated pages are not included.',
    '', 'To see them locally, clone `NodeMP-BeamNG/sdk` next to this repository (or set `NODEMP_SDK_DIR`) and run `npm run gen:api`.', '',
  ].join('\n');
}
