const { spawn } = require('child_process');
const http = require('http');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9223;
const APP = 'http://127.0.0.1:3000/';
function getJson(p) {
  return new Promise((res, rej) => {
    http.get('http://127.0.0.1:' + PORT + p, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej);
  });
}
(async () => {
  const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + process.env.TEMP + '\\edge-test-price3', '--no-first-run', '--disable-gpu', APP]);
  await new Promise(r => setTimeout(r, 4000));
  let tabs;
  for (let i = 0; i < 20; i++) { try { tabs = await getJson('/json'); if (tabs.length) break; } catch (e) {} await new Promise(r => setTimeout(r, 500)); }
  const page = tabs.find(t => t.type === 'page');
  console.log('TAB:', page && page.url);
  const ws = new (require('ws'))(page.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  let idc = 0;
  const send = (method, params) => new Promise(resolve => {
    const id = ++idc;
    const h = m => {
      let msg;
      try { msg = JSON.parse(String(m.data)); } catch (e) { return; }
      if (msg.id === id) { ws.off('message', h); resolve(msg.result); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const expr = 'JSON.stringify((function(){const i=PRICE_LIST.findIndex(p=>p.name==="Hawas Ice");const p=PRICE_LIST[i];const cs=(b,s)=>{if(s===30)return b;if(s===7.5)s=8;const f={3:9,5:6,8:4,20:1.5}[s]||0;let v=Math.ceil(s*(b/30+f)/5)*5;if(v%10===0)v-=1;return Math.max(v,5);};return {idx:i,sell30:p.sell30,seven5:cs(p.sell30,7.5)};})())';
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  console.log('browser PRICE_LIST Hawas Ice:', JSON.stringify(r));
  const expr2 = 'JSON.stringify((function(){const t="1 \u00D7 Rasasi \u2014 Hawas Ice (7.5ml) \u2014 \u20B9275";const o=window.parseOrderText(t);return {sell:o.items[0].sell,fragIdx:o.items[0].fragIdx};})())';
  const r2 = await send('Runtime.evaluate', { expression: expr2, returnByValue: true });
  console.log('browser parse:', JSON.stringify(r2));
  ws.close(); edge.kill(); process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
