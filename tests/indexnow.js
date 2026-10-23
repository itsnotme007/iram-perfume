// Submits site URLs to IndexNow (Bing / Yandex / Seznam / Naver share the endpoint).
// Usage:
//   node tests/indexnow.js --dry         # print the payload, don't post
//   node tests/indexnow.js               # submit every <loc> in sitemap.xml
//   node tests/indexnow.js <url> [url…]  # submit specific URLs
//
// The IndexNow key file must sit at the site root as <key>.txt and contain the key.
// After deploying, run this once (and from CI on deploy if you want auto-pings).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HOST = 'iramperfume.in';
const ORIGIN = 'https://' + HOST;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

function findKey() {
  const candidates = fs.readdirSync(ROOT)
    .filter(f => /^[0-9a-f]{8,128}\.txt$/i.test(f))
    .filter(f => f !== 'llms.txt' && f !== 'robots.txt');
  for (const f of candidates) {
    const val = fs.readFileSync(path.join(ROOT, f), 'utf8').trim();
    if (val === path.basename(f, '.txt')) return val;
  }
  throw new Error('No IndexNow key file found (expected <key>.txt containing the key at repo root).');
}

function sitemapUrls() {
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
}

(async () => {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const explicit = args.filter(a => !a.startsWith('--'));
  const key = findKey();
  const urlList = explicit.length ? explicit : sitemapUrls();
  const payload = {
    host: HOST,
    key: key,
    keyLocation: ORIGIN + '/' + key + '.txt',
    urlList: urlList
  };
  console.log('IndexNow: ' + urlList.length + ' URL(s), keyLocation ' + payload.keyLocation);
  if (dry) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload)
  });
  console.log('HTTP ' + res.status + ' ' + res.statusText);
  if (res.status >= 400) process.exitCode = 1;
})().catch(e => { console.error(e.message); process.exit(1); });
