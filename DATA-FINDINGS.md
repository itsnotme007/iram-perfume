# DATA-FINDINGS.md — Catalogue Data Audit

**Date:** 2026-10-05 (Phase 2.3 of the storefront overhaul)
**Scope:** `products.json` (155 products), the generated output (`index.html` catalogue + cards, `fragrance/*.html`, `sitemap.xml`), and filter-taxonomy coverage.
**Method:** scripted audit over `products.json` + rendered markup, cross-checked with `node tests/render-fidelity.js`, `node seo-gen.js` idempotency runs, and the Playwright suite (24 passed / 10 skipped).

---

## 1. Snapshot

| Metric | Value |
|---|---|
| Products | 155 (9 Designer + 146 Middle Eastern) |
| Brands | 29 (5 Designer, 24 Middle Eastern) |
| Gender | Men 78 · Unisex 72 · Women 5 |
| Status | In stock 145 · Sold out 9 · Coming soon 1 |
| Price range | ₹59 – ₹2,599 (30ml base ends in 0 only for Rayhaan Nocturno = 750) |
| NEW badge data | 28 products have `added` (2026-09-20 → 2026-10-04); 8 fresh inside the 7-day window today |

## 2. Verified healthy (no action needed)

- **Pricing formula:** 0 deviations across all 155 × 5 computed sizes using the documented `CEILING(x, 5)` + "−1 if ends in 0" rule; no computed price ends in 0; no non-integer prices; every product has all 6 prices.
- **Uniqueness:** no duplicate keys, slugs, or cross-brand names; all slugs lowercase/kebab-safe; `url` = absolute canonical (`https://itsnotme007.github.io/iram-perfume/fragrance/<slug>.html`) for all 155.
- **Images:** 155/155 bottle PNG cutouts present (0 jpg-only, 0 missing); every referenced `brandImg` file exists in `logos/`.
- **Parity:** static `.frag-card[data-gender]` counts match `products.json` exactly (78/72/5); `render-fidelity.js` reports EXACT tbody equality vs the pre-render markup; `--make-data` round-trip is byte-stable; seo-gen re-runs are byte-identical (incl. forced-CRLF test).
- **Availability:** all 9 sold-out products have every size struck; the single coming-soon product is all-`coming`; `availability` schema URLs match status (InStock/OutOfStock/PreOrder).
- **Taxonomy:** `occasion` and `mood` data tokens are now fully covered by filter buttons (Phase 2.2 added Gym + Confident/Energetic/Mysterious/Romantic/Rich). Season/Time/Weather tokens: fully covered.

## 3. Findings (report-only — product data intentionally untouched)

### 3.1 Seven products have no external reference links — medium
| Product | links-cell |
|---|---|
| Albait Aldimashqi — L'Nuit, Y EDP, Gentlemen Reserve Privée, Special Ombre Leather | empty cell |
| Ajmal — Wave | empty cell |
| Arabiyat Prestige — Oud Al Layal Aswad | empty cell |
| Arabiyat Prestige — Midnight (Oud al Layl) | `<span class="preview-trigger">Preview</span>` only (→ `links=''`, `linksRaw` keeps the span) |

Their detail pages and cards show no References row. **Recommendation:** add Fragrantica/Parfumo URLs in the catalogue table (then `node seo-gen.js --make-data`).

### 3.2 Riiffs Freeze in Flames — Parfumo-only — low
Only product with links but no Fragrantica reference (single Parfumo link). **Recommendation:** add its Fragrantica URL if available.

### 3.3 `inspired` entity encoding is inconsistent — low (SEO-visible)
Three products reference Dolce & Gabbana, encoded three ways:
- `Ahmed Al Maghribi|Kaaf Noir` → `K by Dolce & Gabbana` (raw `&`)
- `Riiffs|Portofino Noir` → `The One Dolce & Gabbana` (raw `&`)
- `Lattafa|Rave Now Rouge` → `K by Dolce &amp; Gabbana` (entity)

Raw `&` renders fine in HTML text, but `&amp;` inside JSON-LD appears literally as "&amp;" in rich results. **Recommendation:** normalize all three to plain `&` (safe in both HTML text and JSON-LD).

### 3.4 Per-ml price inversion at the 5 → 7.5ml step — medium (copy accuracy)
For **107 of 155** products the 7.5ml column (priced with the 8× rule) costs *more per ml* than the 5ml column, because the inversion grows with the 30ml base price (e.g. Bvlgari Man in Black Parfum: 5ml ₹79.8/ml vs 7.5ml ₹82.5/ml). The detail-page claim "per ml gets cheaper as size grows" is therefore wrong at that one step for most products; 10 → 20 → 30ml still decrease. **Recommendation (pricing rules unchanged by policy):** soften the copy to "cheaper per ml in larger sizes" or review the 7.5ml formula term in a future pricing decision.

### 3.5 Aggregate `status` hides partial size availability — informational
3 products are `instock` but partially struck:
- Afnan Supremacy Incense — only 3/5ml available (10/7.5/20/30 struck)
- Lattafa Raghba Wood Intense — only 3/5ml available
- Ahmed Al Maghribi Leather — only 30ml struck

Per-size rendering handles this correctly (strikethrough only on struck sizes); just note `status=instock` ≠ "all sizes in stock" for any consumer of the field.

### 3.6 Mykonos brand has no logo — low
Both Mykonos products have `brandImg: ''` (no `<img>` rendered in cards/table). **Recommendation:** add `logos/mykonos.png` and set `brandImg` in the catalogue table.

### 3.7 `tags` is always `[]` — informational
The legacy `tags` field carries no values on any product (only gender/status/NEW ever lived there). Kept for schema round-trip stability; harmless.

### 3.8 Scent/Family filter buttons are curated subsets — informational (by design)
60 scent tokens exist in data vs 8 single-token buttons (Fresh/Aquatic/Citrus/Woody/Sweet/Spicy/Aromatic/Oud); 20 family tokens vs 13 buttons. This is intentional — the approved Phase 2.2 scope only added options where the *whole category* had data tokens with no button (Gym, and the five moods). Do not "complete" these two lists without a product decision: each additional button changes result UX.

### 3.9 Rayhaan Nocturno 30ml base = ₹750 ends in 0 — informational
The "−1 if ends in 0" rule applies to the five *computed* sizes only; the 30ml base is free-form. No computed price ends in 0. Not a violation.

## 4. Checks that specifically came back clean

- U+FFFD, `inspired by Original`, `A aromatic`, `a aromatic`, `147 fragrances` → 0 hits (case-sensitive, across `index.html` + `fragrance/` + `articles/`).
- ` a <vowel>` grammar sweep → only the correct "a useful".
- 155 hero bottle `<img>` lines present in `fragrance/`.
- No missing/blank mandatory fields (`key`, `prices`, `statusPerSize`, `slug`, `scent`… `family`) anywhere.

## 5. Hosting: HTTPS & www redirect (Phase 2.5, report-only)

Measured live 2026-10-05 with `curl -I` / `Resolve-DnsName` against `itsnotme007.github.io`:

| Check | Result |
|---|---|
| `http://itsnotme007.github.io/iram-perfume/` | **301 → `https://…`** (GitHub Pages "Force HTTPS" enabled) |
| `https://itsnotme007.github.io/iram-perfume/` | **200** |
| `https://www.itsnotme007.github.io/…` | **TLS certificate error** (curl exit 60): GitHub's `*.github.io` cert covers only one label, not `www.itsnotme007` |
| `http://www.itsnotme007.github.io/…` (and `-k` https) | **404** — DNS resolves via the `*.github.io` wildcard, but no site/CNAME is bound to that host |

**Conclusions:**

- There is **no live duplicate host**: the `www.` variant fails TLS in browsers and 404s without it, so users and crawlers cannot reach a second copy of the site. Nothing exists to redirect *from*, and GitHub Pages cannot issue a cert (or bind a redirect) for a two-label `*.github.io` host — that only becomes possible with a **custom domain** (apex + `www` CNAME, both covered by Pages' Let's Encrypt cert).
- Repo-side hygiene is already correct: every page emits an absolute canonical on the apex HTTPS origin (homepage `index.html:11`, all 155 fragrance pages + 4 articles from `seo-gen.js` `fragShell`), and there are **no** `http://` or internal `www.` links anywhere (only external `www.fragrantica.com` / `www.parfumo.com` and `w3.org`/`schema.org` XML namespaces).
- **Recommendation:** no change for a `*.github.io` site — keep the canonicals and HTTPS-only internal linking as-is. If a custom domain is ever added, then bind `www` in DNS/Pages settings and pick one canonical host (301 the other, or rely on the canonical tags already in place). Also re-verify `BASE` in `seo-gen.js:15` at that time.
