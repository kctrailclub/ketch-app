// Bulk-endpoint safety net (Automated Test Plan §6.2 rule 4).
//
// Staging holds a copy of production data. A selector mistake must not turn one click into
// mail to the membership, or into a write across real households. Each denied request is
// aborted before it leaves the browser and fails the test, even if the app swallows the error.
//
// classifyRequest() is pure so it can be unit-tested without a browser (e2e/unit/). Its reasons
// carry the method, the path and a count, and never a request body, id or member value.

import { PRODUCTION_HOSTS } from './env.js';

// Fan out to every matching row whatever the request contains.
const ALWAYS_BLOCKED = new Map([
  ['POST /hours/approve-all', 'approves every pending row and notifies each member'],
  ['POST /strava/admin/sync-all', 'syncs every connected member'],
  ['POST /users/bulk-households', 'creates a household for every user without one'],
  ['POST /settings/rewards/auto-assign-tags', 'assigns tags across all eligible households'],
]);

// Fan out over an id list in the JSON body. Exactly one id is allowed; §6.2 rule 1 governs which one.
const SINGLE_TARGET_ONLY = new Map([
  ['POST /settings/rewards/send', 'household_ids'],
  ['POST /settings/waiver/send', 'user_ids'],
]);

const normalizePath = (pathname) => pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';

const countIds = (body, field) => {
  let parsed = body;
  if (typeof body === 'string') {
    try {
      parsed = JSON.parse(body);
    } catch {
      return null;
    }
  }
  const ids = parsed?.[field];
  return Array.isArray(ids) ? ids.length : null;
};

/** Returns a reason string when the request must be blocked, otherwise null. Fails closed. */
export function classifyRequest({ method, url, body }) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return `unparseable request URL (${method})`;
  }
  if (PRODUCTION_HOSTS.has(parsedUrl.hostname)) {
    return `production host ${parsedUrl.hostname}: this suite never touches production`;
  }
  const key = `${method.toUpperCase()} ${normalizePath(parsedUrl.pathname)}`;
  if (ALWAYS_BLOCKED.has(key)) return `${key} ${ALWAYS_BLOCKED.get(key)}`;

  const field = SINGLE_TARGET_ONLY.get(key);
  if (field) {
    const count = countIds(body, field);
    if (count === null) return `${key} has no readable ${field} list`;
    if (count !== 1) return `${key} targets ${count} ids in ${field}; exactly 1 is allowed`;
  }
  return null;
}

/** Routes every browser request in the context through classifyRequest. */
export async function installBrowserGuard(context, blockedLog) {
  await context.route('**/*', async (route) => {
    const request = route.request();
    let reason;
    try {
      reason = classifyRequest({ method: request.method(), url: request.url(), body: request.postData() });
    } catch {
      reason = `safety net could not read a ${request.method()} request`;
    }
    if (reason) {
      blockedLog.push(reason);
      await route.abort('blockedbyclient');
      return;
    }
    await route.fallback();
  });
}

const VERBS = { get: 'GET', head: 'HEAD', post: 'POST', put: 'PUT', patch: 'PATCH', delete: 'DELETE' };

/**
 * APIRequestContext calls never pass through context.route, so the runner's HTTP context
 * (rows R-25 to R-27) gets the same check here, before the request is sent.
 */
export function guardApiRequest(request, baseURL, blockedLog) {
  return new Proxy(request, {
    get(target, prop) {
      const value = target[prop];
      if (typeof value !== 'function') return value;
      if (prop !== 'fetch' && !(prop in VERBS)) return value.bind(target);
      return async (urlOrRequest, options = {}) => {
        const rawUrl = typeof urlOrRequest === 'string' ? urlOrRequest : urlOrRequest.url();
        const method = VERBS[prop] ?? options.method ?? (typeof urlOrRequest === 'string' ? 'GET' : urlOrRequest.method());
        const body = options.data ?? (typeof urlOrRequest === 'string' ? null : urlOrRequest.postData());
        const reason = classifyRequest({ method, url: new URL(rawUrl, baseURL).href, body });
        if (reason) {
          blockedLog.push(reason);
          throw new Error(`Bulk-endpoint safety net blocked: ${reason}`);
        }
        return value.call(target, urlOrRequest, options);
      };
    },
  });
}
