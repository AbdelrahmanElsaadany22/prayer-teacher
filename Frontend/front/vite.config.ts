import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * @mediapipe/tasks-vision ends its bundle with a sourceMappingURL naming a file
 * it doesn't ship — it points at `vision_bundle_mjs.js.map` while the package
 * actually contains `vision_bundle.mjs.map`. Vite follows the comment, fails to
 * open it, and prints a stack trace on every dev start.
 *
 * The read happens while Vite is loading the module, before any transform hook
 * runs, so the comment has to be gone by then — hence `load` rather than
 * `transform`. `server.sourcemapIgnoreList` below can't help either: it only
 * tells the browser which frames to fold away in devtools, long after this.
 */
function stripMediapipeSourcemapComment(): Plugin {
  return {
    name: 'strip-mediapipe-sourcemap-comment',
    enforce: 'pre',
    load(id) {
      const file = id.split('?')[0]
      if (!file.includes('@mediapipe/tasks-vision')) return null
      if (!file.endsWith('.mjs') && !file.endsWith('.js')) return null

      const code = readFileSync(file, 'utf-8')
      if (!code.includes('sourceMappingURL')) return null
      return { code: code.replace(/\n?\/\/# sourceMappingURL=\S*/g, ''), map: null }
    },
  }
}

export default defineConfig({
  plugins: [react(), stripMediapipeSourcemapComment()],
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
  build: {
    sourcemap: false,
  },
  server: {
    // Keep mediapipe's frames out of the devtools stack traces.
    sourcemapIgnoreList: (sourcePath) => sourcePath.includes('@mediapipe'),
  },
})
