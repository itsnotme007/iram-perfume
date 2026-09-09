# IRAM Perfume — SEO Setup Guide

Everything on this site is **already optimised for search engines and AI answer engines** (ChatGPT, Perplexity, Google AI Overviews, Bing Copilot). This guide is only for claiming the site in Google/Bing and monitoring it.

## What has already been done (Feb/Mar 2026 SEO pass)

- **127 individual fragrance pages** — one page per perfume (`fragrance/<slug>.html`) with Product + BreadcrumbList + FAQPage structured data, price, sizes, inspiration, tags and internal cross-links.
- **4 informational articles** (`articles/`) targeting real searches:
  - `summer-decants-under-500` — Top 10 Summer Decants Under ₹500 in India
  - `winter-date-night-decants-under-500` — 10 Best Winter Date-Night Decants Under ₹500
  - `decant-vs-full-bottle` — Decant vs Full Bottle guide (per-ml math)
  - `make-perfume-last-longer` — How to Make Perfume Last Longer
- **Homepage schema**: Organization, WebSite (+SearchAction/Sitelinks searchbox), ItemList (all 127 products, was only 28), FAQPage (10 questions/answers visible on the page too).
- **FAQ content** — real human questions now visible on the homepage and as FAQPage schema. This is the #1 thing that gets sites cited in AI answers.
- **AI crawler access** — `robots.txt` explicitly allows GPTBot, ChatGPT-User, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended.
- **`llms.txt`** — a plain-text index of the catalogue + articles, formatted for AI crawlers.
- **Sitemap** — `sitemap.xml` now lists all **132 pages** (homepage + 4 articles + 127 fragrances), each with `lastmod`.
- **Social/OG image** — `og-image.jpg` (1200×630) generated from the logo for link previews.
- **Keywords, title and meta descriptions** tuned for "perfume decants India", "perfume bottles on request", brand + juice names.

> **Keep in sync:** whenever you add/rename/delete a fragrance in `index.html`, re-run:
> `node seo-gen.js` (regenerates pages, sitemap, robots, llms.txt; fully idempotent).
> Commit and push the whole `models/` repo.

## 1. Deploy the changes

```bash
git add index.html robots.txt sitemap.xml llms.txt og-image.jpg fragrance/ articles/ seo-gen.js SEO-setup.md
git commit -m "SEO: per-fragrance pages, articles, FAQ schema, sitemap"
git push
```

The site updates on **https://itsnotme007.github.io/iram-perfume/** within a minute or two.

## 2. Google Search Console (free, ~15 min)

1. Go to **https://search.google.com/search-console** → sign in with any Google account (the same one that owns the GitHub repo is fine).
2. Click **Add property** → choose **URL prefix** → enter:
   `https://itsnotme007.github.io/iram-perfume/`
3. Verification options:
   - **HTML tag** (easiest): copy the `<meta name="google-site-verification" content="...">` line, paste it just before `</head>` in `index.html`, commit + push, then click **Verify**.
   - (Alternative) **HTML file** upload: download the `google<code>.html` file, drop it in the repo root, commit + push, then verify.
4. Once verified, on the left menu **Sitemaps** → enter `sitemap.xml` → Submit.
5. **Request indexing** for key pages: use the URL Inspection tool on the homepage, then `fragrance/mancera-cedrat-boise.html`, `articles/summer-decants-under-500.html`, etc. ("Request indexing" = ask Google to crawl now).
6. Wait 1–4 weeks for first impressions. Then watch **Performance** (queries, clicks) and **Enhancements → Rich results** (should show Product, FAQ, Breadcrumb).

## 3. Bing Webmaster Tools (optional, 2 min)

1. Go to **https://www.bing.com/webmasters** → sign in → **Import from Google Search Console** (one click, pulls everything including verification).
2. It inherits the sitemap automatically.

## 4. Helping AI engines cite you (the "AI answers" goal)

- The FAQPage + Product schema and `llms.txt` are already the strongest signals for AI answer bots.
- **Keep prices/descriptions accurate** — AI engines weigh factual consistency; mismatch hurts.
- **Add fresh content monthly** (new decants, new articles) — crawl freshness matters. After each update re-run `seo-gen.js` (updates `lastmod` in sitemap) and push.
- **Get backlinks**: perfume-community posts (r/DesiFragranceAddicts, Fragrantica forums), Instagram/YouTube reviews linking to the Guide articles, WhatsApp group shares. Backlinks are the single biggest ranking factor Google still uses.
- **One clear entity per page** — every fragrance page has exactly one Product schema and one canonical; never duplicate pages (`seo-gen.js` enforces this).

## 5. Optional quick wins later

- Custom domain (`iramperfume.in`) — better trust signals; keep a **redirect** from the github.io address.
- LocalBusiness/LiquorStore schema if a physical shop opens (contact, hours, address).
- AggregateRating — only once you collect verified customer reviews; Google requires real ratings.

---

**Timeline expectation:** fresh GitHub Pages domains with quality schema usually appear in Google in 1–4 weeks for exact-match queries like "Mancera Cedrat Boise decant India", and in AI answers (Perplexity/ChatGPT browsing) within the same window since those models fetch live URLs.