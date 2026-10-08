// Phase 4 image optimization (idempotent, re-runnable):
//  - images/bottles/*.png : cap at 1024px (AGENTS cutout rule), re-encode, add .webp sibling
//  - bottles/*.{jpg,jpeg} : cap at 1400px, mozjpeg q75
//  - logo.png             : cap at 512px (favicon/manifest use)
// Never grows a file: writes only when the new bytes are smaller.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MB = n => (n / 1048576).toFixed(1) + 'MB';
const KB = n => Math.round(n / 1024) + 'KB';

const CAP = 1024, WEBCAP = { quality: 80, alphaQuality: 90, effort: 4 };

async function optPng(file, dir) {
  const p = path.join(dir, file);
  const src = fs.readFileSync(p);          // read bytes first: sharp(fd) keeps the
  const before = src.length;               // file open on Windows and blocks rewrite
  const resized = () => sharp(src).resize({ width: CAP, height: CAP, fit: 'inside', withoutEnlargement: true });
  const png = await resized().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
  if (png.length < before) fs.writeFileSync(p, png);
  const webpPath = p.replace(/\.png$/, '.webp');
  const webp = await resized().webp(WEBCAP).toBuffer();
  const prevWebp = fs.existsSync(webpPath) ? fs.statSync(webpPath).size : Infinity;
  if (webp.length < prevWebp) fs.writeFileSync(webpPath, webp);
  // 500w sibling for srcset (cards render at ~152px CSS)
  const smallPath = p.replace(/\.png$/, '-500.webp');
  const small = await sharp(src).resize({ width: 500, height: 500, fit: 'inside', withoutEnlargement: true }).webp(WEBCAP).toBuffer();
  const prevSmall = fs.existsSync(smallPath) ? fs.statSync(smallPath).size : Infinity;
  if (small.length < prevSmall) fs.writeFileSync(smallPath, small);
  return { file, before, after: Math.min(png.length, before), webp: webp.length, small: small.length, dims: await sharp(src).metadata().then(m => m.width + 'x' + m.height) };
}

async function optLogos() {
  const dir = path.join(ROOT, 'logos');
  let n = 0, w0 = 0, w1 = 0;
  for (const f of fs.readdirSync(dir).filter(x => /\.(png|jpe?g)$/i.test(x)).sort()) {
    const src = fs.readFileSync(path.join(dir, f));
    const out = path.join(dir, f.replace(/\.(png|jpe?g)$/i, '') + '.webp');
    const buf = await sharp(src).webp({ quality: 85, effort: 4 }).toBuffer();
    const prev = fs.existsSync(out) ? fs.statSync(out).size : Infinity;
    w0 += fs.statSync(path.join(dir, f)).size; w1 += Math.min(buf.length, prev);
    if (buf.length < prev) fs.writeFileSync(out, buf);
    n++;
  }
  console.log('logos webp: ' + n + ' files  png total ' + KB(w0) + ' -> webp total ' + KB(w1));
}

async function optJpeg(file, dir) {
  const p = path.join(dir, file);
  const src = fs.readFileSync(p);
  const before = src.length;
  const buf = await sharp(src).resize({ width: 1400, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 75, mozjpeg: true }).toBuffer();
  if (buf.length < before) fs.writeFileSync(p, buf);
  const after = Math.min(buf.length, before);
  const m = await sharp(fs.readFileSync(p)).metadata();
  return { file, before, after, dims: m.width + 'x' + m.height };
}

async function main() {
  const bottleDir = path.join(ROOT, 'images', 'bottles');
  const gridDir = path.join(ROOT, 'bottles');
  let t0 = 0, t1 = 0, w0 = 0, w1 = 0, n = 0;
  for (const f of fs.readdirSync(bottleDir).filter(x => x.endsWith('.png')).sort()) {
    const r = await optPng(f, bottleDir);
    t0 += r.before; t1 += r.after; w0 += r.before; w1 += r.webp; n++;
    if (n % 40 === 0) console.log('  ...' + n + '/156');
  }
  console.log('bottles PNG: ' + n + ' files  ' + MB(t0) + ' -> ' + MB(t1) + '  (webp total ' + MB(w1) + ')');
  const grid = [];
  for (const f of fs.readdirSync(gridDir).filter(x => /\.(jpe?g)$/i.test(x)).sort()) {
    const r = await optJpeg(f, gridDir);
    grid.push(r);
    console.log('grid: ' + r.file + ' ' + KB(r.before) + ' -> ' + KB(r.after) + '  ' + r.dims);
  }
  const logoBefore = fs.statSync(path.join(ROOT, 'logo.png')).size;
  const logoSrc = fs.readFileSync(path.join(ROOT, 'logo.png'));
  const logoBuf = await sharp(logoSrc).resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
  if (logoBuf.length < logoBefore) fs.writeFileSync(path.join(ROOT, 'logo.png'), logoBuf);
  const logoAfter = Math.min(logoBuf.length, logoBefore);
  const lm = await sharp(fs.readFileSync(path.join(ROOT, 'logo.png'))).metadata();
  console.log('logo.png: ' + KB(logoBefore) + ' -> ' + KB(logoAfter) + '  ' + lm.width + 'x' + lm.height);
  // header <img> copy: logo.png (512) is 5x oversized for the <=100px banner slot
  const bannerBuf = await sharp(fs.readFileSync(path.join(ROOT, 'logo.png'))).resize(200, 200, { fit: 'contain', background: { r: 250, g: 249, b: 247, alpha: 0 } }).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(path.join(ROOT, 'logo-banner.png'), bannerBuf);
  console.log('logo-banner.png: ' + KB(bannerBuf.length) + '  200x200');
  await optLogos();
  // small shell icons: favicon (64) + apple-touch (180) so browsers stop pulling
  // the 512px logo for every cold load
  for (const [name, size] of [['favicon.png', 64], ['apple-touch-icon.png', 180]]) {
    const out = await sharp(fs.readFileSync(path.join(ROOT, 'logo.png'))).resize(size, size, { fit: 'contain', background: { r: 26, g: 26, b: 46, alpha: 1 } }).png({ compressionLevel: 9 }).toBuffer();
    fs.writeFileSync(path.join(ROOT, name), out);
    console.log(name + ': ' + KB(out.length) + '  ' + size + 'x' + size);
  }
  const heroDims = {};
  for (const s of ['lattafa-khamrah', 'rasasi-hawas-og', 'afnan-9-pm-og']) {
    const m = await sharp(path.join(bottleDir, s + '.webp')).metadata();
    heroDims[s] = m.width + 'x' + m.height;
  }
  console.log('hero webp dims: ' + JSON.stringify(heroDims));
}

main().catch(e => { console.error(e); process.exit(1); });
