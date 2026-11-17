import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Two apps share one design system: Pulse analytics at / and Cove finance at /finance/.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    rollupOptions: {
      input: {
        pulse: path.resolve(__dirname, 'index.html'),
        finance: path.resolve(__dirname, 'finance/index.html'),
      },
    },
  },
})
