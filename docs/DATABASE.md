# Database layer — 2026-11-06

2026-11-07 transaction-management follow-up: the live workspace UI now invokes
existing `save_financial_record`, `save_transaction` and `void_transaction` RPCs
through authenticated Server Actions. No new migration or hosted database change.
See [scope, commands and evidence](TRANSACTION_MANAGEMENT.md). Historical
sample-only/read-only statements below describe the earlier delivery.

2026-11-07 Auth/workspace change: migration **004** supersedes the allowlist,
global singleton and literal two-member rules described historically below.
`ledger.allowed()` now requires a verified Auth identity. A protected Auth trigger
provisions personal workspace/profile/system category on verification; 004 also
backfills existing verified identities. `ensure_personal_workspace` remains an
authorized idempotent retry. Each identity may join one active shared workspace;
separate households coexist. `workspaces.member_limit` is operator-only, default 2
(personal: 1). Capacity and pending seat reservations serialize under workspace
locks; identity locks prevent concurrent cross-household acceptance. Revoked owners
cannot issue invitations and their pending invitations cannot be accepted.
`list_workspace_invitations()` exposes only owner/recipient pending invitation
metadata. Legacy `allowed_users` stays private and no longer grants authorization.
No existing migrations were edited. [Setup, tests and limitations](AUTH_WORKSPACES.md).

2026-11-07 audit update: [INTEGRATION_AUDIT.md](../INTEGRATION_AUDIT.md) supersedes the earlier integration/test status below. Staging Auth/Google redirect and ledger API exclusion were checked; all original RPC signatures currently return PGRST202. Proposed migration 003 adds read-only discovery and one-snapshot overview, locally tested only. Guarded `/workspaces` and `/w/[workspaceId]` routes are prepared; authenticated cloud acceptance and remote application remain blocked. Original 001/002 migrations are unchanged.

User authorized this database/security-test slice and Google sign-in. No remote resources/data changed. Financial screens remain the sample-data prototype.

## Migrations and access

Apply `202611060001_schema.sql` then `202611060002_operations.sql` through the Supabase migration workflow after reviewing the target environment. They create schema/RLS/constraints and authenticated RPCs respectively. Both are transactional, additive initial migrations. Neither resets a database. Once deployed, fixes require a new migration rather than editing an applied file.

Tables live in **ledger**. Keep it **outside Supabase's exposed schemas**; expose public RPCs only. RLS also protects authenticated-role SQL reads, joins and aggregates. Direct INSERT/UPDATE/DELETE is denied on all tables. Writes use narrow SECURITY DEFINER RPCs with current-user authorization, empty fixed search paths and qualified references. Function owners must remain trusted migration roles. No routine application query uses a secret/service-role key.

| Table | Relationships and integrity |
|---|---|
| allowed_users | Operator-only Auth UUID allowlist; no user access |
| profiles | Auth UUID PK/FK; self-only reads; no public directory |
| workspaces | personal/shared; unique personal owner; one shared household; fixed IDR/Jakarta |
| workspace_members | PK workspace/user; personal owner only; shared maximum two; active/revoked |
| workspace_invites | Verified intended Auth UUID; seven-day expiry; explicit single-use acceptance |
| accounts | Workspace-qualified ID; signed bigint opening/date; archive/version; no running-balance cache |
| categories | Workspace-qualified ID; income/expense; nonarchivable Uncategorized expense category |
| transactions | One event; expense default; income/expense/transfer/refund/correction; author, optional payer, version, void evidence |
| account_postings | Composite workspace FKs to account/event; unique event/account; constrained cardinality/signs/totals |
| monthly_budgets | Unique workspace/expense-category/month-start; nonnegative bigint; absent differs from zero |
| savings_goals | Workspace-qualified ID; positive bigint target; optional date deadline; archive/version |
| goal_contributions | Append-only reserve/release; composite account/goal/member workspace FKs |
| mutation_operations | PK workspace/actor/operation UUID; canonical payload and persisted result |
| audit_events | Append-only scoped actor, operation, entity, before/after, version and UTC instant |

Auth IDs reference `auth.users`; restrictive deletion preserves shared history/authorship. Shared membership exposes only shared data, including member IDs, never private accounts/profiles. Indexes cover active memberships, workspace/date/ID pagination, original-expense refunds, category references, account history, budget uniqueness, reservations and entity audit history.

## Accounting and reliability

Individual money columns are bigint, capped at Rp1 trillion under the DOMAIN_RULES baseline. Openings/corrections can be signed; budgets can be zero; ordinary events/contributions and goal targets are positive. RPC money inputs are ungrouped decimal **strings**, never JSON numbers. Aggregate sums remain PostgreSQL numeric. All RPC JSON numeric leaves, including revisions/audit IDs, become strings before HTTP serialization. Use read RPCs; never expose raw ledger bigint columns through PostgREST. UI calculations must use bigint, not floating point.

Economic values use SQL date; default/today checks explicitly use Asia/Jakarta. Creation/audit values are timestamptz instants. Future transactions/openings and pre-opening postings fail. Opening fields become immutable after any posting history, including voids. Archived accounts remain in balances.

Transfers have one event and two equal opposite postings across distinct same-workspace accounts. Deferred constraints reject missing/wrong legs, wrong category types/dates and invalid refund relationships. Transfers/openings/corrections/reservations do not inflate income/consumption. Refunds are capped cumulatively, derive the original expense's current category and reduce spending in the refund month. Void active refunds before the expense. Event edits audit the old postings as well as the header.

Reservations never create postings or expenses. Reserve checks current balance minus all account reservations. Release cannot exceed its goal/account pool. Later spending can cause underfunding; `shortfall` reports it without rewriting progress. `archive_goal` explicitly releases all pools and archives in one operation; implicit archive with outstanding reservations is rejected.

Financial and membership writes lock the workspace row first. This intentionally serializes a small two-person workspace, including competing refunds/reservations/expenses. Reads retain MVCC behavior. Edits compare expected revisions. Same actor/workspace/operation UUID plus identical canonical JSONB returns the previous result; changed input conflicts. The stored JSONB is the full fingerprint input, avoiding hash collisions. Retry results are reauthorized after membership changes. Mutation, result and audit commit together or roll back together. Audit/operation retention has no user deletion API pending O05.

## RPC contract

Call through the user's cookie-bound `supabase.rpc(name, args)` client.

| RPC | Arguments / behavior |
|---|---|
| ensure_personal_workspace | No args; verified allowlisted identity; idempotent provisioning; workspace UUID result |
| create_shared_workspace | No args; singleton household; creator owner; owner retry returns same UUID |
| invite_member | `w`, `recipient` Auth UUID; shared owner only; invitation UUID result |
| accept_invite | `invitation`; intended verified recipient, expiry/single-use/capacity checked under lock |
| save_financial_record | `w`, `op`, `entity` account/category/budget/goal, `p` JSON, `expected_version` (0 for create) |
| save_transaction | `w`, `op`, `p` JSON, `expected_version` (0 for create) |
| void_transaction | `w`, `op`, `item`, `expected_version`, `reason` |
| allocate_goal | `w`, `op`, `goal`, `account`, `direction` reserve/release, `amount` string |
| archive_goal | `w`, `op`, `goal`, `expected_version`, `release_reservations` boolean |
| read_workspace | `w`; accounts/current balances/reservations/shortfalls, categories, budgets, goals, members |
| read_transactions | `w`, inclusive `from_date`, exclusive `until_date`; optional paired `after_date`/`after_id`; `page_size` 1–200 (default 100); date/ID order; includes void history |
| monthly_report | `w`, `month_start`; exact income/gross/refund/net/cash/reconciliation and category budgets; future closing cash unavailable |
| read_audit | `w`, optional `after_id`; 100-row ascending-ID pages |
| list_workspaces (proposed 003) | No args; only verified allowlisted identity's active memberships; UUID/name/kind/role |
| read_workspace_overview (proposed 003) | `w`, `month_start`; authorized workspace snapshot, report and first 50 transactions in one STABLE statement snapshot |

Master saves replace all editable fields. Updates require `id` and the expected revision. Account: name/kind/opening_date/opening_balance/archived. Category: name/kind/archived. Budget: category_id/month/amount. Goal: name/target_amount/deadline/archived. Omitted archive flags mean active; omitted deadline means none. Category kind is immutable. Caller metadata cannot override workspace, creator, system marker, timestamps or revisions.

Transaction input: optional id/kind (expense default)/economic_date (Jakarta today default), amount string, account_id; category_id for income/expense (expense falls back to Uncategorized); destination_account_id for transfer; original_expense_id for refund; description required for correction; paid_by optional for shared expense only. Kind/original-expense link cannot change on edit: void/re-enter. Archived accounts/categories reject entry edits; void and reservation release remain possible. Returned revisions are strings; expected revisions are bounded PostgreSQL integer inputs. Reuse `op` after uncertain persistence; use a new UUID for a different intended mutation.

```ts
await supabase.rpc('save_transaction', {
  w: workspaceId, op: operationId, expected_version: 0,
  p: { kind: 'transfer', amount: '200000', economic_date: '2026-01-10',
       account_id: sourceId, destination_account_id: savingsId },
});
```

Errors include `42501` generic denial/unavailable, `40001` payload/revision conflict, `22023` invalid input, `23514` financial-integrity violation and ordinary FK/unique/not-null/type failures. Future UI must translate them safely and confirm saves only after RPC completion. Do not log financial payloads or raw provider details.

## Google sign-in setup

Verified packages: `@supabase/ssr` 0.12.7 and `@supabase/supabase-js` 2.119.0. Next.js 16 uses `src/proxy.ts`. Server cookie clients refresh with `getClaims`; callback/current-user checks use `getUser`. No deprecated auth helpers or `getSession` authorization.

1. Operator reviews/applies migrations to isolated Supabase before real-data use. Keep ledger off exposed schemas. No remote migration was applied here.
2. Copy `.env.example` to ignored `.env.local`; fill project URL, **publishable** key and canonical `SITE_URL` origin (HTTPS outside loopback). Missing/invalid config disables Google sign-in. TEST_DATABASE_URL is test-only, never an app credential.
3. Enable Google in Supabase Auth. Configure Google OAuth credentials in provider settings, never source control. Google's authorized redirect must match the callback displayed by Supabase (hosted projects usually `https://<project-ref>.supabase.co/auth/v1/callback`). Allow the exact app `SITE_URL/auth/callback` in Supabase redirect settings.
4. Provision/verify the two intended Auth identities, then insert their immutable UUIDs into ledger.allowed_users through trusted administration. No browser metadata/email/payer input can grant membership. Verify Google identity linking keeps the intended UUIDs in staging.
5. Google login uses PKCE; `/auth/callback` exchanges the code, checks current verified identity and provisions only an allowlisted workspace. Unknown Google identities receive no financial access even if Auth creates an account. Preventing Auth-account creation itself requires separately configured provider signup policy/before-user-created hook; not implemented here.
6. Shared invites bind authenticated recipient UUIDs. Invitation UUIDs identify resources, not bearer secrets. No invitation email/token is sent or stored. Explicit acceptance grants shared access; pending invitations never do.
7. Success reaches `/auth/ready`, showing identity and sign-out. Financial prototype routes remain sample data. Return URLs are fixed to configured origin, ignoring caller `next`/forwarded host. Auth responses are private/no-store. No private financial browser cache was introduced.

O01 remains constrained to shared opening funds/tracked-account spending: no private-funded purchase, routine top-up, reimbursement, split/debt or cross-workspace movement. O02 actual identities/MFA/recovery/session/rate limits remain operator decisions. O03/O05 remove/leave/ownership-transfer/deletion APIs are unavailable. Administrative revocation stops subsequent shared access and retains history.

Official references: [SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Google OAuth](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [grants/RLS/exposed schemas](https://supabase.com/docs/guides/api/securing-your-api).

## Verification

`npm run test:db` uses disposable PGlite: real PostgreSQL compiled to WASM, with real finance SQL/grants/constraints/RLS. Harness bootstrap supplies only Supabase-owned auth.users/auth.uid/roles. User checks run under authenticated/anon roles. Fixtures use generated UUIDs and invented finances. Default run: 15 passed, one explicit multi-connection skip (16 tests including parent).

For concurrency, set TEST_DATABASE_URL to the **postgres database of a dedicated loopback PostgreSQL cluster**, then run the same command. Harness rejects remote hosts and URL parameters; creates a random finance_planner_test_* database; migrates/tests; closes connections and drops only that database. It may create NOLOGIN anon/authenticated cluster roles if absent. Never use a cluster holding real application data. Admin privileges are isolated test setup only.

Native PostgreSQL **17.11**: **16/16 passed**, zero skips. Covered all-table CRUD authorization; anonymous/unlisted/unverified identities; private joins/aggregates/RPC/audit; malicious references; forged direct membership writes; bound/expired/revoked/reused/racing invites; revocation/retry reauthorization; Rp2,760,000 reconciliation; exact `9010000000999999` JSON aggregate; second-leg rollback including operation/audit; used openings; refunds; zero/unset budgets; underfunding; atomic archive/release; idempotency; concurrent refunds/reservations/stale edits; observed reservation lock behind an uncommitted expense. Native server stopped afterward.

Unit tests: 12/12 passed. Lint, strict typecheck and production build passed. npm audit: eight moderate dev-toolchain findings through existing eslint-config-next/typescript-eslint/minimatch; no force upgrade applied.

Production HTTP smoke passed: unconfigured Google button disabled, `/auth/ready` redirects to sign-in, `/auth/callback` returns 503/no-store without configuration and ignores an external `next` destination. Independent read-only SQL/auth security review found no actionable defects. This does not substitute for configured OAuth/browser acceptance.

Not verified: hosted Supabase Auth/PostgREST, real Google consent/login/logout/recovery/linking, two authenticated browser identities/cache transitions, production migrations/grants, generated provider database types, backup/restore, hosting/performance/release gates. This is not a production-readiness claim; milestone completion remains unchecked.
