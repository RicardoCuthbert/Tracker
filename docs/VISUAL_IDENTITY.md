# Part 5.5 — Visual identity and supplied illustrations

Date: 2026-11-10. Authorized local visual enhancement only. Existing sky blue,
white and hot pink palette, typography, navigation structure and financial logic
stay intact. No schema, RLS, hosted configuration, dependency or deployment changes.

## Delivered scope and implementation

- Read AGENTS, product/domain/decision/roadmap and current design-system updates.
- Audited the extracted `Asset lucu lucu/` folder: twelve SVGs and twelve supplied
  PNG exports. Originals remain unchanged. SHA-256 source fingerprints live in
  [inventory.json](../public/illustrations/inventory.json); unit tests verify them.
- `BrandLogo` and `AppIcon` in
  [brand-logo.tsx](../src/components/brand/brand-logo.tsx) replace duplicated book
  marks in live/sample navigation, discovery and sign-in. Sign-up uses the same
  identity. Name remains **Finance Planner**. Crop derives from the supplied flower
  cat; no replacement illustration was generated.
- [EmptyState](../src/components/brand/empty-state.tsx) reuses existing `state-panel`
  styling. Live account, spending and personal/shared transaction empties retain
  their headings, instructions and existing controls. Empty state depends on list
  length, never a balance: an account with zero opening still displays **Rp0**.
- Sample empty-month and goals previews use the same component; the existing
  sample transaction-search component uses it too. Goals offer “View sample goals”
  rather than an unsupported financial write. Existing sample account empty
  presentation is wired; `/accounts` still redirects to authorized live discovery.
- Goal-completion/confetti is mapped and available through the component, held
  for a real completed-goal view. Current fixtures have no completed goal. No new
  goal workflow, live search, fake completed sample or financial status was added.
- No separate IllustratedPlaceholder wrapper: EmptyState already owns that job.
- Current Next 16.4.5 bundled metadata/icon guidance was read. `src/app/favicon.ico`
  contains 16/32/48px entries; `icon.png` is 192px and `apple-icon.png` 180px.
  Next automatically emits icon links. Navigation reuses `/icon.png`.
- Global title: “Finance Planner — A little clarity”. Description now explains
  personal/shared finance tracking instead of incorrectly calling all data sample.

## Asset inventory and usage map

Dimensions below are intrinsic output dimensions. Raster outputs retain their
original embedded PNG pixel dimensions; SVG dimensions preserve the supplied frame.
“Reserved” means organized and reviewed, not placed throughout the dashboard.

| Supplied SVG | Optimized file under public/illustrations | Dimensions | Bytes, source → output | Use |
|---|---|---|---|---|
| `Poster.svg` | `welcome-together.webp` | 3420 × 2437 | 1,524,802 → 603,958 | Reserved: welcome |
| `Poster (1).svg` | `start-with-a-pencil.svg` | 534 × 403 | 67,226 → 64,042 | First account |
| `Poster (2).svg` | `reading-together.svg` | 519 × 312 | 80,375 → 77,068 | Empty transactions and search |
| `Poster (3).svg` | `walking-together.svg` | 618 × 451 | 101,816 → 97,273 | Reserved: shared onboarding |
| `Poster (4).svg` | `care-for-the-cat.svg` | 562 × 360 | 62,431 → 59,760 | Reserved: savings care |
| `Poster (5).svg` | `plan-together.svg` | 432 × 446 | 109,980 → 105,502 | Empty shared transactions |
| `Poster (6).svg` | `small-high-five.svg` | 432 × 428 | 64,412 → 61,520 | Reserved: small milestones |
| `Poster (7).svg` | `cat-at-rest.svg` | 432 × 296 | 45,064 → 43,333 | Reserved: calm placeholder |
| `Poster (8).svg` | `celebrate-progress.webp` | 3181 × 3231 | 1,458,196 → 586,420 | Completed goal |
| `Poster (9).svg` | `flowers-for-you.webp` | 2268 × 2198 | 380,989 → 70,502 | Empty savings goals; brand source |
| `Poster (10).svg` | `comfort-the-cat.svg` | 432 × 450 | 78,680 → 75,275 | Unused: avoid distress in empty states |
| `Poster (11).svg` | `empty-wallet.webp` | 2168 × 2329 | 318,362 → 57,984 | Unused: never imply empty data means no money |

## Safety, rendering and size evidence

Eight sources contain vector paths/groups/clips only. Four are SVG wrappers around
inline PNGs, not vectors. XML audit allows only `svg/defs/clipPath/g/path/image`,
rejects event attributes, DTD/entities, external links and nonlocal URL references.
Output vectors contain no script, embedded image, style, animation or external
reference. Embedded rasters become passive lossless WebP images, removing base64
container overhead. No external SVG dependency or unsafe inline injection is used.

Every asset has a transparent background. Light/dark Chrome contact sheets show
no opaque full-page white rectangle; original white eyes/clothing and black
outlines remain. Eight vector canvases match their originals **pixel for pixel**
in Chrome. Four WebP outputs decode to **identical RGBA pixels** to their embedded
PNGs, including transparent pixel values. Root dimensions/viewBoxes remain for
vectors; no path coordinates were rounded. Raster exports remove only the SVG
wrapper's subpixel transform/frame, preserving the supplied PNG pixels.

Illustrations total **4,292,333 → 1,902,637 bytes (55.7% smaller)**. Largest files
(welcome 603,958 bytes; celebration 586,420 bytes) stay unused in current financial
views. Live first-use uses the pencil (64,042 bytes), reading pair (77,068 bytes)
and, for shared transactions, group (105,502 bytes). Check inventory for exact
per-file counts; these are uncompressed source sizes, not network benchmarks.
Assets load only when rendered, decorative images use lazy loading and fixed
160×120 boxes (128×96 on mobile), `object-fit: contain`, empty alt text and adjacent
meaningful headings. Brand has visible link text; image alt remains empty to avoid
duplicate screen-reader names. No animations, fonts, UI library or package changes.

Reproduce optimization: `python scripts/prepare-illustrations.py` (Pillow).
It validates XML, verifies lossless decoded pixels and only writes derived assets
and file-convention icons. It never edits `Asset lucu lucu/`.

## Verification

- `npm run lint`: passed.
- `npm run typecheck`: passed; sixteen RPC contracts unchanged.
- `npm test`: 37 passed, including source safety/hash and ICO-size checks.
- `npm run test:db`: 18 passed; one native concurrent-connection test skipped
  because no dedicated `TEST_DATABASE_URL` was supplied. No hosted database touched.
- `npm run build`: passed with the final visual components and icon routes.
- `npm run test:e2e`: passed against isolated real SQL/RLS and two fixture identities.
  Existing financial create/edit/void, conflict/retry, access-loss and shared privacy
  checks remain. Added five-width live empty-state rendering and explicit Rp0 check.
- `node tests/e2e/branding.mjs`: passed in Chrome 156.0.8078.80. Tests 1440, 1024,
  768, 390 and 320px layouts, image decode, decorative alt, goal empty/restore,
  loading/error recovery, generic empty-month action, metadata, icon responses,
  all twelve original/optimized illustrations on light/dark and vector pixel parity.
  Uses the same PLAYWRIGHT_MODULE/CHROME_PATH overrides as the financial suite.
  Repeatable screenshots go to `test-results/branding/`; selected evidence is
  retained in `artifacts/branding/`.
- Existing `scripts/http-smoke.mjs`: passed against temporary local production
  server (entry redirects, sign-in/signup, signed-out direct action requests,
  no-store headers and callback validation).
- `git diff --check`: passed. Existing unrelated uncommitted changes preserved.

Browser automation and final build needed elevated execution after Windows sandbox
blocked Chrome loopback and a generated `.next` directory. Local-only runs passed.
The visual screenshot comparison initially caught compositor antialias differences;
comparison now uses deterministic Chrome canvas ImageData without relaxing equality.

## Screenshot evidence

All use isolated fixture/sample data. Before screenshots came from the existing
production build before this milestone's component changes; after screenshots use
the same financial suite and matching fixture journey. Empty-state screenshots
show the newly illustrated first-use view separately.

- [Desktop before](../artifacts/branding/before-desktop.png) /
  [desktop after](../artifacts/branding/after-desktop.png)
- [Mobile before](../artifacts/branding/before-mobile.png) /
  [mobile after](../artifacts/branding/after-mobile.png)
- [Empty desktop](../artifacts/branding/empty-desktop.png) /
  [empty mobile](../artifacts/branding/empty-mobile.png)
- [Shared empty, mobile](../artifacts/branding/shared-empty-mobile.png)
- [Goals empty, mobile](../artifacts/branding/goals-empty-390.png)
- [Light contact sheet](../artifacts/branding/asset-audit-light.png) /
  [dark contact sheet](../artifacts/branding/asset-audit-dark.png)
- [Chrome 16px/32px icon rendering](../artifacts/branding/icons-chrome.png)

## Boundaries and checks skipped

No Safari/Firefox or visible browser-tab chrome capture; ICO decoding and generated
head links were checked in Chrome. No production performance or hosted Auth/RLS
claim. No full dark theme exists; dark-surface asset rendering was checked without
adding one. Live goal/search features remain outside this milestone; completion
asset is reserved. Native multi-connection concurrency needs its dedicated local
PostgreSQL fixture. No deployment, remote migration, next milestone or release
approval. Roadmap financial milestone boxes remain unchanged.

## Milestone-only review — 2026-11-10

Reviewed only Part 5.5 changes, including their callers, private-view boundaries,
existing state components, source assets and regression tests. Pre-existing Part 5
changes in the same working tree were preserved. No introduced functionality,
financial calculation, authorization/RLS, TypeScript, dependency or design-system
regression found. No application fix was required. Review added focused browser
checks for brand-link navigation back to authorized workspace discovery and signup
branding/reflow at 1440/1024/768/390/320px.

Fresh verification: lint, typecheck, production build, 37 unit tests, 18 isolated
role/database tests, financial browser suite, branding browser audit and local HTTP
integration all passed. Four embedded raster/optimized WebP pairs were independently
compared as exact RGBA pixels; icon dimensions and documentation links passed.
Financial checks retain zero-balance visibility, transfer exclusion, refunded-zero
state, conflict/retry handling, identity-change draft clearing and shared isolation.
No schemas, RLS policies, financial calculations or package dependencies changed.

Limits unchanged: one native multi-connection database test skipped without a
dedicated TEST_DATABASE_URL; no Safari/Firefox, visible tab-chrome capture or hosted
acceptance. Live search/goals and a completed-goal view remain outside this visual
milestone. Completion artwork is reserved. No next-milestone work or deployment.
