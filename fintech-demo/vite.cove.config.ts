import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Builds only the Cove finance app (not Pulse analytics) as a static bundle with
// relative paths into the main site at /work/cove/, where the homepage embeds it.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../work/cove'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: { input: { finance: path.resolve(__dirname, 'finance/index.html') } },
  },
})
