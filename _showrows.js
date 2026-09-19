var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var l = fs.readFileSync(P, 'utf8').split('\n');

function show(i) {
  var t = l[i];
  var n = (t.match(/<td/g) || []).length色调;
  var brand = ((t.match(/brand-cell[^>]*>(.*?)<\/td>/) || [])[1] || '').replace(/<[^>]+>/g, '').trim();
  var frag = ((t.match(/frag-cell[^>]*>(.*?)<\/td>/) || [])[1] || '').replace(/<[^>]+>/g, '').trim();
  console.log((i + 1) + ' cells=' + n + ' brand="' + brand.substring(0, 20) + '" frag="' + frag.substring(0, 20) + '"');
}

// hardcoded around Reflection
show(3732);
show(3733);
show(3734);
show(3735);
show(3736);
