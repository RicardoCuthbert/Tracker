# Delivery roadmap and acceptance gates

Status: proposed plan; no application work authorized. Date: 2026-11-05.

2026-11-07 transaction brief authorizes and implements the scoped M03–M05 UI
integration described in [TRANSACTION_MANAGEMENT.md](TRANSACTION_MANAGEMENT.md).
Account/category setup, income/expense/transfer CRUD, month paging and exact
balances are covered locally. Full milestones stay unchecked: broader search,
category lifecycle, refund/correction entry and hosted/release gates remain.

Implementation update — 2026-11-06: the user authorized a cross-milestone database/security-test slice plus Google sign-in. [DATABASE.md](DATABASE.md) maps schema/RPC behavior and evidence across M02–M08. Existing prototype tooling supports lint/typecheck/unit/build; test:db now supports isolated PostgreSQL role and native concurrency tests. No transaction UI integration, hosted OAuth/PostgREST acceptance, or real-data launch was performed. Milestone boxes remain unchecked because complete acceptance evidence is still pending.

**Goal:** deliver a private two-person manual finance application whose balances, privacy boundaries and daily workflows can be demonstrated correct.

**Architecture:** Next.js server boundaries and user-scoped Supabase access; PostgreSQL RLS, ownership constraints and atomic financial operations; focused exact-arithmetic domain functions; responsive shadcn/ui and Recharts presentation.

**Specifications:** [PRODUCT.md](PRODUCT.md), [DOMAIN_RULES.md](DOMAIN_RULES.md), [DECISIONS.md](DECISIONS.md). Stack and all global domain constraints apply to every milestone. No UI or migration is created during this planning phase.

## Execution conventions

2026-11-07 audit: [INTEGRATION_AUDIT.md](../INTEGRATION_AUDIT.md) records fresh local/native tests, staging PGRST202 blockers and owner actions. Minimal read integration exists locally but hosted authenticated acceptance remains blocked. No milestone checkbox changes.

Each milestone is a reviewable deliverable; its checkboxes are future work, not completion claims. Within a milestone, take the numbered slice in order: specify the failing check, implement the smallest passing change, run the focused check, and review the diff. Keep commits scoped. Do not implement all screens before database authorization or calculations are proved.

Paths below are proposed implementation targets. Refine exact function signatures and migration filenames when that milestone is authorized, using the then-current repository/dependency versions. This is a product delivery roadmap, not an instruction to scaffold these files now.

Planned verification interfaces after M01 establishes tooling: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:db`, `npm run test:e2e`, `npm run build`. M01 must define their actual runners; none exists or was run in planning. Unit tests cover parsing/calculations, integration tests use an isolated local/test database with real auth roles, and browser tests prove complete workflows. Never run destructive reset/test fixtures against production.

## M01 — Lock scope and establish a verifiable foundation

**Depends on:** review of these documents. **Covers:** P14, operational foundations. **Targets:** package/config files, `src/lib/domain/money.ts`, `dates.ts`, `tests/unit/money.test.ts`, `dates.test.ts`, CI workflow, `.env.example`.

- [ ] 1. Record O01/O04 dispositions for schema scope; select supported dependency/runtime versions and package manager; approve the next implementation slice.
- [ ] 2. Establish minimal Next.js/TypeScript/tooling and the six verification commands; add only dependencies needed by the approved slice.
- [ ] 3. Implement/test exact IDR parsing/formatting/serialization and Jakarta calendar-period helpers before financial features.

**Acceptance:** `10000` and `10.000` parse to 10000n; `10,50`, `10.00`, negative/zero transaction amounts, exponent strings and cap+1 fail; zero openings/budgets are valid. Rp1 trillion survives API serialization unchanged; sums exceeding Number.MAX_SAFE_INTEGER remain exact. October/November, December/January, leap February and Jakarta midnight boundaries pass. Strict types/lint/tests/build pass; CI uses dummy/test secrets only. `.env.example` contains names, no secret values. No bank/AI/PWA dependencies installed.

## M02 — Authentication and workspace isolation

2026-11-07: [Auth/workspace implementation and evidence](AUTH_WORKSPACES.md).
Every verified signup replaces allowlist provisioning by direct user decision.
Local email Auth UI and workspace creation/invitation/acceptance delivered.
Hosted Auth/PostgREST, two-browser acceptance and operational recovery/MFA gates
remain unverified; milestone boxes remain unchecked.

**Depends on:** M01; O02/O03 disposition. **Covers:** P01–P03 foundation. **Targets:** `src/lib/supabase/*`, auth/onboarding routes, `src/features/workspaces/*`, future `supabase/migrations/*`, `tests/db/workspace-access.test.ts`, `tests/e2e/auth.spec.ts`.

- [ ] 1. Test anonymous, Cuthbert, Valen and unrelated-user access; define identity provisioning, recovery and departure behavior.
- [ ] 2. Implement private-workspace provisioning and restricted membership/invite operations with RLS and atomic capacity enforcement.
- [ ] 3. Implement minimal authenticated shell, safe sign-in/return/recovery and authorized workspace navigation.

**Acceptance:** provisioning retry creates one personal workspace; Cuthbert cannot read/write Valen's rows, totals, member/profile details or audit through direct API/RPC or changed URL IDs. Anonymous/unrelated identity denied. Invite only intended verified recipient, single use, expiry/revocation enforced; racing accepts cannot admit a third member. Forged owner/member changes denied. Expired session and sign-out remove sensitive cached UI. Workspace switch grants no new rights. Security tests run as actual user roles, not only service credentials. No production private data in fixtures.

## M03 — Account ledger and database integrity

**Depends on:** M02; O01/O04 baseline approved. **Covers:** P04, P14. **Targets:** `src/features/accounts/*`, `src/features/transactions/*` persistence operations, migrations, `tests/db/ledger-integrity.test.ts`.

- [ ] 1. Define the domain schema from DOMAIN_RULES with same-workspace references, account openings, categories, operations and scoped audit.
- [ ] 2. Implement atomic validated write primitives, optimistic versions and exact derived account balances; ordinary clients cannot mutate postings independently.
- [ ] 3. Verify unused/used opening edits, archival and boundary date rules with isolated database fixtures.

**Acceptance:** opening Rp1,000,000 yields Rp1,000,000 cash and zero income; pre-opening/future entries rejected. Archived account balance remains counted. Cross-workspace account/category/refund references fail even through direct requests. Malformed posting count/sign/type fails. Duplicate operation returns one result, changed payload conflicts, stale account version conflicts. Used opening edits rejected. Audit/result and event roll back together on forced failure. No production data reset required.

## M04 — Income, expenses, and everyday transaction UX

**Depends on:** M03; O08 copy direction. **Covers:** P05, P07, P09. **Targets:** transaction routes/components, `src/features/categories/*`, `tests/e2e/transactions.spec.ts`, transaction database tests.

- [ ] 1. Add tested income/expense create/edit/void operations and category rename/archive rules.
- [ ] 2. Build responsive entry/detail/list flow, default expense, visible workspace and Jakarta date, account/category/text/date/type filters and keyset pagination.
- [ ] 3. Exercise failure/retry/conflict and keyboard workflows; preserve draft and context without claiming unconfirmed saves.

**Acceptance:** Rp300,000 expense subtracts exactly Rp300,000 from one account and adds to one category; Rp2,000,000 income increases one account and earnings. Uncategorized fallback is explicit. Voiding removes aggregate effects and retains evidence. Retry after simulated committed-but-lost response creates one event. Concurrent edits cannot silently overwrite. List has stable date/ID ordering without pagination duplicates, including equal-date entries. Filtered sums and rows agree. Private text searches never appear in URLs, browser history, analytics, or logs; request bodies are excluded from logging. Invalid direct server inputs fail. Keyboard entry works at 320px; errors identify the affected fields.

## M05 — Atomic transfers and balance corrections

**Depends on:** M04. **Covers:** P06, part of P13. **Targets:** transaction operations/forms, `tests/db/transfers.test.ts`, `tests/e2e/transfers.spec.ts`.

- [ ] 1. Test one-event/two-posting transfers, signed corrections, rollback and concurrent retry paths.
- [ ] 2. Add explicit source/destination review and correction reason, with no income/expense category on either kind.

**Acceptance:** cash-to-savings Rp200,000 changes source/destination by minus/plus Rp200,000, total cash unchanged, income/expense unchanged. Same account, cross-workspace, missing leg, unequal legs and archived new destination fail. Forced second-leg failure leaves neither leg. Edit/void affects both legs atomically; correction Rp10,000 changes cash only and appears separately in reconciliation/audit. An optional fee is a separately entered expense. No investment purchase shortcut or cross-workspace transfer UI.

## M06 — Linked refunds and safe corrections

**Depends on:** M05. **Covers:** remainder of P13. **Targets:** refund transaction operations/details, `tests/db/refunds.test.ts`, `tests/e2e/corrections.spec.ts`.

- [ ] 1. Implement linked partial refunds with locked aggregate-limit checks and original-expense dependency rules.
- [ ] 2. Add refund entry/detail and explicit void/refund conflict recovery; show gross/refund/net semantics.

**Acceptance:** Rp50,000 refund of Rp300,000 groceries increases receiving balance and reduces groceries spending, never income. Prior-month expense/current-month refund reduces current-month spending only. Two simultaneous refunds cannot exceed the original. Expense amount/date edits that invalidate refunds fail. Original recategorization updates linked refund classification. Void expense with active refund fails; void refund first restores allowed operation. Wrong-workspace original/account, pre-expense date, standalone refund, and conversion to transfer fail. Audit retains the original evidence.

## M07 — Monthly reports, charts, and budgets

**Depends on:** M06; O04 reporting approval. **Covers:** P08, P10. **Targets:** `src/lib/domain/reports.ts`, overview/budget routes, `src/features/budgets/*`, `tests/unit/reports.test.ts`, `tests/db/reports.test.ts`, `tests/e2e/monthly-review.spec.ts`.

- [ ] 1. Implement exact scoped report queries/functions and monthly budget versioned writes; prove reconciliation before rendering charts.
- [ ] 2. Add month/year navigation, closing-cash label, category chart/table and matching transaction drilldown.
- [ ] 3. Verify unbudgeted/negative/empty/future cases, historical edits and shared budget conflicts.

**Acceptance:** shared deterministic fixture in DOMAIN_RULES produces cash Rp2,760,000, income Rp2,000,000, gross expense Rp300,000, refunds Rp50,000, net spending Rp250,000. Every displayed total reconciles across table/chart/list; transfer/correction/opening effects follow rules. Budget Rp500,000 minus net spend Rp550,000 gives remaining -Rp50,000. Unset differs from zero; unbudgeted spending stays visible. Refund-heavy categories render signed values. Empty months need no creation; future cash projection unavailable. Date boundary and year-change fixtures pass; no private aggregate leakage. Largest chart inputs use checked conversion/fallback. Stale budget version conflicts. Representative performance dataset measured against PRODUCT targets.

## M08 — Savings goals and reservations

**Depends on:** M07. **Covers:** P11. **Targets:** `src/features/goals/*`, goal routes, `tests/db/goals.test.ts`, `tests/e2e/goals.spec.ts`.

- [ ] 1. Test reservation/release events, account locks, eligibility and underfunding calculations.
- [ ] 2. Add goal target/deadline/progress forms and account-backed allocations; explain difference from transfers.

**Acceptance:** fixture's Rp100,000 reservation yields cash Rp2,760,000 and unreserved cash Rp2,660,000 with no expense/budget change. Concurrent reservations cannot exceed available funds at allocation time. Release cannot exceed outstanding goal/account reservation. Later transfer/expense can create shortfall without deleting progress; UI labels affected accounts/goals underfunded. Optional deadline crossing never moves money. Target reduction permits >100% exact progress. Archive releases funds atomically; archived-account releases remain possible; another workspace's account/goal is rejected. No fractional rupiah in percentage calculations used for money.

## M09 — Shared household end-to-end

**Depends on:** M08; O01/O03 resolved or explicitly accepted constrained launch. **Covers:** P03 completion, P12. **Targets:** shared onboarding/settings, shared variants of existing features, `tests/e2e/household.spec.ts`, `tests/db/shared-access.test.ts`.

- [ ] 1. Test two independent browser identities, explicit invitation acceptance and full shared workflows using existing domain operations.
- [ ] 2. Complete member display/payer attribution, shared account/budget/goals flows and approved departure controls; avoid duplicate financial implementations.

**Acceptance:** Cuthbert and Valen each retain private data inaccessible to the other, while both can enter/correct the same shared expense and see identical totals. Author may differ from payer. Expense is counted once; no implicit split/debt or personal mirror. Shared edits conflict safely. No private account choices, IDs, descriptions or balance leaks in shared APIs. Revocation prevents subsequent reads/writes and stale responses cannot restore revoked content. O01 unsupported flows absent and clearly explained; if funding/reimbursement was added, dedicated conservation, disclosure and duplicate-counting tests are mandatory before passing this gate.

## M10 — Pilot, security, recovery, and release readiness

**Depends on:** M09; O05 operational approval. **Covers:** P14 and all nonfunctional acceptance. **Targets:** CI/release settings, operational documentation/runbooks added only at implementation, full test suite and accessibility review.

- [ ] 1. Run full deterministic, database-authorization/concurrency and two-user browser suites; verify production-like RLS/grants/schema from a clean test database.
- [ ] 2. Test all critical tasks with both users, keyboard/screen reader, narrow/desktop layouts and realistic data. Resolve material defects.
- [ ] 3. Configure separate staging/production environments, secret/log controls, documented migration/rollback and tested backup restore; obtain real-data launch decision.

**Acceptance:** lint/types/unit/database/e2e/build pass with recorded output. Private access matrix includes RPCs/joins/aggregates/audit and cache/session transitions. No privileged browser secret or sensitive logging. No silent overwrite, partial transfer, duplicate retry or unexplained reconciliation difference. Both users complete journeys J01–J07 within the supported boundary. Accessibility/reflow/focus/chart-table checks recorded, performance targets measured with environment documented. Restore from backup into isolated environment preserves counts, totals and workspace permissions within approved RPO/RTO; rollback plan does not erase committed user data. Every high-priority open decision has disposition. No claim of production readiness from unit tests alone.

## Dependency and requirement coverage

Sequence: M01 -> M02 -> M03 -> M04 -> M05 -> M06 -> M07 -> M08 -> M09 -> M10. Shared permission tests start at M02, not only at M09. Every later entity extends the access matrix when introduced. No dates/effort promises until implementation capacity and provider choices are known.

| Requirements | Milestones |
|---|---|
| P01, P02 | M02; regression M09/M10 |
| P03, P12 | M02, M09 |
| P04 | M03 |
| P05, P07, P09 | M04 |
| P06 | M05 |
| P13 | M05, M06 |
| P08, P10 | M07 |
| P11 | M08 |
| P14 and nonfunctional requirements | M01–M10, final evidence M10 |

## Future milestones — separately authorized

F01: approved private-funded household/reimbursement and controlled-sharing model; prove disclosure and non-duplication first. F02: imports/recurring entries and export; preview, mapping and retry/deduplication acceptance. F03: credit/investment models; prove principal/earnings/consumption separation. F04: read-only AI over authorized deterministic reports; prove isolation, consent and injection boundaries. F05: installable PWA shell, then separate offline privacy/write-conflict design. None is part of current MVP implementation authorization.

Stop after planning. Review these documents before choosing an implementation milestone.

## Part 5.5 — local visual identity slice (2026-11-10)

Supplied twelve-asset audit/optimization, shared branding, file-convention icons,
metadata and reusable empty states delivered under the direct visual-only brief.
See [inventory, screenshots and local checks](VISUAL_IDENTITY.md). Existing
financial milestone acceptance boxes remain unchanged. Hosted release, broader
search/goals behavior and the next milestone are not included.
