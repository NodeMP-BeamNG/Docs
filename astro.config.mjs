// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';

export default defineConfig({
  site: 'https://docs.nodemp.com',
  integrations: [
    starlight({
      title: 'NodeMP',
      logo: { src: './src/assets/nmp-logo.png', alt: 'NodeMP' },
      customCss: ['./src/styles/custom.css'],
      plugins: [starlightLinksValidator({ errorOnRelativeLinks: true, errorOnFallbackPages: false })],
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
          { label: 'What is NodeMP', translations: { ru: 'Что такое NodeMP' }, slug: 'introduction/what-is-nodemp' },
          { label: 'Differences from BeamMP', translations: { ru: 'Отличия от BeamMP' }, slug: 'introduction/differences-from-beammp' },
        ]},
        { label: 'Framework', translations: { ru: 'Фреймворк' }, items: [
          { label: 'Overview', translations: { ru: 'Обзор' }, slug: 'framework/overview' },
          { label: 'How synchronization works', translations: { ru: 'Как работает синхронизация' }, slug: 'framework/sync' },
        ]},
        { label: 'For players', translations: { ru: 'Игрокам' }, items: [
          { label: 'Install the launcher', translations: { ru: 'Установка лаунчера' }, slug: 'players/install' },
          { label: 'Join a server', translations: { ru: 'Подключение к серверу' }, slug: 'players/join' },
          { label: 'Settings and UI', translations: { ru: 'Настройки и интерфейс' }, slug: 'players/settings' },
          { label: 'Troubleshooting', translations: { ru: 'Устранение неполадок' }, slug: 'players/troubleshooting' },
        ]},
        { label: 'Server hosting', translations: { ru: 'Хостинг сервера' }, items: [
          { label: 'Quick start', translations: { ru: 'Быстрый старт' }, slug: 'hosting/quick-start' },
          { label: 'Configuration', translations: { ru: 'Конфигурация' }, slug: 'hosting/configuration' },
          { label: 'Running the server', translations: { ru: 'Запуск сервера' }, slug: 'hosting/running' },
          { label: 'Registering your server', translations: { ru: 'Регистрация сервера' }, slug: 'hosting/registering' },
          { label: 'Updating', translations: { ru: 'Обновление' }, slug: 'hosting/updating' },
          { label: 'Resources and content', translations: { ru: 'Ресурсы и контент' }, slug: 'hosting/resources' },
        ]},
        { label: 'Plugin development', translations: { ru: 'Разработка плагинов' }, items: [
          { label: 'Overview', translations: { ru: 'Обзор' }, slug: 'plugins/overview' },
          { label: 'Getting started', translations: { ru: 'Первые шаги' }, slug: 'plugins/getting-started' },
          { label: 'Resources', translations: { ru: 'Ресурсы' }, slug: 'plugins/resources' },
          { label: 'Events', translations: { ru: 'События' }, slug: 'plugins/events' },
          { label: 'Concurrency', translations: { ru: 'Конкурентность' }, slug: 'plugins/concurrency' },
          { label: 'Client scripting', translations: { ru: 'Клиентские скрипты' }, slug: 'plugins/client-scripting' },
          { label: 'Native modules', translations: { ru: 'Нативные модули' }, slug: 'plugins/native-modules' },
          { label: 'Recipes', translations: { ru: 'Рецепты' }, slug: 'plugins/recipes' },
          { label: 'Conventions', translations: { ru: 'Соглашения' }, slug: 'plugins/conventions' },
          { label: 'Wire protocol', translations: { ru: 'Сетевой протокол' }, slug: 'plugins/protocol' },
          { label: 'Migrating plugins', translations: { ru: 'Перенос плагинов' }, slug: 'plugins/migrating' },
          { label: 'API reference', translations: { ru: 'Справочник API' }, items: [{ autogenerate: { directory: 'plugins/api' } }] },
        ]},
        { label: 'Reference', translations: { ru: 'Справочник' }, items: [
          { label: 'Launcher error codes', slug: 'reference/error-codes' },
          { label: 'Glossary', slug: 'reference/glossary' },
        ]},
      ],
    }),
  ],
});
