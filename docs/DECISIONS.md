# Decisions, assumptions, and unresolved issues

Date: 2026-11-05. Planning only. No proposal below implies user approval or implementation.

Implementation update — 2026-11-06: user explicitly authorized database/security tests and Google sign-in, excluding transaction UI integration and remote destructive changes. [DATABASE.md](DATABASE.md) records delivered behavior, setup and evidence. Google OAuth supersedes D17's password-only proposal for this slice. DOMAIN_RULES financial defaults are the implemented baseline; not a real-data launch approval. O01 remains excluded beyond shared opening funds/tracked spending; O02 operations stay gated; O03/O05 lifecycle APIs remain unavailable. Identity-bound invitation acceptance implements the requested verified-membership boundary without sending messages. No approval from Valen or release disposition is inferred.

Status vocabulary: **Required** = user brief; **Proposed** = engineering recommendation for review; **Open** = unresolved behavior with a release/implementation gate. Changing a required item needs an explicit user instruction. Record later decisions here with date, rationale, consequences, and links to changed requirements/tests.

## Requirements and recommended decisions

2026-11-07 authorization: audit and controlled local remediation, plus a runtime-guarded read-only workspace view. Technical decisions: separate Auth success from finance authorization/deployment state; retain server-only cookie Auth (no browser client needed for this slice); locally generate RPC types; discover workspaces via a narrow public RPC; read page data in one stable PostgreSQL snapshot; invalidate private views on window/session changes. See [INTEGRATION_AUDIT.md](../INTEGRATION_AUDIT.md) for tests and remote approval gates. No product financial rules or O01–O05 lifecycle/operational decisions changed.

| ID | Status | Decision | Rationale / consequence |
|---|---|---|---|
| D01 | Required | Separate authenticated identities and private workspaces; one optional shared workspace | Workspace switching is navigation; access comes from identity and membership |
| D02 | Required | IDR integer rupiah; financial timezone Asia/Jakarta | Deterministic accounting; independent of device/chat timezone |
| D03 | Required | Next.js App Router, TypeScript, Tailwind, shadcn/ui, Supabase Auth/PostgreSQL/RLS, Recharts, Vercel | No alternative platform or custom auth service in this plan |
| D04 | Required | Default expense; activity months derive from transaction dates | No manually provisioned month records; future calendar budget plans still allowed |
| D05 | Required | Transfers/reservations/investments do not automatically inflate consumption or earnings | Distinguish money movement, earmarking, and spending |
| D06 | Proposed | Server-rendered application plus database-enforced invariants, one constrained account-effects ledger | Smallest model that handles atomic transfer legs, history, and exact reporting without a full accounting product |
| D07 | Proposed | Cash-basis manual entry; recorded transactions only; no pending/future transactions in MVP | Avoid bank settlement, accrual, import, and forecast ambiguity |
| D08 | Proposed | PostgreSQL bigint; TypeScript bigint; integer strings across APIs; per-amount cap Rp1 trillion | Avoid floating point and aggregate overflow through JavaScript conversion; validate chart conversion separately |
| D09 | Proposed | Dashboard income, gross expense/refund/net expense, and closing cash are distinct | Cash includes openings/history/corrections; monthly net is not account balance |
| D10 | Proposed | Budgets use net spending in refund month; no rollover; unset distinct from zero | Easy to reconcile and explain; past actuals can change after corrections |
| D11 | Proposed | Goals are explicit reservations against accounts | No automatic expense or transfer; show underfunding after later withdrawals |
| D12 | Proposed | MVP tracks positive-asset cash/bank/e-wallet/savings accounts; negative balances permitted | No implicit credit interest, debt ledger, or securities valuation |
| D13 | Proposed | Shared members edit all shared finances; owner controls membership | Simple two-person collaboration; no private fields within shared records |
| D14 | Proposed | No aggregate Personal + Shared view or cross-workspace financial references in MVP | Protect privacy and prevent overlap/double counting |
| D15 | Proposed | Void events; archive used objects; append-only scoped audit and allocation events | Retain explainable corrections; audit is not administrator-proof |
| D16 | Proposed | Transactional operation IDs and optimistic versions | Safe retries and visible conflicts; no optimistic success for financial saves |
| D17 | Proposed | Invite-only email/password auth using Supabase; verified email and recovery | Small fixed audience; onboarding must bind to approved identities; confirm MFA policy under O02 |
| D18 | Proposed | Warm Ledger visual direction retained as reference | Existing design work is reusable, but privacy, navigation, currency and summary semantics now follow this plan |
| D19 | Required | AI later, server-side; future PWA compatibility | Neither is justification for an MVP chat UI, financial-data cache, or offline write queue |

## Architecture alternatives considered

These are engineering proposals; the user has not selected an implementation beyond the required stack.

| Approach | Benefit | Cost / fit |
|---|---|---|
| Typed events with account-effect postings and atomic domain operations — recommended | One transfer event, exact balance derivation, clear ownership constraints | Requires cross-row integrity checks and disciplined write operations |
| Separate income/expense records with linked transfer rows | Familiar initial CRUD | Transfer edits/refunds/concurrency become scattered; less useful simplification once atomic pairing is required |
| Full double-entry general ledger | Strong general accounting foundation | Adds counterpart accounts, accounting taxonomy and reconciliation UX beyond two-person manual cash tracking; revisit only for debts/accruals/business accounting |

Do not add microservices, generic permissions engines, event-sourcing infrastructure, or materialized balance caches to serve hypothetical scale. Derived reads and indexed PostgreSQL queries are the default. The audit log supports accountability, not event-sourced reconstruction as the primary persistence model.

## Open decisions and risks

### O01 — Private-funded household purchases and household funding

**Priority:** high. **Owner:** Cuthbert and Valen. **Gate:** before M03 schema approval and M09 shared-finance implementation.

Current proposed MVP covers household expenses paid from funds already represented in shared accounts. A private bank account cannot appear as a shared posting account. This is a deliberate limit, not a complete reimbursement model.

Recommended launch boundary: shared accounts start with a documented opening balance; routine external household capital funding is a separately typed non-income movement, if needed. Do not mislabel funding as salary or use arbitrary corrections without an approved rule. Decide whether top-ups are frequent enough to include this movement in MVP; if included, update the transaction type/model, reconciliation equation, acceptance fixtures, and roadmap before implementation.

For personally paid purchases, choose later between (a) sharing an explicit expense disclosure plus a household payable/reimbursement ledger, or (b) recording only agreed household contributions and spending through shared tracked funds. Option (a) supports real private-funded spending but adds liabilities, settlement and careful disclosure; it cannot be solved safely with a payer dropdown. Neither option authorizes exposing private balances, accounts, notes, or unrelated history.

Must answer: do both people expect reimbursement, unequal contributions, or equal splits; what exact purchase fields may be shared; which workspace owns consumption; how does any future combined report avoid duplication? Until disposition, disable private-funded household entry and cross-workspace transfer/sharing. Accepting the constrained launch requires both users understanding its limits.

### O02 — Identity provisioning and authentication assurance

**Priority:** high. **Owner:** both users and project operator. **Gate:** before M02 production-auth configuration.

Confirm the two allowed email identities, recovery ownership, MFA requirement, session lifetime, invite expiry, and rate-limiting controls. Proposed provider-supported email/password with verified addresses; no public self-service membership. A display name or guessed email is insufficient authorization. Consider provider-supported MFA before storing real financial data; enforcement and recovery must be tested if selected. No credentials or real account data belong in these documents.

### O03 — Shared ownership, departure, and dispute

**Priority:** high. **Owner:** both users. **Gate:** before M02 membership mutations and M09 acceptance.

Proposed: creator owns membership administration, both edit finances, revocation stops future shared reads, shared history retains both authors. Confirm who can remove whom, whether removal needs consent, who receives ownership if owner leaves, whether historical access survives departure, and whether each person can export shared history before losing access. No normal user operation may delete the partner's private data. Do not ship a leave/remove control until retention and ownership transitions are explicit and tested.

### O04 — Financial reporting choices requiring confirmation

**Priority:** high. **Owner:** both users. **Gate:** before M03 rules baseline/M07 reports.

Confirm cash-basis entry; Rp1 trillion per-amount cap; fractional-input rejection; negative balances; immutable used opening balances; linked refunds capped at original expense; refund-month rather than purchase-month budget credit; current earmarking rather than guaranteed bank backing; future transaction exclusion. Recommended defaults are specified in DOMAIN_RULES so implementation does not improvise. Any rejected proposal needs changed fixtures and acceptance criteria.

### O05 — Backup, deletion, retention, and restore

**Priority:** high. **Owner:** project operator with both users. **Gate:** before M10 real-data launch.

Choose actual Supabase/Vercel service settings, backup coverage, recovery process, audit/idempotency retention, and account deletion handling. Proposed operating targets: recovery point <=24 hours, recovery time <=24 hours; select and test a method that actually meets them. Confirm export before deletion and protection of shared history. No assumption that a default/free provider plan supplies the needed backup or retention. Keep data/backup access restricted; determine hosting region and privacy expectations before deployment.

### O06 — Investments, liabilities, and unsupported money flows

**Priority:** medium. **Owner:** both users. **Gate:** before enabling any investment/debt/reimbursement feature.

MVP excludes securities holdings, credit cards, loans, interest schedules, merchant credits and prehistory refunds. Determine whether either user needs these for daily usability; if essential, revisit scope before launch. Future investment purchases need a non-consumption asset movement model; withdrawals/proceeds need principal/return distinctions. Do not substitute ordinary expenses/income without explicit approved semantics.

### O07 — Sharing, AI, and PWA privacy

**Priority:** future-feature gate. **Owner:** both users and implementer.

Explicit sharing needs a disclosure preview, correction/revocation policy and overlap rules. AI needs provider/data-retention consent, prompt-injection boundaries, workspace-scoped retrieval, citations to deterministic totals and no autonomous writes. PWA needs a device/session/cache threat model before retaining private data offline. No future feature may silently weaken personal-workspace isolation.

### O08 — Product language and visual approval

**Priority:** medium. **Owner:** both users. **Gate:** before M04 interface copy and M10 usability approval.

Proposed English labels with Indonesian IDR formatting and Jakarta dates. Confirm preferred language, Warm Ledger direction, and whether goals require mandatory deadlines (currently optional). Test real names, long categories and large amounts at narrow widths. Existing research is directional evidence, not accessibility or usability certification.

## Planning-phase completion record

Requested five planning files created; prior three design files retained. No production settings, identities, provider limits, framework versions, runtime performance, RLS policies, or backups were verified. These require implementation/operational evidence at the corresponding gates. No product approval is inferred from this record.
