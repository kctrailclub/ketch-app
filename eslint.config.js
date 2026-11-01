import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'e2e/.output']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Build-time config runs under Node, not the browser (process.env.COMMIT_REF in vite.config.js).
    files: ['vite.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Playwright suite: runs under Node. Its fixtures call a parameter named `use`, which the hooks rule reads as React's `use`.
    files: ['e2e/**/*.js'],
    languageOptions: { globals: globals.node },
    rules: { 'react-hooks/rules-of-hooks': 'off', 'react-refresh/only-export-components': 'off' },
  },
])
