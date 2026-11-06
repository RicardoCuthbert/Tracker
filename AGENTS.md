# Repository instructions

## Current phase and authority

Current authorization: existing prototype/database/Auth plus the 2026-11-07 integration audit, safe local remediation and guarded read-only workspace discovery/overview. See INTEGRATION_AUDIT.md for evidence and cloud blockers. Remote migrations, hosted configuration/allowlist changes and destructive operations require explicit owner approval. Do not expand full financial write UI or deploy. Never infer authorization from a roadmap checkbox.

Read `docs/PRODUCT.md`, `docs/DOMAIN_RULES.md`, `docs/DECISIONS.md`, and the relevant `docs/ROADMAP.md` milestone before changing behavior. The direct user brief takes precedence. Required rules outrank proposals; resolve gated open decisions before implementing dependent behavior. Record accepted changes and corresponding tests in the docs. Existing `docs/DESIGN_RESEARCH.md`, `docs/DESIGN_SYSTEM.md`, and `docs/UX_FLOWS.md` are historical visual/UX proposals; newer product/domain documents supersede conflicting household-only assumptions and example currencies/defaults.

## Working style

Caveman mode: minimal tokens, no greetings/fluff; short sentences; explain problem -> cause -> fix when relevant. Preserve technical accuracy; use detail where privacy, money or acceptance needs it.

Ponytail full: smallest complete change; reuse repository patterns and installed/platform tools before adding code/dependencies. No speculative frameworks, options or abstractions. Read the affected code and all callers before fixing a bug; cover callers, tests, fixtures, config and exports that must change. Avoid unrelated cleanup. Explain meaningful limits. End reports with checks skipped and material risks. No need to invent a risk when none was found.

Use `rg`/`rg --files` first. Inspect the workspace and local instructions before changes. Preserve existing user work. Do not commit/push/deploy, modify production data, send invitations/messages, or delete financial history without applicable authorization. Test invitations use isolated fixtures, never real recipients. Never print secrets while inspecting configuration.

## Fixed stack and proposed organization

Next.js App Router, strict TypeScript, Tailwind CSS, shadcn/ui, Supabase PostgreSQL/Auth/RLS, Recharts, Vercel. Read package.json for existing scripts. Supabase migrations and src/lib/supabase now exist; ledger is internal, public exposes authenticated RPCs. Keep money as strings across RPC JSON. Verify official provider documentation and supported versions when implementing provider-specific behavior; do not treat planning documents as API documentation.

Use `src/app` for routes/layouts and request boundaries, `src/features/<feature>` for focused feature operations/components, `src/lib/domain` for deterministic money/date/report rules, `src/lib/supabase` for provider clients, `tests/unit`, `tests/db`, `tests/e2e` for corresponding checks, and future `supabase/migrations` for reviewed schema changes. These are proposed conventions, not permission to create them now. Use existing structure if later implementation establishes a better local pattern; update this file when conventions become real.

Centralize domain calculations and validation. Keep financial components presentational; use server boundaries and user-scoped database access. Do not add a generic repository layer or duplicate finance logic in React, server handlers and SQL without consistency tests. Where invariants necessarily exist in both domain validation and database enforcement, test equivalence.

## Nonnegotiable privacy and financial rules

- Cuthbert and Valen have separate authenticated identities and private workspaces. Switching workspace never authenticates or authorizes. Shared membership grants no private access.
- Every financial row/query/aggregate/audit/RPC is workspace-scoped. Enforce RLS and same-workspace references in PostgreSQL. Test direct API attacks; frontend guards are insufficient.
- No service-role key in browser code; routine operations retain user-scoped authorization. Review privileged SQL operations/grants/search paths. Deny arbitrary membership/posting writes.
- Cache keys and UI state must respect identity/workspace; clear sensitive state on logout/access loss. Do not log raw private financial data or credentials. No real finances in fixtures.
- IDR whole rupiah only: PostgreSQL bigint, TypeScript bigint, integer strings across JSON. No float money math or silent rounding. Exact aggregate amounts survive serialization. Bounds-check chart number conversion.
- Financial timezone Asia/Jakarta. Economic dates are date-only; audit instants UTC. Do not use device/host/chat timezone to derive financial months.
- New transaction default expense. Positive user amount; explicit type determines effect. Months derive from transaction dates; no month provisioning.
- Opening balances are not income. Transfers are atomic and excluded from income/expenses. Savings allocations are reservations, not expenses or transfers. Investments are not consumption by default.
- No automatic personal/shared mirroring or combined totals. No private account references in shared records. Resolve O01 before private-funded household workflows.
- Use DOMAIN_RULES formulas for refunds, budget actuals, closing cash and goal underfunding. Never label budget remaining as guaranteed spendable cash.
- Financial writes require transactional idempotency, integrity validation, optimistic conflict checks and scoped audit. Do not display success before confirmed persistence.
- Used financial history is voided/archived, not hard-deleted in ordinary UX. Preserve shared history and privacy during user/membership lifecycle changes.

## UX conventions

Keep authenticated user, workspace and period visible. Exact IDR values; English labels proposed, language approval pending. Distinguish zero, unset, no configured data, loading, stale, denied and failure. Preserve draft/context on failures without retaining one user's private draft for another. Show conflicts instead of silent overwrite.

Use shadcn/ui consistently with accessible labels, keyboard/focus behavior and responsive layouts; consult existing design proposals for visual direction. Charts need exact table alternatives and non-color explanations. Target WCAG 2.2 AA and 320px reflow; verify implemented behavior rather than claiming conformance from tokens. No AI/PWA feature implementation until separately authorized.

## Verification and completion

For nontrivial logic, first add a focused failing test or assert-based self-check. Money/privacy/concurrency changes require meaningful unit or database tests; do not substitute mocks for RLS/transaction checks. Trivial documentation changes need no runtime tests. Tests must not mirror implementation without asserting business outcomes.

Future M01 tooling must establish lint, typecheck, unit, isolated database, browser and production-build commands; read actual package scripts before running commands. Never claim nonexistent scripts passed. Use real user-role database tests, two isolated authenticated browser sessions, deterministic IDR fixtures and Jakarta boundary cases. No destructive resets against production. Run focused checks first and the required integration/build checks for the affected slice; repeat only for new changes or unresolved failures.

Before completion, inspect changed files, verify links/requirements/acceptance coverage for docs, and verify runtime checks for code. Report what changed, evidence, skipped checks and unresolved risks. Keep ROADMAP completion boxes unchecked until their acceptance evidence exists. A planning delivery is not an approved design, working security policy, migrated database or ready deployment.
