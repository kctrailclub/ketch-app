import { test, expect } from '../support/fixtures.js';
import { loginAs } from '../support/login.js';

// Regression Checklist v1.2.0 R-03: admin nav present (Approve Hours, Members, Households, Projects,
// Resources, Reports, Rewards). Admin page, so a failure produces no screenshot (Q-0058).
const ADMIN_NAV = ['admin-hours', 'admin-users', 'admin-households', 'admin-projects', 'resources', 'admin-reports', 'admin-rewards'];

test('R-03 admin login lands on Dashboard with admin nav', { tag: '@p1' }, async ({ page }) => {
  await loginAs(page, 'admin');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId('dashboard-heading')).toBeVisible();
  await expect(page.getByTestId('nav-admin-badge')).toBeVisible();
  for (const link of ADMIN_NAV) {
    await expect(page.getByTestId(`nav-link-${link}`)).toBeVisible();
  }
});
