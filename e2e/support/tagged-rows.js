// Automated Test Plan §6.2 rule 2: rows a spec might create carry a tag at the start of their notes, and a
// sweep removes them. It acts only on the signed-in test identity's own rows, as that identity. A member
// deleting a pending row sends no email (`delete_hours` in ketch-api app/routers/hours.py).

import { apiLogin, apiUrl } from './api.js';

const TAG_PREFIX = '[e2e ';

export const runTag = () => `${TAG_PREFIX}${process.env.GITHUB_RUN_ID ?? 'local'}]`;

export async function sweepTaggedHours(request, role) {
  const { headers, me } = await apiLogin(request, role);
  const year = new Date().getUTCFullYear();
  const list = await request.get(apiUrl(`/hours/?year=${year}&member_id=${me.user_id}`), { headers });
  if (!list.ok()) throw new Error(`e2e sweep could not list hours: ${list.status()}`);
  const rows = (await list.json()).filter((h) => h.member_id === me.user_id && h.notes?.startsWith(TAG_PREFIX));
  for (const row of rows) {
    const deleted = await request.delete(apiUrl(`/hours/${row.hour_id}`), { headers });
    if (!deleted.ok()) throw new Error(`e2e sweep could not delete a tagged row: ${deleted.status()}`);
  }
}
