# Frontend prototype

User authorization: 2026-11-05. Local frontend prototype only, using Warm Ledger tokens and English copy. This does not approve backend milestones or resolve DECISIONS O01–O08.

Later authorization — 2026-11-06: [DATABASE.md](DATABASE.md) supersedes the no-auth/no-Supabase statements below for sign-in and the isolated database layer. `/sign-in` now offers configured Google OAuth; `/auth/ready` shows actual authenticated identity/sign-out. All financial screens, demo identity and workspace switching remain sample-data prototype behavior, with no database transaction integration.

Plan: configure Next App Router/strict TypeScript/Tailwind; use shadcn primitives and Lucide; add scoped mock fixtures and presentation helpers with focused tests; implement shell, overview, transactions/dialog, budgets, goals, accounts and sign-in visual shell; inspect 375px and desktop; run lint/typecheck/tests/build.

Files: src/app holds routes and tokens, src/components/ui holds shadcn components, src/features/prototype holds fixtures and screens, src/lib/prototype.ts holds formatting/input/date presentation helpers, tests/unit covers those helpers. No domain accounting engine, Supabase, auth service or financial persistence.

Mock contract: every screen identifies sample data. Signed-in identity is a fixed demo label, not authentication. Workspace switch lists Personal and Shared fixtures only. All summary/budget/goal values are explicitly authored snapshots; session demo entries appear separately and never recalculate snapshots. Empty, loading and error previews are selectable. No real credentials or private financial data should be entered.

## Implemented screens and interactions

| Route / feature | Delivered |
|---|---|
| `/` | Responsive overview, compact income/net-spending/closing-cash summary, gross/refund detail, Recharts category bars, exact category table and supporting-record dialog, recent transactions, budget and goals previews |
| Shell | Desktop 224px sidebar; mobile bottom navigation and More menu; fixed demo identity; Personal/Shared fixture switcher; skip link |
| Month selection | Keyboard-operable shadcn Select, surrounding calendar years, desktop previous/next controls; empty months selectable; October/November sample snapshots |
| `/transactions` | Exact-IDR list, detail dialogs, transient text search, type filter, no-match recovery; session demo entries separate from snapshots |
| Add transaction | Default expense/today in Jakarta; whole-rupiah validation; workspace-local accounts; accessible full-height mobile dialog; dirty-draft confirmation; session-only demo entry and truthful confirmation |
| `/budgets` | Authored plans/actuals/remaining, progress bars, explicit unset versus zero, no automatic edits/calculation |
| `/goals` | Current reservation/target/progress/deadline/account overview, no money movement or allocation operation |
| `/accounts` | Current manual mock balances and account types |
| `/settings` | Prototype scope/currency/timezone/workspace information, visual-state controls |
| `/sign-in` | Responsive visual shell, disabled credential fields and sign-in button, sample-workspace link; no auth logic |
| Loading/empty/error | Selectable simulations with exit/retry actions; App Router loading/error boundaries and not-found route |

## Verification — 2026-11-05

- `npm run lint`: passed, no warnings/errors.
- `npm run typecheck`: passed (`next typegen` and strict TypeScript).
- `npm test`: 8 tests passed. Exact IDR formatting beyond safe Number range; input grammar/cap; invalid/future/pre-opening dates; Jakarta month boundary; guarded chart conversion; authored fixture reconciliation; shared account references; account balances.
- `npm run build`: passed with Next.js 16.4.5 / React 19.3.1 / Tailwind 4.3.4 / Recharts 3.10.1, using official Webpack mode. All eight listed app routes built.
- Browser: inspected rendered production build at 375 x 812 and 1440 x 1000; additional overview reflow checks at 320 x 812 and 768 x 1024. Document scroll widths stayed within viewport widths. This is targeted inspection, not an exhaustive responsive certification.
- Confirmed mobile transaction dialog covers the viewport at x=0/y=0 and focuses Amount. Verified malformed `10,50` produces an associated error; `45.000` creates one separate demo entry; closing returns focus to Add transaction. Shift+Tab stayed in the dialog; Escape with edits opens discard confirmation. Full screen-reader/keyboard permutation testing was not performed.
- Confirmed Personal demo entry/account names do not appear in Shared rendered content, and switching updates fixture summaries. This is presentation scoping of public mock fixtures, not authorization/security enforcement.
- Confirmed October selection updates income/spending/cash together; December shows no sample activity and cash projection unavailable. Replaced native month input with shadcn Select after inconsistent native event behavior in browser testing.
- Confirmed transaction search no-match/Clear filters and Refund-only filter. Navigated budgets, goals, accounts, settings and sign-in; mobile More menu works. Loading, error/Retry and empty/View sample month simulations exercised; settings honors state selection too.
- Sign-in final inspection: one h1, credential fields match `:disabled`, no horizontal overflow. No credentials submitted. Inspected browser error log returned no entries.
- Two mobile defects found and corrected during inspection: Tailwind individual translate values displaced the full-screen dialog, and Radix asChild replaced a button's data-slot, bypassing its 44px rule. Responsive translate classes and variant-based target sizing fix both. Overlay/draft/focus behavior retained.

Build environment note: Turbopack failed to connect to its PostCSS child process both inside and outside sandbox. Webpack succeeds without framework patches. A rebuild with running Windows preview processes hit a file-permission error; stopping owned servers before the final build resolved it. Network dependency installation and browser-visible local preview required running outside the restricted sandbox. No publishing/deployment occurred.

## Screenshots

- [Desktop overview](screenshots/overview-desktop.jpg)
- [375px full-page overview](screenshots/overview-mobile.jpg)
- [375px transaction dialog](screenshots/add-transaction-mobile.jpg)
- [Desktop budgets](screenshots/budgets-desktop.jpg)
- [Mobile budgets](screenshots/budgets-mobile.jpg)
- [Mobile goals](screenshots/goals-mobile.jpg)
- [Desktop sign-in](screenshots/sign-in-desktop.jpg)
- [Mobile sign-in](screenshots/sign-in-mobile.jpg)
- [Error](screenshots/error-mobile.jpg), [loading](screenshots/loading-mobile.jpg), [empty](screenshots/empty-mobile.jpg)

Screenshots are from browser rendering, not design mockups. Full-page captures may retain fixed navigation in the captured viewport. Overview, dialog, state and desktop sign-in screenshots were refreshed after final visual changes.

## Files added

- Root setup: `package.json`, `package-lock.json`, `tsconfig.json`, `next-env.d.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`, `.gitignore`, `README.md`.
- `src/app/layout.tsx`, `globals.css`, `not-found.tsx`, `sign-in/page.tsx`.
- `src/app/(workspace)/`: shared `layout.tsx`, overview `page.tsx`, `loading.tsx`, `error.tsx`, plus `transactions`, `budgets`, `goals`, `accounts`, `settings` page routes.
- `src/features/prototype/`: `mock-data.ts`, `context.tsx`, `shell.tsx`, `screens.tsx`, `transaction-dialog.tsx`, `spending-chart.tsx`, `states.tsx`.
- `src/components/ui/`: generated shadcn `button`, `dialog`, `input`, `label`, `select`, `dropdown-menu`, `skeleton`; imports use local `cn` helper instead of an extra utility dependency.
- `src/lib/utils.ts`, `src/lib/prototype.ts`.
- `tests/unit/prototype.test.ts`, `tests/unit/fixtures.test.ts`, this document, and screenshot artifacts above.

## Known limitations and stopping boundary

No Supabase/auth/RLS/backend, production security, financial ledger, persistent writes, actual bank integrations, AI, or offline cache. All mock fixtures are public client assets. Session entries reset on reload and do not change authored totals/budgets/goals. No budget editing, goal allocation, transfer/refund editing, invitations or membership operations. Those features require later authorized domain/backend work and existing decision gates.

No database/security tests exist or were claimed. No exhaustive accessibility audit, assistive-technology test, cross-browser/device matrix, production performance benchmark or real-user study. Eight focused tests and browser walkthroughs establish prototype behavior only. ROADMAP milestone completion is not implied. Stop after frontend prototype delivery.

## Navy / cloud / lime implementation — 2026-11-05

User approved implementing the alternate palette. Updated globals.css, mock chart colors and Recharts text/tooltip colors; recorded the palette override in DESIGN_SYSTEM.md. Financial fixtures and behavior unchanged. Lint, typecheck, all 8 tests and Webpack production build passed. Browser inspected desktop and 375px mobile overview plus transaction dialog; mobile document width 360px within 375px viewport. New screenshots: screenshots/navy-desktop.jpg and screenshots/navy-mobile.jpg. Earlier forest screenshots remain historical. Full accessibility/cross-browser audit was not repeated.

## Sky blue / white / hot pink — 2026-11-06

User requested replacing navy/lime. Updated globals.css, chart fixture colors and tooltip colors. Recorded current palette in DESIGN_SYSTEM.md. Lint, typecheck, 8 tests and production build passed. Desktop and 375px overview inspected; mobile scroll width 360px within viewport. Screenshots: screenshots/sky-pink-desktop.jpg and screenshots/sky-pink-mobile.jpg. Financial values/behavior unchanged. Full accessibility and cross-browser audits not repeated.

## Pie chart — 2026-11-06

SpendingChart uses Recharts Pie/PieChart. Exact table, category drilldown, currency tooltip and disabled animation retained. Added canRenderPie presentation guard and test for positive/zero/negative/unsafe data. Lint/typecheck/build and 9 tests passed. Desktop and 375px mobile inspected: 4 slices; scroll width 360 within 375px. Screenshot: screenshots/pie-desktop.jpg. Full assistive-technology audit not repeated.

## Donut + monthly trend — 2026-11-06

Changed SpendingChart to donut with centered authored total; reused exact table as side legend and preserved category drilldown. Palette now sky blue/light blue/hot pink. Added MonthlyTrend and getTrendData for snapshot selection/calendar gaps/checked presentation conversion. Existing cash/spending values remain unchanged. Added tests for workspace/period isolation, missing months and unsafe exact values.

Lint/typecheck/build and 11 tests passed. Browser inspected desktop 1440px and mobile 375px, donut total/legend, two trend lines, expandable exact table; mobile document width 360 within 375. Shared workspace has only one sample month; UI explains why it cannot establish a trend. No full assistive-technology audit repeated. Screenshots: screenshots/donut-trend-desktop.jpg and screenshots/donut-trend-mobile.jpg.
