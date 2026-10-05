// IRAM Perfume storefront test suite (baseline for the storefront-overhaul branch).
// Tests assert DESIRED behaviour: a few fail on the pre-fix baseline by design
// (they document bugs 1.1, 1.2, 1.5, 1.7, 1.8, 1.9, 1.3, 1.4).
const { test, expect } = require('@playwright/test');

const TOTAL = 155;

function watchErrors(page) {
  const errs = [];
  page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
  return errs;
}

async function cartCount(page) {
  return (await page.locator('#cartFloatCount').textContent()).trim();
}

// ---------------------------------------------------------------- catalogue
test('catalogue renders 155 cards + rows with accurate counts', async ({ page }, testInfo) => {
  const errs = watchErrors(page);
  await page.goto('/');
  await expect(page).toHaveTitle(/IRAM Perfume/);
  await expect(page.locator('.frag-cell')).toHaveCount(TOTAL);
  await expect(page.locator('.frag-card')).toHaveCount(TOTAL);
  await expect(page.locator('#filterCount')).toHaveText(/155 fragrances/);
  await expect(page.locator('#filterCountMobile')).toHaveText(/155 fragrances/);
  await expect(page.locator('#filterApply')).toHaveText(/Show all fragrances/);
  // raw (pre-JS) markup must never claim the old count
  const raw = await (await page.request.get('/')).text();
  expect(raw).not.toMatch(/147 fragrances/);
  expect(raw).toMatch(/Show 155 fragrances/);
  expect(errs).toEqual([]);
});

test('head + body encoding and homepage FAQ JSON-LD are clean', async ({ page }) => {
  await page.goto('/');
  const bad = await page.evaluate(() => {
    const hits = [];
    if (document.title.includes('\uFFFD')) hits.push('title');
    document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]')
      .forEach((m) => { if ((m.content || '').includes('\uFFFD') || /\?999/.test(m.content || '')) hits.push(m.getAttribute('property') || m.name); });
    if ((document.body.innerText || '').includes('\uFFFD')) hits.push('body');
    const blocks = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    let parsed = 0;
    for (const s of blocks) {
      const j = JSON.parse(s.textContent); // throws -> test fails
      parsed++;
      if (j['@type'] === 'FAQPage') {
        const text = JSON.stringify(j);
        if (text.includes('\uFFFD') || /\?999/.test(text)) hits.push('faq-jsonld');
      }
    }
    if (blocks.length < 2 || parsed < 2) hits.push('too-few-blocks');
    return hits;
  });
  expect(bad).toEqual([]);
});

// ---------------------------------------------------------------- filtering
test('gender filter narrows results (desktop UI / mobile URL)', async ({ page }, testInfo) => {
  const mob = testInfo.project.name === 'mobile';
  if (mob) {
    await page.goto('/?gender=Men');
    const state = await page.evaluate(() => {
      const visible = Array.from(document.querySelectorAll('.frag-card')).filter((c) => c.style.display !== 'none');
      return {
        total: document.querySelectorAll('.frag-card').length,
        visible: visible.length,
        allMen: visible.every((c) => c.getAttribute('data-gender') === 'Men')
      };
    });
    expect(state.total).toBe(TOTAL);
    expect(state.visible).toBeGreaterThan(0);
    expect(state.visible).toBeLessThan(TOTAL);
    expect(state.allMen).toBe(true);
  } else {
    await page.goto('/');
    await page.click('#filterTrigger');
    await page.click('.filter-btn[data-gender="Men"]');
    await page.click('#filterApply');
    const rows = page.locator('#filterResults tbody tr');
    await expect(rows.first()).toBeVisible();
    await expect(page.locator('#filterCount')).toHaveText(/\d+ fragrances? found/);
    await expect(page.locator('#filterApply')).toHaveText(/^Show \d+ fragrances?$/);
    const n = await rows.count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(TOTAL);
    const expected = await page.locator('.frag-card[data-gender="Men"]').count();
    expect(n).toBe(expected);
    const allMen = await rows.evaluateAll((trs) => trs.every((r) => !!r.querySelector('.tag-men')));
    expect(allMen).toBe(true);
  }
});

test('taxonomy filter options return matches (gym + new moods)', async ({ page }) => {
  const cases = [
    ['occasion', 'gym'],
    ['mood', 'confident'],
    ['mood', 'energetic'],
    ['mood', 'mysterious'],
    ['mood', 'romantic'],
    ['mood', 'rich']
  ];
  for (const [k, v] of cases) {
    await page.goto('/?' + k + '=' + v);
    await page.waitForLoadState('load');
    await page.waitForTimeout(250);
    const r = await page.evaluate(([k, v]) => {
      const cards = Array.from(document.querySelectorAll('.frag-card'));
      const shown = cards.filter((c) => c.style.display !== 'none');
      return {
        total: cards.length,
        shown: shown.length,
        rows: document.querySelectorAll('#filterResults tbody tr').length,
        allMatch: shown.every((c) => (c.getAttribute('data-' + k) || '').split(',').includes(v))
      };
    }, [k, v]);
    expect(r.total).toBe(TOTAL);
    expect(r.shown).toBeGreaterThan(0);
    expect(r.rows).toBeGreaterThan(0);
    expect(r.allMatch).toBe(true);
  }
});

test('add to cart works from filtered desktop results', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop table filter flow');
  await page.goto('/');
  await page.click('#filterTrigger');
  await page.click('.filter-btn[data-gender="Men"]');
  await page.click('#filterApply');
  await page.locator('#filterResults .cart-btn:not([disabled])').first().click();
  await expect(page.locator('#sizeSelector')).toHaveClass(/open/);
  await page.locator('#sizeSelector input[name="ssSize"]').first().check();
  await expect(page.locator('#cartFloatCount')).toHaveText('1');
});

// ---------------------------------------------------------------- sorting
test('price sort is global across brand blocks (desktop)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'table sort is desktop-only');
  await page.goto('/');
  await page.selectOption('#filterSort', 'low');
  // each catalogue table (Designer / Middle Eastern) must be sorted globally
  // across its brand blocks — brand-separator rows move with their products
  const runs = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.table-wrap>.frag-table').forEach((tbl) => {
      const costs = [];
      tbl.querySelectorAll('tbody tr').forEach((tr) => {
        if (tr.querySelector('.frag-cell') && typeof tr._pcCost === 'number') costs.push(tr._pcCost);
      });
      if (costs.length) out.push(costs);
    });
    return out;
  });
  expect(runs.length).toBe(2);
  let total = 0;
  for (const costs of runs) {
    expect(costs.length).toBeGreaterThan(0);
    total += costs.length;
    let sorted = true;
    for (let i = 1; i < costs.length; i++) {
      if (costs[i] < costs[i - 1]) { sorted = false; break; }
    }
    expect(sorted).toBe(true);
  }
  expect(total).toBeGreaterThan(100); // every priced product row took part
});

// ---------------------------------------------------------------- desktop cart
test('table add-to-cart, drawer, clear (desktop)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'drawer flow uses the desktop FAB');
  const errs = watchErrors(page);
  await page.goto('/');
  await page.locator('.table-wrap .cart-btn:not([disabled])').first().click();
  await expect(page.locator('#sizeSelector')).toHaveClass(/open/);
  await page.locator('#sizeSelector input[name="ssSize"]').first().check();
  await expect(page.locator('#cartFloatCount')).toHaveText('1');
  await page.click('#cartFloat');
  await expect(page.locator('#cartDrawer')).toBeVisible();
  await expect(page.locator('#cartDrawerBody .cart-item')).toHaveCount(1);
  await page.click('#cartClearBtn');
  await expect(page.locator('#cartFloatCount')).toHaveText('0');
  expect(errs).toEqual([]);
});

test('shipping cost follows subtotal + qty constants', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'shipping totals asserted on desktop');
  const cases = [
    { name: 'qty 1 over 999 is NOT free', items: [{ brand: 'Mancera', frag: 'Cedrat Boise', size: '30ml', price: 1899, qty: 1, key: 'Mancera|Cedrat Boise|30ml' }], free: false },
    { name: 'qty 2 under 999 is NOT free', items: [{ brand: 'Davidoff', frag: 'Cool Water EDT', size: '3ml', price: 89, qty: 1, key: 'Davidoff|Cool Water EDT|3ml' }, { brand: 'Jaguar', frag: 'Classic Black', size: '3ml', price: 89, qty: 1, key: 'Jaguar|Classic Black|3ml' }], free: false },
    { name: 'qty 2 over 999 IS free', items: [{ brand: 'Mancera', frag: 'Cedrat Boise', size: '30ml', price: 1899, qty: 1, key: 'Mancera|Cedrat Boise|30ml' }, { brand: 'Davidoff', frag: 'Cool Water EDT', size: '3ml', price: 89, qty: 1, key: 'Davidoff|Cool Water EDT|3ml' }], free: true }
  ];
  for (const c of cases) {
    await test.step(c.name, async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.addInitScript((items) => {
        try { localStorage.setItem('iram_cart', JSON.stringify(items)); } catch (e) {}
      }, c.items);
      await page.goto('/');
      await expect(page.locator('#cartDrawerBody .cart-item')).toHaveCount(c.items.length);
      const ship = (await page.locator('#cartShipping').textContent()).trim();
      const progress = (await page.locator('#shipProgress').textContent()) || '';
      if (c.free) {
        expect(ship).toBe('FREE');
        expect(progress).toContain('Congratulations');
      } else {
        expect(ship).not.toContain('FREE');
        expect(ship).toMatch(/100/);
        expect(progress).not.toContain('Congratulations');
      }
      await ctx.close();
    });
  }
});

test('stale cart price is re-priced from current data', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'drawer body asserted on desktop');
  await page.addInitScript((items) => {
    try { localStorage.setItem('iram_cart', JSON.stringify(items)); } catch (e) {}
  }, [{ brand: 'Afnan', frag: 'Turathi Brown', size: '30ml', price: 111, qty: 1, key: 'Afnan|Turathi Brown|30ml' }]);
  await page.goto('/');
  await expect(page.locator('#cartDrawerBody .cart-item')).toHaveCount(1);
  const text = (await page.locator('#cartDrawerBody').textContent()) || '';
  expect(text).toContain('869');   // current 30ml price
  expect(text).not.toContain('111');
});

test('cart survives corrupted localStorage', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('iram_cart', '{oops'); } catch (e) {} });
  await page.goto('/');
  const result = await page.evaluate(() => {
    if (typeof window.__iramAddToCart !== 'function') return 'missing';
    try { window.__iramAddToCart('Lattafa', 'Corrupt Test', '3ml', 115, 1); } catch (e) { return 'threw:' + e.message; }
    let c;
    try { c = JSON.parse(localStorage.getItem('iram_cart') || '[]'); } catch (e) { return 'still-corrupt'; }
    return Array.isArray(c) && c.length === 1 ? 'ok' : 'bad-length';
  });
  expect(result).toBe('ok');
});

test('cart works with cleared storage', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    if (typeof window.__iramAddToCart !== 'function') return 'missing';
    window.__iramAddToCart('Lattafa', 'Fresh Test', '3ml', 115, 1);
    const c = JSON.parse(localStorage.getItem('iram_cart') || '[]');
    return Array.isArray(c) && c.length === 1 ? 'ok' : 'bad';
  });
  expect(result).toBe('ok');
});

// ---------------------------------------------------------------- dark mode
test('dark-mode unavailable price contrast is >= 3:1', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'table price contrast checked on desktop');
  await page.goto('/');
  await page.click('#themeToggle');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.waitForTimeout(700); // let the 0.3s background transition settle
  const ratio = await page.evaluate(() => {
    const el = document.querySelector('.table-wrap .u-price') || document.querySelector('.table-wrap .size-cell s');
    if (!el || !el.offsetParent) return { missing: true };
    const parse = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => {
      const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    };
    const fg = parse(getComputedStyle(el).color);
    let node = el, bg = null;
    while (node && !bg) {
      const c = getComputedStyle(node).backgroundColor;
      const p = parse(c);
      if (c !== 'rgba(0, 0, 0, 0)' && p.length === 3) bg = p;
      node = node.parentElement;
    }
    if (!bg) bg = parse(getComputedStyle(document.documentElement).backgroundColor);
    if (!bg || bg.length !== 3) bg = [22, 27, 34];
    const l1 = lum(fg), l2 = lum(bg);
    return { ratio: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) };
  });
  expect(ratio.missing).toBeFalsy();
  expect(ratio.ratio).toBeGreaterThanOrEqual(3);
});

// ---------------------------------------------------------------- search
test('search returns matching results', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop header search');
  await page.goto('/');
  await page.fill('#searchInput', 'hawas');
  await expect(page.locator('#searchResults')).toHaveClass(/open/);
  const items = page.locator('#searchResults .search-result-item');
  expect(await items.count()).toBeGreaterThan(0);
  const first = (await items.first().textContent()) || '';
  expect(first.toLowerCase()).toContain('hawas');
});

// ---------------------------------------------------------------- mobile UX
test('bestsellers rail and 3ml price list render', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#bestsellers .best-card')).toHaveCount(12);
  await expect(page.locator('#bestsellers .best-card[data-pid]')).toHaveCount(12);
  await expect(page.locator('#threeMlList .three-ml-row')).toHaveCount(155);
  await expect(page.locator('#threeMlList')).not.toHaveClass(/three-ml-open/);
  await page.click('#threeMlMore');
  await expect(page.locator('#threeMlList')).toHaveClass(/three-ml-open/);
  await expect(page.locator('#threeMlMore')).toHaveAttribute('aria-expanded', 'true');
});

test('mobile: bottom nav, product sheet, qty stepper, add to cart', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only flows');
  const errs = watchErrors(page);
  await page.goto('/');
  for (const id of ['#navHome', '#navBrands', '#navCompare', '#navWishlist']) {
    await expect(page.locator(id)).toBeVisible();
  }
  await page.locator('.frag-card:not(.pc-sold) .pc-name').first().click();
  await expect(page.locator('#pcProductSheet')).toBeVisible();
  await expect(page.locator('#pcProductSheet .pc-trust')).toBeVisible();
  await expect(page.locator('#pcProductSheet .pc-refs')).toBeVisible();
  await page.click('#pcQtyPlus');
  await expect(page.locator('#pcQtyVal')).toHaveText('2');
  await page.click('#pcAddBtn');
  await expect(page.locator('#cartFloatCount')).toHaveText('2');
  await expect(page.locator('#mobileCartBar')).toBeVisible();
  expect(errs).toEqual([]);
});

test('mobile: compare and wishlist sheets work', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only flows');
  await page.goto('/');
  await page.locator('.pc-cmp').nth(0).click();
  await page.locator('.pc-cmp').nth(1).click();
  let ls = await page.evaluate(() => JSON.parse(localStorage.getItem('iram_compare') || '[]'));
  expect(ls.length).toBe(2);
  await page.click('#navCompare');
  await expect(page.locator('#pcCmpSheet')).toBeVisible();
  await page.click('#pcCmpClose');
  await page.locator('.pc-wish').first().click();
  ls = await page.evaluate(() => JSON.parse(localStorage.getItem('iram_wishlist') || '[]'));
  expect(ls.length).toBe(1);
  await page.click('#navWishlist');
  await expect(page.locator('#pcWishSheet')).toBeVisible();
});

test('mobile: search overlay finds products', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only flow');
  await page.goto('/');
  await page.locator('[data-mobile-search]').first().click();
  await page.fill('#mobileSearchInput', 'khamrah');
  await expect(page.locator('#mobileSearchResults')).toHaveClass(/open/);
  expect(await page.locator('#mobileSearchResults .search-result-item').count()).toBeGreaterThan(0);
});

// ---------------------------------------------------------------- detail pages
test('fragrance detail page renders with schema, prices and FAQ', async ({ page }) => {
  const errs = watchErrors(page);
  await page.goto('/fragrance/afnan-turathi-brown.html');
  await expect(page.locator('h1')).toContainText('Turathi');
  await expect(page.locator('td:has-text("30ml")').first()).toBeVisible();
  expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThanOrEqual(3);
  expect(await page.locator('details.qa').count()).toBeGreaterThan(0);
  const ok = await page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for (const s of blocks) JSON.parse(s.textContent);
    return blocks.length;
  });
  expect(ok).toBeGreaterThanOrEqual(3);
  expect(errs).toEqual([]);
});
