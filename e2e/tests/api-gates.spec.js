import { test, expect } from '../support/fixtures.js';
import { apiLogin, apiUrl } from '../support/api.js';
import { STAGING_APP_URL } from '../support/env.js';

// Regression Checklist v1.2.0 R-25, R-27, in the runner's HTTP context. Automated Test Plan v1.1.0 §4.2.

test('R-25 a member cannot make themselves admin', { tag: '@p1' }, async ({ request }) => {
  const member = await apiLogin(request, 'solo');
  expect(member.me.is_admin).toBe(false);
  const userUrl = apiUrl(`/users/${member.me.user_id}`);

  const attempt = await request.patch(userUrl, { headers: member.headers, data: { is_admin: true } });

  const admin = await apiLogin(request, 'admin');
  const after = await request.get(userUrl, { headers: admin.headers });
  expect(after.status()).toBe(200);
  const escalated = (await after.json()).is_admin;
  // §6.2 rule 3. If the gate is broken, do not leave a member account as an admin on staging.
  if (escalated !== false) await request.patch(userUrl, { headers: admin.headers, data: { is_admin: false } });

  expect(attempt.status()).toBe(403);
  expect(escalated).toBe(false);
});

test('R-27 CORS allows the staging app and refuses another origin', { tag: '@p1' }, async ({ request }) => {
  const preflight = (origin) =>
    request.fetch(apiUrl('/auth/refresh'), {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' },
    });

  const refused = await preflight('https://evil.example.com');
  expect(refused.headers()['access-control-allow-origin']).toBeUndefined();

  const allowed = await preflight(STAGING_APP_URL);
  expect(allowed.status()).toBe(200);
  expect(allowed.headers()['access-control-allow-origin']).toBe(STAGING_APP_URL);
  expect(allowed.headers()['access-control-allow-credentials']).toBe('true');
});
