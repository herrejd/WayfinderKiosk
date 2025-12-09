import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Disable PWA in development to avoid manifest errors
      devOptions: {
        enabled: false,
      },
      registerType: 'autoUpdate',
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/maps\.locuslabs\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'locuslabs-maps-cache',
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Airport Wayfinder Kiosk',
        short_name: 'Wayfinder',
        description: 'Airport navigation and wayfinding kiosk application',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: '/',
        scope: '/',
        theme_color: '#1f2937',
        background_color: '#ffffff',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: '/screenshot-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
}))
