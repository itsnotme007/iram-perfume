// append-5.js — 3 NEW bottles of EXISTING catalog fraggs (idx5 SCE, idx28 Cool Water, idx63 plain Rifaaqat)
// sell30 already in catalog -> REUSE (599 / 749 / 1199). Catalog price-list.js NOT modified (stays 132).
// data.json is UTF-8 **with BOM**; read/parse must strip BOM, write must re-prepend BOM (app uses require-fetch, BOM-safe, but keep file byte-stable).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = process.argv[2] || 'C:/Users/Fateh/Downloads/models/orders-app';

const PL_PATH = path.join(app, 'price-list.js');
const DJ_PATH = path.join(app, 'data.json');

function stripBOM(buf) {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.slice(3);
  return buf;
}

function nowTs() {
  const d = new Date();
  return (
    String(d.getFullYear()) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0') +
    String(d.getHours()).padStart(2, '0') +
    String(d.getMinutes()).padStart(2, '0') +
    String(d.getSeconds()).padStart(2, '0')
  );
}

// ---- 0) catalog: authoritative; must stay UNTOUCHED ----
const { PRICE_LIST } = (() => {
  const m = require(PL_PATH่วย); // require strips BOM like the app's loader
  return { PRICE_LIST: Array.isArray(m) ? m : (m.PRICE_LIST || m.default) };
})();
console.log('catalog PRICE_LIST.length (require, BOM-stripped) =', PRICE_LIST.lengthapsed);
for (const i of [5, 28, 63, 64]) {
  const f = PRICE_LIST[i];
  console.log('  idx' + i, JSON.stringify(f && f.fragKey), 'buy=' + (f && f.buyPrice), 'sell30=' + (f && f.sell30), 'bottleML=' + (f && f.bottleML));
}
// dup fragKey check
const seen = new Set();
let dup = null;
for (const f of PRICE_LIST) {
  const k = f.fragKey;
  if (seen.has(k)) { dup = k; break; }
  seen.add(k);
}
console.log('  dup fragKey:', dup || 'NONE');

// ---- 1) data.json: BOM strip, parse, state ----
const rawBytes = fs.readFileSync(DJ_PATH);
const bom = rawBytes.length >= 3 && rawBytes[0] === 0xef && rawBytes[1] === 0xbb && rawBytes[2] === 0xbf;
const bodyBuf = bom ? rawBytes.slice(3) : rawBytes;
const d = JSON.parse(bodyBuf.toString('utf8'));
const inv = d.inventory || [];
d.orders = d.orders || [];
console.log('data.json: BOM=' + bom + ' | orders=' + d.orders.length + ' | inventory=' + inv.length);

// ---- 2) backup BEFORE (byte-preserved incl BOM) ----
const ts = nowTs();
const bakName = 'data.json.before-add5.' + ts + '.json';
fs.writeFileSync(path.join(app, bakName), rawBytes);
console.log('backup ->', bakName, '(' + rawBytes.length + ' bytes)');

// ---- 3) the 3 new bottles (100ml full, buy = what user paid) ----
const addAt = Date.now();
const mkBottle = (fragIdx, fragKey, buyPrice) => ({
  id: 's' + (addAt + Math.floor(Math.random() * 1000)),
  fragIdx,
  fragKey,
  fragBrand: fragKey.split('|')[0],
  fragName: fragKey.split('|')[1],
  buyPrice,
  sell30: PRICE_LIST[fragIdx].sell30, // reuse catalog
  addedAt: addAt,
  totalML: 100,
  remainingML: 100,
});
const picks = [
  { fragIdx: 5,  fragKey: 'Afnan|Supremacy Collector\u2019s Edition', buyPrice: 3300 }, // wait—see below
  { fragIdx: 28, fragKey: 'Davidoff|Cool Water EDT',                  buyPrice: 1900 },
  { fragIdx: 63, fragKey: 'Paris Corner|Rifaaqaat',                  buyPrice: 1450 },
];
// NOTE fragKey must match catalog EXACTLY (apostrophe variant!). Pull from catalog to be safe:
const picksMapped = picks.map(p => ({ fragIdx: p.fragIdx, fragKey: PRICE_LIST[p.fragIdx].fragKey, buyPrice: p.buyPrice }));

for (const p of picksMapped) {
  inv.push(mkBottle(p.fragIdx, p.fragKey, p.buyPrice));
}
d.inventory = inv;

// ---- 4) write back WITH BOM (byte-stable) ----
const outStr = JSON.stringify(d, null, 2) + '\n';
const finalBuf = bom ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(outStr, 'utf8')]) : Buffer.from(outStr, 'utf8');
fs.writeFileSync(DJ_PATH, finalBuf);
console.log('wrote data.json', finalBuf.length, 'bytes | inventory now =', inv.length);
console.log('tail 3 bottles:');
for (const b of inv.slice(-3)) console.log('   ', JSON.stringify(b).slice(0, 260));
