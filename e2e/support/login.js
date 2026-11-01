import { identity } from './identities.js';

// Staging has no working refresh cookie (EP-0045 finding): the session lives only in page memory, and
// a full page load signs the user out. After this returns, move around by clicking, not page.goto().
export async function loginAs(page, role) {
  const { email, password } = identity(role);
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await page.waitForURL('**/dashboard');
}
