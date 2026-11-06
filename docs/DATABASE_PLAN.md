# Database implementation scope — 2026-11-06

User authorized database implementation and Google sign-in; transaction UI integration remains excluded.

Use the existing DOMAIN_RULES account-effects ledger. Separate income/expense rows for transfer legs would duplicate reports; full double-entry adds unsupported scope.

1. Add isolated PostgreSQL role tests first. Cover private/shared access, all CRUD verbs, hostile references, exact amounts, transfers, refunds, reservations, retries and conflicts.
2. Add versioned schema and operation migrations: composite workspace FKs, RLS, narrow authenticated RPCs, append-only audit, serialized workspace writes. No remote changes.
3. Add publishable-key Supabase SSR clients, session refresh, Google PKCE callback and sign-in button. Existing financial screens remain sample data.
4. Document schema, operator setup, unsupported lifecycle decisions and evidence. Run database/unit/lint/types/build checks.

Files: `supabase/migrations/*`, `tests/db/*`, `src/lib/supabase/*`, `src/app/auth/*`, `src/app/sign-in/page.tsx`, `src/proxy.ts`, `.env.example`, package manifest/lock, product/domain/decision/roadmap annotations and schema documentation.

Constrained scope: shared tracked accounts only (O01); invite-only allowlisted verified Auth IDs, Google OAuth (O02); no owner transfer, remove/leave/account deletion APIs (O03/O05). Financial proposals in DOMAIN_RULES are the implementation baseline for this requested slice (O04); not a real-data release approval.

Review focus: simultaneous retries/refunds/reservations; JWT identity versus caller-supplied actor; membership revoked after a successful operation; exact aggregate strings above JS safe integer; immutable financial history. PostgreSQL engine tests must be distinguished from hosted Auth/PostgREST and multi-connection concurrency checks.
