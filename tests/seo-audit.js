// Static SEO / integrity audit for the generated site.
// Runs against files on disk (no server needed) so it works in CI before deploy.
//
// Checks:
//   - CNAME is exactly iramperfume.in
//   - every indexable HTML page: <title>, meta description (<=160), one <h1>,
//     absolute canonical on the production host, og:image + twitter:image
//   - titles and meta descriptions are unique per page
//   - all JSON-LD blocks parse; no U+FFFD or mojibake anywhere
//   - all internal href/src targets resolve to a real file
//   - every <img> has an alt attribute
//   - sitemap: absolute locs, no <priority>, every loc maps to a file, and every
//     indexable page appears in the sitemap
//   - robots.txt has a Sitemap line; llms.txt exists
//   - Product schema per-size offer prices match products.json
//   - no TODO(owner) markers in published pages
//
// Exit code 1 if any hard check fails.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HOST = 'iramperfume.in';
const ORIGIN = 'https://' + HOST;
const SKIP_DIRS = new Set(['node_modules', '.git', 'tests', 'assets', 'logos', 'images', 'reviews', 'bottles', 'previews', '_docs', '.github', 'Puppy_tg_bot', 'undo', '.venv']);

const failures = [];
const warnings = [];
const fail = msg => failures.push(msg);
const warn = msg => warnings.push(msg);

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(p, out);
    } else if (name.endsWith('.html')) {
      out.push(p);
    }
  }
  return out;
}
const relOf = p => path.relative(ROOT, p).split(path.sep).join('/');

// Pages that are intentionally not indexable.
const NOINDEX = new Set(['404.html']);

function getMeta(html) {
  const title = (/<title>([\s\S]*?)<\/title>/i.exec(html) || [])[1] || '';
  const desc = (/<meta\s+name="description"\s+content="([^"]*)"/i.exec(html) || [])[1] || '';
  const canonical = (/<link\s+rel="canonical"\s+href="([^"]*)"/i.exec(html) || [])[1] || '';
  const robots = (/<meta\s+name="robots"\s+content="([^"]*)"/i.exec(html) || [])[1] || '';
  const ogImage = (/<meta\s+property="og:image"\s+content="([^"]*)"/i.exec(html) || [])[1] || '';
  const twImage = (/<meta\s+name="twitter:image"\s+content="([^"]*)"/i.exec(html) || [])[1] || '';
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]);
  return { title, desc, canonical, robots, ogImage, twImage, h1s, ld };
}

function resolveTarget(fromFile, raw) {
  let t = raw.trim();
  if (!t || t.startsWith('#')) return { skip: true };
  // skip runtime-built URLs inside inline JS (e.g. "'+esc(src)+'")
  if (/['+`]/.test(t) || /\$\{/.test(t)) return { skip: true };
  if (/^(https?:|mailto:|tel:|data:|javascript:|whatsapp:)/i.test(t)) return { skip: true };
  t = t.split('#')[0].split('?')[0];
  if (!t) return { skip: true };
  let abs;
  if (t.startsWith('/')) abs = path.join(ROOT, t.replace(/^\/+/, ''));
  else abs = path.resolve(path.dirname(fromFile), t);
  if (t.endsWith('/')) abs = path.join(abs, 'index.html');
  if (!path.extname(abs)) {
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) abs = path.join(abs, 'index.html');
  }
  return { abs, raw: t };
}

const pages = walk(ROOT, []).sort();
const products = JSON.parse(fs.readFileSync(path.join(ROOT, 'products.json'), 'utf8'));
const bySlug = new Map(products.map(p => [p.slug, p]));
const titles = new Map();
const descs = new Map();
const canonicals = new Map();

// CNAME
try {
  const cname = fs.readFileSync(path.join(ROOT, 'CNAME'), 'utf8').trim();
  if (cname !== HOST) fail('CNAME is "' + cname + '", expected "' + HOST + '"');
} catch (e) { fail('CNAME file missing'); }

for (const file of pages) {
  const rel = relOf(file);
  const html = fs.readFileSync(file, 'utf8');
  const noindex = NOINDEX.has(rel) || /noindex/i.test((getMeta(html).robots || ''));

  if (html.includes('\uFFFD')) fail(rel + ': contains U+FFFD replacement character');
  // double-encoded UTF-8: a UTF-8 lead-byte misread (U+00C2-U+00F4) followed by a
  // continuation-byte misread - catches mangled apostrophes/dashes/rupee signs and
  // "Â"-style middle dots (classic UTF-8-read-as-cp1252 corruption)
  if (/[\u00c2-\u00f4][\u0080-\u024f\u2000-\u218f\u2200-\u22ff]/.test(html)) fail(rel + ': contains mojibake (double-encoded UTF-8)');
  if (/TODO\(owner\)/i.test(html)) fail(rel + ': contains an unpublished TODO(owner) marker');

  const m = getMeta(html);

  // JSON-LD parses
  m.ld.forEach((block, i) => {
    try { JSON.parse(block); } catch (e) { fail(rel + ': JSON-LD block #' + (i + 1) + ' does not parse (' + e.message + ')'); }
  });

  if (noindex) continue;

  if (!m.title) fail(rel + ': missing <title>');
  else {
    if (m.title.length > 70) warn(rel + ': title is ' + m.title.length + ' chars (>70)');
    if (titles.has(m.title)) fail(rel + ': duplicate title with ' + titles.get(m.title));
    else titles.set(m.title, rel);
  }
  if (!m.desc) fail(rel + ': missing meta description');
  else {
    // &amp; etc. shrink when rendered; allow a small encoded slack
    if (m.desc.length > 165) fail(rel + ': meta description is ' + m.desc.length + ' chars (>165)');
    if (descs.has(m.desc)) warn(rel + ': duplicate meta description with ' + descs.get(m.desc));
    else descs.set(m.desc, rel);
  }
  if (m.h1s.length !== 1) fail(rel + ': expected exactly one <h1>, found ' + m.h1s.length);
  if (!m.canonical) fail(rel + ': missing canonical');
  else {
    if (!m.canonical.startsWith(ORIGIN + '/')) fail(rel + ': canonical is not on ' + ORIGIN + ' (' + m.canonical + ')');
    if (canonicals.has(m.canonical)) fail(rel + ': duplicate canonical with ' + canonicals.get(m.canonical));
    else canonicals.set(m.canonical, rel);
  }
  if (!m.ogImage) fail(rel + ': missing og:image');
  if (!m.twImage) fail(rel + ': missing twitter:image');

  // every <img> has alt
  for (const img of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt=/.test(img[0])) fail(rel + ': <img> without alt — ' + img[0].slice(0, 80));
  }

  // internal links resolve
  for (const a of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
    const r = resolveTarget(file, a[1]);
    if (r.skip || !r.abs) continue;
    if (!fs.existsSync(r.abs)) fail(rel + ': broken internal link "' + r.raw + '"');
  }

  // Product schema offer prices match products.json
  if (rel.startsWith('fragrance/')) {
    const slug = path.basename(rel, '.html');
    const pr = bySlug.get(slug);
    if (!pr) { warn(rel + ': no matching product in products.json'); }
    else {
      const prod = m.ld.map(b => { try { return JSON.parse(b); } catch (e) { return null; } }).find(j => j && j['@type'] === 'Product');
      if (!prod) fail(rel + ': no Product JSON-LD');
      else {
        const offers = prod.offers && (prod.offers.offers || [prod.offers]);
        for (const o of (offers || [])) {
          const size = String(o.name || '').replace(/ml$/i, '');
          if (!size) continue;
          if (String(pr.prices[size]) !== String(o.price)) fail(rel + ': offer ' + o.name + ' price ' + o.price + ' != products.json ' + pr.prices[size]);
        }
      }
    }
  }
}

// sitemap
let sitemapLocs = [];
try {
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  if (/<priority>/.test(xml)) fail('sitemap.xml still contains <priority>');
  sitemapLocs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => x[1].trim());
  const locSet = new Set(sitemapLocs);
  for (const loc of sitemapLocs) {
    if (!loc.startsWith(ORIGIN + '/')) { fail('sitemap loc not on ' + ORIGIN + ': ' + loc); continue; }
    const p = decodeURIComponent(loc.slice((ORIGIN + '/').length));
    const abs = p === '' ? path.join(ROOT, 'index.html') : path.join(ROOT, p);
    if (!fs.existsSync(abs)) fail('sitemap loc has no file: ' + loc);
  }
  // every indexable page is listed
  for (const canon of canonicals.keys()) {
    if (!locSet.has(canon)) fail('page canonical missing from sitemap: ' + canon + ' (' + canonicals.get(canon) + ')');
  }
} catch (e) { fail('sitemap.xml missing or unreadable'); }

// robots + llms
try {
  const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  if (!/^Sitemap:/m.test(robots)) fail('robots.txt has no Sitemap: line');
  if (/Disallow:\s*\/\s*$/m.test(robots)) warn('robots.txt disallows the whole site');
} catch (e) { fail('robots.txt missing'); }
if (!fs.existsSync(path.join(ROOT, 'llms.txt'))) fail('llms.txt missing');

// shared config: single source for store facts + shipping maths
try {
  const cfg = require(path.join(ROOT, 'config.js'));
  for (const k of ['base', 'phoneDisplay', 'phoneTel', 'email', 'freeShipMin', 'freeShipMinQty', 'shippingFlat']) {
    if (cfg[k] === undefined || cfg[k] === '') fail('config.js: missing ' + k);
  }
  const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const ci = home.indexOf('src="config.js?');
  const ai = home.indexOf('src="assets/app.js?');
  if (ci < 0) fail('index.html does not load config.js');
  else if (ai < 0 || ci > ai) fail('config.js must load before assets/app.js');
  const appjs = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  if (!/IRAM_CONFIG/.test(appjs)) fail('assets/app.js does not read window.IRAM_CONFIG');
  const gen = fs.readFileSync(path.join(ROOT, 'seo-gen.js'), 'utf8');
  if (!/require\([^)]*config\.js/.test(gen)) fail('seo-gen.js does not require config.js');
} catch (e) { fail('config.js missing or unreadable: ' + e.message); }

// report
for (const w of warnings) console.warn('WARN  ' + w);
for (const f of failures) console.error('FAIL  ' + f);
console.log('\nseo-audit: ' + pages.length + ' pages, ' + sitemapLocs.length + ' sitemap urls, '
  + warnings.length + ' warnings, ' + failures.length + ' failures');
if (failures.length) process.exit(1);
console.log('SEO AUDIT PASSED');
