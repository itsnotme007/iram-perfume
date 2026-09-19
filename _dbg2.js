var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var l = fs.readFileSync(P, 'utf8').split('\n');

function show(i) {
  var t = l[i];
  var n = (t.match(/<td/g) || []).length;
  var brand = t.match(/brand[^>]*>(.*?)<\/td>/) ? t.match(/brand[^>]*>(.*?)<\/td>/)[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
  var tds = t.match(/<td[^>]*?>(.*?)<\/td>/g) || [];
  var cls = [];
  for (var j = 0; j < tds.length; j++) {
    var c = (tds[j].match(/class="([^"]+)"/) || ['', '?'])[1];
    var txt = tds[j].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 30);
    cls.push(c.split('-')[0] + '[' + txt + ']');
  }
  console.log('L' + (i + 1) + ' n=' + n + ' brand="' + brand.substring(0, 30) + '"');
  console.log('   ' + cls.join('  '));
}

// Swiss Arabian Vanilla 01 row (line 3734)
show(3733);

// Swiss Arabian Vanilla 01 second row? and Swiss far row list — instead find Mykonos
for (var i = 3690; i < 3700; i++) {
  if (l[i].indexOf('Mykonos') >= 0) {
    console.log('   >>> Mykonos lines:');
    show(i);
    if (l[i + 1].indexOf('frag-cell') >= 0) show(i + 1);
    if (l[i + 2].indexOf('frag-cell') >= 0) show(i + 2);
    break;
  }
}
