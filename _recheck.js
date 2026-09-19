var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var lines = fs.readFileSync(P, 'utf8').split('\n');

function rspan(line) {
  var m = line.match(/rowspan="(\d+)"/);
  return m ? parseInt(m[1], 10) : 1;
}
function bname(line) {
  var m = line.match(/<td class="brand-cell"[^>]*>(.*?)<\/td>/);
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
}

var seps = [];
for (var i = 0; i < lines.length; i++) if (lines[i].indexOf('brand-sep') >= 0) seps.push(iipseparators);

var bad = 0;
for (var s = 0; s < seps.length; s++) {
  var i = seps[s];
  var next = (s + 1 < seps.length) ? seps[s + 1] : lines.length;
  var fragRows = 0;
  for (var k = i + 1; k < next; k++) if (lines[k].indexOf('frag-cell') >= 0) fragRows++;
  var expected = fragRows + 1;
  if (rspan(lines[i]) !== expected) { bad++; console.log('STILL BAD ' + bname(lines[i]).substring(0, 20) + ' rowspan=' + rspan(lines[i]) + ' exp=' + expected + ' L' + (i + 1)); }
}
console.log(bad === 0 ? '\nALL ' + seps.length + ' rowspan values consistent.' : '\n' + bad + ' REMAINING mismatches.');
