# IRAM Perfume Website

**Repo:** https://github.com/itsnotme007/iram-perfume.git
**File:** `C:\Users\Fateh\Downloads\models\index.html` (HTML/CSS/JS inline, ~1590 lines)
**Logos:** `C:\Users\Fateh\Downloads\models\logos/`
**Reviews:** `C:\Users\Fateh\Downloads\models\reviews/`

## Pricing Formula
```
3ml  = CEILING(3 × (30ml/30 + 9),  5); if result ends in 0 → -1
5ml  = CEILING(5 × (30ml/30 + 6),  5); if result ends in 0 → -1
8ml  = CEILING(8 × (30ml/30 + 4),  5); if result ends in 0 → -1
20ml = CEILING(20 × (30ml/30 + 2),5); if result ends in 0 → -1
30ml = base price
```

## Brands (19)
**Designer:** Davidoff, Mancera, Jaguar
**Middle Eastern:** Afnan, Ahmed Al Maghribi, Arabiyat Prestige, Armaf, Assaf, French Avenue, Ibraq, Lattafa, Laverne, Nusuk, Paris Corner, Pendora Scents, Rasasi, Rayhaan, Riiffs, Swiss Arabian

## Conventions
- Gender tags: Men (blue), Unisex (purple), Women (pink)
- SOLD OUT = red + strikethrough prices
- COMING SOON = green + grey prices (prefixed with ₹)
- Data attributes: scent, season, occasion, time, weather, mood, family
- Filter bar: `.toolbar` div, `.filter-bar{position:sticky;top:80px;z-index:50}`
- Cart uses `window._products` registry keyed by `brand|frag`
- v2.0 design: #FAF9F7 light bg, #D4AF37 gold accent

## Bottle Images
- "images/bottles/<slug>.jpg" = source photo; "images/bottles/<slug>.png" = **transparent-background cutout (RGBA)** — always ship the PNG
- Detail pages use <img src="../images/bottles/<slug>.png" alt="<name> bottle" style="max-width:220px;border-radius:12px;margin:16px 0;display:block">
- node seo-gen.js prefers .png, falls back to .jpg (checks images/bottles/ at build time)
- Cutout rules: bottle only (no box/packaging), tight crop, longest side 1024px, feathered alpha, no white fringe
