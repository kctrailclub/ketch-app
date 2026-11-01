import { test, expect } from '../support/fixtures.js';
import { apiUrl } from '../support/api.js';
import { loginAs } from '../support/login.js';

// Regression Checklist v1.2.0 R-01, R-02. Automated Test Plan v1.1.0 §4.2, §7 Slice 1.
const ADMIN_LINKS = [
  'admin-hours',
  'admin-bulk-hours',
  'admin-users',
  'admin-households',
  'admin-projects',
  'admin-reports',
  'admin-rewards',
  'admin-resources',
];

test('R-01 member login lands on Dashboard with the member nav and own name', { tag: '@p1' }, async ({ page }) => {
  const meResponse = page.waitForResponse((r) => r.url() === apiUrl('/auth/me') && r.request().method() === 'GET' && r.ok());
  await loginAs(page, 'family');
  const me = await (await meResponse).json();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId('dashboard-heading')).toBeVisible();
  for (const link of ['dashboard', 'hours', 'household', 'resources']) {
    await expect(page.getByTestId(`nav-link-${link}`)).toBeVisible();
  }
  for (const link of ADMIN_LINKS) {
    await expect(page.getByTestId(`nav-link-${link}`)).toHaveCount(0);
  }
  await expect(page.getByTestId('nav-admin-badge')).toHaveCount(0);
  await expect(page.getByTestId('nav-user-name')).toHaveText(`${me.firstname} ${me.lastname}`);
});

// Any full page load signs the user out on staging, so a bounce after page.goto proves nothing. Browser Back
// is a same-document navigation: the session in page memory survives it unless logout cleared that session.
// The marker on window shows that no page load happened, and the first Back is the control.
test('R-02 sign out ends the session: Back to /hours bounces to login with no page load', { tag: '@p1' }, async ({ page }) => {
  await loginAs(page, 'family');
  await page.getByTestId('nav-link-hours').click();
  await expect(page.getByTestId('hours-log-hours')).toBeVisible();
  await page.evaluate(() => {
    window.__e2eSamePageLoad = true;
  });

  // Control: signed in, Back to /hours stays on /hours.
  await page.getByTestId('nav-link-dashboard').click();
  await expect(page.getByTestId('dashboard-heading')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/hours$/);
  await expect(page.getByTestId('hours-log-hours')).toBeVisible();

  await page.getByTestId('nav-user-menu').click();
  const logout = page.waitForResponse((r) => r.url() === apiUrl('/auth/logout') && r.request().method() === 'POST');
  await page.getByTestId('nav-sign-out').click();
  expect((await logout).status()).toBe(200);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId('login-email')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId('login-email')).toBeVisible();
  await expect(page.getByTestId('nav-user-menu')).toHaveCount(0);
  await expect(page.getByTestId('hours-log-hours')).toHaveCount(0);
  expect(await page.evaluate(() => window.__e2eSamePageLoad === true)).toBe(true);
});
