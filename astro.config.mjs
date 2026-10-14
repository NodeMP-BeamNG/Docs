// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import { existsSync } from 'node:fs';

// scripts/import-api.mjs (prebuild/predev) has already run when Astro loads this file.
const apiGenerated = existsSync('./src/content/docs/plugins/api/lua.md');

const locales = {
  root: { label: 'English', lang: 'en' },
  ru: { label: 'Русский', lang: 'ru' },
};

// The bar slides (nodemp.css, nmp-fold) only between a locale's overview, which carries the
// site's pill, and a page with the corner bar. In the head: pagereveal fires before the new
// page's first frame, which can come before the parser reaches the header.
function foldBetweenBars(overviews) {
  addEventListener('pagereveal', (e) => {
    const from = e.viewTransition?.types && window.navigation?.activation?.from?.url;
    if (!from) return;
    const overview = (path) => overviews.includes(path.replace(/\/?$/, '/'));
    if (overview(new URL(from).pathname) !== overview(location.pathname)) e.viewTransition.types.add('nmp-fold');
  });
}
// Every redirect in each locale: '/a/' -> '/b/' also gives '/ru/a/' -> '/ru/b/'.
const withLocales = (map) => Object.fromEntries(Object.entries(map).flatMap(([from, to]) =>
  Object.keys(locales).map((code) => (code === 'root' ? [from, to] : [`/${code}${from}`, `/${code}${to}`]))));

const overviews = Object.keys(locales).map((code) => (code === 'root' ? '/' : `/${code}/`));

export default defineConfig({
  site: 'https://docs.nodemp.com',
  // The styles ride in each page instead of a second request: the first paint then waits
  // for the page alone, so arriving from nodemp.com shows no empty frame between the sites.
  build: { inlineStylesheets: 'always' },
  // Removed slugs and where they live now, the same in every locale. Astro writes a
  // meta-refresh page for each.
  redirects: withLocales({
    '/introduction/beammp-compatibility/': '/introduction/differences-from-beammp/',
    '/framework/overview/': '/introduction/how-it-works/',
    '/framework/sync/': '/introduction/how-it-works/',
    '/plugins/server-api/': '/plugins/api/lua/',
    '/plugins/client-api/': '/plugins/client-scripting/',
    // The section root has no page of its own; readers type it.
    '/plugins/': '/plugins/overview/',
    '/plugins/protocol/': '/reference/protocol/',
    '/players/vpn/': '/players/connection/',
    '/support/': '/players/troubleshooting/',
    '/support/troubleshooting/': '/players/troubleshooting/',
    '/support/joining/': '/players/troubleshooting/',
    '/support/strict-servers/': '/players/troubleshooting/',
    '/support/launcher/': '/players/troubleshooting/',
    '/support/logs/': '/players/troubleshooting/',
    '/support/error-codes/': '/reference/error-codes/',
    '/support/faq/': '/reference/faq/',
    '/hosting/command-line/': '/hosting/configuration/',
    '/hosting/startup-messages/': '/hosting/troubleshooting/',
    '/hosting/running/': '/hosting/quick-start/',
  }),
  integrations: [
    starlight({
      title: 'NodeMP',
      favicon: '/favicon.svg',
      // Fetched with the page rather than when the CSS asks, so the text is usually set
      // in them from the first paint.
      head: [
        { tag: 'link', attrs: { rel: 'preload', href: '/fonts/GolosText-Variable.woff2', as: 'font', type: 'font/woff2', crossorigin: '' } },
        { tag: 'link', attrs: { rel: 'preload', href: '/fonts/Unbounded-800.woff2', as: 'font', type: 'font/woff2', crossorigin: '' } },
        { tag: 'script', content: `(${foldBetweenBars})(${JSON.stringify(overviews)})` },
      ],
      // The NodeMP theme: the site's tokens and components in Starlight's places (src/styles/nodemp.css).
      customCss: ['./src/styles/nodemp.css'],
      components: {
        Header: './src/components/Header.astro',
        Footer: './src/components/Footer.astro',
        PageTitle: './src/components/PageTitle.astro',
        MobileMenuFooter: './src/components/MobileMenuFooter.astro',
        ThemeProvider: './src/components/ThemeProvider.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
      },
      expressiveCode: {
        themes: ['github-dark-default'],
        // Inline as well, for the same reason as build.inlineStylesheets above.
        emitExternalStylesheet: false,
        styleOverrides: {
          borderRadius: '13px',
          borderColor: 'rgb(255 255 255 / 0.07)',
          codeBackground: '#1b1b1b',
          codeFontFamily: "ui-monospace, 'Cascadia Mono', 'SF Mono', Menlo, Consolas, monospace",
          uiFontFamily: "'Golos Text', 'Segoe UI', system-ui, sans-serif",
          frames: {
            frameBoxShadowCssValue: 'none',
            editorTabBarBackground: '#1b1b1b',
            editorActiveTabBackground: '#222222',
            editorActiveTabIndicatorTopColor: 'transparent',
            editorActiveTabIndicatorBottomColor: 'rgb(255 255 255 / 0.35)',
            terminalTitlebarBackground: '#1b1b1b',
            terminalBackground: '#1b1b1b',
          },
        },
      },
      plugins: [starlightLinksValidator({
        errorOnRelativeLinks: true,
        errorOnFallbackPages: false,
        // Without the sdk only the placeholder /plugins/api/ exists: skip links into the generated pages.
        exclude: apiGenerated ? [] : ['/plugins/api/**', '/ru/plugins/api/**'],
      })],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/NodeMP-BeamNG' },
      ],
      defaultLocale: 'root',
      locales,
      // Item labels come from the page titles (slug entries), so the RU sidebar
      // shows the RU titles without a second list of labels here.
      sidebar: [
        { label: 'Getting started', translations: { ru: 'Начало' }, items: [
          // The mark in the bar goes to nodemp.com, so the docs' own front page is here.
          { slug: 'index', label: 'All sections', translations: { ru: 'Все разделы' } },
          { slug: 'introduction/what-is-nodemp' },
          { slug: 'introduction/how-it-works' },
          { slug: 'introduction/differences-from-beammp' },
        ]},
        { label: 'Players', translations: { ru: 'Игрокам' }, items: [
          { slug: 'players/install' },
          { slug: 'players/sign-in' },
          { slug: 'players/join' },
          { slug: 'players/settings' },
          { slug: 'players/connection' },
          { slug: 'players/troubleshooting' },
        ]},
        { label: 'Hosting a server', translations: { ru: 'Свой сервер' }, items: [
          { slug: 'hosting/quick-start' },
          { slug: 'hosting/windows' },
          { slug: 'hosting/linux' },
          { slug: 'hosting/docker' },
          { slug: 'hosting/configuration' },
          { slug: 'hosting/registering' },
          { slug: 'hosting/mods' },
          { slug: 'hosting/resources' },
          { slug: 'hosting/administration' },
          { slug: 'hosting/strict-verification' },
          { slug: 'hosting/updating' },
          { slug: 'hosting/troubleshooting' },
        ]},
        { label: 'Plugin development', translations: { ru: 'Разработка плагинов' }, items: [
          { label: 'Start here', translations: { ru: 'С чего начать' }, items: [
            { slug: 'plugins/overview' },
            { slug: 'plugins/getting-started' },
            { slug: 'plugins/examples' },
            { slug: 'plugins/conventions' },
          ]},
          { label: 'Resources and events', translations: { ru: 'Ресурсы и события' }, items: [
            { slug: 'plugins/resources' },
            { slug: 'plugins/events' },
            { slug: 'plugins/players-and-vehicles' },
            { slug: 'plugins/chat' },
            { slug: 'plugins/concurrency' },
            { slug: 'plugins/bus' },
          ]},
          { label: 'Data and network', translations: { ru: 'Данные и сеть' }, items: [
            { slug: 'plugins/storage' },
            { slug: 'plugins/database' },
            { slug: 'plugins/http' },
          ]},
          { label: 'Client and native code', translations: { ru: 'Клиент и нативный код' }, items: [
            { slug: 'plugins/client-scripting' },
            { slug: 'plugins/native-modules' },
            { slug: 'plugins/js-host' },
          ]},
          { label: 'Practice', translations: { ru: 'Практика' }, items: [
            { slug: 'plugins/recipes' },
            // Label override: the page title names BeamMP; the global navigation does not.
            { slug: 'plugins/migrating', label: 'Migrating plugins', translations: { ru: 'Перенос плагинов' } },
          ]},
          // Generated by scripts/import-api.mjs from sdk/api.toml; never edited by hand.
          { label: 'API reference', translations: { ru: 'Справочник API' }, collapsed: true, items: [{ autogenerate: { directory: 'plugins/api' } }] },
        ]},
        { label: 'Reference', translations: { ru: 'Справочник' }, items: [
          { slug: 'reference/error-codes' },
          { slug: 'reference/faq' },
          { slug: 'reference/glossary' },
          { slug: 'reference/protocol' },
        ]},
      ],
    }),
  ],
});
