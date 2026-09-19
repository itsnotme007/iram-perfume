var fs = require('fs');
var l = fs.readFileSync('C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html', 'utf8').split('\n');

function brief(i) {
  var tds = l[i].match(/<td[^>]+?>(.*?)<\/td>/g) || [];
  var out = [];
  for (var j = 0; j < tds.length; j++) {
    var cls = (tds[j].match(/class="([^"]+)"/) || ['', '?'])[1];
    var txt = tds[j].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 10);
    out.push(cls.split('-')[0] + ':' + txt);
  }
  console.log('L' + (i + 1) + ' [' + tds.length + '] ' + out.join(' | '));
}

// Swiss Arabian section rows (rows 3734??) — let's find
for (var i = 0; i < l.length; i++) {
  if (l[i].indexOf('Mykonos') >= 0) {
    console.log('--- FOUND Mykonos at line ' + (i + 1) + ' ---');
    for (var k = -1; k <= 2; k++) {
      if (i + k >= 0) brief(i + k);
    }
    break;
  }
}
