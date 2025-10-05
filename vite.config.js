// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // allow root path to serve index.html
    fs: {
      strict: false
    },
  },
})
