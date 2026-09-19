var fs = require('fs');
var P = process.argv[2] || 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var l = fs.readFileSync(P, 'utf8').split('\n');

// Find the Middle Eastern tbody and iterate brand-sep rows in order.
// For each brand-sep with rowspan=K, count the rows that follow (non brand-sep frag rows)
// before the NEXT brand-sep. Report mismatches (rowspan != actual count).

function rspan(i) {
  var m = (l[i].match(/rowspan="(\d+)"/) || [])[1];
  return m ? parseInt(m, 10) : -1;
}

var seps = [];
for (var i = 0; i < l.length; i++) {
  if (l[i].indexOf('brand-sep') >= 0) {
    var b = (l[i].match(/brand-cell[^>]*>(.*?)<\/td>/) || [])[1] || '';
    b = b.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    seps.push({ i: i, brand: b, r: rspan(i) });
  }
}

console.log('Total brand-sep rows: ' + seps.length + '\n');
var problems = 0;
for (var j = 0; j < seps.length; j++) {
  var s = seps[j];
  var nextI = (j + 1 < seps.length) ? seps[j + 1].i : l.length;
  var count = 0;
  for (var k = s.i + 1; k < nextI; k++) {
    if (l[k].indexOf('<tr') >= 0 && l[k].indexOf('brand-sep') < 0) count++;
  }
  var ok = (s.r === count);
  if (!ok) problems++;
  console.log((ok ? 'OK ' : 'BAD') + ' rowspan=' + s.r + ' actual=' + count + '  brand="' + (s.brand || '?').substring(0, 22) + '" (row ' + (s.i + 1) + ')');
}
console.log('\n' + problems + ' mismatches');
