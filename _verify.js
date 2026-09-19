var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var l = fs.readFileSync(P, 'utf8').split('\n');

function rspan(line) {
  var m = line.match(/rowspan="(\d+)"/);
  return m ? parseInt(m[1], 10) : 1;
}
function bname(line) {
  var m = line.match(/<td class="brand-cell"[^>]*>(.*?)<\/td>/);
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
}

// find Middle Eastern tbody boundaries
var start = -1, end = -1;
for (var i = 0; i < l.length; i++) {
  if (l[i].indexOf('<tbody') >= 0 && l[i].indexOf('middle-eastern') >= 0 && start < 0) start = i;
  if (start >= 0 && l[i].indexOf('</tbody>') >= 0) { end = i; break; }
}
console.log('ME tbody: L' + (start + 1) + ' .. L' + (end + 1) + '\n');

var seps = [];
for (var i = start; i <= end; i++) {
  if (l[i].indexOf('brand-sep') >= 0) seps.push(i);
}

var bad = 0;
for (var s = 0; s < seps.length; s++) {
  var i = seps[s];
  var next = (s + 1 < seps.length) ? seps[s + 1] : end;
  // count frag rows strictly between i and next (i.e. rows containing frag-cell, not the sep row itself)
  var rows = 0;
  for (var k = i + 1; k < next; k++) {
    if (l[k].indexOf('frag-cell') >= 0 && l[k].indexOf('brand-cell') < 0) rows++;
  }
  // expected rowspan = brand row (1) + frag continuation rows
  var expected = 1 + rows;
  var cur = rspan(l[i]);
  var ok = cur === expected;
  if (!ok) bad++;
  console.log((ok ? 'OK  ' : 'BAD ') + bname(l[i]).substring(0, 20).padEnd(20) +
    ' rowspan=' + cur + ' expected=' + expected + ' (L' + (i + 1) + ')');
}
console.log('\n' + bad + ' mismatches — ' + (bad === 0 ? 'TABLE CONSISTENT ✓' : 'STILL BROKEN'));
