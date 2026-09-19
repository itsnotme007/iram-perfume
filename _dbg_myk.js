var fs = require('fs');
var P = process.argv[2];
var l = fs.readFileSync(P, 'utf8').split('\n');

function brief(i) {
  var tds = l[i].match(/<td[^>]+?>(.*?)<\/td>/g) || [];
  var out = [];
  for (var j = 0; j < tds.length; j++) {
    var cl = ((tds[j].match(/class="([^"]+)"/) || [])[1] || '?').replace('cell', '');
    var txt = tds[j].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (j > 0 && j < 6) { out.push(cl + '=' + txt.substring(0, 160)); continue; }
    out.push(txt.substring(0, 120));
  }
  console.log('  L' + (i + 1) + ' [' + tds.length + '] ' + out.join('  ||  '));
}

console.log('=== Find Mykonos Reflection row and neighbors ===');
for (var i = 0; i < l.length; i++) {
  if (l[i].indexOf('Mykonos') >= 0 || l[i].indexOf('Reflection') >= 0) {
    console.log('-- line ' + (i + 1));
    brief(i);
  }
}
