import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  preview: { proxy: { '/api': { target: `http://localhost:${process.env.API_PORT || 3001}`, changeOrigin: false, xfwd: true } } },
  server: {
    proxy: { '/api': { target: `http://localhost:${process.env.API_PORT || 3001}`, changeOrigin: false, xfwd: true } },
  },
})
