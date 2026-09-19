var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var l = fs.readFileSync(P, 'utf8').split('\n');

function rspan(t) { var m = t.match(/rowspan="(\d+)"/); return m ? +m[1] : 1; }
function bname(t) {
  var m = t.match(/<td class="brand-cell"[^>]*>(.*?)<\/td>/);
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
}

// locate Middle-Eastern tbody
var t0 = -1, t1 = -1;
for (var i = 0; i < l.length; i++) {
  if (l[i].indexOf('<tbody') >= 0 && l[i].indexOf('middle-eastern') >= 0 && t0 < 0) t0 = i;
  if (t0 >= 0 && l[i].indexOf('</tbody>') >= 0) { t1 = i; break; }
}
console.log('ME tbody rows L' + (t0 + 1) + '..L' + (t1 + 1) + '\n');

// Collect brand-sep line indexes
var seps = [];
for (i = t0; i < t1; i++) if (l[i].indexOf('brand-sep') >= 0) seps.push(i);

var fixes = [];
for (var s = 0; s < seps.length; s++) {
  var i = seps[s];
  var j = (s + 1 < seps.length) ? seps[s + 1] : t1;
  // count frag-row rows strictly between brand-sep rows (rows containing frag-cell AND </tr>)
  var frags = 0;
  for (var k = i + 1; k < j; k++) if (l[k].indexOf('frag-cell') >= 0 && l[k].indexOf('</tr>') >= 0) frags++;
  var expected = frags + 1; // brand row + its frag rows
  var cur = rspan(l[i]);
  console.log((cur === expected ? 'OK  ' : 'BAD ') + 'rowspan=' + cur + ' exp=' + expected + '  ' + bname(l[i]).substring(0, 18) + '  L' + (i + 1));
  if (cur !== expected) fixes.push({ i: i, cur: cur, exp: expected });
}

console.log('\n' + fixes.length + ' rowspan fixes needed');
if (fixes.length) {
  for (var f = 0; f < fixes.length; f++) {
    var q = fixes[f];
    l[q.i] = l[q.i].replace(/rowspan="\d+"/, 'rowspan="' + q.exp + '"');
  }
  fs.writeFileSync(P, l.join('\n'));
  console.log('APPLIED ' + fixes.length + ' rowspan corrections to ' + P);
}
