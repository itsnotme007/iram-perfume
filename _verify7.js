const path = require('path');
const fs = require('fs');
const app = 'C:/Users/Fateh/Downloads/models/orders-app';

// --- catalog ---
const { PRICE_LIST } = require(path.join(app, 'price-list.js'));
console.log('PRICE_LIST.length =', PRICE_LIST.length);
const targets = [5, 28, 63, 64];
for (const i of targets) {
  const f = PRICE_LIST[i];
  if (!f) { console.log('idx' + i, 'MISSING'); continue; }
  console.log('idx' + i, JSON.stringify(f.fragKey || (f.brand + '|' + f.name)), 'buy=' + f.buyPrice, 'sell30=' + f.sell30, 'bottleML=' + f.bottleML);
}
console.log('tail 128-131:');
for (let i = 128; i <= 131; i++) {
  const f = PRICE_LIST[i];
  console.log('  idx' + i, JSON.stringify(f.fragKey || (f.brand + '|' + f.name)), 'buy=' + f.buyPrice, 'sell30=' + f.sell30);
}
const seen = new Set(); let dup = null;
for (const f of PRICE_LIST) {
  const k = f.fragKey || (f.brand + '|' + f.name);
  if (seen.has(k)) { dup = k; break; }
  seen.add(k);
}
console.log('dup fragKey:', dup || 'NONE');

// --- data.json (BOM-tolerant) ---
const raw = fs.readFileSync(path.join(app, 'data.json'));
const hasBOM = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
const body = hasBOM ? raw.slice(3).toString('utf8') : raw.toString('utf8');
const d = JSON.parse(body);
console.log('data.json BOM =', hasBOM);
console.log('orders =', (d.orders || []).length)
console.log('inventory =', (d.inventory || []).length);
const inv = d.inventory || [];
console.log('inv tail 5:');
for (const b of inv.slice(-5)) {
  console.log('  ', JSON.stringify({ id: b.id, fragIdx: b.fragIdx, fragKey: b.fragKey, buyPrice: b.buyPrice, totalML: b.totalML, remainingML: b.remainingML }).substring(0, 200));
}
