import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  test: {
    // Without this, a local production build (tsc output under dist/) leaves compiled
    // .test.js files that vitest happily discovers too, running every test twice.
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
})
