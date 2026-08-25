import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  test: {
    // jsdom's CSSStyleDeclaration currently pulls in an ESM-only dependency that
    // crashes under vitest's require()-based worker loading - happy-dom avoids it.
    environment: 'happy-dom',
  },
})
