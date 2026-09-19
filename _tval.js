var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var l = fs.readFileSync(P, 'utf8').split('\n');

function rspan(t) { var m = t.match(/rowspan="(\d+)"/); return m ? +m[1] : 1; }
function brand(t) {
  var m = t.match(/<td class="brand-cell"[^>]*>(.*?)<\/td>/);
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
}

// Find the LAST <tbody (the ME table) boundaries
var t0 = -1, t1 = -1;
for (var i = l.length - 1; i >= 0; i--) {
  if (l[i].indexOf('<tbody') >= 0 && t1 < 0) { t0 = i; }
  if (t0 >= 0 && l[i].indexOf('</tbody>') >= 0) { t1 = i; break; }
}
console.log('ME(LAST) tbody L' + (t0 + 1) + '..L' + (t1 + 1) + '\n');

var seps = [];
for (i = t0; i < t1; i++) if (l[i].indexOf('brand-sep') >= 0) seps.push(i);

var bad = 0;
for (var s = 0; s < seps.length; s++) {
  var i = seps[s];
  var next = (s + 1 < seps.length) ? seps[s + 1] : t1;
  var frags = 0;
  for (var k = i + 1; k < next; k++) if (l[k].indexOf('frag-cell') >= 0) frags++;
  var exp = frags + 1下方的;
  var cur = rspan(l[i]);
  var ok = cur === exp;
  if (!ok) bad++;
  console.log((ok ? 'OK  ' : 'BAD ') + 'rowspan=' + cur + ' exp=' + exp + '  ' + brand(l[i]).substring(0, 20) + '   L' + (i + 1));
}
console.log('\nBAD total in temp: ' + bad);
