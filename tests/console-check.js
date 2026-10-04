// Console/error smoke check: loads homepage + interactions + a fragrance page,
// fails on pageerror, console.error, or cart/registry warnings.
const { chromium } = require('@playwright/test');
const { start } = require('./serve');

const PORT = 4174;
const BASE = 'http://127.0.0.1:' + PORT;

(async () => {
  const server = await start(PORT);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const problems = [];
  const log = [];
  const watch = (msg) => {
    const t = msg.type();
    const text = msg.text();
    log.push('[' + t + '] ' + text);
    if (t === 'error') problems.push('console.error: ' + text);
    if (t === 'warning' && /cart|registry/i.test(text)) problems.push('console.warning: ' + text);
    if (/no registry entry|Cart data init failed|validation failed|registry\b.*missing/i.test(text)) {
      problems.push('cart warning: ' + text);
    }
  };
  page.on('console', watch);
  page.on('pageerror', (e) => problems.push('pageerror: ' + (e && e.message || e)));
  page.on('requestfailed', (r) => {
    if (r.url().startsWith(BASE)) problems.push('requestfailed: ' + r.url());
  });

  // homepage
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(800);

  const tap = async (locator) => {
    const l = typeof locator === 'string' ? page.locator(locator).first() : locator;
    if (await l.count() && await l.isVisible()) { await l.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(250); }
  };
  // interactions: filter, sort, search, cart, wishlist, compare
  const steps = [
    async () => { const b = page.locator('#filterBar .filter-btn').first(); await tap(b); },
    async () => { const s = page.locator('#filterSort'); if (await s.count() && await s.isVisible()) { await s.selectOption({ index: 1 }).catch(() => {}); await page.waitForTimeout(250); } },
    async () => { const i = page.locator('#navSearch input, #searchInput, input[type=search]').first(); if (await i.count() && await i.isVisible()) { await i.fill('oud'); await page.waitForTimeout(400); await i.fill(''); await page.waitForTimeout(250); } },
    async () => { await tap('.pc-add, .add-to-cart, [data-add-cart]'); },
    async () => { await tap('.pc-wish'); },
    async () => { await tap('.pc-cmp'); },
    async () => { await tap('.frag-cell'); await tap('#pcQtyPlus'); await tap('#pcAddBtn'); await tap('[data-close-sheet]'); }
  ];
  for (const step of steps) { try { await step(); } catch (e) { problems.push('step failed: ' + e.message); } }

  // open cart drawer if possible
  await tap('#navCart, #cartBtn, [data-open-cart], .mobile-cart-head');

  // fragrance page
  await page.goto(BASE + '/fragrance/afnan-lynked-freedom.html', { waitUntil: 'load' });
  await page.waitForTimeout(400);

  await browser.close();
  server.close();

  console.log('--- console log (' + log.length + ' messages) ---');
  console.log(log.join('\n') || '(empty)');
  console.log('--- result ---');
  if (problems.length) {
    console.log('PROBLEMS (' + problems.length + '):');
    problems.forEach(p => console.log('  ' + p));
    process.exit(1);
  }
  console.log('CLEAN: no pageerrors, no console.errors, no cart/registry warnings');
})();
