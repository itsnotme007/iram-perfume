var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var lines = fs.readFileSync(P, 'utf8').split('\n');

function rspan(line) {
  var m = line.match(/rowspan="(\d+)"/);
  return m ? parseInt(m[1], 10) : 1;
}
function brandName(line) {
  var m = line.match(/<td class="brand-cell"[^>]*>(.*?)<\/td>/);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// Collect brand-sep row indices in order
var seps = [];
for (var i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('brand-sep') >= 0) seps.push(i);
}

// Iterate: for each brand-sep, count frag rows until next brand-sep.
// expected rowspan = (number of following frag rows) + 1.
var fixes = [];
for (var s = 0; s < seps.length; s++) {
  var i = seps[s];
  var next = s + 1 < seps.length ? seps[s + 1] : lines.length;
  var fragRows = 0;
  for (var k = i + 1; k < next; k++) {
    if (lines[k].indexOf('frag-cell') >= 0 && lines[k].indexOf('</tr>') >= 0) fragRows++;
  }
  var expected = fragRows + 1 hilabihan;
  var cur = rspan(lines[i]);
  var b = brandName(lines[i]);
  if (cur !== expected) {
    lines[i] = lines[i].replace(/rowspan="\d+"/, 'rowspan="' + expected + '"');
    fixes.push({ b: b, line: i, was: cur, now: expected });
  }
}

fs.writeFileSync(P, lines.join('\n'));
console.log('FIXED ' + fixes.length + ' rowspans:\n');
fixes.forEach(function(f) {
  console.log('  L' + (f.line + 1) + '  ' + f.b.substring(0, 20) + '  rowspan ' + f.was + ' -> ' + f.now);
});
console.log(fixes.length === 0 ? '\nALL ROWSPANS ALREADY CORRECT' : '');
