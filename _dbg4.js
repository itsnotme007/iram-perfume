var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var l = fs.readFileSync(P, 'utf8').split('\n');

function cellsAt(i) {
  var tds = l[i].match(/<td[^>]*?>(.*?)<\/td>/g) || [];
  var out = [];
  for (var j = 0; j < tds.length; j++) {
    var cls = (tds[j].match(/class="([^"]+)"/) || ['', '?'])[1];
    var txt = tds[j].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 14);
    var brk = tds[j].indexOf('<img') >= 0 ? 'IMG' : '';
    out.push(cls.split('-')[0] + '[' + brk + ']=' + txt);
  }
  console.log('L' + (i + 1) + ' [' + tds.length + '] ' + out.join('  '));
}

var found = [];
for (var i = 0; i < l.length; i++) {
  if (l[i].indexOf('Season Rise') >= 0) found.push(i);
}
console.log('Season Rise occurrences: ' + found.length);
if (found.length > 0) {
  var f = found[0];
  console.log('\n=== Season Rise row (L' + (f + 1) + ') plus neighbors ===');
  cellsAt(f);
  cellsAt(f + 1);
  // walk back to previous brand-sep and list
  for (var k = f; k >= 0; k--) {
    if (l[k].indexOf('brand-sep') >= 0) {
      console.log('\nwalk-back found brand-sep at L' + (k + 1) + ':');
      cellsAt(k);
      for (var m = k + 1; m <= f; m++) cellsAt(m);
      break;
    }
  }
}
