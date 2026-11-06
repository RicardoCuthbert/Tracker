# Finance Planner — Warm Ledger

Responsive financial frontend prototype (**sample data only**) plus Supabase PostgreSQL/Google OAuth code and a separate guarded read-only workspace path. Hosted financial acceptance remains blocked pending deployment/authorization checks. No bank connections or remote deployment.

2026-11-07: [integration audit](INTEGRATION_AUDIT.md) adds guarded read-only `/workspaces` and `/w/[workspaceId]` routes; they need approved hosted migrations and authorized identities. Original financial screens remain sample data. Staging financial RPC signatures currently fail discovery; no remote changes were applied.

## Run locally

Requires Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Production preview: `npm run build` then `npm start`.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
```

Additional checks: `npm run audit:local`, `npm run audit:staging`, `npm run db:types`. After starting a production preview on port 3131, run `npm run test:integration`. The staging audit intentionally exits nonzero while required RPC signatures are unavailable; it uses no user JWT and performs no successful financial writes. Real Google/two-identity acceptance stays manual and is documented in the audit.

Webpack is explicitly selected because Turbopack's PostCSS subprocess failed in this Windows environment. No framework internals are patched.

## Explore

- Overview, Transactions, Budgets, Savings goals, Accounts and Settings.
- Personal/Shared switcher changes separate sample datasets, not identity or authorization.
- October/November 2026 contain personal snapshots; November contains shared data. Other months deliberately show empty state.
- Add transaction validates IDR/date input and appends a session demo entry separately from authored financial snapshots. Reload clears these entries. They do not change summary/chart/budget values.
- Preview state at the bottom demonstrates loading/empty/error layouts. Retry returns to ready.
- `/sign-in` offers Google sign-in when configured; `/auth/ready` shows the actual authenticated identity and sign-out. Financial screens still show the fixed demo identity/sample workspaces.

Screenshots, verification and scope: [docs/FRONTEND_PROTOTYPE.md](docs/FRONTEND_PROTOTYPE.md).

Migrations, schema/RLS/RPC contract, Google setup, exact-money serialization and native PostgreSQL concurrency tests: [docs/DATABASE.md](docs/DATABASE.md). Copy `.env.example` to ignored `.env.local` and follow that setup before attempting Google sign-in. Do not use real finances yet; hosted provider/browser and release checks remain pending.
