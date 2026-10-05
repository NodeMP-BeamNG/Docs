// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import { existsSync } from 'node:fs';

// scripts/import-api.mjs (prebuild/predev) has already run when Astro loads this file.
const apiGenerated = existsSync('./src/content/docs/plugins/api/lua.md');

export default defineConfig({
  site: 'https://docs.nodemp.com',
  // Slugs removed by the phase-4 rewrite. Astro emits a meta-refresh page for each.
  redirects: {
    '/introduction/beammp-compatibility/': '/introduction/differences-from-beammp/',
    '/ru/introduction/beammp-compatibility/': '/ru/introduction/differences-from-beammp/',
    '/plugins/server-api/': '/plugins/api/lua/',
    '/ru/plugins/server-api/': '/ru/plugins/api/lua/',
    '/plugins/client-api/': '/plugins/client-scripting/',
    '/ru/plugins/client-api/': '/ru/plugins/client-scripting/',
    // The section root has no page of its own; readers type it.
    '/plugins/': '/plugins/overview/',
    '/ru/plugins/': '/ru/plugins/overview/',
    // The 2026-10 restructure: support pages moved out of players/ and reference/.
    '/players/troubleshooting/': '/support/troubleshooting/',
    '/ru/players/troubleshooting/': '/ru/support/troubleshooting/',
    '/reference/error-codes/': '/support/error-codes/',
    '/ru/reference/error-codes/': '/ru/support/error-codes/',
    '/reference/faq/': '/support/faq/',
    '/ru/reference/faq/': '/ru/support/faq/',
    '/support/': '/support/troubleshooting/',
    '/ru/support/': '/ru/support/troubleshooting/',
  },
  integrations: [
    starlight({
      title: 'NodeMP',
      favicon: '/favicon.svg',
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
      locales: {
        root: { label: 'English', lang: 'en' },
        ru: { label: 'Русский', lang: 'ru' },
      },
      // Item labels come from the page titles (slug entries), so the RU sidebar
      // shows the RU titles without a second list of labels here.
      sidebar: [
        { label: 'Getting started', translations: { ru: 'Начало' }, items: [
          { slug: 'introduction/what-is-nodemp' },
          { slug: 'introduction/differences-from-beammp' },
          { label: 'How it works', translations: { ru: 'Как это устроено' }, collapsed: true, items: [
            { slug: 'framework/overview' },
            { slug: 'framework/sync' },
          ]},
        ]},
        { label: 'Players', translations: { ru: 'Игрокам' }, items: [
          { slug: 'players/install' },
          { slug: 'players/sign-in' },
          { slug: 'players/join' },
          { slug: 'players/settings' },
        ]},
        { label: 'Support', translations: { ru: 'Поддержка' }, items: [
          { slug: 'support/troubleshooting' },
          { slug: 'support/joining' },
          { slug: 'support/strict-servers' },
          { slug: 'support/launcher' },
          { slug: 'support/logs' },
          { slug: 'support/error-codes' },
          { slug: 'support/faq' },
        ]},
        { label: 'Server hosting', translations: { ru: 'Хостинг сервера' }, items: [
          { slug: 'hosting/quick-start' },
          { label: 'Running', translations: { ru: 'Запуск и работа' }, items: [
            { slug: 'hosting/running' },
            { slug: 'hosting/administration' },
            { slug: 'hosting/updating' },
            { slug: 'hosting/startup-messages' },
          ]},
          { label: 'Configuration', translations: { ru: 'Настройка' }, items: [
            { slug: 'hosting/configuration' },
            { slug: 'hosting/command-line' },
            { slug: 'hosting/registering' },
            { slug: 'hosting/strict-verification' },
          ]},
          { slug: 'hosting/resources' },
        ]},
        { label: 'Plugin development', translations: { ru: 'Разработка плагинов' }, items: [
          { label: 'Start here', translations: { ru: 'С чего начать' }, items: [
            { slug: 'plugins/overview' },
            { slug: 'plugins/getting-started' },
            { slug: 'plugins/conventions' },
          ]},
          { label: 'Resources and events', translations: { ru: 'Ресурсы и события' }, items: [
            { slug: 'plugins/resources' },
            { slug: 'plugins/events' },
            { slug: 'plugins/concurrency' },
          ]},
          { label: 'Data and network', translations: { ru: 'Данные и сеть' }, items: [
            { slug: 'plugins/database' },
            { slug: 'plugins/protocol' },
          ]},
          { label: 'Client and native code', translations: { ru: 'Клиент и нативный код' }, items: [
            { slug: 'plugins/client-scripting' },
            { slug: 'plugins/native-modules' },
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
          { slug: 'reference/glossary' },
        ]},
      ],
    }),
  ],
});
