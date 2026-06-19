import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
  build: {
    sourcemap: false,
  },
  server: {
    // Suppress missing source map warnings from mediapipe
    sourcemapIgnoreList: (sourcePath) => sourcePath.includes('@mediapipe'),
  },
})
