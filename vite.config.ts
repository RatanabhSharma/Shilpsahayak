import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // @ts-ignore
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/shilp-sahayak-r2/**'],
  },
})
