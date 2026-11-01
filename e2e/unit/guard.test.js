// Runs with `npm run test:e2e:unit` (node:test): no browser, no network, no secrets.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyRequest } from '../support/bulk-guard.js';
import { findViolations } from '../support/policy.js';
import { safeMessage } from '../support/reporter.js';

const API = 'https://web-production-b6591.up.railway.app';
const post = (path, body) => classifyRequest({ method: 'POST', url: `${API}${path}`, body });

test('always-blocked endpoints are blocked, with or without a trailing slash', () => {
  for (const path of ['/hours/approve-all', '/strava/admin/sync-all', '/users/bulk-households', '/settings/rewards/auto-assign-tags']) {
    assert.ok(post(path, null), path);
    assert.ok(post(`${path}/`, null), `${path}/`);
  }
});

test('reward and waiver sends allow exactly one id and fail closed on anything else', () => {
  for (const [path, field] of [['/settings/rewards/send', 'household_ids'], ['/settings/waiver/send', 'user_ids']]) {
    assert.equal(post(path, JSON.stringify({ [field]: [7] })), null);
    assert.ok(post(path, JSON.stringify({ [field]: [7, 8] })), 'two ids');
    assert.ok(post(path, JSON.stringify({ [field]: [] })), 'no ids');
    assert.ok(post(path, JSON.stringify({ [field]: 7 })), 'not a list');
    assert.ok(post(path, JSON.stringify({})), 'field missing');
    assert.ok(post(path, 'not json'), 'unparseable');
    assert.ok(post(path, null), 'no body');
    assert.equal(post(path, { [field]: [7] }), null, 'object body from the runner');
    assert.ok(post(path, { [field]: [7, 8] }), 'object body with two ids');
  }
});

test('reasons never echo the ids in a request', () => {
  assert.doesNotMatch(post('/settings/rewards/send', JSON.stringify({ household_ids: [12345, 67890] })), /12345|67890/);
});

test('ordinary traffic passes, including single-row hour actions', () => {
  assert.equal(post('/hours/', '{}'), null);
  assert.equal(post('/hours/5/review', '{}'), null);
  assert.equal(post('/auth/login', '{}'), null);
  assert.equal(classifyRequest({ method: 'GET', url: `${API}/hours/approve-all`, body: null }), null);
});

test('production hosts are blocked for any method, and an unparseable URL fails closed', () => {
  for (const host of ['kctrailclub.org', 'www.kctrailclub.org', 'api.kctrailclub.org', 'web-production-c3b2.up.railway.app']) {
    assert.ok(classifyRequest({ method: 'GET', url: `https://${host}/health`, body: null }), host);
  }
  assert.ok(classifyRequest({ method: 'GET', url: 'not a url', body: null }));
});

test('specs that would bypass the net or produce an artifact are refused', () => {
  const bad = [
    "import { test } from '@playwright/test';",
    "test.use({ screenshot: 'on' });",
    "await page.screenshot({ path: 'x.png' });",
    "await testInfo.attach('x', { body });",
    "test.use({ trace: 'on' });",
    "test.use({ video: 'on' });",
    'await context.storageState();',
    'const c = await browser.newContext();',
    "await page.request.post('/hours/approve-all');",
    "await context.request.post('/hours/approve-all');",
  ];
  for (const line of bad) assert.notEqual(findViolations(line).length, 0, line);
  assert.deepEqual(findViolations("import { test } from '../support/fixtures.js';\nawait request.get('/health');"), []);
  assert.deepEqual(findViolations('// a comment may say screenshot'), []);
});

test('failure output keeps known-safe shapes and withholds the rest', () => {
  const pageText = 'Member Name <person@example.com>';
  assert.equal(
    safeMessage({ message: `Error: expect(locator).toBeVisible() failed\n\nReceived: ${pageText}` }),
    'expect(locator).toBeVisible()',
  );
  assert.equal(safeMessage({ message: `Error: ${pageText}` }), 'message withheld (see the spec location)');
  assert.equal(safeMessage({ message: `Error: expect(received).toBe(expected)\nExpected: ${pageText}` }), 'expect(received).toBe(expected)');
  assert.equal(safeMessage(undefined), 'message withheld (see the spec location)');
});
