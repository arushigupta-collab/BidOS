import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { apiPlugin } from './vite.plugin.api.ts'

// https://vite.dev/config/
export default defineConfig({
  server: { port: 5174, strictPort: true },
  plugins: [react(), tailwindcss(), apiPlugin()],
})
