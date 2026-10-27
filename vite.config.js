import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Netlify sets COMMIT_REF at build time. Stamping it into index.html lets the
// deploy-verify workflow confirm production serves a build of origin/main
// (Deploy Sign-off Checks 1 + 2; Operating Model v2 Phase 1).
const buildSha = process.env.COMMIT_REF || process.env.GITHUB_SHA || 'dev'

function buildShaMeta() {
  return {
    name: 'kctc-build-sha-meta',
    transformIndexHtml() {
      return [
        { tag: 'meta', attrs: { name: 'build-sha', content: buildSha }, injectTo: 'head' },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), buildShaMeta()],
  server: {
    host: true
  }
})
