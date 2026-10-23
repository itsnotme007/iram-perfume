// Generates a 1200x630 social/OG card per product into images/og/<slug>.jpg.
// Deterministic; only rewrites when the source product/price/bottle changes
// (mtime-based skip keeps repeated builds fast and idempotent).
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const products = JSON.parse(fs.readFileSync(path.join(ROOT, 'products.json'), 'utf8'));
const OUT = path.join(ROOT, 'images', 'og');
fs.mkdirSync(OUT, { recursive: true });

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rupees = n => '\u20b9' + Number(n).toLocaleString('en-IN');
const minPrice = pr => {
  const vals = ['3', '5', '7.5', '10', '20', '30'].map(k => pr.prices[k]).filter(x => x != null);
  return Math.min.apply(null, vals);
};
// roughly wrap a string to N chars per line, max `lines` lines
function wrap(str, per, lines) {
  const words = String(str).split(/\s+/);
  const out = [];
  let cur = '';
  for (const w of words) {
    if (!cur) { cur = w; continue; }
    if ((cur + ' ' + w).length <= per) cur += ' ' + w;
    else { out.push(cur); cur = w; if (out.length === lines) break; }
  }
  if (out.length < lines && cur) out.push(cur);
  if (out.length === lines && cur && !out.includes(cur)) {
    // mark truncation on the last line (only if there was leftover text)
    const last = out[lines - 1];
    if (!last.endsWith(cur)) out[lines - 1] = last.replace(/\s+\S*$/, '') + ' \u2026';
  }
  return out.slice(0, lines);
}

function bottleFor(slug) {
  for (const ext of ['.webp', '.png', '.jpg']) {
    const p = path.join(ROOT, 'images', 'bottles', slug + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function makeCard(pr) {
  const W = 1200, H = 630;
  const isSoon = pr.status === 'coming';
  const isOut = pr.status === 'soldout';
  const nameLines = wrap(pr.name, 20, 2);
  const nameSvg = nameLines.map((l, i) =>
    `<text x="70" y="${232 + i * 74}" font-family="Georgia,'Times New Roman',serif" font-size="66" font-weight="700" fill="#1a1a2e">${esc(l)}</text>`
  ).join('');
  const priceLine = isOut ? 'Sold out for decants' : (isSoon ? 'Coming soon' : 'Decants from ' + rupees(minPrice(pr)));
  const badge = isOut ? 'SOLD OUT' : isSoon ? 'COMING SOON' : 'IN STOCK';
  const badgeColor = isOut ? '#c62828' : isSoon ? '#2e7d32' : '#0f3460';
  const bgSvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#faf9f7"/><stop offset="0.6" stop-color="#f3ecdb"/><stop offset="1" stop-color="#ece1c4"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="0" y="0" width="16" height="${H}" fill="#d4af37"/>
  <circle cx="1085" cy="120" r="220" fill="#d4af37" opacity="0.10"/>
  <text x="70" y="130" font-family="Georgia,serif" font-size="27" letter-spacing="5" fill="#0f3460">${esc(String(pr.brand).toUpperCase())}</text>
  ${nameSvg}
  <rect x="70" y="${300 + (nameLines.length - 1) * 74}" width="150" height="5" fill="#d4af37"/>
  <text x="70" y="${410 + (nameLines.length - 1) * 74}" font-family="Segoe UI,Arial,sans-serif" font-size="34" fill="#3d382f">${esc(priceLine)} \u00b7 3ml\u201330ml</text>
  <rect x="70" y="${470 + (nameLines.length - 1) * 74}" rx="18" ry="18" width="${badge.length * 17 + 40}" height="46" fill="${badgeColor}"/>
  <text x="${70 + 20}" y="${501 + (nameLines.length - 1) * 74}" font-family="Segoe UI,Arial,sans-serif" font-size="24" font-weight="700" fill="#ffffff">${badge}</text>
  <text x="70" y="596" font-family="Georgia,serif" font-size="28" fill="#7a7168">iramperfume.in</text>
  <text x="${W - 70}" y="596" text-anchor="end" font-family="Georgia,serif" font-size="28" fill="#7a7168">IRAM PERFUME</text>
</svg>`;

  const layers = [{ input: Buffer.from(bgSvg) }];
  const bottle = bottleFor(pr.slug);
  if (bottle) {
    try {
      const b = await sharp(bottle).resize(360, 470, { fit: 'inside', withoutEnlargement: true }).toBuffer();
      layers.push({ input: b, left: 720, top: 90 });
    } catch (e) { /* missing/undecodable bottle: text-only card */ }
  }
  const buf = await sharp({ create: { width: W, height: H, channels: 3, background: '#faf9f7' } })
    .composite(layers)
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  return buf;
}

(async () => {
  let made = 0, skipped = 0;
  for (const pr of products) {
    const dst = path.join(OUT, pr.slug + '.jpg');
    const src = bottleFor(pr.slug);
    const srcMtime = src ? fs.statSync(src).mtimeMs : 0;
    if (fs.existsSync(dst) && fs.statSync(dst).mtimeMs >= srcMtime &&
        fs.statSync(dst).mtimeMs >= fs.statSync(path.join(ROOT, 'products.json')).mtimeMs) {
      skipped++; continue;
    }
    const buf = await makeCard(pr);
    fs.writeFileSync(dst, buf);
    made++;
  }
  console.log('og cards: made', made, 'skipped', skipped, 'total', products.length);
})().catch(e => { console.error(e); process.exit(1); });
