# Authentication and workspace management — 2026-11-07

Scope: email/password signup and sign-in alongside existing Google OAuth; verified
identity, automatic personal provisioning, shared creation, identity-bound in-app
invitations and explicit acceptance. Existing shadcn forms and server cookie clients.
No financial writes, membership removal, ownership transfer or deployment.

User decision: every verified signup gets private workspace access. This supersedes
the operator allowlist and global singleton household assumptions. Each user may
join one shared workspace; unrelated households remain isolated. Shared capacity
defaults to two in a protected workspace column, not a schema-wide two-user limit.
Pending invitations grant no membership. Invitations target a verified user's UUID;
users exchange that identifier themselves. No email delivery or public user directory.

Implementation plan:
- Add failing PostgreSQL role tests for open verified provisioning, separate
  households, inbox privacy, owner-only invitations, explicit acceptance, capacity,
  expired/revoked invitations and unauthorized requests.
- Add migration 004; keep applied migrations unchanged. Provision on verification
  and idempotent authenticated retry. Preserve private RLS and narrow RPC grants.
- Add server Auth actions, credential validation and confirmation callback.
- Add server workspace actions, authorized controls and invitation inbox.
- Regenerate RPC types; update contracts/docs. Run lint, typecheck, unit/database
  tests, production build and HTTP smoke. Record hosted/browser limitations.

## Supabase Dashboard and migration setup

No hosted migrations, identities, settings or messages changed during this task.
Operator must review/apply migrations 001–004 in order, applying only missing ones.
Migration 004 provisions private workspaces for **all existing verified identities**,
including identities formerly excluded by the allowlist. Review that access-policy
change before applying. Existing personal/shared histories stay isolated and intact.
Keep `ledger` outside exposed schemas; expose public RPCs only. Do not give users
direct writes or access to internal provisioning functions.

Enable Email provider and new signups. Enable email confirmation. Configure minimum
password length at least 8, SMTP/delivery, rate limits and production Auth controls.
Set Site URL to canonical `SITE_URL`; allow exact `SITE_URL/auth/callback`. Use the
signup confirmation email template link:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}">Confirm email</a>
```

The fixed `email` OTP verification route supports confirmation on another browser;
the existing callback also supports PKCE `code` exchange. Expired/invalid links
return a generic sign-in error. Never configure privileged credentials in public
environment variables. App config requires project URL, publishable key and
canonical `SITE_URL` in ignored `.env.local`/deployment secrets.

Google remains available with the existing provider credentials and exact Google
redirect/Supabase callback configuration described in [DATABASE.md](DATABASE.md).
No allowed-user inserts are needed after 004. Users obtain their own UUID from
`/workspaces`, exchange it outside the app, then owners save an in-app invitation.
Recipient sees it only after signing in and must press **Accept invitation**.
No email is sent for workspace invitations. Pending invites reserve capacity until
acceptance/expiry; retrying the same invite reuses it. No removal/leave/reinvite of
revoked membership or ownership controls pending lifecycle decisions.

Official references checked: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[password Auth and email confirmation](https://supabase.com/docs/guides/auth/passwords).
Installed Next.js 16.4.5 Server Actions/cookies guides were read before implementation.

## Changed files

- Migration 004; generated `src/lib/supabase/database.types.ts`.
- `src/app/auth/actions.ts`, `auth/callback/route.ts`, `sign-in/page.tsx`, new `sign-up/page.tsx`, `src/proxy.ts`.
- `src/lib/supabase/credentials.ts`, `finance.ts`.
- `src/features/workspaces/actions.ts`, `auth-form.tsx`, `management-form.tsx`, `views.tsx`; live `workspaces/page.tsx`.
- `tests/db/database.test.mjs`, new `workspaces.test.mjs`; `tests/unit/finance-reader.test.ts`, new `credentials.test.ts`; `scripts/http-smoke.mjs`.
- This document plus PRODUCT, DOMAIN_RULES, DECISIONS, DATABASE, DATABASE_PLAN, ROADMAP and INTEGRATION_AUDIT updates.

Pre-existing AGENTS.md changes preserved. No commit, push or deployment.

## Verification

Focused regression tests first failed for missing automatic provisioning, credential
validation and invitation decoder; passed after implementation. Real PostgreSQL
roles (PGlite, not RLS mocks) exercise verified/unverified/anonymous users, independent
households, direct-write denial, private workspace attacks, owner-only invitations,
recipient-only acceptance, pending-seat reservation, capacity growth through trusted
administration, reused/expired/revoked invitations, revoked-owner acceptance and
existing money/privacy invariants. SDK decoder tests mock transport only.

Final checks: lint PASS; strict typecheck and 16 generated RPC contracts PASS;
unit tests 22/22 PASS; database tests 17 PASS, 1 explicit multi-connection skip;
production build PASS; local credential/source/client-bundle audit PASS (zero
credential candidates). Production HTTP smoke PASS for signup/sign-in rendering,
signed-out route guards, direct unauthorized create/invite/accept action POSTs,
private/no-store headers and fixed callback redirects. Initial cross-process
loopback access failed; server and smoke were then launched together on port 3132
and passed. Temporary server stopped. Native PostgreSQL executables were not found
on PATH; multi-connection concurrency checks were not run in this delivery.
The final sandboxed build hit EPERM creating a prerender directory; the approved
unsandboxed rerun completed successfully. No source workaround was needed.

Hosted email delivery/confirmation, Google consent, refresh/expiry, two authenticated
browser sessions and hosted direct API checks remain unverified until migrations and
Dashboard setup. Existing audit found missing hosted RPCs. Local tests cannot prove
hosted configuration. Recovery, MFA and real-data release remain separate gates.
