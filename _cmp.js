const fs = require('fs');
function load(path) {
  const src = fs.readFileSync(path, 'utf8');
  // grab array literal between [ and ] (balanced, top-level)
  let start = src.indexOf('[');
  let depth = 0, end = -1;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  const arrSrc = src.slice(start, end + 1).replace(/,\s*\]/, ']');
  // convert unquoted keys and single quotes to JSON
  const json = arrSrc
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ':"$1"');
  return JSON.parse(json);
}

const cur = load('C:/Users/Fateh/Downloads/models/orders-app/price-list.js');
const bak = load('C:/Users/Fateh/AppData/Local/Temp/opencode/mod-backups/20260808-151034/price-list.js');

console.log('CURRENT len', cur.length, 'BACKUP len', bak.length);
console.log('\nCURRENT Hawas:');
cur.forEach((p, i) => { if (p.name.includes('Hawas')) console.log(' ', i, p.brand, p.name, 'sell30=' + p.sell30); });
console.log('\nBACKUP Hawas:');
bak.forEach((p, i) => { if (p.name.includes('Hawas')) console.log(' ', i, p.brand, p.name, 'sell30=' + p.sell30); });

const cNames = cur.map(p => p.brand + '|' + p.name);
const bNames = bak.map(p => p.brand + '|' + p.name);
console.log('\nonly in CURRENT:', cNames.filter(n => !bNames.includes(n)));
console.log('only in BACKUP:', bNames.filter(n => !cNames.includes(n)));
console.log('\nsame order?', JSON.stringify(cNames) === JSON.stringify(bNames));