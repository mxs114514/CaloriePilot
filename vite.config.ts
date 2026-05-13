import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      includeAssets: ['favicon.ico', 'favicon.svg', 'favicon-96x96.png', 'apple-touch-icon.png'],
      registerType: 'autoUpdate',
      manifest: {
        background_color: '#ffffff',
        description: '一个帮助你轻松记录每日热量摄入和体重变化的工具，助你实现健康目标。',
        display: 'standalone',
        icons: [
          {
            purpose: 'any maskable',
            sizes: '192x192',
            src: '/web-app-manifest-192x192.png',
            type: 'image/png',
          },
          {
            purpose: 'any maskable',
            sizes: '512x512',
            src: '/web-app-manifest-512x512.png',
            type: 'image/png',
          },
        ],
        name: 'CaloriePilot',
        orientation: 'portrait',
        scope: '/',
        short_name: 'Calorie',
        start_url: '/',
        theme_color: '#ffffff',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    open: true,
    port: 5173,
  },
})
