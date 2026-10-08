import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Keep browser requests same-origin in development; Vite forwards /api to FastAPI.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
