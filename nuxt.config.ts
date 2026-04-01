import process from 'node:process';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/i18n', '@vite-pwa/nuxt'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      display: 'fullscreen',
      name: 'Backend Generator',
      short_name: 'BEGen',
      description: 'Générateur de backend graphique',
      theme_color: '#ffffff',
      icons: [
        {
          src: '/android/launchericon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/android/launchericon-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: '/android/launchericon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 3600,
    },
    devOptions: {
      enabled: process.env.NODE_ENV !== 'development',
      suppressWarnings: true,
      navigateFallbackAllowlist: [/^\/$/],
      type: 'module'
    },
    injectRegister: 'auto',
    includeAssets: ['favicon.ico', 'robots.txt'],
  },
  app: {
    head: {
      title: 'Backend Generator',
      link: process.env.NODE_ENV === 'development' ? [] : [
        { rel: 'manifest', href: '/manifest.webmanifest' }
      ]
    }
  },
  i18n: {
    locales: [
      { code: 'en', iso: 'en-US', name: 'English', file: 'en.json' },
      { code: 'fr', iso: 'fr-FR', name: 'Français', file: 'fr.json' }
    ],
    defaultLocale: 'fr',
    langDir: '../locales',
    strategy: 'no_prefix',
    // vueI18n: {
    //   strictMessage: false
    // }
  },
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ]
    }
  },

  nitro: {
    output: {
      dir: 'output',
    }
  },

  routeRules: {
    '/': { ssr: true },
    '/projects/**': { ssr: false },
  }
})
