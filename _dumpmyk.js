var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var l = fs.readFileSync(P, 'utf8').split('\n');

// Print the RAW Mykonos brand-sep and Reflection line, cell by cell with class+content
function dump(i) {
  console.log('\n=== RAW LINE ' + (i + 1) + ' ===');
  console.log(l[i].substring(0, 1400));
  var tds = l[i].match(/<td[^>]*?>(.*?)<\/td>/g) || [];
  console.log('\n  -- ' + tds.length + ' tds:');
  for (var j = 0; j < tds.length; j++) {
    var c = (tds[j].match(/class="([^"]+)"/) || ['', '?'])[1];
    var t = tds[j].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 40);
    console.log('   ' + j + ': [' + c + '] "' + t + '"');
  }
}

// Find Mykonos brand-sep
var msi = -1;
for (var i = 0; i < l.length; i++) {
  if (l[i].indexOf('>Mykonos</') >= 0 || (l[i].indexOf('Mykonos') >= 0 && l[i].indexOf('brand-sep') >= 0 && l[i].indexOf('Glitch') >= 0)) {
    msi = i;
    break;
  }
}
if (msi >= 0) {
  dump(msi);
  dump(msi + 1ained);
} else {
  console.log('Mykonos brand-sep NOT FOUND');
}
