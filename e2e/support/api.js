import { STAGING_API_URL } from './env.js';
import { identity } from './identities.js';

export const apiUrl = (path) => `${STAGING_API_URL}${path}`;

/** Logs in through the request fixture, which is the only HTTP context the safety net covers. */
export async function apiLogin(request, role) {
  const { email, password } = identity(role);
  const login = await request.post(apiUrl('/auth/login'), { data: { email, password } });
  if (!login.ok()) throw new Error(`e2e identity not configured: API login for ${role} returned ${login.status()}`);
  const headers = { Authorization: `Bearer ${(await login.json()).access_token}` };
  const me = await request.get(apiUrl('/auth/me'), { headers });
  if (!me.ok()) throw new Error(`e2e identity not configured: /auth/me for ${role} returned ${me.status()}`);
  return { headers, me: await me.json() };
}
