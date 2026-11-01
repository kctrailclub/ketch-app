# e2e: browser suite against staging

Playwright Test (Node), per Automated Test Plan v1.0.0 in `kctc-docs` and DEC-0023. It runs against staging only. The hosts are hard-coded in `support/env.js`, and requests to production hosts are aborted. The CI result is informational (Q-0056).

## Run locally

```bash
npm ci
npx playwright install chromium
npm run test:e2e:unit                  # no browser, no network
npm run test:e2e -- --grep @guard      # browser, never reaches staging
E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npm run test:e2e -- --grep @p1
```

## Writing a spec

Put specs in `tests/`. Import `test` and `expect` from `support/fixtures.js`. The config refuses to load if a spec imports `@playwright/test` directly (`support/policy.js`).

- **Titles** start with the Regression Checklist row ID (`R-03 ...`).
- **Tags:** `@p1`, `@p2` or `@p3` (§5.4); `@quarantine` to exclude a test (§5.6).
- **Selectors:** `page.getByTestId(...)`. Add `data-testid` in the same PR as the spec.
- **Data:** §6.2 is binding. Act only on rows the run created and on the test accounts, households and project.
- **Staging sessions die on a full page load.** The refresh cookie cannot work on staging (EP-0045 finding). After `loginAs`, navigate by clicking, not with `page.goto`. A protected-route bounce seen after `page.goto` proves nothing on staging, because it happens with or without a logout.

## What the suite will not do

**Bulk endpoints.** `support/bulk-guard.js` aborts these and fails the test. It covers browser requests and the `request` fixture.

| Request | Rule |
|---|---|
| `POST /hours/approve-all` | always blocked |
| `POST /strava/admin/sync-all` | always blocked |
| `POST /users/bulk-households` | always blocked |
| `POST /settings/rewards/auto-assign-tags` | always blocked |
| `POST /settings/rewards/send` | allowed only with exactly one id in `household_ids` |
| `POST /settings/waiver/send` | allowed only with exactly one id in `user_ids` |
| any production host | always blocked |

One id passes the guard whoever it belongs to. Rule §6.2(1) and BL-0038 cover that case, not this guard. Log Crew Hours sends one `POST /hours/` per row, so the guard cannot see it as bulk; a spec for R-13 must select only test accounts.

**Artifacts (Q-0058).** Traces, video and attachments are off, and there is no HTML report. A failure screenshot needs all of these: the test is tagged `@member-page`, the page is in the allowlist in `support/fixtures.js`, and no admin session is showing. Only that folder is uploaded, for 3 days.

**Logs.** The repo is public and staging holds real member data. `support/reporter.js` prints titles, outcomes and spec locations. It drops test stdout and failure bodies, because a Playwright failure can quote page text. Debug locally.

## CI

`.github/workflows/e2e-staging.yml` has two jobs:

1. `wait-for-staging` polls until staging serves `origin/staging` of both repos. A timeout is "environment not ready", which is not a test failure, and `e2e` is skipped.
2. `e2e` checks out the `ketch-app` commit staging is serving and runs the suite.

| Trigger | `GITHUB_REF` | Workflow file comes from | Works once the file is on |
|---|---|---|---|
| `push` to `staging` | `staging` | `staging` | `staging` |
| `workflow_dispatch` from a `ketch-api` staging push (`dispatch-e2e.yml`, ref `staging`, tags `@p1\|@p2\|@guard`) | `staging` | `staging` | `main` |
| `schedule` (Saturday) | `main` | `main` | `main` |
| `workflow_dispatch`, manual | the branch chosen | that branch | `main` |

The workflow file can therefore lag the suite: a scheduled run uses `main`'s workflow with `staging`'s specs. A new secret must be mapped in the workflow on `main` before scheduled runs can use it.

### Environment `staging-e2e`

The deployment-branch rule is **selected branches: `main` and `staging`**. Secrets are `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_FAMILY_EMAIL`, `E2E_FAMILY_PASSWORD`, `E2E_SOLO_EMAIL` and `E2E_SOLO_PASSWORD`, all staging-only (`ketch-api/scripts/sync_prod_to_staging.README.md`).

GitHub matches the rule against `GITHUB_REF`. `main` is in the rule only for the Saturday schedule, whose `GITHUB_REF` is always `main`; choose `staging` for manual runs. `pull_request` runs have the ref `refs/pull/N/merge`, which does not match, and this workflow has no `pull_request` trigger anyway. Create the environment and its rule **before** this workflow first runs: GitHub otherwise creates the environment with no rule and no secrets.

**No privileged trigger may name `staging-e2e`:** no workflow triggered by `pull_request_target`, `workflow_run` or `issue_comment` may reference this environment. Those run in a privileged context from the default branch, on behalf of events anyone can cause.
