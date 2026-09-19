const { spawn } = require('child_process');
const http = require('http');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9227;
const APP = 'http://127.0.0.1:3000/';
function getJson(p) { return new Promise((res, rej) => { http.get('http://127.0.0.1:' + PORT + p, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { res([]); } }); }).on('error', rej); }); }

(async () => {
  const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + process.env.TEMP + '\\edge-fullapp', '--no-first-run', '--disable-gpu', APP]);
  await new Promise(r => setTimeout(r, 8000));
  let tabs = [];
  for (let i = 0; i < 20; i++) { try { tabs = await getJson('/json'); if (tabs.length) break; } catch (e) {} await new Promise(r => setTimeout(r, 500)); }
  const page = tabs.find(t => t.type === 'page');
  console.log('TAB:', page && page.url);
  if (!page) { edge.kill(); process.exit(1); }
  const ws = new (require('ws'))(page.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  let idc = 0;
  const pending = {};
  ws.on('message', m => { let msg; try { msg = JSON.parse(String(m.data)); } catch (e) { return; } if (msg.id && pending[msg.id]) { pending[msg.id](msg.result); delete pending[msg.id]; } });
  const send = (method, params) => new Promise(resolve => { const id = ++idc; pending[id] = resolve; ws.send(JSON.stringify({ id, method, params })); setTimeout(() => { if (pending[id]) { delete pending[id]; resolve({ timeout: true }); } }, 20000); });
  await send('Runtime.enable');
  await send('Page.enable');
  await new Promise(r => setTimeout(r, 3000));

  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r && r.result) return r.result.value;
    return JSON.stringify(r);
  };

  // Wait for app to init
  console.log('appReady:', await ev('typeof addLineItem === "function"'));
  console.log('PRICE_LIST len:', await ev('PRICE_LIST ? PRICE_LIST.length : -1'));

  // Find Hawas Ice index and simulate adding a line item
  const setup = await ev(`JSON.stringify((function(){
    const idx = PRICE_LIST.findIndex(p => p.name === 'Hawas Ice');
    // clear line items, add one, select frag + size 7.5
    document.getElementById('line-items').innerHTML = '';
    addLineItem();
    const row = document.querySelector('.line-item');
    const fragSel = row.querySelector('.li-frag');
    fragSel.value = String(idx);
    onFragChange(fragSel);
    const sizeSel = row.querySelector('.li-size');
    // set size via the size select if exists
    if (sizeSel) { sizeSel.value = '7.5'; }
    onLineChange(row.querySelector('.li-frag'));
    const sell = row.querySelector('.li-sell').value;
    const sizeV = getActiveML(row);
    return { idx, sell, size: sizeV, fragName: fragName(idx), sell30: PRICE_LIST[idx].sell30 };
  })())`);
  console.log('manual add Hawas Ice:', setup);

  // Now test pasteOrder with the actual textarea + real flow
  const paste = await ev(`JSON.stringify((function(){
    const ta = document.getElementById('paste-order-text');
    ta.value = "2 \u00D7 Rasasi \u2014 Hawas Ice (7.5ml) \u2014 \u20B9550";
    pasteOrder();
    const rows = Array.from(document.querySelectorAll('.line-item'));
    return rows.map(r => ({frag: r.querySelector('.li-frag').value, sell: r.querySelector('.li-sell').value, size: getActiveML(r)}));
  })())`);
  console.log('pasteOrder Hawas Ice:', paste);

  ws.close(); edge.kill(); process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });