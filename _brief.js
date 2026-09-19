var fs = require('fs');
var l = fs.readFileSync('C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html', 'utf8').split('\n');

function brief(i) {
  var tds = l[i].match(/<td[^>]*>.*?<\/td>/g) || [];
  var out = [];
  for (var j = 0; j < tds.length; j++) {
    var cls = '?';
    var m = tds[j].match(/class="([^"]+)"/);
    if (m) cls = m[1];
    var txt = tds[j].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    out.push(cls.split('-')[0] + ':' + txt.substring(0, 20));
  }
  console.log('Row ' + (i + 1) + ' [' + tds.length + ' cells]: ' + out.join('  '));
}

[3737, 3738, 3729, 3730, 3692, 3693].forEach(brief);
