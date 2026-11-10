# Current milestone review — 2026-11-10

Scope: commit `a9d4061` against `2a45ac2`, covering workspace Auth integration,
transaction management and its UX repair. Existing ledger code was read only
where needed to verify callers and financial/security behavior. No next
milestone, dependency installation, remote migration, commit or deployment.

## Implemented and reviewed

- Verified-session boundaries, personal/shared workspace discovery, setup and
  explicit invitation acceptance.
- Exact-IDR account openings, income/expense/transfer creation and editing,
  date/category/notes, audited void, monthly filtering and pagination.
- Workspace-scoped RPC reads/writes, optimistic revisions, operation UUIDs,
  frozen retries and identity/access-aware draft concealment/discarding.
- Reference app shell, compact mobile rows, entry sheets and full-month category
  chart/table. Existing sample budgets/goals/settings remain separate.

## Finding fixed

**P2 — Fully refunded spending was mislabeled as no spending activity.**

The page filters zero-net categories out of its chart. It then treated an empty
chart as evidence that the user had never recorded an expense. A Rp10,000 expense
and linked Rp10,000 refund therefore prompted the user to record an expense even
though the ledger and gross/refund totals were correct.

The existing overview now checks exact gross expense/refund amounts before
choosing the empty-state copy. It distinguishes no spending from spending fully
offset by refunds. There is no change to accounting, database functions or writes.

Evidence: a browser regression failed on the old copy before the fix, then passed
against the production build. Real local SQL/RLS asserts gross=10000,
refunds=10000, net=0 and restored closing cash=500000. A separate initial-state
assertion preserves the no-activity message. Refund creation here is a synthetic
RPC fixture; no refund-entry UI was added.

Changed implementation: `src/app/(live)/w/[workspaceId]/page.tsx`.
Regression coverage: `tests/e2e/transactions.mjs`.

## Checks and results

| Check | Result |
|---|---|
| `npm test` | 35 passing unit tests |
| `npm run test:db` | 18 passing; one native multi-connection test skipped |
| `npm run test:e2e` | Pass: CRUD, retry/conflict, exact category report, zero-net refund state, keyboard, six viewport widths, two identities, private denial, shared single counting, draft/portal privacy |
| Existing prototype regressions | Budgets, goals and settings render at 375px, remain explicitly labeled sample data and have no horizontal page overflow |
| `npm run typecheck` | Pass: strict TypeScript and 16 RPC contracts |
| `npm run lint` | Pass |
| `npm run build` | Pass: production Webpack build |
| `npm run test:integration` | Pass: redirects, no-store headers, direct unauthenticated workspace/financial action rejection and fixed callback |
| `npm run audit:local` | Pass: no matching private credential values in source/client bundles; no public secret variable or hardcoded credential candidates |
| Dependency review | No added dependencies or package-lock changes in this milestone |
| Diff review | No whitespace errors; no unrelated code cleanup or new abstractions |

Financial checks include opening/transfer neutrality, edited/voided postings,
shared single counting, exact large aggregates and Jakarta dates. Authorization
checks use actual local SQL roles/RLS, same-workspace references, denied direct
writes and scoped RPCs. Privileged SQL/grants/search paths were inspected in the
milestone migration. No additional financial calculation, TypeScript or
authorization defect was found in the reviewed paths and local checks.

The UI keeps existing shadcn primitives and scoped design styles. Loading,
unavailable, denied, conflict, uncertain-write and empty states are present.
The only reproduced state defect found in this review is fixed above.

## Incomplete and manual follow-up

- Native concurrent retries/refunds/reservations/revisions require a dedicated
  loopback PostgreSQL cluster and `TEST_DATABASE_URL`. The default PGlite run
  cannot prove multi-connection behavior.
- Browser tests use a loopback Auth/HTTP adapter and real ledger SQL/RLS. They do
  not prove hosted Supabase Auth, OAuth, token refresh or hosted RPC deployment.
- Hosted blockers remain recorded in [INTEGRATION_AUDIT.md](../INTEGRATION_AUDIT.md).
  Missing migrations/configuration require separate owner approval and hosted
  verification before real-data use; no hosted changes were attempted.
- Physical phones/virtual keyboards, screen readers, cross-browser testing and
  human usability studies remain unverified.
- Broader budget/goal writes, refund/correction entry, category lifecycle,
  departure/deletion flows and release gates remain outside this milestone.
  Roadmap checkboxes remain unchanged.
