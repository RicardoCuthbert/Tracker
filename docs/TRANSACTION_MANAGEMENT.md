# Transaction management — 2026-11-07

2026-11-08: [UX review and evidence](UX_REVIEW_2026-11-08.md) supersedes the
visual polish below. The live page now restores the reference sidebar/topbar,
first-screen entry, compact rows, real full-month category donut/table and a
full-screen financial entry sheet. Existing RPC financial semantics stay intact.

UI polish reuses the existing Supabase transaction implementation: neutral
workspace headers, exact balance cards, grouped account/transaction actions,
secondary category buttons and the shared month-input/button components.
Transaction rows stack with visible field labels below 1100px; all details and
actions fit at 1440, 1024, 768, 390 and 320px without horizontal scrolling.
Browser regression first reproduced overflow at 768px, then passed after the fix.
Browser testing also reproduced a rapid typing/Backspace caret race: restoring
selection in a layout effect now completes before the next keystroke instead of
applying an obsolete animation-frame position. Existing CRUD, retry, conflict
and identity/privacy browser checks pass with both changes.

Follow-up fixes: live amount boxes format typing as `Rp 2,600,000`, including
opening balances. Caret editing stays beside the edited digit. Explicit supported
grouping/prefix normalization precedes integer validation; malformed pasted input
and decimals stay invalid. Storage/RPC money stays exact integer strings.
New workspaces have no income category by default: the form now explains empty
typed lists and offers nested category creation without discarding the transaction
draft. A newly created matching category is selected automatically. Tests cover
empty income recovery, category selection, dynamic typing/caret editing, signed
openings, exact serialization and malformed-input rejection.

The direct transaction-management brief authorizes local financial write UI,
superseding prior read-only scope. No hosted migrations, deployment or real-data
changes are authorized. Existing ledger semantics remain authoritative.

## Implementation plan

- Extend existing RPC decoders with account availability, categories, transaction
  postings and revisions. Keep integer money strings; use existing exact SQL
  balances and monthly reports. Test SDK transport and hostile responses.
- Add validated account/category/transaction/void commands and a verified-session
  Server Action. Reuse public atomic RPCs, operation UUIDs and expected versions.
  Test invalid inputs before implementation; retain database-role security tests.
- Add workspace-keyed forms, edit/void confirmation, pending/error states and
  month-scoped keyset pagination. Root/account/transaction entry points lead to
  authenticated workspace discovery. No sample fallback on database failure.
- Verify CRUD balance effects, transfer neutrality, opening neutrality, shared
  single counting, retry/conflict and isolation against actual local migrations.
- Run unit/database tests, lint, typecheck, production build and HTTP integration.

## Decisions and limits

IDR whole rupiah, signed openings including zero; future dates rejected using
Jakarta today. Transactions default to expense. Notes optional. Delete means
audited void with reason, retaining history. Types stay immutable on edits per
the existing RPC; void/re-enter to change type. Shared accounts use their own
opening funds; no personal-funded household flow or automatic split.

Forms are responsive but never show optimistic financial success. An uncertain
write retains a frozen command for exact retry. A changed draft starts a new
operation only after the previous outcome is resolved. Conflict requires reload.
No private draft persistence in storage or URLs. Identity/workspace changes
discard forms through existing privacy boundary and keyed components.

On blur, private views and their dialog/select portals are concealed and inert.
Open drafts reauthorize through a verified-session, workspace-scoped server read
without replacing form state. Temporary verification failures keep drafts hidden
and expose an accessible retry. Identity/access changes discard them. Restored
drafts label displayed records potentially stale; writes still check their original
revision. Modal focus/pointer trapping is suspended while concealed. Pending or
uncertain operations guard navigation/reload; session actions are exempt from that guard.
Drafts remain in memory only: confirmed departure/browser termination loses them.
Existing shared payer attribution survives edits; no payer/split workflow added.

## Acceptance evidence

Implemented on `/w/[workspaceId]`, with authenticated entry through `/workspaces`.
Root, `/accounts`, `/transactions` redirect to discovery. Existing sample
budgets/goals/settings stay separate and labeled. No new dependencies or migration.

Verification (local, 2026-11-07):

- `npm test`: 34 passing unit tests. Includes strict SDK decoding, money/date/form
  validation, preserved shared payer, write outcomes and sanitized failures.
- `npm run test:db`: 18 passing, one skipped native multi-connection test.
  Actual migrations, PostgreSQL roles/RLS, form-command CRUD balance reconciliation,
  account/date changes, atomic transfer edit/void, openings excluded from income,
  exact huge aggregates, shared single counting and 50-row keyset pagination.
- `npm run test:e2e`: production Next.js plus isolated loopback Auth/HTTP adapter
  and real ledger SQL/RLS. Two browser identities; account/category setup,
  expense default, income/transfer, date/amount edits, void, month empty state,
  invalid-input draft retention, committed-but-lost-response retry, stale conflict,
  concealed portals, failed access recheck/recovery, identity-change draft clearing,
  shared visibility/single counting and 320px reflow. No hosted Auth/OAuth claim.
- Lint, strict typecheck/RPC contract check and production build pass.
- Production HTTP smoke verifies entry redirects, no-store headers, signed-out
  reads and direct workspace/financial Server Action POSTs, and fixed callback.

Browser test requires an existing Playwright installation/browser; no package was
added. Set `PLAYWRIGHT_MODULE` to its absolute `index.mjs` path if not resolvable,
and optionally `CHROME_PATH` to an installed Chrome executable. Run after build.
Tests use ports 3142/3143 and synthetic `.invalid` identities only. Native
concurrency needs dedicated loopback `TEST_DATABASE_URL`; unavailable this run.

Review reproduced and fixed blur-related retry loss and portal concealment/recovery
bugs; new browser regressions cover them. Hosted RPC deployment remains blocked
as recorded in the integration audit; no remote changes, hosted financial writes,
commit or deployment occurred. Full roadmap milestones remain unchecked: refund/correction
entry, category lifecycle, broader search and release gates are outside this brief.

Provider references: [Supabase RPC](https://supabase.com/docs/reference/javascript/rpc),
[Next.js mutations](https://nextjs.org/docs/app/getting-started/mutating-data).
