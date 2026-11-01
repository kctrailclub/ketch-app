// Counts console errors for a page. Text is never kept: a console message can quote member data, and these
// repos are public. To see the message itself, debug locally.

import { apiUrl } from './api.js';

// Staging cannot hold the refresh cookie (BR-0010, TD-0024), so each full page load gets one 401 from
// /auth/refresh, which Chromium logs as a console error. That is the only one allowed, once per page load.
const isRefresh401 = (message) =>
  message.location().url === apiUrl('/auth/refresh') && message.text().includes('status of 401');

export function watchConsole(page) {
  let refresh401s = 0;
  let others = 0;
  page.on('pageerror', () => {
    others += 1;
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (isRefresh401(message)) refresh401s += 1;
    else others += 1;
  });
  return {
    /** Everything except the one allowed 401 for a test that loads the page once. */
    unexpected: () => others + Math.max(0, refresh401s - 1),
  };
}
