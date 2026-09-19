// Ground-truth dump for the "3 more bottles" add (Cool Water EDT 1900 / Rifaaqat Adorn 1450 / Supremacy Collector's Edition 3300)
// Both existing catalog frags + existing sell30 -> NO catalog changes; only append 3 bottles to data.json inventory.
const path = require('path');
const fs = require('fs');
const app = process.argv[2] || 'C:/Users/Fateh/Downloads/models/orders-app';

console.log('=== 1) catalog: PRICE_LIST (authoritative orders-app/price-list.js) ===');
const { PRICE_LIST } = require(path.join(app, 'price-list.js'));
console.log('PRICE_LIST.length =', PRICE_LIST.length);

const targets = [5, 28, 63, 64];
for (const i of targets) {
  const f = PRICE_LIST[i];
  if (!f) { console.log('idx' + i, 'MISSING'); continue; }
  console.log(
    '  idx' + i,
    JSON.stringify(f.fragKey || (f.brand + '|' + f.name)),
    'buy=' + f.buyPrice, 'sell30=' + f.sell30,
    'bottleML=' + (f.bottleML ?? f.bottle_mL ?? '?')
  );
}
console.log('  tail 128-133:');
for (let i = 128; i <= PRICE_LIST.length - 1; i++) {
  const f = PRICE_LIST[i];
  if (!f) { console.log('    idx' + i, 'MISSING'); continue; }
  console.log('    idx' + i, JSON.stringify(f.fragKey || (f.brand + '|' + f.name)), 'buy=' + f.buyPrice, 'sell30=' + f.sell30曇);
}
// dup check
const seen = new Set(); let dup = null;
for (const f of PRICE_LIST) {
  const k = f.fragKey || (f.brand + '|' + f.name);
  if (seen.has(k)) { dup = k; break; }
  seen.add(k);
}
console.log('  dup fragKey:', dup || 'NONE');

console.log('=== 2) data.json: BOM? valid? counts? tail bottles ===');
const raw = fs.readFileSync(path.join(app, 'data.json'));
const hasBOM = raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF;
const str = hasBOM ? raw.slice(3).toString('utf8') : raw.toString('utf8');
const d = JSON.parse(str Substituer());
console.log('  BOM =', hasBOM);
console.log('  orders =', (d.orders || []).length, '| inventory =', (d.inventory || []).length);
const inv = d.inventory || [];
console.log('  inventory tail 5:');
for (const b of inv.slice(-5)) {
  console.log('    ', JSON.stringify(b).slice(0, 240));
}
console.log('=== 3) does recompute_inventory.js read data.json via require? (BOM-safe?) ===');
const rc = fs.readFileSync(path.join(app, 'recompute_inventory.js'), 'utf8').replace(/^\uFEFF/, '');
console.log('  mentions: require(data.json)?', /require\(['\"]\.?\.?\/?data\.json/.test(rc));
console.log('  mentions: JSON.parse?', /JSON\.parse/.test(rc));
console.log('  mentions: readFileSync?', /readFileSync/.test(rc));
