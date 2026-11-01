// Every spec imports test and expect from here (support/policy.js enforces it), which is what makes
// the safety net and the artifact policy inherited rather than opt-in.

/* eslint-disable no-empty-pattern -- Playwright requires an object pattern for fixtures with no dependencies. */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test as base, expect } from '@playwright/test';
import { guardApiRequest, installBrowserGuard } from './bulk-guard.js';
import { STAGING_APP_URL } from './env.js';

// Pages that show only the signed-in member's own (or own household's) data. Default deny: Resources
// has a leaderboard and Household lists other people, so neither is here. Do not add an /admin path.
const MEMBER_SCOPED_PATHS = new Set(['/dashboard', '/hours', '/hours/submit', '/change-password']);

export const SCREENSHOT_DIR = join(import.meta.dirname, '..', '.output', 'failure-screenshots');

async function screenshotIfMemberScoped(page, testInfo) {
  try {
    if (!testInfo.tags.includes('@member-page')) return;
    const url = new URL(page.url());
    if (url.origin !== STAGING_APP_URL || !MEMBER_SCOPED_PATHS.has(url.pathname)) return;
    // An admin viewing a member path is still not a member-scoped session.
    const signedIn = (await page.getByTestId('nav-user-menu').count()) === 1;
    const admin = (await page.getByTestId('nav-admin-badge').count()) !== 0;
    if (!signedIn || admin) return;
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const name = testInfo.title.replace(/[^A-Za-z0-9-]+/g, '_').slice(0, 80);
    await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}-retry${testInfo.retry}.png`) });
  } catch {
    // No screenshot on any doubt. The test has already failed; the error here adds nothing.
  }
}

export const test = base.extend({
  _blocked: async ({}, use) => {
    await use([]);
  },

  // Auto fixture, so it runs for every test whichever fixtures that test asks for.
  _safetyNet: [
    async ({ _blocked }, use) => {
      await use();
      if (_blocked.length > 0) {
        throw new Error(`Bulk-endpoint safety net blocked: ${[...new Set(_blocked)].join('; ')}`);
      }
    },
    { auto: true },
  ],

  context: async ({ context, _blocked }, use) => {
    await installBrowserGuard(context, _blocked);
    await use(context);
  },

  request: async ({ request, baseURL, _blocked }, use) => {
    await use(guardApiRequest(request, baseURL, _blocked));
  },

  page: async ({ page }, use, testInfo) => {
    await use(page);
    if (testInfo.status !== testInfo.expectedStatus) await screenshotIfMemberScoped(page, testInfo);
  },
});

export { expect };
