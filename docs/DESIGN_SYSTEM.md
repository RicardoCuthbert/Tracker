# Design system proposal — Warm Ledger

Date: 2026-11-05. Status: proposed direction A; no implemented components. Context: [DESIGN_RESEARCH.md](DESIGN_RESEARCH.md). Flows: [UX_FLOWS.md](UX_FLOWS.md).

Revision 2 follows [PRODUCT.md](PRODUCT.md), [DOMAIN_RULES.md](DOMAIN_RULES.md) and [DECISIONS.md](DECISIONS.md). Required: separate private/shared contexts, IDR integer rupiah, Asia/Jakarta financial dates, expense default and goals. Financial and membership proposals retain their existing approval gates. English interface labels remain proposed under O08.

## Foundation

Flat parchment canvas, white working surfaces, forest actions, dark ink. Editorial headings; precise sans-serif data. Use spacing and rules before adding containers. All values here are independent proposals, not extracted reference tokens.

## Typography

| Role | Font stack | Size / line height | Weight |
|---|---|---|---|
| Page title | Georgia, Cambria, serif | Desktop 32/40px; mobile 28/36px | 400 |
| Section title | Georgia, Cambria, serif | 22/30px | 400 |
| Summary figure | system-ui, Segoe UI, sans-serif | Desktop 32/40px; mobile 28/36px | 600 |
| Body and controls | system-ui, Segoe UI, sans-serif | 16/24px | 400; actions 600 |
| Table figure | Same sans-serif stack | 16/24px | 500 |
| Metadata/chart label | Same sans-serif stack | 14/20px | 400 |

No downloaded fonts required. Confirm Georgia/fallback rendering later. Use sentence case, normal letter spacing and tabular lining numerals for amounts. Right-align numeric columns. Keep labels left aligned. Avoid light weights, tiny uppercase labels, and serif financial figures. Do not shrink numbers to fit.

## Color tokens

| Token | Value | Use |
|---|---|---|
| canvas | #F7F5F0 | App background |
| surface | #FFFFFF | Working panels and overlays |
| surface-subtle | #EEEAE2 | Selected navigation and quiet grouping |
| text | #252823 | Main text and monetary values |
| text-muted | #62665D | Secondary labels and metadata |
| accent | #285747 | Primary actions, active text, actuals series |
| accent-hover | #1F4438 | Hover/pressed primary actions |
| on-accent | #FFFFFF | Text/icons on accent |
| divider | #DAD7CF | Decorative separators only |
| control-border | #797D73 | Input boundaries and meaningful outlines |
| focus | #315D87 | Focus ring |
| success | #285747 | Confirmed saved/completed status |
| warning | #805B14 | Attention status |
| danger | #A33232 | Invalid fields and destructive actions |
| info | #315D87 | Informational status |
| chart-1 | #285747 | Primary series |
| chart-2 | #315D87 | Comparison series |
| chart-3 | #9A4E32 | Third category |
| chart-4 | #65508A | Fourth category |

Person identity uses names, never status color. Categories use chart colors plus labels; do not assign a unique arbitrary color to every category. Use text and icons for status on the neutral surfaces; avoid introducing untested tinted status backgrounds.

### Contrast evidence

Calculated using WCAG relative luminance on opaque sRGB hex values. Ratios are text against canvas / white / subtle surface respectively:

| Token | Ratios |
|---|---|
| text | 13.70 / 14.93 / 12.44 |
| text-muted | 5.39 / 5.87 / 4.89 |
| accent | 7.57 / 8.25 / 6.88 |
| danger | 6.30 / 6.86 / 5.72 |
| warning | 5.63 / 6.13 / 5.11 |
| info/focus | 6.33 / 6.89 / 5.75 |
| control-border | 3.86 / 4.21 / 3.50 |

White on accent: 8.25:1. Control-border is not a body-text color. Divider is not sufficient for an essential control boundary. Focus ring needs a 2px surface-colored offset so it remains distinct around dark controls. All four chart colors exceed 3:1 against the three proposed neutral surfaces; neighboring colors still need separation or patterns. Opacity, overlays, and future combinations require fresh checks.

## Spacing and dimensions

Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px. Prefer 8px relationships; use 4px for label/icon adjustments. No arbitrary gaps per component.

| Relationship | Desktop | Mobile |
|---|---|---|
| Page gutter | 32px | 16px; 12px at 320px if necessary |
| Page section gap | 32px | 24px |
| Panel padding | 24px | 16px |
| Label to control | 8px | 8px |
| Form field gap | 16px | 16px |
| Data row | Minimum 52px | Minimum 64px for two-line rows |
| Interactive target | Minimum 44 x 44px product target | Same |

Radii: 0px for ledger rows, 6px controls, 10px panels, 12px dialogs. Pill radius only for compact status/filter chips. Border width: 1px; focus ring: 2px plus 2px offset. No shadows on ordinary panels. Overlay shadow only: 0 12px 32px rgba(37,40,35,0.14). Overlay backdrop may use rgba(37,40,35,0.35); verify contrast within the overlay independently. No textures or gradients.

## Desktop and tablet layout

At >=1024px, use a 224px sidebar separated by a rule. Signed-in user and authorized workspace switcher at top; Overview, Transactions, Budgets, Accounts, Goals; Settings at bottom. Label each workspace Personal or Shared, using text plus lock/people icon. Never list the other person's private workspace or offer an All workspaces aggregate. Keep names visible with icons supplementary. Current destination gets accent text, a subtle background and an active marker. The switcher is navigation, never identity authentication.

Main content: max-width 1200px, centered in remaining space, 32px gutters. Header aligns title/month/year to the left and one primary action to the right. A three-column summary strip shows Income, Net spending and Closing cash with shared baselines and vertical dividers, not three oversized cards. Net spending has adjacent Gross expenses and Refunds values. Closing cash shows its as-of date. Budget remaining is a separate comparison with planned coverage and unbudgeted spending explained.

Below summary: conditional attention row for overspend/underfunding, then category breakdown and budget comparisons in a roughly two-thirds/one-third layout. A historical trend is optional only when recorded data supports a useful comparison; no forecast. Recent transactions span full width. Collapse to one column whenever the main visualization would be narrower than 480px. Reading order: summary, attention if present, chart/table, budget detail, transactions. No generic review queue or empty attention placeholder.

At 768–1023px, replace permanent sidebar with a named menu button/drawer. Use 24px gutters; preserve data tables where they fit. Stack header actions if labels wrap. Breakpoints are proposed content thresholds, to verify with real content.

## Mobile layout

Below 768px, one column. Header keeps signed-in identity and workspace text visible; workspace control opens only authorized choices. Month/year selector sits below page title. A labeled bottom navigation gives Overview, Transactions, Budgets, More; More contains Accounts, Goals and Settings. Avoid a second generic navigation menu. Reserve bottom padding including safe-area inset; navigation must not cover content or focused controls.

Use compact stacked income/net spending/closing cash rows; retain gross expense/refund explanation and as-of date. Attention appears before charts only when relevant. Use a visible Add transaction action near the page title, not an unlabeled floating button. Transactions become two-line rows: description and exact amount first; date/category/account next. Payer/author are revealed in shared details, with concise attribution in rows when useful. Expand details on selection; no swipe-only actions.

At 320px, wrap names and controls and allow vertical growth. Move a long exact amount onto its own line before reducing spacing; no truncation or K/M abbreviation. Financial detail can use a clearly labeled scroll region only when a true comparison table cannot reflow. No page-wide horizontal scrolling. Dialog forms become full-height sheets with visible title, cancel and save; keep actions reachable above the keyboard.

## Component rules

| Component | Composition and behavior |
|---|---|
| Summary | Label, exact figure, period, short definition; no decorative icon. |
| Panel | Title, optional contextual action, content, optional provenance/footer. Group related content only. |
| Transaction row | Date, description, category, account, signed IDR amount and type; void status only when viewing retained history. No pending/review workflow in MVP. Use semantic links/buttons without nested interactive controls. |
| Buttons | Solid accent primary; outlined secondary using control-border; underlined text links; danger for destructive action. One primary per task region. |
| Inputs | Persistent label, example/helper text, 44px minimum height, visible border, error below. Placeholder never replaces label. |
| Amount input | Default expense; fixed IDR label and numeric keypad hint; positive whole-rupiah input, accepted-format helper, no decimals or silent rounding. Signed corrections use a separate explicit direction control. |
| Select/filter | Named choice, visible current selection, clear-all action; selected state accessible without color. Use the established shadcn/ui control pattern consistently; accessible search only when needed. |
| Goal | Target, exact reserved amount, percentage and optional deadline; distinguish current reservation progress from monthly reporting. Underfunding has text and exact account shortfall. |
| Destructive action | Void transaction or archive used object; preview impact and preserve history. Never present ordinary Delete for used financial history. |
| Dialog | Visible title, contained focus, inert background, Escape/cancel, focus returned to trigger; protect unsaved edits. |
| Toast/status | Non-blocking saved confirmation announced politely; persistent inline error for failed writes. Critical information cannot depend on a disappearing toast. |

## Chart grammar

Use a line for balance/spending over time; horizontal bars for category comparison; labeled progress bars for budgets. Bar axes begin at zero. Line axes may vary only with clearly labeled bounds; show negative values around a visible zero reference. Compare equal date ranges. No 3D, gradient fills, dual axes, rainbow pies or decorative sparklines without context.

Actuals: solid forest 2px line; historical comparison: blue dashed line. No forecast series in MVP. Use sparse neutral gridlines. Show IDR, date range, units and data freshness. Category bars extend left for negative net spending with explicit refund explanation; preserve signed totals when grouping Other. Goal bars cap visually at 100% while exact amount/percentage may exceed target. Tooltips must work on focus and tap, not only hover; provide a text summary and equivalent exact data table. Limit categorical colors to four, grouping the remainder as Other with drilldown. Separate adjacent colored segments with a neutral gap or patterns. Never encode person or financial health by color alone.

Use required Recharts for later implementation; convert integer presentation values only after safe-integer bounds checks. If unsafe, show the exact table instead of a rounded chart. No financial arithmetic in chart components. Whole-rupiah tick labels may be abbreviated with explicit units for space, but exact table, tooltip and totals remain unabridged.

## Financial readability

IDR only, locale id-ID, zero decimal places: Rp300.000; negative example −Rp50.000. Show an IDR label in amount forms and chart units. Accept the DOMAIN_RULES whole-rupiah input grammar: 10000 or 10.000; reject 10,50, 10.00, exponent notation, signs in ordinary positive-amount fields and excess limits. No configurable currency or exchange-rate UI. Use bigint financial arithmetic and integer-string transport later; no float rounding. Preserve exact amounts in tables/details and working balances, with a true minus sign and accessible negative wording where useful.

Show expense/income/refund/transfer/correction labels. Refunds reduce spending in their recorded month; transfers, openings, corrections and reservations are excluded from income/expenses. Separate workspace ownership, payer and author. No Personal + Shared aggregation or private-account choices in Shared. Missing values display Unknown or an explained em dash; zero is known zero, unset budget means Not set, and no accounts means No configured accounts. Budget remaining is not safe to spend. Avoid comparative blame.

Economic dates use Asia/Jakarta date-only semantics, including the default expense date and activity-month navigation. Audits store UTC instants, displayed in Jakarta when shown. Current-month closing cash is as of today; past month uses month-end; future month shows Cash projection unavailable. Goal reservations are current even when another dashboard month is selected; label that distinction visibly.

## Interaction and system states

Use 120–180ms color/opacity feedback for controls and up to 200ms disclosure transitions; no bounce, parallax, counting balances or chart draw-in. Reduced-motion preference removes nonessential transitions. Hover reveals no essential information. Every control has visible focus and active/selected semantics.

| State | Required presentation |
|---|---|
| First use | Explain private workspace and next step; Add account first when none exist; no fabricated graph. |
| Empty filter | No matching transactions; show filters and Clear filters. |
| True zero | Show numeric zero and its period, distinct from no data. |
| Initial loading | Stable skeleton geometry and a loading label; no fake balances. |
| Refresh | Keep last-known values, show Updating and last updated timestamp. |
| Partial/stale | Mark affected source and excluded totals; unaffected content stays usable. |
| Error | Plain cause if known, affected scope and Retry; preserve inputs. |
| Saving | Disable repeated submit, retain readable field values, announce progress. |
| Saved | Confirm only after persistence succeeds; update related totals consistently. |
| Conflict | Show that another edit occurred; let user compare before overwriting. |
| Denied/session ended | Remove sensitive content and drafts, cancel obsolete results; generic denial reveals no inaccessible workspace name. |
| Workspace changing | Clear old workspace values immediately; never show old rows under the new workspace label. |
| Offline | Explain save unavailable; current-session draft only while authorized, no persistent financial cache or offline write queue. |

## Accessibility acceptance criteria

Target WCAG 2.2 AA. Use semantic headings, landmarks, table headers, field labels and error associations. Support keyboard operation, visible focus, accessible names, 200% text resizing and reflow at 320 CSS px; preserve essential data relationships. Validate color pairs against 4.5:1 normal text, 3:1 large text and applicable 3:1 non-text requirements. Our 44px target is a product choice; WCAG 2.2 AA target-size minimum is 24px subject to its exceptions. No drag-only controls. Authentication must support password managers, paste and accessible recovery; consult O02 before assurance choices.

These numeric and behavioral criteria derive from [W3C WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/). Modal focus behavior follows [W3C APG Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Actual conformance requires implementation testing; a token table cannot establish it.

## Direction B substitution

If Quiet Journal is selected, replace heading serif with the body sans stack, canvas with #FAFAF7, text with #232B32, primary action with #315D87, control radius with 8px and panel radius with 12px. Use whitespace rather than summary dividers where relationships remain clear. Retain the same information architecture and financial safeguards. Recalculate all affected contrast pairs before adopting B; current evidence covers A only.

## Accepted palette update — 2026-11-05

User selected midnight navy / cloud white / electric lime after previews. This section supersedes the earlier warm/forest color table and flat-only restriction for this frontend prototype. Typography and financial behavior stay unchanged.

Canvas #F5F7FB; panels #FFFFFF; text/semantic primary #0B1220; muted text #475569; subtle surface #E7EDF4; divider #D6DDE8; control outline #738197; focus #245A92. Primary action fill #C6FF00 with navy text; hover #B1E600. Lime is reserved for primary actions and brand mark, never financial health/body text. Charts use #0B1220 / #345172 / #586B85 / #73829A with existing labels and exact table.

Page heading and sign-in introduction use a restrained 115-degree navy gradient (#0B1220 -> #14263F -> #183650), cloud headings and #C3CEE0 secondary text. Working surfaces/forms stay white. Mobile heading controls wrap to avoid overflow. Earlier screenshots show the historical forest palette; new theme screenshots are labeled navy.

## Accepted palette update — 2026-11-06

User requested sky blue, white and hot pink on the website prototype. This supersedes the previous navy/cloud/lime implementation. Canvas #F0F9FF, white panels, text #082F49, semantic blue #0369A1, subtle surface #E0F2FE, muted text #475569. Brand sky #38BDF8. Primary buttons #D91670 with white text; hover #BE185D. Pink identifies actions, not financial state. Chart blues #0284C7 / #0369A1 / #075985 / #0C4A6E retain exact labels/table. Light 115-degree sky-to-white gradient ends with restrained #FCE7F3. Header text remains dark. Existing mobile wrapping, typography and financial behavior retained.

## Chart update — 2026-11-06

User requested spending breakdown as a pie chart. Recharts Pie/PieChart replaces horizontal bars; existing blue category mapping, exact table and tooltip retained. Negative or all-zero values use the table with explanation; unsafe numeric conversion keeps its precision fallback. No new accounting calculations. This supersedes bar-only styling for this breakdown.

## Donut and monthly trend — 2026-11-06

User supplied donut reference and requested monthly financial/spending trend. Breakdown now uses a ring with exact total centered and category table beside it on wide screens, stacked on mobile. Colors: #0284C7, #38BDF8, #BAE6FD, #D91670; labels preserve meaning beyond color. Negative/all-zero/unsafe guards remain.

Added one line chart: closing cash (solid sky blue) and net spending (dashed hot pink), one shared IDR scale with exact table. Existing authorized-workspace sample snapshots only; no invented historical months or new finance calculations. Missing months remain unknown/gaps; unsafe values use the exact table. Two personal samples (October and November), one shared sample. November is explicitly partial through 5 Nov, so lower spending is not presented as improved financial health.

## Part 5.5 supplied illustration integration — 2026-11-10

Direct user brief authorizes local branding and illustration integration only.
The accepted 2026-11-06 sky blue/white/hot pink palette, typography and financial
hierarchy remain. Finance Planner now uses the supplied flower-cat face crop for
navigation and Next file-convention icons. Decorative illustrations are limited
to empty states; they never replace numeric zero or cover charts/values. Fixed
160×120 illustration boxes shrink to 128×96 on mobile; no new animation or dark
theme. Shared and personal empties retain explicit workspace context. Error,
loading and financial calculations stay unchanged. See [inventory, usage map,
screenshots and verification](VISUAL_IDENTITY.md). Reserved illustrations do not
authorize future goals, onboarding or financial workflows.
