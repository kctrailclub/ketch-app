// Identities come from the environment at run time. Nothing about a test account (email, password,
// name, household) may be committed: these are public repos and the emails reach a real mailbox.

const PREFIX = { admin: 'E2E_ADMIN', family: 'E2E_FAMILY', solo: 'E2E_SOLO' };

export function identity(role) {
  const prefix = PREFIX[role];
  if (!prefix) throw new Error(`Unknown e2e identity role: ${role}`);
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) throw new Error(`e2e identity not configured: set ${prefix}_EMAIL and ${prefix}_PASSWORD`);
  return { email, password };
}
