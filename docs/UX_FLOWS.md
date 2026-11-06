# UX flows — Warm Ledger proposal

Date: 2026-11-05. Revision 2. Planning only; no UI built or approved. Sources: [PRODUCT.md](PRODUCT.md), [DOMAIN_RULES.md](DOMAIN_RULES.md), [DECISIONS.md](DECISIONS.md), [ROADMAP.md](ROADMAP.md). Visual evidence: [DESIGN_RESEARCH.md](DESIGN_RESEARCH.md); tokens/layout: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## Authority and scope

This replaces the earlier household-only, configurable-currency proposal. Required: Cuthbert and Valen authenticate separately, each has one private workspace, and they may explicitly join one shared workspace. All screens show authenticated identity, authorized workspace and relevant period. Switching workspace changes navigation, never identity or permission. No combined Personal + Shared view or automatic copying/mirroring.

IDR whole rupiah and Asia/Jakarta financial dates are fixed. Entry defaults to expense and today's Jakarta date. Accounts, income/expenses, same-workspace transfers, linked refunds, corrections, monthly budgets, savings goals and shared records follow PRODUCT P01–P14 and DOMAIN_RULES. Detailed financial proposals retain O04 approval requirements. The app records money; no bank connection, actual payment, AI, pending-entry review queue, forecast, multicurrency or offline write queue is added.

English labels are proposed under O08. Examples are deterministic fixtures, not real financial data. Private-funded household purchases and routine household funding remain O01-gated; a payer dropdown cannot resolve them. Membership lifecycle stays O03-gated. No real invitations are sent during research.

## Navigation and context

| Destination | Question | Primary action | Coverage |
|---|---|---|---|
| Sign in/recovery | Which authorized identity is using the app? | Sign in / recover | P01, J01 |
| Overview | What happened this month and what is closing cash? | Add transaction | P08, J04 |
| Transactions | Which recorded events explain the amounts? | Add transaction | P05–P07/P09/P13, J02/J03/J07 |
| Accounts | Which tracked accounts hold this workspace's cash? | Add account | P04, J01 |
| Budgets | How does this month's plan compare with net spending? | Edit budget | P10, J04 |
| Goals | How much is earmarked and is it underfunded? | Add goal | P11, J06 |
| Settings | Which workspace, categories and membership apply? | Context-dependent | P02/P03/P07/P12, J05 |

Desktop: named sidebar plus user/workspace switcher. Mobile: Overview, Transactions, Budgets, More; More contains Accounts, Goals and Settings. The current workspace text remains visible outside the menu. Workspace choices list only authorized Personal/Shared destinations. No display-name selector pretending to sign in as the other person.

Month/year navigation requires no month setup; empty calendar months remain selectable and activity indicators derive from transaction dates. Workspace-scoped routes and non-text filter identifiers may use validated URL parameters. Private search text stays in transient state and validated request bodies, never URLs/history/analytics/logs. Returning from details restores list position, filters and period only within the same authorized context.

On workspace change, confirm/discard any unsaved draft before leaving; do not carry it into another workspace. Clear old results before showing the destination context. Cancel stale requests. Logout, identity change or access loss immediately clears sensitive content and drafts rather than offering to keep them for another user.

## J01 — Sign in and establish private finances

Allowed identity -> sign in/verification -> idempotent personal workspace setup -> explicit Private visibility explanation -> Add account or skip -> truthful Overview. No public household signup or automatic membership from an entered email. Confirm provisioning/recovery/MFA/session details under O02 before implementation.

Account form: name, cash/bank/e-wallet/savings type, opening date and signed whole-rupiah opening balance. Zero opening is valid. Explain balance is at the start of that date, is manual and is not income. Reject future openings. Skipping shows No configured accounts, not a verified zero balance. Add transaction routes to Add account first if none exist.

Recovery: field validation preserves authorized-session input. Sign-in/recovery feedback must not expose private workspace details. Expired-session UI removes sensitive values. Safe return destinations only. Used opening values are not editable under the proposed domain rules; use explicit correction later. Account archive preserves balances and history but removes it from ordinary new-entry choices.

Acceptance: each person reaches only their own private setup/data. Display names do not establish identity. No shared access is required to use personal finances. Maps to M02/M03.

## J02 — Record everyday spending

Confirm visible workspace -> Add transaction -> Expense selected -> positive whole-rupiah amount -> active account -> Jakarta date -> expense category (explicit Uncategorized fallback) -> description and optional shared payer -> Save. Account context can visibly prefill account. Income is an explicit type change and requires an income category. No currency picker or automatic type inference from a minus sign. Creator is the authenticated actor; optional payer is descriptive, never an authentication or account-access control.

Viewing a historical report month does not change the new-entry default from today's Jakarta date. User deliberately changes the economic date when recording earlier spending; show the resulting date before save.

Amount helper: Enter whole rupiah, for example 10000 or 10.000. Reject fractional input (10,50), malformed grouping (10.00), negative/zero ordinary transaction amounts, exponent notation, unsafe limits and embedded text. Proposed per-amount cap is Rp1.000.000.000.000 under O04. No silent rounding. Reject date before account opening or after today in Jakarta. Server/database validation remains authoritative even if a form prevents entry.

Shared example: Valen enters one Rp300.000 groceries expense paid by Cuthbert from a tracked Shared cash account. Author Valen and payer Cuthbert differ; shared spending increases once. It creates no debt, private mirror or split. A private account never appears in Shared choices. If payment was private-funded, explain this workflow is unsupported pending O01; do not substitute a Shared balance or correction.

Save states: ready -> saving -> confirmed saved / failed / outcome uncertain. Prevent repeat submit. Use the same operation ID and same payload for uncertain-outcome retry; changing payload with that ID conflicts. Reauthorize retries. Never display optimistic financial success. Refresh list, account, reports, budget and goal-underfunding implications consistently after confirmation.

Failed writes preserve only the authorized current-session draft; no persistent offline storage is implied. Cancel/Escape with edits offers Keep editing or Discard draft. Access loss overrides draft preservation. Mobile uses a full-height form with numeric keypad hint, visible context and actions reachable above the keyboard.

Acceptance: one persisted expense, correct exact amount/date/account/workspace; no duplicate after timeout retry; stale edits cannot overwrite. Maps to M04/P14.

## J03 — Transfer between accounts

Transactions -> choose Transfer -> active source and distinct destination in current workspace -> positive amount and date -> preview source minus / destination plus -> Save atomically. No income/expense category. Explain This records a transfer; it does not send money. Separate fee, if any, is a separately entered expense.

Example: transfer Rp200.000 from cash to savings. Both balances change by equal/opposite amounts; workspace cash, income, spending and goal progress do not change. No private/shared or cross-currency choices. Same-account transfer is rejected. Failure saves neither leg; editing/voiding affects the whole transfer. Dates must satisfy both accounts' opening constraints.

Acceptance: both account effects and one event are confirmed together; no partially saved transfer. Maps to M05.

## J04 — Review a month and plan budgets

Overview -> choose month/year -> inspect Income, Net spending and Closing cash -> inspect adjacent Gross expenses and Refunds -> inspect category chart/table -> drill into matching transactions -> correct -> return to the same context. All panels use one workspace and period. Current-month closing cash shows today's Jakarta as-of date; past month uses month-end. A future month says Cash projection unavailable, with no recorded activity where appropriate.

Monthly income excludes openings, transfers, corrections and reservations. Net spending = gross expenses - linked refunds in that month; it may be negative. Closing cash includes accumulated history and opening balances, so it is not monthly income minus spending. Make formulas available through concise explanatory text. Chart totals and exact table rows reconcile; unsafe chart conversion falls back to exact table rather than rounded values.

Budgets -> chosen month -> category rows showing planned/spent/remaining -> Edit budget -> preview changed categories/month -> Save. Planned zero is explicit; absent plan says Not set. Include unbudgeted spending separately in totals. Remaining = planned - category net spending, not guaranteed spendable cash. Example: plan Rp500.000, gross expenses Rp600.000, refunds Rp50.000 -> spent Rp550.000, remaining −Rp50.000. Explain if refunds make remaining exceed plan; never clamp away the sign.

No rollover, automatic copy, monthly provisioning or automatic income allocation. Budget may be set for a future calendar month. Historical corrections recompute actuals without changing saved planned amounts. Concurrent shared budget updates require reconciliation. Plan exceeding known income may warn without blocking intentional planning. Unknown income is not zero.

Acceptance: category drilldown rows and filtered total agree; full-workspace summary stays distinguishable from filtered results. No extra person-comparison feature required. Maps to M07 and O04.

## J05 — Establish optional shared household

Personal Settings -> Create shared workspace -> review full shared-history visibility -> explicitly create -> invite other allowed identity -> pending invitation -> recipient signs in and accepts -> Shared becomes an authorized switcher choice. Use one constrained household for this pair; no third member or arbitrary public invitations.

Personal data is never moved, copied or disclosed by creation/joining. Shared membership reveals shared accounts, records, budgets, goals and audit history only. Show this consequence before acceptance. Invitation feedback must not reveal private profile/financial data. Recipient-bound expiry/single use/revocation and capacity rules are implementation acceptance requirements, not claims of existing security.

Add documented Shared opening balances and shared transactions only within the approved funding boundary. Keep O01 routine funding/private-funded spending unavailable until decided. Both members edit shared financial records; owner controls membership under the proposed model. No leave/remove/ownership-transfer controls until O03 retention and consent rules are resolved. Revocation removes future access and sensitive cached state; it must not erase the other person's private or retained shared history.

Acceptance: both identities see the same shared event once and retain independent inaccessible private data. Payer/author labels do not widen access. Maps to M02/M09; O01/O02/O03 remain gates.

## J06 — Reserve savings

Goals -> Add goal -> name, positive IDR target, optional date-only deadline -> Save -> Allocate -> eligible account in same workspace -> positive amount -> preview reservation and remaining unreserved amount -> Confirm. Label progress Current reserved amount; it does not follow the selected dashboard month. No money is moved by allocation.

At allocation time, amount cannot exceed current account balance minus existing reservations, floored at zero. Concurrent attempts require authoritative locking/validation. Release selects the existing goal/account reservation pool; amount cannot exceed outstanding reservation. Release creates no income. Moving funds to a savings account remains a separate J03 transfer, not another contribution.

Later expenses/transfers may underfund reservations. Keep exact goal progress; show linked goals Underfunded and each affected account's exact shortfall. Do not invent which goal lost funds or automatically reduce allocations. Unreserved cash may be negative. Progress bar caps at 100%, but exact amount/percentage may exceed target after target reduction. Deadline passing changes no money. Archiving explicitly releases outstanding reservations atomically; restoring never re-reserves silently.

Acceptance: reserve Rp100.000 leaves cash unchanged, increases reservations and reduces unreserved cash by Rp100.000; no expense/budget effect. Archived accounts cannot receive new reservations but can release old ones. Maps to M08.

## J07 — Find, correct, refund and void

Transactions -> search/filter date range/account/category/type/text -> select event -> inspect author/revision -> edit permitted fields -> Save -> return to preserved context. Stable date/ID ordering and pagination; exact filtered totals distinguish the full workspace view. No pending/review status or mandatory review queue.

Conflict: show latest authorized values plus the current draft; offer Reload latest or explicit reconciliation. Never silently overwrite. Same-workspace category rename updates labels; archive preserves historical data/budgets. Do not implement category merge/hierarchy/deletion in MVP.

Refund: open active original expense -> Add refund -> remaining refundable amount -> receiving active account in same workspace -> actual date not before expense -> positive amount -> review -> Save. Category derives from original; no independent category selector. All active refunds together cannot exceed original amount, including concurrent submissions. No standalone/prehistory refund workaround. Refund affects spending in refund month, not income or the original purchase month. Original recategorization updates linked refund classifications across months.

Correction: Account history -> Record balance correction -> explicit increase/decrease and positive magnitude -> date and required reason -> preview signed cash effect -> Save. It is neither income nor spending. Never use correction to emulate private household funding or investment flows. Only actual discrepancy handling belongs here.

Void: select event -> preview account/budget effects and reason -> confirm -> retain voided evidence while excluding active effects. Expense with active refunds requires voiding refunds first. Linked-expense type changes or transfer conversion use valid void/re-entry rather than rewriting relationships. Used accounts/categories are archived, not hard-deleted.

Acceptance: retained audit and all affected totals explain the correction; no partial transfer void, over-refund or silent overwrite. Maps to M04–M06.

## States, accessibility and privacy contract

| State | Presentation | Recovery |
|---|---|---|
| No accounts | No configured accounts; explain manual tracking | Add account or leave setup |
| Empty month | No recorded activity for selected month | Add transaction; navigate month |
| Known zero / unset | Numeric zero / Not set, respectively | Preserve distinction in budget forms |
| No matches | Active filters and zero results | Clear filters |
| Initial loading | Stable placeholders; loading label | Never fabricate balance |
| Refresh/stale | Last-known authorized values and timestamp | Retry affected request; no mixed-period totals |
| Offline | Save unavailable; current-session draft only | Retry after reconnect and reauthorization |
| Failed/uncertain save | Outcome stated; draft retained only while authorized | Retry same operation safely |
| Conflict | Newer values and local draft | Reload or reconcile explicitly |
| Denied/session ended | Generic message, no inaccessible names or amounts | Sign in/return to accessible context; clear sensitive state |
| Workspace change | Destination label and loading state; no old records | Cancel obsolete requests and prevent stale rendering |
| Underfunded goal | Text warning, exact account shortfall, retained progress | Inspect funds and explicitly release/reallocate if appropriate |

Use semantic landmarks/headings/tables and associated labels/errors. Keyboard order follows reading order; dialog focus is contained, Escape/cancel protects drafts, closing restores focus. Announce save outcomes/filter result counts without unexpected focus jumps. All chart data has an exact accessible table; no color-only status, hover-only essential details or swipe-only actions. Product target: 44px controls and 320px reflow, with long IDR moved onto its own line rather than truncated. Password managers/paste and accessible recovery must work. These are future checks, not a compliance claim.

## Design-review acceptance scenarios

| Scenario | Expected result | Source |
|---|---|---|
| Cuthbert switches Personal to Shared while old request is pending | No private values appear under Shared; Valen's private workspace never offered | P02/P14, R01–R06 |
| Valen enters Cuthbert-paid Shared groceries Rp300.000 | One Shared expense, author/payer distinct, no private reference or implicit debt | P12, R34–R35 |
| Jakarta passes midnight while device is elsewhere | Default date/month follows Jakarta | R10–R11 |
| Invalid amount 10,50 or 10.00 | Field error, no rounding/save | R07–R09 |
| Shared deterministic fixture from DOMAIN_RULES | Cash Rp2.760.000; income Rp2.000.000; gross expense Rp300.000; refunds Rp50.000; net spending Rp250.000 | R19–R21 |
| Same fixture reserves Rp100.000 | Cash unchanged; unreserved cash Rp2.660.000 | R29–R33 |
| Refund-heavy category or oversized exact aggregate | Signed rows; exact table fallback if unsafe for chart | R08/R23–R25 |
| Lost save response / simultaneous edit | No duplicate; no silent overwrite; no false success | R39 |
| Session ends with a private draft | Sensitive state cleared, never exposed to next identity | R05 |
| Keyboard, screen reader, 200% text resizing, 320/390/768/1024/1440px layouts | Core tasks remain operable; exact IDR, context and focus remain readable | PRODUCT accessibility; M10 |

Document review does not execute these tests. No runtime scripts, database, authentication, UI or deployment exists from this phase. Open decisions O01–O08 stay as recorded. Stop after presenting proposed visual direction; do not start an implementation milestone.
