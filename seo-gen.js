// seo-gen.js — IRAM Perfume SEO generator (idempotent)
// Reads index.html (source of truth), regenerates:
//   fragrance/<slug>.html (per-fragrance landing pages)
//   articles/<slug>.html (informational guides)
//   sitemap.xml, llms.txt, robots.txt
//   updates index.html: ItemList schema, FAQPage schema, visible FAQ block,
//   articles strip, frag-name anchors -> per-fragrance pages, title/desc/og
//   content-dates.json: lastmod / dateModified memory (commit it with the site)
// Usage: node seo-gen.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const IDX = path.join(ROOT, 'index.html');
const CFG = require(path.join(ROOT, 'config.js'));
const BASE = CFG.base;
// The sole builder for absolute URLs belonging to this site. It accepts paths
// with or without a leading slash and guarantees exactly one after the origin.
const siteUrl = (pathname = '') => BASE + '/' + String(pathname).replace(/^\/+/, '');
const LEGACY_SITE_RE = new RegExp('https://[^/]+/' + ['iram', 'perfume'].join('-'), 'g');
const PHONE_DISPLAY = CFG.phoneDisplay;
const PHONE_TEL = CFG.phoneTel;
const EMAIL = CFG.email;
const WA = CFG.whatsappCommunity;
const IG = 'https://instagram.com/iram.perfume';
// shared single source of truth with assets/app.js (see config.js)
const FREE_SHIP_MIN = CFG.freeShipMin;
const FREE_SHIP_MIN_QTY = CFG.freeShipMinQty;
const SHIPPING_FLAT = CFG.shippingFlat;
const FREE_SHIP_ABOVE = 'free shipping over \u20b9' + FREE_SHIP_MIN + ' on ' + FREE_SHIP_MIN_QTY + '+ decants';
const TODAY = new Date().toISOString().slice(0, 10);
const waLink = t => 'https://wa.me/' + PHONE_TEL.replace('+', '') + '?text=' + encodeURIComponent(t);

// ------------------------------------------------------------ content dates
// datePublished / dateModified and sitemap <lastmod> must move only when the
// content actually changes, not on every calendar day. Each generated page
// gets a content signature (rendered output with the dates masked out) stored
// in content-dates.json — that file must be committed, it is the memory.
const crypto = require('crypto');
const DATES_FILE = path.join(ROOT, 'content-dates.json');
let DATES = {};
try { DATES = JSON.parse(fs.readFileSync(DATES_FILE, 'utf8')); } catch (e) { DATES = {}; }
let DATES_DIRTY = false;
const contentSig = str => crypto.createHash('sha1').update(String(str), 'utf8').digest('hex').slice(0, 24);
function dateFor(id, sig) {
  const rec = DATES[id];
  if (rec && rec.sig === sig) return rec.mod;
  DATES[id] = { sig: sig, mod: TODAY };
  DATES_DIRTY = true;
  return TODAY;
}
const DATE_MASK = '0000-00-00';

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
   'IRAM Perfume offers decants in 3ml, 5ml, 7.5ml, 10ml, 20ml and 30ml glass bottles for every fragrance in our catalogue. Pick the size from the price table — the price per ml drops as the bottle gets bigger, so 30ml decants are the best value.'],
  ['How is a decant different from buying a full perfume bottle?',
   'A decant is perfume poured from an original, genuine bottle into a smaller filled-at-cost glass vial. It lets you try an expensive designer or Middle Eastern perfume without paying for a 100ml bottle. You can test longevity, projection and how it sits on your skin before committing to a full bottle.'],
  ['Do you sell full perfume bottles too?',
   'Yes. We source genuine 30ml, 50ml and 100ml bottles for most fragrances in our catalogue on request. Full-bottle prices and availability are confirmed over WhatsApp before you pay.'],
  ['Do you provide free shipping on orders?',
   'Yes — shipping is free on orders of ' + FREE_SHIP_MIN_QTY + '+ decants above \u20b9' + FREE_SHIP_MIN + '. Every other order ships at a flat \u20b9' + SHIPPING_FLAT + '.'],
  ['How do I place an order with IRAM Perfume?',
   'Pick your fragrances and sizes from the price list, then copy your cart or message us directly on WhatsApp at ' + PHONE_DISPLAY + ' or email ' + EMAIL + '. We confirm stock, payment and share the tracking number once dispatched.'],
  ['How long does delivery take across India?',
   'We ship all over India through a trackable courier. Most orders reach within 3\u20137 working days depending on the city. Orders of ' + FREE_SHIP_MIN_QTY + '+ decants above \u20b9' + FREE_SHIP_MIN + ' ship free.'],
  ['How can I be sure the decants are authentic?',
   'Every decant is filled from an original, genuine perfume bottle we buy from trusted suppliers. We share photos, videos and opening proof of the source bottles on request before you order.'],
  ['What is your refund and returns policy?',
   'No. Returns are not applicable after an order is placed. Please review your selection and contact us with any questions before ordering.'],
  ['Do you issue an invoice for orders?',
   'Not yet — we are a small business and do not currently issue formal invoices. Your order is confirmed over WhatsApp and you receive the tracking number once dispatched. We plan to introduce invoices as we grow.']
];

// ------------------------------------------------------------- catalog parse
// git's core.autocrlf rewrites this file as CRLF on every checkout, which would
// break the `=== '\n'` newline-consumption checks below (they'd see '\r') and
// leak a blank line per injection point on the first run after a checkout.
// Normalise on read so behaviour is independent of the worktree line endings.
let s = fs.readFileSync(IDX, 'utf8').replace(/\r\n/g, '\n');
const blocks = [...s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
const itemListBlock = blocks.find(b => { try { return JSON.parse(b[1]).hasOwnProperty('itemListElement'); } catch (e) { return false; } });

// products.json is the source of truth (Phase 2 inversion). The table below is
// only re-snapshotted when you pass --make-data (use it after hand-editing the
// table instead of products.json).
const DATA_FILE = path.join(ROOT, 'products.json');
const makeData = process.argv.includes('--make-data');
let products = [];
if (!makeData) {
  if (!fs.existsSync(DATA_FILE)) throw new Error('products.json missing — run: node seo-gen.js --make-data once');
  products = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  // Do not trust persisted absolute URLs when the site's origin changes.
  for (const pr of products) pr.url = siteUrl('fragrance/' + pr.slug + '.html');
}
// catalogue tbody regions — also used by editHomepage (anchor wrapping),
// so they are computed whether or not we re-snapshot products.json
const catStart = s.indexOf('<div class="section-heading">Designer');
// end of the catalogue region: Bottle Options + stats moved to bottles.html,
// so the stable end anchor is the generated articles strip (seo-gen-owned,
// always present, and always after both tables / card grids / 3ml list)
const catEnd = s.indexOf('<!--ARTICLES-->');
const catRaw = s.slice(catStart, catEnd > -1 ? catEnd : catStart + 400000);
const tbodyMarks = [...catRaw.matchAll(/<tbody>/g)].map(m => ({ start: m.index + catStart }));
const tbodyEnds = [...catRaw.matchAll(/<\/tbody>/g)].map(m => ({ end: m.index + '</tbody>'.length + catStart }));
if (tbodyMarks.length !== 2 || tbodyEnds.length !== 2) throw new Error('Expected exactly 2 <tbody> in catalogue, got ' + tbodyMarks.length + '/' + tbodyEnds.length);
  const REGIONS = [
  { start: tbodyMarks[0].start, end: tbodyEnds[0].end },
  { start: tbodyMarks[1].start, end: tbodyEnds[1].end }
];

if (makeData) {
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
    if (sizeCells.length !== 6) throw new Error('expected 6 sizes for ' + name + ', got ' + sizeCells.length);
    const prices = {};
    const statusPerSize = {};
    const sizes = ['3', '5', '7.5', '10', '20', '30'];
    sizes.forEach((k, i) => {
      const inner = sizeCells[i];
      prices[k] = num(inner);
      if (/<s[ >]/.test(inner)) statusPerSize[k] = 'struck';
      else if (inner.includes('u-price')) statusPerSize[k] = 'coming';
      else statusPerSize[k] = 'ok';
    });

    const tagRe = /<span class="tag(?:\s[^"]*)?"[^>]*>([^<]+)<\/span>/g;
    const tags = [...cell.matchAll(tagRe)].map(m => m[1].trim());
    const status = tags.includes('SOLD OUT') ? 'soldout' : tags.includes('COMING SOON') ? 'coming' : 'instock';
    const gender = ['Men', 'Women', 'Unisex'].find(g => tags.includes(g)) || '';

    const inspired = (() => { const m = /<td class="inspired-cell">([\s\S]*?)<\/td>/.exec(tr); return m ? m[1].replace(/<[^>]*>/g, '').trim() : ''; })();
    const linksRaw = (() => { const m = /<td class="links-cell">([\s\S]*?)<\/td>/.exec(tr); return m ? m[1] : ''; })();
    const links = linksRaw
      .replace(/<span class="preview-trigger">[\s\S]*?<\/span>/g, '')
      .replace(/<\/a><a /g, '</a> <a ');

    const cat = sectionAt(reg.start) || '';
    const key = (brand || 'x') + '|' + name;
    products.push({
      key, brand: brand || '', brandImg: (brandRow.img || '').replace(/\.webp$/, '.png'), name, gender, status,
      tags: tags.filter(t => !['Men', 'Women', 'Unisex', 'SOLD OUT', 'COMING SOON', 'NEW'].includes(t)),
      prices, statusPerSize, inspired, links, linksRaw, cat,
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
  pr.url = siteUrl('fragrance/' + slug + '.html');
}
const avail = new Set(['instock']);
for (const pr of products) {
  const a = pr.status === 'soldout' ? 'https://schema.org/OutOfStock' : pr.status === 'coming' ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock';
  pr.availability = a;
}
fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 1) + '\n', 'utf8');
console.log('wrote products.json:', products.length, '— sourced from the catalogue table');
}

// ------------------------------------------------------ description builders
const PHRASE = {
  scent: 'scent', season: 'season', occasion: 'occasion', time: 'time', weather: 'weather',
  mood: 'mood', family: 'family'
};
// Catalogue tags are comma/semicolon-separated storage values.  Convert them
// to display strings before using them in public copy or structured data.
function normalizeScent(value) {
  const seen = new Set();
  return String(value || '').split(/[;,]/).map(x => x.trim()).filter(Boolean)
    .filter(x => { const key = x.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; })
    .map(x => x.replace(/\b\w/g, c => c.toUpperCase()));
}
function tagLine(value) { return normalizeScent(value).join(', '); }
function scentLine(pr) {
  const parts = normalizeScent(pr.scent);
  for (const family of normalizeScent(pr.family)) if (!parts.some(x => x.toLowerCase() === family.toLowerCase())) parts.push(family);
  return parts.join(', ') || 'signature fragrance';
}
function bestForLine(pr) {
  const bits = [];
  if (pr.season) bits.push(normalizeScent(pr.season).join(' / ') + ' seasons');
  if (pr.time) bits.push(normalizeScent(pr.time).join(' and ').toLowerCase());
  if (pr.occasion) bits.push('for ' + normalizeScent(pr.occasion).join(', ').toLowerCase());
  if (pr.weather) bits.push(normalizeScent(pr.weather).join(', ').toLowerCase() + ' weather');
  return bits.length ? bits.join(', ') : 'everyday wear';
}
function inspiredLine(pr) {
  const i = pr.inspired;
  if (!i || i === '—' || !i.trim() || i.trim().toLowerCase() === 'original') return 'an original creation';
  return 'inspired by ' + i;
}
// 'a' / 'an' before a scent line (e.g. "an aromatic,fresh; aromatic family")
const art = s => /^[aeiou]/i.test(String(s || '').trim()) ? 'an' : 'a';
const capLine = s => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
// intrinsic width/height attrs for a local image (keeps the unsized-images audit
// clean without touching CSS sizing); returns '' for anything unreadable.
// Handles PNG, JPEG (incl. JPEG bytes mislabelled .png), WEBP (RIFF — some logos
// ship WEBP bytes with a .png extension) and SVG width/height or viewBox.
function imgDims(rel) {
  try {
    const b = fs.readFileSync(path.join(ROOT, rel));
    if (b.length >= 24 && b.toString('ascii', 1, 4) === 'PNG') return ' width="' + b.readUInt32BE(16) + '" height="' + b.readUInt32BE(20) + '"';
    // some logos ship JPEG bytes with a .png extension (assaf, pendorascents)
    if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xc3) return ' width="' + b.readUInt16BE(i + 7) + '" height="' + b.readUInt16BE(i + 5) + '"';
        if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
    // WEBP (RIFF....WEBP)
    if (b.length >= 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const fourcc = b.toString('ascii', 12, 16);
      if (fourcc === 'VP8X') {
        return ' width="' + (b.readUIntLE(24, 3) + 1) + '" height="' + (b.readUIntLE(27, 3) + 1) + '"';
      }
      if (fourcc === 'VP8L') {
        const bits = b.readUInt32LE(21);
        return ' width="' + ((bits & 0x3fff) + 1) + '" height="' + (((bits >> 14) & 0x3fff) + 1) + '"';
      }
      if (fourcc === 'VP8 ') {
        return ' width="' + (b.readUInt16LE(26) & 0x3fff) + '" height="' + (b.readUInt16LE(28) & 0x3fff) + '"';
      }
    }
    // SVG (may start with a UTF-8 BOM)
    const head = b.toString('utf8', 0, Math.min(b.length, 600)).replace(/^\uFEFF/, '');
    if (/<svg\b/i.test(head)) {
      const w = /\bwidth\s*=\s*["']?\s*([\d.]+)/i.exec(head);
      const h = /\bheight\s*=\s*["']?\s*([\d.]+)/i.exec(head);
      if (w && h) return ' width="' + Math.round(+w[1]) + '" height="' + Math.round(+h[1]) + '"';
      const vb = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(head);
      if (vb) return ' width="' + Math.round(+vb[1]) + '" height="' + Math.round(+vb[2]) + '"';
    }
  } catch (e) {}
  return '';
}
function imgWebp(rel) {
  const w = rel.replace(/\.(png|jpe?g)$/i, '.webp');
  try { fs.accessSync(path.join(ROOT, w)); return w; } catch (e) { return rel; }
}
const rupees = n => '\u20b9' + (n == null ? 'N/A' : n.toLocaleString('en-IN'));

function minMax(pr) {
  const vals = ['3', '5', '7.5', '10', '20', '30'].map(k => pr.prices[k]).filter(x => x != null);
  return { min: Math.min(...vals), max: Math.max(...vals) };
}
function priceString(pr) {
  return ['3ml \u20b9' + (pr.prices['3'] ?? '—'), '5ml \u20b9' + (pr.prices['5'] ?? '—'), '7.5ml \u20b9' + (pr.prices['7.5'] ?? '—'), '10ml \u20b9' + (pr.prices['10'] ?? '—'), '20ml \u20b9' + (pr.prices['20'] ?? '—'), '30ml \u20b9' + (pr.prices['30'] ?? '—')].join(' | ');
}
function productTitle(pr) {
  const core = pr.brand + ' ' + pr.name + ' Decant India - from Rs' + minMax(pr).min;
  // Preserve the query terms and product identity; branding is dropped before
  // shortening a long name so titles remain useful in search results.
  const branded = core + ' | IRAM Perfume';
  return branded.length <= 60 ? branded : core.slice(0, 60).replace(/[\s-]+$/, '');
}

// The 6 canonical decant sizes, in catalogue order (see AGENTS.md).
const SIZE_LIST = [
  { key: '3', label: '3ml' },
  { key: '5', label: '5ml' },
  { key: '7.5', label: '7.5ml' },
  { key: '10', label: '10ml' },
  { key: '20', label: '20ml' },
  { key: '30', label: '30ml' }
];
const SIZE_LABEL = { '3': '3ml', '5': '5ml', '7.5': '7.5ml', '10': '10ml', '20': '20ml', '30': '30ml' };

// Schema availability per size; struck=OutOfStock, coming=PreOrder, ok=InStock.
function sizeAvailability(status) {
  if (status === 'struck') return 'https://schema.org/OutOfStock';
  if (status === 'coming') return 'https://schema.org/PreOrder';
  return 'https://schema.org/InStock';
}

// Top-level product availability: InStock only when at least one size is ok,
// OutOfStock when every size is struck, PreOrder otherwise.
function productAvailability(pr) {
  const vals = SIZE_LIST.map(s => (pr.statusPerSize || {})[s.key] || 'ok');
  if (vals.every(v => v === 'struck')) return 'https://schema.org/OutOfStock';
  if (vals.some(v => v === 'ok')) return 'https://schema.org/InStock';
  return 'https://schema.org/PreOrder';
}

// Rolling, deterministic priceValidUntil: at least 90 days past the newest
// content date we know about, so builds stay idempotent (no Date.now()).
function priceValidUntil() {
  const mods = Object.keys(DATES).map(k => DATES[k] && DATES[k].mod).filter(Boolean).sort();
  const base = mods.length ? mods[mods.length - 1] : TODAY;
  const d = new Date(base + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 120);
  return d.toISOString().slice(0, 10);
}

// One Offer per size (name, sku, price, availability, url, shipping + returns).
function offersFor(pr, opts) {
  opts = opts || {};
  const validUntil = opts.priceValidUntil || priceValidUntil();
  const currency = 'INR';
  const shipping = {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: String(SHIPPING_FLAT), currency: currency },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 3, maxValue: 7, unitCode: 'DAY' }
    }
  };
  return SIZE_LIST.filter(s => pr.prices[s.key] != null).map(s => {
    const st = (pr.statusPerSize || {})[s.key] || 'ok';
    const offer = {
      '@type': 'Offer',
      name: SIZE_LABEL[s.key],
      sku: pr.slug + '-' + s.key,
      price: String(pr.prices[s.key]),
      priceCurrency: currency,
      url: pr.url,
      itemCondition: 'https://schema.org/NewCondition',
      availability: sizeAvailability(st),
      priceValidUntil: validUntil,
      seller: { '@type': 'Organization', name: 'IRAM Perfume' },
      shippingDetails: shipping
    };
    return offer;
  });
}
function offersSchema(pr) {
  const offers = offersFor(pr);
  if (offers.length === 1) return offers[0];
  return { '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: offers[0].price, highPrice: offers[offers.length - 1].price, offerCount: offers.length, offers: offers, url: pr.url };
}

// Absolute bottle image URL for a product (webp preferred, png fallback);
// falls back to the brand logo, then the site logo.
function bottleUrl(pr) {
  const bottleDir = path.join(ROOT, 'images', 'bottles');
  if (fs.existsSync(path.join(bottleDir, pr.slug + '.webp'))) return siteUrl('images/bottles/' + pr.slug + '.webp');
  if (fs.existsSync(path.join(bottleDir, pr.slug + '.png'))) return siteUrl('images/bottles/' + pr.slug + '.png');
  if (pr.brandImg) return siteUrl(pr.brandImg);
  return siteUrl('logo.png');
}
function productImage(pr) {
  const bottleDir = path.join(ROOT, 'images', 'bottles');
  if (fs.existsSync(path.join(bottleDir, pr.slug + '.webp'))) return siteUrl('images/bottles/' + pr.slug + '.webp');
  if (fs.existsSync(path.join(bottleDir, pr.slug + '.png'))) return siteUrl('images/bottles/' + pr.slug + '.png');
  return '';
}

function fragFAQ(pr) {
  const cloneQ = 'Is ' + pr.name + ' by ' + pr.brand + ' a clone or an original?';
  const cloneA = pr.inspired && pr.inspired !== '—' && pr.inspired.trim().toLowerCase() !== 'original'
    ? 'It is a high-quality interpretation inspired by ' + pr.inspired + '. Perfume enthusiasts in India often pick it as an affordable alternative to that profile.'
    : 'It is an original fragrance in the ' + pr.brand + ' catalogue, so there is no clone comparison involved.';
  const priceQ = 'How much does a decant of ' + pr.name + ' by ' + pr.brand + ' cost in India?';
  const priceA = 'IRAM Perfume sells authentic decants of ' + pr.name + ' by ' + pr.brand + ' at 3ml \u20b9' + (pr.prices['3'] ?? '—') + ', 5ml \u20b9' + (pr.prices['5'] ?? '—') + ', 7.5ml \u20b9' + (pr.prices['7.5'] ?? '—') + ', 10ml \u20b9' + (pr.prices['10'] ?? '—') + ', 20ml \u20b9' + (pr.prices['20'] ?? '—') + ' and 30ml \u20b9' + (pr.prices['30'] ?? '—') + '. Shipping is free on ' + FREE_SHIP_MIN_QTY + '-decant orders above \u20b9' + FREE_SHIP_MIN + '. Full bottles are available on request.';
  const wearQ = 'When should I wear ' + pr.name + ' by ' + pr.brand + '?';
  const wearA = pr.gender ? 'A ' + ({ Men: 'men\'s', Women: 'women\'s', Unisex: 'unisex' }[pr.gender] || 'unisex') + ' fragrance, ' : 'A fragrance, ';
  const wearA2 = wearA + 'it works best during ' + bestForLine(pr) + '. It leans ' + (pr.mood || 'versatile') + ' in character with ' + art(scentLine(pr)) + ' ' + scentLine(pr) + ' profile.';
  return [
    [cloneQ, cloneA],
    [priceQ, priceA],
    [wearQ, wearA2]
  ];
}

// ------------------------------------------------------------- page shell
// Shared chrome for every generated sub-page (fragrance + articles). Kept in
// assets/page.css so 190+ pages don't each carry ~4KB of duplicated CSS.
const PAGE_CSS = [
  ':root{--bg:#faf9f7;--card:#fff;--ink:#2d2a24;--muted:#7a7168;--accent:#d4af37;--line:#e8e2d9}',
  '*{box-sizing:border-box;margin:0;padding:0}',
  'body{font-family:Inter,-apple-system,system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased}',
  '.wrap{max-width:860px;margin:0 auto;padding:24px 18px 60px}',
  '.top{display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap;border-bottom:3px solid var(--accent);padding-bottom:14px;margin-bottom:20px}',
  '.top a{color:#0f3460;text-decoration:none;font-weight:600;font-size:14px}',
  '.brand-chip{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#0f3460;font-weight:700}',
  'h1{font-size:26px;line-height:1.25;margin:6px 0 8px}',
  '.lead{color:var(--muted);font-size:15px;margin-bottom:18px}',
  '.pills{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 18px}',
  '.pill{font-size:11px;font-weight:700;padding:3px 10px;border-radius:14px;background:#fff;border:1px solid var(--line);color:#444}',
  '.pill.g{background:#e3f2fd;color:#1565c0;border:0}.pill.w{background:#fce4ec;color:#c62828;border:0}.pill.u{background:#f3e5f5;color:#7b1fa2;border:0}',
  '.pill.so{background:#fdecea;color:#c62828;border:0}.pill.cs{background:#e8f5e9;color:#2e7d32;border:0}.pill.new{background:var(--accent);color:#fff;border:0}',
  '.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px;margin:16px 0;box-shadow:0 2px 8px rgba(0,0,0,.04)}',
  'table{width:100%;border-collapse:collapse;font-size:14px}',
  'th{text-align:left;font-size:12px;color:var(--muted);padding:8px 10px;border-bottom:2px solid var(--line);text-transform:uppercase;letter-spacing:.5px}',
  'td{padding:9px 10px;border-bottom:1px solid #f3efe9}',
  'td.n{font-weight:700;color:#0f3460}',
  'td.strike{text-decoration:line-through;color:#999}',
  'h2{font-size:19px;margin:26px 0 8px;border-bottom:2px solid var(--accent);padding-bottom:6px}',
  '.cta{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;border-radius:12px;padding:18px;margin:22px 0;text-align:center}',
  '.cta h3{font-size:16px;margin-bottom:6px}.cta p{font-size:13px;color:#cfd8e3;margin-bottom:12px}',
  '.btn{display:inline-block;background:var(--accent);color:#1a1a2e;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:8px;margin:2px 4px;font-size:14px}',
  '.btn.ghost{background:transparent;border:1px solid rgba(255,255,255,.5);color:#fff}',
  'details.qa{border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:10px 0;background:#fff}',
  'details.qa summary{cursor:pointer;font-weight:600;font-size:15px;color:#222}',
  'details.qa p{margin-top:8px;font-size:14px;color:#444}',
  '.muted{color:var(--muted);font-size:13px}',
  '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}',
  '.rel{background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px 14px;text-decoration:none;color:var(--ink);font-size:14px;display:block}',
  '.rel b{color:#0f3460}.rel small{display:block;color:var(--muted);margin-top:2px}',
  '.product-bottle{display:block;max-width:100%;height:auto;margin:16px auto;border-radius:12px}',
  '.foot{margin-top:30px;font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:14px}',
  '.crumbs{font-size:12.5px;color:var(--muted);margin-bottom:10px}.crumbs a{color:#0f3460;text-decoration:underline;text-underline-offset:2px}.crumbs a:hover{color:#0a2448}.crumbs span[aria-hidden]{margin:0 4px}'
].join('\n');
let PAGE_CSS_VER = 'dev';
function favicon184() { return '<link rel="icon" type="image/png" href="../logo.png">'; }
function pageShell({ title, desc, body, schema, canonical, og }, lang = 'en-IN') {
  const ogType = (og && og.type) || 'website';
  const ogImage = (og && og.image) || siteUrl('og-image.jpg');
  const articleMeta = ogType === 'article' && og && og.published
    ? '<meta property="article:published_time" content="' + og.published + '">\n'
      + '<meta property="article:modified_time" content="' + (og.modified || og.published) + '">\n'
    : '';
  return '<!DOCTYPE html>\n<html lang="' + lang + '">\n<head>\n'
    + '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    + '<title>' + esc(title) + '</title>\n<meta name="description" content="' + esc(desc) + '">\n'
    + '<meta name="robots" content="index, follow">\n<meta name="theme-color" content="#1a1a2e">\n<link rel="manifest" href="../manifest.webmanifest">\n<link rel="canonical" href="' + canonical + '">\n'
    + '<link rel="icon" type="image/png" href="' + (og && og.iconPath || '../favicon.png') + '">\n'
    + '<meta property="og:type" content="' + ogType + '">\n<meta property="og:title" content="' + esc(title) + '">\n'
    + '<meta property="og:description" content="' + esc(desc) + '">\n<meta property="og:url" content="' + canonical + '">\n'
    + '<meta property="og:image" content="' + esc(ogImage) + '">\n'
    + '<meta property="og:site_name" content="IRAM Perfume">\n'
    + articleMeta
    + '<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="' + esc(title) + '">\n'
    + '<meta name="twitter:description" content="' + esc(desc) + '">\n'
    + '<meta name="twitter:image" content="' + esc(ogImage) + '">\n'
    + (schema && schema.length ? schema.map(x => '<script type="application/ld+json">\n' + JSON.stringify(x, null, 2) + '\n</script>\n').join('') : '')
    + '<link rel="stylesheet" href="../assets/desktop.css">\n'
    + '<link rel="stylesheet" href="../assets/page.css?v=' + PAGE_CSS_VER + '">\n'
    + '</head>\n<body>\n<div class="wrap">\n'
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
      description: 'Buy an authentic ' + pr.name + ' by ' + pr.brand + ' decant in India \u2014 ' + priceString(pr) + '. ' + capLine(art(scentLine(pr))) + ' ' + scentLine(pr) + ' fragrance, ' + inspiredLine(pr) + '. IRAM Perfume ships across India.',
      image: productImage(pr),
      brand: { '@type': 'Brand', name: pr.brand },
      category: pr.cat || 'Fragrance', sku: pr.slug,
      url: pr.url,
      availability: productAvailability(pr),
      offers: offersSchema(pr)
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'IRAM Perfume', item: siteUrl() },
        { '@type': 'ListItem', position: 2, name: pr.brand, item: siteUrl('brands/' + slugify(pr.brand) + '.html') },
        { '@type': 'ListItem', position: 3, name: pr.name, item: pr.url }
      ]
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: fragFAQ(pr).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
    }
  ];
  const priceRows = ['3ml', '5ml', '7.5ml', '10ml', '20ml', '30ml'].map((k, i) => {
    const sz = ['3', '5', '7.5', '10', '20', '30'][i];
    const v = pr.prices[sz];
    const cls = pr.statusPerSize[sz] === 'struck' || pr.statusPerSize[sz] === 'coming' ? 'strike' : 'n';
    const perMl = v == null ? '\u2014' : rupees(Math.round(v / Number(sz)));
    return '<tr><td>' + k + '</td><td class="' + cls + '">' + (v == null ? '\u2014' : rupees(v)) + '</td><td class="muted">' + perMl + '</td></tr>';
  }).join('');
  const wearBits = [];
  if (pr.season) wearBits.push(['Season', pr.season]);
  if (pr.occasion) wearBits.push(['Occasion', pr.occasion]);
  if (pr.time) wearBits.push(['Time of day', pr.time]);
  if (pr.weather) wearBits.push(['Weather', pr.weather]);
  if (pr.family) wearBits.push(['Fragrance family', pr.family]);
  if (pr.gender) wearBits.push(['Made for', pr.gender]);
  const wearRows = wearBits.map(([k, v]) => '<p style="margin-top:8px"><strong>' + esc(k) + ':</strong> ' + esc(k === 'Made for' ? v : tagLine(v)) + '.</p>').join('');
  const pills = [];
  if (pr.gender) pills.push('<span class="pill ' + { Men: 'g', Women: 'w', Unisex: 'u' }[pr.gender] + '">' + pr.gender + '</span>');
  pills.push('<span class="pill ' + (pr.status === 'soldout' ? 'so' : pr.status === 'coming' ? 'cs' : '') + '">' + ({ soldout: 'SOLD OUT', coming: 'COMING SOON', instock: 'In Stock' }[pr.status] || '') + '</span>');
  const relLinks = relatedFor(pr).slice(0, 6).map(r => {
    const rm = minMax(r);
    return '<a class="rel" href="../fragrance/' + r.slug + '.html"><b>' + r.name + '</b><span class="muted">by ' + r.brand + '</span><small>from ' + rupees(rm.min) + '</small></a>';
  }).join('');
  let bottleImg = '', ogPng = '';
  const bottleDir = path.join(ROOT, 'images', 'bottles');
  if (fs.existsSync(path.join(bottleDir, pr.slug + '.png'))) ogPng = pr.slug + '.png';
  else if (fs.existsSync(path.join(bottleDir, pr.slug + '.jpg'))) ogPng = pr.slug + '.jpg';
  if (ogPng && fs.existsSync(path.join(bottleDir, pr.slug + '.webp'))) bottleImg = '../images/bottles/' + pr.slug + '.webp';
  else if (ogPng) bottleImg = '../images/bottles/' + ogPng;
  const noteRows = pr.notes && ['top', 'heart', 'base'].filter(k => Array.isArray(pr.notes[k]) && pr.notes[k].length)
    .map(k => '<p><strong>' + k.charAt(0).toUpperCase() + k.slice(1) + ':</strong> ' + esc(pr.notes[k].join(', ')) + '</p>').join('');
  const details = (noteRows ? '<h2>Notes</h2><div class="card">' + noteRows + '</div>' : '')
    + ((pr.longevityHours || pr.projection) ? '<h2>Performance</h2><div class="card">'
      + (pr.longevityHours ? '<p><strong>Longevity:</strong> Owner-supplied estimate: ' + esc(pr.longevityHours) + ' hours.</p>' : '')
      + (pr.projection ? '<p><strong>Projection:</strong> ' + esc(pr.projection) + '.</p>' : '') + '</div>' : '')
    + (pr.inspiredBrand && pr.inspired && pr.inspired !== 'Original' ? '<h2>Compare with ' + esc(pr.inspiredBrand) + ' ' + esc(pr.inspired) + '</h2><div class="card"><p>This listing is described as inspired by ' + esc(pr.inspiredBrand) + ' ' + esc(pr.inspired) + '. It is not presented as the same formula; compare the listed scent profile and choose based on your own preference.</p></div>' : '')
    + '<p class="muted">Learn <a href="/authenticity.html">how this decant is filled and verified</a>.</p>';
  const body = ''
    + '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="../brands/' + slugify(pr.brand) + '.html">' + esc(pr.brand) + '</a> <span aria-hidden="true">/</span> <span aria-current="page">' + esc(pr.name) + '</span></nav>'
    + '<div class="top"><div><div class="brand-chip">' + esc(pr.brand.toUpperCase()) + '</div><h1>' + esc(pr.brand) + ' ' + esc(pr.name) + ' Decant in India</h1></div><a href="/">\u2190 Full collection</a></div>'
    + (bottleImg ? '<img class="product-bottle" src="' + bottleImg + '" alt="' + esc(pr.brand) + ' ' + esc(pr.name) + ' perfume bottle"' + (ogPng ? imgDims('images/bottles/' + ogPng) : '') + ' fetchpriority="high" decoding="async"' + (pr.status === 'soldout' ? ' style="filter:grayscale(1);opacity:.55"' : '') + '>' : '')
    + '<p class="lead">' + esc(pr.name) + ' by ' + esc(pr.brand) + ' as an authentic decant \u2014 ' + art(scentLine(pr)) + ' ' + esc(scentLine(pr)) + '. ' + esc(inspiredLine(pr)) + '. Ships across India with ' + FREE_SHIP_ABOVE + '.</p>'
    + '<div class="pills">' + pills.join('') + '</div>'
    + '<div class="card"><h2 style="margin-top:0">Prices (per ml gets cheaper as size grows)</h2><table><thead><tr><th>Size</th><th>Price</th><th>Per ml</th></tr></thead><tbody>' + priceRows + '</tbody></table><p class="muted" style="margin-top:10px">' + esc(probeAvailability) + '</p></div>'
    + '<div class="cta"><h3>Order ' + esc(pr.name) + ' Today</h3><p>Copy your choice and message us on WhatsApp \u2014 we confirm stock and payment instantly.</p><a class="btn" href="' + waLink('Hi! I want to order a decant of ' + pr.name + ' by ' + pr.brand + ': 5ml \u20b9' + (pr.prices['5'] ?? '?') + ', 20ml \u20b9' + (pr.prices['20'] ?? '?') + ', 30ml \u20b9' + (pr.prices['30'] ?? '?')) + '">Order on WhatsApp</a><a class="btn ghost" href="tel:' + PHONE_TEL + '">Call ' + PHONE_DISPLAY + '</a></div>'
    + '<h2>About ' + esc(pr.name) + '</h2>'
    + '<div class="card"><p><strong>Notes / profile:</strong> ' + esc(scentLine(pr)) + '.</p>'
    + '<p style="margin-top:8px"><strong>Best for:</strong> ' + esc(bestForLine(pr)) + '.</p>'
    + (pr.mood ? '<p style="margin-top:8px"><strong>Mood:</strong> ' + esc(tagLine(pr.mood)) + '.</p>' : '')
    + '<p style="margin-top:8px"><strong>Reminds me of:</strong> ' + esc(pr.inspired && pr.inspired !== '—' && pr.inspired.trim().toLowerCase() !== 'original' ? pr.inspired : 'Original / unique') + '.</p>'
    + (pr.links ? '<p style="margin-top:8px"><strong>References:</strong> ' + pr.links + '</p>' : '') + '</div>'
    + details
    + '<h2>How to wear ' + esc(pr.name) + '</h2><div class="card">' + wearRows
    + '<p style="margin-top:8px">A 3ml decant is the smallest way to try this scent before committing to a larger size. New to decants? Read the <a href="/articles/decant-vs-full-bottle.html">decant vs full bottle guide</a>, or see <a href="/articles/make-perfume-last-longer.html">how to make perfume last longer</a>.</p></div>'
    + '<h2>Frequently Asked Questions</h2>'
    + fragFAQ(pr).map(([q, a]) => '<details class="qa"><summary>' + esc(q) + '</summary><p>' + esc(a) + '</p></details>').join('')
    + '<h2>Similar Fragrances You May Like</h2><div class="grid">' + relLinks + '</div>'
    + '<div class="foot">IRAM Perfume \u00b7 ' + esc(PHONE_DISPLAY) + ' \u00b7 <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> \u00b7 <a href="' + WA + '">WhatsApp Community</a> \u00b7 <a href="/articles/decant-vs-full-bottle.html">Decant guide</a> \u00b7 <a href="/articles/summer-decants-under-500.html">Summer picks</a> \u00b7 <a href="/">Back to all fragrances</a></div>';
  const ogCard = path.join(ROOT, 'images', 'og', pr.slug + '.jpg');
  const ogImg = fs.existsSync(ogCard)
    ? siteUrl('images/og/' + pr.slug + '.jpg')
    : (ogPng ? siteUrl('images/bottles/' + ogPng) : (pr.brandImg ? siteUrl(pr.brandImg) : siteUrl('logo.png')));
  let ogDesc = 'Buy ' + pr.name + ' by ' + pr.brand + ' decant in India' + (pr.status === 'instock' ? ' \u2014 from ' + rupees(mm.min) + ' (3ml\u201330ml).' : ' (3ml\u201330ml).');
  const inspBit = capLine(inspiredLine(pr)) + '.';
  const shipBit = ' Free shipping over \u20b9' + FREE_SHIP_MIN + ' on ' + FREE_SHIP_MIN_QTY + '+ decants.';
  if ((ogDesc + ' ' + inspBit + shipBit).length <= 160) ogDesc += ' ' + inspBit;
  ogDesc += shipBit;
  return pageShell({
    title: productTitle(pr),
    desc: ogDesc,
    canonical: pr.url, body, schema, og: { image: ogImg }
  });
}

// ------------------------------------------------------------ brand pages
function brandPage(brand, items, allBrands) {
  const slug = slugify(brand);
  const url = siteUrl('brands/' + slug + '.html');
  const minP = Math.min(...items.map(p => minMax(p).min));
  const maxP = Math.max(...items.map(p => minMax(p).max));
  const genders = [...new Set(items.map(p => p.gender).filter(Boolean))];
  const families = [...new Set(items.flatMap(p => String(p.family || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)))].slice(0, 4);
  const nameList = items.slice(0, 6).map(p => p.name).join(', ') + (items.length > 6 ? ' and more' : '');
  const isDesigner = items.some(p => p.cat === 'Designer');

  const cards = items.map(pr => {
    const mm = minMax(pr);
    const status = pr.status === 'soldout' ? 'SOLD OUT' : pr.status === 'coming' ? 'COMING SOON' : '';
    return '<a class="rel" href="../fragrance/' + pr.slug + '.html"><b>' + esc(pr.name) + '</b>'
      + '<span class="muted">' + esc(pr.gender || 'Fragrance') + (status ? ' \u00b7 ' + status : '') + '</span>'
      + '<small>from ' + rupees(mm.min) + '</small></a>';
  }).join('');

  const faqs = [
    ['Which ' + brand + ' fragrances can I buy as decants?',
      'IRAM Perfume currently lists ' + items.length + ' ' + brand + ' fragrance' + (items.length === 1 ? '' : 's') + ' as decants: ' + nameList + '.'],
    ['How much does a ' + brand + ' decant cost?',
      brand + ' decants start from ' + rupees(minP) + '. Each fragrance page lists prices for 3ml, 5ml, 7.5ml, 10ml, 20ml and 30ml.'],
    ['Are ' + brand + ' decants authentic?',
      'IRAM Perfume fills decants from original ' + brand + ' bottles bought from trusted suppliers, and shares proof on request.']
  ];

  const schema = [
    {
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      name: brand + ' Perfume Decants', url: url,
      description: 'Shop ' + brand + ' perfume decants in India in 3ml, 5ml, 7.5ml, 10ml, 20ml and 30ml sizes.',
      mainEntity: {
        '@type': 'ItemList', numberOfItems: items.length,
        itemListElement: items.map((pr, i) => ({ '@type': 'ListItem', position: i + 1, name: pr.name + ' by ' + brand, url: pr.url }))
      }
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'IRAM Perfume', item: siteUrl() },
        { '@type': 'ListItem', position: 2, name: brand, item: url }
      ]
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
    }
  ];

  const others = allBrands.filter(b => b !== brand).slice(0, 8)
    .map(b => '<a class="rel" href="' + slugify(b) + '.html"><b>' + esc(b) + '</b><small>View decants</small></a>').join('');

  const body = ''
    + '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <span aria-current="page">' + esc(brand) + '</span></nav>'
    + '<div class="top"><div><div class="brand-chip">BRAND</div><h1>' + esc(brand) + ' Perfume Decants in India</h1></div><a href="/">\u2190 Full collection</a></div>'
    + '<p class="lead">Shop ' + items.length + ' ' + esc(brand) + ' fragrance' + (items.length === 1 ? '' : 's') + ' as decants \u2014 from ' + rupees(minP) + ' for 3ml, with 5ml, 7.5ml, 10ml, 20ml and 30ml sizes on every product page. ' + (isDesigner ? 'Designer' : 'Middle Eastern') + ' perfumery, shipped across India with ' + FREE_SHIP_ABOVE + '.</p>'
    + '<div class="pills">'
    + '<span class="pill">' + items.length + ' fragrance' + (items.length === 1 ? '' : 's') + '</span>'
    + '<span class="pill">From ' + rupees(minP) + '</span>'
    + '<span class="pill">Up to ' + rupees(maxP) + '</span>'
    + (genders.length ? '<span class="pill">' + esc(genders.join(' / ')) + '</span>' : '')
    + '</div>'
    + '<h2>' + esc(brand) + ' decants &amp; prices</h2><div class="grid">' + cards + '</div>'
    + (families.length ? '<h2>What ' + esc(brand) + ' smells like</h2><div class="card"><p>' + esc(brand) + ' fragrances in this catalogue lean toward ' + esc(families.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')) + ' families. Open any fragrance page for its notes, best season and occasion, and a full 3ml\u201330ml price list.</p></div>' : '')
    + '<h2>Frequently Asked Questions</h2>'
    + faqs.map(([q, a]) => '<details class="qa"><summary>' + esc(q) + '</summary><p>' + esc(a) + '</p></details>').join('')
    + '<h2>Explore other brands</h2><div class="grid">' + others + '</div>'
    + '<div class="foot">IRAM Perfume \u00b7 ' + esc(PHONE_DISPLAY) + ' \u00b7 <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> \u00b7 <a href="' + WA + '">WhatsApp Community</a> \u00b7 <a href="/articles/decant-vs-full-bottle.html">Decant guide</a> \u00b7 <a href="/articles/summer-decants-under-500.html">Summer picks</a> \u00b7 <a href="/">Back to all fragrances</a></div>';

  let desc = 'Shop ' + brand + ' perfume decants in India from ' + rupees(minP) + ' \u2014 ' + items.length + ' fragrance' + (items.length === 1 ? '' : 's') + ', 3ml to 30ml. Free shipping over \u20b9' + FREE_SHIP_MIN + ' on ' + FREE_SHIP_MIN_QTY + '+ decants.';
  if (desc.length > 160) desc = 'Shop ' + brand + ' perfume decants in India from ' + rupees(minP) + ' \u2014 3ml to 30ml. Free shipping over \u20b9' + FREE_SHIP_MIN + '.';

  return pageShell({
    title: brand + ' Perfume Decants in India \u2014 Prices | IRAM Perfume',
    desc: desc,
    canonical: url,
    body: body,
    schema: schema,
    og: { image: siteUrl('og-image.jpg') }
  });
}
function brandPageSlug(brand) { return slugify(brand); }

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
  // render once with the date masked to hash the *whole* page (so a change to
  // the shared shell/CSS also bumps dateModified), then render for real.
  const sig = contentSig(buildArticle(a, innerBody, faqs, a.pub, DATE_MASK));
  const mod = dateFor('article:' + a.slug, sig);
  return buildArticle(a, innerBody, faqs, a.pub, mod);
}
function buildArticle(a, innerBody, faqs, pub, mod) {
  const schema = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.desc, datePublished: pub, dateModified: mod, author: { '@type': 'Organization', name: 'IRAM Perfume', url: siteUrl() }, publisher: { '@type': 'Organization', name: 'IRAM Perfume', url: siteUrl(), logo: { '@type': 'ImageObject', url: siteUrl('logo.png'), width: 512, height: 512 } }, mainEntityOfPage: a.url, url: a.url, image: siteUrl('og-image.jpg') },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'IRAM Perfume', item: siteUrl() },
      { '@type': 'ListItem', position: 2, name: a.title, item: a.url }
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, x]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: x } })) }
  ];
  const body = '<div class="top"><div><div class="brand-chip">IRAM PERFUME \u00b7 GUIDES</div><h1>' + esc(a.title) + '</h1></div><a href="/">\u2190 Full collection</a></div>'
    + '<p class="lead">' + esc(a.desc) + '</p>' + innerBody
    + '<div class="cta"><h3>Shop the Selection</h3><p>Browse the full decant catalogue \u2014 ' + FREE_SHIP_ABOVE + '.</p><a class="btn" href="/">View All Fragrances</a><a class="btn ghost" href="https://wa.me/' + PHONE_TEL.replace('+', '') + '">WhatsApp Us</a></div>'
    + '<div class="foot">IRAM Perfume \u00b7 ' + esc(PHONE_DISPLAY) + ' \u00b7 <a href="mailto:' + EMAIL + '">' + EMAIL + '</a></div>';
  return pageShell({ title: a.title, desc: a.desc, canonical: a.url, body, schema, og: { iconPath: '../favicon.png', type: 'article', image: siteUrl('og-image.jpg'), published: pub, modified: mod } });
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
  { slug: 'summer-decants-under-500', pub: '2026-09-10', title: 'Top 10 Summer Decants Under \u20b9500 in India (2026)', desc: 'Fresh summer perfume decants you can buy in India under \u20b9500 \u2014 picked by season and price for office, daily wear and hot weather.' },
  { slug: 'winter-date-night-decants-under-500', pub: '2026-09-10', title: '10 Best Winter Date-Night Decants Under \u20b9500 in India', desc: 'Warm, sweet and cozy winter evening perfumes at decant prices under \u20b9500 \u2014 perfect for dates, parties and cold nights across India.' },
  { slug: 'decant-vs-full-bottle', pub: '2026-09-10', title: 'Decant vs Full Bottle: What\u2019s Smarter for Testing Perfumes in India?', desc: 'Should you buy a decant or a full 100ml bottle? We break down the per-ml math with real examples so you decide before spending.' },
  { slug: 'make-perfume-last-longer', pub: '2026-09-10', title: 'How to Make Perfume Last Longer (and Get More from a 30ml Decant)', desc: 'Practical tips to get more from your perfume \u2014 storage, pulse-point application and layering. Works for any 30ml decant.' }
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
      ['Is shipping free for a single decant?', 'No \u2014 shipping is free on orders of ' + FREE_SHIP_MIN_QTY + '+ decants above \u20b9' + FREE_SHIP_MIN + '. A single-decant order ships at a flat \u20b9' + SHIPPING_FLAT + ', so bundle two or more.']
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
      + '<li>Spray on your sweater or scarf \u2014 fabric can hold a winter gourmand longer than skin</li>'
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

// ----------------------------------------------- bottles.html (homepage move)
// Bottle Options + Collection Statistics live on their own root page now.
// The statistics mirror the old runtime computeStats() in app.js, evaluated at
// build time from products.json (reference: 189/37, 16/173, 92/7/90, 1 coming
// soon, ₹299 Ajmal Wave, ₹2,599 Swiss Arabian Incense 01, avgs 126/193/294/
// 365/690/972, fresh 87 / woody 116 / sweet 77).
function collectionStats() {
  const SIZES = ['3', '5', '7.5', '10', '20', '30'];
  const brands = new Set();
  let designer = 0, me = 0, men = 0, women = 0, unisex = 0;
  let fresh = 0, woody = 0, sweet = 0, coming = 0;
  const prices = { '3': [], '5': [], '7.5': [], '10': [], '20': [], '30': [] };
  let cheap = { price: Infinity, name: '', brand: '' }, exp = { price: 0, name: '', brand: '' };
  for (const pr of products) {
    brands.add(pr.brand);
    if (pr.cat === 'Designer') designer++; else me++;
    if (pr.gender === 'Men') men++;
    else if (pr.gender === 'Women') women++;
    else if (pr.gender === 'Unisex') unisex++;
    const combined = ((pr.scent || '') + ',' + (pr.family || '')).toLowerCase();
    if (combined.indexOf('fresh') !== -1 || combined.indexOf('aquatic') !== -1 || combined.indexOf('citrus') !== -1) fresh++;
    if (combined.indexOf('woody') !== -1 || combined.indexOf('amber') !== -1) woody++;
    if (combined.indexOf('sweet') !== -1 || combined.indexOf('vanilla') !== -1 || combined.indexOf('gourmand') !== -1) sweet++;
    if (pr.status === 'coming') coming++;
    for (const k of SIZES) { const v = pr.prices[k]; if (typeof v === 'number') prices[k].push(v); }
    const p30 = pr.prices['30'];
    if (typeof p30 === 'number') {
      if (p30 < cheap.price) cheap = { price: p30, name: pr.name, brand: pr.brand };
      if (p30 > exp.price) exp = { price: p30, name: pr.name, brand: pr.brand };
    }
  }
  const avg = a => { if (!a.length) return 0; return Math.round(a.reduce((x, y) => x + y, 0) / a.length); };
  const rup = n => (n === 0 || n === Infinity ? '\u2014' : '\u20b9' + n.toLocaleString('en-IN'));
  return {
    total: products.length, brands: brands.size, designer, me, men, women, unisex, coming,
    cheapest: cheap.price === Infinity ? '\u2014' : rup(cheap.price) + ' (' + cheap.brand + ' ' + cheap.name + ')',
    expensive: exp.price === 0 ? '\u2014' : rup(exp.price) + ' (' + exp.brand + ' ' + exp.name + ')',
    avg3: rup(avg(prices['3'])), avg5: rup(avg(prices['5'])), avg75: rup(avg(prices['7.5'])),
    avg10: rup(avg(prices['10'])), avg20: rup(avg(prices['20'])), avg30: rup(avg(prices['30'])),
    fresh, woody, sweet
  };
}

const BOTTLE_SHOP_HTML = `<div class="bottle-shop">
  <div class="bottle-card" data-bottle="group">
    <div class="bottle-media"><img src="bottles/empty-3-5-7-5ml.jpg" alt="Empty 3ml, 5ml and 7.5ml spray bottles" width="1400" height="1050" loading="lazy" decoding="async"></div>
    <div class="bottle-body">
      <div class="bottle-name">3ml / 5ml / 7.5ml</div>
      <div class="bottle-opts" role="group" aria-label="Bottle size">
        <button type="button" class="bottle-opt" data-size="3ml" aria-pressed="true">3ml</button>
        <button type="button" class="bottle-opt" data-size="5ml" aria-pressed="false">5ml</button>
        <button type="button" class="bottle-opt" data-size="7.5ml" aria-pressed="false">7.5ml</button>
      </div>
      <div class="bottle-opts" role="group" aria-label="Atomizer type">
        <button type="button" class="bottle-opt" data-frag="Plastic Atomizer Bottle" data-price="15" aria-pressed="true">Plastic &middot; &#8377;15</button>
        <button type="button" class="bottle-opt" data-frag="Metal Black Atomizer Bottle" data-price="25" aria-pressed="false">Metal Black &middot; &#8377;25</button>
        <button type="button" class="bottle-opt" data-frag="Metal Gold Atomizer Bottle" data-price="25" aria-pressed="false">Metal Gold &middot; &#8377;25</button>
      </div>
      <div class="bottle-price"><span data-price-out>&#8377;15</span></div>
      <button type="button" class="bottle-add">&#128722; Add to Cart</button>
    </div>
  </div>
  <div class="bottle-card" data-bottle="10" data-size="10ml">
    <div class="bottle-media"><img src="bottles/empty-10ml.jpg" alt="Empty 10ml spray bottle" width="1400" height="1050" loading="lazy" decoding="async"></div>
    <div class="bottle-body">
      <div class="bottle-name">10ml</div>
      <div class="bottle-opts" role="group" aria-label="Atomizer colour">
        <button type="button" class="bottle-opt" data-frag="Metal Black Atomizer Bottle" data-price="28" aria-pressed="true">Metal Black &middot; &#8377;28</button>
        <button type="button" class="bottle-opt" data-frag="Metal Gold Atomizer Bottle" data-price="28" aria-pressed="false">Metal Gold &middot; &#8377;28</button>
      </div>
      <div class="bottle-price"><span data-price-out>&#8377;28</span></div>
      <button type="button" class="bottle-add">&#128722; Add to Cart</button>
    </div>
  </div>
  <div class="bottle-card" data-bottle="20" data-size="20ml">
    <div class="bottle-media"><img src="bottles/empty-20ml.jpg" alt="Empty 20ml spray bottle in gold and black" width="1400" height="1050" loading="lazy" decoding="async"></div>
    <div class="bottle-body">
      <div class="bottle-name">20ml</div>
      <div class="bottle-note">Pressurised atomiser</div>
      <div class="bottle-opts" role="group" aria-label="Bottle colour">
        <button type="button" class="bottle-opt" data-frag="Round Gold Bottle" data-price="30" aria-pressed="true">Gold &middot; &#8377;30</button>
        <button type="button" class="bottle-opt" data-frag="Round Black Bottle" data-price="30" aria-pressed="false">Black &middot; &#8377;30</button>
      </div>
      <div class="bottle-price"><span data-price-out>&#8377;30</span></div>
      <button type="button" class="bottle-add">&#128722; Add to Cart</button>
    </div>
  </div>
  <div class="bottle-card" data-bottle="30" data-size="30ml">
    <div class="bottle-media"><img src="bottles/empty-30ml.jpg" alt="Empty 30ml spray bottle, square and oval, gold and black" width="1400" height="1050" loading="lazy" decoding="async"></div>
    <div class="bottle-body">
      <div class="bottle-name">30ml</div>
      <div class="bottle-note">Pressurised atomiser</div>
      <div class="bottle-opts" role="group" aria-label="Bottle style">
        <button type="button" class="bottle-opt" data-frag="Square Gold Bottle" data-price="35" aria-pressed="true">Square Gold &middot; &#8377;35</button>
        <button type="button" class="bottle-opt" data-frag="Square Black Bottle" data-price="35" aria-pressed="false">Square Black &middot; &#8377;35</button>
        <button type="button" class="bottle-opt" data-frag="Oval Gold Bottle" data-price="35" aria-pressed="false">Oval Gold &middot; &#8377;35</button>
        <button type="button" class="bottle-opt" data-frag="Oval Black Bottle" data-price="35" aria-pressed="false">Oval Black &middot; &#8377;35</button>
      </div>
      <div class="bottle-price"><span data-price-out>&#8377;35</span></div>
      <button type="button" class="bottle-add">&#128722; Add to Cart</button>
    </div>
  </div>
  <div class="bottle-card bottle-card-info" data-bottle="50">
    <div class="bottle-media"><img src="bottles/50ml-bottle-on-demand.jpeg" alt="50ml bottle on demand" width="1200" height="1600" loading="lazy" decoding="async"></div>
    <div class="bottle-body">
      <div class="bottle-name">50ml</div>
      <p class="bottle-note">On request &mdash; message us on WhatsApp for availability and price.</p>
      <a class="bottle-add bottle-add-wa" href="https://chat.whatsapp.com/JSWEIoCsFd96wzlRAeaewe" target="_blank" rel="noopener">Ask on WhatsApp</a>
    </div>
  </div>
</div>`;

function statsDashHtml(st) {
  const sv = (id, val) => '<div class="stat-value" id="' + id + '">' + esc(val) + '</div>';
  const sc = (cls, id, val, label) => '<div class="stat-card ' + cls + '">' + sv(id, val) + '<div class="stat-label">' + label + '</div></div>';
  const sb = (id, val, label) => '<div class="stat-sub">' + sv(id, val) + '<div class="stat-label">' + label + '</div></div>';
  return '<div class="stats-dashboard" id="statsDashboard">\n'
    + '<h3 style="margin:0 0 12px 0;font-size:15px;font-weight:700;color:var(--text-heading)">Collection Statistics</h3>\n'
    + '<div class="stats-grid" id="statsGrid">\n'
    + '  ' + sc('highlight', 'statTotal', st.total, 'Total Fragrances') + '\n'
    + '  ' + sc('highlight', 'statBrands', st.brands, 'Total Brands') + '\n'
    + '  ' + sc('', 'statDesigner', st.designer, 'Designer') + '\n'
    + '  ' + sc('', 'statMiddleEastern', st.me, 'Middle Eastern') + '\n'
    + '  ' + sc('', 'statMen', st.men, 'Men\u2019s') + '\n'
    + '  ' + sc('', 'statWomen', st.women, 'Women\u2019s') + '\n'
    + '  ' + sc('', 'statUnisex', st.unisex, 'Unisex') + '\n'
    + '  ' + sc('accent', 'statComingSoon', st.coming, 'Coming Soon') + '\n'
    + '  ' + sc('wide', 'statCheapest', st.cheapest, 'Cheapest (30ml)') + '\n'
    + '  ' + sc('wide', 'statExpensive', st.expensive, 'Most Expensive (30ml)') + '\n'
    + '</div>\n'
    + '<div class="stats-subgrid" id="statsSubGrid">\n'
    + '  ' + sb('statAvg3ml', st.avg3, 'Avg 3ml') + '\n'
    + '  ' + sb('statAvg5ml', st.avg5, 'Avg 5ml') + '\n'
    + '  ' + sb('statAvg7ml', st.avg75, 'Avg 7.5ml') + '\n'
    + '  ' + sb('statAvg10ml', st.avg10, 'Avg 10ml') + '\n'
    + '  ' + sb('statAvg20ml', st.avg20, 'Avg 20ml') + '\n'
    + '  ' + sb('statAvg30ml', st.avg30, 'Avg 30ml') + '\n'
    + '  ' + sb('statFresh', st.fresh, 'Fresh') + '\n'
    + '  ' + sb('statWoody', st.woody, 'Woody') + '\n'
    + '  ' + sb('statSweet', st.sweet, 'Sweet') + '\n'
    + '</div>\n'
    + '</div>';
}

function buildBottles(mod) {
  const st = collectionStats();
  const cssV = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'assets/app.css'))).digest('hex').slice(0, 12);
  const canonical = siteUrl('bottles.html');
  const title = 'Bottle Options & Collection Statistics | IRAM Perfume';
  const desc = 'Empty 3ml to 30ml spray bottles with plastic and metal atomisers from \u20b915, plus collection statistics for IRAM Perfume\u2019s ' + products.length + ' fragrance decants in India.';
  const schema = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description: desc, url: canonical, dateModified: mod, isPartOf: { '@type': 'WebSite', name: 'IRAM Perfume', url: siteUrl() } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'IRAM Perfume', item: siteUrl() },
      { '@type': 'ListItem', position: 2, name: 'Bottle Options', item: canonical }
    ] }
  ];
  const body = ''
    + '<header class="desktop-store-header" aria-label="IRAM Perfume navigation"><a class="desktop-brand" href="index.html"><img src="logo-banner.png" alt="" width="42" height="42">IRAM PERFUME</a><nav class="desktop-nav" aria-label="Main navigation"><a href="index.html">Home</a><a href="index.html#catalogue">Shop</a><a href="index.html#filterBar">Brands</a><a href="index.html#bestsellers">Bestsellers</a><a href="bottles.html" aria-current="page">Bottles</a><a href="contact.html">Contact</a></nav><div class="desktop-actions"><a class="desktop-cart" href="index.html#catalogue" aria-label="Open cart on the shop page">&#128722;</a><button type="button" class="desktop-theme" data-theme-toggle aria-label="Toggle dark mode"><span class="theme-ico theme-ico-moon">&#9789;</span><span class="theme-ico theme-ico-sun">&#9788;</span></button></div></header>\n'
    + '<div class="btl-header" aria-label="IRAM Perfume"><a href="index.html" aria-label="Back to home">&#8592;</a><a class="btl-brand" href="index.html">IRAM PERFUME</a><a href="tel:' + PHONE_TEL + '" aria-label="Call us">&#9742;</a><button type="button" data-theme-toggle aria-label="Toggle dark mode"><span class="theme-ico theme-ico-moon">&#9789;</span><span class="theme-ico theme-ico-sun">&#9788;</span></button><a href="index.html#catalogue" aria-label="Open cart on the shop page">&#128722;</a></div>\n'
    + '<main class="btl-main" id="top">\n'
    + '<div class="btl-hero"><div><a class="btl-back" href="index.html">&#8592; Full collection</a><h1>Bottle Options</h1><p class="btl-lead">Empty spray bottles for decants and travel \u2014 pick a size and atomiser, add it to your cart, and we ship it along with your order.</p></div></div>\n'
    + '<div id="bottles">\n' + BOTTLE_SHOP_HTML + '\n</div>\n'
    + statsDashHtml(st) + '\n'
    + '</main>\n'
    + '<footer class="site-footer"><div><h2>IRAM Perfume</h2><p>Authentic designer and Middle Eastern decants, filled with care in India.</p><p>Free shipping on orders over \u20b9999 (min 2 decants).</p></div><div><h2>Shop</h2><a href="index.html#catalogue">All fragrances</a><a href="index.html#bestsellers">Bestsellers</a><a href="bottles.html" aria-current="page">Bottle options</a></div><div><h2>Contact</h2><a href="contact.html">Contact &amp; FAQs</a><a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a><a href="mailto:' + EMAIL + '">' + EMAIL + '</a></div><div><h2>Follow</h2><a href="' + IG + '" target="_blank" rel="noopener">Instagram</a><a href="' + WA + '" target="_blank" rel="noopener">WhatsApp community</a><p>Secure packing \u00b7 India-wide delivery</p></div></footer>\n'
    + '<div id="toastRoot"></div>\n'
    + '<script>(function(){var root=document.documentElement,s=null;try{s=localStorage.getItem(\'theme\')}catch(e){}if(s===\'dark\'||(!s&&window.matchMedia&&window.matchMedia(\'(prefers-color-scheme:dark)\').matches))root.setAttribute(\'data-theme\',\'dark\');document.querySelectorAll(\'[data-theme-toggle]\').forEach(function(t){t.addEventListener(\'click\',function(){var dark=root.getAttribute(\'data-theme\')===\'dark\';if(dark){root.removeAttribute(\'data-theme\');try{localStorage.setItem(\'theme\',\'light\')}catch(e){}}else{root.setAttribute(\'data-theme\',\'dark\');try{localStorage.setItem(\'theme\',\'dark\')}catch(e){}}})})})();</' + 'script>\n'
    + '<' + 'script>\n'
    + 'try{(function(){\n'
    + '  var root=document.getElementById(\'toastRoot\');\n'
    + '  if(!root)return;\n'
    + '  var reduce=window.matchMedia&&window.matchMedia(\'(prefers-reduced-motion:reduce)\').matches;\n'
    + '  function toast(msg,kind){\n'
    + '    kind=kind||\'ok\';\n'
    + '    var el=document.createElement(\'div\');\n'
    + '    el.className=\'toast toast-\'+(kind===\'err\'?\'err\':\'ok\');\n'
    + '    el.innerHTML=\'<span class="toast-icon">\'+(kind===\'err\'?\'&#9888;\':\'&#10003;\')+\'</span><span class="toast-msg"></span>\'\n'
    + '      +\'<button type="button" class="toast-x" aria-label="Dismiss">&times;</button>\';\n'
    + '    el.querySelector(\'.toast-msg\').textContent=String(msg||\'\');\n'
    + '    root.appendChild(el);\n'
    + '    var t=null;\n'
    + '    function dismiss(){\n'
    + '      if(t){clearTimeout(t);t=null}\n'
    + '      el.classList.add(\'out\');\n'
    + '      setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el)},reduce?0:240);\n'
    + '    }\n'
    + '    el.querySelector(\'.toast-x\').addEventListener(\'click\',dismiss);\n'
    + '    requestAnimationFrame(function(){el.classList.add(\'in\')});\n'
    + '    t=setTimeout(dismiss,3200);\n'
    + '    while(root.children.length>4)root.removeChild(root.firstChild);\n'
    + '    return dismiss;\n'
    + '  }\n'
    + '  window.__toast=toast;\n'
    + '})()}catch(e){}\n'
    + 'function addBottleToCart(brand,frag,size,price,qty){\n'
    + '  var cart=[];\n'
    + '  try{cart=JSON.parse(localStorage.getItem(\'iram_cart\')||\'[]\')||[]}catch(e){cart=[]}\n'
    + '  var n=Math.max(1,Math.min(99,parseInt(qty,10)||1));\n'
    + '  var key=brand+\'|\'+frag+\'|\'+size;\n'
    + '  var found=false;\n'
    + '  for(var i=0;i<cart.length;i++){if(cart[i].key===key){cart[i].qty+=n;found=true;break}}\n'
    + '  if(!found)cart.push({key:key,brand:brand,frag:frag,size:size,price:price,qty:n});\n'
    + '  try{localStorage.setItem(\'iram_cart\',JSON.stringify(cart))}catch(e){}\n'
    + '  if(window.__toast)window.__toast((n>1?n+\'\u00D7 \':\'\')+size+\' \'+frag+\' added to cart\');\n'
    + '}\n'
    + '(function(){\n'
    + '  var cards=document.querySelectorAll(\'.bottle-card[data-bottle]\');\n'
    + '  if(!cards.length)return;\n'
    + '  cards.forEach(function(card){\n'
    + '    var out=card.querySelector(\'[data-price-out]\');\n'
    + '    function sync(){\n'
    + '      var p=card.querySelector(\'.bottle-opt[data-price][aria-pressed="true"]\');\n'
    + '      if(p&&out)out.textContent=\'\u20B9\'+parseInt(p.getAttribute(\'data-price\'),10);\n'
    + '    }\n'
    + '    card.querySelectorAll(\'.bottle-opts\').forEach(function(group){\n'
    + '      group.addEventListener(\'click\',function(e){\n'
    + '        var b=e.target.closest(\'.bottle-opt\');\n'
    + '        if(!b||!group.contains(b))return;\n'
    + '        group.querySelectorAll(\'.bottle-opt\').forEach(function(o){o.setAttribute(\'aria-pressed\',\'false\')});\n'
    + '        b.setAttribute(\'aria-pressed\',\'true\');\n'
    + '        sync();\n'
    + '      });\n'
    + '    });\n'
    + '    var add=card.querySelector(\'.bottle-add\');\n'
    + '    if(add)add.addEventListener(\'click\',function(){\n'
    + '      var pb=card.querySelector(\'.bottle-opt[data-price][aria-pressed="true"]\');\n'
    + '      if(!pb)return;\n'
    + '      var sb=card.querySelector(\'.bottle-opt[data-size][aria-pressed="true"]\');\n'
    + '      var size=sb?sb.getAttribute(\'data-size\'):card.getAttribute(\'data-size\');\n'
    + '      if(!size)return;\n'
    + '      addBottleToCart(\'Bottles\',pb.getAttribute(\'data-frag\'),size,parseInt(pb.getAttribute(\'data-price\'),10),1);\n'
    + '    });\n'
    + '    sync();\n'
    + '  });\n'
    + '})();\n'
    + '</' + 'script>\n';
  return '<!DOCTYPE html>\n<html lang="en-IN">\n<head>\n'
    + '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    + '<title>' + esc(title) + '</title>\n<meta name="description" content="' + esc(desc) + '">\n'
    + '<meta name="robots" content="index, follow">\n<link rel="canonical" href="' + canonical + '">\n'
    + '<link rel="icon" type="image/png" href="favicon.png">\n'
    + '<meta property="og:type" content="website">\n<meta property="og:title" content="' + esc(title) + '">\n'
    + '<meta property="og:description" content="' + esc(desc) + '">\n'
    + '<meta property="og:url" content="' + canonical + '">\n'
    + '<meta property="og:image" content="' + siteUrl('og-image.jpg') + '">\n'
    + '<meta property="og:site_name" content="IRAM Perfume">\n'
    + '<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="' + esc(title) + '">\n'
    + '<meta name="twitter:description" content="' + esc(desc) + '">\n'
    + '<meta name="twitter:image" content="' + siteUrl('og-image.jpg') + '">\n'
    + schema.map(x => '<script type="application/ld+json">\n' + JSON.stringify(x, null, 2) + '\n</script>\n').join('')
    + '<link rel="stylesheet" href="assets/app.css?v=' + cssV + '">\n'
    + '<link rel="stylesheet" href="assets/desktop.css">\n'
    + '<style>.btl-header{display:none}'
    + '.btl-main{max-width:1200px;margin:0 auto;padding:34px 32px 60px}'
    + '.btl-hero{margin-bottom:4px}'
    + '.btl-back{font-size:13.5px;font-weight:700;color:var(--accent-link);text-decoration:none}'
    + '.btl-main h1{font:700 clamp(30px,4vw,44px)/1.1 var(--font-display);color:var(--text-heading);margin:8px 0 8px}'
    + '.btl-lead{color:var(--text-muted);font-size:15px;max-width:660px;margin-bottom:10px}'
    + '.btl-main .stats-dashboard{margin-top:30px}'
    + '@media(max-width:768px){.btl-page{padding-top:58px}'
    + '.btl-header{display:grid;position:fixed;top:0;left:0;right:0;height:58px;grid-template-columns:44px 1fr 44px 44px 44px;align-items:center;padding:0 8px;background:rgba(9,12,13,.96);border-bottom:1px solid rgba(212,175,55,.26);z-index:900}'
    + '.btl-header>a,.btl-header>button{display:grid;place-items:center;min-height:44px;min-width:44px;color:#f8f1e6;background:transparent;border:0;font-size:19px;cursor:pointer;text-decoration:none;padding:0}'
    + '.btl-header .btl-brand{font:700 18px/1 Georgia,serif;letter-spacing:1.4px;justify-self:start}'
    + '.btl-main{padding:26px 14px 60px}'
    + 'footer.site-footer{display:block!important;margin-left:0!important;padding:30px 22px}'
    + 'footer.site-footer>div{margin-bottom:20px}'
    + 'footer.site-footer h2{font-size:18px}}'
    + '</style>\n'
    + '</head>\n<body class="btl-page">\n'
    + body
    + '</body>\n</html>\n';
}
function bottlesPage() {
  // render once with the date masked to hash the whole page (so a shell/CSS or
  // stats change also bumps dateModified), then render for real.
  const sig = contentSig(buildBottles(DATE_MASK));
  const mod = dateFor('bottles', sig);
  return buildBottles(mod);
}

// ---------------------------------------------------- homepage table rendering
// products.json is the source of truth (Phase 2): catalogue tbody rows and the
// mobile .frag-cards grids are re-rendered from it on every run, so the DOM
// cannot drift from products.json. Keep row/card markup byte-parity with the
// historical hand-authored table — verify with `node tests/render-fidelity.js`.
const SIZES6 = ['3', '5', '7.5', '10', '20', '30'];
function rupeePlain(n) { return Number(n).toLocaleString('en-IN'); }
function cardEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
// mirrors reading the cell with textContent (which decodes entities)
function cardDec(s) { return String(s == null ? '' : s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'); }
// cheapest available size price, falling back to any size price — same rule as
// the old runtime data-price scrape (filters derive their bounds from it)
function cheapestPrice(pr) {
  let cheapest = null, any = null;
  for (const k of SIZES6) {
    const p = pr.prices[k];
    if (!p) continue;
    if (any === null || p < any) any = p;
    if (pr.statusPerSize[k] !== 'ok') continue;
    if (cheapest === null || p < cheapest) cheapest = p;
  }
  return cheapest !== null ? cheapest : any;
}
function renderTbody(cat) {
  const list = products.filter((p) => p.cat === cat);
  if (!list.length) throw new Error('renderTbody: no products for ' + cat);
  const blocks = [];
  for (const pr of list) {
    const last = blocks[blocks.length - 1];
    if (last && last.brand === pr.brand && last.brandImg === pr.brandImg) last.items.push(pr);
    else blocks.push({ brand: pr.brand, brandImg: pr.brandImg, items: [pr] });
  }
  const rows = [];
  for (const b of blocks) {
    b.items.forEach((pr, i) => {
      let tr = '<tr' + (i === 0 ? ' class="brand-sep"' : '') + '>';
      if (i === 0) {
        tr += '<td class="brand-cell" rowspan="' + b.items.length + '">'
          + (pr.brandImg ? '<img src="' + imgWebp(pr.brandImg) + '" alt="' + b.brand + '"' + imgDims(pr.brandImg) + ' style="background:#fff;padding:2px;border-radius:4px">' : '')
          + b.brand + '</td>';
      }
      const price = cheapestPrice(pr);
      tr += '<td class="frag-cell" data-scent="' + pr.scent + '" data-season="' + pr.season
        + '" data-occasion="' + pr.occasion + '" data-time="' + pr.time + '" data-weather="' + pr.weather
        + '" data-mood="' + pr.mood + '" data-family="' + pr.family + '"'
        + (pr.added ? ' data-added="' + pr.added + '"' : '')
        + ' data-brand="' + pr.brand + '"'
        + (price !== null ? ' data-price="' + price + '"' : '')
        + ' data-pid="' + pr.key + '">'
        + '<a href="fragrance/' + pr.slug + '.html" style="text-decoration:none;color:inherit">' + pr.name + '</a>';
      if (pr.gender) tr += '<span class="tag tag-' + pr.gender.toLowerCase() + '">' + pr.gender + '</span>';
      if (pr.status === 'soldout') tr += '<span class="tag" style="background:#e94560;color:#fff;margin-left:6px">SOLD OUT</span>';
      else if (pr.status === 'coming') tr += '<span class="tag" style="background:#2e7d32;color:#fff;margin-left:6px">COMING SOON</span>';
      tr += '</td>';
      SIZES6.forEach((k, idx) => {
        const st = pr.statusPerSize[k];
        const body = st === 'struck' ? '<s class="u-price">' + rupeePlain(pr.prices[k]) + '</s>'
          : st === 'coming' ? '<span class="u-price">' + rupeePlain(pr.prices[k]) + '</span>'
          : String(rupeePlain(pr.prices[k]));
        tr += '<td class="size-cell">' + (idx === 5 ? '<strong>' + body + '</strong>' : body) + '</td>';
      });
      tr += '<td class="inspired-cell">' + pr.inspired + '</td>';
      tr += '<td class="links-cell">' + (pr.linksRaw || pr.links) + '</td>';
      tr += '</tr>';
      rows.push(tr);
    });
  }
  if (rows.length !== list.length) throw new Error('renderTbody: row count drift for ' + cat);
  return '<tbody>' + rows.join('\n') + '\n</tbody>';
}
// mirrors the runtime card builder (index.html .table-wrap IIFE) — the builder
// skips its DOM construction when this static .frag-cards grid is present
function renderCards(cat) {
  return products.filter((p) => p.cat === cat).map((pr) => {
    const isSO = pr.status === 'soldout';
    const isCS = pr.status === 'coming';
    const gTag = pr.gender || '';
    const prices = SIZES6.map((k) => pr.prices[k] || 0);
    const available = SIZES6.map((k) => pr.statusPerSize[k] === 'ok');
    let minAvail = null, minIdx = -1, maxIdx = -1, nAvail = 0;
    for (let i = 0; i < prices.length; i++) if (available[i]) { if (minAvail === null || prices[i] < minAvail) minAvail = prices[i]; if (minIdx < 0) minIdx = i; maxIdx = i; nAvail++; }
    const fmt = (n) => n ? ('\u20B9' + Number(n).toLocaleString('en-IN')) : '';
    const iText = cardDec(pr.inspired).replace(/\s+/g, ' ').trim();
    const famTxt = pr.family ? pr.family.split(',').slice(0, 2).join(' \u00b7 ') : '';
    const showInsp = !!(iText && iText.length > 1 && iText !== 'Original');
    const slotTxt = showInsp ? iText : famTxt;
    const slotHtml = slotTxt ? '<span class="card-inspired pc-inspired"' + (showInsp ? ' title="Reminds me of: ' + cardEsc(iText) + '"' : '') + '>' + (showInsp ? '&#8618; ' : '') + cardEsc(slotTxt) + '</span>' : '';
    let badges = '';
    if (isSO) badges += '<span class="pc-badge pc-badge-so">SOLD OUT</span>';
    else if (isCS) badges += '<span class="pc-badge pc-badge-cs">COMING SOON</span>';
    const price = cheapestPrice(pr);
    const attrs = ' data-pid="' + pr.key + '" data-product="' + pr.slug + '" data-division="' + cat + '"'
      + ' data-scent="' + pr.scent + '" data-season="' + pr.season + '" data-occasion="' + pr.occasion
      + '" data-time="' + pr.time + '" data-weather="' + pr.weather + '" data-mood="' + pr.mood
      + '" data-family="' + pr.family + '"'
      + (pr.added ? ' data-added="' + pr.added + '"' : '')
      + ' data-brand="' + pr.brand + '"'
      + (price !== null ? ' data-price="' + price + '"' : '')
      + (gTag ? ' data-gender="' + gTag + '"' : '');
    return '<div class="frag-card' + (isSO ? ' pc-sold' : '') + '"' + attrs + '>'
      + '<div class="pc-media" role="button" tabindex="0" data-open>'
      + '<span class="pc-ph" aria-hidden="true"></span>'
      + '<img class="pc-img" alt="' + cardEsc(pr.name) + '" loading="lazy"' + imgDims('images/bottles/' + pr.slug + '.png') + ' data-img-base="images/bottles/' + pr.slug + '">'
      + badges
      + '<button type="button" class="pc-wish" aria-label="Save ' + cardEsc(pr.name) + '" data-wish></button>'
      + (isSO || isCS ? '' : '<button type="button" class="pc-cmp" aria-label="Add ' + cardEsc(pr.name) + ' to compare" data-cmp aria-pressed="false"></button>')
      + (gTag ? '<span class="pc-gender pc-gender-' + gTag.toLowerCase() + '">' + gTag + '</span>' : '')
      + '</div>'
      + '<div class="card-top">' + (pr.brandImg ? '<img src="' + imgWebp(cardEsc(pr.brandImg)) + '" alt="" class="card-brand-logo"' + imgDims(pr.brandImg) + ' loading="lazy">' : '')
      + '<span class="card-brand-name">' + cardEsc(pr.brand) + '</span></div>'
      + '<button type="button" class="card-frag-name pc-name" data-open>' + cardEsc(pr.name) + '</button>'
      + slotHtml
      + '<div class="pc-price-line' + (minIdx >= 0 ? ' pc-has-range' : '') + '">'
      + '<span class="pc-from">' + (minIdx >= 0 ? '<span class="pc-fsz">' + SIZES6[minIdx] + 'ml</span>' : '') + '<span class="pc-fw">from</span> <b>' + fmt(minAvail) + '</b></span>'
      + (available[5] ? '<span class="pc-30">30ml ' + fmt(prices[5]) + '</span>' : '')
      + (nAvail > 1 ? '<span class="pc-rmax">' + SIZES6[maxIdx] + 'ml <b>' + fmt(prices[maxIdx]) + '</b></span>' : '')
      + '</div>'
      + ((pr.linksRaw || pr.links) ? '<div class="card-links">' + (pr.linksRaw || pr.links) + '</div>' : '')
      + '<button type="button" class="pc-add' + (isSO ? ' pc-add-so' : isCS ? ' pc-add-cs' : '') + '" data-open ' + (isSO || isCS ? 'disabled' : '') + '>'
      + (isSO ? 'SOLD OUT' : isCS ? 'COMING SOON' : 'Add') + '</button>'
      + '</div>';
  }).join('\n');
}

// ------------------------------------------------------------ html homepage edits
// ------------------------------------------------- homepage extra sections
// Curated bestseller order — editorial curation (no order data exists; orders
// arrive over WhatsApp). Keys must exist in products.json or generation throws.
const BESTSELLERS = [
  'Rasasi|Hawas OG',
  'Afnan|9 PM OG',
  'Lattafa|Khamrah',
  'Lattafa|Khamrah Dukhan',
  'Lattafa|ASAD',
  'Rasasi|Hawas Black',
  'Fragrance World|Kohl',
  'Arabiyat Prestige|Kohl Opulence',
  'Ajmal|Wave',
  'Riiffs|Costa de Amalfi',
  'Zimaya|Mazaaj Rhythm',
  'Mykonos|Glitch'
];

function renderBestSellers() {
  return BESTSELLERS.map((key) => {
    const pr = products.find((p) => p.key === key);
    if (!pr) throw new Error('bestseller key not found in products.json: ' + key);
    const isSO = pr.status === 'soldout';
    const base = 'images/bottles/' + pr.slug;
    const webp = imgWebp(base + '.png');
    const dims = imgDims(base + '.png');
    let img = '';
    if (webp) {
      const srcset = fs.existsSync(path.join(ROOT, base + '-500.webp'))
        ? ' srcset="' + base + '-500.webp 500w, ' + webp + ' 1024w" sizes="138px"'
        : '';
      img = '<img src="' + webp + '" alt="' + cardEsc(pr.name) + '"' + dims + srcset
        + ' loading="lazy" onerror="this.onerror=null;this.srcset=\'\';this.src=\'' + base + '.png\'">';
    }
    const price = cheapestPrice(pr);
    return '<button type="button" class="best-card' + (isSO ? ' pc-sold' : '') + '" data-pid="' + cardEsc(pr.key) + '">'
      + '<span class="best-media">' + img + '</span>'
      + '<span class="best-brand">' + cardEsc(pr.brand) + '</span>'
      + '<span class="best-name">' + cardEsc(pr.name) + '</span>'
      + '<span class="best-price">from <b>' + (price ? '\u20B9' + rupeePlain(price) : '') + '</b></span>'
      + '</button>';
  }).join('');
}

// All 185 fragrances priced for 3ml only, in catalogue order (grouped by brand).
// Static markup — crawlable and shift-free. No data-brand/data-price/.frag-cell
// classes: brand counts and price-slider bounds read those from the table.
function renderThreeMl() {
  const rows = products.map((pr) => {
    const price = pr.prices ? pr.prices['3'] : null;
    if (!price) return '';
    const st = (pr.statusPerSize && pr.statusPerSize['3']) || 'ok';
    const fmt = '\u20B9' + rupeePlain(price);
    let priceHtml = fmt;
    if (st === 'struck') priceHtml = '<s>' + fmt + '</s>';
    else if (st === 'coming') priceHtml = '<span class="three-ml-soon">' + fmt + '</span>';
    const off = (st === 'struck' || st === 'coming') ? ' three-ml-off' : '';
    return '<div class="three-ml-row' + off + '">'
      + '<span class="three-ml-name"><b>' + cardEsc(pr.brand) + '</b> ' + cardEsc(pr.name) + '</span>'
      + '<span class="three-ml-price">' + priceHtml + '</span>'
      + '</div>';
  }).join('');
  return '<div class="three-ml-section" id="threeMl" hidden>\n'
    + '<div class="section-heading three-ml-title">3ml decant prices</div>\n'
    + '<div class="three-ml" id="threeMlList">\n'
    + '<div class="three-ml-grid" id="threeMlGrid">\n' + rows + '\n</div>\n'
    + '<button type="button" class="three-ml-more" id="threeMlMore" aria-expanded="false" aria-controls="threeMlGrid">Show all '
    + products.length + ' fragrances</button>\n'
    + '</div>\n'
    + '</div>';
}

function editHomepage(products, faqHtml, articlesHtml) {
  let out = s;

  out = out.replace(/<html\s+lang="[^"]*">/i, '<html lang="en-IN">');

  // Homepage metadata and schema are generated in-place; normalise a prior
  // deployment origin before replacing the generated blocks below.
  out = out.replace(LEGACY_SITE_RE, BASE);

  // 1) title + description
  out = out.replace(/<title>[\s\S]*?<\/title>/, '<title>Perfume Decants India | IRAM Perfume</title>');
  out = out.replace(
    /<meta name="description" content="[^"]*"/,
    '<meta name="description" content="Perfume decants in India from 3ml to 30ml, across designer and Middle Eastern brands. Prices from \u20b979; free shipping over \u20b9' + FREE_SHIP_MIN + ' on ' + FREE_SHIP_MIN_QTY + '+ decants."'
  );

  // 2) replace ItemList block with all-products version (ListItem, not Product —
  // product detail lives on the product pages; this also drops ~150KB of JSON-LD)
  if (!itemListBlock) throw new Error('ItemList block not found');
  const itemListNew = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'IRAM Perfume Fragrance Collection',
    description: 'Premium designer and Middle Eastern fragrance decants available in 3ml, 5ml, 7.5ml, 10ml, 20ml and 30ml sizes, plus full bottles on request.',
    url: siteUrl(),
    numberOfItems: products.length,
    itemListElement: products.map((pr, i) => ({
      '@type': 'ListItem', position: i + 1, name: pr.name + ' \u2014 ' + pr.brand, url: pr.url
    }))
  };
  const itemListJson = '<script type="application/ld+json">\n' + JSON.stringify(itemListNew, null, 2) + '\n</script>\n';
  const ob = [...out.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].find(b => { try { return JSON.parse(b[1]).hasOwnProperty('itemListElement'); } catch (e) { return false; } });
  if (!ob) throw new Error('ItemList block not found');
  // consume the newline that follows the old block: itemListJson already ends with one,
  // otherwise every run appends an extra blank line (non-idempotent output).
  let obEnd = ob.index + ob[0].length;
  if (out[obEnd] === '\n') obEnd += 1;
  out = out.slice(0, ob.index) + itemListJson + out.slice(obEnd);

  // 2b) Organization + WebSite JSON-LD (rewritten every run, idempotently)
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': siteUrl('#organization'),
    name: 'IRAM Perfume',
    url: siteUrl(),
    logo: { '@type': 'ImageObject', url: siteUrl('logo.png'), width: 512, height: 512 },
    image: siteUrl('og-image.jpg'),
    description: 'Authentic designer and Middle Eastern perfume decants in 3ml to 30ml, shipped across India.',
    email: EMAIL,
    telephone: PHONE_TEL,
    areaServed: { '@type': 'Country', name: 'India' },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: PHONE_TEL,
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['English', 'Hindi']
    },
    sameAs: [IG, WA]
  };
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': siteUrl('#website'),
    name: 'IRAM Perfume',
    url: siteUrl(),
    publisher: { '@id': siteUrl('#organization') },
    inLanguage: 'en-IN'
  };
  const replaceJsonType = (html, type, obj) => {
    const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
    const blk = [...html.matchAll(re)].find(b => { try { return JSON.parse(b[1])['@type'] === type; } catch (e) { return false; } });
    if (!blk) return html;
    let end = blk.index + blk[0].length;
    if (html[end] === '\n') end += 1;
    return html.slice(0, blk.index) + '<script type="application/ld+json">\n' + JSON.stringify(obj, null, 2) + '\n</script>\n' + html.slice(end);
  };
  out = replaceJsonType(out, 'Organization', orgSchema);
  out = replaceJsonType(out, 'WebSite', websiteSchema);

  // 2c) homepage H1: keep the brand but add the primary keyword (one H1 per page)
  const h1Rich = '<h1>Perfume Decants in India <span class="h1-sub">Designer &amp; Middle Eastern, 3ml to 30ml</span></h1>';
  out = out.replace(/<h1>[^<]*(?:<span class="h1-sub">[\s\S]*?<\/span>)?<\/h1>/, h1Rich);

  // 4) FAQPage schema + visible FAQ + articles strip (idempotent markers)
  // JSON-LD must contain JSON only; HTML comments make the structured data invalid.
  const tagOpen = '<script type="application/ld+json">\n';
  const tagClose = '\n</script>\n';
  out = out.replace(/<!--FAQ_SCHEMA-->[\s\S]*?<!--EOF-->/g, '');
  out = out.replace(/<script type="application\/ld\+json">\s*<\/script>/g, '');
  // drop any previously injected homepage FAQPage blocks (keep exactly one)
  const faqBlocks = [...out.matchAll(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g)].filter((m) => {
    try { const j = JSON.parse(m[0].replace(/^<script[^>]*>/, '').replace(/<\/script>\s*$/, '')); return j && j['@type'] === 'FAQPage'; } catch (e) { return false; }
  });
  for (let fi = faqBlocks.length - 1; fi >= 0; fi--) {
    out = out.slice(0, faqBlocks[fi].index) + out.slice(faqBlocks[fi].index + faqBlocks[fi][0].length);
  }
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

  // 7) re-render catalogue tbodies from products.json (rows keep byte-parity
  //    with the historical markup, plus static data-brand/data-price/data-pid
  //    so filters and the cart registry no longer scrape prices from the DOM)
  const cats = ['Designer', 'Middle Eastern'];
  cats.forEach((cat, ri) => {
    const raw = s.slice(REGIONS[ri].start, REGIONS[ri].end);
    const rendered = renderTbody(cat);
    const at = out.indexOf(raw);
    if (at < 0) throw new Error('catalogue tbody not found for ' + cat);
    out = out.slice(0, at) + rendered + out.slice(at + raw.length);
  });

  // 8) pre-rendered mobile card grids — markers sit right after each table and
  //    stripMarks removes exactly what insertion adds (idempotent)
  for (const cat of cats) {
    const open = '<!--CARDS:' + cat + '-->', close = '<!--/CARDS:' + cat + '-->';
    out = stripMarks(out, open, close);
    // #catalogue (hero CTA target) wraps this heading — heading markup stays plain
    const hIdx = out.indexOf('<div class="section-heading">' + cat + '</div>');
    if (hIdx < 0) throw new Error('section heading not found: ' + cat);
    const tIdx = out.indexOf('</table>', hIdx);
    if (tIdx < 0) throw new Error('</table> not found after heading: ' + cat);
    const block = open + '\n<div class="frag-cards" aria-label="' + cat + '">' + renderCards(cat) + '</div>\n' + close + '\n';
    out = out.slice(0, tIdx + '</table>'.length) + block + out.slice(tIdx + '</table>'.length);
  }

  // 8b) curated bestsellers rail — static markup (shift-free), parked right
  //     after the featured rail; markers keep reruns idempotent
  out = stripMarks(out, '<!--BESTSELLERS-->', '<!--/BESTSELLERS-->');
  const frIdx = out.indexOf('<section class="featured-rail"');
  if (frIdx < 0) throw new Error('featured-rail anchor not found');
  const frEnd = out.indexOf('</section>', frIdx);
  if (frEnd < 0) throw new Error('featured-rail closing tag not found');
  const bsBlock = '<!--BESTSELLERS-->\n'
    + '<section class="bestsellers-rail" id="bestsellers" aria-label="Best selling fragrances">\n'
    + '  <div class="mobile-brand-rail-head"><span>Best selling fragrances</span><span aria-hidden="true">Scroll →</span></div>\n'
    + '  <div class="bestsellers-track" id="bestsellersTrack">' + renderBestSellers() + '</div>\n'
    + '</section>\n<!--/BESTSELLERS-->\n';
  out = out.slice(0, frEnd + '</section>'.length) + bsBlock + out.slice(frEnd + '</section>'.length);

  // 8c) 3ml-only price list for every fragrance, above the Designer table
  out = stripMarks(out, '<!--THREE_ML-->', '<!--/THREE_ML-->');
  const dIdx = out.indexOf('<div id="catalogue"><div class="section-heading">Designer</div></div>');
  if (dIdx < 0) throw new Error('Designer section heading not found (3ml anchor)');
  const mlBlock = '<!--THREE_ML-->\n' + renderThreeMl() + '\n<!--/THREE_ML-->\n';
  out = out.slice(0, dIdx) + mlBlock + out.slice(dIdx);

  // 9) inline the product registry data (window.__PRODUCTS) just before the
  //    app bundle; "</" is escaped so no product link can close the script tag
  out = stripMarks(out, '<!--PRODUCTS_JSON-->', '<!--/PRODUCTS_JSON-->');
  const appIdx = out.indexOf('<!--APP-->');
  if (appIdx < 0) throw new Error('<!--APP--> anchor not found');
  const slim = products.map((p) => ({
    key: p.key, brand: p.brand, name: p.name, gender: p.gender, status: p.status,
    tags: p.tags, prices: p.prices, statusPerSize: p.statusPerSize,
    inspired: p.inspired, links: p.linksRaw || p.links,
    scent: p.scent, season: p.season, occasion: p.occasion, time: p.time,
    weather: p.weather, mood: p.mood, family: p.family, added: p.added
  }));
  const pjson = JSON.stringify(slim).split('</').join('<\\/');
  const pblock = '<!--PRODUCTS_JSON-->\n<script>window.__PRODUCTS=' + pjson + ';</script>\n<!--/PRODUCTS_JSON-->\n';
  out = out.slice(0, appIdx) + pblock + out.slice(appIdx);

  // 10) external asset cache-busters: ?v= = first 12 hex of the file's sha256,
  //     refreshed on every run so a content edit always busts the cache.
  //     config.js must load before app.js (app.js reads IRAM_CONFIG at init).
  const hashOf = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex').slice(0, 12);
  if (!/src="config\.js\?v=/.test(out)) {
    const appTag = /<script src="assets\/app\.js\?v=[0-9a-z]+"><\/script>/;
    if (!appTag.test(out)) throw new Error('app.js tag missing (re-run extraction?)');
    out = out.replace(appTag, '<script src="config.js?v=' + hashOf('config.js') + '"></script>\n$&');
  }
  for (const file of ['config.js', 'assets/app.css', 'assets/app.js']) {
    const v = hashOf(file);
    const re = new RegExp('((?:href|src)="' + file.replace(/\//g, '\\/') + '\\?v=)[0-9a-z]+(")');
    if (!re.test(out)) throw new Error('asset reference missing for ' + file + ' (re-run extraction?)');
    out = out.replace(re, '$1' + v + '$2');
  }

  return out;
}
function trIncludesAnchor(tr) { return tr.includes('class="frag-cell"') && /class="frag-cell"[^>]*>[^<]*<a href=/.test(tr); }
function stripMarks(str, open, close) {
  const i = str.indexOf(open);
  if (i < 0) return str;
  const j = str.indexOf(close, i);
  if (j < 0) return str.slice(0, i) + str.slice(i + open.length);
  let end = j + close.length;
  // the injected blocks end with a newline; consume it too so removal exactly
  // inverts insertion (otherwise each run leaves two stray blank lines behind).
  if (str[end] === '\n') end += 1;
  return str.slice(0, i) + str.slice(end);
}

// --------------------------------------------------------------------- sitemap
const COLLECTIONS = [
  { slug: 'decants-under-200', title: 'Perfume Decants Under ₹200 in India', pick: p => minMax(p).min < 200 },
  { slug: '3ml-decants', title: '3ml Perfume Decants in India', pick: p => p.prices['3'] != null },
  { slug: 'men', title: 'Men’s Perfume Decants in India', pick: p => p.gender === 'Men' },
  { slug: 'unisex', title: 'Unisex Perfume Decants in India', pick: p => p.gender === 'Unisex' },
  { slug: 'women', title: 'Women’s Perfume Decants in India', pick: p => p.gender === 'Women' },
  { slug: 'new-arrivals', title: 'New Perfume Decants in India', pick: p => !!p.added }
];
function collectionPage(col, items) {
  const url = siteUrl('collections/' + col.slug + '.html');
  const list = items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.brand + ' ' + p.name, url: p.url }));
  const body = '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <span aria-current="page">Collections</span></nav>'
    + '<div class="top"><div><div class="brand-chip">COLLECTION</div><h1>' + esc(col.title) + '</h1></div><a href="/">← Full collection</a></div>'
    + '<p class="lead">Browse ' + items.length + ' currently listed fragrances with live decant prices in 3ml, 5ml, 7.5ml, 10ml, 20ml and 30ml sizes.</p>'
    + productGrid(items) + '<div class="foot"><a href="/">All fragrances</a> · <a href="/contact.html">Contact</a></div>';
  return pageShell({ title: col.title + ' | IRAM Perfume', desc: 'Browse ' + col.title.toLowerCase() + ' with live sizes and prices from IRAM Perfume.', canonical: url, body,
    schema: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: col.title, url, mainEntity: { '@type': 'ItemList', numberOfItems: list.length, itemListElement: list } }, { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'IRAM Perfume', item: siteUrl() }, { '@type': 'ListItem', position: 2, name: col.title, item: url }] }], og: { image: siteUrl('og-image.jpg') } });
}
function buildSitemap(products, articles, lm, brands, collections) {
  lm = lm || {};
  brands = brands || [];
  const locs = [
    { l: siteUrl(), lastmod: lm.home || TODAY },
    { l: siteUrl('contact.html'), lastmod: lm.contact || TODAY },
    { l: siteUrl('bottles.html'), lastmod: lm.bottles || TODAY },
    ...brands.map(b => ({ l: siteUrl('brands/' + b.slug + '.html'), lastmod: lm['brand:' + b.slug] || TODAY })),
    ...(collections || []).map(c => ({ l: siteUrl('collections/' + c.slug + '.html'), lastmod: lm['collection:' + c.slug] || TODAY })),
    ...articles.map(a => ({ l: a.url, lastmod: lm['article:' + a.slug] || TODAY })),
    ...products.map(p => ({ l: p.url, lastmod: lm['frag:' + p.slug] || TODAY }))
  ];
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const o of locs) x += '  <url>\n    <loc>' + o.l + '</loc>\n    <lastmod>' + o.lastmod + '</lastmod>\n  </url>\n';
  x += '</urlset>\n';
  return x;
}

// ----------------------------------------------------------------------- llms.txt
function buildLlmstxt(articles) {
  articles = articles || [];
  const brandExists = b => fs.existsSync(path.join(ROOT, 'brands', slugify(b) + '.html'));
  const brands = [...new Set(products.map(p => p.brand))];
  let t = '# IRAM Perfume\n\n'
    + '> IRAM Perfume sells designer and Middle Eastern fragrance decants in India in six sizes \u2014 3ml, 5ml, 7.5ml, 10ml, 20ml and 30ml \u2014 plus full bottles on request. Decants are filled from original bottles and shipped across India.\n\n'
    + '## Key facts\n'
    + '- Sizes: 3ml / 5ml / 7.5ml / 10ml / 20ml / 30ml; full bottles on request\n'
    + '- Price range: cheapest decant from ' + rupees(Math.min(...products.map(p => minMax(p).min))) + '; each product page lists all six prices\n'
    + '- Free shipping on orders above \u20b9' + FREE_SHIP_MIN + ' with ' + FREE_SHIP_MIN_QTY + '+ decants; otherwise flat \u20b9100\n'
    + '- Delivery: 3\u20137 working days across India\n'
    + '- Orders and questions: WhatsApp ' + PHONE_DISPLAY + ' or email ' + EMAIL + '\n\n'
    + '## Key pages\n'
    + '- Homepage & catalogue: ' + siteUrl() + '\n'
    + '- Empty bottles: ' + siteUrl('bottles.html') + '\n'
    + '- Contact: ' + siteUrl('contact.html') + '\n';
  for (const a of articles) t += '- Guide: ' + a.title + ' \u2014 ' + a.url + '\n';
  const liveBrands = brands.filter(brandExists);
  if (liveBrands.length) {
    t += '\n## Brand pages\n';
    for (const b of liveBrands) t += '- ' + b + ': ' + siteUrl('brands/' + slugify(b) + '.html') + '\n';
  }
  t += '\n## Fragrance catalogue (India decant prices)\n';
  const byBrand = {};
  for (const pr of products) (byBrand[pr.brand] = byBrand[pr.brand] || []).push(pr);
  for (const b of Object.keys(byBrand)) {
    t += '\n### ' + b + '\n';
    for (const pr of byBrand[b]) {
      t += '- [' + pr.name + '](' + pr.url + ') (' + (pr.gender || 'fragrance') + (pr.status === 'instock' ? '' : ', ' + pr.status) + '): ' + priceString(pr) + '\n';
    }
  }
  return t;
}

// ----------------------------------------------------------------------- main
// Windows can transiently lock a file (AV/indexer) with a bare -4094 UNKNOWN
// error; retry a few times instead of aborting the whole build.
function sleepSync(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
  catch (e) { const end = Date.now() + ms; while (Date.now() < end) {} }
}
function writeFileSafe(file, data) {
  for (let attempt = 0; ; attempt++) {
    try { fs.writeFileSync(file, data, 'utf8'); return; }
    catch (e) {
      if (attempt >= 10) throw e;
      sleepSync(Math.min(800, 200 * (attempt + 1)));
    }
  }
}
function productDetailsTemplate() {
  const quote = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const head = ['key', 'notes_top', 'notes_heart', 'notes_base', 'longevity_hours', 'projection', 'inspired_brand', 'best_for'];
  return [head.join(','), ...products.map(p => [p.key, '', '', '', '', '', '', ''].map(quote).join(','))].join('\n') + '\n';
}
function main() {
  console.log('parsed products:', products.length);
  // Repair the short-lived migration that incorrectly used `added` as a
  // product page's modified date. Those entries already carry the current
  // content signature, so mark this real generated-content update today.
  for (const pr of products) {
    const rec = DATES['frag:' + pr.slug];
    if (rec && pr.added && rec.mod === pr.added) {
      rec.mod = TODAY;
      DATES_DIRTY = true;
    }
  }
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  writeFileSafe(path.join(ROOT, 'data', 'product-details-template.csv'), productDetailsTemplate());
  const dup = products.length - new Set(products.map(p => p.key)).size;
  if (dup) console.warn('warning: duplicate keys:', dup);

  // 0. shared sub-page chrome stylesheet (content-addressed ?v= cache-buster)
  const pageCssPath = path.join(ROOT, 'assets', 'page.css');
  writeFileSafe(pageCssPath, PAGE_CSS + '\n');
  PAGE_CSS_VER = crypto.createHash('sha256').update(fs.readFileSync(pageCssPath)).digest('hex').slice(0, 12);

  // 1. fragrance pages
  const fragDir = path.join(ROOT, 'fragrance');
  fs.mkdirSync(fragDir, { recursive: true });
  const lastmods = {};
  let n = 0;
  for (const pr of products) {
    const html = fragPage(pr);
    lastmods['frag:' + pr.slug] = dateFor('frag:' + pr.slug, contentSig(html));
    writeFileSafe(path.join(fragDir, pr.slug + '.html'), html);
    n++;
  }
  console.log('wrote fragrance pages:', n);

  // 1b. brand landing pages (one per brand; target "<brand> perfume decants india")
  const brandDir = path.join(ROOT, 'brands');
  fs.mkdirSync(brandDir, { recursive: true });
  const allBrands = [...new Set(products.map(p => p.brand))].sort((a, b) => a.localeCompare(b));
  const brandMeta = [];
  for (const b of allBrands) {
    const items = products.filter(p => p.brand === b);
    const html = brandPage(b, items, allBrands);
    const slug = brandPageSlug(b);
    lastmods['brand:' + slug] = dateFor('brand:' + slug, contentSig(html));
    writeFileSafe(path.join(brandDir, slug + '.html'), html);
    brandMeta.push({ brand: b, slug: slug });
  }
  console.log('wrote brand pages:', brandMeta.length);

  // 1c. data-driven collection pages. A thin collection is not emitted.
  const collectionDir = path.join(ROOT, 'collections');
  fs.mkdirSync(collectionDir, { recursive: true });
  const collectionMeta = [];
  for (const col of COLLECTIONS) {
    const items = products.filter(col.pick);
    if (items.length < 6) continue;
    const html = collectionPage(col, items);
    lastmods['collection:' + col.slug] = dateFor('collection:' + col.slug, contentSig(html));
    writeFileSafe(path.join(collectionDir, col.slug + '.html'), html);
    collectionMeta.push({ slug: col.slug, title: col.title });
  }
  console.log('wrote collection pages:', collectionMeta.length);

  // 2. articles
  const artDir = path.join(ROOT, 'articles');
  fs.mkdirSync(artDir, { recursive: true });
  for (const m of articlesMeta) m.url = siteUrl('articles/' + m.slug + '.html');
  const artPages = buildArticles();
  artPages.forEach((html, i) => {
    const slug = articlesMeta[i].slug;
    lastmods['article:' + slug] = (DATES['article:' + slug] || {}).mod || TODAY;
    writeFileSafe(path.join(artDir, slug + '.html'), html);
  });
  console.log('wrote articles:', articlesMeta.length);

  // 2b. bottle options + collection statistics page (moved off the homepage)
  const btlHtml = bottlesPage();
  lastmods.bottles = (DATES['bottles'] || {}).mod || TODAY;
  writeFileSafe(path.join(ROOT, 'bottles.html'), btlHtml);
  const btlStats = collectionStats();
  console.log('wrote bottles.html; stats:', btlStats.total, 'fragrances /', btlStats.brands, 'brands / cheapest', btlStats.cheapest);

  // 3. homepage edits
  const faqHtml = '', artsHtml = '';
  const newS = editHomepage(products, faqHtml, artsHtml);
  lastmods.home = dateFor('home', contentSig(newS));
  writeFileSafe(IDX, newS);
  lastmods.contact = dateFor('contact', contentSig(fs.readFileSync(path.join(ROOT, 'contact.html'), 'utf8')));
  const rowsNow = (newS.match(/class="frag-cell"/g) || []).length;
  console.log('index.html rewritten; frag rows still:', rowsNow);

  // 4. sitemap / robots / llms
  writeFileSafe(path.join(ROOT, 'sitemap.xml'), buildSitemap(products, articlesMeta, lastmods, brandMeta, collectionMeta));
  writeFileSafe(path.join(ROOT, 'llms.txt'), buildLlmstxt(articlesMeta));
  const robots = 'User-agent: *\nAllow: /\n\n# AI / answer-engine crawlers\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: ChatGPT-User\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\n# LLM summary: ' + siteUrl('llms.txt') + '\nSitemap: ' + siteUrl('sitemap.xml') + '\n';
  writeFileSafe(path.join(ROOT, 'robots.txt'), robots);
  if (DATES_DIRTY) writeFileSafe(DATES_FILE, JSON.stringify(DATES, null, 2) + '\n');
  console.log('sitemap.xml, robots.txt, llms.txt written; content-dates.json', DATES_DIRTY ? 'updated' : 'unchanged');

  // sanity
  const ss = fs.readFileSync(IDX, 'utf8');
  const anchors = (ss.match(/href="fragrance\/[^"]+\.html"/g) || []).length;
  console.log('homepage fragrance links:', anchors, '/', products.length);
  console.log('ld+json blocks on homepage:', (ss.match(/application\/ld\+json/g) || []).length);
  const faqVisible = ss.includes('<!--FAQ_BLOCK-->') && ss.includes('Frequently Asked Questions');
  console.log('FAQ block present:', faqVisible, '| guides strip:', ss.includes('<!--ARTICLES-->'));
}

main();
