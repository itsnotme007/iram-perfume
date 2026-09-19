const { spawn } = require('child_process');
const http = require('http');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9226;
const APP = 'http://127.0.0.1:3000/';
function getJson(p) { return new Promise((res, rej) => { http.get('http://127.0.0.1:' + PORT + p, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { res([]); } }); }).on('error', rej); }); }

(async () => {
  const exe = fs => { try { require('fs').accessSync(fs); return true; } catch (e) { return false; } };
  const browser = exe(EDGE) ? EDGE : CHROME;
  const edge = spawn(browser, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + process.env.TEMP + '\\edge-test-price5', '--no-first-run', '--disable-gpu', '--disable-features=msEdgeModernStandby', APP]);
  await new Promise(r => setTimeout(r, 8000));
  let tabs = [];
  for (let i = 0; i < 20; i++) { try { tabs = await getJson('/json'); if (tabs.length) break; } catch (e) {} await new Promise(r => setTimeout(r, 500)); }
  const page = tabs.find(t => t.type === 'page');
  console.log('TAB:', page && page.url);
  if (!page) { console.log('no page'); edge.kill(); process.exit(1); }
  const ws = new (require('ws'))(page.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  let idc = 0;
  const pending = {};
  ws.on('message', m => { let msg; try { msg = JSON.parse(String(m.data)); } catch (e) { return; } if (msg.id && pending[msg.id]) { pending[msg.id](msg.result); delete pending[msg.id]; } });
  const send = (method, params) => new Promise(resolve => { const id = ++idc; pending[id] = resolve; ws.send(JSON.stringify({ id, method, params })); setTimeout(() => { if (pending[id]) { delete pending[id]; resolve({ timeout: true }); } }, 15000); });

  await send('Runtime.enable');
  await send('Page.enable');
  await new Promise(r => setTimeout(r, 2000));

  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r && r.result) return r.result.value;
    return JSON.stringify(r);
  };

  console.log('typeof PRICE_LIST:', await ev('typeof PRICE_LIST'));
  console.log('typeof parseOrderText:', await ev('typeof window.parseOrderText'));
  console.log('PL length:', await ev('PRICE_LIST ? PRICE_LIST.length : -1'));

  const ice = await ev(`JSON.stringify((function(){const i=PRICE_LIST.findIndex(p=>p.name==="Hawas Ice");const p=PRICE_LIST[i];const cs=(b,s)=>{if(s===30)return b;if(s===7.5)s=8;const f={3:9,5:6,8:4,20:1.5}[s]||0;let v=Math.ceil(s*(b/30+f)/5)*5;if(v%10===0)v-=1;return Math.max(v,5);};return {idx:i,sell30:p.sell30,seven5:cs(p.sell30,7.5)};})())`);
  console.log('Hawas Ice in browser:', ice);

  const fire = await ev(`JSON.stringify((function(){const i=PRICE_LIST.findIndex(p=>p.name==="Hawas Fire");const p=PRICE_LIST[i];const cs=(b,s)=>{if(s===30)return b;if(s===7.5)s=8;const f={3:9,5:6,8:4,20:1.5}[s]||0;let v=Math.ceil(s*(b/30+f)/5)*5;if(v%10===0)v-=1;return Math.max(v,5);};return {idx:i,sell30:p.sell30,seven5:cs(p.sell30,7.5)};})())`);
  console.log('Hawas Fire in browser:', fire);

  const parse = await ev(`JSON.stringify((function(){const t="1 \u00D7 Rasasi \u2014 Hawas Ice (7.5ml) \u2014 \u20B9275";const o=window.parseOrderText(t);return {sell:o.items[0].sell,fragIdx:o.items[0].fragIdx};})())`);
  console.log('parse Hawas Ice in browser:', parse);

  ws.close(); edge.kill(); process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });