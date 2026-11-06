# Design research

Date: 2026-11-05. Status: proposal for review; no UI implementation authorized in this phase.

## Brief and evidence

Design a refined, warm, editorial personal finance application for two people. User clarified: choose references independently, prioritize minimalism and good UX, with Apple as an example.

Revision 2: reread repository AGENTS.md and all seven documents in docs/ before this revision: PRODUCT, DOMAIN_RULES, DECISIONS, ROADMAP and the three previous design proposals. Product and domain rules supersede the earlier household-only assumptions. Cuthbert and Valen have separate private workspaces and an optional shared workspace; IDR whole rupiah and Asia/Jakarta financial dates are fixed. The required stack and savings goals remain in scope. Visual choices remain proposals; financial proposals gated by DECISIONS are not approved by this research.

Sources of product truth: [PRODUCT.md](PRODUCT.md), [DOMAIN_RULES.md](DOMAIN_RULES.md), [DECISIONS.md](DECISIONS.md), [ROADMAP.md](ROADMAP.md). This revision changes only the three requested design documents. No product requirements, roadmap checkboxes, dependencies or application files are changed.

Read the installed Ponytail and brainstorming SKILL.md files. Searched installed SKILL.md filenames and contents for reverse engineering/design analysis; no dedicated skill found. Used structured browser screenshot and accessibility-tree inspection instead. No reference assets, code, logos, or branding were copied.

## Inspection scope

Reused the same three references and inspected their public homepages again on 2026-11-05 at approximately 1265 x 712. Set the narrow viewport separately while each page was current, resolving the previous Apple/Copilot viewport limitation. All three narrow layouts were observed at a requested 390 x 844, with captures approximately 375 x 844. Opened Apple's search panel and dismissed it with Escape; opened/closed Lunch Money's mobile menu; inspected Lunch Money's desktop dashboard image. The earlier Copilot phone-preview observations remain supporting evidence. Reset temporary viewport overrides afterward.

Screenshots were inspected in tool output, not archived as project assets. URLs below identify the inspected pages. Exact font families, CSS measurements, transition durations, and contrast ratios of references were not measured. Descriptive colors and type styles are visual observations. Our tokens are independent proposals.

## Reference 1 — Apple

Source: [Apple homepage](https://www.apple.com/), public desktop/narrow homepage, inspected 2026-11-05.

| Aspect | Observation |
|---|---|
| Hierarchy | Compact global navigation; centered product title, subtitle, paired actions, dominant image. |
| Typography | Consistent sans-serif appearance; clear title/body size separation. Exact family unverified. |
| Color | Dark hero, white title, blue actions; colorful imagery. |
| Rhythm | Large full-width sections, generous negative space, narrow light separators. |
| Surfaces | Flat hero field; filled primary and outlined secondary pill buttons. |
| Navigation | Horizontal product links, search and bag controls; no app sidebar observed. |
| Cards/charts | Product sections, not financial cards; charts absent in inspected view. |
| Forms/dialogs | Search opens a dark panel with field and quick links; no search submitted. |
| Mobile | Compact icon navigation/menu; smaller centered headings, retained paired actions, cropped image. |
| Interaction/states | Search opens and Escape dismisses; transition visible, timing unmeasured. Empty/loading/error behavior unverified. |

Reusable principle: ordered attention and restrained action hierarchy. Product adaptation: one clear monthly summary followed by supporting rows. Avoid promotional scale, product photography, and Apple's distinctive compositions in the application.

## Reference 2 — Copilot Money

Source: [Copilot Money homepage](https://www.copilot.money/), public desktop homepage and embedded phone preview, inspected 2026-11-05.

| Aspect | Observation |
|---|---|
| Hierarchy | Centered headline, supporting copy, proof badges, primary action, phone preview. |
| Typography | Sans-serif throughout inspected view; strong heading/body distinction. Family unverified. |
| Color | Pale blue atmospheric background, dark blue text, bright blue actions. |
| Rhythm | Spacious marketing layout; denser groups inside phone preview. |
| Surfaces | Rounded preview panels, soft shadows, pill controls. |
| Navigation | Top product menu and login/start links; phone preview shows section labels. |
| Cards | Review panel combines issue, transaction context and dismiss/approve actions. |
| Charts | Colored budget rings paired with numeric remaining/over labels in preview. |
| Forms/dialogs | Preview actions are illustrations; live app behavior unverified. |
| Mobile | Logo, menu control and start action remain; centered copy wraps and phone preview scales down. |
| Interaction/states | Preview changed between captures; timing unmeasured. Menu expansion not verified. Loading/error/empty behavior unverified. |

Reusable principle: actionable financial context. Adapt with neutral attention rows and explicit status text, without adopting a review workflow. Avoid the atmospheric background, emoji-heavy categories, assistant feature scope, and ring-based category wall.

## Reference 3 — Lunch Money

Source: [Lunch Money homepage](https://lunchmoney.app/), public desktop/narrow homepage, menu and dashboard image, inspected 2026-11-05.

| Aspect | Observation |
|---|---|
| Hierarchy | Large multiline heading, supporting line, green action; dashboard preview below. |
| Typography | Bold sans-serif headings; small dense labels inside dashboard image. Family unverified. |
| Color | Light canvas, green links/actions, yellow mascot, faint repeating background motifs. |
| Rhythm | Spacious introduction; compact columns and aligned financial rows in preview. |
| Surfaces | Thin rectangular panel borders; limited visible dashboard elevation. |
| Navigation | Desktop text links; narrow layout exposes menu button and grouped full-height menu. |
| Cards/charts | Account and period panels; spending bars with aligned numeric columns. |
| Forms/dialogs | Marketing buttons observed; authenticated forms/dialogs not inspected. |
| Mobile | Hero stacks; action remains prominent; menu opens/closes and groups feature links. |
| Interaction/states | Preview includes reviewed/no-budget status messages; live loading/error behavior unverified. |

Reusable principle: scan financial rows quickly and group navigation by task. Adapt with readable labels and fewer destinations. Avoid mascot, repeating motifs, crowded secondary navigation and tiny uppercase financial labels.

## Principles to reuse

These are design judgments informed by the observations, not claims of measured reference usability.

1. Give each page one main question and one main action.
2. Separate summary, attention items and supporting detail through order and spacing.
3. Use aligned data rows wherever users compare amounts. Cards need a grouping purpose.
4. Keep navigation visible and named; place detail behind deliberate disclosure.
5. Pair state colors with words, symbols and amounts.
6. Keep authenticated identity, workspace, period and data freshness visible; attribution never substitutes for access control.
7. Use warm materials through flat colors and typography, not decoration.
8. Preserve density where it serves comparison; minimalism must not hide useful facts.

## Fit against our brief

| Requirement | Adopt | Adapt or reject | Product implication |
|---|---|---|---|
| Minimal, refined | Apple attention hierarchy | Reject large promotional sections | Modest page title; useful information visible immediately. |
| Warm, editorial | Deliberate heading rhythm | Add restrained serif headings; avoid themed illustrations | Personality comes from type and warm canvas. |
| Private/shared boundaries, P01–P03/P12 | Explicit context and named navigation | Do not copy household roll-ups | Separate authorized workspace views; no Personal + Shared total. |
| Entry/corrections, P04–P07/P09/P13 | Contextual actions and aligned rows | No imported-review queue, pending status or assistant scope | Default expense; exact IDR; explicit transfer, refund and correction flows. |
| Reports/budgets, P08/P10 | Labeled compact comparisons | Balance is not budget remaining; no forecasts | Income, gross expenses, refunds/net spending and closing cash remain distinct. |
| Goals, P11 | Small progress display with supporting amount | No automated bank movement implied | Reservations and underfunding explained separately from cash transfers. |
| Reliability, P14 | Clear state and context | Appearance cannot establish safe writes | Confirmed saves, idempotent retries, conflict resolution and access-aware clearing. |
| Mobile | All three stack hierarchy; compact navigation | Reduce navigation depth | Same task order; exact IDR remains readable. |
| Accessible | Explicit labels and hierarchy | Reference appearance does not prove compliance | Independently verify semantics, contrast and keyboard behavior. |

## Two visual directions

| Decision | A — Warm Ledger | B — Quiet Journal |
|---|---|---|
| Character | Warm editorial ledger; composed and personal | Minimal contemporary journal; crisp and practical |
| Type | Georgia for page/section titles; system sans for controls/data | System sans throughout; hierarchy through weight and space |
| Palette | Parchment #F7F5F0, ink #252823, forest #285747 | Warm white #FAFAF7, ink #232B32, blue #315D87 |
| Layout | Divided summary strip; ruled rows; restrained bordered groups | Open single-column sections; whitespace and subtle inset groups |
| Shape | 6px controls, 10px panels; mostly flat | 8px controls, 12px panels; very light overlay shadows |
| Charts | Forest actuals, blue period comparison, signed category bars | Blue actuals, gray period comparison, signed category bars |
| Strength | Most closely matches warm editorial brief | Closest to user's minimalist Apple preference; easier type consistency |
| Tradeoff | Serif fallback and mixed-type rhythm require care | Less distinctive; can drift into generic software styling |
| Shared constraints | Exact numbers, visible labels, predictable navigation | Same accessibility and financial readability requirements |

## Recommendation

Choose **A — Warm Ledger**, with Apple's restraint: keep serif type to titles, body and figures in system sans, flat warm surfaces, forest actions, compact rows. This balances the original editorial brief with the user's minimalist clarification. B remains a credible alternative if familiar simplicity matters more than editorial character.

The first screen should read: signed-in user, authorized workspace and month/year; a compact summary of income, net spending and closing cash with gross expense/refund detail; budget comparison; category chart/table; recent transactions. Display attention only for actual conditions such as overspend or underfunded goals, not a new review-queue feature. No oversized tile grid, ornamental gradients, glass, blobs, texture overlays, or animated counting.

See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for proposed tokens and layouts; [UX_FLOWS.md](UX_FLOWS.md) for proposed behavior. Direction is recommended, not approved.

## Open product decisions

Fixed requirements are no longer open: separate identities/private workspaces, IDR, Jakarta financial dates, expense default, manual recording and goals. Keep DECISIONS O01–O08 open as recorded: private-funded household flows, identity assurance, membership lifecycle, reporting proposals, operations, unsupported investments/debts, future AI/PWA privacy, language and visual approval. In particular, a payer selector cannot solve private funding or authorize private disclosure. English labels remain proposed under O08; no scope or approval is inferred from this revision.

## Later validation

Review realistic content at 320, 390, 768, 1024 and 1440px; long names, Rp1.000.000.000.000, signed refund-heavy categories, missing data and zero income. Test each person's private workspace plus the shared workspace, explicit default expense entry, goal reservation and category correction. Check keyboard/screen-reader operation and zoom. M04 covers entry/copy, M07 reports/charts, M08 goals, M09 shared behavior, M10 usability evidence. These are future acceptance checks, not completed tests. Public reference screens do not establish authenticated UX, RLS, accessibility compliance or usability. Stop for direction review; no UI or implementation plan created.
