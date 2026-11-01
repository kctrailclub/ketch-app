import { test, expect } from '../support/fixtures.js';
import { apiUrl } from '../support/api.js';
import { watchConsole } from '../support/console-watch.js';
import { loginAs } from '../support/login.js';

// Regression Checklist v1.2.0 R-19, in its tab order. Automated Test Plan v1.1.0 §4.2. One test per tab, so
// the run summary names the failing tab, since the reporter withholds failure text. The mobile tab behavior
// stays manual (§4.2). Admin pages, so a failure produces no image (Q-0058).
const TABS = [
  ['projects', 'Projects YTD'],
  ['trends', 'Project Trends'],
  ['youth', 'Youth Projects'],
  ['members', 'Members & Households'],
  ['waiver', 'Waiver Status'],
  ['activity', 'Activity Log'],
  ['query', 'Ask a Question'],
];

for (const [id, label] of TABS) {
  test(`R-19 Reports tab "${label}" loads with no unexpected console error`, { tag: '@p1' }, async ({ page }) => {
    const consoleWatch = watchConsole(page);
    let queriesSent = 0;
    page.on('request', (request) => {
      if (request.url() === apiUrl('/reports/query')) queriesSent += 1;
    });

    await loginAs(page, 'admin');
    await page.getByTestId('nav-link-admin-reports').click();
    await expect(page.getByTestId('reports-heading')).toBeVisible();

    await page.getByTestId(`tab-${id}`).click();
    await expect(page.getByTestId(`tab-${id}`)).toHaveClass(/\bactive\b/);
    await expect(page.getByTestId(`report-panel-${id}`)).toBeVisible();
    await page.waitForLoadState('networkidle');

    expect(consoleWatch.unexpected()).toBe(0);
    // "Ask a Question" is load only: a query spends Anthropic tokens and quota (§5.4).
    expect(queriesSent).toBe(0);
  });
}
