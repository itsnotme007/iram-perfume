var fs = require('fs');
var l = fs.readFileSync('C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html', 'utf8').split('\n');

function brief(i) {
  var tds = l[i].match(/<td[^>]*>.*?<\/td>/g) || [];
  var brand = (l[i].match(/rowspan="(\d+)"/) || [])[1];
  var out = 'Line ' + (i + 1) + ' [' + tds.length + ' cells' + (brand ? ', rowspan=' + brand : '') + ']: ';
  for (var j = 0; j < tds.length && j < 3; j++) {
    var cls = '?';
    var cm = tds[j].match(/class="([^"]+)"/);
    if (cm) cls = cm[1];
    var txt = tds[j].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    out += cls + '="' + txt.substring(0, 15) + '"  ';
  }
  return out;
}

// Find the Mykonos/Reflection rows and Nusuk rows by content
l.forEach(function(row, idx) {
  if (row.indexOf('Nusuk') >= 0 && (row.indexOf('Al Mukhtalif') >= 0)) {
    console.log('NUSUK-AREA ' + brief(idx));
  }
});
