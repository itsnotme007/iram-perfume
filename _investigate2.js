var l = require('fs').readFileSync('C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html', 'utf8').split('\n');

function countTds(i) {
  var tds = (l[i].match(/<td/g) || []).length;
  var classes = (l[i].match(/<td class="([^"]+)"/g) || []).map(function(x){ return x.replace(/<td class="/, ''); });
  return tds + ' cells [' + classes.join(',') + ']';
}

// Find Reflection row and its previous sibling rows
for (var i = 3725; i < 3742; i++) {
  var isBrandSep = l[i].indexOf('brand-sep') >= 0;
  var rowspan = (l[i].match(/rowspan="(\d+)"/) || [])[1];
  var hasRef = l[i].indexOf('Reflection') >= 0;
  var hasGlitch = l[i].indexOf('Glitch') >= 0;
  var hasZimaya = l[i].indexOf('Zimaya') >= 0;
  var hasNusuk = l[i].indexOf('Nusuk') >= 0;
  var tag = (isBrandSep ? 'BRAND-SEP' : '  row     ');
  var cells = countTds(i);
  console.log('L' + (i+1) + ' ' + tag + (rowspan ? ' rowspan=' + rowspan : '') +
    (hasNusuk ? ' [NUSUK]' : '') + (hasRef ? ' [REFLECTION]' : '') + (hasGlitch ? ' [GLITCH]' : '') + (hasZimaya ? ' [ZIMAYA]' : '') + ' :: ' + cells);
}
