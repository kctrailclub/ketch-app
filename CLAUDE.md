# ketch-app — KCTC frontend

React 19 + Vite + Axios + React Router SPA for the Ken-Caryl Trail Club volunteer-management app. Project operating model, roles, registers, and standards live in the sibling docs repo `kctrailclub/kctc-docs` (locally `../`); read its `CLAUDE.md` first.

## Branches and deploys
- `main` → production on Netlify (`kctrailclub.org`, site slug `singular-squirrel-d46538`). **Champion-only.** Never push `main`; open a PR from a branch (`ep-NNNN/<slug>`, `fix/<slug>`).
- `staging` → `kctcstaging.netlify.app`. Weekday work lands here (DEC-0015). Sync with `git checkout staging && git merge main`; keep both sides on conflict (`client.js` is the usual conflict file). Never `git push origin staging:main`.
- Frontend and backend ship together; a frontend change that calls a new endpoint must not reach `main` before the backend commit is on `ketch-api` `origin/main` (the 2026-04-26 incident, RSK-0001).

## Run and check
```bash
npm ci
npm run lint     # eslint
npm run build    # vite build — must pass before any PR
npm run dev
```
No test framework yet; the Tester owns the Automated Test Plan that will add one.

## Layout
`src/api/client.js` (all API calls, grouped under section-comment banners — keep new exports under the right banner, TD-0004), `src/pages/` (one component per route; `Reports.jsx`, `AdminUsers.jsx`, `AdminResources.jsx` are 600+ LOC and slated for extraction, TD-0010), `src/components/Nav.jsx`, `src/context/AuthContext.jsx` (access token in memory, 401 interceptor with coalesced refresh), `public/_redirects` (SPA routing on Netlify).

## Conventions and traps
- Visual identity: Ken-Caryl Ranch reskin — teal/orange, Oswald/Khand fonts, KCR logo. No design-system invention without a UX backlog item.
- Feature gating pattern: `{user?.is_tester && (...)}`.
- Hours banner flips "My Hours" / "My Family Hours" on household membership.
- `.env` is tracked despite `.gitignore` (SEC-0025, open) — do not add secrets to it.
- UX findings → `kctc-docs/ux/UX_Backlog.md`; bugs → `kctc-docs/testing/Bug_Reports/`. Don't fix in passing; file first.
