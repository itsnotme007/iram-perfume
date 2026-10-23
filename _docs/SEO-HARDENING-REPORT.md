# SEO & Security Hardening — Final Report

Branch: `seo-hardening` (11 commits, **local only — not pushed**). Base: `main`.
CNAME `iramperfume.in` untouched; `<!--PRODUCTS_JSON-->` / `<!--APP-->` anchors intact; `content-dates.json` kept.

## Phase status

| # | Phase | Status | Commit |
|---|-------|--------|--------|
| 1 | Security/hygiene: remove `puppy.log` (logged-in bot token), vendor junk, dead image sources; docs → `_docs/`; repo-relative paths in AGENTS.md; CI workflow | Done | `a330f04` |
| 2 | Product schema: one `Offer` per size (sku, INR, priceValidUntil, shippingDetails, seller), bottle image + `imgDims` on product pages, brand breadcrumb, homepage ItemList → ListItem only, Organization/WebSite `@id` + square logo, article publisher logo | Done | `449e7d5` |
| 3 | On-page SEO: shared `assets/page.css`, keyword H1 (`IRAM Perfume — Perfume Decants in India`), absolute-root internal links (`/` not `../index.html`), 189× 1200×630 OG cards (`npm run og`) used as `og:image`, image dimensions on review images, softened unverifiable claims | Done | `3307ec2` |
| 4 | Crawl: sitemap without `<priority>` (233 URLs incl. brand pages), richer `llms.txt` (10ml, price range, brand pages, guides), robots LLM comment, IndexNow key file + `npm run indexnow` | Done | `ebdee1a` |
| 5 | Content depth: per-ml price column, "How to wear" block (season/occasion/time/weather/family) linking 4 guides, product footers link guides, brand pages split family tags | Done | `3b36e51` |
| 6 | Brand landing pages: 37 pages (`brands/<slug>.html`) with CollectionPage + BreadcrumbList + FAQPage, product grid, data-driven intro/FAQ, in sitemap + llms.txt; trust/return pages **skipped by owner decision** (no TODO placeholders published) | Done | `510d059` |
| 7 | Single source of truth: `config.js` (store facts + free-shipping maths) required by seo-gen, read by `assets/app.js` (`window.IRAM_CONFIG`), loaded before app.js on the homepage; audit guards the wiring | Done | `f12062b` |
| 8 | Verification: `tests/seo-audit.js` (link integrity, canonical/title/desc uniqueness, sitemap coverage, schema-price parity, config wiring, no `TODO(owner)`), brand + breadcrumb Playwright tests, Lighthouse incl. brand URL, a11y regressions fixed | Done | `6499745`, `6c75b2f` |

## Verification (all green at `6c75b2f`)

- `node seo-gen.js` ×3 → **byte-identical** (incl. `content-dates.json`, sitemap, page.css)
- `node tests/seo-audit.js` → **234 pages, 233 sitemap URLs, 0 failures** (26 warnings = titles >70 chars on long product names, accepted)
- `node tests/parse-check.js` → 9 script blocks, 0 invalid, 0 U+FFFD
- `node tests/render-fidelity.js` → tbody0 16 / tbody1 173 **EXACT**
- `node tests/console-check.js` → **CLEAN**
- `npx playwright test` → **32 passed / 10 skipped** (baseline was 28/10; +2 brand tests × 2 devices)
- Lighthouse (mobile, `node tests/lighthouse.js a11y-fix2`):

| Page | Perf | A11y | Best practices | SEO |
|------|------|------|----------------|-----|
| home | 97 | **100** | 96 | 100 |
| product | 100 | **100** | 96 | 100 |
| brand | 100 | **100** | 100 | 100 |

## A11y fix found during Phase 8

A fresh Lighthouse run surfaced a homepage a11y regression (100 → 93) caused by pre-existing issues, now fixed in `6c75b2f`:
- `.site-footer` was styled **only** in `desktop.css`, so below 1024px it rendered unstyled (default blue links on dark bg) → base styles added to `app.css`.
- Dark-theme pressed `Grid/Table` toggle was light-on-light-blue → dark text override.
- Reference links (`.card-links a`) and footer links were 13px tall → ≥24px tap targets.
- Breadcrumb links were colour-only → underlined (in `PAGE_CSS`).

## Watch items (not blocking)

- **Home CLS 0.023** (was 0.001 historically; still "good" <0.1) — shifts attributed to `#featuredRail`, i.e. content above it changing height during font/hero load. Introduced by post-`round15` work, not by these phase commits; worth a look if it crosses 0.1.
- **Best practices 96** = `font-size` (10–11px UI text) — documented design decision in `_docs/FINAL-REPORT.md`.
- 26 title-length warnings: long fragrance names (e.g. "Badee Al Oud Amethyst Fusion"); deliberate, keywords kept front-loaded.

## Owner actions required

1. **Revoke the leaked Telegram bot token** (it was in `puppy.log`, now removed but still in git history) — BotFather → `/revoke`. Rotate the `.env` token in `Puppy_tg_bot/` (folder is gitignored, untouched).
2. **Push / open PR** for `seo-hardening` (11 local commits, not on origin yet). CI (`.github/workflows/check.yml`) runs idempotency + seo-audit + parse + render + console-check + gitleaks.
3. **After deploy:** `npm run indexnow` (posts 233 URLs; `--dry` previews), then request indexing in Search Console for `/`, sitemap, and a few brand pages.
4. **Review** unreferenced review screenshots in `reviews/` for PII before publishing (flagged earlier, not deleted).
5. Confirm the **No.100 badge claim** is still accurate (kept as-is; verify before peak season).
6. Optional: trust/return-policy pages were **skipped per instruction** — if wanted later, add them with owner-approved facts (no invented policies).
