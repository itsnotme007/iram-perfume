var fs=require('fs');
var P='C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var l=fs.readFileSync(P,'utf8').split('\n');

function brief(i){
  var tds=l[i].match(/<td[^>]*?>(.*?)<\/td>/g)||[];
  var out='ROW '+(i+1)+' ['+tds.length+' tds] ';
  for(var j=0;j<tds.length;j++){
    var m=tds[j].match(/class="([^"]+)"/); var cls=m?m[1].split('-')[0]:'?';
    var txt=tds[j].replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().substring(0,12);
    out+=cls+'="'+txt+'" ';
  }
  console.log(out);
}

// Print the Mykonos brand-sep row (Glitch) and the Reflection row, plus neighbors
for(var i=3735;i<=3739;i++){ brief(i); }

// Also find the Swiss Arabian / Zimaya immediate boundary
console.log('\n--- boundary ---');
for(var i=3733;i<=3736;i++){ brief(i); }
