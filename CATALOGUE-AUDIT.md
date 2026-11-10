# IRAM Perfume Catalogue Audit

Branch: `codex/catalogue-image-audit`

## Fragrance Name Corrections

The catalogue already uses the canonical brand spelling **Swiss Arabian**. “Swizz Arabian” in the brief is treated as a typo; Musk 07 remains under Swiss Arabian. Fragrantica confirms the product as **Musk 07 by Swiss Arabian**.

| Website Name | Correct Fragrantica Name | Brand | Suggested Correction |
|---|---|---|---|
| Man in Black EDP | Man In Black Eau de Parfum | Bvlgari | Use the full concentration name in long-form copy; retain the existing short catalogue ID. |
| CDN Intense LTD Edition | Club de Nuit Intense Man Limited Edition Parfum | Armaf | Use the full variant name in long-form copy; retain the existing short catalogue ID. |
| The Musk 07 / Swizz Arabian | Musk 07 / Swiss Arabian | Swiss Arabian | Keep the current catalogue spelling: Musk 07 by Swiss Arabian. |

All other requested names were checked against the matching Fragrantica identity and do not need a catalogue-ID change. In particular, **Karus Gold Absolu**, **La Di Da For Him**, and **Privè Platinum Silver** are the relevant names; “Ikarus” and “Prive Platinum Silver” in the brief are shorthand/typo variants.

## Image Quality & Suitability Issues

The requested products were downloaded from fresh product-image sources, converted to centred PNG cutouts, and optimized into the catalogue’s WebP and 500px variants where applicable. The old assets were replaced without changing prices, stock, product IDs, or ordering data.

| Fragrance | Current Image Issue | Recommended Replacement | Priority |
|---|---|---|---|
| Man In Black EDP | Previous image needed a fresh, clean bottle asset. | Fresh Bvlgari product photo with transparent cutout. | High |
| Montblanc Individuel | Previous image needed replacement and consistent crop. | Fresh bottle photo, centred cutout. | High |
| Black Fume | Background/crop quality needed improvement. | Fresh bottle photo, transparent cutout. | High |
| Blu Oud | Previous image needed a new bottle source. | Fresh bottle photo, transparent cutout. | High |
| Kaaf | Previous image needed a cleaner product asset. | Fresh bottle photo, transparent cutout. | High |
| Kaaf Noir | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Laathani | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Ajmal Wave | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Mahd Al Dhahab | Previous image needed a cleaner crop. | Fresh bottle photo, transparent cutout. | High |
| Kohl Opulence | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| La Di Da For Him | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Kohl Luminous | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Rihla | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Nisma | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Club de Nuit Urban Man Elixir | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Club de Nuit Iconic | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Tres Nuit | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| CDN LTD Intense | Previous image needed replacement. | Official Armaf product asset, transparent cutout. | High |
| CDN Elite | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Odyssey Homme | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Blueberry Musk | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Golden Amber | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Shiyaaka Sky | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Karus Gold Absolu | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Onyx Gold | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Fearless | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Slow Living | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Reflection Elixir | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Rifaqaat Adorn | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Hawas OG | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Hawas Black | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Hawas Boa | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Momento | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Momento Liquid Gold | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Prive Platinum Silver | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Opulence of Dubai | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |
| Sharaf Divine | Previous image needed replacement. | Fresh bottle photo, transparent cutout. | High |

## Validation

- 37 requested bottle assets were refreshed, including both Momento variants.
- PNG cutouts were generated at or below the existing 1024px longest-edge limit; no low-resolution source was artificially enlarged.
- WebP and 500px variants were regenerated through `tests/optimize-images.js`.
- The Musk 07 catalogue entry remains under Swiss Arabian and was not duplicated under another brand.
- No unrelated product data or UI was changed in this audit branch.

References used for identity checks included [Fragrantica Musk 07](https://www.fragrantica.com/perfume/Swiss-Arabian/Musk-07-72630.html), [Fragrantica La Di Da For Him](https://www.fragrantica.com/perfume/Arabiyat-Prestige/La-Di-Da-For-Him-115530.html), [Fragrantica CDN Limited Edition](https://www.fragrantica.com/perfume/Armaf/Club-de-Nuit-Intense-Man-Limited-Edition-Parfum-77861.html), and [Fragrantica Privè Platinum Silver](https://beta.fragrantica.com/perfume/Riiffs-Perfumes/Prive-Platinum-Silver-98132.html).
