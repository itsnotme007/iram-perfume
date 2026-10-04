// Verifies seo-gen's table rendering stays byte-faithful to the pre-render
// markup: extracts the two catalogue <tbody> regions from a git ref and from
// the working copy, strips the static attrs seo-gen adds
// (data-brand / data-price / data-pid), then requires exact equality.
// Usage: node tests/render-fidelity.js [git-ref]   (default: HEAD)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const REF = process.argv[2] || 'HEAD';
const ROOT = path.join(__dirname, '..');
const norm = (t) => t.replace(/\r\n/g, '\n');
const oldHtml = norm(execSync('git show ' + REF + ':index.html', { cwd: ROOT, maxBuffer: 1 << 25 }).toString('utf8'));
const newHtml = norm(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
function tbodies(html) {
  const catStart = html.indexOf('<div class="section-heading">Designer');
  const catEnd = html.indexOf('Bottle Options', catStart);
  if (catStart < 0 || catEnd < 0) { console.error('catalogue region not found'); process.exit(2); }
  return [...html.slice(catStart, catEnd).matchAll(/<tbody>[\s\S]*?<\/tbody>/g)].map((m) => m[0]);
}
const a = tbodies(oldHtml), b = tbodies(newHtml);
if (a.length !== 2 || b.length !== 2) {
  console.error('expected 2 catalogue tbodies, got ' + a.length + ' (ref) / ' + b.length + ' (worktree)');
  process.exit(1);
}
let bad = 0;
for (let i = 0; i < 2; i++) {
  const stripped = b[i]
    .replace(/ data-brand="[^"]*"/g, '')
    .replace(/ data-price="\d+"/g, '')
    .replace(/ data-pid="[^"]*"/g, '');
  const rows = (a[i].match(/class="frag-cell"/g) || []).length;
  if (stripped === a[i]) {
    console.log('tbody' + i + ': EXACT MATCH (' + rows + ' product rows)');
  } else {
    bad++;
    const n = Math.min(stripped.length, a[i].length);
    let p = 0;
    while (p < n && stripped[p] === a[i][p]) p++;
    console.error('tbody' + i + ': DIFFERS at char ' + p + ' (old len ' + a[i].length + ', new len ' + stripped.length + ')');
    console.error('  old: ' + JSON.stringify(a[i].slice(Math.max(0, p - 80), p + 140)));
    console.error('  new: ' + JSON.stringify(stripped.slice(Math.max(0, p - 80), p + 140)));
  }
}
process.exit(bad ? 1 : 0);
