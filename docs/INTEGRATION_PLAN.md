# Controlled integration — 2026-11-07

Authorized scope: audit, safe local fixes, typed read-only integration and evidence. No remote migrations/configuration, real financial mutations or full write UI.

Evidence before changes: local unit 12/12; local PostgreSQL WASM 15 pass/1 concurrency skip. Staging Auth settings 200/Google enabled; authorize 302 to Google with correct project callback; ledger profile rejected PGRST106. All 13 financial RPC signatures return PGRST202. SQL catalog/migration state and authenticated cloud behavior remain BLOCKED without owner SQL results/login.

1. Add reproducible sanitized staging probes and catalog-only SQL instructions. Never log keys, session data or raw finance/error payloads.
2. Reproduce local gaps: missing workspace discovery; untyped clients; callback conflates Auth success with financial authorization/database availability; proxy has no coverage for real workspace routes; no typed read boundary or error states.
3. Fix through additive migration 003 (read-only discovery/consistent snapshot, no financial-rule changes), locally generated RPC definitions, safe error classification, cookie-bound server reads and a guarded read-only workspace view. Existing sample UI stays separate. A financial view renders only after verified Auth and successful authorized read RPCs at request time. Cloud activation stays gated by missing RPCs and manual authorization checks.
4. Test parsing/exact money/authorization failure/argument mapping, local SQL discovery and security, native concurrency, configured/unconfigured HTTP/browser behavior, lint/types/build. Label mock versus native versus staging evidence.
5. Write INTEGRATION_AUDIT.md with PASS/FAIL/BLOCKED/NOT TESTED matrix and exact owner actions. Keep milestone boxes unchecked. Review final changes before stopping.

Affected paths: src/lib/supabase, src/app/auth, src/proxy.ts, src/app/(live), src/features/workspaces, migrations/003, tests/unit, tests/db, scripts, package scripts and documentation. No secrets file changes or remote writes.
