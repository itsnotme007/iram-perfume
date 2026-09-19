const path = require('path');
const fs = require('fs');
const app = process.argv[2] || 'C:/Users/Fateh/Downloads/models/orders-app';
const crypto = require('crypto');

const plPath = path.join(app, 'price-list.js');
const plRaw = fs.readFileSync(plPath).toString('utf8').replace(/^\uFEFF/, '');

console.log('=== 1) price-list.js: export shape + length ===');
console.log('  tail 4 lines of file:');
console.log('  ' + plRaw.trim().split('\n').slice(-4).join('\n  '));
console.log('  has "module.exports":', /module\.exports/.test(plRaw));
console.log('  has "export default":', /\bexport\s+default/.test(plRaw));
console.log('  has "const PRICE_LIST":', /const\s+PRICE_LIST/.test(plRaw));

// try requiring both ways
const required = require(plPath);
console.log('  require() keys:', Object.keys(required));
console.log('  required.PRICE_LIST isArray:', Array.isArray(required.PRICE_LIST));
console.log('  required isArray (module.exports=array directly):', Array.isArray(required));

const PL = Array.isArray(required) ? required : required.PRICE_LIST;
console.log('  PL.length =', PL ? PL.length : 'N/A');
if (PL) {
  const tail = 3;
  console.log('  tail ' + tail + ' entries:');
  for (let i = PL.length - tail; i < PL.length; i++) {
    const e = PL[i];
    console.log('    idx' + i, JSON.stringify({ fragKey: e.fragKey, brand: e.brand, name: e.name, buyPrice: e.buyPrice, sell30: e.sell30, bottleML: e.bottleML }).slice(0, 260));
  }
}

console.log('=== 2) data.json: BOM-tolerant read ===');
const dRaw = fs.readFileSync(path.join(app, 'data.json'));
const hasBOM = dRaw[0] === 0xEF && dRaw[1] === 0xBB && dRaw[2] === 0xBF;
const dStr = hasBOM ? dRaw.slice(3).toString('utf8') : dRaw.toString('utf8');
const d = JSON.parse(dStr);
console.log('  BOM present:', hasBOM);
console.log('  orders:', (d.orders || []).length);
console.log('  inventory count:', (d.inventory || []).length);
const inv = d.inventory || [];
console.log('  tail 4 bottles:');
for (const b of inv.slice(-4)) {
  console.log('    ' + JSON.stringify(b).slice(0, 320));
}

console.log('=== 3) what recompute_inventory.js reads/exports ===');
const rcPath = path.join(app, 'recompute_inventory.js');
if (fs.existsSync(rcPath)) {
  const rc = fs.readFileSync(rcPath).toString('utf8').replace(/^\uFEFF/, '');
  console.log('  exists. length chars:', rc.length);
  console.log('  reads data.json:', /data\.json/.test(rc));
  console.log('  uses require for data.json:', /require\([^)]*data\.json/.test(rc));
  console.log('  uses JSON.parse:', /JSON\.parse/.test(rc));
  console.log('  has "PRICE_LIST":', /PRICE_LIST/.test(rc));
  console.log('  has backup/write:', /writeFileSync|backup|\.bak/.test(rc));
} else {
  console.log('  NOT FOUND at', rcPath);
}
console.log('  --- other .js in app dir ---');
for (const f of fs.readdirSync(app).filter(f => f.endsWith('.js'))) {
  const s = fs.readFileSync(path.join(app, f)).toString('utf8').replace(/^\uFEFF/, '');
  const readsData = /data\.json/.test(s);
  const readsPL = /price-list\.js/.test(s);
  console.log('  ' + f, '| reads data.json:', readsData, '| reads price-list.js:', readsPL);
}
