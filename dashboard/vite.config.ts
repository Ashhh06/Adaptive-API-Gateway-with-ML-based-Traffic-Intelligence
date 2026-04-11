import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/dashboard/' : '/',
  plugins: [react()],
  server: {
    host: true, // wsl: bind 0.0.0.0 so windows browser can reach dev server
    port: 5173,
    proxy: {
      '/api/dashboard': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/features': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
}))
