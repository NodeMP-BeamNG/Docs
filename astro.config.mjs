// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.nodemp.com',
  integrations: [
    starlight({
      title: 'NodeMP',
      logo: { src: './src/assets/nmp-logo.png', alt: 'NodeMP' },
      customCss: ['./src/styles/custom.css'],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/NodeMP-BeamNG' },
      ],
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        ru: { label: 'Русский', lang: 'ru' },
      },
      sidebar: [
        { label: 'Introduction', translations: { ru: 'Введение' }, items: [
          { label: 'What is NodeMP', slug: 'introduction/what-is-nodemp' },
          { label: 'BeamMP compatibility', slug: 'introduction/beammp-compatibility' },
        ]},
        { label: 'For players', translations: { ru: 'Игрокам' }, items: [
          { label: 'Install the launcher', slug: 'players/install' },
          { label: 'Join a server', slug: 'players/join' },
          { label: 'Settings & UI', slug: 'players/settings' },
          { label: 'Troubleshooting', slug: 'players/troubleshooting' },
        ]},
        { label: 'Server hosting', translations: { ru: 'Хостинг серверов' }, items: [
          { label: 'Quick start', slug: 'hosting/quick-start' },
          { label: 'Configuration', slug: 'hosting/configuration' },
          { label: 'Running the server', slug: 'hosting/running' },
          { label: 'Registering your host', slug: 'hosting/registering' },
          { label: 'Updating', slug: 'hosting/updating' },
          { label: 'Resources & mods', slug: 'hosting/resources' },
        ]},
        { label: 'Plugin development', translations: { ru: 'Разработка плагинов' }, items: [
          { label: 'Overview', slug: 'plugins/overview' },
          { label: 'Server Lua API', slug: 'plugins/server-api' },
          { label: 'Wire protocol', slug: 'plugins/protocol' },
          { label: 'Client mod API', slug: 'plugins/client-api' },
          { label: 'Migrating BeamMP plugins', slug: 'plugins/migrating' },
        ]},
        { label: 'Reference', translations: { ru: 'Справочник' }, items: [
          { label: 'Launcher error codes', slug: 'reference/error-codes' },
          { label: 'Glossary', slug: 'reference/glossary' },
        ]},
      ],
    }),
  ],
});
