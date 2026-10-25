// Merge owner-supplied product details without scraping third-party databases.
// Usage: node tools/import-details.js data/product-details-template.csv
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const input = process.argv[2];
if (!input) throw new Error('Usage: node tools/import-details.js <csv>');
function cells(line) {
  const out = []; let cur = '', quoted = false;
  for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"') { if (quoted && line[i + 1] === '"') { cur += ch; i++; } else quoted = !quoted; } else if (ch === ',' && !quoted) { out.push(cur); cur = ''; } else cur += ch; }
  out.push(cur); return out.map(x => x.trim());
}
const lines = fs.readFileSync(path.resolve(input), 'utf8').trim().split(/\r?\n/);
const heads = cells(lines.shift());
const required = ['key', 'notes_top', 'notes_heart', 'notes_base', 'longevity_hours', 'projection', 'inspired_brand', 'best_for'];
for (const h of required) if (!heads.includes(h)) throw new Error('Missing column: ' + h);
const rows = new Map(lines.filter(Boolean).map(line => { const values = cells(line); return [values[0], Object.fromEntries(heads.map((h, i) => [h, values[i] || '']))]; }));
const productsPath = path.join(root, 'products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
for (const pr of products) {
  const row = rows.get(pr.key); if (!row) continue;
  const split = field => row[field] ? row[field].split(/[;,]/).map(x => x.trim()).filter(Boolean) : [];
  const notes = { top: split('notes_top'), heart: split('notes_heart'), base: split('notes_base') };
  if (notes.top.length || notes.heart.length || notes.base.length) pr.notes = notes; else delete pr.notes;
  if (row.longevity_hours) { const n = Number(row.longevity_hours); if (!Number.isFinite(n) || n < 0) throw new Error(pr.key + ': longevity_hours must be a non-negative number'); pr.longevityHours = n; } else delete pr.longevityHours;
  if (row.projection) { if (!['soft', 'moderate', 'strong'].includes(row.projection)) throw new Error(pr.key + ': invalid projection'); pr.projection = row.projection; } else delete pr.projection;
  for (const [csv, prop] of [['inspired_brand', 'inspiredBrand'], ['best_for', 'bestFor']]) { if (row[csv]) pr[prop] = row[csv]; else delete pr[prop]; }
}
fs.writeFileSync(productsPath, JSON.stringify(products, null, 1) + '\n');
console.log('Imported owner-supplied details for ' + rows.size + ' rows. Run node seo-gen.js next.');
