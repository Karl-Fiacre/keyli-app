import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Alias « @/ » → src/, attendu par Shadcn/ui et utilisé dans tout le projet
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
