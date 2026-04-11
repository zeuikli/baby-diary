import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// When building for GitHub Pages, base is /baby-diary/
// In local dev, base is /
const base = process.env.GITHUB_ACTIONS ? '/baby-diary/' : '/'

// Derive version info from git at build time so the "關於" section reflects
// the actual commit it was built from. Fallbacks are used if git is missing
// (e.g. extracted source tarball).
function safeGit(cmd, fallback) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return fallback
  }
}
const commitCount = safeGit('git rev-list --count HEAD', '0')
const commitSha = safeGit('git rev-parse --short HEAD', 'unknown')
// Build timestamp in Taiwan time (UTC+8), format: YYYY-MM-DD HH:mm
const buildDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(new Date()).replace(',', '')
const appVersion = `1.0.${commitCount}`

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT__: JSON.stringify(commitSha),
    __APP_BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: '寶寶成長日記',
        short_name: '寶寶日記',
        description: '記錄寶寶每天的喝奶、睡眠、尿布和成長軌跡',
        theme_color: '#f9a8d4',
        background_color: '#fff1f5',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.github\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'github-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000
  }
})
