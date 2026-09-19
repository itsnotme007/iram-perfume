// seo-gen.js — IRAM Perfume SEO generator (idempotent)
// Reads index.html (source of truth), regenerates:
//   fragrance/<slug>.html (per-fragrance landing pages)
//   articles/<slug>.html (informational guides)
//   sitemap.xml, llms.txt, robots.txt
//   updates index.html: ItemList schema, FAQPage schema, visible FAQ block,
//   articles strip, frag-name anchors -> per-fragrance pages, title/desc/og
// Usage: node seo-gen.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const IDX = path.join(ROOT, 'index.html');
const BASE = 'https://itsnotme007.github.io/iram-perfume';
const PHONE_DISPLAY = '+91 93555 33509';
const PHONE_TEL = '+919355533509';
const EMAIL = 'perfumeiram@gmail.com';
const WA = 'https://chat.whatsapp.com/JSWEIoCsFd96wzlRAeaewe';
const IG = 'https://instagram.com/iram.perfume';
const TODAY = new Date().toISOString().slice(0, 10);
const waLink = t => 'https://wa.me/' + PHONE_TEL.replace('+', '') + '?text=' + encodeURIComponent(t);

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = s => {
  const n = parseInt(String(s).replace(/<[^>]*>/g, '').replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? null : n;
};
const slugify = s => String(s).toLowerCase()
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  .replace(/--+/g, '-').slice(0, 80);

// ---------------------------------------------------------------- FAQ data
const HOME_FAQS = [
  ['What sizes do you offer for perfume decants?',
   'IRAM Perfume offers decants in 3ml, 5ml, 7.5ml, 20ml and 30ml glass bottles for every fragrance in our catalogue. Pick the size from the price table — the price per ml drops as the bottle gets bigger, so 30ml decants are the best value.'],
  ['How is a decant different from buying a full perfume bottle?',
   'A decant is perfume poured from an original, genuine bottle into a smaller filled-at-cost glass vial. It lets you try an expensive designer or Middle Eastern perfume without paying for a 100ml bottle. You can test longevity, projection and how it sits on your skin before committing to a full bottle.'],
  ['Do you sell full perfume bottles too?',
   'Yes. We source genuine 30ml, 50ml and 100ml bottles for most fragrances in our catalogue on request. Full-bottle prices and availability are confirmed over WhatsApp before you pay.'],
  ['Do you provide free shipping on orders?',
   'Yes — shipping is free on all orders above \u20b9999 (minimum 2 decants). Orders below \u20b9999 are shipped at a flat \u20b9100.'],
  ['How do I place an order with IRAM Perfume?',
   'Pick your fragrances and sizes from the price list, then copy your cart or message us directly on WhatsApp at ' + PHONE_DISPLAY + ' or email ' + EMAIL + '. We confirm stock, payment and share the tracking number once dispatched.'],
  ['How long does delivery take across India?',
   'We ship all over India through a trackable courier. Most orders reach within 3\u20137 working days depending on the city. Orders above \u20b9999 ship free.'],
  ['How can I be sure the decants are authentic?',
   'Every decant is filled from an original, genuine perfume bottle we buy from trusted suppliers. We share photos, videos and opening proof of the source bottles on request before you order.'],
  ['What is your refund and returns policy?',
   'Please record an unpacking video of your parcel. Any claim for a damaged or incorrect order must include that unpacking video \u2014 without it, refunds or replacements cannot be processed.'],
  ['Do you issue an invoice for orders?',
   'Not yet — we are a small business and do not currently issue formal invoices. Your order is confirmed over WhatsApp and you receive the tracking number once dispatched. We plan to introduce invoices as we grow.']
];

// ------------------------------------------------------------- catalog parse
let s = fs.readFileSync(IDX, 'utf8');
const blocks = [...s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
const itemListBlock = blocks.find(b => { try { return JSON.parse(b[1]).hasOwnProperty('itemListElement'); } catch (e) { return false; } });

const catStart = s.indexOf('<div class="section-heading">Designer');
const catEnd = s.indexOf('Bottle Options');
const catRaw = s.slice(catStart, catEnd > -1 ? catEnd : catStart + 400000);
const tbodyMarks = [...catRaw.matchAll(/<tbody>/g)].map(m => ({ start: m.index + catStart }));
const tbodyEnds = [...catRaw.matchAll(/<\/tbody>/g)].map(m => ({ end: m.index + '</tbody>'.length + catStart }));
if (tbodyMarks.length !== 2 || tbodyEnds.length !== 2) throw new Error('Expected exactly 2 <tbody> in catalogue, got ' + tbodyMarks.length + '/' + tbodyEnds.length);
  const REGIONS = [
  { start: tbodyMarks[0].start, end: tbodyEnds[0].end },
  { start: tbodyMarks[1].start, end: tbodyEnds[1].end }
];

const sects = [];
let p = s.indexOf('<div class="section-heading">');
while (p > -1) {
  const m = /<div class="section-heading">([^<]+)<\/div>/.exec(s.slice(p, p + 120));
  if (m) sects.push({ name: m[1], idx: p + m.index });
  p = s.indexOf('<div class="section-heading">', p + 1);
}
const sectionAt = idx => {
  let cur = null;
  for (const sc of sects) { if (sc.idx < idx) cur = sc.name; else break; }
  return cur;
};

let products = [];
const tbodyNew = [];

for (const reg of REGIONS) {
  const raw = s.slice(reg.start, reg.end);
  const trs = raw.split(/(?=<tr[ >])/).filter(x => x.startsWith('<tr'));
  let brand = null, brandRow = null;
  for (const tr of trs) {
    if (tr.includes('class="brand-cell"')) {
      const bm = /class="brand-cell"[^>]*>\s*(?:<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>)?\s*([^<]+?)<\/td>/.exec(tr);
      brand = bm ? (bm[2] || bm[3]).trim() : (bm ? bm[3] || '' : '');
      brand = brand.replace(/^\s+|\s+$/g, '');
      brandRow = bm ? { img: bm[1], name: (bm[2] || bm[3] || '').trim() } : null;
      if (brandRow) brand = brandRow.name;
    }
    if (!tr.includes('class="frag-cell"')) { tbodyNew.push(tr); continue; }

    const cell = /<td class="frag-cell"[^>]*>([\s\S]*?)<\/td>/.exec(tr)[1];
    const openTag = /<td class="frag-cell"[^>]*>/.exec(tr)[0];
    const data = {};
    for (const a of ['scent', 'season', 'occasion', 'time', 'weather', 'mood', 'family', 'added']) {
      const m = new RegExp('data-' + a + '="([^"]*)"').exec(openTag);
      if (m) data[a] = m[1];
    }
    const nameM = /<td class="frag-cell"[^>]*>(?:<a[^>]*>)?([^<]+?)(?:<\/a>)?(?=<span|<\/td>)/.exec(tr);
    const name = nameM ? nameM[1].trim() : null;
    if (!name) { tbodyNew.push(tr); continue; }
    if (!brandRow) throw new Error('row without brand for ' + name + ' — pass 1 needs brand-sep first');

    const sizeCells = [...tr.matchAll(/<td class="size-cell">([\s\S]*?)<\/td>/g)].map(m => m[1]);
    if (sizeCells.length !== 5) throw new Error('expected 5 sizes for ' + name + ', got ' + sizeCells.length);
    const prices = {};
    const statusPerSize = {};
    const sizes = ['3', '5', '7.5', '20', '30'];
    sizes.forEach((k, i) => {
      const inner = sizeCells[i];
      prices[k] = num(inner);
      if (inner.includes('<s')) statusPerSize[k] = 'struck';
      else if (inner.includes('u-price')) statusPerSize[k] = 'coming';
      else statusPerSize[k] = 'ok';
    });

    const tagRe = /<span class="tag[^"]*">([A-Z ]+)<\/span>/g;
    const tags = [...cell.matchAll(tagRe)].map(m => m[1].trim());
    const status = tags.includes('SOLD OUT') ? 'soldout' : tags.includes('COMING SOON') ? 'coming' : 'instock';
    const gender = ['Men', 'Women', 'Unisex'].find(g => tags.includes(g)) || '';

    const inspired = (() => { const m = /<td class="inspired-cell">([\s\S]*?)<\/td>/.exec(tr); return m ? m[1].replace(/<[^>]*>/g, '').trim() : ''; })();
    const links = (() => {
      const m = /<td class="links-cell">([\s\S]*?)<\/td>/.exec(tr);
      if (!m) return '';
      return m[1].replace(/<span class="preview-trigger">[\s\S]*?<\/span>/g, '');
    })();

    const cat = sectionAt(reg.start) || '';
    const key = (brand || 'x') + '|' + name;
    products.push({
      key, brand: brand || '', brandImg: brandRow.img || '', name, gender, status,
      tags: tags.filter(t => !['Men', 'Women', 'Unisex', 'SOLD OUT', 'COMING SOON', 'NEW'].includes(t)),
      prices, statusPerSize, inspired, links, cat,
      scent: data.scent || '', season: data.season || '', occasion: data.occasion || '',
      time: data.time || '', weather: data.weather || '', mood: data.mood || '',
      family: data.family || '', added: data.added || ''
    });
    tbodyNew.push(tr);
  }
}

// assign slugs, ensure uniqueness
const seen = {};
for (const pr of products) {
  let slug = slugify(pr.brand + '-' + pr.name);
  let n = 2, base = slug;
  while (seen[slug]) slug = base + '-' + n++;
  seen[slug] = 1;
  pr.slug = slug;
  pr.url = BASE + '/fragrance/' + slug + '.html';
}
const avail = new Set(['instock']);
for (const pr of products) {
  const a = pr.status === 'soldout' ? 'https://schema.org/OutOfStock' : pr.status === 'coming' ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock';
  pr.availability = a;
}

// ------------------------------------------------------ description builders
const PHRASE = {
  scent: 'scent', season: 'season', occasion: 'occasion', time: 'time', weather: 'weather',
  mood: 'mood', family: 'family'
};
function scentLine(pr) {
  const parts = [];
  if (pr.scent) parts.push(pr.scent);
  const extra = [];
  if (pr.family) extra.push(pr.family + ' family');
  if (extra.length) parts.push(extra.join(', '));
  return parts.join('; ') || 'signature fragrance';
}
function bestForLine(pr) {
  const bits = [];
  if (pr.season) bits.push(pr.season.replace(/,/g, ' / ') + ' seasons');
  if (pr.time) bits.push((pr.time.includes(',') ? 'day and evening' : pr.time));
  if (pr.occasion) bits.push('for ' + pr.occasion.replace(/,/g, ', '));
  if (pr.weather) bits.push(pr.weather.replace(/,/g, ', ') + ' weather');
  return bits.length ? bits.join(', ') : 'everyday wear';
}
function inspiredLine(pr) {
  const i = pr.inspired;
  if (!i || i === '—' || !i.trim()) return 'an original creation';
  return 'inspired by ' + i;
}
const rupees = n => '\u20b9' + (n == null ? 'N/A' : n.toLocaleString('en-IN'));

function minMax(pr) {
  const vals = ['3', '5', '7.5', '20', '30'].map(k => pr.prices[k]).filter(x => x != null);
  return { min: Math.min(...vals), max: Math.max(...vals) };
}
function priceString(pr) {
  return ['3ml \u20b9' + (pr.prices['3'] ?? '—'), '5ml \u20b9' + (pr.prices['5'] ?? '—'), '7.5ml \u20b9' + (pr.prices['7.5'] ?? '—'), '20ml \u20b9' + (pr.prices['20'] ?? '—'), '30ml \u20b9' + (pr.prices['30'] ?? '—')].join(' | ');
}

function fragFAQ(pr) {
  const cloneQ = 'Is ' + pr.name + ' by ' + pr.brand + ' a clone or an original?';
  const cloneA = pr.inspired && pr.inspired !== '—' && pr.inspired
    ? 'It is a high-quality interpretation inspired by ' + pr.inspired + '. Perfume enthusiasts in India often pick it as an affordable alternative to that profile.'
    : 'It is an original fragrance in the ' + pr.brand + ' catalogue, so there is no clone comparison involved.';
  const priceQ = 'How much does a decant of ' + pr.name + ' by ' + pr.brand + ' cost in India?';
  const priceA = 'IRAM Perfume sells authentic decants of ' + pr.name + ' by ' + pr.brand + ' at 3ml \u20b9' + (pr.prices['3'] ?? '—') + ', 5ml \u20b9' + (pr.prices['5'] ?? '—') + ', 7.5ml \u20b9' + (pr.prices['7.5'] ?? '—') + ', 20ml \u20b9' + (pr.prices['20'] ?? '—') + ' and 30ml \u20b9' + (pr.prices['30'] ?? '—') + '. Shipping is free on orders above \u20b9999. Full bottles are available on request.';
  const wearQ = 'When should I wear ' + pr.name + ' by ' + pr.brand + '?';
  const wearA = pr.gender ? 'A ' + pr.gender.toLowerCase() + ' fragrance, ' : 'A fragrance, ';
  const wearA2 = wearA + 'it works best during ' + bestForLine(pr) + '. It leans ' + (pr.mood || 'versatile') + ' in character with a ' + scentLine(pr) + ' profile.';
  return [
    [cloneQ, cloneA],
    [priceQ, priceA],
    [wearQ, wearA2]
  ];
}

// ------------------------------------------------------------- page shell
function favicon184() { return '<link rel="icon" type="image/png" href="../logo.png">'; }
function pageShell({ title, desc, body, schema, canonical, og }, lang = 'en') {
  return '<!DOCTYPE html>\n<html lang="' + lang + '">\n<head>\n'
    + '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    + '<title>' + esc(title) + '</title>\n<meta name="description" content="' + esc(desc) + '">\n'
    + '<meta name="robots" content="index, follow">\n<link rel="canonical" href="' + canonical + '">\n'
    + '<link rel="icon" type="image/png" href="' + (og && og.iconPath || '../logo.png') + '">\n'
    + '<meta property="og:type" content="website">\n<meta property="og:title" content="' + esc(title) + '">\n'
    + '<meta property="og:description" content="' + esc(desc) + '">\n<meta property="og:url" content="' + canonical + '">\n'
    + '<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="' + esc(title) + '">\n'
    + '<meta name="twitter:description" content="' + esc(desc) + '">\n'
    + (schema && schema.length ? schema.map(x => '<script type="application/ld+json">\n' + JSON.stringify(x, null, 2) + '\n</script>\n').join('') : '')
    + '<style>'
    + ':root{--bg:#faf9f7;--card:#fff;--ink:#2d2a24;--muted:#7a7168;--accent:#d4af37;--line:#e8e2d9}'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:Inter,-apple-system,system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased}'
    + '.wrap{max-width:860px;margin:0 auto;padding:24px 18px 60px}'
    + '.top{display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap;border-bottom:3px solid var(--accent);padding-bottom:14px;margin-bottom:20px}'
    + '.top a{color:#0f3460;text-decoration:none;font-weight:600;font-size:14px}'
    + '.brand-chip{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#0f3460;font-weight:700}'
    + 'h1{font-size:26px;line-height:1.25;margin:6px 0 8px}'
    + '.lead{color:var(--muted);font-size:15px;margin-bottom:18px}'
    + '.pills{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 18px}'
    + '.pill{font-size:11px;font-weight:700;padding:3px 10px;border-radius:14px;background:#fff;border:1px solid var(--line);color:#444}'
    + '.pill.g{background:#e3f2fd;color:#1565c0;border:0}.pill.w{background:#fce4ec;color:#c62828;border:0}.pill.u{background:#f3e5f5;color:#7b1fa2;border:0}'
    + '.pill.so{background:#fdecea;color:#c62828;border:0}.pill.cs{background:#e8f5e9;color:#2e7d32;border:0}.pill.new{background:var(--accent);color:#fff;border:0}'
    + '.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px;margin:16px 0;box-shadow:0 2px 8px rgba(0,0,0,.04)}'
    + 'table{width:100%;border-collapse:collapse;font-size:14px}'
    + 'th{text-align:left;font-size:12px;color:var(--muted);padding:8px 10px;border-bottom:2px solid var(--line);text-transform:uppercase;letter-spacing:.5px}'
    + 'td{padding:9px 10px;border-bottom:1px solid #f3efe9}'
    + 'td.n{font-weight:700;color:#0f3460}'
    + 'td.strike{text-decoration:line-through;color:#999}'
    + 'h2{font-size:19px;margin:26px 0 8px;border-bottom:2px solid var(--accent);padding-bottom:6px}'
    + '.cta{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;border-radius:12px;padding:18px;margin:22px 0;text-align:center}'
    + '.cta h3{font-size:16px;margin-bottom:6px}.cta p{font-size:13px;color:#cfd8e3;margin-bottom:12px}'
    + '.btn{display:inline-block;background:var(--accent);color:#1a1a2e;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:8px;margin:2px 4px;font-size:14px}'
    + '.btn.ghost{background:transparent;border:1px solid rgba(255,255,255,.5);color:#fff}'
    + 'details.qa{border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:10px 0;background:#fff}'
    + 'details.qa summary{cursor:pointer;font-weight:600;font-size:15px;color:#222}'
    + 'details.qa p{margin-top:8px;font-size:14px;color:#444}'
    + '.muted{color:var(--muted);font-size:13px}'
    + '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}'
    + '.rel{background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px 14px;text-decoration:none;color:var(--ink);font-size:14px;display:block}'
    + '.rel b{color:#0f3460}.rel small{display:block;color:var(--muted);margin-top:2px}'
    + '.foot{margin-top:30px;font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:14px}'
    + '</style>\n</head>\n<body>\n<div class="wrap">\n'
    + body
    + '</div>\n</body>\n</html>\n';
}

// --------------------------------------------------------- fragrance pages
function fragPage(pr) {
  const mm = minMax(pr);
  const probeAvailability = pr.status === 'soldout'
    ? 'This fragrance is currently sold out for decants, but full bottles may be available \u2014 ask on WhatsApp.'
    : pr.status === 'coming'
      ? 'This fragrance is coming soon. Book your decant now on WhatsApp to lock the current price.'
      : 'Currently in stock for decants.';
  const schema = [
    {
      '@context': 'https://schema.org', '@type': 'Product', name: pr.name + ' by ' + pr.brand,
      description: 'Buy an authentic ' + pr.name + ' by ' + pr.brand + ' decant in India \u2014 ' + priceString(pr) + '. A ' + scentLine(pr) + ' fragrance, ' + inspiredLine(pr) + '. IRAM Perfume ships across India.',
      image: pr.brandImg ? BASE + '/' + pr.brandImg : BASE + '/logo.png',
      brand: { '@type': 'Brand', name: pr.brand },
      category: pr.cat || 'Fragrance', sku: pr.slug,
      url: pr.url,
      offers: { '@type': 'AggregateOffer', lowPrice: (mm.min || 0).toString(), highPrice: (mm.max || 0).toString(), priceCurrency: 'INR', availability: pr.availability, offerCount: 5, url: pr.url, description: priceString(pr) }
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'IRAM Perfume', item: BASE + '/' },
        { '@type': 'ListItem', position: 2, name: pr.brand, item: BASE + '/#filterBar' },
        { '@type': 'ListItem', position: 3, name: pr.name, item: pr.url }
      ]
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: fragFAQ(pr).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
    }
  ];
  const priceRows = ['3ml', '5ml', '7.5ml', '20ml', '30ml'].map((k, i) => {
    const sz = ['3', '5', '7.5', '20', '30'][i];
    const v = pr.prices[sz];
    const cls = pr.statusPerSize[sz] === 'struck' || pr.statusPerSize[sz] === 'coming' ? 'strike' : 'n';
    return '<tr><td>' + k + '</td><td class="' + cls + '">' + (v == null ? '\u2014' : rupees(v)) + '</td></tr>';
  }).join('');
  const pills = [];
  if (pr.gender) pills.push('<span class="pill ' + { Men: 'g', Women: 'w', Unisex: 'u' }[pr.gender] + '">' + pr.gender + '</span>');
  pills.push('<span class="pill ' + (pr.status === 'soldout' ? 'so' : pr.status === 'coming' ? 'cs' : '') + '">' + ({ soldout: 'SOLD OUT', coming: 'COMING SOON', instock: 'In Stock' }[pr.status] || '') + '</span>');
  const relLinks = relatedFor(pr).slice(0, 6).map(r => {
    const rm = minMax(r);
    return '<a class="rel" href="../fragrance/' + r.slug + '.html"><b>' + r.name + '</b><span class="muted">by ' + r.brand + '</span><small>from ' + rupees(rm.min) + '</small></a>';
  }).join('');
  const body = ''
    + '<div class="top"><div><div class="brand-chip">' + esc(pr.brand.toUpperCase()) + '</div><h1>' + esc(pr.name) + ' \u2014 Decant Price in India</h1></div><a href="../index.html">\u2190 Full collection</a></div>'
    + '<p class="lead">' + esc(pr.name) + ' by ' + esc(pr.brand) + ' as an authentic decant \u2014 a ' + esc(scentLine(pr)) + '. ' + esc(inspiredLine(pr)) + '. Ships across India with free delivery on orders above \u20b9999.</p>'
    + '<div class="pills">' + pills.join('') + '</div>'
    + '<div class="card"><h2 style="margin-top:0">Prices (per ml gets cheaper as size grows)</h2><table><thead><tr><th>Size</th><th>Price</th></tr></thead><tbody>' + priceRows + '</tbody></table><p class="muted" style="margin-top:10px">' + esc(probeAvailability) + '</p></div>'
    + '<div class="cta"><h3>Order ' + esc(pr.name) + ' Today</h3><p>Copy your choice and message us on WhatsApp \u2014 we confirm stock and payment instantly.</p><a class="btn" href="' + waLink('Hi! I want to order a decant of ' + pr.name + ' by ' + pr.brand + ': 5ml \u20b9' + (pr.prices['5'] ?? '?') + ', 20ml \u20b9' + (pr.prices['20'] ?? '?') + ', 30ml \u20b9' + (pr.prices['30'] ?? '?')) + '">Order on WhatsApp</a><a class="btn ghost" href="tel:' + PHONE_TEL + '">Call ' + PHONE_DISPLAY + '</a></div>'
    + '<h2>About ' + esc(pr.name) + '</h2>'
    + '<div class="card"><p><strong>Notes / profile:</strong> ' + esc(scentLine(pr)) + '.</p>'
    + '<p style="margin-top:8px"><strong>Best for:</strong> ' + esc(bestForLine(pr)) + '.</p>'
    + (pr.mood ? '<p style="margin-top:8px"><strong>Mood:</strong> ' + esc(pr.mood) + '.</p>' : '')
    + '<p style="margin-top:8px"><strong>Reminds me of:</strong> ' + esc(pr.inspired && pr.inspired !== '—' ? pr.inspired : 'Original / unique') + '.</p>'
    + (pr.links ? '<p style="margin-top:8px"><strong>References:</strong> ' + pr.links + '</p>' : '') + '</div>'
    + '<h2>Frequently Asked Questions</h2>'
    + fragFAQ(pr).map(([q, a]) => '<details class="qa"><summary>' + esc(q) + '</summary><p>' + esc(a) + '</p></details>').join('')
    + '<h2>Similar Fragrances You May Like</h2><div class="grid">' + relLinks + '</div>'
    + '<div class="foot">IRAM Perfume \u00b7 ' + esc(PHONE_DISPLAY) + ' \u00b7 <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> \u00b7 <a href="' + WA + '">WhatsApp Community</a> \u00b7 <a href="../index.html">Back to all fragrances</a></div>';
  return pageShell({
    title: pr.name + ' by ' + pr.brand + ' \u2014 3ml\u201330ml Decant Price in India | IRAM Perfume',
    desc: 'Buy ' + pr.name + ' by ' + pr.brand + ' decant in India. ' + priceString(pr) + '. ' + inspiredLine(pr) + '. Free shipping over \u20b9999. Order on WhatsApp ' + PHONE_DISPLAY + '.',
    canonical: pr.url, body, schema
  });
}

// relative-scoring for related fragrances
function relatedScore(a, b) {
  let sc = 0;
  for (const k of ['scent', 'family', 'mood', 'season', 'occasion']) {
    if (a[k] && b[k]) {
      const as = a[k].split(','), bs = b[k].split(',');
      for (const x of as) if (bs.includes(x)) sc++;
    }
  }
  if (a.brand === b.brand) sc += 2;
  return sc;
}
function relatedFor(pr) {
  return products
    .filter(x => x.key !== pr.key && x.status === 'instock')
    .map(x => ({ x, sc: relatedScore(pr, x) }))
    .sort((p, q) => q.sc - p.sc)
    .map(o => o.x);
}

// ---------------------------------------------------------------- articles
function articleShell(a, innerBody, faqs) {
  const schema = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.desc, datePublished: TODAY, dateModified: TODAY, author: { '@type': 'Organization', name: 'IRAM Perfume' }, publisher: { '@type': 'Organization', name: 'IRAM Perfume', url: BASE + '/' }, mainEntityOfPage: a.url, url: a.url, image: BASE + '/logo.png' },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, x]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: x } })) }
  ];
  const body = '<div class="top"><div><div class="brand-chip">IRAM PERFUME \u00b7 GUIDES</div><h1>' + esc(a.title) + '</h1></div><a href="../index.html">\u2190 Full collection</a></div>'
    + '<p class="lead">' + esc(a.desc) + '</p>' + innerBody
    + '<div class="cta"><h3>Shop the Selection</h3><p>Browse the full decant catalogue \u2014 free shipping on orders above \u20b9999.</p><a class="btn" href="../index.html">View All Fragrances</a><a class="btn ghost" href="https://wa.me/' + PHONE_TEL.replace('+', '') + '">WhatsApp Us</a></div>'
    + '<div class="foot">IRAM Perfume \u00b7 ' + esc(PHONE_DISPLAY) + ' \u00b7 <a href="mailto:' + EMAIL + '">' + EMAIL + '</a></div>';
  return pageShell({ title: a.title, desc: a.desc, canonical: a.url, body, schema, og: { iconPath: '../logo.png' } });
}
function productGrid(list) {
  return '<div class="grid">' + list.map((pr, i) => {
    const rm = minMax(pr);
    return '<a class="rel" href="../fragrance/' + pr.slug + '.html"><small>' + (i + 1) + '.</small> <b>' + esc(pr.name) + '</b><span class="muted">by ' + esc(pr.brand) + '</span><small>Decants from ' + rupees(rm.min) + '</small></a>';
  }).join('') + '</div>';
}
function faqBox(faqs) {
  return faqs.map(([q, a]) => '<details class="qa"><summary>' + esc(q) + '</summary><p>' + esc(a) + '</p></details>').join('');
}
const hyp = parts => parts.filter(Boolean).join(' \u2014 ') + '.';

const articlesMeta = [
  { slug: 'summer-decants-under-500', title: 'Top 10 Summer Decants Under \u20b9500 in India (2026)', desc: 'The best fresh, long-lasting summer perfume decants you can buy in India under \u20b9500 \u2014 perfect for office, daily wear and hot weather.' },
  { slug: 'winter-date-night-decants-under-500', title: '10 Best Winter Date-Night Decants Under \u20b9500 in India', desc: 'Warm, sweet and cozy winter evening perfumes at decant prices under \u20b9500 \u2014 perfect for dates, parties and cold nights across India.' },
  { slug: 'decant-vs-full-bottle', title: 'Decant vs Full Bottle: What\u2019s Smarter for Testing Perfumes in India?', desc: 'Should you buy a decant or a full 100ml bottle? We break down the per-ml math with real examples so you decide before spending.' },
  { slug: 'make-perfume-last-longer', title: 'How to Make Perfume Last Longer (and Get More from a 30ml Decant)', desc: 'Simple, proven tips to make your perfume last all day \u2014 from storage and pulse-point application to layering. Works for any 30ml decant.' }
];

function buildArticles() {
  const summer = products.filter(p => p.status === 'instock' && (p.season || '').split(',').includes('summer'))
    .sort((a, b) => (a.prices['3'] || 0) - (b.prices['3'] || 0)).slice(0, 10);
  const winter = products.filter(p => p.status === 'instock' && ((p.season || '').split(',').some(x => x === 'fall' || x === 'winter')))
    .sort((a, b) => (a.prices['3'] || 0) - (b.prices['3'] || 0)).slice(0, 10);
  const hero1 = products.find(p => p.name.includes('Cedrat Boise') && p.brand === 'Mancera');
  const hero2 = products.find(p => p.name.includes('CDNIM'));
  const hero3 = products.find(p => p.name.includes('Khamrah') || p.name.includes('Qahwa'));
  const heroPick = cheaps => (cheaps || products).find(p => p.status === 'instock') || products[0];

  const guides = [];
  {
    const a = articlesMeta[0];
    const faqs = [
      ['Which is the best summer perfume under \u20b9500 in India?', 'There is no single best, but the strongest categories are fresh aquatic and citrus scents from our list above. Popular everyday picks include ' + (summer[0] ? summer[0].name + ' by ' + summer[0].brand : 'our fresh summer picks') + '.'],
      ['Do summer decants last less?', 'Fresh perfumes are lighter by nature, so they sit closer to skin. Buying 20\u201330ml decants and reapplying once mid-day is the standard routine.'],
      ['Is shipping free for a single decant?', 'Shipping is free on orders above \u20b9999. A few decants together easily cross that, so bundle smarter.']
    ];
    const inner = '<h2>Why buy summer perfumes as decants?</h2>'
      + '<div class="card"><p>' + hyp(['A 100ml fresh fragrance is a big commitment for only three hot months', 'decants let you rotate 5\u20136 summer scents for the price of one bottle']) + '</p></div>'
      + '<h2>Top 10 summer decants under \u20b9500</h2>'
      + productGrid(summer)
      + '<h2>How we picked</h2>'
      + '<div class="card"><p>' + hyp(['We filtered our catalogue for fragrances tagged for summer with a fresh, clean or aquatic profile, and a smallest decant price under \u20b9500 at time of writing', 'prices are live \u2014 what you see is what you pay']) + '</p></div>'
      + '<h2>Quick answers</h2>' + faqBox(faqs);
    guides.push(articleShell(a, inner, faqs));
  }
  {
    const a = articlesMeta[1];
    guides.push(articleShell(a,
      '<h2>What makes a great date-night winter scent?</h2>'
      + '<div class="card"><p>' + hyp(['Sweet amber, boozy, vanilla and woody-oud profiles that project in cold air', 'they read cozy and intentional up close \u2014 exactly what a date deserves']) + '</p></div>'
      + '<h2>Top 10 winter date-night decants under \u20b9500</h2>'
      + productGrid(winter)
      + '<h2>Tips for cold-weather wear</h2>'
      + '<div class="card"><ul style="margin-left:18px">'
      + '<li>Spray on your sweater \u2014 fabric holds winter gourmands hours longer than skin</li>'
      + '<li>Layer a 3ml sample before buying a 30ml decant of the same fragrance</li>'
      + '<li>Store decants away from sunlight and heat to keep them stable across winters</li>'
      + '</ul></div>'
      + '<h2>Quick answers</h2>' + faqBox([
        ['Are these winter decants sold out or in stock?', 'Our list only includes fragrances currently available for decants. Sizes and stock update live on each fragrance page.'],
        ['Which winter decant lasts the longest overnight?', 'The sweet, amber and woody-oud entries in the list are the strongest performers in cold weather.'],
        ['Can I order these outside metro cities?', 'Yes \u2014 we ship across India with tracking, usually 3\u20137 working days.']
      ]),
      [
        ['Are these winter decants in stock?', 'The list only includes fragrances currently available for decants, with live stock on each fragrance page.'],
        ['Which winter decant lasts the longest?', 'Sweet amber, boozy and woody-oud entries in the list are the strongest performers in cold weather.'],
        ['Do you ship outside metros?', 'Yes \u2014 IRAM Perfume ships across India with tracking, usually arriving in 3\u20137 working days.']
      ]));
  }
  {
    const a = articlesMeta[2];
    const rows = [];
    if (hero1) rows.push('<tr><td>Mancera Cedrat Boise (3ml decant)</td><td class="n">' + rupees(hero1.prices['3']) + '</td><td class="n">' + rupees(hero1.prices['30']) + '</td></tr>');
    if (hero2) rows.push('<tr><td>Armaf CDNIM Intense Man PP (5ml decant)</td><td class="n">' + rupees(hero2.prices['5']) + '</td><td class="n">' + rupees(hero2.prices['30']) + '</td></tr>');
    if (hero3) rows.push('<tr><td>Lattafa Khamrah Qahwa (5ml decant)</td><td class="n">' + rupees(hero3.prices['5'] || hero3.prices['3']) + '</td><td class="n">' + rupees(hero3.prices['30']) + '</td></tr>');
    const best = []; const seenB = {};
    [hero1, hero2, hero3].filter(Boolean).forEach(h => { if (!seenB[h.slug]) { seenB[h.slug] = 1; best.push(h); } });
    products.filter(p => p.status === 'instock' && p.prices['3'] && !seenB[p.slug])
      .sort((a, b) => (a.prices['3'] || 0) - (b.prices['3'] || 0))
      .forEach(p => { if (best.length < 6 && !seenB[p.slug]) { seenB[p.slug] = 1; best.push(p); } });
    guides.push(articleShell(a,
      '<h2>The honest per-ml math</h2>'
      + '<div class="card"><table><thead><tr><th>How to buy</th><th>Small decant</th><th>30ml decant</th></tr></thead><tbody>'
      + rows.join('') + '</tbody></table>'
      + '<p class="muted" style="margin-top:10px">Full 100ml designers can cost 5\u201310\u00d7 more, with most of a bottle still sitting unused.</p></div>'
      + '<h2>Popular decants to try first</h2>'
      + productGrid(best)
      + '<h2>When a decant wins</h2>'
      + '<div class="card"><p>' + hyp(['Trying a new signature or an expensive niche profile', 'testing a fragrance for a full month through all weathers', 'building a 10-20 bottle rotation without a shelf of 100ml bottles']) + '</p></div>'
      + '<h2>When a full bottle wins</h2>'
      + '<div class="card"><p>' + hyp(['Your everyday \u2018daily driver\u2019 you finish bottles of', 'gifting and special editions that hold value', 'scents you have worn for years']) + '</p></div>'
      + '<h2>Quick answers</h2>' + faqBox([
        ['Is a 30ml decant cost effective vs a full bottle?', 'Usually yes. A 30ml decant costs 2\u20134% of one 100ml bottle, so you pay for usable perfume rather than a bottle you will not finish.'],
        ['Are decants authentic?', 'Yes \u2014 IRAM fills each decant from an original genuine bottle bought from trusted suppliers, with proof shared on request.'],
        ['What if I love it and want the bottle later?', 'We can source genuine 30ml, 50ml and 100ml bottles on request \u2014 just ask on WhatsApp.']
      ]),
      [
        ['Is a 30ml decant more cost-effective than a full bottle?', 'Usually yes \u2014 you pay for 30ml of usable perfume instead of 100ml you may never finish.'],
        ['Are decants authentic?', 'Yes \u2014 every IRAM decant is filled from an original genuine bottle bought from trusted suppliers.'],
        ['Can I upgrade to a bottle later?', 'Yes \u2014 we source genuine 30ml, 50ml and 100ml bottles on request.']
      ]));
  }
  {
    const a = articlesMeta[3];
    guides.push(articleShell(a,
      '<h2>1. Store decants properly</h2>'
      + '<div class="card"><p>' + hyp(['Keep 30ml decants away from direct sunlight, heat and humidity', 'a drawer, cupboard or bathroom cabinet shelf works', 'always close the cap tightly after each spray']) + '</p></div>'
      + '<h2>2. Spray where it stays</h2>'
      + '<div class="card"><p>' + hyp(['Pulse points \u2014 wrists, neck, behind the ears', 'add one spray on clothing \u2014 fabric multiplies longevity', 'moisturised skin holds scent longer than dry skin']) + '</p></div>'
      + '<h2>3. The classics that perform</h2>'
      + '<div class="card"><p>' + hyp(['Some profiles simply last longer \u2014 amber, oud, tobacco and vanilla gourmands outlast fresh citrus', 'pick from our collection below for all-day wear']) + '</p></div>'
      + productGrid(products.filter(p => p.status === 'instock' && /amber|oud|tobacco|vanilla|gourmand/i.test(p.family || p.scent || '')).slice(0, 10))
      + '<h2>Quick answers</h2>' + faqBox([
        ['How long does a 30ml decant last in daily use?', 'Roughly 2\u20134 months at 3\u20135 sprays a day, depending on the fragrance strength and your routine.'],
        ['Does cold or heat affect perfume?', 'Heat and sunlight degrade perfume fastest; keeping decants cool, dry and capped extends their life.'],
        ['Should I keep decants in their box?', 'If you keep the box, it is a useful barrier against light \u2014 but a dark cupboard works just as well.']
      ]),
      [
        ['How long does a 30ml decant last?', 'Roughly 2\u20134 months of daily use at 3\u20135 sprays a day, depending on scent strength.'],
        ['Does heat affect perfume?', 'Yes \u2014 heat and sunlight degrade perfume. Keep decants cool, dry and capped.'],
        ['Is 30ml enough to decide on a signature scent?', 'Usually yes \u2014 a month of varied weather is enough to know if a scent works for you.']
      ]));
  }
  return guides;
}

// ------------------------------------------------------------ html homepage edits
function editHomepage(products, faqHtml, articlesHtml) {
  let out = s;

  // 1) title + description
  out = out.replace(/<title>[\s\S]*?<\/title>/, '<title>IRAM Perfume \u2014 Designer &amp; Middle Eastern Fragrance Decants (3ml\u201330ml) &amp; Full Bottles | India</title>');
  out = out.replace(
    /<meta name="description" content="[^"]*"/,
    '<meta name="description" content="Buy authentic designer and Middle Eastern perfume decants in India \u2014 3ml, 5ml, 7.5ml, 20ml & 30ml from Davidoff, Mancera, Afnan, Lattafa, Rasasi & 25+ brands. Full 30ml\u2013100ml bottles on request. Free shipping over \u20b9999."'
  );

  // 2) og:image -> og-image.jpg
  out = out.split('https://itsnotme007.github.io/iram-perfume/logo.png').join('https://itsnotme007.github.io/iram-perfume/og-image.jpg');

  // 3) replace ItemList block with all-products version
  if (!itemListBlock) throw new Error('ItemList block not found');
  const itemListNew = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'IRAM Perfume Fragrance Collection',
    description: 'Premium designer and Middle Eastern fragrance decants available in 3ml, 5ml, 7.5ml, 20ml and 30ml sizes, plus full bottles on request.',
    url: BASE + '/',
    numberOfItems: products.length,
    itemListElement: products.map((pr) => {
      const mm = minMax(pr);
      return {
        '@type': 'Product', position: products.indexOf(pr) + 1,
        name: pr.name + ' \u2014 ' + pr.brand,
        brand: { '@type': 'Brand', name: pr.brand },
        description: pr.name + ' by ' + pr.brand + ' decant. A ' + scentLine(pr) + '. ' + inspiredLine(pr) + '.',
        image: pr.brandImg ? BASE + '/' + pr.brandImg : BASE + '/logo.png',
        category: pr.cat || 'Fragrance',
        url: pr.url,
        offers: { '@type': 'AggregateOffer', lowPrice: (mm.min || 0).toString(), highPrice: (mm.max || 0).toString(), priceCurrency: 'INR', availability: pr.availability, url: pr.url, offerCount: 5 }
      };
    })
  };
  const itemListJson = '<script type="application/ld+json">\n' + JSON.stringify(itemListNew, null, 2) + '\n</script>\n';
  const ob = [...out.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].find(b => { try { return JSON.parse(b[1]).hasOwnProperty('itemListElement'); } catch (e) { return false; } });
  if (!ob) throw new Error('ItemList block not found');
  out = out.slice(0, ob.index) + itemListJson + out.slice(ob.index + ob[0].length);

  // 4) FAQPage schema + visible FAQ + articles strip (idempotent markers)
  // JSON-LD must contain JSON only; HTML comments make the structured data invalid.
  const tagOpen = '<script type="application/ld+json">\n';
  const tagClose = '\n</script>\n';
  out = out.replace(/<!--FAQ_SCHEMA-->[\s\S]*?<!--EOF-->/g, '');
  out = out.replace(/<script type="application\/ld\+json">\s*<\/script>/g, '');
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: HOME_FAQS.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
  };
  out = out.replace('</head>', tagOpen + JSON.stringify(faqSchema, null, 2) + tagClose + '</head>');

  // 5) visible FAQ + articles strip before reviews section (idempotent)
  out = stripMarks(out, '<!--ARTICLES-->', '<!--/ARTICLES-->');
  out = stripMarks(out, '<!--FAQ_BLOCK-->', '<!--/FAQ_BLOCK-->');
  const strip = '<!--ARTICLES-->' + '\n<div class="section-heading">Decant Guides</div>\n<div class="guide-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-bottom:8px">'
    + articlesMeta.map(a => '<a class="rel" style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:10px;padding:12px 14px;text-decoration:none;color:var(--text-primary);font-size:14px" href="articles/' + a.slug + '.html"><b style="color:var(--accent-secondary)">' + esc(a.title) + '</b><br><small style="color:var(--text-muted)">' + esc(a.desc.slice(0, 90)) + '</small></a>').join('') + '</div>\n<!--/ARTICLES-->\n';
  const faqBlock = '<!--FAQ_BLOCK-->\n<div class="section-heading">Frequently Asked Questions</div>\n'
    + HOME_FAQS.map(([q, a]) => '<details class="qa" style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:10px;padding:12px 14px;margin:10px 0"><summary style="cursor:pointer;font-weight:600;color:var(--text-heading)">' + esc(q) + '</summary><p style="margin-top:8px;font-size:14px;color:var(--text-body)">' + esc(a) + '</p></details>').join('')
    + '\n<!--/FAQ_BLOCK-->\n';
  const reviewsIdx = out.indexOf('<div class="reviews-section">');
  if (reviewsIdx < 0) throw new Error('reviews-section not found');
  out = out.slice(0, reviewsIdx) + strip + faqBlock + out.slice(reviewsIdx);

  // 6) anchor-wrap fragrance names -> per-fragrance pages (per tbody region)
  for (const reg of REGIONS) {
    const raw = s.slice(reg.start, reg.end);
    const trs = raw.split(/(?=<tr[ >])/).filter(x => x.startsWith('<tr'));
    const rebuilt = [];
    let b = null;
    for (const tr of trs) {
      if (tr.includes('class="brand-cell"')) {
        const bm = /alt="([^"]*)"/.exec(tr);
        b = bm ? bm[1] : null;
      }
      if (tr.includes('class="frag-cell"')) {
        const nm = /<td class="frag-cell"[^>]*>([^<]+?)(?=<span|<\/td>)/.exec(tr);
        if (nm && b) {
          const pr = products.find(p => p.name === nm[1].trim() && p.brand === b);
          if (pr && !trIncludesAnchor(tr)) {
            rebuilt.push(tr.replace(nm[1], '<a href="fragrance/' + pr.slug + '.html" style="text-decoration:none;color:inherit">' + nm[1] + '</a>'));
            continue;
          }
        }
      }
      rebuilt.push(tr);
    }
    const newTbody = rebuilt.join('').split('</tbody>').join('');
    const wrapper = '<tbody>' + newTbody + '</tbody>';
    out = out.replace(raw, wrapper);
  }

  return out;
}
function trIncludesAnchor(tr) { return tr.includes('class="frag-cell"') && /class="frag-cell"[^>]*>[^<]*<a href=/.test(tr); }
function stripMarks(str, open, close) {
  const i = str.indexOf(open);
  if (i < 0) return str;
  const j = str.indexOf(close, i);
  if (j < 0) return str.slice(0, i) + str.slice(i + open.length);
  return str.slice(0, i) + str.slice(j + close.length);
}

// --------------------------------------------------------------------- sitemap
function buildSitemap(products, articles) {
  const locs = [
    { l: BASE + '/', lastmod: TODAY, pri: '1.0' },
    ...articles.map(a => ({ l: a.url, lastmod: TODAY, pri: '0.9' })),
    ...products.map(p => ({ l: p.url, lastmod: TODAY, pri: '0.8' }))
  ];
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const o of locs) x += '  <url>\n    <loc>' + o.l + '</loc>\n    <lastmod>' + o.lastmod + '</lastmod>\n    <priority>' + o.pri + '</priority>\n  </url>\n';
  x += '</urlset>\n';
  return x;
}

// ----------------------------------------------------------------------- llms.txt
function buildLlmstxt() {
  let t = '# IRAM Perfume\n\n> Authentic designer and Middle Eastern fragrance decants (3ml, 5ml, 7.5ml, 20ml, 30ml) and full bottles, shipped across India. Free shipping above \u20b9999.\n\n## Key facts\n- Decants filled from original genuine bottles, proof shared on request\n- Sizes: 3ml / 5ml / 7.5ml / 20ml / 30ml; full bottles on request\n- Order via WhatsApp ' + PHONE_DISPLAY + ' or email ' + EMAIL + '\n- Free shipping on orders above \u20b9999 (delivery 3\u20137 working days)\n\n## Link addresses\n- Homepage: ' + BASE + '/\n- Fragrance catalogue pages: ' + BASE + '/fragrance/\n\n## Fragrance catalogue (India decant prices)\n';
  const byBrand = {};
  for (const pr of products) (byBrand[pr.brand] = byBrand[pr.brand] || []).push(pr);
  for (const b of Object.keys(byBrand)) {
    t += '\n### ' + b + '\n';
    for (const pr of byBrand[b]) {
      t += '- ' + pr.name + ' (' + (pr.gender || 'fragrance') + (pr.status === 'instock' ? '' : ', ' + pr.status) + '): ' + priceString(pr) + '\n';
    }
  }
  return t;
}

// ----------------------------------------------------------------------- main
function main() {
  console.log('parsed products:', products.length);
  const dup = products.length - new Set(products.map(p => p.key)).size;
  if (dup) console.warn('warning: duplicate keys:', dup);

  // 1. fragrance pages
  const fragDir = path.join(ROOT, 'fragrance');
  fs.mkdirSync(fragDir, { recursive: true });
  let n = 0;
  for (const pr of products) {
    fs.writeFileSync(path.join(fragDir, pr.slug + '.html'), fragPage(pr), 'utf8');
    n++;
  }
  console.log('wrote fragrance pages:', n);

  // 2. articles
  const artDir = path.join(ROOT, 'articles');
  fs.mkdirSync(artDir, { recursive: true });
  for (const m of articlesMeta) m.url = BASE + '/articles/' + m.slug + '.html';
  const artPages = buildArticles();
  artPages.forEach((html, i) => {
    fs.writeFileSync(path.join(artDir, articlesMeta[i].slug + '.html'), html, 'utf8');
  });
  console.log('wrote articles:', articlesMeta.length);

  // 3. homepage edits
  const faqHtml = '', artsHtml = '';
  const newS = editHomepage(products, faqHtml, artsHtml);
  fs.writeFileSync(IDX, newS, 'utf8');
  const rowsNow = (newS.match(/class="frag-cell"/g) || []).length;
  console.log('index.html rewritten; frag rows still:', rowsNow);

  // 4. sitemap / robots / llms
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), buildSitemap(products, articlesMeta), 'utf8');
  fs.writeFileSync(path.join(ROOT, 'llms.txt'), buildLlmstxt(), 'utf8');
  const robots = 'User-agent: *\nAllow: /\n\n# AI / answer-engine crawlers\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: ChatGPT-User\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: ' + BASE + '/sitemap.xml\n';
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots, 'utf8');
  console.log('sitemap.xml, robots.txt, llms.txt written');

  // sanity
  const ss = fs.readFileSync(IDX, 'utf8');
  const anchors = (ss.match(/href="fragrance\/[^"]+\.html"/g) || []).length;
  console.log('homepage fragrance links:', anchors, '/', products.length);
  console.log('ld+json blocks on homepage:', (ss.match(/application\/ld\+json/g) || []).length);
  const faqVisible = ss.includes('<!--FAQ_BLOCK-->') && ss.includes('Frequently Asked Questions');
  console.log('FAQ block present:', faqVisible, '| guides strip:', ss.includes('<!--ARTICLES-->'));
}

main();
