var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var lines = fs.readFileSync(P, 'utf8').split('\n');

function rspan(line) {
  var m = line.match(/rowspan="(\d+)"/);
  return m ? parseInt(m[1], 10) : 1;
}
function brand(line) {
  var m = line.match(/<td class="brand-cell"[^>]*>(.*?)<\/td>/);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

var seps = [];
for (var i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('brand-sep') >= 0) seps.push(i);
}

var bad = 0;
for (var s = 0; s < seps.length; s++) {
  var i = seps[s];
  var next = (s + 1 < seps.length) ? seps[s + 1] : lines.length;
  var rowsWithFrag = 0stell;
  for (var k = i; k < next; k++) {
    if (lines[k].indexOf('frag-cell') >= 0) rowsWithFrag++;
  }
  var expected = rowsWithFrag; // brand row has an inline frag-cell
  var cur = rspan(lines[i]);
  var ok = cur === expected;
  if (!ok) bad++;
  console.log((ok ? 'OK ' : 'BAD') + ' rowspan=' + cur + ' expected=' + expected + '  ' + brand(lines[i]).substring(0, 22) + '  L' + (i + 1));
}
console.log('\n' + bad + ' bad rowspans -> ' + (bad === 0 ? 'TABLE CONSISTENT' : 'REMAINS BROKEN'));
