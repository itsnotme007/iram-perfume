# IRAM Storefront Overhaul — Final Report (Phase 6)

**Branch:** `storefront-overhaul` · **Commits:** `088a625` → `a9e4962` (12) · **Scope:** the approved 6-phase plan (bugs → data → SEO → performance → UX/a11y → report). No framework rewrites, no price/availability changes, visual design preserved.

---

## Scores

| Metric (Lighthouse, mobile) | Before | After |
|---|---|---|
| Home performance | **41** (LCP 29.3s, CLS 0.365) | **98** (FCP 1.1s, LCP 2.1s, TBT 120ms, CLS 0.001) |
| Home accessibility | 93 | **100** |
| Home best-practices | 96 | 96 (see TODOs) |
| Home SEO | 100 | 100 |
| Product page performance | 76 (LCP 7.8s, CLS 0.183) | **100** (FCP 0.7s, LCP 1.2s, CLS 0) |
| Product accessibility | 100 | 100 |
| Playwright suite | baseline 24 passed / 10 skipped | **24 passed / 10 skipped** |
| Battery greps (U+FFFD, `inspired by Original`, `A/a aromatic`, `147 fragrances`) | — | **0 hits** across index.html + 155 fragrance pages + 4 articles |
| seo-gen idempotency | — | byte-identical across repeated runs; CRLF-in → LF-out (regen-after-checkout safe) |

---

## What was done

### Phase 0 — Test foundation (`088a625`)
Playwright suite (desktop + mobile), static test server, Lighthouse harness.

### Phase 1 — Bug fixes (`9ca2529`)
Cart integrity, shipping rules (`FREE_SHIP_MIN`/`QTY`), global sort consistency.

### Phase 2 — Data & catalogue
- **2.1a/2.1b** (`87d3e38`, `353cf89`): `products.json` (155 products) is the single source of truth; seo-gen renders the two catalogue tbodies, the mobile `.frag-cards` grids and `window.__PRODUCTS` from it. Render-fidelity test proves byte-exact regeneration.
- **2.2** (`04368cc`): added the missing Gym occasion + five mood filter options (additive only).
- **2.3** (`078e8af`): `DATA-FINDINGS.md` catalogue audit (brand list corrected in AGENTS).
- **2.4** (`cc8bb3d`): homepage CSS/JS extracted to cache-busted `assets/app.css` / `assets/app.js`; seo-gen re-hashes `?v=` every run.
- **2.5** (`d61ec3b`, report-only): HTTPS forced (301 ✓); apex canonicals on all 163 pages; `www.` host has no valid TLS cert → no live duplicate, nothing to redirect until a custom domain exists.

### Phase 3 — SEO (`420ea91`)
- Full OG/Twitter image + type + site_name on every page; fragrance pages share the bottle PNG, articles the og-image.
- Homepage title 100→69 chars, description 155 rendered; fragrance titles/length-budgeted descriptions (≤160) with fit-checked inspired lines; `capLine()` for sentence-initial `art()`.
- Article JSON-LD image aligned + 2-level breadcrumb.

### Phase 4 — Performance (`e53e120`)
- **Image pipeline** (`node tests/optimize-images.js`, idempotent): bottle PNGs capped 1024 + `.webp` + `-500.webp` srcset siblings; 28 brand logos → `.webp`; grid JPGs capped 1400; `logo-banner.png` (200px header), `favicon.png`, `apple-touch-icon.png`. Three mislabelled assets fixed (2 JPEGs with `.png` names → JPEG reader in `imgDims`; 1 AVIF → converted to real PNG).
- **srcset** wired through `initImg` (cards, `sizes=152px`) and the featured rail (`sizes=138px`).
- **CLS 0.365 → 0.001**: pre-reserved `.featured-rail` (248px) and `#mobileBrandTrack` (89px) heights with `<noscript>` overrides; `--announce-h` defaults to 29px; featured-rail + brand-chip builders moved to an inline script that runs before first paint (first paint can land mid-download); brand-chip imgs carry width/height.
- Head: hero preload + `fetchpriority`, async font swap with `<noscript>` fallback, proper icons (never the 512px `logo.png`), hero/grid images sized, `serve.js` gzips like GitHub Pages.

### Phase 5 — A11y (`a9e4962`) — home a11y 93 → 100
- Hero slides 2–3: `inert` in markup, toggled by the carousel with `aria-hidden` (fixes focusable content inside `aria-hidden`).
- Removed `aria-label` from `.pc-media` and `.feat-card` so accessible names come from the visible content (fixes 166 label-content-name mismatches).
- Badge contrast: NEW (gold) and SOLD OUT (red) badges now use dark text (`#1a1a2e` / `#111`, ≥4.5:1) — badge background colors unchanged.

### Phase 6 — This report.

---

## Verification performed (each phase, and final)
`node seo-gen.js` ×2 byte-identical · `node tests/render-fidelity.js` EXACT (9 + 146 rows) · `node tests/console-check.js` CLEAN · `npx playwright test` 24/10 · `node tests/lighthouse.js` · battery greps 0 · CRLF stress test passed (never `git checkout -- index.html` — see AGENTS).

## Known limitations / TODOs (no action taken by design)
1. **Tiny UI text**: the Lighthouse `font-size` audit still reports 57.6% of text legible (10–11px chips, badges, prices). Enlarging is a design change — needs a product decision.
2. **Best-practices 96**: driven by `network-dependency-tree-insight` (diagnostic about the LCP request chain). Not a defect; fixing would require restructuring critical-request order further.
3. **`ibraq-sandalwood.png` is now a 201KB real PNG** (was 24KB AVIF-with-.png-extension). A future improvement: ship it as a proper `.avif` with a `<picture>` fallback.
4. **Right-side empty space** (reported earlier): not reproducible here; awaiting a screenshot to diagnose.
5. **Custom domain / www redirect**: no action until a domain is chosen (audit in DATA-FINDINGS §5).
6. **Lighthouse runs are local emulation** — re-check on the deployed GitHub Pages URL after push (gzip is mirrored by `tests/serve.js`, but real-world RTT differs).

## How to re-run everything
```
node seo-gen.js                 # regenerate (idempotent; bumps ?v= hashes)
node tests/optimize-images.js   # image pipeline (idempotent)
node tests/render-fidelity.js   # table/card byte-parity vs HEAD
node tests/console-check.js     # boot + interactions, fails on console.error
npx playwright test             # 24 passed / 10 skipped
node tests/lighthouse.js label  # LH JSON → tests/.lighthouse/
```
