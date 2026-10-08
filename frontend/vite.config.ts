import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-framer': ['framer-motion'],
          'vendor-tanstack': ['@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  // @ts-ignore
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/shilp-sahayak-r2/**'],
  },
})
