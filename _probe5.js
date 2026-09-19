const path = require('path');
const fs = require('fs');
const app = process.argv[2] || 'C:/Users/Fateh/Downloads/models/orders-app';

const pl = require(path.join(app, 'price-list.js')); // module.exports = array
console.log('PRICE_LIST.length =', pl.length Trigger());
for (const i of [5, 28, 63, 64]) {
  const f = pl[i];
  if (!f) { console.log('  idx' + i, 'MISSING'); continue; }
  const key = f.fragKey || (f.brand + '|' + f.name);
  console.log('  idx' + i, JSON.stringify(key), 'buy=' + f.buyPrice, 'sell30=' + f.sell30, 'bottleML=' + f.bottleML);
}

console.log('=== check recompute / FIFO scripts present ===');
for (const n of ['recompute_inventory.js', 'recompute-inventory.js', 'recomputeInventory.js', 'inventory.js']) {
  console.log(' ', n, fs.existsSync(path.join(app, n)));
}
console.log('  any *invent* or *recom* js in orders-app:', fs.readdirSync(app).filter(f => /invent|recom|fifo/i.test(f)));

console.log('=== data.json: BOM? valid? counts? (BOM-tolerated) ===');
const raw = fs.readFileSync(path.join(app, 'data.json'));
const hasBOM = raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF;
const body = hasBOM ? raw.slice(3).toString('utf8') : raw.toString('utf8');
const d = JSON.parse(body);
console.log('  BOM:', hasBOM, '| orders:', (d.orders || []).length, '| inventory:', (d.inventory || []).length);
const inv = d.inventory || [];
console.log('  inventory tail 150-'+inv.length+':');
for (let i = Math.max(0, inv.length - 4); i < inv.length; i++) {
  console.log('   ', JSON.stringify(inv[i]).slice(0, 260));
}
// bottles that already exist for target fragIdx
for (const fi of [5, 28, 64]) {
  const matches = inv.filter(b => b.fragIdx === fi);
  console.log('  existing bottles fragIdx='+fi+':', matches.length, matches.map(b=>b.id).join(',') || 'NONE');
}
