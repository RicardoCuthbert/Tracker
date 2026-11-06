# Product requirements

Status: planning proposal. Date: 2026-11-05. No implementation authorized.

Implementation update — 2026-11-06: user separately authorized database/security tests and Google sign-in. [DATABASE.md](DATABASE.md) records delivered behavior, constrained scope, setup and evidence. Financial screens remain sample data. No real-data release, remote database change or transaction UI integration is implied; operational/lifecycle gates remain.

## 1. Purpose and sources of truth

2026-11-07: user authorized systematic staging audit, safe local remediation and a minimal guarded read-only integration path. See [audit evidence and blockers](../INTEGRATION_AUDIT.md). No full write workflows, remote migration/configuration changes or real-data launch approval.

Build a private, web-first finance application for Cuthbert and Valen. Each person can understand their own finances, manage a household together, and enter everyday transactions without bookkeeping ambiguity. Correct amounts and access boundaries take priority over feature count.

This document defines product scope. [DOMAIN_RULES.md](DOMAIN_RULES.md) defines financial and authorization invariants; [ROADMAP.md](ROADMAP.md) defines delivery gates; [DECISIONS.md](DECISIONS.md) distinguishes requirements, recommendations, and unresolved decisions.

The supplied product brief is authoritative. Existing [DESIGN_RESEARCH.md](DESIGN_RESEARCH.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), and [UX_FLOWS.md](UX_FLOWS.md) remain design proposals. Their household-only setup, USD examples, unset transaction defaults, configurable currency, and earlier goals exclusions are superseded by this plan. Pending/review queues, imports, forecasts, and automated settlement mentioned there are not MVP requirements. Warm Ledger remains a proposed visual direction, not an approved implementation.

## 2. Users and success

| Persona | Need | Main risk | Successful outcome |
|---|---|---|---|
| Cuthbert, private workspace owner | Track accounts, spending, budget, and savings privately | Personal balances or notes appear in shared views | Private finances accessible only through Cuthbert's authenticated identity |
| Valen, private workspace owner | Same independent capabilities and privacy | Workspace switcher implies access without authorization | Separate identity, private workspace, and independently correct totals |
| Either person, household member | Coordinate shared spending and category budgets | Duplicate expenses, unclear payer, conflicting edits | One shared record per economic event, visible to both members |

These are roles, not assumptions about income, technical skill, household contribution, or who manages money. Both people have equal product capabilities.

Proposed launch success checks: both people complete sign-in, expense entry, category correction, month review, shared-budget editing, and goal allocation without assistance; each can explain the difference between cash, budget remaining, and goal reservations. Record task duration and confusing steps during pilot; do not claim usability from a design document alone. Numerical release gates: zero unexplained fixture differences, zero successful unauthorized access attempts in the defined security suite, and no duplicate writes in retry tests.

## 3. Goals, anti-goals, and constraints

Goals: reliable manual bookkeeping; explicit privacy; useful monthly review; quick responsive entry; transparent formulas; small maintainable codebase.

Anti-goals: a unified screen that leaks private data, account balances presented as bank-verified, investment purchases called consumption, transfers called earnings, budgets called guaranteed spending capacity, and AI-generated financial amounts.

Fixed stack: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase PostgreSQL/Auth/RLS, Recharts, Vercel. Use IDR integer rupiah and Asia/Jakarta financial dates everywhere. Provider/dependency versions and operational settings are selected and verified at implementation, not invented here.

No bank synchronization, payments, debt servicing, tax advice, multi-currency, securities valuation, or offline financial writes in MVP. The app records events; it does not move money.

## 4. MVP requirements

| ID | Requirement | Observable behavior |
|---|---|---|
| P01 | Authentication | Separate invite-only accounts; verified identity, sign-in, sign-out, recovery, expired-session handling; anonymous access denied |
| P02 | Private workspaces | Exactly one personal workspace per user; other user cannot read or mutate any records or aggregates |
| P03 | Shared workspace | At most one household workspace for this pair; explicit invitation acceptance; both members can manage shared finances |
| P04 | Accounts | Manual IDR cash, bank, e-wallet, and savings accounts; name, opening date/balance, history, archive action |
| P05 | Transactions | Create, view, edit, void income/expense; default expense; date, amount, account, category, description; clear save status |
| P06 | Transfers | Atomic movement between two accounts in the same workspace; balances change; income/expense do not |
| P07 | Categories | Workspace-specific income/expense categories; default Uncategorized expense category; rename/archive preserves history |
| P08 | Monthly dashboard | Month and year controls; income, gross expenses, refunds/net spending, closing cash, category breakdown, budget comparison |
| P09 | Search and filtering | Transaction date range, account, category, type, text; predictable ordering and pagination; supporting rows reconcile with totals |
| P10 | Monthly budgets | Explicit per-category amount for each calendar month; no automatic rollover; zero differs from unset |
| P11 | Savings goals | Name, target amount, optional deadline, reservations and releases, exact progress; allocations are not expenses |
| P12 | Household budgeting | Shared accounts, one shared expense record, shared categories/budgets/goals; creator and optional payer attribution distinct |
| P13 | Corrections | Refund linked to original expense; explicit balance correction; void rather than erase; revision/audit evidence |
| P14 | Reliability | Atomic writes, idempotent retries, conflict detection, access-aware caching, errors and exact arithmetic |

MVP household spending uses funds recorded in shared accounts. Merely labeling a private expense Household never exposes or copies it. Personally funded household expenses, reimbursements, and movements between private/shared accounts require the policy decision O01 before that workflow is offered. See the limited funding proposal in [DECISIONS.md](DECISIONS.md). A payer label alone never changes balances or creates a debt.

### Required interactions

Entry defaults to expense and today's Jakarta date. Prefilled account/category/workspace remain visible. Input labels show IDR; whole rupiah only. Show explicit validation for fractional, malformed, negative, zero, unsafe-size, missing-account, and invalid-date inputs. Type controls direction; users enter a positive amount.

Save success means persisted successfully. Disable repeat submission while in flight; retry the same operation identifier after uncertain outcomes. Preserve the draft on failure, but never expose it to another signed-in user. Concurrent edits require comparison/reload rather than silent overwrite. Voiding names the record and its balance/budget consequences; linked refunds must be resolved first.

No synthetic months or monthly setup wizard. Month selection is calendar navigation; empty months remain selectable. Account/transaction data determines which months have activity. Changing the selected month changes all monthly panels together, without changing the workspace.

### Nonfunctional requirements

- Security: enforce authorization in PostgreSQL RLS and server boundaries for every object and aggregate. No privileged key in browser bundles. Signed-in UI state is not access control.
- Correctness: one deterministic domain definition used by writes, reports, budgets, goals, and tests. Database integrity must survive direct API requests.
- Accessibility: target WCAG 2.2 AA; keyboard operation, focus restoration, associated errors, text alternatives for charts, non-color status, readable exact amounts and 320 CSS px reflow. Verify actual implementation later.
- UX: visible user/workspace/month; minimal daily entry; distinct empty, zero, loading, stale, denied, conflict, and error states. Responsive desktop and mobile browser support.
- Performance: proposed pilot dataset 10,000 transactions per workspace; list pagination; representative p95 monthly read under 2 seconds and confirmed save under 2 seconds in a documented warm test environment. Measure separately from network/provider cold starts; these are targets, not verified provider guarantees.
- Operations: staging isolated from production; secrets outside source control; migration/recovery discipline, backup coverage and a restore exercise before real use. Logs exclude financial notes, credentials, and raw private records.
- Maintainability: strict TypeScript, generated database types, focused domain functions, no redundant client balance cache or configurable multi-tenant framework.

## 5. Primary journeys

### J01 — Sign in and establish private finances

Provision an allowed identity -> verify/sign in -> create personal workspace idempotently -> explain private visibility -> add account with opening date/balance or skip -> see truthful empty dashboard. Cuthbert and Valen repeat independently. Names are display labels; identity is the authenticated immutable user ID.

### J02 — Record everyday spending

Confirm private/shared context -> Add transaction -> expense default -> positive whole-rupiah amount -> account/date/category -> optional description/payer -> Save -> see confirmed row and consistent account/dashboard/budget totals. A failure retains the draft; an uncertain save retries safely.

### J03 — Move money between own accounts

Choose transfer -> source/destination in current workspace -> date/amount -> review both effects -> Save atomically. Moving Rp200,000 from cash to savings changes their balances by minus/plus Rp200,000 and changes neither earnings nor spending.

### J04 — Review and plan a month

Choose month/year -> inspect period income and net spending plus closing cash -> inspect category chart/table -> drill into matching transactions -> correct a category -> return to same context. Open Budgets -> set explicit category plans -> see remaining amounts. No plan differs from a zero plan.

### J05 — Establish shared household

One person creates the shared workspace -> sees exact shared visibility explanation -> invites the other allowed identity -> other person signs in and explicitly accepts -> both see shared data. Personal data stays separate. Add shared tracked funds/accounts, record one household expense, and update shared budget. Rejoining, removal, and private-funded purchases follow decisions O01/O03, not improvised UI behavior.

### J06 — Reserve savings

Create goal -> target and optional deadline -> allocate funds from an eligible account -> see goal progress and remaining unreserved cash. Reservation does not move account money. Actual movement to a savings account is a separate transfer. Release a reservation without creating income. Later spending may make reservations underfunded; explain this without inventing a withdrawal.

### J07 — Correct an error or obtain a refund

Open transaction -> view author and revision -> edit permitted fields -> compare on conflict -> save. For returned purchase, add positive refund against original expense using actual refund date and receiving account. For non-income balance discrepancy, use a separately labeled correction with reason. Void mistaken entry after previewing consequences; preserve evidence.

## 6. Information architecture

Authenticated routes are scoped by workspace identifier, checked on every request. Route names below are proposed file targets, not files to create now.

| Destination | Proposed route | Content |
|---|---|---|
| Sign in/recovery | `/sign-in`, `/auth/callback`, `/recover` | Authentication; safe validated return destinations |
| Setup | `/onboarding` | Private workspace/account setup and invitation acceptance |
| Overview | `/w/[workspaceId]` | Month/year, required summaries, budget attention, category chart/table, recent activity |
| Transactions | `/w/[workspaceId]/transactions` | Entry, filters, details, corrections/refunds |
| Accounts | `/w/[workspaceId]/accounts` | Opening balances, derived balances, account history/archive |
| Budgets | `/w/[workspaceId]/budgets` | Selected month's category plans and actual spending |
| Goals | `/w/[workspaceId]/goals` | Targets, reservations/releases, deadlines, underfunding |
| Settings | `/w/[workspaceId]/settings` | Workspace identity/membership, categories, account/session settings |

Workspace switcher lists only authorized workspaces, visibly labeled Personal or Shared. No combined Personal + Shared total in MVP. Selected period and non-text filter identifiers use validated URL parameters; private search text stays in transient page state and a validated request body, never a URL, browser-history entry, analytics event, or log. Filters never widen permissions. Settings can show membership only inside the authorized workspace. Signed-out users get no private titles or cached page content.

Mobile: Overview, Transactions, Budgets, More; More exposes Accounts, Goals, Settings. Desktop: named sidebar destinations. Chart rows drill into the exact supporting period/category. Shared attribution filters are optional later; no person comparisons required for launch.

## 7. Future features

Phase 2 candidates: individually funded household purchases and reimbursement tracking after O01; controlled private-to-shared expense disclosure; explicit cross-workspace transfer pairing; recurring-entry suggestions; import preview/deduplication; budget copy/rollover; data export; credit/debt accounts; investment contributions and valuation. None may alter original transactions silently.

Phase 3: server-side AI assistant, initially read-only and workspace-scoped. No browser LLM secret, unrestricted service-role query, automatic transaction mutation, or unconsented transmission of financial records. Deterministic application functions calculate totals; AI explains referenced results and acknowledges missing data.

Future PWA: manifest/installability and offline shell first; cache isolation/logout clearing and privacy review before caching private data. Offline financial writes require a separately designed conflict/idempotency protocol. PWA compatibility now means responsive web patterns and no assumption of continuous connectivity, not an offline guarantee.

## 8. Release boundary

Release only when ROADMAP milestones M01–M10 pass and material decisions O01–O05 have a recorded disposition. Unresolved private-funded payments may be explicitly excluded with both users accepting that limitation; do not present that workflow as supported. This planning phase ends with documents, no UI, dependency installation, application scaffolding, migrations, or deployment.
