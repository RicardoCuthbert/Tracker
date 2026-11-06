# Domain, data, and financial rules

Status: proposed implementable model, not a migration. Date: 2026-11-05.

Implementation update — 2026-11-06: the explicitly requested database slice implements this baseline in [migrations](../supabase/migrations/) with [schema/API documentation and tests](DATABASE.md). Logical budgets/goals/goal_allocation_events below map to ledger.monthly_budgets/savings_goals/goal_contributions. Invites bind verified Auth UUIDs with explicit single-use acceptance, replacing the emailed bearer-token proposal. Private-funded shared flows and membership/deletion lifecycle remain gated. No financial UI integration or real-data release approval.
Requirement IDs refer to [PRODUCT.md](PRODUCT.md). Decisions/open questions: [DECISIONS.md](DECISIONS.md).

## 1. Trust and ownership

2026-11-07: [integration audit](../INTEGRATION_AUDIT.md) adds typed read boundaries and a consistent-snapshot overview RPC in proposed migration 003. Financial rules below are unchanged. Missing/unavailable hosted RPC signatures and real-identity acceptance remain blocked.

R01. Authenticated user ID, not name/email supplied by a request, identifies the actor. Cuthbert and Valen each own exactly one personal workspace. Personal ownership is immutable in normal application operations. Each may belong to at most the one shared workspace for this pair.

R02. A personal workspace has exactly its owner as member. Only that identity can read/write its records, children, totals, audit entries, and search results. Shared membership requires explicit valid invitation acceptance. Shared members can read and change shared financial data equally; only the workspace owner manages invitations/membership. Neither shared membership nor a payer/creator field grants access to a personal workspace.

R03. Every financial row has `workspace_id`. Every reference to an account, category, transaction, goal, or actor membership must belong to that same workspace where appropriate. Use composite foreign keys or equivalent database constraints; application checks alone are insufficient. Author identity does not change workspace ownership.

R04. Enforce membership-based RLS for SELECT, INSERT, UPDATE, DELETE with both existing-row and new-row checks. Membership, workspace type/owner changes, invitation acceptance, refunds, transfers, allocations, and voids use narrowly granted atomic database operations. Do not grant ordinary authenticated users arbitrary direct mutation that bypasses domain invariants. RPC authorization must check the current authenticated identity explicitly; privileged functions need fixed search paths, minimal execution grants, and review for RLS bypass.

R05. Expired/revoked membership immediately prevents subsequent database access. Clear sensitive client state on sign-out, identity change, or access loss; cancel in-flight results tied to the old context. Server caches must be identity/workspace scoped or disabled for private results. A stale client may not render old workspace data after switching. A request to an inaccessible ID returns a generic denial/not-found without revealing names, balances, or existence.

R06. Never store financial values or descriptions in public URLs, analytics, or general error logs. No service-role secret in a client. The application runtime uses user-scoped access for routine operations. Operator credentials are exceptional maintenance tools, not the permission model. Direct API, aggregate, RPC, nested relation, audit, and alternate-ID access need adversarial tests.

## 2. Money and dates

R07. IDR only. Persist rupiah as PostgreSQL `bigint`; never floating point. Individual amounts are positive whole rupiah, at most 1,000,000,000,000 (proposed product limit). Opening balances/corrections can be signed within the same absolute limit; zero opening is valid. Budgets/targets/reservations have their own nonnegative/positive constraints below. Aggregate sums stay exact; PostgreSQL `sum(bigint)` results must not be coerced to floating point.

R08. Use `bigint` for TypeScript calculation; decimal integer strings across JSON boundaries. A single validated parser/formatter owns conversion. Never use `parseFloat`, fractional rounding, or JavaScript `number` for financial arithmetic. Convert chart values to `number` only after explicit safe-integer bounds checks; use an exact table fallback outside that bound. Full exact strings remain available for labels/tooltips. Progress ratios are display values only, never accounting inputs.

R09. Proposed input grammar: ungrouped digits or correctly grouped Indonesian thousands dots, optional surrounding whitespace. Thus `10000` and `10.000` mean Rp10,000; `10,50`, `10.00`, negative strings, exponent notation, NaN, Infinity, and embedded text are rejected. No implicit currency-symbol stripping. The form labels the accepted format. Server repeats validation. Format display as IDR with zero decimals and locale `id-ID`.

R10. Economic date is a PostgreSQL `date` (`YYYY-MM-DD`), interpreted in Asia/Jakarta. Creation/edit timestamps are UTC instants (`timestamptz`); render using Jakarta where shown. Device timezone and deployment region do not set financial months. Dates have no artificial midnight UTC conversion. Default transaction date is today's Jakarta date. MVP rejects future transaction/opening dates; budget months and goal deadlines can be future.

R11. Monthly range is inclusive first date and exclusive first date of following month. No month entity. Budgets use the first date of their month as a key, not an activity month record. Empty calendar months are valid selections; activity markers derive from dates. At 2026-11-01 00:30 Jakarta (2026-10-31 17:30 UTC), default month is November.

## 3. Accounts, balances, and transaction effects

R12. MVP account types: cash, bank, e-wallet, savings; all are tracked IDR assets and included in workspace cash. Investment holdings and credit/liability accounts are not supported. Investment purchases cannot be entered as consumption to work around this limit; future investment movements must have separate non-consumption treatment.

R13. Each account has signed opening balance and opening date. Opening balance is balance at the start of that date, before entries on that date; it is neither income nor expense. Entries before the account's opening date are rejected. Proposed: opening fields immutable once the account has any transaction history (including voids); later discrepancies use a dated correction with reason. Editing an unused account's opening values requires optimistic concurrency and audit.

R14. Current balance includes active postings through today. Balance at date D = opening balance if opening date <= D, plus all active signed account postings with economic date <= D. Accounts opening later contribute zero at D. Archived accounts remain in historical and current totals; archive changes entry availability, not ownership of money. Negative balances are allowed with a warning and reservation-underfunding indication; never invent overdraft interest.

| Kind | Account postings | Category | Income/consumption effect |
|---|---|---|---|
| Income | One positive amount | Required income category | Income increases |
| Expense | One negative amount | Required expense category | Gross spending increases |
| Refund | One positive amount | Derived from linked expense | Reduces spending on refund date; not income |
| Internal transfer | Source negative, destination equal positive | None | Neither income nor spending |
| Balance correction | One nonzero signed amount | None; reason required | Neither income nor spending |

R15. `transactions` stores one business event; `account_postings` stores its account effects. This is a constrained account-effects ledger, not full double-entry accounting. Ordinary income/expense/refund has exactly one posting; internal transfer exactly two distinct accounts, equal magnitude/opposite sign, net zero. Corrections exactly one. Validate cardinality, signs, total, types, and same-workspace ownership in the atomic write operation and database integrity layer. Do not let clients write individual postings.

R16. Transfer has one event ID and one positive amount, not independent editable income/expense rows. Creation, editing both legs, voiding both legs, audit, and operation completion commit together or roll back together. Fees are separately recorded expenses; no hidden fee calculation. No cross-workspace or cross-currency transfers in MVP. Transfers between cash and savings change no workspace cash total and no goal reservation automatically.

R17. A correction is an explicit non-income/non-spending event with signed amount and explanation, never a silent overwrite of calculated balance. Show separately in account history and cash reconciliation. Corrections are for actual discrepancies; they are not a general workaround for an unsupported transaction type. Confirm a separate proposed household opening/funding policy under O01 before using them for household capital contributions.

R18. Expense is the default only for new ordinary transaction entry. Type changes are explicit and validated, not guessed from minus signs. Expense/category/account/date changes update all dependent views together. Archived accounts/categories are unavailable for new entries; history and void/refund recovery remain supported through explicit correction flows. Transfer conversion or linked-expense type changes require void/re-entry rather than silently rewriting relationships.

## 4. Reports, categories, and budgets

R19. For selected workspace W and month M, use active transactions dated in M: income I = sum(income amounts); gross expenses E = sum(expense amounts); refunds R = sum(refund amounts); net spending S = E - R; operating net = I - S. S may be negative. Display gross expenses/refunds alongside net spending so a refund-heavy month is understandable. Exclude transfers, openings, corrections, and reservations from I/E/R.

R20. Dashboard cash is closing cash as of selected month's final date (today for current month). It includes accumulated history and opening balances, not just selected-month activity. For a future month show cash projection unavailable rather than implying unknown future entries are known; income/spending can show no recorded activity. Explicitly label the as-of date. There is no combined-personal/shared balance in MVP.

R21. Reconciliation: closing cash = starting cash + I - E + R + signed corrections + opening balances introduced during period. Internal transfers net to zero across workspace. Starting cash is balance at the end of the preceding day. Reservations affect none of these terms. A workspace with no configured accounts has no configured cash, not a bank-verified zero.

R22. Categories are workspace-local and typed income or expense. Every expense has a category, falling back to the workspace's nonarchivable Uncategorized expense category; income requires an income category. Category rename updates its label everywhere, not amounts. Archive preserves transactions and budgets and does not exclude them from calculations. Category deletion/reparenting/merging is out of MVP; no hierarchy required.

R23. Each category breakdown value is expense minus eligible refunds in that month/category. Negative categories remain signed bars/rows, not invalid pie slices. Chart and table totals equal S. Category/account filters apply to the supporting list and its filtered total; the dashboard clearly distinguishes a filtered view from the full workspace summary.

R24. One budget per workspace, expense category, calendar month. Budget >= 0; unset is absent and differs from zero. Spent = category net spending; remaining = budget - spent; overspend = max(spent - budget, 0). Example: budget Rp500,000, expenses Rp600,000, refunds Rp50,000 -> spent Rp550,000; remaining -Rp50,000. Negative spending can make remaining exceed the plan; explain refunds rather than clamp the amount.

R25. Budget total sums explicitly planned categories only. Report unbudgeted spending separately; it still belongs in total spending. A budget-remaining summary must state its coverage and cannot imply unbudgeted categories cost nothing. No rollover, automatic budget copying, automatic income allocation, or restriction on intentional overspending. Editing a past transaction recomputes historical actuals; never changes the saved planned amount.

## 5. Refunds and corrections

R26. Refund must link to an active expense in the same workspace and use an active receiving account in that workspace; receiving account may differ from original account. Positive refund amount; cumulative active refunds <= original expense amount. Use actual refund date, no earlier than the expense date. Multiple partial refunds allowed. Lock original expense/refund state while validating to prevent simultaneous over-refund.

R27. Refund category follows the original expense's current category; derive it through the reference rather than independently editable duplicated data. Original recategorization therefore recategorizes linked refunds even across months. An expense amount/date/workspace/type change must preserve refund limits/date order; otherwise reject. Workspace moves are never supported. Void active refunds before voiding the original expense. Refund edits/voids also acquire the relevant lock and update totals atomically.

R28. Imported prehistory refunds, standalone refunds, merchant credit, reimbursements and chargebacks are unresolved future behaviors, not ordinary income by default. The MVP form explains the need for an original tracked expense. Do not fabricate an expense to fit the schema.

## 6. Goals and reservations

R29. A goal belongs to one workspace; name, positive integer target, optional date-only deadline. Progress = net active allocations / target. Display the exact amount and percentage; bar capped visually at 100% but amount/percentage can exceed target. Reaching target is derived; a deadline passing does not move money or create a transaction. Goal progress is current, not selected-dashboard-month progress.

R30. Goal allocation is a reservation against an eligible account in the same workspace, not a posting. Each allocation event has positive amount and direction reserve/release. Releases identify the goal/account reservation pool and cannot exceed its outstanding reservation. Events preserve audit history; corrections add a counter-event rather than erase history. Never count transfer-to-savings and allocation as two contributions.

R31. At reservation time, amount <= max(current account balance - all outstanding reservations on that account, 0). Lock account/reservation state consistently with financial writes so simultaneous allocations cannot reserve the same rupiah twice. Do not allow reserve operations on archived accounts. Releasing existing reservations remains possible after archive. Changing allocation account is release then reserve, atomically if offered.

R32. Later expenses/transfers may leave reservations larger than balance. Do not block ordinary money recording or silently alter goal progress. Show each affected account's shortfall = max(reservations - max(balance, 0), 0), and label linked goals underfunded without inventing which goal lost money. Unreserved cash is cash minus reservations and may be negative. No automatic priority assignment or proportional deduction. Progress means earmarked, not bank-locked.

R33. Goal deadline/name/target edits preserve allocations. Target reduction can make progress exceed 100%. Archiving requires explicit release of outstanding reservations in an atomic action; restoring does not re-reserve funds. Allocations do not count toward budgets or monthly expense summaries.

## 7. Shared finance and lifecycle

R34. An event belongs to exactly one workspace. One shared account expense is counted once in shared reports, regardless of author or payer. No mirrored personal expense and no automatic personal/shared roll-up. A private account cannot be referenced from a shared posting. Shared records must not include private account identifiers or private transaction notes by default.

R35. `created_by` identifies who entered the event; optional `paid_by` identifies a household member who paid. Neither specifies account ownership or split percentage. No implicit 50/50 debt, settlement, or reimbursement. Shared cash account payer attribution is descriptive only. If the purchase used private money, require the future approved O01 workflow instead of treating a shared tracked account as the private bank account.

R36. Shared membership reveals all shared history, budgets, accounts, goals, and shared audit evidence; no per-field secrets inside a shared workspace. Invitations disclose that consequence. Explicit expense sharing is future work with preview of every disclosed field; never implement it by moving/copying a private transaction blindly.

R37. Proposed membership removal: revoke future shared access, retain shared records and authorship, never delete the departing person's personal workspace. Invitation acceptance cannot create a third membership. Ownership transfer, departure consent, retained shared-history access, and account deletion require O03/O05 disposition before implementation. User deletion must not cascade-delete another person's shared financial records.

R38. No hard delete for used accounts/categories/financial events in ordinary UX. Void financial events with timestamp/actor/reason; hide from active aggregates while retaining audit evidence. Archive hides objects from new entry only. Audit contains before/after values, actor, event type, version, and timestamp within the same workspace permission boundary. Audit is append-only to normal users; not a claim of cryptographic immutability against administrators.

R39. Every financial write uses a client operation UUID scoped to user/workspace plus a payload fingerprint. Same key/same input returns previous result; same key/different input conflicts. Reauthorize before returning a retry result. Persist operation/result and financial mutation in one transaction. Unique constraints arbitrate simultaneous retries; failed rolled-back operations may be retried. Revisions reject updates based on an obsolete version, including budgets/goals/accounts and transaction edits.

## 8. Proposed logical schema

UUID primary keys unless a composite key is stated. Store creation/update instants where applicable; mutable aggregates have integer `version`. Financial children inherit parent permissions, never public defaults. These names are planning interfaces, not generated code.

| Entity | Essential fields and relationships | Integrity/lifecycle |
|---|---|---|
| `profiles` | `user_id -> auth.users`, display name | No public directory; avoid global partner-profile read; share only member display names through authorized membership reads |
| `workspaces` | `id`, kind personal/shared, `owner_user_id`, name, IDR, Asia/Jakarta | One personal workspace per owner; one configured shared household; owner change restricted |
| `workspace_members` | `(workspace_id, user_id)`, role owner/member, joined/revoked timestamps | Personal owner only; shared max two allowed identities; membership writes restricted |
| `workspace_invites` | workspace, intended verified identity/email, hashed single-use token, inviter, expiry, accepted/revoked timestamps | Owner-created; recipient-bound acceptance; no plaintext token persistence/logging; atomic capacity check |
| `accounts` | workspace, name, kind, opening date, signed opening balance, archived timestamp, version | Workspace-qualified unique ID for child references; no stored mutable running balance |
| `categories` | workspace, name, income/expense kind, system marker, archived timestamp | One Uncategorized expense category; immutable kind once used |
| `transactions` | workspace, kind, positive amount except signed correction, economic date, category where required, original expense for refund, description, optional payer membership, creator, version, void metadata | Type-specific fields; referenced event same workspace; no workspace reassignment |
| `account_postings` | workspace, transaction, account, signed amount | Workspace-qualified FKs to both parents; unique transaction/account; event-level cardinality/sign constraints |
| `budgets` | workspace, category, month-start date, nonnegative planned amount, version | Unique workspace/category/month; expense category only; no month table |
| `goals` | workspace, name, positive target, optional deadline, archived timestamp, version | Current progress derived from allocation events |
| `goal_allocation_events` | workspace, goal, account, reserve/release direction, positive amount, actor, timestamp | Same-workspace references; serialized reserve/release validation; append-only normal flow |
| `mutation_operations` | workspace, actor, operation UUID, fingerprint, result reference | Unique workspace/actor/operation; transactional idempotency; RLS and bounded retention policy |
| `audit_events` | workspace, entity/type/ID, actor, before/after, timestamp, operation UUID | Append-only; financial mutation and audit commit together; scoped read |

Use constraints for local checks and unique keys, composite foreign keys for ownership, and reviewed transactional operations/deferred validation for invariants involving multiple rows. RLS does not replace financial integrity. Actor references retained after membership revocation must not require an active membership FK; authorization checks active state separately.

Recommended indexes: transactions `(workspace_id, economic_date, id)` for keyset pagination/report ranges; postings `(workspace_id, account_id, transaction_id)`; transactions `(workspace_id, original_expense_id)` for refunds; active membership lookups; budget unique key; allocations `(workspace_id, account_id, goal_id)`. Audit index by workspace/entity/time. Validate query plans with representative data before adding summary tables, materialized totals, partitioning, or fuzzy-search services.

## 9. Architecture and test seams

Next.js server boundaries validate requests and session, then call user-scoped database access. Domain modules own exact parsing, date periods, amount effects, and report semantics. Database constraints/RLS/atomic operations enforce invariants even when bypassing the frontend. Recharts consumes checked presentation values and exact labeled data. Keep browser forms focused on entry/presentation, not authoritative calculation or permissions.

Proposed modules: `src/lib/domain/money.ts`, `dates.ts`, `reports.ts`; feature operations under `src/features/{accounts,transactions,budgets,goals,workspaces}`; Supabase adapters under `src/lib/supabase`. UI routes follow PRODUCT IA. Choose exact signatures during each milestone; no generic ledger engine or repository framework required.

Minimum shared deterministic fixture: opening cash Rp1,000,000; income Rp2,000,000; groceries Rp300,000; internal transfer Rp200,000 cash-to-savings; groceries refund Rp50,000; positive correction Rp10,000; goal reserve Rp100,000 from savings. Expected workspace cash Rp2,760,000; income Rp2,000,000; gross expenses Rp300,000; refunds Rp50,000; net spending Rp250,000; operating net Rp1,750,000; reservations Rp100,000; unreserved cash Rp2,660,000. Cash account Rp2,560,000; savings Rp200,000. Transfer and reservation do not change income/spending.

Further mandatory cases: month/year and Jakarta midnight boundaries; same-workspace alternate-ID attacks; unauthorized aggregates/audit; integer limits and huge aggregate serialization; previous-month expense/current-month refund; simultaneous over-refund; zero/unset budgets; stale edits; duplicate retry after timeout; changed-payload retry; transfer rollback; reservations racing an expense; underfunding after transfer; archived history; void/refund dependencies; membership revoked during request; cached content after identity/workspace changes. These are future tests, not executed checks.
