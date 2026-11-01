import { test, expect } from '../support/fixtures.js';
import { STAGING_API_URL, STAGING_APP_URL } from '../support/env.js';

// Proves the net is live in a real browser. Nothing here reaches staging: the page is stubbed, and the
// guarded requests are aborted before they leave. test.fail() is what makes these pass: the safety net
// fails any test that trips it, so each must end up failing.

test.describe('safety net', () => {
  const stubPage = async (page) => {
    await page.route(`${STAGING_APP_URL}/__guard_selftest`, (route) => route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
    await page.goto(`${STAGING_APP_URL}/__guard_selftest`);
  };
  const postFromPage = (page, url, body) =>
    page.evaluate(
      async ([target, payload]) => {
        try {
          await fetch(target, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload });
          return 'sent';
        } catch {
          return 'aborted';
        }
      },
      [url, body],
    );

  test('a bulk endpoint called from the browser is aborted and fails the test', { tag: '@guard' }, async ({ page }) => {
    test.fail();
    await stubPage(page);
    expect(await postFromPage(page, `${STAGING_API_URL}/hours/approve-all`, null)).toBe('aborted');
  });

  test('a rewards send to two households is aborted and fails the test', { tag: '@guard' }, async ({ page }) => {
    test.fail();
    await stubPage(page);
    const body = JSON.stringify({ email_type: 'nudge', household_ids: [0, -1], year: 2000 });
    expect(await postFromPage(page, `${STAGING_API_URL}/settings/rewards/send`, body)).toBe('aborted');
  });

  test('a production host is aborted and fails the test', { tag: '@guard' }, async ({ page }) => {
    test.fail();
    await stubPage(page);
    expect(await postFromPage(page, 'https://api.kctrailclub.org/auth/login', '{}')).toBe('aborted');
  });

  test('a bulk endpoint called from the runner is refused and fails the test', { tag: '@guard' }, async ({ request }) => {
    test.fail();
    await expect(request.post(`${STAGING_API_URL}/users/bulk-households`)).rejects.toThrow('safety net');
  });
});
