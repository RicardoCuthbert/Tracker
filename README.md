# Finance Planner — Warm Ledger

Personal and shared finance tracking with workspace-scoped Supabase access, exact whole-rupiah IDR amounts and Asia/Jakarta financial dates.

## Current features

- Email/password signup and sign-in, email confirmation, and Google OAuth when configured.
- Private workspace provisioning for verified users; shared workspace creation and identity-bound invitations with explicit acceptance. Invitations stay in-app; no email is sent.
- Live overview, accounts and transactions on `/w/[workspaceId]`. `/`, `/accounts` and `/transactions` redirect to `/workspaces`.
- Account opening balances, income/expense categories, and income, expense and atomic transfer creation/editing. Voiding requires a reason and preserves history.
- Exact balances, monthly income/spending, full-month category donut with exact table, and transaction pagination.
- Responsive sidebar/mobile navigation and full-screen entry sheets; guarded drafts, confirmed persistence, idempotent retries and version-conflict handling.

Budgets, savings goals and settings remain labeled sample prototypes. Sample balances and demo entries are separate from the live ledger. No bank connections, automatic personal/shared mirroring or split/reimbursement flow.

## Run locally

Requires Node.js 24 LTS and npm.

```sh
npm ci
```

Copy `.env.example` to ignored `.env.local` and configure:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable key; never a service-role key |
| `SITE_URL` | Canonical application origin, such as `http://127.0.0.1:3000` |
| `TEST_DATABASE_URL` | Optional isolated native PostgreSQL test database; never production |

Follow [database setup](docs/DATABASE.md) and [authentication/workspace setup](docs/AUTH_WORKSPACES.md). Review migrations 001–004 in order and apply only missing migrations through an authorized operator. Migration 004 changes provisioning to include all verified identities. Hosted migration/configuration changes and deployment require separate owner approval.

```sh
npm run dev
```

Open [localhost](http://127.0.0.1:3000). Production preview: `npm run build`, then `npm start`.

Webpack is explicitly selected because Turbopack's PostCSS subprocess failed in this Windows environment. No framework internals are patched.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
npm run audit:local
```

- `npm run test:integration`: start a production preview on port 3131 first. Checks HTTP guards, redirects, cache headers and unauthorized action rejection.
- `npm run test:e2e`: run after build. Uses isolated local Auth/HTTP fixtures and actual ledger SQL/RLS, two synthetic identities, transaction flows, privacy guards and responsive layouts. Requires an existing Playwright installation/browser; set `PLAYWRIGHT_MODULE` to its absolute `index.mjs` path and optionally `CHROME_PATH`. Uses ports 3142/3143; writes ignored artifacts to `test-results/`.
- `npm run test:db`: runs PostgreSQL-role/RLS tests with PGlite. Native multi-connection coverage requires an isolated `TEST_DATABASE_URL`; otherwise that check is skipped.
- `npm run db:types`: regenerates RPC contracts; typecheck verifies they match.
- `npm run audit:staging`: read-only hosted discovery audit. Intentionally fails while required RPC signatures are unavailable.

Local fixtures do not establish hosted readiness. Hosted migrations/RPCs, email delivery, Google consent and two authenticated hosted browser sessions remain acceptance gates. Do not use real finances yet. See [integration audit](INTEGRATION_AUDIT.md).

## Project references

- [Product](docs/PRODUCT.md), [domain rules](docs/DOMAIN_RULES.md), [decisions](docs/DECISIONS.md), [roadmap](docs/ROADMAP.md).
- [Authentication and workspaces](docs/AUTH_WORKSPACES.md).
- [Transaction management and verification](docs/TRANSACTION_MANAGEMENT.md).
- [Live workspace UX review, 2026-11-08](docs/UX_REVIEW_2026-11-08.md). Generated screenshots are local test artifacts, not included in Git.
- [Database/RLS/RPC contract](docs/DATABASE.md).
- [Historical frontend prototype](docs/FRONTEND_PROTOTYPE.md).

Stack: Next.js App Router, strict TypeScript, Tailwind CSS, shadcn/ui, Supabase PostgreSQL/Auth/RLS and Recharts. Money crosses RPC JSON as integer strings; opening balances and transfers are excluded from income/expense totals.
