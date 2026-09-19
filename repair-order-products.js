/* One-time repair for legacy orders that stored a fragile PRICE_LIST index.
 * It adds a permanent product snapshot to every order line and writes a backup
 * before changing data.json. Safe to run again: existing snapshots are kept.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, 'orders-app');
const dataFile = path.join(root, 'data.json');
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const priceSource = fs.readFileSync(path.join(root, 'price-list.js'), 'utf8');
const context = {};
vm.createContext(context);
vm.runInContext(priceSource + ';globalThis.__products = PRICE_LIST;', context);
const products = context.__products;
const match = page.match(/const sheetData = \[([\s\S]*?)\n  \];/);
if (!match) throw new Error('Could not find the original inventory list.');
const seedContext = {};
vm.createContext(seedContext);
vm.runInContext('globalThis.__seed = [' + match[1] + '\n];', seedContext);
const seed = seedContext.__seed;
const key = (brand, name) => `${brand}|${name}`;
const byKey = new Map(products.map((p, index) => [key(p.brand, p.name), { ...p, index }]));
const seededProducts = seed.filter(p => byKey.has(key(p.brand, p.name)));
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const seededInventory = (data.inventory || []).filter(b => /^s\d+$/.test(String(b.id))).sort((a, b) => Number(String(a.id).slice(1)) - Number(String(b.id).slice(1)));
const seededById = new Map();
seededInventory.forEach((b, index) => { const p = seededProducts[index]; if (p) seededById.set(b.id, p); });
const bottleCost = { 3: 10, 5: 10, 7.5: 10, 8: 10, 20: 55, 30: 55, 50: 70 };
function costCandidates(item) {
  return seed.filter(p => p.ml && p.buy && Math.round((p.buy / p.ml) * item.size) + (item.type === 'full' ? 0 : (bottleCost[item.size] || 0)) === item.cost);
}
function snapshot(item, p) {
  item.fragKey = key(p.brand, p.name); item.fragBrand = p.brand; item.fragName = p.name;
  const current = byKey.get(item.fragKey); if (current) item.fragIdx = current.index;
}
let repaired = 0, uncertain = 0, inventoryRepaired = 0;
for (const bottle of data.inventory || []) {
  const p = seededById.get(bottle.id) || products[bottle.fragIdx];
  if (!p) continue;
  snapshot(bottle, p);
  inventoryRepaired++;
}
for (const order of data.orders || []) for (const item of order.items || []) {
  if (item.fragKey && item.fragBrand && item.fragName) continue;
  let p = seededById.get(item.bottleInvId);
  if (!p) { const candidates = costCandidates(item); if (candidates.length === 1) p = candidates[0]; }
  if (!p && products[item.fragIdx]) { p = products[item.fragIdx]; uncertain++; }
  if (!p) { uncertain++; continue; }
  snapshot(item, p); repaired++;
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = path.join(root, `data.before-product-repair.${stamp}.json`);
fs.copyFileSync(dataFile, backup);
data.settings = { ...(data.settings || {}), catalogSnapshotVersion: 2, catalogSnapshotRepairedAt: new Date().toISOString() };
fs.writeFileSync(dataFile, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ backup: path.basename(backup), repaired, uncertain, inventoryRepaired, orders: (data.orders || []).length }, null, 2));
