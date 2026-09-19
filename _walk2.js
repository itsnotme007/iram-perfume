var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var l = fs.readFileSync(P, 'utf8').split('\n');

function rspan(line) {
  var m = line.match(/rowspan="(\d+)"/);
  return m ? parseInt(m[1], 10) : 1;
}

// STEP 1: map brand-sep -> brand name (text in brand-cell)
var brandByLine = {};
for (var i = 0; i < l.length; i++) {
  if (l[i].indexOf('brand-sep') >= 0) {
    var m = l[i].match(/<td class="brand-cell"[^>]*>(.*?)<\/td>/);
    if (m) brandByLine[i] = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }
}

// STEP 2: For each brand-sep at i with rowspan R, the frag rows of that brand are
// the rows i+1 .. before next brand-sep. Count frag rows = rows containing frag-cell
var keys = Object.keys(brandByLine).map(Number).sort(function(a, b) { return a - b; });
console.log('brand-sep count = ' + keys.length + '\n');

var bad = [];
for (var k = 0; k < keys.length; k++) {
  var i = keys[k];
  var next = k + 1 < keys.length ? keys[k + 1] : l.length;
  var fragRows = 0;
  for (var j = i + 1; j < next; j++) {
    if (l[j].indexOf('frag-cell') >= 0 && l[j].indexOf('</tr>') >= 0) fragRows++;
  }
  var expected = fragRows + 1; // brand-sep row itself counts as one spanned row
  var actual = rspan(l[i]);
  var ok = expected === actual;
  if (!ok) bad.push({ brand: brandByLine[i], line: i, expected: expected, actual: actual });
  console.log((ok ? 'OK  ' : 'BAD ') + (brandByLine[i] || '?').substring(0, 18).padEnd(18) +
    ' rowspan=' + actual + ' expected=' + expected + ' (line ' + (i + 1) + ')');
}
console.log('\n' + bad.length + ' BAD rowspans');
