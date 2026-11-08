# Supabase Integration Audit

Later 2026-11-07 transaction brief adds local financial write UI using existing
RPCs. `/`, `/accounts` and `/transactions` now lead to authenticated workspace
discovery. See [transaction implementation/evidence](docs/TRANSACTION_MANAGEMENT.md).
The audit below remains historical; its hosted deployment blockers are not
resolved or re-certified by local transaction tests. No remote migration applied.

Date: **2026-11-07**, Asia/Bangkok. Scope: existing Next.js 16 application; configured Supabase staging; safe local remediation. No remote migration, hosted configuration, allowlist or real financial record was changed. Google consent/account entry was not automated.

## 1. Executive Summary

**Staging is reachable; financial integration is blocked at the RPC deployment/schema-cache boundary.** The configured publishable key reaches Auth settings (HTTP 200), Google is enabled, and OAuth initiation redirects to Google (302) with this project's Supabase callback. A ledger schema API request is rejected (406/PGRST106).

Every one of the **13 original financial RPCs** returns **404/PGRST202** for its expected argument names. The two newly proposed read RPCs do too, as expected before migration 003. These are failed API-signature discovery checks, **not passing anonymous authorization checks**. Possible causes: migrations absent/partial, wrong exposed schema, different signatures, or stale PostgREST schema cache. Anonymous OpenAPI access also returns 401. Without owner SQL catalog results, the exact hosted migration/grant state is **BLOCKED**, not guessed.

Locally fixed: missing workspace discovery/read facade; untyped RPC clients; Auth success conflated with allowlist/database errors; missing proxy coverage for real workspace routes; missing private-view lifecycle handling; multiple requests mixing financial snapshots; and audit checks that could falsely pass disabled/misconfigured Google. Original migrations 001/002 and financial rules are unchanged. Additive **003 is proposed locally only**.

Prepared minimal server-rendered read-only routes: `/workspaces` and `/w/[workspaceId]`. They render financial data only after a verified current Auth user and successful authorized RPCs. The overview reads accounts, monthly totals and the first 50 transactions from **one PostgreSQL statement snapshot**. Errors/denials never fall back to mock balances. Authenticated cloud acceptance and Phase G activation remain **BLOCKED** until deployment/authorization are verified. Existing `/`, `/transactions`, `/accounts`, `/budgets`, `/goals`, `/settings` remain separate sample-data screens.

Executed: **20/20 unit tests**, **17/17 native PostgreSQL tests**, lint, strict types, production build, configured local HTTP smoke and signed-out browser guards. The default WASM run explicitly skips multi-connection testing. Real Google login/code exchange/session refresh/logout and two-real-identity cloud RLS are **not claimed as passed**.

## 2. Integration Status Matrix

Status applies only to the environment named in the row. PASS locally does not imply PASS on staging. Severity indicates the impact of the remaining gap.

| Component | Status | Evidence | File/function | Severity | Action |
|---|---|---|---|---|---|
| Architecture inventory | PASS | App Router; prototype context; SSR Auth; internal ledger/public RPC boundary; no API route financial writes | `src/app`, `src/features/prototype`, `src/lib/supabase` | — | Preserve existing layers |
| Env presence/validation | PASS local | Required three variables present; authConfig valid; no public secret-name candidates | `config.ts`, `audit-local.mjs` | — | Keep canonical SITE_URL |
| `.env.local` exclusion rule | PASS local | `.env*` ignored, `.env.example` exception only | `.gitignore` | — | Keep secrets ignored |
| Git tracked/history verification | PASS publication follow-up | Initially no Git repo. Owner later requested GitHub push; fresh repo/index initialized, 111 staged files inspected, env/artifacts excluded, no credential-pattern matches | Repository root | — | No prior local history existed to inspect |
| Hardcoded credentials/client bundle scan | PASS scoped scan | 49 source files, 43 client JS bundles; zero credential-pattern/private-env-value matches | `audit-local.mjs` | — | Re-run after build; heuristic scan is not exhaustive secret certification |
| Browser/server clients | PASS local design | Request-scoped typed server client; publishable key + user cookies; no privileged runtime client | `server.ts`, `database.types.ts` | — | Browser client intentionally absent: OAuth/read path uses server actions/components |
| SSR cookie refresh/proxy coverage | PASS local implementation | getAll/setAll, response cache headers, getClaims; new private route matchers | `src/proxy.ts` | P1 cloud test pending | Verify real refresh manually |
| Identity verification | PASS local implementation | Current `getUser`, verified email, no getSession authorization | `session.ts` | P1 cloud test pending | Manual Google/session tests |
| Callback destination/no-code failure | PASS local HTTP | Fixed configured destination; external `next` ignored; no-store | `auth/callback/route.ts` | — | Keep fixed origin |
| Auth versus financial authorization | PASS local implementation | Callback confirms Auth only; ready separately runs allowlisted provisioning and renders safe financial status | `auth/ready/page.tsx`, `errors.ts` | P1 cloud test pending | Verify an unlisted identity stays denied |
| Staging Auth connectivity | PASS staging | GET settings 200 using publishable key; Google enabled | `audit-staging.mjs` | — | No settings changes needed from this evidence |
| Google redirect initiation | PASS staging, limited | Auth authorize 302 to accounts.google.com; redirect_uri matches project callback | `assessGoogleRedirect` | — | This does not prove Google consent/client validation |
| Google consent/code exchange | BLOCKED | No real browser identity/consent supplied | callback | P0 | Owner manual steps below |
| Session persistence/refresh/logout/expired session | BLOCKED staging | No completed real login/session; cannot manufacture evidence | Auth lifecycle | P0 | Owner tests below |
| Signed-out protected navigation | PASS local HTTP/browser | `/workspaces` and `/w/<synthetic UUID>` visibly return to sign-in; no financial content | live routes/session | — | HTTP streaming redirect handled explicitly |
| Cross-window/BFCache guards | PASS focused unit; BLOCKED real identities | Blur/focus/visibility/pageshow invalidation and session BroadcastChannel | `privacy.ts`, `private-view.tsx`, `session-controls.tsx` | P1 | Run two-window manual identity/logout test |
| Private ledger API exposure | PASS staging, limited | Request with Accept-Profile ledger rejected PGRST106 | staging probe | — | Keep ledger unexposed; dashboard confirmation still recommended |
| Anonymous OpenAPI catalog | BLOCKED staging | API root returns 401; no function catalog available | staging API root | P0 diagnostic gap | Run catalog-only SQL |
| Hosted tables/FKs/indexes/RLS/grants | BLOCKED | API cannot establish exact deployed SQL state | migrations 001/002; catalog SQL | P0 | Owner read-only SQL inspection |
| Personal/shared isolation | PASS local native; BLOCKED staging | Actual authenticated/anon SQL roles, hostile IDs, aggregates, joins, writes and revocation | `tests/db/database.test.mjs` | P0 | Fresh isolated staging, two identities |
| UUID allowlist/Auth/profile/member relationship | PASS local native; BLOCKED staging | Verified allowed UUID required; profile/personal owner member provisioned atomically; shared requires acceptance | ledger.allowed, ensure_personal_workspace, accept_invite | P0 | Inspect identities/allowlist privately; approve specific UUIDs |
| Exact money/transfer/refund/reservation semantics | PASS local native/unit; BLOCKED staging | Rp2,760,000 fixture; huge exact JSON aggregate; transfer rollback; refund limits; underfunding | SQL tests; finance reader decoders | P1 | No financial-rule change proposed |
| Idempotency/revisions/concurrency/audit | PASS local native; BLOCKED staging | Duplicate retries, changed payload, stale version, concurrent reservation/refund, forced second-leg rollback | SQL operations/tests | P1 | Hosted synthetic fixtures after approval |
| Workspace read UI | PASS local implementation; BLOCKED authenticated cloud acceptance | Auth-gated read-only routes, exact labels, loading/empty/denied/unavailable states | `src/app/(live)` | P1 | Deploy/verify RPCs before activation |
| Original financial UI source | PASS audit | All six existing finance destinations still use authored fixtures/demo context | `src/features/prototype/*` | — | Clearly labeled sample; no full write integration |
| Type contracts | PASS local | 15 public RPC definitions generated from isolated migrated DB; typecheck detects drift | generator/database.types.ts | P1 hosted comparison pending | Compare catalog signatures, not just local generation |

### RPC matrix

Every local result below uses a disposable PostgreSQL database with real role enforcement, not mocked RLS. Every staging probe uses **no user JWT**. Expected deployed behavior is 42501 permission denial; PGRST202 is not accepted as that proof.

| Public RPC | Local | Staging | Severity / next action |
|---|---|---|---|
| ensure_personal_workspace | PASS | FAIL: 404/PGRST202 | P0: check 002 deployment/cache |
| create_shared_workspace | PASS | FAIL: 404/PGRST202 | P0: check 002 deployment/cache |
| invite_member | PASS | FAIL: 404/PGRST202 | P0: check 002 deployment/cache |
| accept_invite | PASS | FAIL: 404/PGRST202 | P0: check 002 deployment/cache |
| read_workspace | PASS | FAIL: 404/PGRST202 | P0: check 002 deployment/cache |
| read_transactions | PASS | FAIL: 404/PGRST202 | P0: check 002 deployment/cache |
| monthly_report | PASS | FAIL: 404/PGRST202 | P0: check 002 deployment/cache |
| save_financial_record | PASS | FAIL: 404/PGRST202 | P0: check 002 deployment/cache |
| save_transaction | PASS | FAIL: 404/PGRST202 | P0: check 002 deployment/cache |
| void_transaction | PASS | FAIL: 404/PGRST202 | P0: check 002 deployment/cache |
| allocate_goal | PASS | FAIL: 404/PGRST202 | P0: check 002 deployment/cache |
| archive_goal | PASS | FAIL: 404/PGRST202 | P0: check 002 deployment/cache |
| read_audit | PASS | FAIL: 404/PGRST202 | P0: check 002 deployment/cache |
| list_workspaces (new) | PASS | NOT DEPLOYED/404 | P0 for read UI: approve proposed 003 |
| read_workspace_overview (new) | PASS | NOT DEPLOYED/404 | P0 for read UI: approve proposed 003 |

No success, unauthorized data disclosure, or authenticated financial write was observed in these staging probes. Exact causes of the original missing signatures require the owner catalog check. A schema-cache failure is not fixed by granting wider access or exposing ledger.

## 3. Changes Made

| Files | Reason / verification |
|---|---|
| `scripts/audit-staging.mjs`, `staging-checks.mjs` | Reproducible anonymous/non-destructive probes; only sanitized booleans/status/error codes saved. Google-disabled/wrong-callback regressions tested |
| `scripts/audit-local.mjs` | Env presence/exclusion, credential-pattern/value scans and migration hashes, without printing env values |
| `scripts/http-smoke.mjs` | Configured production signed-out guard, no-store and fixed-redirect tests; recognizes documented Next.js streamed meta redirects |
| `supabase/audit/read_only_catalog.sql` | Owner-run SELECT-only inventory of schemas, signatures, grants, RLS and policy state |
| `202611070003_workspace_reads.sql` | Additive list_workspaces + STABLE combined overview. No tables, money rules, privileges on ledger or old migrations changed. Native scope/denial/snapshot tests passed; **not applied remotely** |
| `scripts/generate-rpc-types.mjs`, `database.types.ts` | Types generated from an isolated local database; 15 function contracts. No hosted credentials required |
| `finance.ts`, `errors.ts`, `session.ts` | Typed request-scoped read facade, strict string-money boundary, safe errors, verified session and Jakarta month ranges |
| `server.ts`, `src/proxy.ts` | Typed client/no-store reads; proxy includes real routes; failure never authorizes a user |
| Auth callback/ready/sign-in | Separate Auth success from financial permission/deployment errors; explicit real-workspace link; session invalidation signals |
| `src/features/workspaces/*`, `src/app/(live)/*` | Small guarded read-only workspace view; design tokens/shadcn reused; no full financial writes; per-window invalidation and no mock fallback |
| `tests/unit/*`, `tests/db/database.test.mjs` | Safe error/argument/precision/lifecycle/probe regressions; discovery/overview authorization; native concurrent consistent snapshot |
| package scripts/docs | Reproducible commands and explicit cloud blockers; milestone boxes remain unchecked |

Review findings were reproduced and corrected: snapshot mixing, focus-only window changes, and provider-check false positives. Verification harness also corrected a reserved SQL alias, an HTML-regex false positive on a CSS class, and a 307-only assumption for Next.js streaming redirects. Final results below supersede those intermediate test failures.

## 4. Remaining Gaps

**P0 — blocks secure cloud integration**

- Original financial RPC signatures are unavailable through staging PostgREST. Exact catalog state, migration history, grants and RLS cannot be certified from public access. No SQL migration was approved/applied by this audit.
- No owner-completed Google login or verified allowlisted UUID was available to the agent. Authenticated reads, two-user privacy, shared acceptance/revocation, refresh/logout/expiry and denied identity behavior remain BLOCKED on staging.
- Real-data launch/production configuration is not approved. Existing O01–O05 lifecycle/operational gates are not implicitly resolved.

**P1 — blocks real financial functionality**

- New read RPCs need owner review/approval and deployment; generated types reflect local migrations only.
- Read UI cloud acceptance is blocked. Full financial create/edit/void interfaces, invitations UI and full transaction pagination are deliberately not implemented. Read preview clearly limits transactions to the first 50 and does not claim the list is the complete monthly total.
- Cross-window guards are unit-tested; genuine identity/token/cache transitions require manual two-window verification.

**P2 — UX/production improvements**

- Backup/restore, rate limits, MFA/recovery/session policy, representative performance and accessibility/reflow acceptance remain pending.
- Prior dependency audit recorded eight moderate lint-toolchain findings; no unrelated force-upgrade was applied or claimed as a fresh vulnerability audit here.
- Git inspection was initially blocked by the absence of a repository. During the later owner-authorized publication step, a fresh repository was initialized and staged content checked; no env/credential candidates were included. There was no prior local history to inspect.

## 5. Manual Actions Required

### A. Inspect staging without changing it

1. Open Supabase dashboard and select project `zezqfpvyhzlnfxzulxeh`.
2. Open **SQL Editor → New query**.
3. Copy/run [read_only_catalog.sql](supabase/audit/read_only_catalog.sql). It contains SELECTs only and no financial row reads.
4. Inspect whether ledger exists, 14 ledger tables have RLS, expected RPC signatures exist, authenticated has EXECUTE and anon does not. Compare argument names with the local generated contract.
5. In Data API settings, confirm public is exposed and ledger is **not** exposed. Do not change settings without owner approval.
6. If migration-history table exists, inspect its versions in the dashboard privately. Do not paste Auth tokens, keys, emails or finances into chat. Catalog-only results are enough for diagnosing deployment.

### B. Migration decision — explicit approval required

Required files, in order:

1. [202611060001_schema.sql](supabase/migrations/202611060001_schema.sql): ledger tables, constraints, RLS.
2. [202611060002_operations.sql](supabase/migrations/202611060002_operations.sql): all 13 original public RPCs.
3. [202611070003_workspace_reads.sql](supabase/migrations/202611070003_workspace_reads.sql): proposed discovery/consistent overview only.

If ledger does not exist, 001 is required before 002/003. If 001 is complete but RPCs are absent, 002 and proposed 003 are the missing API layer. If objects partially exist or history disagrees, stop and reconcile; do not rerun CREATE scripts blindly or edit applied migrations. If signatures exist and match, investigate exposure/cache instead of recreating data.

After explicit owner approval, apply only the reviewed missing files through the project's migration workflow or SQL Editor, one transaction/file in order. Do not reset/drop existing tables. Cache reload/config changes also require approval; do not use them before confirming the matching objects exist. Re-run `npm run audit:staging`: original/new RPC probes should now yield 42501 rather than PGRST202. A permission-denial probe still does not substitute for authenticated RLS tests.

If SQL Editor is used, retain an explicit record of each filename/date/result: running SQL there does not automatically establish matching Supabase CLI migration history. Reconcile history before later CLI pushes; never mark a migration applied without checking its objects.

### C. Finish Google Auth and UUID authorization

1. In Google Cloud, open the **same Web OAuth client ID** configured in Supabase. Its **Authorized redirect URIs** must contain `https://zezqfpvyhzlnfxzulxeh.supabase.co/auth/v1/callback` exactly. If Google is in Testing, include both partner emails as test users. Client Secret stays in provider settings.
2. In Supabase Auth URL configuration, use the app's exact canonical SITE_URL and allow its `/auth/callback`. Use that same hostname/port in the browser so the PKCE verifier cookie returns to the same origin. The audit preview on port 3131 was for signed-out checks, not a full OAuth flow.
3. Start `npm run dev` and open the configured SITE_URL `/sign-in`. Owner manually chooses Google account and completes any consent. No automated password/consent entry is required.
4. `/auth/ready` must show **Authentication confirmed** independently of financial access. If migrations are missing, it should show service-unavailable rather than pretending the identity is denied. If the identity is not allowlisted, financial access must remain denied.
5. In Supabase **Authentication → Users**, privately copy the two intended verified Auth UUIDs. After approving these exact identities and applying the schema, use trusted SQL Editor administration to insert those UUIDs into ledger.allowed_users. This is a hosted authorization write and was **not** performed by this audit. Do not allowlist by display name or user-supplied metadata.
6. Reload `/auth/ready`. Allowlisted provisioning should create exactly one personal workspace/profile/owner membership. `/workspaces` should list only active authorized memberships. No account/balance is manufactured by provisioning.

### D. Manual acceptance checklist — currently BLOCKED

Use a **fresh, explicitly disposable staging dataset** with synthetic amounts/accounts. Do not run fixtures or membership removal against an existing real household. Shared workspace is a singleton; a project with a real household is unsuitable for creating another test household. Use a separate isolated staging project if needed.

| Test | Exact manual action / expected result | Current status |
|---|---|---|
| Google A/B | Separate normal/incognito profiles; complete Google login as each partner; callback reaches ready with correct identity | BLOCKED |
| Allowlist distinction | Unlisted third identity may authenticate but cannot provision/list/read/write financial data | BLOCKED |
| Personal provisioning | Reload/retry ready; one personal workspace, one owner membership per UUID | BLOCKED |
| Private reads/aggregates | In B, use A's synthetic workspace URL; generic denial, no account names/amounts/audit. Repeat reverse direction | BLOCKED |
| Private mutations | User-JWT requests using the existing tested RPC contracts target the other synthetic workspace; deny with no changes. No privileged key | BLOCKED |
| Shared ownership/invite | On isolated fixtures, owner creates household/invites B's verified UUID; A/third identity cannot accept B's invite; B explicitly accepts; only then can B read shared rows | BLOCKED |
| Personal after joining | Both still cannot read the other's private URL/rows after joining shared | BLOCKED |
| Revocation | On approved disposable fixtures only, owner/admin revokes B; B's next shared read/write/retry denied; prior shared history/author retained | BLOCKED |
| Refresh/expiry | Leave an allowed session through actual token refresh; reload/read works. Expired/revoked session must redirect or show safe unavailable/denied state, not stale finances | BLOCKED |
| Logout/back/windows | Two visible windows; sign out/change identity in one, focus/back/restore the other; old financial content must be hidden/reverified | BLOCKED |
| Exact finances/RPCs | Run synthetic original fixture and retries/conflicts/forced rollback only in approved isolated staging; compare local expected totals | BLOCKED |

Record PASS/FAIL individually with date and environment. Do not send bearer tokens or real financial content as evidence. This report leaves these BLOCKED rather than inferring success from local tests.

## 6. Tests

| Exact command / action | Environment | Actual result |
|---|---|---|
| `npm run lint` | Local source | PASS, zero errors |
| `npm run typecheck` | Local migrated type check + strict TypeScript | PASS, 15 RPC type contracts match |
| `npm test` | Unit; SDK transport responses explicitly mocked; lifecycle EventTargets simulated | PASS 20/20; not hosted evidence |
| `npm run test:db` without TEST_DATABASE_URL | Real PostgreSQL WASM | Baseline 15/1 skip; after discovery 16/1 skip. Native run below supplies full final evidence |
| `TEST_DATABASE_URL=<dedicated loopback postgres database> npm run test:db` | Native PostgreSQL 17.11, real SQL roles, disposable random database | PASS 17/17, zero skips; includes concurrent writers/read-snapshot consistency |
| `npm run build` | Local production, configured env | PASS; auth/live/sample routes built |
| `npm start -- --port 3131` then `npm run test:integration` | Local configured production HTTP | PASS; sign-in enabled, signed-out routes denied/redirected, no-store, external next ignored |
| In-app browser: sign-in → `/workspaces` → synthetic `/w/<UUID>` | Local production, signed out | PASS; Google button rendered and both private destinations visibly returned to sign-in; temporary tab closed |
| `npm run audit:local` | Local configuration/source/static client bundles | PASS scoped scan; no credential matches; Git index inspected separately during publication |
| `git check-ignore .env.local`; `git ls-files -- .env.local`; exact staged-content scan; `git diff --cached --check` | Owner-authorized Git publication follow-up | PASS: env ignored/untracked; 111 staged files; zero forbidden paths/credential candidates; no whitespace errors |
| `npm run audit:staging` | Actual configured Supabase, publishable key, no user JWT | **Exit 1 expected: FAIL** missing/unavailable 15 RPC signatures, OpenAPI BLOCKED; 3 limited staging probes PASS |
| SQL catalog/dashboard/real two-user Google flows | Hosted staging | BLOCKED; no dashboard/admin/session access supplied |

Machine-readable sanitized evidence: `test-results/staging-audit.json` and `test-results/local-audit.json` (ignored artifacts). Final staging probe timestamp: `2026-11-06T17:40:30.495Z` (2026-11-07 in the client timezone). No full env file, credentials, tokens, private rows or raw provider-error bodies are included.

Native tests create/drop only their own randomly named local database. They do not accept remote TEST_DATABASE_URL hosts. No staging fixture reset occurred. The local PostgreSQL/preview servers are stopped when the audit completes.

## 7. Next Development Recommendation

Superseding scope, 2026-11-07: user separately authorized Auth/workspace management
and every verified signup. [AUTH_WORKSPACES.md](docs/AUTH_WORKSPACES.md) records
local implementation, migration 004, changed authorization policy and new checks.
The remote blockers and unapplied-migration warnings in this audit still apply.

First obtain catalog evidence, approve/apply only missing migrations, authorize the two verified UUIDs, then complete the manual Auth/privacy/read checklist. Do not expand features while these P0 items remain.

After P0 acceptance, the smallest next feature is **one account-create/read-back workflow** using existing save_financial_record with a synthetic opening balance, idempotency and stale-version tests. Obtain separate implementation authorization. Full transaction/transfer/refund/goal-write UI remains outside this delivery.

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [SSR cache headers](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [PostgREST error codes](https://supabase.com/docs/guides/api/rest/postgrest-error-codes), [Next.js streamed redirects](https://nextjs.org/docs/app/api-reference/functions/redirect).
