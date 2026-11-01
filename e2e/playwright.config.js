import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { STAGING_APP_URL } from './support/env.js';
import { assertSuitePolicy } from './support/policy.js';

const testDir = join(import.meta.dirname, 'tests');
assertSuitePolicy(testDir);

const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir,
  testMatch: '**/*.spec.js',
  outputDir: join(import.meta.dirname, '.output', 'test-results'),

  // Specs share test accounts and one staging DB. Read-only specs may move to parallel later (§5.7).
  workers: 1,
  fullyParallel: false,

  forbidOnly: CI,
  retries: CI ? 1 : 0, // §5.6. A pass on the retry is reported as flaky, not passed.
  timeout: 30_000,
  expect: { timeout: 10_000 },
  globalTimeout: 20 * 60_000, // §5.7 budget for @p1 + @p2.

  reporter: [['./support/reporter.js']],

  use: {
    baseURL: STAGING_APP_URL,

    // Q-0058. Failure screenshots are handled by support/fixtures.js, so the built-in stays off.
    trace: 'off',
    video: 'off',
    screenshot: 'off',

    // context.route cannot see requests a service worker makes. Also keeps staging free of push subscriptions.
    serviceWorkers: 'block',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
