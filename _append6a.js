// APPEND-6: 3 new bottles of EXISTING catalog frags (Cool Water EDT 1900 / Rifaaqaat 1450 / Supremacy Collector's Edition 3300)
// User confirmations: "They're existing frags - new bottles", sell30 "they are already add" (= reuse catalog sell30), "plain rifaqaat" (idx63, NOT Adorn idx64), buy 1900/1450/3300.
// -> No catalog edits. Append 3 bottles (fragIdx 28, 63, 5; 100/100ml) to orders-app/data.json with BOM-preserving backup.
const fs = require('fs');
const path = require('path');
const app = process.argv[2] || 'C:/Users/Fateh/Downloads/models/orders-app';

function stripBom(b) {
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return b.slice(3);
  return b;
}

console.log('=== 0) STEP 1: re-verify catalog (BOM-safe, authoritative) ===');
const { PRICE_LIST } = require(path.join(app, 'price-list.js'));
console.log('PRICE_LIST.length =', PRICE_LIST.length);
const want = [5, 28, 63, 64];
for (const i of want) {
  const f = PRICE_LIST[i];
  if (!f) { console.log('  idx' + i + '  MISSING'); continue; }
  const key = f.fragKey;
  console.log('  idx' + i + '  ' + JSON.stringify(key) + '  | buy=' + f.buyPrice + ' sell30=' + f.sell30 + ' ml=' + f.bottleML);
}
// sanity: dup fragKey in catalog?
const seen = new Set(); let dup = null;
for (const f of PRICE_LIST) {
  const k = f.fragKey;
  if (seen.has(k)) { dup = k; break; }
  seen.add(k);
}
console.log('  dup fragKey:', dup || 'NONE');

console.log('=== 1) STEP 2: data.json — valid? BOM? counts? tail 3 bottles ===');
const raw = fs.readFileSync(path.join(app, 'data.json'));
const hasBOM = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
const str = (hasBOM ? stripBom(raw) : raw).toString('utf8');
const d = JSON.parse(str);
const inv = d.inventory || [];
console.log('  valid JSON | BOM=' + hasBOM + ' | orders=' + (d.orders || []).length + ' | inventory=' + inv.length);
for (const b of inv.slice(-3)) console.log('  tail ' + JSON.stringify(b).slice(0, 260));
console.log('  existing bottles of idx5/28/63:', [5, 28, 63].map(i => inv.filter(b => b.fragIdx === i).length).join('/', ' , '));
