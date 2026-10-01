# IRAM Perfume Website

**Repo:** https://github.com/itsnotme007/iram-perfume.git
**File:** `C:\Users\Fateh\Downloads\models\index.html` (HTML/CSS/JS inline, ~7300 lines)
**Logos:** `C:\Users\Fateh\Downloads\models\logos/`
**Reviews:** `C:\Users\Fateh\Downloads\models\reviews/`

## Pricing Formula
```
3ml  = CEILING(3 × (30ml/30 + 9),  5); if result ends in 0 → -1
5ml  = CEILING(5 × (30ml/30 + 6),  5); if result ends in 0 → -1
8ml  = CEILING(8 × (30ml/30 + 4),  5); if result ends in 0 → -1
10ml = CEILING(10 × (30ml/30 + 4), 5); if result ends in 0 → -1
20ml = CEILING(20 × (30ml/30 + 2),5); if result ends in 0 → -1
30ml = base price
```
Column order in the table: `3ml, 5ml, 7.5ml, 10ml, 20ml, 30ml` (the 7.5ml column is priced with the 8× rule above).
Rows are `6 × <td class="size-cell">`; index-based lookups use `cells[5]`/`prices[5]` for 30ml.

## Brands (19)
**Designer:** Davidoff, Mancera, Jaguar
**Middle Eastern:** Afnan, Ahmed Al Maghribi, Arabiyat Prestige, Armaf, Assaf, French Avenue, Ibraq, Lattafa, Laverne, Nusuk, Paris Corner, Pendora Scents, Rasasi, Rayhaan, Riiffs, Swiss Arabian

## Conventions
- Gender tags: Men (blue), Unisex (purple), Women (pink)
- SOLD OUT = red + strikethrough prices
- COMING SOON = green + grey prices (prefixed with ₹)
- Data attributes: scent, season, occasion, time, weather, mood, family, brand, price
- Filter UI: `#filterBar` (desktop popover) + `#pcToolbar`/sticky ≤1023px (mobile sheet); one reusable `#filterPanel` is moved between `#filterPanelHost` and `#pcFilterBody`
- Filter options: 10 groups of `.filter-btn` inside `#filterPanelBody` — 9 `role="radiogroup"` (Brand, Gender, Scent, Season, Occasion, Time, Weather, Mood, Family) + a Price group whose `.filter-opts` is the radiogroup (single-select per category, AND across); state lives in `window.__filterState` (10 keys incl. `price`), applied by `applyFilter()`. There is deliberately **no "New Arrivals" filter** — `data-added` is kept only for the NEW badge and the Newest First sort.
- Brand group is injected at runtime (`insertAdjacentHTML('afterbegin')`, id `filterBrandGroup`) from `brandCounts`; `#pcBrandBtn` in `#pcToolbar` opens the sheet/panel and scrolls to it.
- Price filter: dual `#priceMin`/`#priceMax` range sliders (step 5, bounds auto-derived from `data-price` on `.frag-cell`), state `f.price = 'all' | '<min>-<max>'`, matched numerically via `window.__priceMatch` (not the comma-split path); label via `window.__priceLabel`. `data-price` = cheapest *available* size price, falling back to any size price (so all 151 cells carry it); `.frag-card` inherits it through the generic `data-*` copy loop.
- URL sync: `window.__syncUrl` rewrites `?brand=…&price=…&sort=…` via `history.replaceState` on every `__onFilterChange` / sort `change`, and the URL-sync IIFE replays params on load (clicks filter buttons, `__setPriceRange`, `__applySort`).
- Filter results/count read from `.table-wrap .frag-cell` (unfiltered) and `#filterResults tbody tr` (filtered); keep `#filterBar` id for navSearch + seo-gen
- Cart uses `window._products` registry keyed by `brand|frag`
- Sort: `#filterSort` (desktop) and `#pcSort` (mobile) are two selects over one `applySort()`; it reorders `.frag-cards` (mobile grids) and, above 1023px, the product rows inside each brand block of `.frag-table` (`.brand-sep` + `.brand-cell` move with the block, so keep block sizes intact)
- v2.0 design: #FAF9F7 light bg, #D4AF37 gold accent

## Mobile Redesign (Phases 2/4/5/6)
- **Hero carousel:** `.mobile-hero` wraps `#heroTrack` (flex `translateX`) + `#heroDots`; 3 `.hero-slide`, slides 2–3 are `aria-hidden="true"` `data-hero-jump`. 5s autoplay, pause on hover/focus/visibility, touch swipe, `prefers-reduced-motion` disables autoplay+transition. Mobile-only (`display:none` >768px).
- **Featured scroller:** `#featuredRail`/`#featuredTrack` uses `.feat-card` (NOT `.frag-card` — tests count `.frag-card`=151). Picked from `.frag-card` (4 newest by `data-added` + cheapest fill, 12 total); click scrolls to card + opens product sheet. Hidden >768px.
- **Bottom nav:** 6 items `#navHome #navSearch #navBrands #navCompare #navWishlist #navCart`. Real ids in markup (no JS relabel). `#navBrands` → `#brandSection`. `window.__setNavActive(id)` exists.
- **Compare:** `data-cmp` button `.pc-cmp` (under `.pc-wish`), localStorage `iram_compare` (max 4, FIFO overflow), sheet `#pcCmpSheet` with `.lt-row` rows + spec table. `window.__openCompare`, `window.__syncCompare`.
- **Wishlist:** localStorage `iram_wishlist` (array of `data-product` slugs), sheet `#pcWishSheet` with Move to cart / Remove. `window.__openWishlist`, `window.__syncWishlist`. Both sheets share `#pcListOverlay`.
- **Cart bar:** `#mobileCartBar` has `#mobileCartThumbs` (≤3 bottle PNGs + `+N`), summary bumps on change.
- **Delivery partner picker:** `#shipPartners` in the cart drawer footer (radio group `shipPartner`, shown only when cart has items). `PARTNERS = tirupati/dtdc +0, xpressbee +20, delhivery +40, bluedart +80`; persisted in `localStorage['iram_delivery']` (default `tirupati`). Shipping = `baseShipping(sub) + fee` where `baseShipping = sub>=999 ? 0 : 100` — so ₹999+ is still FREE with Tirupati/DTDC, and below ₹999 the partner fee stacks on the flat ₹100. Row label shows `Shipping · <name> (+₹N)`; Copy Order/WhatsApp text includes `Delivery partner:`.
- **Qty stepper:** product sheet `#pcQtyMinus/#pcQtyVal/#pcQtyPlus`, 1–99; `__iramAddToCart(brand,frag,size,price,qty)` takes a 5th qty arg.
- **Trust badges:** `.pc-trust` `<ul>` in product sheet. **Rating:** `.pc-rating` (store-level 5.0, links to `#reviewsGrid`, `[data-close-sheet]` closes the sheet) in product sheet hero + reviews header.
- **Toast:** `window.__toast(msg,'ok'|'err')` → `#toastRoot`, auto-dismiss 3.2s, max 4. Fired by add-to-cart, clear cart, wishlist toggle, compare toggle.
- **Announcement:** `#announceBar`, `sessionStorage['iram_announce_dismissed']`, rotates 3 messages/6s, sets `--announce-h` (fixed top ≤768px; body/header/toolbar offsets derive from it).
- **Skeleton:** `.pc-ph` has a looping shimmer (`phShimmer`), reduced-motion disables it.
- **Search:** fuzzy (substring → subsequence → Levenshtein ≤2/3 per word) ranking exact-first; recent searches `iram_recent_searches` (max 6) rendered as `.srch-chip` when input is empty. `pushRecent` fires on result pick.
- **PWA:** `manifest.webmanifest` linked in head; `404.html` (styled, links to `/iram-perfume/`). `theme-color` already present.
- **Hamburger sidebar** (`#mobileMenu` > `.mobile-menu-panel`) has **no brand kicker** — the `IRAM Perfume` `<p class="mobile-menu-kicker">` and its CSS were removed; links start at the panel's 24px padding.

## Gotchas
- Cart validator expects **6** prices per product (6 size columns); `sizes` arrays in cart code are also 6 entries.
- `prodOf(id)` in the list-sheet IIFE handles both `brand|frag` pids and `data-product` slugs; `thumbOf` resolves via the `.frag-card[data-pid]` / `[data-product]` lookup and returns `''` if not found (never build a slug by hand — it 404s).
- Desktop `.filter-panel` height is clamped on open by `fitPanel()` — if you change the announce bar or header, that still self-adjusts via `host.getBoundingClientRect()`.
- `node seo-gen.js` is idempotent **and date-proof**: 3 consecutive runs are byte-identical across all 160 outputs, and a run with the clock moved to tomorrow produces byte-identical output too (verified with a preload that shifts `Date`). Dates come from `content-dates.json` (committed) — `datePublished` is fixed at `2026-09-10` per article, `dateModified` and sitemap `<lastmod>` bump only when a page's content signature changes. Never hand-strip blank lines after a run, and never delete `content-dates.json` — that re-stamps every page with today.

## Bottle Images
- "images/bottles/<slug>.jpg" = source photo; "images/bottles/<slug>.png" = **transparent-background cutout (RGBA)** — always ship the PNG
- Detail pages use <img src="../images/bottles/<slug>.png" alt="<name> bottle" style="max-width:220px;border-radius:12px;margin:16px 0;display:block">
- node seo-gen.js prefers .png, falls back to .jpg (checks images/bottles/ at build time)
- Cutout rules: bottle only (no box/packaging), tight crop, longest side 1024px, feathered alpha, no white fringe
