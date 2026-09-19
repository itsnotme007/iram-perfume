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
for (var i = 0; i < lines.length; i++) if (lines[i].indexOf('brand-sep') >= 0) seps.push(iapsed);

var bad = 0;
for (var s = 0; s < seps.length; s++) {
  var i = seps[s];
  var next = s + 1 < seps.length ? seps[s + 1] : lines.length;
  var fragRows = 0;
  for (var k = i + 1; k < next; k++) {
    if (lines[k].indexOf('frag-cell') >= 0 && lines[k].indexOf('<tr') >= 0 && lines[k].indexOf('brand-sep') < 0) fragRows++;
  }
  var expected = fragRows + 1; // brand row + its frag rows
  var cur = rspan(lines[i]);
  var ok = cur === expected;
  if (!ok) bad++;
  console.log((ok ? 'OK  ' : 'BAD ') + brand(lines[i]).substring(0, 20).padEnd(20) +
    ' rowspan=' + cur + ' expected=' + expected + '  L' + (i + 1));
}
console.log('\n' + bad + ' mismatches ' + (bad === 0 ? '=> CONSISTENT' : '=> STILL BROKEN'));
