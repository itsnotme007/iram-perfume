const { spawn } = require('child_process');
const http = require('http');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9224;
const APP = 'http://127.0.0.1:3000/';
function getJson(p) {
  return new Promise((res, rej) => {
    http.get('http://127.0.0.1:' + PORT + p, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej);
  });
}
(async () => {
  const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + process.env.TEMP + '\\edge-test-price4', '--no-first-run', '--disable-gpu', APP]);
  await new Promise(r => setTimeout(r, 6000));
  let tabs;
  for (let i = 0; i < 20; i++) { try { tabs = await getJson('/json'); if (tabs.length) break; } catch (e) {} await new Promise(r => setTimeout(r, 500)); }
  const page = tabs.find(t => t.type === 'page');
  console.log('TAB:', page && page.url);
  const ws = new (require('ws'))(page.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  let idc = 0;
  const send = (method, params) => new Promise(resolve => {
    const id = ++idc;
    const h = m => { let msg; try { msg = JSON.parse(String(m.data)); } catch (e) { return; } if (msg.id === id) { ws.off('message', h); resolve(msg.result); } };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
  // get console exceptions
  const ex = await send('Runtime.evaluate', { expression: 'JSON.stringify(window.__errs||[])', returnByValue: true });
  // evaluate a simple check
  const r = await send('Runtime.evaluate', { expression: 'typeof PRICE_LIST', returnByValue: true });
  console.log('typeof PRICE_LIST:', JSON.stringify(r && r.result));
  const r2 = await send('Runtime.evaluate', { expression: 'typeof window.parseOrderText', returnByValue: true });
  console.log('typeof parseOrderText:', JSON.stringify(r2 && r2.result));
  ws.close(); edge.kill();
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });