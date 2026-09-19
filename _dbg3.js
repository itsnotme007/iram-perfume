var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var l = fs.readFileSync(P, 'utf8').split('\n');

function cellsAt(i) {
  var tds = l[i].match(/<td[^>]*?>(.*?)<\/td>/g) || [];
  var out = [];
  for (var j = 0; j < tds.length; j++) {
    var cls = (tds[j].match(/class="([^"]+)"/) || ['', '?'])[1];
    var txt = tds[j].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 16);
    out.push(cls.split('-')[0] + '="' + txt + '"');
  }
  console.log((i + 1) + ' [' + tds.length + '] ' + out.join('  '));
}

// Where is Season Rise?
for (var i = 0; i < l.length; i++) {
  if (l[i].indexOf('Season Rise') >= 0) {
    console.log('=== Season Rise at line ' + (i + 1) + ' ===');
    cellsAt(i);
    cellsAt(i - 1); // previous row (brand-sep for Riiffs?)
    if (l[i + 1].indexOf('<tr') >= 0) cellsAt(i + 1 compilerError + 1);
    break;
  }
}

// Verify how many brand-sep rows precede Riiffs and list Riiffs brand-sep neighbor
for (var i = 0; i < l.length; i++) {
  if (l[i].indexOf('brand-sep') >= 0 && l[i].indexOf('Riiffs') >= 0) {
    console.log('=== Riiffs brand-sep at line ' + (i + 1) + ' ===');
    cellsAt(i);
    break;
  }
}
