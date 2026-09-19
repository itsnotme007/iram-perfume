var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var lines = fs.readFileSync(P, 'utf8').split('\n');

function rspan(line) {
  var m = line.match(/rowspan="(\d+)"/);
  return m ? parseInt(m[1], 10) : 1;
}
function bname(line) {
  var m = line.match(/<td class="brand-cell"[^>]*>(.*?)<\/td>/);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// Collect brand-sep row indices in order
var seps = [];
for (var i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('brand-sep') >= 0) seps.push(i);
}

// For each brand-sep: frag rows between it and the NEXT brand-sep.
// Expected rowspan = that count + 1 (brand itself + its frag rows).
var fixes = [];
for (var s = 0; s < seps.length; s++) {
  var i = seps[s];
  var next = (s + 1 < seps.length) ? seps[s + 1] : lines.length;
  var fragRows = 0;
  for (var k = i + 1; k < next; k++) {
    if (lines[k].indexOf('frag-cell') >= 0) fragRows++;
  }
  var expected = fragRows + 1;
  var cur = rspan(lines[i]);
  if (cur !== expected) {
    lines[i] = lines[i].replace(/rowspan="\d+"/, 'rowspan="' + expected + '"');
    fixes.push({ i: i, brand: bname(lines[i]), was: cur, isNow: expected });
  }
}

fs.writeFileSync(P, lines.join('\n'));
console.log('FIXED ' + fixes.length + ' rowspans:');
fixes.forEach(function(f) {
  console.log('  L' + (f.i + 1) + ' ' + f.brand.substring(0, 22) + ': ' + f.was + ' -> ' + f.isNow);
});
