const { spawn } = require('child_process');
const http = require('http');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9228;
const APP = 'http://127.0.0.1:3000/';
function getJson(p) { return new Promise((res, rej) => { http.get('http://127.0.0.1:' + PORT + p, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { res([]); } }); }).on('error', rej); }); }

(async () => {
  const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + process.env.TEMP + '\\edge-rt', '--no-first-run', '--disable-gpu', '--disable-features=msEdgeModernStandby', APP]);
  await new Promise(r => setTimeout(r, 5000));
  let tabs = [];
  for (let i = 0; i < 20; i++) { try { tabs = await getJson('/json'); if (tabs.length) break; } catch (e) {} await new Promise(r => setTimeout(r, 500)); }
  const page = tabs.find(t => t.type === 'page');
  console.log('TAB:', page && page.url);
  if (!page) { edge.kill(); process.exit(1); }
  const ws = new (require('ws'))(page.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  let idc = 0;
  const pending = {};
  const events = [];
  ws.on('message', m => {
    let msg; try { msg = JSON.parse(String(m.data)); } catch (e) { return; }
    if (msg.method && (msg.method.startsWith('Runtime.') || msg.method.startsWith('Log.'))) events.push(msg.method + ': ' + JSON.stringify(msg.params || {}).slice(0, 300));
    if (msg.id && pending[msg.id]) { pending[msg.id](msg.result); delete pending[msg.id]; }
  });
  const send = (method, params) => new Promise(resolve => { const id = ++idc; pending[id] = resolve; ws.send(JSON.stringify({ id, method, params })); setTimeout(() => { if (pending[id]) { delete pending[id]; resolve({ timeout: true }); } }, 30000); });

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  // wait for load
  await send('Page.navigate', { url: APP });
  await new Promise(r => setTimeout(r, 6000));

  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r && r.result) return r.result.value;
    return JSON.stringify(r);
  };
  console.log('typeof addLineItem:', await ev('typeof addLineItem'));
  console.log('PRICE_LIST len:', await ev('typeof PRICE_LIST !== "undefined" ? PRICE_LIST.length : "undef"'));
  console.log('page errors:', events.filter(e => e.startsWith('Runtime.exceptionThrown') || e.startsWith('Log.entryAdded')).slice(0, 10));
  ws.close(); edge.kill(); process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });