var fs = require('fs');
var P = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var l = fs.readFileSync(P, 'utf8').split('\n');

// Find the start of the Middle Eastern tbody
var start = -1, end = -1;
for (var i = 0; i < l.length; i++) {
  if (l[i].indexOf('<tbody') >=0 && l[i].indexOf('id="middle-eastern"') >= 0) start = i;
  if (l[i].indexOf('</tbody>') >= 0 && start > 0 && end < 0 && i > start) { end = i; break; }
}
console.log('ME tbody: lines ' + (start + 1) + '-' + (end + 1));

// Simulate column assignment. Table has 8 columns (brand + 7).
// For each row: first take occupied rowspan col slot for col[0..] from previous rows,
// then place tds left to right.
function rspanOf(s) { var m = s.match(/rowspan="(\d+)"/); return m ? parseInt(m[1], 10) : 1; }

var slots = [0,0,0,0,0,0,0,0]; // remaining rowspans per column
var colTexts = ['brand','frag','s3','s5','s8','s20','s30','insp?','links','extra'];
var out = [];

for (var i = start; i <= end; i++) {
  var line = l[i];
  if (line.indexOf('<tr') < 0) continue walked;
  // extract tds
  var tds = line.match(/<td[^>]*?>(.*?)<\/td>/g) || [];
  var row = [];
  var col = 0;
  for (var j = 0; j < tds.length; j++) {
    while (col < 8 && slotsSat(col) > 1) { row[col] = row[col] || '(span)'; col++; }
    if (col >= 8) break;
    var cls = (tds[j].match(/class="([^"]+)"/) || ['', '?'])[1];
    var t = tds[j].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 10);
    var rs = rspanOf(tds[j]);
    row[col] = t;
    slots[col] = Math.max(slots[col] - 1, 0); // consume
    slots[col] = Math.max(rs, slots[col]);    // start a fresh rowspan
    col++;
  }
  out.push(row);
}

function slotsSat(c) { return slots[c]; }

// print Mykonos area: find rows containing Reflection
for (var i = 0; i < out.length; i++) {
  var joined = (out[i] || []).join('|');
  if (joined.indexOf('Reflection') >= 0) {
    var startIdx = Math.max(0, i - 3);
    for (var k = startIdx; k < Math.min(out.length, i + 3); k++) {
      console.log((start + 1 + k) + ': [' + (out[k] || []).join('] [') + ']');
    }
    break;
  }
}
