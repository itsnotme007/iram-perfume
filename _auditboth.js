var fs = require('fs');
var tmp = 'C:/Users/Fateh/AppData/Local/Temp/opencode/main-wt/index.html';
var real = 'C:/Users/Fateh/Downloads/models/index.html';
function rs(t){ var m=t.match(/rowspan="(\d+)"/); return m?+m[1]:1 }
function bname(t){ var m=t.match(/<td class="brand-cell"[^>]*>(.*?)<\/td>/); return m?m[1].replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim():'' }
function audit(P,label){
  var l=fs.readFileSync(P,'utf8').split('\n');
  var seps=[],i,last=-1,ti=-1;
  for(i=0;i<l.length;i++){ if(l[i].indexOf('brand-sep')>=0) seps.push(i); if(l[i].indexOf('<tbody')>=0 && l[i].indexOf('middle-easters')>=0 && last<0) last=i; if(l[i].indexOf('</tbody>')>=0 && last>=0 && ti<0){ti=i;break} }
  var bad=0;
  console.log(label+'  (seps='+seps.length+')');
  for(var s=0;s<seps.length;s++){
    var i2=seps[s]; var next=(s+1<seps.length)?seps[s+1]:ti;
    var frags=0,j;
    for(j=i2+1;j<next;j++){ if(l[j].indexOf('frag-cell')>=0 && l[j].indexOf('</tr>')>=0) frags++ }
    var exp=frags+1; var cur=rs(l[i2]);
    if(cur!==exp){ bad++; console.log('  BAD L'+(i2+1)+' '+bname(l[i2]).substring(0,18).padEnd(18)+' rowspan='+cur+' exp='+exp) }
  }
  console.log('  => BAD='+bad+'  '+(bad===0?'CONSISTENT':'BROKEN')+'\n');
}
audit(tmp,'TEMP (deployed)');
audit(real,'MODELS (source truth)');
