import { test, expect } from '../support/fixtures.js';
import { apiUrl } from '../support/api.js';
import { loginAs } from '../support/login.js';
import { runTag, sweepTaggedHours } from '../support/tagged-rows.js';

// Regression Checklist v1.2.0 R-05, R-07. Automated Test Plan v1.1.0 §4.2, §6.2, §7 Slice 1.
// A staging sync recreates the Family and Solo accounts with no hours, so nothing here assumes history.

const tableOrEmpty = (page) => page.getByTestId('hours-row').or(page.getByTestId('hours-empty')).first();

async function openHours(page) {
  await page.getByTestId('nav-link-hours').click();
  await expect(page).toHaveURL(/\/hours$/);
  await expect(tableOrEmpty(page)).toBeVisible();
}

test.describe('R-05 hours page', () => {
  test('R-05 hours page loads for the current year with rows or the empty state', { tag: '@p1' }, async ({ page }) => {
    await loginAs(page, 'family');
    await openHours(page);
    const year = await page.evaluate(() => new Date().getFullYear());
    await expect(page.getByTestId('hours-year-select')).toHaveValue(String(year));
  });

  // The Checklist asks for the bar only "if member has any hours". A skip here, seen in the run summary,
  // means this run did not check the bar.
  test('R-05 reward progress bar shows when the member has hours', { tag: '@p1' }, async ({ page }) => {
    await loginAs(page, 'family');
    await openHours(page);
    test.skip((await page.getByTestId('hours-row').count()) === 0, 'no hours for this account this year');
    await expect(page.getByTestId('reward-progress')).toBeVisible();
    await expect(page.getByTestId('reward-progress-total')).toHaveText(/^\d+\.\d \/ \d+ credited hours$/);
  });
});

// The form limits dates to the browser's current year, and §6.2 rule 5 keeps away from "today". Near New Year
// these dates can fall outside the form's range, where the browser blocks the submit and the server never
// decides, so the case skips rather than fails.
const isoDaysFromNow = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const inCurrentYear = (iso) => iso.startsWith(String(new Date().getUTCFullYear()));

test.describe('R-07 validation guards', () => {
  const ROLE = 'solo';

  // Nothing is created while the guards hold. If one breaks, the row is tagged and removed (§6.2 rule 2).
  test.beforeEach(async ({ request }) => {
    await sweepTaggedHours(request, ROLE);
  });
  test.afterEach(async ({ request }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) await sweepTaggedHours(request, ROLE);
  });

  async function submitRejected(page, { date, hours, note, error }) {
    await loginAs(page, ROLE);
    await page.getByTestId('nav-link-hours').click();
    await page.getByTestId('hours-log-hours').click();

    // Exactly the test project (§6.2 rule 1). If this fails, nothing has been submitted.
    const testProject = page.getByTestId('log-hours-project').locator('option').filter({ hasText: /test project/i });
    await expect(testProject).toHaveCount(1);
    await page.getByTestId('log-hours-project').selectOption((await testProject.getAttribute('value')) ?? '');

    const tagged = `${runTag()} ${note}`;
    await page.getByTestId('log-hours-date').fill(date);
    await page.getByTestId('log-hours-hours').fill(hours);
    await page.getByTestId('log-hours-notes').fill(tagged);

    const response = page.waitForResponse((r) => r.url() === apiUrl('/hours/') && r.request().method() === 'POST');
    await page.getByTestId('log-hours-submit').click();
    expect((await response).status()).toBe(400);
    await expect(page.getByTestId('log-hours-error')).toHaveText(error);
    await expect(page).toHaveURL(/\/hours\/submit$/);

    await openHours(page);
    await expect(page.getByTestId('hours-row').filter({ hasText: tagged })).toHaveCount(0);
  }

  test('R-07 a service date in the future is rejected and creates no row', { tag: '@p1' }, async ({ page }) => {
    const date = isoDaysFromNow(2);
    test.skip(!inCurrentYear(date), 'today + 2 is next year, outside the form range');
    await submitRejected(page, { date, hours: '1', note: 'R-07 future date', error: /cannot be in the future/i });
  });

  test('R-07 more than 24 hours is rejected and creates no row', { tag: '@p1' }, async ({ page }) => {
    const date = isoDaysFromNow(-2);
    test.skip(!inCurrentYear(date), 'today - 2 is last year, outside the form range');
    await submitRejected(page, { date, hours: '25', note: 'R-07 over 24 hours', error: /cannot exceed 24/i });
  });
});
