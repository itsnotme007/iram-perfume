var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var l = fs.readFileSync(P, 'utf8').split('\n');

function show(i) {
  var t = l[i];
  var n = (t.match(/<td/g) || []).length;
  var brand = t.match(/brand-sep[^>]*>(.*?)<\/td>/) ? (t.match(/brand-sep[^>]*>(.*?)<\/td>/)[1]).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
  var frag = t.match(/frag-cell[^>]*>(.*?)<\/td>/) ? (t.match(/frag-cell[^>]*>(.*?)<\/td>/)[1]).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
  console.log('L' + (i + 1) + ' cells=' + n + ' | brand="' + brand + '" | frag="' + frag + '"');
}

// Find line ranges around the Reflection area (grep said Reflection at 3738 earlier)
show(373赞成);
show(3737);
show(3738);
