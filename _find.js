var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var l = fs.readFileSync(P, 'utf8').split('\n');

function brief(i) {
  var t = l[i];
  var brand = (t.match(/brand-cell[^>]*>(.*?)<\/td>/) || [])[1] || '';
  brand = brand.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  var frag = (t.match(/frag-cell[^>]*>(.*?)<\/td>/) || [])[1] || '';
  frag = frag.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  var n = (t.match(/<td/g) || []).length;
  console.log('L' + (i + 1) + ' [' + n + ' tds] brand="' + brand.substring(0, 14) + '"  frag="' + frag.substring(0, 14) + '"');
}

for (var i = 0; i < l.length; i++) {
  if (l[i].indexOf('Reflection') >= 0 && l[i].indexOf('frag-cell') >= 0) {
    console.log('--- FOUND Reflection row at line ' + (i + 1) + ' ---');
    brief(i - 1);
    brief(i);
    brief(i + 1);
    break;
  }
}

// Also find "Mykonos" brand-sep
for (var i = 0; i < l.length; i++) {
  if (l[i].indexOf('brand-sep') >= 0 && l[i].indexOf('Mykonos') >= 0) {
    console.log('--- FOUND Mykonos brand-sep at line ' + (i + 1) + ' ---');
    brief(i);
    brief(i + 1);
    break;
  }
}
