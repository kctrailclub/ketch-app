// The only hosts this suite is allowed to test. Hard-coded on purpose: there is no
// environment override, so a mistyped variable cannot point the suite at production.
export const STAGING_APP_URL = 'https://kctcstaging.netlify.app';
export const STAGING_API_URL = 'https://web-production-b6591.up.railway.app';

// Requests to these hosts are aborted and fail the test (see bulk-guard.js).
// A staging build with the wrong VITE_API_URL would otherwise log in to production.
// Note the committed .env names the Railway host, while RP-0001 moved production to api.kctrailclub.org.
export const PRODUCTION_HOSTS = new Set([
  'kctrailclub.org',
  'www.kctrailclub.org',
  'api.kctrailclub.org',
  'web-production-c3b2.up.railway.app',
]);
